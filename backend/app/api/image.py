import asyncio
import random
import re
import time
import io
import base64
import logging

import httpx
<<<<<<< HEAD
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
=======
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import UploadFile, File
from pathlib import Path
import uuid
from PIL import Image
>>>>>>> fed6557 (fix: add missing API endpoints and improve error handling)
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

logger = logging.getLogger("baimo")

router = APIRouter(prefix="/api/image", tags=["image"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_DIMENSION = 512


@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    content_type = file.content_type or ""
    ext_map = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }
    ext = ext_map.get(content_type, "")
    if not ext:
        ext = Path(file.filename or "upload.png").suffix or ".png"

    data = await file.read()

    try:
        img = Image.open(io.BytesIO(data))
        w, h = img.size
        if w > MAX_DIMENSION or h > MAX_DIMENSION:
            ratio = min(MAX_DIMENSION / w, MAX_DIMENSION / h)
            new_w = int(w * ratio)
            new_h = int(h * ratio)
            img = img.resize((new_w, new_h), Image.LANCZOS)
        buf = io.BytesIO()
        save_format = "JPEG"
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        img.save(buf, format=save_format, quality=85, optimize=True)
        data = buf.getvalue()
        ext = ".jpg"
    except Exception:
        pass

    filename = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / filename
    dest.write_bytes(data)

    url = f"http://localhost:5180/api/image/local/{filename}"
    return {"url": url}


@router.get("/local/{filename}")
async def serve_local_image(filename: str):
    filepath = UPLOAD_DIR / filename
    if not filepath.exists() or not filepath.is_file():
        raise HTTPException(status_code=404, detail="Image not found")
    from fastapi.responses import FileResponse
    return FileResponse(str(filepath))


@router.post("/generate", response_model=ImageResponse)
async def generate_image(
    body: ImageGenerateRequest,
    image_svc: AgnesImageService = Depends(get_image_service),
):
    logger.info(f"Received generate request: prompt={body.prompt[:20]}...")
    url = await image_svc.generate(
        prompt=body.prompt,
        size=body.size,
        model=body.model,
        negative_prompt=body.negative_prompt,
    )
    logger.info(f"Generated image: {url[:50]}...")
    return ImageResponse(url=url, model=body.model)


@router.post("/edit", response_model=ImageResponse)
async def edit_image(
    body: ImageEditRequest,
    image_svc: AgnesImageService = Depends(get_image_service),
):
    logger.info(f"Received edit request: prompt={body.prompt[:20]}...")
    url = await image_svc.edit(
        image_url=body.image_url,
        prompt=body.prompt,
        size=body.size,
        model=body.model,
        negative_prompt=body.negative_prompt,
    )
    logger.info(f"Edited image: {url[:50]}...")
    return ImageResponse(url=url, model=body.model)


@router.post("/compose", response_model=ImageResponse)
async def compose_image(
    body: ImageComposeRequest,
    image_svc: AgnesImageService = Depends(get_image_service),
):
    url = await image_svc.compose(
        image_urls=body.image_urls,
        prompt=body.prompt,
        size=body.size,
    )
    return ImageResponse(url=url, model="agnes-image-2.0-flash")


@router.post("/batch-generate", response_model=BatchImageResponse)
async def batch_generate_image(
    body: BatchGenerateRequest,
    db: AsyncSession = Depends(get_db),
    image_svc: AgnesImageService = Depends(get_image_service),
):
    tasks = []
    for i in range(body.num_images):
        seed = body.seed if body.seed is not None else random.randint(0, 999999)
        tasks.append(
            image_svc.generate(
                prompt=body.prompt,
                size=body.size,
                model=body.model,
                negative_prompt=None,
            )
        )

    urls = await asyncio.gather(*tasks)
    results = [
        BatchImageResult(url=url, model=body.model, seed=body.seed or random.randint(0, 999999))
        for url in urls
    ]

    return BatchImageResponse(results=results, total=len(results))


@router.get("/download")
async def download_image(url: str):
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
        "Content-Disposition": f'attachment; filename="baimo-image-{time.time_ns()}.png"',
    }
    content_type = resp.headers.get("Content-Type")
    if content_type:
        headers["Content-Type"] = content_type

    return StreamingResponse(iter([resp.content]), headers=headers)


@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    """上传图片文件，返回可访问的 URL。用于图生图、多图合成等需要图片 URL 的场景。"""
    import uuid
    from pathlib import Path
    from fastapi.responses import JSONResponse

    # 验证文件类型
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="仅支持图片文件")

    # 读取文件内容
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:  # 20MB 限制
        raise HTTPException(status_code=413, detail="文件大小不能超过 20MB")

    # 保存到临时目录
    upload_dir = Path("uploads")
    upload_dir.mkdir(exist_ok=True)

    # 确定扩展名
    ext = Path(file.filename or "image.png").suffix or ".png"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = upload_dir / filename

    filepath.write_bytes(content)

    # 返回可访问的 URL
    base_url = "http://localhost:5180"
    url = f"{base_url}/uploads/{filename}"
    return JSONResponse({"url": url, "filename": filename, "size": len(content)})
