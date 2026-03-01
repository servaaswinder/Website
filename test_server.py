import unittest
import sys
from unittest.mock import patch, MagicMock, PropertyMock
import json

class TestServerDeleteStudent(unittest.TestCase):
    def setUp(self):
        # Reset mocks before each test
        self.mock_auth.get_user.reset_mock()
        self.mock_auth.get_user.side_effect = None
        self.mock_auth.get_user.return_value = None

        self.mock_auth.get_user_by_email.reset_mock()
        self.mock_auth.get_user_by_email.side_effect = None
        self.mock_auth.get_user_by_email.return_value = None

    @classmethod
    def setUpClass(cls):
        # Mock dependencies that require internet or configuration
        cls.mock_firebase_admin = MagicMock()
        cls.mock_firestore = MagicMock()
        cls.mock_auth = MagicMock()
        
        # Mock google and google.auth modules
        cls.mock_google = MagicMock()
        cls.mock_google_auth = MagicMock()
        cls.mock_google_auth_transport = MagicMock()
        cls.mock_google_auth_transport_requests = MagicMock()

        cls.mock_google.auth = cls.mock_google_auth
        cls.mock_google.auth.transport = cls.mock_google_auth_transport
        cls.mock_google.auth.transport.requests = cls.mock_google_auth_transport_requests

        # Patch sys.modules to mock firebase_admin and its submodules
        cls.patcher = patch.dict('sys.modules', {
            'firebase_admin': cls.mock_firebase_admin,
            'firebase_admin.credentials': MagicMock(),
            'firebase_admin.auth': cls.mock_auth,
            'firebase_admin.firestore': cls.mock_firestore,
            'google': cls.mock_google,
            'google.auth': cls.mock_google_auth,
            'google.auth.transport': cls.mock_google_auth_transport,
            'google.auth.transport.requests': cls.mock_google_auth_transport_requests,
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

class MockUserNotFoundError(Exception):
    pass

class TestServerReset2FA(unittest.TestCase):
    def setUp(self):
        # Reset mocks before each test
        self.mock_auth.get_user.reset_mock()
        self.mock_auth.get_user.side_effect = None
        self.mock_auth.get_user.return_value = None

        self.mock_auth.get_user_by_email.reset_mock()
        self.mock_auth.get_user_by_email.side_effect = None
        self.mock_auth.get_user_by_email.return_value = None

    @classmethod
    def setUpClass(cls):
        # Mock dependencies that require internet or configuration
        cls.mock_firebase_admin = MagicMock()
        cls.mock_firestore = MagicMock()
        cls.mock_auth = MagicMock()

        # Set up auth exceptions correctly
        cls.mock_auth.UserNotFoundError = MockUserNotFoundError

        # Mock google and google.auth modules
        cls.mock_google = MagicMock()
        cls.mock_google_auth = MagicMock()
        cls.mock_google_auth_transport = MagicMock()
        cls.mock_google_auth_transport_requests = MagicMock()

        cls.mock_google.auth = cls.mock_google_auth
        cls.mock_google.auth.transport = cls.mock_google_auth_transport
        cls.mock_google.auth.transport.requests = cls.mock_google_auth_transport_requests

        # Patch sys.modules to mock firebase_admin and its submodules
        cls.patcher = patch.dict('sys.modules', {
            'firebase_admin': cls.mock_firebase_admin,
            'firebase_admin.credentials': MagicMock(),
            'firebase_admin.auth': cls.mock_auth,
            'firebase_admin.firestore': cls.mock_firestore,
            'google': cls.mock_google,
            'google.auth': cls.mock_google_auth,
            'google.auth.transport': cls.mock_google_auth_transport,
            'google.auth.transport.requests': cls.mock_google_auth_transport_requests,
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

    def test_reset_2fa_missing_uid_and_email(self):
        """Test that missing UID and Email in reset_2fa returns 400."""
        response = self.app.post('/api/reset-2fa', json={})

        self.assertEqual(response.status_code, 400)

        data = json.loads(response.data)
        self.assertFalse(data.get('success'))
        self.assertEqual(data.get('error'), 'No UID or Email provided')

    @patch('requests.post')
    def test_reset_2fa_user_not_found(self, mock_post):
        """Test that if user is not found by UID or Email, it returns 404."""
        # Ensure the server module uses the MockUserNotFoundError
        import server
        server.auth.UserNotFoundError = MockUserNotFoundError

        with patch('server.auth.get_user') as mock_get_user, \
             patch('server.auth.get_user_by_email') as mock_get_user_by_email:

            mock_get_user.side_effect = MockUserNotFoundError()
            mock_get_user_by_email.side_effect = MockUserNotFoundError()

            response = self.app.post('/api/reset-2fa', json={'uid': 'invalid_uid', 'email': 'invalid@email.com'})

        self.assertEqual(response.status_code, 404)

        data = json.loads(response.data)
        self.assertFalse(data.get('success'))
        self.assertTrue('No user record found' in data.get('error'))

    @patch('requests.post')
    def test_reset_2fa_api_error(self, mock_post):
        """Test that an Identity Toolkit API error returns 500."""
        # Mock user
        class MockUser:
            pass
        mock_user = MockUser()
        mock_user.uid = 'test_uid'
        mock_user.email = 'test@email.com'
        self.mock_auth.get_user.return_value = mock_user
        self.mock_auth.get_user.side_effect = None

        # Mock API response
        mock_resp = MagicMock()
        mock_resp.status_code = 400
        mock_resp.text = "INVALID_MFA"
        mock_post.return_value = mock_resp

        # Mock credentials
        class MockCreds:
            def refresh(self, req):
                pass
        class MockApp:
            pass
        mock_app = MockApp()
        mock_app.project_id = "test-project"
        mock_cred = MockCreds()
        mock_cred.token = "mock_token"
        mock_app.credential = MagicMock()
        mock_app.credential.get_credential.return_value = mock_cred
        self.mock_firebase_admin.get_app.return_value = mock_app

        response = self.app.post('/api/reset-2fa', json={'uid': 'test_uid'})

        self.assertEqual(response.status_code, 500)

        data = json.loads(response.data)
        self.assertFalse(data.get('success'))
        self.assertTrue('API Error' in data.get('error'))

    def test_reset_2fa_general_exception(self):
        """Test that a general exception returns 500."""
        with patch('server.auth.get_user') as mock_get_user:
            # Ensure UserNotFoundError is a valid Exception class for the inner try-except
            import server
            server.auth.UserNotFoundError = MockUserNotFoundError

            mock_get_user.side_effect = Exception("General error")
            response = self.app.post('/api/reset-2fa', json={'uid': 'test_uid'})

            self.assertEqual(response.status_code, 500)

            data = json.loads(response.data)
            self.assertFalse(data.get('success'))
            self.assertEqual(data.get('error'), 'General error')

if __name__ == '__main__':
    unittest.main()
