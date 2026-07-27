"""Password hashing, JWT sign/verify, and session cookie helpers.

Password hashing started in Slice 1 because the `users` table requires bcrypt
hashes (never plaintext, even for seeded demo users). This slice adds the rest.
"""

import datetime

import bcrypt
import jwt
from fastapi import Response

from app.config import settings

ALGORITHM = "HS256"
TOKEN_LIFETIME = datetime.timedelta(hours=24)  # §4.2 #5 — arbitrary, no refresh token
SESSION_COOKIE_NAME = "session"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(*, user_id: int, email: str) -> str:
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {"sub": str(user_id), "email": email, "iat": now, "exp": now + TOKEN_LIFETIME}
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None


def set_session_cookie(response: Response, token: str) -> None:
    """HttpOnly, Secure, SameSite=Lax (DD-3) — never readable by JavaScript."""
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=int(TOKEN_LIFETIME.total_seconds()),
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=SESSION_COOKIE_NAME, path="/", httponly=True, samesite="lax", secure=settings.cookie_secure
    )
