use axum::Router;
use axum::routing::{get, post};

use crate::AppState;
use crate::handlers::upload;

/// Build the upload & download sub-router.
///
/// Routes:
/// - `POST /api/upload/image`   — multipart file upload
/// - `GET  /api/download/proxy` — SSRF-safe proxy download
///
/// The upload handler validates MIME types (image/* only), enforces
/// size limits from `Settings::max_upload_bytes`, and saves files to
/// the `uploads/` directory with UUID-based filenames.
///
/// The download proxy validates the target URL against an SSRF
/// protection whitelist before forwarding the request.
pub fn upload_router() -> Router<AppState> {
    Router::new()
        .route("/api/upload/image", post(upload::upload_image))
        .route("/api/download/proxy", get(upload::download_proxy))
}
