from pydantic import BaseModel

from app.schemas.common import CamelModel


class LoginRequest(BaseModel):
    # Plain str, not EmailStr: an invalid email format should fail the same generic
    # 401 as a wrong password (FR-A3), not a separate 422 that leaks format info.
    email: str
    password: str


class UserResponse(CamelModel):
    id: int
    email: str
    display_name: str
    account_id: str
