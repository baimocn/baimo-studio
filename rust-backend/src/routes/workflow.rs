use axum::routing::post;
use axum::Router;

use crate::AppState;
use crate::handlers::workflow as wf;

/// Build the workflow sub-router.
///
/// Routes:
/// - `POST /api/workflow/analyze-and-generate` — legacy 3-step pipeline
/// - `POST /api/workflow/execute`            — same pipeline, cleaner contract
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/analyze-and-generate", post(wf::analyze_and_generate))
        .route("/execute", post(wf::execute))
}
