from collections.abc import Generator

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.errors import NotAuthenticatedError
from app.core.security import SESSION_COOKIE_NAME, decode_access_token
from app.db.session import SessionLocal
from app.models.user import User


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise NotAuthenticatedError()

    payload = decode_access_token(token)
    if not payload:
        raise NotAuthenticatedError()

    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise NotAuthenticatedError()
    return user
