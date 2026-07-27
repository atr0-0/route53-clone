from sqlalchemy.orm import Session

from app.core.errors import NotAuthenticatedError
from app.core.security import verify_password
from app.models.user import User
from app.repositories import user_repo

# One generic message for both unknown-user and wrong-password (FR-A3) — avoids
# user enumeration (§4.2 #6).
_GENERIC_FAILURE = "Your sign-in details are incorrect. Please try again."


def authenticate(session: Session, *, email: str, password: str) -> User:
    user = user_repo.get_by_email(session, email.strip().lower())
    if user is None or not verify_password(password, user.password_hash):
        raise NotAuthenticatedError(_GENERIC_FAILURE)
    return user
