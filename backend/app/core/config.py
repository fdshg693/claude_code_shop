from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # API Settings
    PROJECT_NAME: str = "ESHOP API"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql://eshop:eshop123@postgres:5432/eshop"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # JWT Settings
    SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost"]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
