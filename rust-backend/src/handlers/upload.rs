use axum::extract::{Multipart, Query, State};
use axum::http::header;
use axum::response::Response;
use axum::Json;
use uuid::Uuid;

use crate::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::schemas::common::{DownloadProxyParams, UploadResponse};
use crate::services::download_guard;

/// POST /api/upload/image
///
/// Upload an image file via multipart form data.
/// Validates MIME type (must be image/*), enforces size limits,
/// saves to the `uploads/` directory, and returns the public URL.
///
/// Response format (matches Python backend exactly):
/// ```json
/// {"url": "/uploads/<uuid>.png", "filename": "original.png", "size": 12345}
/// ```
/// Requires authentication.
pub async fn upload_image(
    State(state): State<AppState>,
    _auth: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<UploadResponse>, AppError> {
    while let Some(field) = multipart.next_field().await.map_err(|e| {
        AppError::ValidationError(format!("Multipart error: {}", e))
    })? {
        let name = field.name().unwrap_or("").to_string();
        if name != "file" {
            continue;
        }

        let file_name = field
            .file_name()
            .unwrap_or("upload.png")
            .to_string();

        let content_type = field
            .content_type()
            .unwrap_or("application/octet-stream")
            .to_string();

        // Validate MIME type
        if !content_type.starts_with("image/") {
            return Err(AppError::ValidationError(
                "Only image files are allowed".to_string(),
            ));
        }

        let data = field.bytes().await.map_err(|e| {
            AppError::ValidationError(format!("Failed to read upload: {}", e))
        })?;

        if data.len() > state.config.max_upload_bytes {
            return Err(AppError::BadRequest("Upload file too large".to_string()));
        }

        // Generate unique filename
        let ext = file_name
            .rsplit('.')
            .next()
            .unwrap_or("png");
        let new_filename = format!("{}.{}", Uuid::new_v4(), ext);
        let upload_path = format!("uploads/{}", new_filename);

        tokio::fs::write(&upload_path, &data).await.map_err(|e| {
            AppError::InternalError(anyhow::anyhow!("Failed to save upload: {}", e))
        })?;

        let url = format!("/uploads/{}", new_filename);

        return Ok(Json(UploadResponse {
            url,
            filename: file_name,
            size: data.len(),
        }));
    }

    Err(AppError::ValidationError("No file field in upload".to_string()))
}

/// GET /api/download/proxy?url=...
///
/// SSRF-safe proxy download. Validates the target URL against a whitelist
/// of allowed hosts before forwarding the request. Streams the response
/// body back to the client with proper content headers.
///
/// Matches the Python backend's `/api/image/download` and `/api/video/download`
/// behavior (both use the same `proxy_download` + `validate_download_url` pattern).
pub async fn download_proxy(
    State(state): State<AppState>,
    Query(params): Query<DownloadProxyParams>,
) -> Result<Response, AppError> {
    if params.url.is_empty() {
        return Err(AppError::ValidationError("url parameter is required".to_string()));
    }

    let safe = download_guard::safe_download(
        &state.http,
        &params.url,
        state.config.max_download_bytes,
        5,
    )
    .await?;

    // Determine filename from URL or content type
    let filename = determine_filename(&params.url, &safe.content_type);

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

/// Derive a download filename from the URL path or content type.
fn determine_filename(url: &str, content_type: &str) -> String {
    // Try to extract extension from URL
    let ext_from_url = url
        .rsplit('/')
        .next()
        .and_then(|segment| {
            if let Some(dot_pos) = segment.rfind('.') {
                let ext = &segment[dot_pos + 1..];
                // Only accept known image/video extensions
                if ["png", "jpg", "jpeg", "webp", "gif", "mp4", "webm", "mov"].contains(&ext) {
                    return Some(ext.to_string());
                }
            }
            None
        });

    let ext = ext_from_url.unwrap_or_else(|| {
        match content_type {
            "image/png" => "png".to_string(),
            "image/jpeg" => "jpg".to_string(),
            "image/webp" => "webp".to_string(),
            "image/gif" => "gif".to_string(),
            "video/mp4" => "mp4".to_string(),
            "video/webm" => "webm".to_string(),
            _ => "bin".to_string(),
        }
    });

    let prefix = if content_type.starts_with("video/") {
        "baimo-video"
    } else {
        "baimo-image"
    };

    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();

    format!("{}-{}.{}", prefix, ts, ext)
}
