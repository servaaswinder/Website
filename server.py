from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, auth
import os

app = Flask(__name__)
# Allow CORS request from our frontend (port 4000)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize Firebase Admin SDK
# We assume serviceAccountKey.json is in the same directory
cred_path = 'serviceAccountKey.json'
if os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
    print("✅ Firebase Admin SDK initialized successfully.")
else:
    print("⚠️  WARNING: serviceAccountKey.json not found. Admin features will fail.")

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "message": "Admin backend is running"})

@app.route('/api/reset-2fa', methods=['POST'])
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
        import requests
        import json
        import google.auth.transport.requests
        from google.oauth2 import service_account
        
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
             return jsonify({"success": False, "error": f"API Error: {resp.text}"}), 500
             
        # Success logic continues...
        print(f"✅ Success: 2FA reset (via API) for {user.email}")
        return jsonify({
            "success": True, 
            "message": f"2FA is succesvol uitgeschakeld voor {user.email}."
        })

    except Exception as e:
        print(f"❌ Error resetting 2FA: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    print("🚀 Starting Admin Backend on port 5000...")
    app.run(port=5000, debug=True)
