import os
import sys
from pathlib import Path

os.environ.setdefault("JWT_SECRET", "test-secret-at-least-32-bytes-long-for-hs256")
# TestClient talks plain http://testserver — a Secure cookie would never round-trip.
os.environ.setdefault("COOKIE_SECURE", "false")

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.core.deps import get_db
from app.core.security import hash_password
from app.db.session import create_sqlite_engine
from app.main import app
from app.repositories import user_repo


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


@pytest.fixture()
def client(session_factory: sessionmaker) -> TestClient:
    """A TestClient wired to the same isolated per-test database as `db_session` —
    the app's own module-level engine (bound to whatever DATABASE_URL was current
    at first import) is never used in tests."""

    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def authenticated_client(client: TestClient, db_session: Session):
    """Creates a real user and logs in through the real API, so the TestClient's
    cookie jar holds a genuine session cookie — exercises the actual auth flow
    rather than bypassing it."""
    email = "authtest@example.com"
    password = "TestPass123!"
    user_repo.create(
        db_session, email=email, password_hash=hash_password(password), display_name="Auth Test"
    )
    db_session.commit()

    response = client.post("/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return client
