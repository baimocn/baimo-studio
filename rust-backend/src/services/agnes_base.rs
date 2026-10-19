use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use serde::Deserialize;
use tracing::error;

use crate::error::AppError;

/// Default timeout for Agnes image generation requests (3 minutes).
/// The API docs recommend 60s–360s; we use 180s as a reasonable middle ground.
pub const IMAGE_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(180);

/// Agnes Image API endpoint path.
pub const IMAGE_ENDPOINT: &str = "/v1/images/generations";

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

/// Top-level response from the Agnes Image generations API.
#[derive(Debug, Deserialize)]
pub struct AgnesImageApiResponse {
    pub created: Option<u64>,
    pub data: Option<Vec<AgnesImageDataItem>>,
}

/// A single item in the `data` array of the image API response.
#[derive(Debug, Deserialize)]
pub struct AgnesImageDataItem {
    pub url: Option<String>,
    pub b64_json: Option<String>,
    pub revised_prompt: Option<String>,
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/// Build default headers for Agnes API requests.
///
/// Returns `Authorization: Bearer <api_key>` and `Content-Type: application/json`.
pub fn build_headers(api_key: &str) -> HeaderMap {
    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Bearer {}", api_key))
            .unwrap_or_else(|_| HeaderValue::from_static("")),
    );
    headers
}

/// Extract the image URL from an Agnes Image API response body.
///
/// The API returns `{ "data": [{ "url": "...", "b64_json": "..." }] }`.
/// This function extracts the `url` field from the first data item.
///
/// Returns `AppError::ExternalApiError` if the response is malformed,
/// the data array is empty, or no URL/b64_json is present.
pub fn extract_image_url(resp: &AgnesImageApiResponse) -> Result<String, AppError> {
    let items = resp.data.as_ref().ok_or_else(|| {
        error!("Agnes Image API response missing 'data' field");
        AppError::ExternalApiError("Agnes API 返回了无效的响应格式 (缺少 data)".to_string())
    })?;

    let item = items.first().ok_or_else(|| {
        error!("Agnes Image API response data array is empty");
        AppError::ExternalApiError("Agnes API 返回了空的图片结果".to_string())
    })?;

    // Prefer URL; fall back to b64_json (caller can handle base64 if needed)
    if let Some(ref url) = item.url {
        if !url.is_empty() {
            return Ok(url.clone());
        }
    }

    if item.b64_json.is_some() {
        return Err(AppError::ExternalApiError(
            "Agnes API 返回了 Base64 数据而非 URL，请检查请求参数".to_string(),
        ));
    }

    error!("Agnes Image API response item has neither url nor b64_json");
    Err(AppError::ExternalApiError(
        "Agnes API 未返回图片 URL".to_string(),
    ))
}

/// Parse the response body text into a structured `AgnesImageApiResponse`.
///
/// Returns `AppError::ExternalApiError` if the body is not valid JSON
/// or does not match the expected schema.
pub fn parse_image_response(body: &str) -> Result<AgnesImageApiResponse, AppError> {
    serde_json::from_str(body).map_err(|e| {
        error!(
            "Agnes Image API response JSON parse error: {}, body: {}",
            e,
            &body[..body.len().min(500)]
        );
        AppError::ExternalApiError("Agnes API 返回了无法解析的响应".to_string())
    })
}

/// Validate and return an error if the HTTP status is not successful.
///
/// Reads the response body for error details and returns `AppError::ExternalApiError`.
pub fn check_status(status: reqwest::StatusCode, body: &str) -> Result<(), AppError> {
    if status.is_success() {
        return Ok(());
    }

    let preview = &body[..body.len().min(500)];
    error!("Agnes Image API error: HTTP {} - {}", status, preview);

    Err(AppError::ExternalApiError(format!(
        "Agnes API 返回错误状态码 {}: {}",
        status, preview
    )))
}

/// Convenience: extract the image URL directly from a raw response body string.
///
/// Combines `parse_image_response` + `extract_image_url` into a single call.
pub fn extract_url_from_body(body: &str) -> Result<String, AppError> {
    let resp = parse_image_response(body)?;
    extract_image_url(&resp)
}

/// Build the `extra_body` JSON object for image-related parameters.
///
/// Places `image` and `response_format` inside `extra_body` per the Agnes API spec.
/// `response_format` must NOT be at the top level (causes 400 error).
pub fn build_extra_body(
    images: Option<&[String]>,
    response_format: &str,
) -> serde_json::Value {
    let mut extra = serde_json::json!({
        "response_format": response_format,
    });

    if let Some(imgs) = images {
        if !imgs.is_empty() {
            extra["image"] = serde_json::json!(imgs);
        }
    }

    extra
}
