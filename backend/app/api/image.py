import asyncio
import random
import re
import time

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.dependencies import get_image_service
from ..core.download_guard import ContentTooLarge, RedirectError, proxy_download, validate_download_url
from ..database import get_session as get_db
from ..models.generation import Generation
from ..schemas.image import (
    BatchGenerateRequest,
    BatchImageResponse,
    BatchImageResult,
    ImageComposeRequest,
    ImageEditRequest,
    ImageGenerateRequest,
    ImageResponse,
)
from ..services.agnes_image import AgnesImageService

router = APIRouter(prefix="/api/image", tags=["image"])


@router.post("/generate", response_model=ImageResponse)
async def generate(body: ImageGenerateRequest, db: AsyncSession = Depends(get_db), image_svc: AgnesImageService = Depends(get_image_service)):
    url = await image_svc.generate(
        prompt=body.prompt, size=body.size, model=body.model,
        negative_prompt=body.negative_prompt,
    )
    db.add(Generation(type="image", model=body.model, prompt=body.prompt, result_url=url, status="completed"))
    await db.commit()
    return ImageResponse(url=url, model=body.model)


@router.post("/batch-generate", response_model=BatchImageResponse)
async def batch_generate(body: BatchGenerateRequest, db: AsyncSession = Depends(get_db), image_svc: AgnesImageService = Depends(get_image_service)):
    seeds = [(body.seed or random.randint(0, 2**32 - 1)) + i for i in range(body.num_images)]

    async def _gen(seed: int) -> BatchImageResult:
        url = await image_svc.generate(prompt=body.prompt, size=body.size, model=body.model)
        return BatchImageResult(url=url, model=body.model, seed=seed)

    results = await asyncio.gather(*[_gen(s) for s in seeds])

    for item in results:
        db.add(Generation(type="image", model=item.model, prompt=body.prompt, result_url=item.url, params=f'{{"seed": {item.seed}}}', status="completed"))
    await db.commit()

    return BatchImageResponse(results=list(results), total=len(results))


@router.post("/edit", response_model=ImageResponse)
async def edit(body: ImageEditRequest, db: AsyncSession = Depends(get_db), image_svc: AgnesImageService = Depends(get_image_service)):
    url = await image_svc.edit(
        image_url=body.image_url, prompt=body.prompt, size=body.size, model=body.model,
        negative_prompt=body.negative_prompt,
    )
    db.add(Generation(type="image", model=body.model, prompt=body.prompt, result_url=url, status="completed"))
    await db.commit()
    return ImageResponse(url=url, model=body.model)


@router.post("/compose", response_model=ImageResponse)
async def compose(body: ImageComposeRequest, db: AsyncSession = Depends(get_db), image_svc: AgnesImageService = Depends(get_image_service)):
    url = await image_svc.compose(
        image_urls=body.image_urls, prompt=body.prompt, size=body.size,
    )
    db.add(Generation(type="image", model="agnes-image-2.0-flash", prompt=body.prompt, result_url=url, status="completed"))
    await db.commit()
    return ImageResponse(url=url, model="agnes-image-2.0-flash")


@router.get("/download")
async def download(url: str = Query(..., description="图片文件 URL")):
    if not validate_download_url(url):
        raise HTTPException(status_code=400, detail="不允许下载该域名的文件")

    client = httpx.AsyncClient(timeout=120)
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

    ext_match = re.search(r"\.(png|jpe?g|webp|gif)", url, re.IGNORECASE)
    ext = ext_match.group(1).lower() if ext_match else "png"
    headers = {
        "Content-Disposition": f'attachment; filename="baimo-image-{time.time_ns()}.{ext}"',
    }
    content_type = resp.headers.get("Content-Type")
    if content_type:
        headers["Content-Type"] = content_type

    return StreamingResponse(iter([resp.content]), headers=headers)
