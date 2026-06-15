import logging

import httpx

from ..core.config import settings
from ..core.exceptions import AgnesAPIException

logger = logging.getLogger("baimo")

_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=httpx.Timeout(600.0, connect=30.0))
    return _client


class AgnesBaseService:
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
        logger.info(f"Calling API: {url}")
        try:
            resp = await self.client.post(url, json=json, headers=self.headers, timeout=timeout or 600.0)
            logger.info(f"API response: {resp.status_code}")
            if resp.status_code != 200:
                logger.error(f"Agnes API error: {resp.status_code} - {resp.text[:500]}")
                raise AgnesAPIException(f"Agnes API returned error ({resp.status_code})")
            return resp
        except httpx.TimeoutException:
            logger.error(f"API timeout: {url}")
            raise AgnesAPIException("API request timeout")
        except Exception as e:
            logger.error(f"API error: {e}")
            raise

    async def _get(self, url: str, timeout: float | None = None) -> httpx.Response:
        logger.info(f"Calling API GET: {url}")
        try:
            resp = await self.client.get(url, headers=self.headers, timeout=timeout or 600.0)
            logger.info(f"API response: {resp.status_code}")
            if resp.status_code != 200:
                logger.error(f"Agnes API error: {resp.status_code} - {resp.text[:500]}")
                raise AgnesAPIException(f"Agnes API returned error ({resp.status_code})")
            return resp
        except httpx.TimeoutException:
            logger.error(f"API timeout: {url}")
            raise AgnesAPIException("API request timeout")
        except Exception as e:
            logger.error(f"API error: {e}")
            raise

    @staticmethod
    async def close() -> None:
        global _client
        if _client is not None and not _client.is_closed:
            await _client.aclose()
            _client = None
