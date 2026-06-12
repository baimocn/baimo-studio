import logging

from ..core.config import settings
from ..core.exceptions import AgnesAPIException
from .base import AgnesBaseService

logger = logging.getLogger("baimo")


class AgnesImageService(AgnesBaseService):
    """Agnes AI 图像生成服务。

    官方文档：image 参数统一放在 extra_body 中（2.0-flash 和 2.1-flash 相同）。
    response_format 也必须在 extra_body 中。
    """
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
        """图生图 — image 放在 extra_body 中（2.0-flash 和 2.1-flash 相同）。

        官方文档原文：
        - 2.0-flash: "image 数组放在 extra_body 中"
        - 2.1-flash: "请将输入图片放在 extra_body 的 image 数组中"
        """
        payload = {
            "model": model,
            "prompt": prompt,
            "size": size,
            "extra_body": {
                "image": [image_url],
                "response_format": "url",
            },
        }
        return await self._post_and_extract_url(payload)

    async def compose(self, image_urls: list[str], prompt: str, size: str = "1024x768", model: str = MODEL_2_0_FLASH) -> str:
        """多图合成 — image 数组放在 extra_body 中。"""
        payload = {
            "model": model,
            "prompt": prompt,
            "size": size,
            "extra_body": {
                "image": image_urls,
                "response_format": "url",
            },
        }
        return await self._post_and_extract_url(payload)
