use serde::{Deserialize, Serialize};

/// POST /api/auth/register request body.
#[derive(Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub email: String,
    pub password: String,
}

/// POST /api/auth/login request body.
#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

/// Auth token response.
#[derive(Serialize)]
pub struct TokenResponse {
    pub token: String,
    pub email: String,
    pub user_id: String,
}

/// User response (without sensitive fields).
#[derive(Serialize)]
pub struct UserResponse {
    pub id: String,
    pub username: String,
    pub email: String,
}
