from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.security import clear_session_cookie, create_access_token, set_session_cookie
from app.models.user import User
from app.schemas.auth import LoginRequest, UserResponse
from app.services import auth_service
from app.services.catalogues import MOCKED_ACCOUNT_ID

router = APIRouter(prefix="/auth", tags=["auth"])


def _to_user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id, email=user.email, display_name=user.display_name, account_id=MOCKED_ACCOUNT_ID
    )


@router.post("/login", response_model=UserResponse)
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)) -> UserResponse:
    user = auth_service.authenticate(db, email=body.email, password=body.password)
    token = create_access_token(user_id=user.id, email=user.email)
    set_session_cookie(response, token)
    return _to_user_response(user)


@router.post("/logout", status_code=204)
def logout(response: Response) -> None:
    clear_session_cookie(response)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return _to_user_response(current_user)
