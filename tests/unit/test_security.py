import unittest

from services.security import (
    constant_time_compare,
    generate_verification_code,
    hash_password,
    verify_password,
)


class SecurityUtilsTestCase(unittest.TestCase):
    def test_generate_verification_code_is_six_digits(self):
        for _ in range(50):
            code = generate_verification_code()
            self.assertTrue(code.isdigit())
            self.assertEqual(len(code), 6)
            self.assertGreaterEqual(int(code), 100000)
            self.assertLessEqual(int(code), 999999)

    def test_hash_and_verify_password(self):
        password_hash = hash_password("secret-password")
        self.assertTrue(verify_password("secret-password", password_hash))

    def test_verify_password_rejects_wrong_password(self):
        password_hash = hash_password("correct-password")
        self.assertFalse(verify_password("wrong-password", password_hash))

    def test_verify_password_rejects_malformed_hash(self):
        self.assertFalse(verify_password("password", "invalid-format"))

    def test_constant_time_compare(self):
        self.assertTrue(constant_time_compare("123456", "123456"))
        self.assertFalse(constant_time_compare("123456", "123457"))


if __name__ == "__main__":
    unittest.main()
