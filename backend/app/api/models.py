from fastapi import APIRouter

router = APIRouter(prefix="/api/models", tags=["models"])

# 硬编码模型列表，后续可改为从配置/数据库加载
AVAILABLE_MODELS = {
    "image": [
        {
            "id": "agnes-image-2.1-flash",
            "name": "2.1 Flash",
            "description": "高质量",
            "capabilities": ["text-to-image", "image-to-edit"],
        },
        {
            "id": "agnes-image-2.0-flash",
            "name": "2.0 Flash",
            "description": "更快速",
            "capabilities": ["text-to-image"],
        },
    ],
    "video": [
        {
            "id": "agnes-video-1.0",
            "name": "Video 1.0",
            "description": "文生视频 / 图生视频",
            "capabilities": ["text-to-video", "image-to-video"],
        },
    ],
}


@router.get("")
async def list_models():
    """返回可用模型列表"""
    return AVAILABLE_MODELS
