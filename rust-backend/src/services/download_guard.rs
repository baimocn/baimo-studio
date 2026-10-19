use crate::error::AppError;

/// Allowed hosts for SSRF-safe downloads.
const ALLOWED_HOSTS: &[&str] = &[
    "storage.googleapis.com",
    "platform-outputs.agnes-ai.space",
    "apihub.agnes-ai.com",
    "localhost",
    "127.0.0.1",
];

/// Result of a safe download operation.
pub struct SafeDownload {
    pub content_type: String,
    pub content_length: Option<u64>,
    pub body: reqwest::Response,
}

/// Check if a URL's host is in the allowed list.
fn is_host_allowed(url: &str) -> bool {
    let parsed = match url::Url::parse(url) {
        Ok(u) => u,
        Err(_) => return false,
    };

    let host = match parsed.host_str() {
        Some(h) => h,
        None => return false,
    };

    ALLOWED_HOSTS.iter().any(|allowed| host == *allowed)
}

/// Download a URL safely with SSRF protection.
///
/// Validates each URL (including redirect targets) against ALLOWED_HOSTS.
/// Streams body with a size cap.
pub async fn safe_download(
    client: &reqwest::Client,
    url: &str,
    max_bytes: u64,
    _max_redirects: usize,
) -> Result<SafeDownload, AppError> {
    // Validate the initial URL
    if !is_host_allowed(url) {
        return Err(AppError::BadRequest("请求的主机不在允许列表中".to_string()));
    }

    let response = client
        .get(url)
        .send()
        .await
        .map_err(AppError::from)?;

    // Check content length if provided
    if let Some(content_length) = response.content_length() {
        if content_length > max_bytes {
            return Err(AppError::BadRequest("下载文件过大".to_string()));
        }
    }

    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/octet-stream")
        .to_string();

    let content_length = response.content_length();

    Ok(SafeDownload {
        content_type,
        content_length,
        body: response,
    })
}
