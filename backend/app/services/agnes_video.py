import logging
import json
import base64
import re
from pathlib import Path
from urllib.parse import quote

import httpx

from ..core.config import settings
from ..core.exceptions import AgnesAPIException
from .base import AgnesBaseService

logger = logging.getLogger("baimo")

<<<<<<< HEAD
# 前端 mode 到 API mode 的映射
_MODE_MAP = {
    "text2video": None,      # 文生视频不需要传 mode
    "image2video": None,     # 图生视频通过 image 参数自动推断
    "keyframes": "keyframes",
    "multi-image": None,     # 多图通过 extra_body.image 自动推断
}
=======
UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "uploads"


def _resolve_image_url(image_url: str) -> str:
    """Resolve image URL to a base64 data URI for local files.
    
    For local URLs (localhost), convert the file to a base64 data URI.
    For non-local URLs, return as-is.
    """
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
    
    data_uri = f"data:{mime};base64,{b64}"
    logger.info(f"Created data URI: {len(data_uri)} chars")
    
    return data_uri
>>>>>>> fed6557 (fix: add missing API endpoints and improve error handling)


class AgnesVideoService(AgnesBaseService):
    CREATE_URL = f"{settings.agnes_api_base}/v1/videos"
    POLL_URL = f"{settings.agnes_api_base}/agnesapi"
    MODEL = "agnes-video-v2.0"

    def _build_payload(self, **kwargs) -> dict:
        payload = {
            "model": self.MODEL,
            "prompt": kwargs["prompt"],
            "height": kwargs.get("height", 768),
            "width": kwargs.get("width", 1152),
            "num_frames": kwargs.get("num_frames", 121),
            "frame_rate": kwargs.get("frame_rate", 24),
        }

        if kwargs.get("negative_prompt") and kwargs["negative_prompt"].strip():
            payload["negative_prompt"] = kwargs["negative_prompt"].strip()
        if kwargs.get("seed") is not None:
            payload["seed"] = kwargs["seed"]
        if kwargs.get("num_inference_steps") is not None:
            payload["num_inference_steps"] = kwargs["num_inference_steps"]

        image_url = kwargs.get("image_url")
        mode = kwargs.get("mode")

        # 映射前端 mode 到 API mode
        api_mode = _MODE_MAP.get(mode) if mode else None

        if api_mode == "keyframes" and image_url:
            # 关键帧动画：多图放在 extra_body，mode 也放 extra_body
            images = image_url if isinstance(image_url, list) else [image_url]
            resolved = [_resolve_image_url(u) for u in images]
            logger.info(f"Keyframes resolved: {len(resolved)} images")
            payload["extra_body"] = {"image": resolved, "mode": "keyframes"}
        elif image_url and isinstance(image_url, list):
<<<<<<< HEAD
            # 多图视频：图片放在 extra_body
            payload["extra_body"] = {"image": image_url}
        elif image_url:
            # 单图生视频：image 放在顶层
            payload["image"] = image_url
=======
            resolved = [_resolve_image_url(u) for u in image_url]
            logger.info(f"Multi-image resolved: {len(resolved)} images")
            payload["extra_body"] = {"image": resolved}
        elif image_url:
            resolved = _resolve_image_url(image_url) if isinstance(image_url, str) else image_url
            logger.info(f"Single image resolved: {type(resolved)}")
            payload["image"] = resolved
>>>>>>> fed6557 (fix: add missing API endpoints and improve error handling)

        return payload

    async def create(self, **kwargs) -> dict:
        payload = self._build_payload(**kwargs)
        resp = await self._post(self.CREATE_URL, json=payload)

        try:
            data = resp.json()
            return {
                "video_id": data.get("video_id", ""),
                "task_id": data.get("task_id", data.get("id", "")),
                "status": data.get("status", "queued"),
            }
        except (KeyError, TypeError) as e:
            logger.error(f"Agnes Video API response parse error: {e}, response: {resp.text[:500]}")
            raise AgnesAPIException("Agnes API returned unparseable response")

    async def poll_status(self, video_id: str) -> dict:
        """轮询视频状态。官方文档：视频 URL 在 remixed_from_video_id 字段。"""
        encoded_id = quote(video_id, safe="")
        url = f"{self.POLL_URL}?video_id={encoded_id}"

        resp = await self.client.get(url, headers=self.headers, timeout=30)

        if resp.status_code == 429:
            logger.warning(f"Video poll rate limited for {video_id}, returning processing status")
            return {
                "video_id": video_id,
                "status": "processing",
                "progress": 0,
                "video_url": None,
                "error": None,
            }

        if resp.status_code == 404:
            logger.warning(f"Video task not found: {video_id}")
            return {
                "video_id": video_id,
                "status": "failed",
                "progress": 0,
                "video_url": None,
                "error": "Video task not found or expired",
            }

        if resp.status_code != 200:
            logger.error(f"Agnes Video poll error: {resp.status_code} - {resp.text[:500]}")
            return {
                "video_id": video_id,
                "status": "failed",
                "progress": 0,
                "video_url": None,
                "error": f"API error: {resp.status_code}",
            }

        try:
            data = resp.json()
        except Exception as e:
            logger.error(f"Agnes Video poll response parse error: {e}")
            return {
                "video_id": video_id,
                "status": "failed",
                "progress": 0,
                "video_url": None,
                "error": "Invalid API response",
            }

        status_val = data.get("status", "unknown")
        error_val = data.get("error")
        
        if isinstance(error_val, dict):
            error_val = json.dumps(error_val, ensure_ascii=False)
        elif error_val is not None:
            error_val = str(error_val)

        result = {
            "video_id": data.get("video_id", video_id),
            "status": status_val,
            "progress": data.get("progress", 0),
            "video_url": None,
            "error": error_val,
        }

        if status_val == "completed":
<<<<<<< HEAD
            # 官方文档明确：视频 URL 在 remixed_from_video_id 字段
            video_url = data.get("remixed_from_video_id")
            if not video_url:
                # 防御性 fallback
                video_url = data.get("video_url") or data.get("url")
            result["video_url"] = video_url
        elif status_val == "failed":
            result["error"] = data.get("error") or data.get("message") or "视频生成失败"
=======
            result["video_url"] = data.get("remixed_from_video_id") or data.get("video_url") or data.get("url")
>>>>>>> fed6557 (fix: add missing API endpoints and improve error handling)

        return result
