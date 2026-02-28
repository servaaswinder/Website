import unittest
import sys
from unittest.mock import patch, MagicMock
import json

class TestServerDeleteStudent(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Mock dependencies that require internet or configuration
        cls.mock_firebase_admin = MagicMock()
        cls.mock_firestore = MagicMock()
        cls.mock_auth = MagicMock()

        # Patch sys.modules to mock firebase_admin and its submodules
        cls.patcher = patch.dict('sys.modules', {
            'firebase_admin': cls.mock_firebase_admin,
            'firebase_admin.credentials': MagicMock(),
            'firebase_admin.auth': cls.mock_auth,
            'firebase_admin.firestore': cls.mock_firestore,
            'google.auth.transport.requests': MagicMock(),
            'google.oauth2': MagicMock(),
            'google.oauth2.service_account': MagicMock()
        })
        cls.patcher.start()

        # Import the app after mocking dependencies
        import server
        cls.app = server.app.test_client()
        cls.app.testing = True

    @classmethod
    def tearDownClass(cls):
        cls.patcher.stop()

    def test_delete_student_missing_uid(self):
        """Test that missing UID in delete_student returns 400."""
        # Send a POST request with an empty JSON payload
        response = self.app.post('/api/delete-student', json={})

        # Assert the status code is 400 Bad Request
        self.assertEqual(response.status_code, 400)

        # Parse the JSON response
        data = json.loads(response.data)

        # Assert the expected response body
        self.assertFalse(data.get('success'))
        self.assertEqual(data.get('error'), 'UID is required')

if __name__ == '__main__':
    unittest.main()
