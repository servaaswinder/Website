import os
import secrets
import string
from functools import wraps

import firebase_admin
import google.auth.transport.requests
import requests
from firebase_admin import credentials, auth, firestore
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
# Allow CORS request from our frontend (port 4000) and production domain
CORS(app, resources={r"/api/*": {"origins": ["https://servaaswinder.nl", "http://localhost:4000", "http://127.0.0.1:4000"]}})

# Initialize Firebase Admin SDK
# We assume serviceAccountKey.json is in the same directory
cred_path = 'serviceAccountKey.json'
if os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
    print("✅ Firebase Admin SDK initialized successfully.")
else:
    print("⚠️  WARNING: serviceAccountKey.json not found. Admin features will fail.")

# Only these accounts may call the admin API (must match firestore.rules)
ADMIN_EMAILS = {
    'servaas.winder@northgo-college.nl',
    'jaimy.treffers@northgo-college.nl',
}

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"success": False, "error": "Missing or invalid Authorization header"}), 401

        id_token = auth_header.split('Bearer ')[1]
        try:
            decoded_token = auth.verify_id_token(id_token)
        except Exception as e:
            return jsonify({"success": False, "error": "Invalid token"}), 401

        # A valid token only proves the caller is logged in; admin endpoints
        # must additionally check the caller is on the admin allowlist.
        email = (decoded_token.get('email') or '').lower()
        if email not in ADMIN_EMAILS or not decoded_token.get('email_verified'):
            return jsonify({"success": False, "error": "Forbidden: admin account required"}), 403

        return f(*args, **kwargs)
    return decorated

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "message": "Admin backend is running"})

@app.route('/api/reset-2fa', methods=['POST'])
@require_auth
def reset_2fa():
    """
    Resets Multi-Factor Authentication for a given user UID.
    """
    try:
        data = request.json
        uid = data.get('uid')
        email = data.get('email')
        
        if not uid and not email:
            return jsonify({"success": False, "error": "No UID or Email provided"}), 400

        print(f"🔄 Attempting to reset 2FA for UID: {uid}, Email: {email}")

        # 1. Verify user exists
        user = None
        if uid:
            try:
                user = auth.get_user(uid)
            except auth.UserNotFoundError:
                print(f"⚠️ UID {uid} not found. Trying email...")
        
        if not user and email:
            try:
                user = auth.get_user_by_email(email)
                print(f"✅ Found user via email: {user.uid}")
            except auth.UserNotFoundError:
                pass
        
        if not user:
             return jsonify({"success": False, "error": f"No user record found for ID: {uid} or Email: {email}"}), 404
        
        # 2. Remove Enrolled Factors via REST API (since SDK is missing support)
        # We manually call Identity Toolkit API to disable MFA.
        # Get Service Account Credential & Token
        # We need to refresh the credential to get a raw token
        app = firebase_admin.get_app()
        creds = app.credential.get_credential()
        
        # Create a request object for refreshing
        auth_req = google.auth.transport.requests.Request()
        creds.refresh(auth_req)
        token = creds.token
        
        # Get Project ID (from service account json usually, or app)
        # note: app.project_id might be available
        project_id = app.project_id
        
        url = f"https://identitytoolkit.googleapis.com/v1/projects/{project_id}/accounts:update"
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Payload to disable MFA
        payload = {
            "localId": user.uid,
            "mfa": {
                "state": "DISABLED",
                "enrollments": [] 
            }
        }
        
        resp = requests.post(url, headers=headers, json=payload)
        
        if resp.status_code != 200:
             print(f"❌ API Error: {resp.text}")
             return jsonify({"success": False, "error": "External API Error"}), 500
             
        # Success logic continues...
        print(f"✅ Success: 2FA reset (via API) for {user.email}")
        return jsonify({
            "success": True, 
            "message": f"2FA is succesvol uitgeschakeld voor {user.email}."
        })

    except Exception as e:
        print(f"❌ Error resetting 2FA: {str(e)}")
        return jsonify({"success": False, "error": "Internal Server Error"}), 500

