from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Meghkanya API"
    app_env: str = "development"
    secret_key: str = "change-this-in-production"
    access_token_expire_minutes: int = 480
    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/saree_retail"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    bootstrap_admin_enabled: bool = True
    bootstrap_admin_username: str = "admin"
    bootstrap_admin_password: str = "admin123"
    bootstrap_admin_full_name: str = "System Admin"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
