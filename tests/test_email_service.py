import unittest
from unittest.mock import patch

from services import email_service


class EmailServiceCredentialsTestCase(unittest.TestCase):
    def test_load_email_credentials_uses_send_password(self):
        with patch.dict(
            "os.environ",
            {"SEND_ADDRESS": "sender@example.com", "SEND_PASSWORD": "app-password"},
            clear=True,
        ):
            send_address, send_password = email_service._load_email_credentials()

        self.assertEqual(send_address, "sender@example.com")
        self.assertEqual(send_password, "app-password")

    def test_load_email_credentials_falls_back_to_legacy_env(self):
        with patch.dict(
            "os.environ",
            {
                "SEND_ADDRESS": "sender@example.com",
                "EMAIL_SEND_PASSWORD": "legacy-password",
            },
            clear=True,
        ):
            send_address, send_password = email_service._load_email_credentials()

        self.assertEqual(send_address, "sender@example.com")
        self.assertEqual(send_password, "legacy-password")

    def test_load_email_credentials_raises_when_missing(self):
        with patch.dict("os.environ", {}, clear=True):
            with self.assertRaises(RuntimeError):
                email_service._load_email_credentials()


if __name__ == "__main__":
    unittest.main()
