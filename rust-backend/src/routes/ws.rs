use axum::extract::{Path, State, WebSocketUpgrade};
use axum::response::IntoResponse;
use futures::{SinkExt, StreamExt};
use serde_json::json;

use crate::AppState;
use crate::services::agnes_video::AgnesVideoService;

/// WS /ws/video/{video_id}
/// Accepts a WebSocket connection and polls Agnes video status every 3 seconds.
/// Sends JSON: {video_id, status, progress, video_url, error}
/// Closes on "completed" or "failed".
pub async fn ws_video_status(
    State(state): State<AppState>,
    ws: WebSocketUpgrade,
    Path(video_id): Path<String>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_video_ws(state, socket, video_id))
}

async fn handle_video_ws(
    state: AppState,
    socket: axum::extract::ws::WebSocket,
    video_id: String,
) {
    let (mut sender, mut _receiver) = socket.split();

    let api_key = state.api_key.read().await.clone();
    let service = AgnesVideoService::new(&state.http, &state.config.agnes_api_base, &api_key);

    loop {
        // Poll video status
        match service.poll_status(&video_id).await {
            Ok(result) => {
                let status = result["status"].as_str().unwrap_or("unknown");
                let progress = result["progress"].as_u64().unwrap_or(0) as u8;
                let video_url = result["video_url"].as_str().map(String::from);
                let error = result["error"].as_str().map(String::from);

                let msg = json!({
                    "video_id": video_id,
                    "status": status,
                    "progress": progress,
                    "video_url": video_url,
                    "error": error,
                });

                if sender
                    .send(axum::extract::ws::Message::Text(msg.to_string().into()))
                    .await
                    .is_err()
                {
                    break;
                }

                // Close on terminal states
                if status == "completed" || status == "failed" {
                    break;
                }
            }
            Err(e) => {
                let msg = json!({
                    "video_id": video_id,
                    "status": "error",
                    "progress": 0,
                    "video_url": null,
                    "error": format!("Polling error: {}", e),
                });

                let _ = sender
                    .send(axum::extract::ws::Message::Text(msg.to_string().into()))
                    .await;
                break;
            }
        }

        // Wait 3 seconds before polling again
        tokio::time::sleep(std::time::Duration::from_secs(3)).await;
    }
}
