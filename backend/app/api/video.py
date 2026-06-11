import time

import httpx
from fastapi import APIRouter, Depends, HTTPException
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


@router.post("/create", response_model=VideoCreateResponse)
async def create(body: VideoCreateRequest, db: AsyncSession = Depends(get_db), video_svc: AgnesVideoService = Depends(get_video_service)):
    result = await video_svc.create(
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
        raise HTTPException(status_code=400, detail="不允许下载该域名的文件")

    client = httpx.AsyncClient(timeout=300)
    try:
        resp = await proxy_download(client, url)
    except httpx.ConnectError:
        raise HTTPException(status_code=502, detail="无法连接到文件服务器")
    except httpx.ConnectTimeout:
        raise HTTPException(status_code=504, detail="连接文件服务器超时")
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
