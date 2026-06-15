import time
import asyncio

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.dependencies import get_video_service
from ..core.download_guard import ContentTooLarge, RedirectError, proxy_download, validate_download_url
from ..database import get_session as get_db
from ..models.generation import Generation
from ..schemas.video import (
    VideoCreateRequest,
    VideoCreateResponse,
    VideoStatusResponse,
)
from ..services.agnes_video import AgnesVideoService

router = APIRouter(prefix="/api/video", tags=["video"])


async def _background_create(video_svc, gen_id, **kwargs):
    """Run video creation in background to avoid frontend timeout."""
    try:
        result = await video_svc.create(**kwargs)
    except Exception:
        pass


@router.post("/create", response_model=VideoCreateResponse)
async def create(
    body: VideoCreateRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    video_svc: AgnesVideoService = Depends(get_video_service),
):
    import httpx
    import json
    from ..core.config import settings

    payload = video_svc._build_payload(
        prompt=body.prompt,
        image_url=body.image_url,
        mode=body.mode,
        height=body.height,
        width=body.width,
        num_frames=body.num_frames,
        frame_rate=body.frame_rate,
        negative_prompt=body.negative_prompt,
        seed=body.seed,
        num_inference_steps=body.num_inference_steps,
    )

    async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0)) as client:
        resp = await client.post(
            f"{settings.agnes_api_base}/v1/videos",
            json=payload,
            headers=video_svc.headers,
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Agnes API error: {resp.status_code}")
        data = resp.json()

    result = {
        "video_id": data["video_id"],
        "task_id": data["task_id"],
        "status": data["status"],
    }

    gen = Generation(
        type="video", model="agnes-video-v2.0",
        prompt=body.prompt, result_url=result.get("video_id"), status="pending",
    )
    db.add(gen)
    await db.commit()
    return VideoCreateResponse(**result)


@router.get("/status/{video_id}", response_model=VideoStatusResponse)
async def status(video_id: str, db: AsyncSession = Depends(get_db), video_svc: AgnesVideoService = Depends(get_video_service)):
    result = await video_svc.poll_status(video_id)
    if result.get("status") == "completed":
        gen = (await db.execute(
            select(Generation).where(Generation.result_url == video_id)
        )).scalars().first()
        if gen:
            gen.status = "completed"
            gen.result_url = result.get("video_url")
            await db.commit()
    return VideoStatusResponse(**result)


@router.get("/download")
async def download(url: str):
    if not validate_download_url(url):
        raise HTTPException(status_code=400, detail="Invalid download URL")

    client = httpx.AsyncClient(timeout=300)
    try:
        resp = await proxy_download(client, url)
    except httpx.ConnectError:
        raise HTTPException(status_code=502, detail="Cannot connect to file server")
    except httpx.ConnectTimeout:
        raise HTTPException(status_code=504, detail="File server connection timeout")
    except RedirectError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except ContentTooLarge as exc:
        raise HTTPException(status_code=413, detail=str(exc))
    finally:
        await client.aclose()

    headers = {
        "Content-Disposition": f'attachment; filename="baimo-video-{time.time_ns()}.mp4"',
    }
    content_type = resp.headers.get("Content-Type")
    if content_type:
        headers["Content-Type"] = content_type

    return StreamingResponse(iter([resp.content]), headers=headers)
