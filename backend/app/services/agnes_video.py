import logging
from urllib.parse import quote

from ..core.config import settings
from ..core.exceptions import AgnesAPIException
from .base import AgnesBaseService

logger = logging.getLogger("baimo")

# 前端 mode 到 API mode 的映射
_MODE_MAP = {
    "text2video": None,      # 文生视频不需要传 mode
    "image2video": None,     # 图生视频通过 image 参数自动推断
    "keyframes": "keyframes",
    "multi-image": None,     # 多图通过 extra_body.image 自动推断
}


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
            payload["extra_body"] = {"image": images, "mode": "keyframes"}
        elif image_url and isinstance(image_url, list):
            # 多图视频：图片放在 extra_body
            payload["extra_body"] = {"image": image_url}
        elif image_url:
            # 单图生视频：image 放在顶层
            payload["image"] = image_url

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
            raise AgnesAPIException("Agnes API 返回了无法解析的响应")

    async def poll_status(self, video_id: str) -> dict:
        """轮询视频状态。官方文档：视频 URL 在 remixed_from_video_id 字段。"""
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
            # 官方文档明确：视频 URL 在 remixed_from_video_id 字段
            video_url = data.get("remixed_from_video_id")
            if not video_url:
                # 防御性 fallback
                video_url = data.get("video_url") or data.get("url")
            result["video_url"] = video_url
        elif status_val == "failed":
            result["error"] = data.get("error") or data.get("message") or "视频生成失败"

        return result