@app.route('/api/create-student', methods=['POST'])
@require_auth
def create_student():
    """
    Creates a new student account in Firebase Auth and Firestore.
    """
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        name = data.get('name')
        classroom = data.get('class', '')

        if not email or not name:
            return jsonify({"success": False, "error": "Email and name are required"}), 400

        # Generate random password if not provided
        if not password:
            alphabet = string.ascii_letters + string.digits
            password = ''.join(secrets.choice(alphabet) for i in range(12))

        print(f"🆕 Creating student: {name} ({email})")

        # 1. Create Auth User
        try:
            user = auth.create_user(
                email=email,
                email_verified=False,
                password=password,
                display_name=name,
                disabled=False
            )
            print(f"✅ Auth user created: {user.uid}")
        except auth.EmailAlreadyExistsError:
            print(f"⚠️ User already exists: {email}")
            return jsonify({"success": False, "error": "User already exists"}), 409
        except Exception as e:
            print(f"❌ Auth Error: {str(e)}")
            return jsonify({"success": False, "error": "Auth Error"}), 500

        # 2. Create Firestore Document in 'results'
        try:
            db = firestore.client()
            doc_ref = db.collection('results').document(user.uid) # Use UID as doc ID for consistency
            
            # Check if doc exists (unlikely if new user, but good hygiene)
            # Actually create_user guarantees new UID.
            
            doc_data = {
                "email": email,
                "name": name,
                "class": classroom,
                "assignments": [], # Empty start
                "createdAt": firestore.SERVER_TIMESTAMP
            }
            
            doc_ref.set(doc_data)
            print(f"✅ Firestore document created for {user.uid}")
            
        except Exception as e:
            print(f"❌ Firestore Error: {str(e)}")
            # Cleanup auth user if firestore fails? Maybe too complex for now.
            return jsonify({"success": False, "error": "Firestore Error"}), 500

        return jsonify({"success": True, "message": f"Account aangemaakt voor {name}", "uid": user.uid})

    except Exception as e:
        print(f"❌ General Error creating student: {str(e)}")
        return jsonify({"success": False, "error": "Internal Server Error"}), 500


@app.route('/api/delete-student', methods=['POST'])
@require_auth
def delete_student():
    """
    Deletes a student account from Firebase Auth and Firestore.
    """
    try:
        data = request.json
        uid = data.get('uid')
        
        if not uid:
             return jsonify({"success": False, "error": "UID is required"}), 400
             
        print(f"🗑️ Deleting student: {uid}")
        
        # 1. Delete Firestore Document
        # We do this first or parallel? Auth delete is irrevocable.
        try:
            db = firestore.client()
            # Try to delete 'results' doc
            # Note: We do NOT delete submissions history to preserve audit trail?
            # User request said "verwijderen", implies clean up.
            # But let's stick to 'account' logic (auth + profile).
            
            db.collection('results').document(uid).delete()
            print(f"✅ Firestore document deleted: {uid}")
            
        except Exception as e:
            print(f"⚠️  Firestore delete warning: {str(e)}")
            # Continue to delete auth anyway
            
        # 2. Delete Auth User
        try:
            auth.delete_user(uid)
            print(f"✅ Auth user deleted: {uid}")
        except auth.UserNotFoundError:
             print(f"⚠️ Auth user not found: {uid}")
        except Exception as e:
             print(f"❌ Auth delete error: {str(e)}")
             return jsonify({"success": False, "error": "Auth Error"}), 500

        return jsonify({"success": True, "message": "Account verwijderd."})

    except Exception as e:
        print(f"❌ Error deleting student: {str(e)}")
        return jsonify({"success": False, "error": "Internal Server Error"}), 500

if __name__ == '__main__':
    print("🚀 Starting Admin Backend on port 5000...")
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() in ('true', '1', 'yes')
    app.run(port=5000, debug=debug_mode)
