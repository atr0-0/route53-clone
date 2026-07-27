from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Env-driven configuration (NFR-11). No secret ever has a hardcoded default."""

    database_url: str = "sqlite:///./data/route53.db"
    jwt_secret: str
    cors_origins: Annotated[list[str], NoDecode] = []
    demo_mode: bool = True
    # NFR-2 requires Secure on the session cookie in production (real HTTPS on Fly/
    # Vercel). Defaults true; set false only for local http://localhost dev, where a
    # Secure cookie is silently never sent back — confirmed by an actual failing
    # test, not a hypothetical. See docs/01-requirements.md NFR-11.
    cookie_secure: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_csv(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()
