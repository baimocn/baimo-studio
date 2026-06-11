import asyncio
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..services.agnes_video import AgnesVideoService

logger = logging.getLogger("baimo")
router = APIRouter()

video_svc = AgnesVideoService()

POLL_INTERVAL = 3


@router.websocket("/ws/video/{video_id}")
async def ws_video_status(websocket: WebSocket, video_id: str):
    await websocket.accept()
    logger.info(f"WebSocket connected: video={video_id}")

    try:
        while True:
            try:
                result = await video_svc.poll_status(video_id)
            except Exception as e:
                logger.error(f"WebSocket poll error for video {video_id}: {e}")
                await websocket.send_json({"status": "error", "error": "查询状态失败"})
                await asyncio.sleep(POLL_INTERVAL)
                continue

            await websocket.send_json(result)

            status = result.get("status")
            if status in ("completed", "failed"):
                logger.info(f"WebSocket closing: video={video_id} status={status}")
                break

            await asyncio.sleep(POLL_INTERVAL)

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: video={video_id}")
    except Exception as e:
        logger.error(f"WebSocket error for video {video_id}: {e}", exc_info=True)
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
