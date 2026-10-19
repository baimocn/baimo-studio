use axum::Router;
use axum::routing::{get, post};

use crate::AppState;
use crate::handlers::video;

/// Build the video sub-router.
///
/// All routes are mounted under `/api/video`:
/// - `POST /generate`              — create a new video generation task
/// - `GET  /status/{video_id}`     — poll video generation status
/// - `GET  /download`              — SSRF-safe video download proxy
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/generate", post(video::create))
        .route("/status/{video_id}", get(video::status))
        .route("/download", get(video::download))
}
