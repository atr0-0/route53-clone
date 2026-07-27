"""Password hashing.

Started in Slice 1 because the `users` table requires bcrypt-hashed passwords
(never plaintext, even for seeded demo users) and nothing else needed JWT yet.
Slice 2 extends this same file with JWT sign/verify and cookie helpers — it
does not replace what's here.
"""

import bcrypt


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
