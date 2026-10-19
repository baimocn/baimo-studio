use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::json;

/// Unified application error type.
/// Maps to HTTP status codes and produces JSON responses matching the Python FastAPI format:
/// `{"detail": "错误信息"}`
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("资源未找到")]
    NotFound,

    #[error("未授权访问")]
    Unauthorized,

    #[error("请求参数错误: {0}")]
    BadRequest(String),

    #[error("服务器内部错误")]
    InternalError(#[from] anyhow::Error),

    #[error("外部API错误: {0}")]
    ExternalApiError(String),

    #[error("请求过于频繁")]
    RateLimited,

    #[error("数据验证失败: {0}")]
    ValidationError(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, detail) = match &self {
            AppError::NotFound => (
                StatusCode::NOT_FOUND,
                json!("资源未找到"),
            ),
            AppError::Unauthorized => (
                StatusCode::UNAUTHORIZED,
                json!("未授权访问，请先登录"),
            ),
            AppError::BadRequest(msg) => (
                StatusCode::BAD_REQUEST,
                json!(msg),
            ),
            AppError::InternalError(_) => {
                tracing::error!("Internal error: {:?}", self);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    json!("服务器内部错误，请稍后再试"),
                )
            }
            AppError::ExternalApiError(msg) => (
                StatusCode::BAD_GATEWAY,
                json!(format!("外部API请求失败: {}", msg)),
            ),
            AppError::RateLimited => (
                StatusCode::TOO_MANY_REQUESTS,
                json!("请求过于频繁，请稍后再试"),
            ),
            AppError::ValidationError(msg) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                json!(msg),
            ),
        };

        (status, Json(json!({"detail": detail}))).into_response()
    }
}

/// Convert reqwest errors into AppError.
/// Maps connection/request failures to ExternalApiError with descriptive messages.
impl From<reqwest::Error> for AppError {
    fn from(err: reqwest::Error) -> Self {
        if err.is_connect() || err.is_request() {
            AppError::ExternalApiError("无法连接到外部API服务".to_string())
        } else if err.is_timeout() {
            AppError::ExternalApiError("外部API请求超时".to_string())
        } else if err.is_status() {
            let status = err.status().map(|s| s.as_u16()).unwrap_or(500);
            AppError::ExternalApiError(format!("外部API返回错误状态码: {}", status))
        } else {
            AppError::InternalError(anyhow::anyhow!("请求处理失败: {}", err))
        }
    }
}

/// Convert SQLx database errors into AppError.
/// RowNotFound maps to NotFound; all other errors map to InternalError.
impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        match err {
            sqlx::Error::RowNotFound => AppError::NotFound,
            _ => AppError::InternalError(anyhow::anyhow!("数据库错误: {}", err)),
        }
    }
}

/// Convert jsonwebtoken errors into AppError.
/// All JWT errors (expired, invalid, malformed) map to Unauthorized.
impl From<jsonwebtoken::errors::Error> for AppError {
    fn from(_: jsonwebtoken::errors::Error) -> Self {
        AppError::Unauthorized
    }
}

/// Convert bcrypt errors into AppError.
/// Password hashing/verification failures map to InternalError.
impl From<bcrypt::BcryptError> for AppError {
    fn from(err: bcrypt::BcryptError) -> Self {
        AppError::InternalError(anyhow::anyhow!("密码处理失败: {}", err))
    }
}
