use std::sync::Arc;

use axum::{Router, routing::get};
use tokio::sync::RwLock;
use tower_http::cors::{CorsLayer, Any};
use tower_http::trace::TraceLayer;
use tower_http::services::{ServeDir, ServeFile};
use tower_http::set_status::SetStatus;
use tower_http::limit::RequestBodyLimitLayer;

mod config;
mod error;
mod database;
mod auth;
mod handlers;
mod routes;
mod schemas;
mod services;
mod models;
mod types;
mod middleware;

use config::Settings;

/// Shared application state passed to all handlers.
#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::SqlitePool,
    pub http: reqwest::Client,
    pub config: Settings,
    pub api_key: Arc<RwLock<String>>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing (env-filter: RUST_LOG=info by default)
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    // Load configuration (singleton -- .env loaded once, accessible everywhere via Settings::global())
    let settings = Settings::init()?;

    // Initialize database with auto-migration on startup
    let pool = database::init_pool(&settings).await?;
    database::run_migrations(&pool).await?;

    // Build shared HTTP client
    let http_client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()?;

    // Build application state
    let state = AppState {
        db: pool,
        http: http_client,
        api_key: Arc::new(RwLock::new(settings.agnes_api_key.clone())),
        config: settings.clone(),
    };

    // Build CORS layer
    let cors = CorsLayer::new()
        .allow_origin(settings.cors_origins.iter().map(|o| o.parse().unwrap()).collect::<Vec<_>>())
        .allow_methods(Any)
        .allow_headers(Any);

    // Build the API router
    let api_router = Router::<AppState>::new()
        // Health check endpoint
        .route("/api/health", get(routes::health::health))
        // Auth routes
        .route("/api/auth/register", axum::routing::post(routes::auth::register))
        .route("/api/auth/login", axum::routing::post(routes::auth::login))
        .route("/api/auth/me", get(routes::auth::me))
        // Models catalog
        .route("/api/models", get(routes::models_catalog::list_models))
        // All image/video/prompt/generation/stats/settings/workflow/upload/download/websocket routes
        .merge(routes::websocket::router());

    // Static file serving with SPA fallback (Next.js export or standalone output)
    let static_service = resolve_static_service();

    // Uploaded files
    let uploads_service = ServeDir::new("uploads");

    // Combine everything
    let app = Router::<AppState>::new()
        .merge(api_router)
        .nest_service("/uploads", uploads_service)
        .fallback_service(static_service)
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .layer(RequestBodyLimitLayer::new(settings.max_upload_bytes))
        .layer(middleware::rate_limit::rate_limit_layer(settings.rate_limit_per_minute))
        .with_state(state);

    let addr = format!("0.0.0.0:{}", settings.server_port);
    tracing::info!("baimo Studio backend listening on {}", addr);

    // Graceful shutdown handling
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

/// Resolve the static file serving strategy based on what directories exist.
///
/// Priority:
/// 1. `frontend/out/` -- Next.js static export (`next export`)
/// 2. `frontend/.next/standalone/` -- Next.js standalone build
/// 3. `static/` -- Legacy fallback
fn resolve_static_service() -> ServeDir<SetStatus<ServeFile>> {
    if std::path::Path::new("frontend/out").exists() {
        tracing::info!("Serving static files from frontend/out/");
        ServeDir::new("frontend/out").not_found_service(ServeFile::new("frontend/out/index.html"))
    } else if std::path::Path::new("frontend/.next/standalone").exists() {
        tracing::info!("Serving static files from frontend/.next/standalone/");
        ServeDir::new("frontend/.next/standalone")
            .not_found_service(ServeFile::new("frontend/.next/standalone/index.html"))
    } else {
        tracing::warn!("No frontend build directory found, serving from static/");
        ServeDir::new("static").not_found_service(ServeFile::new("static/index.html"))
    }
}

/// Wait for a shutdown signal (Ctrl+C or SIGTERM on Unix).
async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {
            tracing::info!("Received Ctrl+C, shutting down gracefully...");
        }
        _ = terminate => {
            tracing::info!("Received SIGTERM, shutting down gracefully...");
        }
    }
}
