from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 43200  # 30 days
    refresh_token_expire_days: int = 30
    cors_origins: str = "http://localhost:3000"
    admin_password: str = "K2tool_RH_admin_2026"
    openrouter_api_key: str = ""
    openclaw_cli_path: str = "/home/admin/.nvm/versions/node/v22.22.2/bin/openclaw"
    openclaw_notify_channel: str = "telegram"
    openclaw_notify_account: str = "serik"
    openclaw_notify_target: str = "160603571"
    telegram_notify_bot_token: str = ""
    telegram_notify_chat_id: str = ""

    @field_validator("database_url")
    @classmethod
    def ensure_asyncpg(cls, v: str) -> str:
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql+asyncpg://", 1)
        elif v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    class Config:
        env_file = ".env"


settings = Settings()
