use std::future::Future;

use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

use crate::AppState;
use crate::config::Settings;
use crate::error::AppError;

/// JWT claims structure.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String, // user_id as string
    pub email: String,
    pub exp: usize,
}

/// Create a JWT token for the given user.
pub fn create_token(
    user_id: &str,
    email: &str,
    settings: &Settings,
) -> Result<String, jsonwebtoken::errors::Error> {
    let now = chrono::Utc::now();
    let exp = (now + chrono::Duration::days(settings.jwt_expire_days)).timestamp() as usize;

    let claims = Claims {
        sub: user_id.to_string(),
        email: email.to_string(),
        exp,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(settings.jwt_secret.as_bytes()),
    )
}

/// Validate a JWT token and return the claims.
pub fn validate_token(token: &str, settings: &Settings) -> Result<Claims, AppError> {
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(settings.jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|_| AppError::Unauthorized)?;

    Ok(token_data.claims)
}

/// Axum extractor - extracts and validates JWT from Authorization: Bearer header.
/// Uses AppState to access the JWT secret for validation.
impl FromRequestParts<AppState> for Claims {
    type Rejection = AppError;

    fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> impl Future<Output = Result<Self, Self::Rejection>> + Send {
        let auth_header = parts
            .headers
            .get("authorization")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string());

        let settings = state.config.clone();

        async move {
            let header = auth_header.ok_or(AppError::Unauthorized)?;
            let token = header
                .strip_prefix("Bearer ")
                .ok_or(AppError::Unauthorized)?;
            validate_token(token, &settings)
        }
    }
}
