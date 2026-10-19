use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::str::FromStr;

use crate::config::Settings;

/// Initialize the SQLite connection pool with WAL mode and busy timeout.
pub async fn init_pool(settings: &Settings) -> anyhow::Result<SqlitePool> {
    let options = SqliteConnectOptions::from_str(&settings.database_url)?
        .journal_mode(SqliteJournalMode::Wal)
        .busy_timeout(std::time::Duration::from_secs(5))
        .create_if_missing(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(10)
        .connect_with(options)
        .await?;

    tracing::info!("Database connected: {}", settings.database_url);
    Ok(pool)
}

/// Auto-create all tables and indexes on startup (idempotent).
///
/// Uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` so it is
/// safe to call on every boot. No external migration files are required.
pub async fn run_migrations(pool: &SqlitePool) -> anyhow::Result<()> {
    // Enable foreign key enforcement
    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(pool)
        .await?;

    // ── Users table ──────────────────────────────────────────────────────
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS users (
            id             TEXT PRIMARY KEY NOT NULL,
            username       TEXT NOT NULL,
            email          TEXT NOT NULL UNIQUE,
            hashed_password TEXT NOT NULL,
            is_active      INTEGER NOT NULL DEFAULT 1,
            created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email)")
        .execute(pool)
        .await?;

    // ── Generations table ────────────────────────────────────────────────
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS generations (
            id          TEXT PRIMARY KEY NOT NULL,
            user_id     TEXT,
            type        TEXT NOT NULL CHECK (type IN ('image', 'video')),
            model       TEXT NOT NULL,
            prompt      TEXT NOT NULL,
            parameters  TEXT,
            result_url  TEXT,
            status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
            is_favorite INTEGER NOT NULL DEFAULT 0,
            created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )",
    )
    .execute(pool)
    .await?;

    // Indexes for common query patterns
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations (user_id)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_generations_created_at ON generations (created_at DESC)")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_generations_is_favorite ON generations (is_favorite) WHERE is_favorite = 1")
        .execute(pool)
        .await?;

    tracing::info!("Database tables and indexes verified");
    Ok(())
}
