import pytest

from app.core.errors import NotAuthenticatedError
from app.core.security import hash_password
from app.repositories import user_repo
from app.services import auth_service


@pytest.fixture()
def seeded_user(db_session):
    user = user_repo.create(
        db_session,
        email="login-test@example.com",
        password_hash=hash_password("CorrectHorse123!"),
        display_name="Login Test",
    )
    db_session.commit()
    return user


def test_authenticate_succeeds_with_correct_credentials(db_session, seeded_user):
    user = auth_service.authenticate(db_session, email="login-test@example.com", password="CorrectHorse123!")
    assert user.id == seeded_user.id


def test_authenticate_rejects_unknown_email(db_session, seeded_user):
    with pytest.raises(NotAuthenticatedError) as exc_info:
        auth_service.authenticate(db_session, email="nobody@example.com", password="whatever")
    unknown_email_message = exc_info.value.message

    with pytest.raises(NotAuthenticatedError) as exc_info2:
        auth_service.authenticate(db_session, email="login-test@example.com", password="WrongPassword!")

    # FR-A3: one generic message for both failure modes — avoids user enumeration.
    assert unknown_email_message == exc_info2.value.message


def test_authenticate_is_case_insensitive_and_trims_email(db_session, seeded_user):
    user = auth_service.authenticate(
        db_session, email="  Login-Test@Example.com  ", password="CorrectHorse123!"
    )
    assert user.id == seeded_user.id
