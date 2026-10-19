use axum::extract::State;
use axum::Json;
use serde_json::json;

use crate::AppState;
use crate::error::AppError;
use crate::types::settings::{ApiKeyRequest, ApiKeyResponse};

/// Mask an API key for display.
///
/// Matches the Python `mask_key` function exactly:
/// - If len <= 8: show first char + "***" + last char
/// - Otherwise: show first 3 chars + "***" + last 3 chars
fn mask_key(key: &str) -> String {
    if key.is_empty() {
        return String::new();
    }
    let chars: Vec<char> = key.chars().collect();
    if chars.len() <= 8 {
        format!("{}***{}", chars[0], chars[chars.len() - 1])
    } else {
        let prefix: String = chars[..3].iter().collect();
        let suffix: String = chars[chars.len() - 3..].iter().collect();
        format!("{}***{}", prefix, suffix)
    }
}

/// GET /api/settings/api-key
///
/// Returns the masked API key.
/// Matches Python: `ApiKeyResponse(api_key_masked=mask_key(settings.agnes_api_key))`
pub async fn get_api_key(
    State(state): State<AppState>,
) -> Json<ApiKeyResponse> {
    let key = state.api_key.read().await;
    let masked = mask_key(&key);
    Json(ApiKeyResponse {
        api_key_masked: masked,
    })
}

/// PUT /api/settings/api-key
///
/// Updates the API key, persists to .env, and returns the new masked key.
/// Matches Python: `return {"ok": True, "api_key_masked": mask_key(body.api_key)}`
pub async fn update_api_key(
    State(state): State<AppState>,
    Json(body): Json<ApiKeyRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    if body.api_key.is_empty() {
        return Err(AppError::ValidationError("API key 不能为空".to_string()));
    }

    // Persist to .env file via config module
    state
        .config
        .update_api_key(&body.api_key)
        .map_err(|e| AppError::InternalError(e))?;

    // Update the in-memory key
    {
        let mut key = state.api_key.write().await;
        *key = body.api_key.clone();
    }

    let masked = mask_key(&body.api_key);
    Ok(Json(json!({"ok": true, "api_key_masked": masked})))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mask_key_short() {
        // Python: if len(key) <= 8: key[0] + "***" + key[-1]
        assert_eq!(mask_key("abc"), "a***c");
        assert_eq!(mask_key("ab"), "a***b");
        assert_eq!(mask_key("a"), "a***a");
        assert_eq!(mask_key(""), "");
    }

    #[test]
    fn test_mask_key_exactly_8() {
        assert_eq!(mask_key("12345678"), "1***8");
    }

    #[test]
    fn test_mask_key_long() {
        // Python: key[:3] + "***" + key[-3:]
        assert_eq!(mask_key("123456789"), "123***789");
        assert_eq!(mask_key("sk-abcdefghij"), "sk-***hij");
    }
}
