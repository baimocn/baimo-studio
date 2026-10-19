use axum::extract::{Path, Query, State};
use axum::Json;
use serde_json::json;

use crate::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::models::generation::Generation;
use crate::types::generation::*;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/// Convert a database Generation row into an API GenerationItem.
/// Mirrors Python's `_gen_to_dict()` — field names must match exactly:
/// `{"id", "prompt", "type", "model", "result_url", "params", "is_favorite", "status", "created_at"}`
fn to_item(g: Generation) -> GenerationItem {
    GenerationItem {
        id: g.id,
        prompt: g.prompt,
        gen_type: g.gen_type,
        model: g.model,
        result_url: g.result_url,
        params: g.parameters,
        is_favorite: g.is_favorite,
        status: g.status,
        // Python uses .isoformat() which includes timezone; match with +00:00 suffix
        created_at: Some(g.created_at.format("%Y-%m-%dT%H:%M:%S+00:00").to_string()),
    }
}

// ---------------------------------------------------------------------------
// GET /api/generations
// ---------------------------------------------------------------------------

/// GET /api/generations?page=1&limit=20
///
/// Returns a paginated list of all generations ordered by newest first.
/// Response: `{"items": [...], "total": N, "page": N, "limit": N}`
/// Requires authentication.
pub async fn list_generations(
    State(state): State<AppState>,
    _auth: AuthUser,
    Query(params): Query<PaginationParams>,
) -> Result<Json<PaginatedResponse<GenerationItem>>, AppError> {
    let page = params.page();
    let limit = params.limit();

    let (rows, total) = Generation::list(&state.db, page, limit).await?;

    Ok(Json(PaginatedResponse {
        items: rows.into_iter().map(to_item).collect(),
        total,
        page,
        limit,
    }))
}

// ---------------------------------------------------------------------------
// GET /api/generations/favorites
// ---------------------------------------------------------------------------

/// GET /api/generations/favorites?page=1&limit=20
///
/// Returns a paginated list of favorite generations.
/// Requires authentication.
pub async fn list_favorites(
    State(state): State<AppState>,
    _auth: AuthUser,
    Query(params): Query<PaginationParams>,
) -> Result<Json<PaginatedResponse<GenerationItem>>, AppError> {
    let page = params.page();
    let limit = params.limit();

    let (rows, total) = Generation::list_favorites(&state.db, page, limit).await?;

    Ok(Json(PaginatedResponse {
        items: rows.into_iter().map(to_item).collect(),
        total,
        page,
        limit,
    }))
}

// ---------------------------------------------------------------------------
// GET /api/generations/{id}
// ---------------------------------------------------------------------------

/// GET /api/generations/{id}
///
/// Returns a single generation by ID. Returns 404 if not found.
/// Requires authentication.
pub async fn get_generation(
    State(state): State<AppState>,
    _auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<GenerationItem>, AppError> {
    let g = Generation::find_by_id(&state.db, &id)
        .await?
        .ok_or(AppError::NotFound)?;

    Ok(Json(to_item(g)))
}

// ---------------------------------------------------------------------------
// PUT /api/generations/{id}/favorite
// ---------------------------------------------------------------------------

/// PUT /api/generations/{id}/favorite
///
/// Toggles the `is_favorite` boolean for the given generation.
/// Returns: `{"id": "...", "is_favorite": true/false}`
/// Requires authentication.
pub async fn toggle_favorite(
    State(state): State<AppState>,
    _auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    let new_val = Generation::toggle_favorite(&state.db, &id).await?;
    Ok(Json(json!({"id": id, "is_favorite": new_val})))
}

// ---------------------------------------------------------------------------
// DELETE /api/generations/{id}
// ---------------------------------------------------------------------------

/// DELETE /api/generations/{id}
///
/// Permanently removes a generation record.
/// Returns: `{"ok": true}`
/// Requires authentication.
pub async fn delete_generation(
    State(state): State<AppState>,
    _auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    let deleted = Generation::delete(&state.db, &id).await?;
    if !deleted {
        return Err(AppError::NotFound);
    }
    Ok(Json(json!({"ok": true})))
}
