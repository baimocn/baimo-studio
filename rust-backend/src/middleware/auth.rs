use std::future::Future;

use axum::extract::FromRequestParts;
use axum::http::request::Parts;

use crate::AppState;
use crate::auth::jwt::{self, Claims};
use crate::error::AppError;

/// Authenticated user extracted from JWT token.
/// Use as an Axum handler parameter to require and extract authentication.
///
/// # Example
/// ```ignore
/// async fn my_handler(auth: AuthUser) -> Json<Value> {
///     let user_id = auth.user_id;
///     // ...
/// }
/// ```
#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: String,
}

/// Extract and validate JWT from the Authorization: Bearer header.
/// Implements Axum's FromRequestParts so it can be used directly as a handler extractor.
impl FromRequestParts<AppState> for AuthUser {
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
            let claims = jwt::validate_token(token, &settings)?;
            Ok(AuthUser {
                user_id: claims.sub,
            })
        }
    }
}

/// Extract authenticated user claims from request headers.
/// This is a helper function for handlers that need the full Claims (user_id + email).
/// It validates the JWT token from the Authorization header against the app's JWT secret.
pub async fn extract_claims(parts: &Parts, state: &AppState) -> Result<Claims, AppError> {
    let auth_header = parts
        .headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .ok_or(AppError::Unauthorized)?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(AppError::Unauthorized)?;

    jwt::validate_token(token, &state.config)
}
