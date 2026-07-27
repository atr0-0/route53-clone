import os

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings


def _sqlite_path_from_url(url: str) -> str | None:
    if not url.startswith("sqlite"):
        return None
    return url.split("///", 1)[1] if "///" in url else None


def _ensure_parent_dir(url: str) -> None:
    db_path = _sqlite_path_from_url(url)
    if db_path and db_path not in (":memory:", ""):
        os.makedirs(os.path.dirname(db_path) or ".", exist_ok=True)


def create_sqlite_engine(url: str) -> Engine:
    """Builds a SQLite engine with the connect-time PRAGMA listener attached.

    A single source of truth for the PRAGMA wiring, so tests exercising a temp
    database go through the exact same listener as the app — not a reimplementation
    of it. SQLite disables foreign keys by default, per connection; without this,
    every ON DELETE CASCADE in the schema is silently inert (DR-6, invariant 3).
    WAL + busy_timeout address concurrent-write risk R3.
    """
    _ensure_parent_dir(url)
    new_engine = create_engine(url, connect_args={"check_same_thread": False})

    @event.listens_for(new_engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()

    return new_engine


engine = create_sqlite_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_session() -> Session:
    return SessionLocal()
