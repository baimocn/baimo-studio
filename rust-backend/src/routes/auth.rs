use axum::extract::State;
use axum::Json;

use crate::auth::handlers;
use crate::middleware::auth::AuthUser;
use crate::types::auth::{LoginRequest, RegisterRequest, TokenResponse, UserResponse};
use crate::AppState;
use crate::error::AppError;

/// POST /api/auth/register
pub async fn register(
    State(state): State<AppState>,
    Json(body): Json<RegisterRequest>,
) -> Result<Json<TokenResponse>, AppError> {
    handlers::register(State(state), Json(body)).await
}

/// POST /api/auth/login
pub async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<TokenResponse>, AppError> {
    handlers::login(State(state), Json(body)).await
}

/// GET /api/auth/me
///
/// Returns the current authenticated user's profile.
/// Requires a valid JWT Bearer token in the Authorization header.
pub async fn me(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<UserResponse>, AppError> {
    handlers::me(State(state), auth).await
}
