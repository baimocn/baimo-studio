use axum::Router;
use axum::routing::post;

use crate::AppState;
use crate::handlers::prompt;

/// Build the prompt sub-router.
///
/// All routes are mounted under `/api/prompt`:
/// - `POST /optimize`        — synchronous prompt optimization
/// - `POST /optimize-stream` — SSE streaming prompt optimization
/// - `POST /analyze-image`   — multimodal image analysis
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/optimize", post(prompt::optimize))
        .route("/optimize-stream", post(prompt::optimize_stream))
        .route("/analyze-image", post(prompt::analyze_image))
}
