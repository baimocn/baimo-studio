use axum::extract::{Path, Query, State};
use axum::http::header;
use axum::response::Response;
use axum::Json;

use crate::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::generation::Generation;
use crate::services::agnes_video::AgnesVideoService;
use crate::services::download_guard;
use crate::types::image::DownloadParams;
use crate::types::video::*;

/// POST /api/video/generate
///
/// Creates a new video generation task.
/// Supports text-to-video, image-to-video, keyframe, and multi-image modes.
/// Requires authentication.
pub async fn create(
    State(state): State<AppState>,
    _auth: AuthUser,
    Json(body): Json<VideoCreateRequest>,
) -> Result<Json<VideoCreateResponse>, AppError> {
    if body.prompt.trim().is_empty() {
        return Err(AppError::ValidationError("prompt 不能为空".to_string()));
    }
    if body.prompt.len() > 5000 {
        return Err(AppError::ValidationError("prompt 长度不能超过 5000 字符".to_string()));
    }

    let api_key = state.api_key.read().await;
    let service = AgnesVideoService::new(&state.http, &state.config.agnes_api_base, &api_key);

    let result = service.create(&body).await?;

    // Extract video_id and task_id from the response
    let video_id = result["video_id"]
        .as_str()
        .unwrap_or("")
        .to_string();
    let task_id = result["task_id"]
        .as_str()
        .unwrap_or("")
        .to_string();

    // Record in database (matching Python: status="pending", result_url=video_id)
    let _ = Generation::create(
        &state.db,
        None,
        "agnes-video-v2.0",
        &body.prompt,
        "video",
        None,
    )
    .await;

    Ok(Json(VideoCreateResponse {
        video_id,
        task_id,
        status: "pending".to_string(),
    }))
}

/// GET /api/video/status/{video_id}
///
/// Polls the status of a video generation task.
/// Requires authentication.
pub async fn status(
    State(state): State<AppState>,
    _auth: AuthUser,
    Path(video_id): Path<String>,
) -> Result<Json<VideoStatusResponse>, AppError> {
    let api_key = state.api_key.read().await;
    let service = AgnesVideoService::new(&state.http, &state.config.agnes_api_base, &api_key);

    let result = service.poll_status(&video_id).await?;

    let status_str = result["status"].as_str().unwrap_or("unknown").to_string();

    // Update generation record on completion (matching Python behavior)
    if status_str == "completed" {
        if let Some(video_url) = result["video_url"].as_str() {
            let _ = Generation::update_status(
                &state.db,
                &video_id,
                "completed",
                Some(video_url),
            )
            .await;
        }
    }

    Ok(Json(VideoStatusResponse {
        video_id,
        status: status_str,
        progress: result["progress"].as_u64().unwrap_or(0) as u8,
        video_url: result["video_url"].as_str().map(String::from),
        error: result["error"].as_str().map(String::from),
    }))
}

/// GET /api/video/download
///
/// SSRF-safe proxy download of a video.
pub async fn download(
    State(state): State<AppState>,
    Query(params): Query<DownloadParams>,
) -> Result<Response, AppError> {
    let safe = download_guard::safe_download(
        &state.http,
        &params.url,
        state.config.max_download_bytes,
        5,
    )
    .await?;

    // Timestamped filename matching Python: baimo-video-{time_ns}.mp4
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let filename = format!("baimo-video-{}.mp4", timestamp);

    let body_stream = axum::body::Body::from_stream(safe.body.bytes_stream());

    let response = Response::builder()
        .header(header::CONTENT_TYPE, &safe.content_type)
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}\"", filename),
        )
        .body(body_stream)
        .map_err(|e| AppError::InternalError(anyhow::anyhow!("Response build error: {}", e)))?;

    Ok(response)
}
