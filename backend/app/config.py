from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://psy:psy@localhost:5432/psytests"
    jwt_secret: str = "change-me-in-production"
    jwt_refresh_secret: str | None = None
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    app_base_url: str = "http://localhost:3000"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def refresh_secret(self) -> str:
        return self.jwt_refresh_secret or self.jwt_secret

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
