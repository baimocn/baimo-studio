from typing import Literal

from pydantic import BaseModel, field_validator


class VideoCreateRequest(BaseModel):
    prompt: str
    image_url: str | list[str] | None = None
    mode: Literal["text2video", "image2video", "keyframes", "multi-image"] | None = None
    height: int = 768
    width: int = 1152
    num_frames: int = 121
    frame_rate: int = 24
    negative_prompt: str | None = None
    seed: int | None = None
    num_inference_steps: int | None = None

    @field_validator("prompt")
    @classmethod
    def validate_prompt(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("prompt 不能为空")
        if len(v) > 5000:
            raise ValueError("prompt 长度不能超过 5000 字符")
        return v.strip()

    @field_validator("num_frames")
    @classmethod
    def validate_num_frames(cls, v: int) -> int:
        if v < 1 or v > 441:
            raise ValueError("num_frames 必须在 1-441 之间")
        if (v - 1) % 8 != 0:
            raise ValueError("num_frames 必须满足 8n+1（如 81, 121, 161, 241, 441）")
        return v

    @field_validator("width", "height")
    @classmethod
    def validate_dimension(cls, v: int) -> int:
        if v < 64 or v > 2048:
            raise ValueError("width/height 必须在 64-2048 之间")
        if v % 8 != 0:
            raise ValueError("width/height 必须是 8 的倍数")
        return v

    @field_validator("frame_rate")
    @classmethod
    def validate_frame_rate(cls, v: int) -> int:
        if v < 1 or v > 60:
            raise ValueError("frame_rate 必须在 1-60 之间")
        return v

    @field_validator("seed")
    @classmethod
    def validate_seed(cls, v: int | None) -> int | None:
        if v is not None and (v < 0 or v > 2**32 - 1):
            raise ValueError("seed 必须在 0-4294967295 之间")
        return v

    @field_validator("num_inference_steps")
    @classmethod
    def validate_num_inference_steps(cls, v: int | None) -> int | None:
        if v is not None and (v < 1 or v > 100):
            raise ValueError("num_inference_steps 必须在 1-100 之间")
        return v


class VideoCreateResponse(BaseModel):
    video_id: str
    task_id: str
    status: str


class VideoStatusResponse(BaseModel):
    video_id: str
    status: str
    progress: int
    video_url: str | None = None
    error: str | None = None
