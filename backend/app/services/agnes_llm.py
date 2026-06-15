import json
import logging
import sys

import httpx

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
8. Always write in English, regardless of the input language."""

IMAGE_SUFFIX = "\n\nAdditional context: This prompt will be used for AI IMAGE generation. Focus on visual details, composition, and static elements."
EDIT_SUFFIX = "\n\nAdditional context: This prompt will be used for AI IMAGE EDITING (image-to-image)."
VIDEO_SUFFIX = "\n\nAdditional context: This prompt will be used for AI VIDEO generation. Include motion cues."


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
    }
    if stream:
        payload["stream"] = True
    return payload


def _extract_content(msg: dict) -> str:
    content = msg.get("content")
    if content and content.strip():
        return content.strip()
    reasoning = msg.get("reasoning_content")
    if reasoning and reasoning.strip():
        return reasoning.strip()
    return ""


def _extract_delta_content(chunk: dict) -> str:
    """Safely extract content from a streaming chunk."""
    choices = chunk.get("choices")
    if not choices or not isinstance(choices, list) or len(choices) == 0:
        return ""
    delta = choices[0].get("delta")
    if not delta:
        return ""
    return delta.get("content", "") or ""


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
            raise AgnesAPIException("Agnes API returned unparseable response")

    async def optimize_prompt_stream(self, user_input: str, type: str = "image"):
        payload = _build_payload(user_input, type, stream=True)
        headers = self.headers
        logger.info(f"Starting prompt optimization stream for type={type}")

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream("POST", self.BASE_URL, json=payload, headers=headers) as resp:
                    if resp.status_code != 200:
                        body = await resp.aread()
                        logger.error(f"Agnes API stream error: {resp.status_code} - {body[:500]}")
                        raise AgnesAPIException(f"Agnes API returned error ({resp.status_code})")

                    async for line in resp.aiter_lines():
                        if not line:
                            continue
                        if not line.startswith("data: "):
                            continue
                        data_str = line[6:]
                        if data_str.strip() == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data_str)
                            content = _extract_delta_content(chunk)
                            if content:
                                yield content
                        except json.JSONDecodeError as e:
                            logger.warning(f"JSON decode error in stream: {e}, data: {data_str[:100]}")
                            continue
                        except (IndexError, KeyError) as e:
                            logger.warning(f"Parse error in stream: {e}")
                            continue
        except httpx.TimeoutException:
            logger.error("Timeout during prompt optimization stream")
            raise AgnesAPIException("Request timeout")
        except Exception as e:
            logger.error(f"Stream error: {e}")
            raise

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
            raise AgnesAPIException("Agnes API returned unparseable response")
