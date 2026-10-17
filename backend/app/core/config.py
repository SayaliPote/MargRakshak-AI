"""Core application settings and configuration."""
import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
    class AppBaseSettings(BaseSettings):
        model_config = SettingsConfigDict(
            env_file=".env",
            env_file_encoding="utf-8",
            case_sensitive=True,
            extra="ignore"
        )
except ImportError:
    from pydantic import BaseSettings
    class AppBaseSettings(BaseSettings):
        class Config:
            env_file = ".env"
            case_sensitive = True
            extra = "ignore"


class Settings(AppBaseSettings):
    APP_NAME: str = "MargRakshak AI - Accident Hotspot Detection"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS origins allowed to access the API
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000"
    ]

    # Database Settings
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "margrakshak_db"
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/margrakshak_db"

    # Security & Admin Restriction
    JWT_SECRET_KEY: str = "margrakshak_dev_secret_key_change_in_prod_2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    ADMIN_EMAIL: str = "admin@margrakshak.in"

    # Uploads
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 15


settings = Settings()
