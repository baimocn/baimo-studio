use axum::extract::State;
use axum::Json;

use crate::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::generation::Generation;
use crate::types::stats::StatsResponse;

/// GET /api/stats
///
/// Returns aggregate generation statistics.
/// Requires authentication.
pub async fn get_stats(
    State(state): State<AppState>,
    _auth: AuthUser,
) -> Result<Json<StatsResponse>, AppError> {
    let stats = Generation::get_stats(&state.db).await?;

    Ok(Json(StatsResponse {
        total_generations: stats.total_generations,
        image_count: stats.image_count,
        video_count: stats.video_count,
        today_count: stats.today_count,
        favorite_count: stats.favorite_count,
    }))
}
