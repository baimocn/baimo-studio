use axum::Json;
use serde_json::json;

/// GET /api/health
pub async fn health() -> Json<serde_json::Value> {
    Json(json!({"status": "ok"}))
}
