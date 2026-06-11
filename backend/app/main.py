import logging
import webbrowser
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from .api import image, video, prompt, generation, models, stats, workflow, ws
from .api import settings as settings_router
from .core.config import settings
from .database import init_db
from .services.base import AgnesBaseService

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
logger = logging.getLogger("baimo")

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    if not settings.agnes_api_key:
        webbrowser.open("http://localhost:5180/settings")
    yield
    # 关闭共享 httpx 客户端
    await AgnesBaseService.close()


app = FastAPI(
    title="baimo Studio",
    description="基于 Agnes AI 模型的图片与视频生成 API",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "请求过于频繁，请稍后再试"},
    )


app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(httpx.ConnectError)
async def httpx_connect_error_handler(request: Request, exc: httpx.ConnectError):
    logger.error(f"Agnes API connection error: {exc}")
    return JSONResponse(status_code=502, content={"detail": "无法连接到 Agnes API，请检查网络"})


@app.exception_handler(httpx.TimeoutException)
async def httpx_timeout_handler(request: Request, exc: httpx.TimeoutException):
    logger.error(f"Agnes API timeout: {exc}")
    return JSONResponse(status_code=504, content={"detail": "Agnes API 请求超时，请稍后重试"})


@app.exception_handler(httpx.HTTPStatusError)
async def httpx_http_error_handler(request: Request, exc: httpx.HTTPStatusError):
    logger.error(f"Agnes API HTTP error: {exc.response.status_code} - {exc.response.text[:500]}")
    return JSONResponse(status_code=502, content={"detail": "Agnes API 请求失败，请稍后重试"})


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {type(exc).__name__}: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "服务器内部错误，请稍后重试"})


app.include_router(image.router)
app.include_router(video.router)
app.include_router(prompt.router)
app.include_router(settings_router.router)
app.include_router(models.router)
app.include_router(generation.router)
app.include_router(stats.router)
app.include_router(workflow.router)
app.include_router(ws.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# 上传文件的静态服务（图生图、多图合成需要可访问的 URL）
UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

if STATIC_DIR.exists():
    app.mount("/_next", StaticFiles(directory=str(STATIC_DIR / "_next")), name="next-assets")

    @app.get("/{path:path}")
    async def serve_spa(path: str):
        if path.startswith("api/"):
            raise HTTPException(status_code=404)
        file_path = STATIC_DIR / path
        if path and file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(STATIC_DIR / "index.html"))
