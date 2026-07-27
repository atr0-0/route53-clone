import os

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings


def _sqlite_path_from_url(url: str) -> str | None:
    if not url.startswith("sqlite"):
        return None
    return url.split("///", 1)[1] if "///" in url else None


_db_path = _sqlite_path_from_url(settings.database_url)
if _db_path and _db_path not in (":memory:", ""):
    os.makedirs(os.path.dirname(_db_path) or ".", exist_ok=True)

engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})


@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record) -> None:
    """SQLite disables foreign keys by default, per connection.

    Without this, every ON DELETE CASCADE in the schema is silently inert —
    cascades appear to work in review and leave orphans in production (DR-6,
    invariant 3). WAL + busy_timeout address concurrent-write risk R3.
    """
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_session() -> Session:
    return SessionLocal()
