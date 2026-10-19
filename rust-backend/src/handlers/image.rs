use axum::extract::{Multipart, Query, State};
use axum::http::header;
use axum::response::Response;
use axum::Json;
use serde_json::json;
use uuid::Uuid;

use crate::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::generation::Generation;
use crate::services::agnes_image::AgnesImageService;
use crate::services::download_guard;
use crate::types::image::*;

/// POST /api/image/generate
///
/// Generates an image from a text prompt.
/// Requires authentication.
pub async fn generate(
    State(state): State<AppState>,
    _auth: AuthUser,
    Json(body): Json<ImageGenerateRequest>,
) -> Result<Json<ImageResponse>, AppError> {
    if body.prompt.trim().is_empty() {
        return Err(AppError::ValidationError("prompt 不能为空".to_string()));
    }
    if body.prompt.len() > 5000 {
        return Err(AppError::ValidationError("prompt 长度不能超过 5000 字符".to_string()));
    }

    let api_key = state.api_key.read().await;
    let service = AgnesImageService::new(&state.http, &state.config.agnes_api_base, &api_key);

    let url = service
        .generate(&body.prompt, &body.size, &body.model, body.negative_prompt.as_deref())
        .await?;

    // Record in database
    let params = serde_json::to_string(&json!({"size": body.size, "model": body.model})).ok();
    let _ = Generation::create(
        &state.db,
        None,
        &body.model,
        &body.prompt,
        "image",
        params.as_deref(),
    )
    .await;

    Ok(Json(ImageResponse {
        url,
        model: body.model,
    }))
}

/// POST /api/image/batch-generate
///
/// Generates multiple images from a single prompt.
/// Requires authentication.
pub async fn batch_generate(
    State(state): State<AppState>,
    _auth: AuthUser,
    Json(body): Json<BatchGenerateRequest>,
) -> Result<Json<BatchImageResponse>, AppError> {
    if body.prompt.trim().is_empty() {
        return Err(AppError::ValidationError("prompt 不能为空".to_string()));
    }

    let num_images = body.num_images.unwrap_or(4).clamp(1, 8);
    let api_key = state.api_key.read().await;
    let service = AgnesImageService::new(&state.http, &state.config.agnes_api_base, &api_key);

    let mut results = Vec::new();
    for i in 0..num_images {
        let seed = body.seed.unwrap_or(0) + i as u32;
        match service
            .generate(&body.prompt, &body.size, &body.model, None)
            .await
        {
            Ok(url) => results.push(BatchImageResult {
                url,
                model: body.model.clone(),
                seed,
            }),
            Err(e) => {
                tracing::warn!("Batch image {} failed: {}", i, e);
            }
        }
    }

    // Record each successful result in the database
    for item in &results {
        let params = serde_json::to_string(&json!({"seed": item.seed})).ok();
        let _ = Generation::create(
            &state.db,
            None,
            &item.model,
            &body.prompt,
            "image",
            params.as_deref(),
        )
        .await;
    }

    let total = results.len();
    Ok(Json(BatchImageResponse { results, total }))
}

/// POST /api/image/edit
///
/// Edits an existing image with a text prompt (image-to-image).
/// Requires authentication.
pub async fn edit(
    State(state): State<AppState>,
    _auth: AuthUser,
    Json(body): Json<ImageEditRequest>,
) -> Result<Json<ImageResponse>, AppError> {
    if body.prompt.trim().is_empty() {
        return Err(AppError::ValidationError("prompt 不能为空".to_string()));
    }
    if body.prompt.len() > 5000 {
        return Err(AppError::ValidationError("prompt 长度不能超过 5000 字符".to_string()));
    }
    if body.image_url.is_empty() {
        return Err(AppError::ValidationError("image_url 不能为空".to_string()));
    }
    if !body.image_url.starts_with("http://") && !body.image_url.starts_with("https://") {
        return Err(AppError::ValidationError("image_url 必须是 http/https URL".to_string()));
    }

    let api_key = state.api_key.read().await;
    let service = AgnesImageService::new(&state.http, &state.config.agnes_api_base, &api_key);

    let url = service
        .edit(
            &body.image_url,
            &body.prompt,
            &body.size,
            &body.model,
            body.negative_prompt.as_deref(),
        )
        .await?;

    // Record in database
    let params = serde_json::to_string(&json!({"size": body.size, "model": body.model})).ok();
    let _ = Generation::create(
        &state.db,
        None,
        &body.model,
        &body.prompt,
        "image",
        params.as_deref(),
    )
    .await;

    Ok(Json(ImageResponse {
        url,
        model: body.model,
    }))
}

