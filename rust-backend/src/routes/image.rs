use axum::Router;
use axum::routing::{get, post};

use crate::AppState;
use crate::handlers::image;

/// Build the image sub-router.
///
/// All routes are mounted under `/api/image`:
/// - `POST /generate`        — generate image from text prompt
/// - `POST /batch-generate`  — generate multiple images
/// - `POST /edit`            — edit/transform an existing image
/// - `POST /compose`         — compose multiple images into one
/// - `GET  /download`        — SSRF-safe image download proxy
/// - `POST /upload`          — multipart image file upload
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/generate", post(image::generate))
        .route("/batch-generate", post(image::batch_generate))
        .route("/edit", post(image::edit))
        .route("/compose", post(image::compose))
        .route("/download", get(image::download))
        .route("/upload", post(image::upload))
}
