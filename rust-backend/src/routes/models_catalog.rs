use axum::Json;
use serde_json::json;

/// GET /api/models
/// Returns static JSON with available image and video models.
pub async fn list_models() -> Json<serde_json::Value> {
    Json(json!({
        "image": [
            {
                "id": "agnes-image-2.1-flash",
                "name": "Agnes Image 2.1 Flash",
                "description": "High-quality image generation with fast inference"
            },
            {
                "id": "agnes-image-2.0-flash",
                "name": "Agnes Image 2.0 Flash",
                "description": "Previous generation image model"
            }
        ],
        "video": [
            {
                "id": "agnes-video-1.0",
                "name": "Agnes Video 1.0",
                "description": "Text-to-video and image-to-video generation"
            }
        ]
    }))
}
