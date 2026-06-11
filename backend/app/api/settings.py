from fastapi import APIRouter
from pydantic import BaseModel

from ..core.config import settings

router = APIRouter(prefix="/api/settings", tags=["settings"])


class ApiKeyRequest(BaseModel):
    api_key: str


class ApiKeyResponse(BaseModel):
    api_key_masked: str


def mask_key(key: str) -> str:
    if len(key) <= 8:
        return key[0] + "***" + key[-1]
    return key[:3] + "***" + key[-3:]


@router.get("/api-key", response_model=ApiKeyResponse)
async def get_api_key():
    return ApiKeyResponse(api_key_masked=mask_key(settings.agnes_api_key))


@router.put("/api-key")
async def update_api_key(body: ApiKeyRequest):
    settings.update_api_key(body.api_key)
    return {"ok": True, "api_key_masked": mask_key(body.api_key)}
