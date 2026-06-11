from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..models.generation import Generation

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("")
async def get_stats(session: AsyncSession = Depends(get_session)):
    base = select(func.count()).select_from(Generation)

    total = (await session.execute(base)).scalar_one()
    image_count = (await session.execute(base.where(Generation.type == "image"))).scalar_one()
    video_count = (await session.execute(base.where(Generation.type == "video"))).scalar_one()

    today = datetime.now(timezone.utc).date()
    today_count = (await session.execute(base.where(func.date(Generation.created_at) == today))).scalar_one()

    favorite_count = (await session.execute(base.where(Generation.is_favorite == True))).scalar_one()  # noqa: E712

    return {
        "total_generations": total,
        "image_count": image_count,
        "video_count": video_count,
        "today_count": today_count,
        "favorite_count": favorite_count,
    }
