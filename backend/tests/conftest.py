import os
import sys
from pathlib import Path

os.environ.setdefault("JWT_SECRET", "test-secret")

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy.orm import Session, sessionmaker

from app.db.session import create_sqlite_engine


def _migrate(db_path: Path) -> str:
    """Runs the real Alembic migration against an isolated temp file, so Slice 1's
    tests exercise the actual migration (DR-9), not a create_all() shortcut."""
    url = f"sqlite:///{db_path}"
    os.environ["DATABASE_URL"] = url

    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    cfg.set_main_option("sqlalchemy.url", url)
    command.upgrade(cfg, "head")
    return url


@pytest.fixture()
def session_factory(tmp_path) -> sessionmaker:
    url = _migrate(tmp_path / "test.db")
    engine = create_sqlite_engine(url)
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    yield factory
    engine.dispose()


@pytest.fixture()
def db_session(session_factory: sessionmaker) -> Session:
    session = session_factory()
    yield session
    session.close()
