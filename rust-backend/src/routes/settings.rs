use axum::routing::{get, put};
use axum::Router;

use crate::AppState;
use crate::handlers;

/// Build the settings sub-router.
///
/// Routes:
/// - `GET  /api/settings/api-key` — returns the masked API key
/// - `PUT  /api/settings/api-key` — updates the API key, persists to .env
///
/// Both endpoints are unauthenticated (matching the Python backend).
/// Response format matches Python exactly:
/// - GET  -> `{"api_key_masked": "sk-***xyz"}`
/// - PUT  -> `{"ok": true, "api_key_masked": "sk-***xyz"}`
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/settings/api-key", get(handlers::settings::get_api_key))
        .route(
            "/api/settings/api-key",
            put(handlers::settings::update_api_key),
        )
}