/// POST /api/image/compose
///
/// Composes multiple images into one with a text prompt.
/// Requires authentication.
pub async fn compose(
    State(state): State<AppState>,
    _auth: AuthUser,
    Json(body): Json<ImageComposeRequest>,
) -> Result<Json<ImageResponse>, AppError> {
    if body.prompt.trim().is_empty() {
        return Err(AppError::ValidationError("prompt 不能为空".to_string()));
    }
    if body.image_urls.len() < 2 {
        return Err(AppError::ValidationError("至少需要 2 张图片".to_string()));
    }
    if body.image_urls.len() > 10 {
        return Err(AppError::ValidationError("最多支持 10 张图片".to_string()));
    }

    let api_key = state.api_key.read().await;
    let service = AgnesImageService::new(&state.http, &state.config.agnes_api_base, &api_key);

    let url = service
        .compose(&body.image_urls, &body.prompt, &body.size)
        .await?;

    // Record in database (compose uses agnes-image-2.0-flash like Python)
    let _ = Generation::create(
        &state.db,
        None,
        "agnes-image-2.0-flash",
        &body.prompt,
        "image",
        None,
    )
    .await;

    Ok(Json(ImageResponse {
        url,
        model: "agnes-image-2.0-flash".to_string(),
    }))
}

/// GET /api/image/download
///
/// SSRF-safe proxy download of an image.
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

    // Extract file extension from URL (matching Python: png|jpe?g|webp|gif)
    let ext = extract_image_extension(&params.url);
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let filename = format!("baimo-image-{}.{}", timestamp, ext);

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

/// POST /api/image/upload
///
/// Upload an image file (multipart form data).
/// Requires authentication.
pub async fn upload(
    State(_state): State<AppState>,
    _auth: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, AppError> {
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

        // Validate MIME type (matching Python: content_type.startswith("image/"))
        if !content_type.starts_with("image/") {
            return Err(AppError::ValidationError(
                "仅支持图片文件".to_string(),
            ));
        }

        let data = field.bytes().await.map_err(|e| {
            AppError::ValidationError(format!("Failed to read upload: {}", e))
        })?;

        // 20MB limit (matching Python)
        if data.len() > 20 * 1024 * 1024 {
            return Err(AppError::BadRequest("文件大小不能超过 20MB".to_string()));
        }

        // Generate unique filename (matching Python: uuid4 + original extension)
        let ext = file_name
            .rsplit('.')
            .next()
            .unwrap_or("png");
        let new_filename = format!("{}.{}", Uuid::new_v4().simple(), ext);
        let upload_path = format!("uploads/{}", new_filename);

        std::fs::write(&upload_path, &data).map_err(|e| {
            AppError::InternalError(anyhow::anyhow!("Failed to save upload: {}", e))
        })?;

        // Return URL matching Python response format
        let url = format!("/uploads/{}", new_filename);

        return Ok(Json(json!({
            "url": url,
            "filename": file_name,
            "size": data.len(),
        })));
    }

    Err(AppError::ValidationError("No file field in upload".to_string()))
}

/// Extract image file extension from URL, defaulting to "png".
fn extract_image_extension(url: &str) -> &str {
    let lower = url.to_lowercase();
    for ext in &[".png", ".jpeg", ".jpg", ".webp", ".gif"] {
        if lower.contains(ext) {
            return &ext[1..]; // strip the leading dot
        }
    }
    "png"
}
