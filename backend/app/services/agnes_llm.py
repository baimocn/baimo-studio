import json
import logging

from ..core.config import settings
from ..core.exceptions import AgnesAPIException
from .base import AgnesBaseService

logger = logging.getLogger("baimo")

SYSTEM_PROMPT = """You are a world-class prompt engineer for AI image and video generation.
Your job is to transform a user's rough idea (often in Chinese) into a vivid, detailed English prompt that will produce stunning results.

Rules:
1. Understand the user's INTENT and CREATIVE VISION, not just translate words literally.
2. Add sensory details: textures, materials, atmosphere, mood, time of day.
3. Use professional photography/cinema terminology when appropriate (e.g., "bokeh", "golden hour", "Dutch angle", "rack focus").
4. Preserve the user's core concept, but enhance it with artistic details they didn't explicitly mention.
5. If the input is vague, make creative choices that align with the mood. Don't ask for clarification — commit to a vision.
6. Keep the prompt concise but rich — typically 1-3 sentences, 30-80 words.
7. Output ONLY the optimized prompt. No explanations, no labels, no prefix like "Prompt:".
8. Always write in English, regardless of the input language.

Bad example (too mechanical):
  Input: 一只猫在沙发上
  Output: A cat on a sofa, high quality, detailed

Good example (creative and vivid):
  Input: 一只猫在沙发上
  Output: A fluffy orange tabby cat curled up on a velvet sofa, afternoon sunlight streaming through sheer curtains casting soft warm shadows, shallow depth of field, cozy domestic scene, photorealistic

Bad example (literal translation):
  Input: 赛博朋克城市
  Output: A cyberpunk city, neon lights, high quality

Good example (enhanced vision):
  Input: 赛博朋克城市
  Output: A sprawling cyberpunk megacity at night, towering holographic billboards casting electric blue and magenta reflections on rain-soaked streets, dense crowd of augmented humans below, cinematic wide-angle shot, blade runner atmosphere, volumetric fog"""

IMAGE_SUFFIX = """\n\nAdditional context: This prompt will be used for AI IMAGE generation. Focus on visual details, composition, and static elements. Emphasize what the viewer sees."""

EDIT_SUFFIX = """\n\nAdditional context: This prompt will be used for AI IMAGE EDITING (image-to-image). The user has uploaded an existing image and wants to modify it. Focus on: 1. What CHANGES to make (new elements, style transfer, modifications). 2. What to PRESERVE from the original image (composition, subject, key features). 3. The target STYLE or MOOD after editing. Structure: [modification request] + [new style/scene] + [elements to add/remove] + [elements to preserve]"""

VIDEO_SUFFIX = """\n\nAdditional context: This prompt will be used for AI VIDEO generation. Include motion cues: what moves, how the camera moves, the pacing. Use verbs that describe action and change."""


def _build_payload(user_input: str, type: str, stream: bool = False) -> dict:
    suffix = EDIT_SUFFIX if type == "edit" else (VIDEO_SUFFIX if type == "video" else IMAGE_SUFFIX)
    payload = {
        "model": "agnes-2.0-flash",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT + suffix},
            {"role": "user", "content": user_input},
        ],
        "temperature": 0.45,
        "max_tokens": 768,
        "chat_template_kwargs": {"enable_thinking": True},
    }
    if stream:
        payload["stream"] = True
    return payload


def _extract_content(msg: dict) -> str:
    """Extract the final content, preferring content over reasoning_content."""
    content = msg.get("content")
    if content and content.strip():
        return content.strip()
    reasoning = msg.get("reasoning_content")
    if reasoning and reasoning.strip():
        return reasoning.strip()
    return ""


class AgnesLLMService(AgnesBaseService):
    BASE_URL = f"{settings.agnes_api_base}/v1/chat/completions"
    MODEL = "agnes-2.0-flash"

    async def optimize_prompt(self, user_input: str, type: str = "image") -> str:
        payload = _build_payload(user_input, type, stream=False)
        resp = await self._post(self.BASE_URL, json=payload, timeout=60)

        try:
            msg = resp.json()["choices"][0]["message"]
            return _extract_content(msg)
        except (KeyError, IndexError, TypeError) as e:
            logger.error(f"Agnes LLM response parse error: {e}")
            raise AgnesAPIException("Agnes API 返回了无法解析的响应")

    async def optimize_prompt_stream(self, user_input: str, type: str = "image"):
        payload = _build_payload(user_input, type, stream=True)

        async with self.client.stream("POST", self.BASE_URL, json=payload, headers=self.headers, timeout=120) as resp:
            if resp.status_code != 200:
                body = await resp.aread()
                logger.error(f"Agnes LLM stream error: {resp.status_code} - {body.decode()[:500]}")
                raise AgnesAPIException(f"Agnes API 返回错误 ({resp.status_code})")

            async for line in resp.aiter_lines():
                if not line.startswith("data: "):
                    continue
                data_str = line[6:]
                if data_str.strip() == "[DONE]":
                    break
                try:
                    chunk = json.loads(data_str)
                    delta = chunk.get("choices", [{}])[0].get("delta", {})
                    # 只输出 content，跳过 reasoning_content（思考过程不展示给用户）
                    content = delta.get("content", "")
                    if content:
                        yield content
                except (json.JSONDecodeError, IndexError, KeyError):
                    continue

    async def analyze_image(self, image_url: str, instruction: str = "Describe the content of this image in detail.") -> str:
        payload = {
            "model": self.MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": instruction},
                        {"type": "image_url", "image_url": {"url": image_url}},
                    ],
                }
            ],
            "max_tokens": 2048,
        }

        resp = await self._post(self.BASE_URL, json=payload, timeout=60)

        try:
            msg = resp.json()["choices"][0]["message"]
            return _extract_content(msg)
        except (KeyError, IndexError, TypeError) as e:
            logger.error(f"Agnes LLM analyze response parse error: {e}")
            raise AgnesAPIException("Agnes API 返回了无法解析的响应")
