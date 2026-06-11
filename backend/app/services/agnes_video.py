import logging
from urllib.parse import quote

from ..core.config import settings
from ..core.exceptions import AgnesAPIException
from .base import AgnesBaseService

logger = logging.getLogger("baimo")


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

        if image_url and mode == "keyframes":
            images = image_url if isinstance(image_url, list) else [image_url]
            payload["extra_body"] = {"image": images, "mode": "keyframes"}
        elif image_url and isinstance(image_url, list):
            payload["extra_body"] = {"image": image_url}
        elif image_url:
            payload["image"] = image_url

        return payload

    async def create(self, **kwargs) -> dict:
        payload = self._build_payload(**kwargs)
        resp = await self._post(self.CREATE_URL, json=payload)

        try:
            data = resp.json()
            return {
                "video_id": data["video_id"],
                "task_id": data["task_id"],
                "status": data["status"],
            }
        except (KeyError, TypeError) as e:
            logger.error(f"Agnes Video API response parse error: {e}, response: {resp.text[:500]}")
            raise AgnesAPIException("Agnes API 返回了无法解析的响应")

    async def poll_status(self, video_id: str) -> dict:
        encoded_id = quote(video_id, safe="")
        url = f"{self.POLL_URL}?video_id={encoded_id}"

        resp = await self._get(url, timeout=30)

        try:
            data = resp.json()
        except Exception as e:
            logger.error(f"Agnes Video poll response parse error: {e}")
            raise AgnesAPIException("Agnes API 返回了无法解析的响应")

        status_val = data.get("status", "unknown")

        result = {
            "video_id": data.get("video_id", video_id),
            "status": status_val,
            "progress": data.get("progress", 0),
            "video_url": None,
            "error": None,
        }

        if status_val == "completed":
            # Agnes API 在 completed 时将视频 URL 放在 remixed_from_video_id 字段
            result["video_url"] = data.get("remixed_from_video_id") or data.get("video_url") or data.get("url")
        elif status_val == "failed":
            result["error"] = data.get("error") or data.get("message") or "视频生成失败"

        return result
