import sys
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

if getattr(sys, 'frozen', False):
    ENV_PATH = Path(sys.executable).parent / ".env"
else:
    ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(ENV_PATH), env_file_encoding="utf-8", extra="ignore")

    agnes_api_key: str = ""
    agnes_api_base: str = "https://apihub.agnes-ai.com"

    database_url: str = "sqlite+aiosqlite:///./data/agnes.db"

    cors_origins: str = "http://localhost:5180,http://localhost:5188"

    def update_api_key(self, new_key: str) -> None:
        self.agnes_api_key = new_key
        lines = ENV_PATH.read_text(encoding="utf-8").splitlines()
        found = False
        for i, line in enumerate(lines):
            if line.startswith("AGNES_API_KEY="):
                lines[i] = f"AGNES_API_KEY={new_key}"
                found = True
                break
        if not found:
            lines.append(f"AGNES_API_KEY={new_key}")
        ENV_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


_settings_instance: Settings | None = None


def init_settings() -> Settings:
    """在 .env 就绪后调用，初始化全局 settings 单例。"""
    global _settings_instance
    if _settings_instance is None:
        _settings_instance = Settings()
    return _settings_instance


def get_settings() -> Settings:
    """获取已初始化的 settings，未初始化则自动初始化。"""
    if _settings_instance is None:
        return init_settings()
    return _settings_instance


def __getattr__(name: str):
    """模块级懒加载：from .core.config import settings 不再在 import 时触发 I/O。"""
    if name == "settings":
        return get_settings()
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
