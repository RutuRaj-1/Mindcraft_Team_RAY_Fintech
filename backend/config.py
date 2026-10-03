import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

class Settings(BaseSettings):
    BASE_DIR: Path = BASE_DIR
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    DEMO_MODE: bool = True

    # Firebase Settings
    FIREBASE_PROJECT_ID: str = "finflow-ai-demo"
    FIREBASE_PRIVATE_KEY_ID: str = ""
    FIREBASE_PRIVATE_KEY: str = ""
    FIREBASE_CLIENT_EMAIL: str = ""
    FIREBASE_CLIENT_ID: str = ""
    FIREBASE_STORAGE_BUCKET: str = "finflow-ai-demo.appspot.com"
    FIREBASE_CREDENTIALS_PATH: str = ""

    # AI / LLM Providers
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    # Local storage directory for document uploads
    UPLOAD_DIR: Path = BASE_DIR / "uploads"

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
