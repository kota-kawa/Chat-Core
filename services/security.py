import base64
import hashlib
import hmac
import secrets
from typing import Optional


_CODE_LOWER_BOUND = 100000
_CODE_RANGE = 900000
_PASSWORD_HASH_SCHEME = "pbkdf2_sha256"
_DEFAULT_PBKDF2_ITERATIONS = 390000
_DEFAULT_SALT_BYTES = 16


def generate_verification_code() -> str:
    return str(secrets.randbelow(_CODE_RANGE) + _CODE_LOWER_BOUND)


def constant_time_compare(left: str, right: str) -> bool:
    left_digest = hashlib.sha256(str(left).encode("utf-8")).digest()
    right_digest = hashlib.sha256(str(right).encode("utf-8")).digest()
    return hmac.compare_digest(left_digest, right_digest)


def hash_password(
    password: str,
    *,
    iterations: int = _DEFAULT_PBKDF2_ITERATIONS,
    salt: Optional[bytes] = None,
) -> str:
    if not isinstance(password, str) or password == "":
        raise ValueError("password must be a non-empty string")
    if iterations <= 0:
        raise ValueError("iterations must be a positive integer")
    salt_bytes = salt if salt is not None else secrets.token_bytes(_DEFAULT_SALT_BYTES)
    if not salt_bytes:
        raise ValueError("salt must not be empty")

    password_bytes = password.encode("utf-8")
    digest = hashlib.pbkdf2_hmac("sha256", password_bytes, salt_bytes, iterations)
    salt_b64 = base64.b64encode(salt_bytes).decode("ascii")
    digest_b64 = base64.b64encode(digest).decode("ascii")
    return f"{_PASSWORD_HASH_SCHEME}${iterations}${salt_b64}${digest_b64}"


def verify_password(password: str, password_hash: str) -> bool:
    if not isinstance(password, str) or not isinstance(password_hash, str):
        return False

    parts = password_hash.split("$")
    if len(parts) != 4:
        return False

    scheme, iterations_raw, salt_b64, expected_digest_b64 = parts
    if scheme != _PASSWORD_HASH_SCHEME:
        return False

    try:
        iterations = int(iterations_raw)
        if iterations <= 0:
            return False
        salt = base64.b64decode(salt_b64.encode("ascii"), validate=True)
        expected_digest = base64.b64decode(
            expected_digest_b64.encode("ascii"), validate=True
        )
    except (ValueError, TypeError):
        return False

    if not salt or not expected_digest:
        return False

    actual_digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, iterations
    )
    return hmac.compare_digest(actual_digest, expected_digest)
