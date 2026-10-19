use axum::extract::ws::{Message, WebSocket};
use futures::{SinkExt, StreamExt};
use serde_json::json;

use crate::AppState;
use crate::services::agnes_video::AgnesVideoService;

/// Poll interval in seconds between video status checks.
const POLL_INTERVAL: u64 = 3;

/// WebSocket handler for real-time video generation status push.
///
/// Accepts a WebSocket connection and polls Agnes video status every
/// `POLL_INTERVAL` seconds, sending JSON updates to the client:
/// ```json
/// {"video_id": "...", "status": "...", "progress": 0, "video_url": null, "error": null}
/// ```
///
/// The connection closes automatically when:
/// - The video reaches a terminal state ("completed" or "failed")
/// - A polling error occurs
/// - The client disconnects
pub async fn handle_video_ws(state: AppState, socket: WebSocket, video_id: String) {
    tracing::info!("WebSocket connected: video={}", video_id);

    let (mut sender, mut receiver) = socket.split();

    let api_key = state.api_key.read().await.clone();
    let service = AgnesVideoService::new(&state.http, &state.config.agnes_api_base, &api_key);

    loop {
        // Poll video status from Agnes API
        let result = match service.poll_status(&video_id).await {
            Ok(r) => r,
            Err(e) => {
                tracing::error!(
                    "WebSocket poll error for video {}: {}",
                    video_id, e
                );
                let error_msg = json!({
                    "status": "error",
                    "error": "查询状态失败",
                });
                let _ = sender
                    .send(Message::Text(error_msg.to_string().into()))
                    .await;
                tokio::time::sleep(std::time::Duration::from_secs(POLL_INTERVAL)).await;
                continue;
            }
        };

        // Send the status update to the client
        if sender
            .send(Message::Text(result.to_string().into()))
            .await
            .is_err()
        {
            tracing::info!("WebSocket send failed, client disconnected: video={}", video_id);
            break;
        }

        // Check for terminal states
        let status = result["status"].as_str().unwrap_or("unknown");
        if status == "completed" || status == "failed" {
            tracing::info!(
                "WebSocket closing: video={} status={}",
                video_id, status
            );
            break;
        }

        // Wait before next poll
        tokio::time::sleep(std::time::Duration::from_secs(POLL_INTERVAL)).await;
    }

    // Drain any remaining client messages (pings/close frames)
    // to allow a clean WebSocket close handshake
    while let Some(msg) = receiver.next().await {
        match msg {
            Ok(Message::Close(_)) => break,
            Err(_) => break,
            _ => continue,
        }
    }

    tracing::info!("WebSocket disconnected: video={}", video_id);
}
