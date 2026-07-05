from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "NovaByte API"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://novabyte:novabyte_dev_password@db:5432/novabyte"
    admin_api_key: str = "dev-admin-key"
    cors_origins: str = "*"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    @property
    def cors_origin_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
