import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Customer Churn Analytics API"
    API_V1_STR: str = "/api/v1"
    
    # Security config
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super_secret_key_change_me_in_production_123456789")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    
    # CORS allowed origins (comma-separated list for production deployment)
    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"
    )
    
    # DB configuration: Default to local SQLite fallback if Postgres is not set or ready
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'churn.db')}"
    )

    model_config = SettingsConfigDict(case_sensitive=True)

settings = Settings()
