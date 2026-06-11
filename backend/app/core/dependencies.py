from ..services.agnes_image import AgnesImageService
from ..services.agnes_video import AgnesVideoService
from ..services.agnes_llm import AgnesLLMService

# ---------------------------------------------------------------------------
# Service singletons  -- created once, reused across requests
# ---------------------------------------------------------------------------
_image_svc: AgnesImageService | None = None
_video_svc: AgnesVideoService | None = None
_llm_svc: AgnesLLMService | None = None


def get_image_service() -> AgnesImageService:
    global _image_svc
    if _image_svc is None:
        _image_svc = AgnesImageService()
    return _image_svc


def get_video_service() -> AgnesVideoService:
    global _video_svc
    if _video_svc is None:
        _video_svc = AgnesVideoService()
    return _video_svc


def get_llm_service() -> AgnesLLMService:
    global _llm_svc
    if _llm_svc is None:
        _llm_svc = AgnesLLMService()
    return _llm_svc
