from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..models.generation import Generation

router = APIRouter(prefix="/api/generations", tags=["generations"])


@router.get("")
async def list_generations(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
):
    offset = (page - 1) * limit
    count_q = select(func.count()).select_from(Generation)
    total = (await session.execute(count_q)).scalar_one()
    q = (
        select(Generation)
        .order_by(desc(Generation.created_at))
        .offset(offset)
        .limit(limit)
    )
    rows = (await session.execute(q)).scalars().all()
    return {
        "items": [_gen_to_dict(g) for g in rows],
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get("/favorites")
async def list_favorites(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
):
    offset = (page - 1) * limit
    count_q = select(func.count()).select_from(Generation).where(Generation.is_favorite == True)  # noqa: E712
    total = (await session.execute(count_q)).scalar_one()
    q = (
        select(Generation)
        .where(Generation.is_favorite == True)  # noqa: E712
        .order_by(desc(Generation.created_at))
        .offset(offset)
        .limit(limit)
    )
    rows = (await session.execute(q)).scalars().all()
    return {
        "items": [_gen_to_dict(g) for g in rows],
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get("/{generation_id}")
async def get_generation(generation_id: int, session: AsyncSession = Depends(get_session)):
    g = await session.get(Generation, generation_id)
    if g is None:
        raise HTTPException(status_code=404, detail="记录不存在")
    return _gen_to_dict(g)


@router.put("/{generation_id}/favorite")
async def toggle_favorite(generation_id: int, session: AsyncSession = Depends(get_session)):
    g = await session.get(Generation, generation_id)
    if g is None:
        raise HTTPException(status_code=404, detail="记录不存在")
    g.is_favorite = not g.is_favorite
    await session.commit()
    await session.refresh(g)
    return {"id": g.id, "is_favorite": g.is_favorite}


@router.delete("/{generation_id}")
async def delete_generation(generation_id: int, session: AsyncSession = Depends(get_session)):
    g = await session.get(Generation, generation_id)
    if g is None:
        raise HTTPException(status_code=404, detail="记录不存在")
    await session.delete(g)
    await session.commit()
    return {"ok": True}


def _gen_to_dict(g: Generation) -> dict:
    return {
        "id": g.id,
        "prompt": g.prompt,
        "type": g.type,
        "model": g.model,
        "result_url": g.result_url,
        "params": g.params,
        "is_favorite": g.is_favorite,
        "status": g.status,
        "created_at": g.created_at.isoformat() if g.created_at else None,
    }
