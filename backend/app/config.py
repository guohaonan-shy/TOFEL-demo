"""Application configuration using pydantic-settings."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "TOEFL Speaking Backend"
    DEBUG: bool = True
    
    # Database (Supabase PostgreSQL)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres"
    
    # Supabase API URL (for public URLs)
    SUPABASE_URL: str = "http://127.0.0.1:54321"
    
    # Supabase Auth - JWT Secret for token verification
    # Get from: supabase status -> JWT Secret
    SUPABASE_JWT_SECRET: str = ""
    
    # Storage (S3 compatible - from `supabase status`)
    STORAGE_ENDPOINT: str = "http://127.0.0.1:54321/storage/v1/s3"
    STORAGE_ACCESS_KEY: str = ""  # From supabase status -> Storage (S3) -> Access Key
    STORAGE_SECRET_KEY: str = ""  # From supabase status -> Storage (S3) -> Secret Key
    STORAGE_REGION: str = "local"
    
    # Storage Buckets
    STORAGE_BUCKET_QUESTIONS: str = "toefl-questions"
    STORAGE_BUCKET_RECORDINGS: str = "toefl-recordings"
    
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
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
