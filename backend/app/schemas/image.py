import re
from typing import Literal

from pydantic import BaseModel, field_validator


class ImageGenerateRequest(BaseModel):
    prompt: str
    size: str = "1024x768"
    model: Literal["agnes-image-2.1-flash", "agnes-image-2.0-flash"] = "agnes-image-2.1-flash"
    negative_prompt: str | None = None

    @field_validator("prompt")
    @classmethod
    def validate_prompt(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("prompt 不能为空")
        if len(v) > 5000:
            raise ValueError("prompt 长度不能超过 5000 字符")
        return v.strip()

    @field_validator("size")
    @classmethod
    def validate_size(cls, v: str) -> str:
        if not re.match(r"^\d{3,4}x\d{3,4}$", v):
            raise ValueError("size 格式应为 WIDTHxHEIGHT，如 1024x768")
        return v


class ImageEditRequest(BaseModel):
    prompt: str
    size: str = "1024x768"
    model: Literal["agnes-image-2.1-flash", "agnes-image-2.0-flash"] = "agnes-image-2.1-flash"
    image_url: str
    negative_prompt: str | None = None

    @field_validator("prompt")
    @classmethod
    def validate_prompt(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("prompt 不能为空")
        if len(v) > 5000:
            raise ValueError("prompt 长度不能超过 5000 字符")
        return v.strip()

    @field_validator("image_url")
    @classmethod
    def validate_image_url(cls, v: str) -> str:
        if not v:
            raise ValueError("image_url 不能为空")
        if not v.startswith(("http://", "https://")):
            raise ValueError("image_url 必须是 http/https URL")
        return v


class ImageComposeRequest(BaseModel):
    prompt: str
    size: str = "1024x768"
    image_urls: list[str]

    @field_validator("prompt")
    @classmethod
    def validate_prompt(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("prompt 不能为空")
        return v.strip()

    @field_validator("image_urls")
    @classmethod
    def validate_image_urls(cls, v: list[str]) -> list[str]:
        if len(v) < 2:
            raise ValueError("至少需要 2 张图片")
        if len(v) > 10:
            raise ValueError("最多支持 10 张图片")
        return v


class BatchGenerateRequest(BaseModel):
    prompt: str
    size: str = "1024x768"
    model: Literal["agnes-image-2.1-flash", "agnes-image-2.0-flash"] = "agnes-image-2.1-flash"
    num_images: int = 4
    seed: int | None = None

    @field_validator("prompt")
    @classmethod
    def validate_prompt(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("prompt 不能为空")
        if len(v) > 5000:
            raise ValueError("prompt 长度不能超过 5000 字符")
        return v.strip()

    @field_validator("size")
    @classmethod
    def validate_size(cls, v: str) -> str:
        if not re.match(r"^\d{3,4}x\d{3,4}$", v):
            raise ValueError("size 格式应为 WIDTHxHEIGHT，如 1024x768")
        return v

    @field_validator("num_images")
    @classmethod
    def validate_num_images(cls, v: int) -> int:
        if v < 1:
            raise ValueError("num_images 不能小于 1")
        if v > 8:
            raise ValueError("num_images 不能超过 8")
        return v


class BatchImageResult(BaseModel):
    url: str
    model: str
    seed: int


class BatchImageResponse(BaseModel):
    results: list[BatchImageResult]
    total: int


class ImageResponse(BaseModel):
    url: str
    model: str
