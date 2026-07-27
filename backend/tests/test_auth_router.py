from app.core.security import hash_password
from app.repositories import user_repo


def _seed_user(db_session, email="router-test@example.com", password="RouterTest123!"):
    user_repo.create(db_session, email=email, password_hash=hash_password(password), display_name="Router Test")
    db_session.commit()
    return email, password


def test_login_sets_cookie_and_returns_user(client, db_session):
    email, password = _seed_user(db_session)

    response = client.post("/v1/auth/login", json={"email": email, "password": password})

    assert response.status_code == 200
    body = response.json()
    assert body["email"] == email
    assert body["displayName"] == "Router Test"
    assert body["accountId"] == "123456789012"
    assert "session" in response.cookies


def test_login_with_bad_password_returns_401_with_uniform_error_shape(client, db_session):
    email, _ = _seed_user(db_session)

    response = client.post("/v1/auth/login", json={"email": email, "password": "wrong"})

    assert response.status_code == 401
    body = response.json()
    assert body["error"]["code"] == "NotAuthenticated"
    assert body["error"]["field"] is None


def test_me_requires_a_session_cookie(client):
    response = client.get("/v1/auth/me")
    assert response.status_code == 401


def test_session_persists_across_requests_after_login(client, db_session):
    """This is AC-1's backend half: sign in once, then further requests (the
    equivalent of a page reload) stay authenticated via the same cookie."""
    email, password = _seed_user(db_session)
    client.post("/v1/auth/login", json={"email": email, "password": password})

    me_response = client.get("/v1/auth/me")

    assert me_response.status_code == 200
    assert me_response.json()["email"] == email


def test_logout_clears_the_cookie_and_subsequent_me_is_401(client, db_session):
    email, password = _seed_user(db_session)
    client.post("/v1/auth/login", json={"email": email, "password": password})
    assert client.get("/v1/auth/me").status_code == 200

    logout_response = client.post("/v1/auth/logout")
    assert logout_response.status_code == 204

    assert client.get("/v1/auth/me").status_code == 401
