import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from ..core.dependencies import get_llm_service
from ..schemas.prompt import (
    AnalyzeImageRequest,
    AnalyzeImageResponse,
    PromptOptimizeRequest,
    PromptOptimizeResponse,
)
from ..services.agnes_llm import AgnesLLMService

router = APIRouter(prefix="/api/prompt", tags=["prompt"])


@router.post("/optimize", response_model=PromptOptimizeResponse)
async def optimize(body: PromptOptimizeRequest, llm_svc: AgnesLLMService = Depends(get_llm_service)):
    optimized = await llm_svc.optimize_prompt(user_input=body.user_input, type=body.type)
    return PromptOptimizeResponse(optimized=optimized, original=body.user_input)


@router.post("/optimize-stream")
async def optimize_stream(body: PromptOptimizeRequest, llm_svc: AgnesLLMService = Depends(get_llm_service)):
    async def event_generator():
        try:
            async for chunk in llm_svc.optimize_prompt_stream(body.user_input, body.type):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/analyze-image", response_model=AnalyzeImageResponse)
async def analyze_image(body: AnalyzeImageRequest, llm_svc: AgnesLLMService = Depends(get_llm_service)):
    analysis = await llm_svc.analyze_image(
        image_url=body.image_url, instruction=body.instruction
    )
    return AnalyzeImageResponse(analysis=analysis)
