from typing import Literal

from pydantic import BaseModel, field_validator


class PromptOptimizeRequest(BaseModel):
    user_input: str = ""
    type: Literal["image", "video", "edit"] = "image"

    @field_validator("user_input")
    @classmethod
    def validate_user_input(cls, v: str) -> str:
        if len(v) > 5000:
            raise ValueError("user_input 长度不能超过 5000 字符")
        return v


class PromptOptimizeResponse(BaseModel):
    optimized: str
    original: str


class AnalyzeImageRequest(BaseModel):
    image_url: str
    instruction: str = "Describe the content of this image in detail."

    @field_validator("instruction")
    @classmethod
    def validate_instruction(cls, v: str) -> str:
        if len(v) > 2000:
            raise ValueError("instruction 长度不能超过 2000 字符")
        return v


class AnalyzeImageResponse(BaseModel):
    analysis: str
