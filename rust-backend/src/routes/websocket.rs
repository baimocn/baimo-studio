use axum::extract::WebSocketUpgrade;
use axum::response::IntoResponse;
use axum::routing::get;
use axum::Router;

use crate::AppState;
use crate::handlers;
use crate::routes;

// ---------------------------------------------------------------------------
// Consolidated API Router
// ---------------------------------------------------------------------------

/// Build the consolidated API router containing ALL application routes.
///
/// Merges every sub-router into a single `Router<AppState>`:
///
/// - **image**       `/api/image/*`         — generate, batch, edit, compose, download, upload
/// - **video**       `/api/video/*`         — generate (create), status polling, download
/// - **prompt**      `/api/prompt/*`        — optimize, optimize-stream, analyze-image
/// - **generation**  `/api/generations/*`   — CRUD + favorites
/// - **stats**       `/api/stats`           — aggregate counts
/// - **settings**    `/api/settings/*`      — API key management
/// - **workflow**    `/api/workflow/*`       — analyze-and-generate, execute
/// - **upload**      `/api/upload/image`    — standalone multipart upload
/// - **download**    `/api/download/proxy`  — unified SSRF-safe proxy download
/// - **websocket**   `/ws/video/{video_id}` — real-time video status push
pub fn router() -> Router<AppState> {
    Router::new()
        // ── Image routes ─────────────────────────────────────────────────
        .nest("/api/image", routes::image::router())
        // ── Video routes ─────────────────────────────────────────────────
        .nest("/api/video", routes::video::router())
        // ── Prompt routes ────────────────────────────────────────────────
        .nest("/api/prompt", routes::prompt::router())
        // ── Generation routes ────────────────────────────────────────────
        .nest("/api/generations", routes::generation::router())
        // ── Stats route ──────────────────────────────────────────────────
        .nest("/api/stats", routes::stats::router())
        // ── Settings routes (absolute paths inside sub-router) ──────────
        .merge(routes::settings::router())
        // ── Workflow routes ──────────────────────────────────────────────
        .nest("/api/workflow", routes::workflow::router())
        // ── Upload & download proxy routes ───────────────────────────────
        .merge(routes::upload::upload_router())
        // ── WebSocket route ─────────────────────────────────────────────
        .route("/ws/video/{video_id}", get(ws_video_status))
}

// ---------------------------------------------------------------------------
// WebSocket upgrade handler (thin wrapper)
// ---------------------------------------------------------------------------

/// GET /ws/video/{video_id}
///
/// Upgrades the HTTP connection to a WebSocket and delegates to the
/// video status push handler. The handler polls the Agnes video API
/// every 3 seconds and sends JSON status updates until the video
/// reaches a terminal state ("completed" or "failed").
async fn ws_video_status(
    axum::extract::State(state): axum::extract::State<AppState>,
    ws: WebSocketUpgrade,
    axum::extract::Path(video_id): axum::extract::Path<String>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handlers::websocket::handle_video_ws(state, socket, video_id))
}
