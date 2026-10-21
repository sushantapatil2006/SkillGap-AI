from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "sqlite:///./skillgap.db"
    jwt_secret: SecretStr = Field(min_length=32)
    access_token_minutes: int = Field(default=15, ge=1, le=60)
    refresh_token_days: int = Field(default=7, ge=1, le=30)
    cookie_secure: bool = False
    environment: str = "development"
    cors_origins: list[str] = ["http://localhost:3000"]
    model_path: Path = Path("artifacts/model.joblib")

    @model_validator(mode="after")
    def production_security(self):
        if self.environment == "production" and not self.cookie_secure:
            raise ValueError("COOKIE_SECURE must be true in production")
        if "*" in self.cors_origins:
            raise ValueError("Use explicit CORS origins")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
