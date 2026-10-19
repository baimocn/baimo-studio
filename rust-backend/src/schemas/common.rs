use serde::{Deserialize, Serialize};

/// Standard API error response — matches Python FastAPI `{"detail": "..."}`.
#[derive(Serialize)]
pub struct ApiErrorResponse {
    pub detail: String,
}

/// Standard success response with a message.
#[derive(Serialize)]
pub struct ApiOkResponse {
    pub ok: bool,
}

impl ApiOkResponse {
    pub fn success() -> Self {
        Self { ok: true }
    }
}

/// File upload response — matches Python backend:
/// `{"url": "/uploads/xxx.png", "filename": "original.png", "size": 12345}`
#[derive(Serialize)]
pub struct UploadResponse {
    pub url: String,
    pub filename: String,
    pub size: usize,
}

/// Download proxy query parameters.
#[derive(Deserialize)]
pub struct DownloadProxyParams {
    pub url: String,
}
