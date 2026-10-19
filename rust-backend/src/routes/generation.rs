use axum::Router;
use axum::routing::{delete, get, put};

use crate::handlers::generation::*;

/// Build the generation sub-router.
///
/// All routes are mounted under `/api/generations`:
/// - `GET    /`                — paginated list of all generations
/// - `GET    /favorites`       — paginated list of favorites
/// - `GET    /{id}`            — single generation by ID
/// - `PUT    /{id}/favorite`   — toggle favorite flag
/// - `DELETE /{id}`            — delete a generation
pub fn router() -> Router<crate::AppState> {
    Router::new()
        .route("/", get(list_generations))
        .route("/favorites", get(list_favorites))
        .route("/{id}", get(get_generation))
        .route("/{id}/favorite", put(toggle_favorite))
        .route("/{id}", delete(delete_generation))
}
