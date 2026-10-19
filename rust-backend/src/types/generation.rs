use serde::{Deserialize, Serialize};

/// Pagination query parameters.
/// Matches Python: page=1.., limit=1..100
#[derive(Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

impl PaginationParams {
    /// Get the page number (defaults to 1, minimum 1).
    pub fn page(&self) -> i64 {
        self.page.unwrap_or(1).max(1)
    }

    /// Get the limit (defaults to 20, clamped to 1-100).
    pub fn limit(&self) -> i64 {
        self.limit.unwrap_or(20).clamp(1, 100)
    }
}

/// Paginated response wrapper.
/// Python format: {"items": [...], "total": N, "page": N, "limit": N}
#[derive(Serialize)]
pub struct PaginatedResponse<T: Serialize> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
}

/// Single generation item for API responses.
///
/// Field names MUST match the Python `_gen_to_dict` output:
/// `{"id", "prompt", "type", "model", "result_url", "params", "is_favorite", "status", "created_at"}`
#[derive(Serialize)]
pub struct GenerationItem {
    pub id: String,
    pub prompt: String,
    #[serde(rename = "type")]
    pub gen_type: String,
    pub model: String,
    pub result_url: Option<String>,
    pub params: Option<String>,
    pub is_favorite: bool,
    pub status: String,
    /// ISO 8601 datetime string with timezone (e.g. "2024-01-15T10:30:00+00:00")
    pub created_at: Option<String>,
}
