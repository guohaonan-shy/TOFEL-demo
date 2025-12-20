"""Application configuration using pydantic-settings."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "TOEFL Speaking Backend"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://toefl:toefl123@localhost:5432/toefl_speaking"
    
    # MinIO
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin123"
    MINIO_SECURE: bool = False
    MINIO_BUCKET_QUESTIONS: str = "toefl-questions"
    MINIO_BUCKET_RECORDINGS: str = "toefl-recordings"
    
    # OpenAI
    OPENAI_API_KEY: str = ""
    
    # Gemini
    GEMINI_API_KEY: str = ""
    AUDIO_AI_PROVIDER: str = "auto"  # auto, gemini, openai
    
    # Volcengine (Doubao)
    VOLCENGINE_API_KEY: str = ""
    VOLCENGINE_ACCESS_KEY: str = ""
    VOLCENGINE_SECRET_KEY: str = ""
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:5174"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
