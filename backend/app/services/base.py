import logging

import httpx

from ..core.config import settings
from ..core.exceptions import AgnesAPIException

logger = logging.getLogger("baimo")

# Module-level shared client, reused across all Agnes services
_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=120)
    return _client


class AgnesBaseService:
    """Base class for Agnes API services. Provides shared client, headers,
    and uniform request helpers. httpx exceptions are intentionally NOT caught
    here so they bubble up to the global exception handler in main.py."""

    @property
    def client(self) -> httpx.AsyncClient:
        return _get_client()

    @property
    def headers(self) -> dict:
        return {
            "Authorization": f"Bearer {settings.agnes_api_key}",
            "Content-Type": "application/json",
        }

    async def _post(self, url: str, json: dict | None = None, timeout: float | None = None) -> httpx.Response:
        """POST request. Raises AgnesAPIException on non-200 status."""
        resp = await self.client.post(url, json=json, headers=self.headers, timeout=timeout)
        if resp.status_code != 200:
            logger.error(f"Agnes API error: {resp.status_code} - {resp.text[:500]}")
            raise AgnesAPIException(f"Agnes API 返回错误 ({resp.status_code})")
        return resp

    async def _get(self, url: str, timeout: float | None = None) -> httpx.Response:
        """GET request. Raises AgnesAPIException on non-200 status."""
        resp = await self.client.get(url, headers=self.headers, timeout=timeout)
        if resp.status_code != 200:
            logger.error(f"Agnes API error: {resp.status_code} - {resp.text[:500]}")
            raise AgnesAPIException(f"Agnes API 返回错误 ({resp.status_code})")
        return resp

    @staticmethod
    async def close() -> None:
        """Close the shared HTTP client. Call on application shutdown."""
        global _client
        if _client is not None and not _client.is_closed:
            await _client.aclose()
            _client = None
