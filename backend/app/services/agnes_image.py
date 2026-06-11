import logging

from ..core.config import settings
from ..core.exceptions import AgnesAPIException
from .base import AgnesBaseService

logger = logging.getLogger("baimo")


class AgnesImageService(AgnesBaseService):
    BASE_URL = f"{settings.agnes_api_base}/v1/images/generations"
    MODEL_2_1_FLASH = "agnes-image-2.1-flash"
    MODEL_2_0_FLASH = "agnes-image-2.0-flash"

    async def _post_and_extract_url(self, payload: dict) -> str:
        resp = await self._post(self.BASE_URL, json=payload)

        try:
            data = resp.json()
            return data["data"][0]["url"]
        except (KeyError, IndexError, TypeError) as e:
            logger.error(f"Agnes Image API response parse error: {e}, response: {resp.text[:500]}")
            raise AgnesAPIException("Agnes API 返回了无法解析的响应")

    async def generate(self, prompt: str, size: str = "1024x768", model: str = MODEL_2_1_FLASH, negative_prompt: str | None = None) -> str:
        payload = {
            "model": model,
            "prompt": prompt,
            "size": size,
            "extra_body": {"response_format": "url"},
        }
        if negative_prompt and negative_prompt.strip():
            payload["negative_prompt"] = negative_prompt.strip()
        return await self._post_and_extract_url(payload)

    async def edit(self, image_url: str, prompt: str, size: str = "1024x768", model: str = MODEL_2_1_FLASH, negative_prompt: str | None = None) -> str:
        payload = {
            "model": model,
            "prompt": prompt,
            "size": size,
            "extra_body": {
                "image": [image_url],
                "response_format": "url",
            },
        }
        if negative_prompt and negative_prompt.strip():
            payload["negative_prompt"] = negative_prompt.strip()
        return await self._post_and_extract_url(payload)

    async def compose(self, image_urls: list[str], prompt: str, size: str = "1024x768") -> str:
        payload = {
            "model": self.MODEL_2_0_FLASH,
            "prompt": prompt,
            "size": size,
            "extra_body": {"image": image_urls, "response_format": "url"},
        }
        return await self._post_and_extract_url(payload)
