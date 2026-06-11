from fastapi import APIRouter

router = APIRouter(prefix="/api/models", tags=["models"])

# 模型列表 — 与 Agnes AI 官方文档一致
AVAILABLE_MODELS = {
    "image": [
        {
            "id": "agnes-image-2.1-flash",
            "name": "2.1 Flash",
            "description": "高信息密度图像优化，构图保持好",
            "capabilities": ["text-to-image", "image-to-edit"],
        },
        {
            "id": "agnes-image-2.0-flash",
            "name": "2.0 Flash",
            "description": "快速生成，支持多图合成",
            "capabilities": ["text-to-image", "image-to-edit", "multi-image-compose"],
        },
    ],
    "video": [
        {
            "id": "agnes-video-v2.0",
            "name": "Video V2.0",
            "description": "文生视频 / 图生视频 / 关键帧动画",
            "capabilities": ["text-to-video", "image-to-video", "multi-image-video", "keyframes"],
        },
    ],
}


@router.get("")
async def list_models():
    """返回可用模型列表"""
    return AVAILABLE_MODELS
