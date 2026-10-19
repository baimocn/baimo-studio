use serde::Serialize;

/// GET /api/stats response.
/// Field names match the Python backend exactly:
/// `{"total_generations", "image_count", "video_count", "today_count", "favorite_count"}`
#[derive(Serialize)]
pub struct StatsResponse {
    pub total_generations: i64,
    pub image_count: i64,
    pub video_count: i64,
    pub today_count: i64,
    pub favorite_count: i64,
}
