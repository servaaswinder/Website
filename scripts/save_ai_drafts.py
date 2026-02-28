import firebase_admin
from firebase_admin import credentials, firestore
import json
import sys
import os

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 save_ai_drafts.py '<json_string>'")
        sys.exit(1)

    drafts_json = sys.argv[1]
    import json
    try:
        drafts = json.loads(drafts_json)
    except Exception as e:
        print(f"Error parsing JSON: {e}\nReceived value: {drafts_json}")
        sys.exit(1)

    # Allow running from different directories by making path relative to script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    cred_path = os.path.join(project_root, 'serviceAccountKey.json')

    if not os.path.exists(cred_path):
        print(f"Error: Credentials not found at {cred_path}")
        sys.exit(1)

    # Initialize Firebase Admin SDK
    try:
        cred = credentials.Certificate(cred_path)
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        print("Firebase Admin initialized.")
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        sys.exit(1)

    db = firestore.client()

    success_count = 0
    for draft in drafts:
        doc_id = draft.get('id')
        pts = draft.get('pts')
        comment = draft.get('c')
        
        if not doc_id:
            print("Warning: Skipping draft without 'id'.")
            continue
            
        doc_ref = db.collection('submissions').document(doc_id)
        
        try:
            doc_ref.update({
                'gradingDraft': {
                    'selectedCells': pts,
                    'comment': comment
                },
                'status': 'pending',
                'gradedByAI': True,
                'gradingBy': 'AI'
            })
            print(f"✅ Successfully wrote draft for {doc_id}")
            success_count += 1
        except Exception as e:
            print(f"❌ Failed to write draft for {doc_id}: {e}")
            
    print(f"Finished writing {success_count}/{len(drafts)} drafts to Firebase.")

if __name__ == "__main__":
    main()
