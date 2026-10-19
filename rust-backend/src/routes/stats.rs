use axum::Router;
use axum::routing::get;

use crate::AppState;
use crate::handlers::stats;

/// Build the stats sub-router.
///
/// Route: `GET /api/stats` — aggregate generation statistics.
pub fn router() -> Router<AppState> {
    Router::new().route("/", get(stats::get_stats))
}
