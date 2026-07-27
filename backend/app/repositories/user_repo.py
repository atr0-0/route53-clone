from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


def create(session: Session, *, email: str, password_hash: str, display_name: str) -> User:
    user = User(email=email, password_hash=password_hash, display_name=display_name)
    session.add(user)
    session.flush()
    return user


def get_by_email(session: Session, email: str) -> User | None:
    return session.scalar(select(User).where(User.email == email))
