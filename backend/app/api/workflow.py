import re

from fastapi import APIRouter, Depends
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.dependencies import get_image_service, get_llm_service
from ..database import get_session as get_db
from ..models.generation import Generation
from ..services.agnes_image import AgnesImageService
from ..services.agnes_llm import AgnesLLMService

router = APIRouter(prefix="/api/workflow", tags=["workflow"])

IMAGE_ANALYSIS_INSTRUCTION = (
    "Analyze this image in detail. Describe: "
    "1) Main subject and composition, "
    "2) Color palette and lighting, "
    "3) Art style (photorealistic, illustration, painting, etc.), "
    "4) Mood and atmosphere, "
    "5) Any notable textures, patterns, or techniques. "
    "Be thorough — this analysis will be used to generate a similar image."
)


class AnalyzeAndGenerateRequest(BaseModel):
    image_url: str
    style_modifiers: str | None = None
    size: str = "1024x768"
    model: str = "agnes-image-2.1-flash"

    @field_validator("image_url")
    @classmethod
    def validate_image_url(cls, v: str) -> str:
        if not v:
            raise ValueError("image_url 不能为空")
        if not v.startswith(("http://", "https://")):
            raise ValueError("image_url 必须是 http/https URL")
        return v

    @field_validator("size")
    @classmethod
    def validate_size(cls, v: str) -> str:
        if not re.match(r"^\d{3,4}x\d{3,4}$", v):
            raise ValueError("size 格式应为 WIDTHxHEIGHT，如 1024x768")
        return v

    @field_validator("style_modifiers")
    @classmethod
    def validate_style_modifiers(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if len(v) > 2000:
                raise ValueError("style_modifiers 长度不能超过 2000 字符")
            return v if v else None
        return v


class AnalyzeAndGenerateResponse(BaseModel):
    original_analysis: str
    optimized_prompt: str
    generated_url: str


@router.post("/analyze-and-generate", response_model=AnalyzeAndGenerateResponse)
async def analyze_and_generate(
    body: AnalyzeAndGenerateRequest,
    db: AsyncSession = Depends(get_db),
    llm_svc: AgnesLLMService = Depends(get_llm_service),
    image_svc: AgnesImageService = Depends(get_image_service),
):
    # Step 1: AI 分析图片
    analysis = await llm_svc.analyze_image(
        image_url=body.image_url,
        instruction=IMAGE_ANALYSIS_INSTRUCTION,
    )

    # Step 2: 基于分析结果构建描述，调用 optimize_prompt 生成高质量 prompt
    prompt_input = (
        f"Based on the following image analysis, generate a detailed prompt that will create "
        f"a similar image:\n\n{analysis}"
    )
    if body.style_modifiers:
        prompt_input += f"\n\nAdditional style requirements: {body.style_modifiers}"

    optimized_prompt = await llm_svc.optimize_prompt(user_input=prompt_input, type="image")

    # Step 3: 用优化后的 prompt 生成新图
    generated_url = await image_svc.generate(
        prompt=optimized_prompt,
        size=body.size,
        model=body.model,
    )

    # 保存生成记录
    db.add(Generation(
        type="image",
        model=body.model,
        prompt=optimized_prompt,
        result_url=generated_url,
        status="completed",
    ))
    await db.commit()

    return AnalyzeAndGenerateResponse(
        original_analysis=analysis,
        optimized_prompt=optimized_prompt,
        generated_url=generated_url,
    )
