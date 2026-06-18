"""Application configuration — loads from .env and config/settings.yaml"""
import yaml
import os
from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────────────────────────────
    APP_ENV: str = "development"
    APP_URL: str = "http://localhost:3000"
    SECRET_KEY: str = "dev_secret_key_change_in_prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://patchops:patchops_secret@localhost:5432/patchops"

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── Gemini / Vertex AI ────────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    GOOGLE_CLOUD_PROJECT: str = ""
    GOOGLE_CLOUD_LOCATION: str = "us-central1"
    GEMINI_MODEL_CLASSIFICATION: str = "gemini-1.5-flash-8b"
    GEMINI_MODEL_AGENT: str = "gemini-1.5-flash"
    GEMINI_MODEL_RCA: str = "gemini-1.5-pro"
    GOOGLE_APPLICATION_CREDENTIALS: str = ""

    # ── ServiceNow ────────────────────────────────────────────────────────────
    SERVICENOW_INSTANCE: str = ""
    SERVICENOW_USER: str = ""
    SERVICENOW_PASSWORD: str = ""
    WEBHOOK_SECRET: str = ""

    # ── Email ─────────────────────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "patchops@company.com"
    EMAIL_TEAM_DL: str = "infra-team@company.com"

    # ── WinRM ─────────────────────────────────────────────────────────────────
    WINRM_USERNAME: str = "Administrator"
    WINRM_PASSWORD: str = ""
    WINRM_PORT: int = 5985
    WINRM_USE_SSL: bool = False
    WINRM_MOCK_MODE: bool = True

    # ── Agents ────────────────────────────────────────────────────────────────
    MAX_PARALLEL_REBOOTS: int = 5
    REBOOT_TIMEOUT_SECONDS: int = 300
    HEALTH_CHECK_RETRIES: int = 3
    HEALTH_CHECK_INTERVAL_SECONDS: int = 30
    DEVIATION_THRESHOLD_PERCENT: float = 15.0

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


def load_yaml_config() -> dict:
    cfg_path = os.path.join(os.path.dirname(__file__), "../../config/settings.yaml")
    if os.path.exists(cfg_path):
        with open(cfg_path) as f:
            return yaml.safe_load(f)
    return {}


settings = get_settings()
yaml_config = load_yaml_config()
