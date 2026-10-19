use axum::extract::State;
use axum::Json;
use regex::Regex;

use crate::AppState;
use crate::auth::jwt;
use crate::auth::password;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::user::User;
use crate::types::auth::{LoginRequest, RegisterRequest, TokenResponse, UserResponse};

/// Validate email format using a regex pattern.
fn validate_email(email: &str) -> bool {
    let re = Regex::new(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$").unwrap();
    re.is_match(email)
}

/// Validate password strength: >= 8 chars, at least one lowercase, one uppercase, one digit.
fn validate_password_strength(password: &str) -> Result<(), AppError> {
    if password.len() < 8 {
        return Err(AppError::ValidationError(
            "密码长度不能少于8个字符".to_string(),
        ));
    }
    let re_lowercase = Regex::new(r"[a-z]").unwrap();
    let re_uppercase = Regex::new(r"[A-Z]").unwrap();
    let re_digit = Regex::new(r"\d").unwrap();

    if !re_lowercase.is_match(password) {
        return Err(AppError::ValidationError(
            "密码必须包含小写字母".to_string(),
        ));
    }
    if !re_uppercase.is_match(password) {
        return Err(AppError::ValidationError(
            "密码必须包含大写字母".to_string(),
        ));
    }
    if !re_digit.is_match(password) {
        return Err(AppError::ValidationError(
            "密码必须包含数字".to_string(),
        ));
    }
    Ok(())
}

/// POST /api/auth/register
pub async fn register(
    State(state): State<AppState>,
    Json(body): Json<RegisterRequest>,
) -> Result<Json<TokenResponse>, AppError> {
    // Validate username
    if body.username.trim().is_empty() || body.username.len() < 2 {
        return Err(AppError::ValidationError(
            "用户名长度不能少于2个字符".to_string(),
        ));
    }

    // Validate email format with regex
    if !validate_email(&body.email) {
        return Err(AppError::ValidationError("邮箱格式不正确".to_string()));
    }

    // Validate password strength (length + lowercase + uppercase + digit)
    validate_password_strength(&body.password)?;

    // Check if email already exists
    if User::find_by_email(&state.db, &body.email).await?.is_some() {
        return Err(AppError::BadRequest("该邮箱已被注册".to_string()));
    }

    // Check if username already exists
    if User::username_exists(&state.db, &body.username).await? {
        return Err(AppError::BadRequest("该用户名已被使用".to_string()));
    }

    // Hash password and create user
    let hash = password::hash_password(&body.password)?;
    let user = User::create(&state.db, &body.username, &body.email, &hash).await?;

    // Generate JWT
    let token = jwt::create_token(&user.id, &user.email, &state.config)?;

    Ok(Json(TokenResponse {
        token,
        email: user.email,
        user_id: user.id,
    }))
}

/// POST /api/auth/login
pub async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<TokenResponse>, AppError> {
    // Find user by email
    let user = User::find_by_email(&state.db, &body.email)
        .await?
        .ok_or(AppError::Unauthorized)?;

    // Verify password
    let valid = password::verify_password(&body.password, &user.hashed_password)?;

    if !valid {
        return Err(AppError::Unauthorized);
    }

    // Generate JWT
    let token = jwt::create_token(&user.id, &user.email, &state.config)?;

    Ok(Json(TokenResponse {
        token,
        email: user.email,
        user_id: user.id,
    }))
}

/// GET /api/auth/me
///
/// Returns the current authenticated user's information.
/// Requires a valid JWT Bearer token in the Authorization header.
pub async fn me(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<UserResponse>, AppError> {
    let user = User::find_by_id(&state.db, &auth.user_id)
        .await?
        .ok_or(AppError::NotFound)?;

    Ok(Json(UserResponse {
        id: user.id,
        username: user.username,
        email: user.email,
    }))
}
