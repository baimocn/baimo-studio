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
        """文生图 — model + prompt + size，response_format 在 extra_body 中。"""
        payload = {
            "model": model,
            "prompt": prompt,
            "size": size,
            "extra_body": {"response_format": "url"},
        }
        return await self._post_and_extract_url(payload)

    async def edit(self, image_url: str, prompt: str, size: str = "1024x768", model: str = MODEL_2_1_FLASH, negative_prompt: str | None = None) -> str:
        """图生图 — 根据模型版本区分 image 参数位置：
        - 2.1-flash: image 在顶层
        - 2.0-flash: image 在 extra_body 中
        """
        payload = {
            "model": model,
            "prompt": prompt,
            "size": size,
            "extra_body": {"response_format": "url"},
        }

        # 官方文档：2.1-flash 图生图 image 在顶层，2.0-flash 在 extra_body
        if model == self.MODEL_2_0_FLASH:
            payload["extra_body"]["image"] = [image_url]
        else:
            payload["image"] = [image_url]

        return await self._post_and_extract_url(payload)

    async def compose(self, image_urls: list[str], prompt: str, size: str = "1024x768", model: str = MODEL_2_0_FLASH) -> str:
        """多图合成 — 根据模型版本区分 image 位置。"""
        payload = {
            "model": model,
            "prompt": prompt,
            "size": size,
            "extra_body": {"response_format": "url"},
        }

        if model == self.MODEL_2_0_FLASH:
            payload["extra_body"]["image"] = image_urls
        else:
            payload["image"] = image_urls

        return await self._post_and_extract_url(payload)
