import logging
import base64
import re
from pathlib import Path

from ..core.config import settings
from ..core.exceptions import AgnesAPIException
from .base import AgnesBaseService

logger = logging.getLogger("baimo")

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "uploads"


class AgnesImageService(AgnesBaseService):
    """Agnes AI 图像生成服务。

    官方文档：image 参数统一放在 extra_body 中（2.0-flash 和 2.1-flash 相同）。
    response_format 也必须在 extra_body 中。
    """
    BASE_URL = f"{settings.agnes_api_base}/v1/images/generations"
    MODEL_2_1_FLASH = "agnes-image-2.1-flash"
    MODEL_2_0_FLASH = "agnes-image-2.0-flash"

    async def _post_and_extract_url(self, payload: dict) -> str:
<<<<<<< HEAD
        resp = await self._post(self.BASE_URL, json=payload)
=======
        logger.info(f"Calling image API: {self.BASE_URL}")
        logger.info(f"Payload size: {len(str(payload))} bytes")
        
>>>>>>> fed6557 (fix: add missing API endpoints and improve error handling)
        try:
            resp = await self._post(self.BASE_URL, json=payload)
            logger.info(f"Image API response: {resp.status_code}")
            
            if resp.status_code != 200:
                logger.error(f"Image API error: {resp.status_code} - {resp.text[:500]}")
                raise AgnesAPIException(f"Image API returned error ({resp.status_code})")
            
            data = resp.json()
            logger.info(f"Image API data: {data}")
            
            return data["data"][0]["url"]
        except AgnesAPIException:
            raise
        except (KeyError, IndexError, TypeError) as e:
            logger.error(f"Agnes Image API response parse error: {e}, response: {resp.text[:500]}")
            raise AgnesAPIException("Agnes API returned unparseable response")
        except Exception as e:
            logger.error(f"Image API exception: {e}")
            raise AgnesAPIException(str(e))

<<<<<<< HEAD
    async def generate(self, prompt: str, size: str = "1024x768", model: str = MODEL_2_1_FLASH, negative_prompt: str | None = None) -> str:
        """文生图 — model + prompt + size，response_format 在 extra_body 中。"""
=======
    def _resolve_image_url(self, image_url: str) -> str:
        m = re.match(r"https?://(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(/.+)", image_url)
        if not m:
            return image_url
        file_path = UPLOAD_DIR / m.group(3).replace('/api/image/local/', '').lstrip("/")
        if not file_path.exists():
            logger.error(f"Image file not found: {file_path}")
            return image_url
        
        file_size = file_path.stat().st_size
        logger.info(f"Resolving image: {file_path}, size: {file_size} bytes")
        
        suffix = file_path.suffix.lower()
        mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif"}
        mime = mime_map.get(suffix, "image/png")
        
        raw_bytes = file_path.read_bytes()
        b64 = base64.b64encode(raw_bytes).decode()
        padding_needed = (4 - len(b64) % 4) % 4
        b64 += "=" * padding_needed
        
        logger.info(f"Base64 length: {len(b64)}, padding added: {padding_needed}")
        
        return f"data:{mime};base64,{b64}"

    async def generate(self, prompt: str, size: str = "1024x1024", model: str = MODEL_2_1_FLASH, negative_prompt: str | None = None) -> str:
>>>>>>> fed6557 (fix: add missing API endpoints and improve error handling)
        payload = {
            "model": model,
            "prompt": prompt,
            "size": size,
            "extra_body": {"response_format": "url"},
        }
        return await self._post_and_extract_url(payload)

<<<<<<< HEAD
    async def edit(self, image_url: str, prompt: str, size: str = "1024x768", model: str = MODEL_2_1_FLASH, negative_prompt: str | None = None) -> str:
        """图生图 — image 放在 extra_body 中（2.0-flash 和 2.1-flash 相同）。

        官方文档原文：
        - 2.0-flash: "image 数组放在 extra_body 中"
        - 2.1-flash: "请将输入图片放在 extra_body 的 image 数组中"
        """
=======
    async def edit(self, image_url: str, prompt: str, size: str = "1024x1024", model: str = MODEL_2_1_FLASH, negative_prompt: str | None = None) -> str:
        resolved_url = self._resolve_image_url(image_url)
>>>>>>> fed6557 (fix: add missing API endpoints and improve error handling)
        payload = {
            "model": model,
            "prompt": prompt,
            "size": size,
            "extra_body": {
                "image": [resolved_url],
                "response_format": "url",
            },
        }
        return await self._post_and_extract_url(payload)

<<<<<<< HEAD
    async def compose(self, image_urls: list[str], prompt: str, size: str = "1024x768", model: str = MODEL_2_0_FLASH) -> str:
        """多图合成 — image 数组放在 extra_body 中。"""
=======
    async def compose(self, image_urls: list[str], prompt: str, size: str = "1024x1024") -> str:
        resolved_urls = [self._resolve_image_url(u) for u in image_urls]
>>>>>>> fed6557 (fix: add missing API endpoints and improve error handling)
        payload = {
            "model": model,
            "prompt": prompt,
            "size": size,
<<<<<<< HEAD
            "extra_body": {
                "image": image_urls,
                "response_format": "url",
            },
=======
            "extra_body": {"image": resolved_urls, "response_format": "url"},
>>>>>>> fed6557 (fix: add missing API endpoints and improve error handling)
        }
        return await self._post_and_extract_url(payload)
