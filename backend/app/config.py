from pathlib import Path
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

# Absolute, not ".env": pydantic-settings resolves a relative env_file against
# the process's *current working directory*, not this file's location. That's
# `backend/` for uvicorn locally and Docker (both set it as the working dir),
# but WSGI hosts (PythonAnywhere's mod_wsgi) run with a different cwd, which
# silently produced zero loaded settings and a missing-jwt_secret crash there.
_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


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

    model_config = SettingsConfigDict(env_file=_ENV_FILE, env_file_encoding="utf-8")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_csv(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()
