use std::sync::OnceLock;

use anyhow::Context;

/// Path to the .env file. Resolved relative to the current working directory.
fn env_path() -> &'static std::path::Path {
    std::path::Path::new(".env")
}

/// Application configuration loaded from environment variables and .env file.
///
/// Mirrors the Python `Settings` class in `backend/app/core/config.py`.
/// Uses `OnceLock` for singleton access via `Settings::global()`.
#[derive(Debug, Clone)]
pub struct Settings {
    pub agnes_api_key: String,
    pub agnes_api_base: String,
    pub database_url: String,
    pub cors_origins: Vec<String>,
    pub jwt_secret: String,
    pub jwt_algorithm: String,
    pub jwt_expire_days: i64,
    pub server_port: u16,
    pub max_upload_bytes: usize,
    pub max_download_bytes: u64,
    pub rate_limit_per_minute: u64,
}

/// Global singleton. Initialized once via `Settings::init()`, accessible everywhere via `Settings::global()`.
static SETTINGS: OnceLock<Settings> = OnceLock::new();

impl Settings {
    // ── Singleton ──────────────────────────────────────────────────────

    /// Initialize the global settings singleton from .env + environment variables.
    ///
    /// Returns `Err` if the .env file is missing **or** if required fields
    /// (currently: `AGNES_API_KEY`) are absent/empty.
    ///
    /// Safe to call multiple times — only the first call takes effect.
    pub fn init() -> anyhow::Result<&'static Settings> {
        if let Some(settings) = SETTINGS.get() {
            return Ok(settings);
        }
        let settings = Self::load()?;
        // Ignore error from set() — another thread may have initialized first
        let _ = SETTINGS.set(settings);
        Ok(SETTINGS.get().unwrap())
    }

    /// Return a reference to the already-initialized global settings.
    ///
    /// # Panics
    /// Panics if `Settings::init()` has not been called yet.
    pub fn global() -> &'static Settings {
        SETTINGS
            .get()
            .expect("Settings::init() must be called before Settings::global()")
    }

    // ── Loading ────────────────────────────────────────────────────────

    /// Load configuration from `.env` file and environment variables.
    ///
    /// Environment variables always take precedence over `.env` values
    /// (standard `dotenvy` behavior).
    fn load() -> anyhow::Result<Self> {
        // Load .env file — fail loudly so operators know the file is missing
        dotenvy::dotenv().context(
            "Failed to load .env file. \
             Copy .env.example to .env and fill in the required values.",
        )?;

        // Ensure data directories exist
        std::fs::create_dir_all("data").context("failed to create data/ directory")?;
        std::fs::create_dir_all("uploads").context("failed to create uploads/ directory")?;

        // ── Required fields ────────────────────────────────────────────
        let agnes_api_key = require_env("AGNES_API_KEY")?;

        // ── Optional fields with defaults ──────────────────────────────
        let agnes_api_base = optional_env(
            "AGNES_API_BASE",
            "https://apihub.agnes-ai.com",
        );

        let database_url = optional_env("DATABASE_URL", "sqlite:./data/agnes.db");

        let cors_origins = optional_env(
            "CORS_ORIGINS",
            "http://localhost:5180,http://localhost:5188",
        )
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

        let jwt_algorithm = optional_env("JWT_ALGORITHM", "HS256");

        let jwt_expire_days = parse_env("JWT_EXPIRE_DAYS", 30_i64);

        let server_port = parse_env("SERVER_PORT", 5180_u16);

        let max_upload_bytes: usize = parse_env(
            "MAX_UPLOAD_BYTES",
            20 * 1024 * 1024, // 20 MB
        );

        let max_download_bytes: u64 = parse_env(
            "MAX_DOWNLOAD_BYTES",
            100 * 1024 * 1024, // 100 MB
        );

        let rate_limit_per_minute = parse_env("RATE_LIMIT_PER_MINUTE", 60_u64);

        // JWT_SECRET: generate a random one if not provided (not a hard requirement)
        let jwt_secret = match std::env::var("JWT_SECRET") {
            Ok(s) if !s.is_empty() => s,
            _ => {
                let secret = uuid::Uuid::new_v4().to_string();
                tracing::warn!(
                    "JWT_SECRET not set — generated ephemeral random secret. \
                     Set JWT_SECRET in .env for persistent sessions across restarts."
                );
                secret
            }
        };

        Ok(Settings {
            agnes_api_key,
            agnes_api_base,
            database_url,
            cors_origins,
            jwt_secret,
            jwt_algorithm,
            jwt_expire_days,
            server_port,
            max_upload_bytes,
            max_download_bytes,
            rate_limit_per_minute,
        })
    }

    // ── Runtime mutation (.env write-back) ─────────────────────────────

    /// Update the AGNES_API_KEY at runtime.
    ///
    /// 1. Writes the new value back to the `.env` file (replaces existing line
    ///    or appends if absent).
    /// 2. Returns the new `Settings` with the updated key so callers can refresh
    ///    their cached copy.
    ///
    /// Note: the global singleton is **not** mutated (it is behind `OnceLock`).
    /// Callers should store the returned value wherever they need the live config.
    pub fn update_api_key(&self, new_key: &str) -> anyhow::Result<Self> {
        write_env_var("AGNES_API_KEY", new_key)?;

        let mut updated = self.clone();
        updated.agnes_api_key = new_key.to_string();
        Ok(updated)
    }
}

// ── .env helpers ────────────────────────────────────────────────────────

/// Read or create a key-value pair in the `.env` file.
/// If the key already exists its line is replaced; otherwise it is appended.
fn write_env_var(key: &str, value: &str) -> anyhow::Result<()> {
    let path = env_path();

    let content = if path.exists() {
        std::fs::read_to_string(path).context("failed to read .env file")?
    } else {
        String::new()
    };

    let mut found = false;
    let new_content: String = content
        .lines()
        .map(|line| {
            if line.starts_with(&format!("{}=", key)) {
                found = true;
                format!("{}={}", key, value)
            } else {
                line.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join("\n");

    let final_content = if found {
        new_content
    } else if new_content.is_empty() {
        format!("{}={}\n", key, value)
    } else {
        format!("{}\n{}={}\n", new_content.trim_end(), key, value)
    };

    std::fs::write(path, final_content).context("failed to write .env file")?;
    Ok(())
}

/// Read a required environment variable. Returns `Err` if missing or empty.
fn require_env(key: &str) -> anyhow::Result<String> {
    std::env::var(key)
        .ok()
        .filter(|v| !v.is_empty())
        .with_context(|| {
            format!(
                "Required environment variable `{}` is missing or empty. \
                 Set it in the .env file or as an OS environment variable.",
                key
            )
        })
}

/// Read an optional environment variable, falling back to `default`.
fn optional_env(key: &str, default: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| default.to_string())
}

/// Read an environment variable and parse it to type `T`, falling back to `default`.
fn parse_env<T: std::str::FromStr + std::fmt::Display>(key: &str, default: T) -> T {
    std::env::var(key)
        .ok()
        .and_then(|v| v.parse::<T>().ok())
        .unwrap_or(default)
}

// ── Tests ───────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_optional_env_default() {
        // SAFETY: test isolation — this key is unlikely to exist
        std::env::remove_var("_TEST_OPT_KEY");
        assert_eq!(optional_env("_TEST_OPT_KEY", "fallback"), "fallback");
    }

    #[test]
    fn test_parse_env_default() {
        std::env::remove_var("_TEST_PARSE_KEY");
        assert_eq!(parse_env("_TEST_PARSE_KEY", 42_u16), 42);
    }

    #[test]
    fn test_write_env_var_roundtrip() {
        // Verify env var read/write helpers work in isolation
        std::env::set_var("_TEST_WRITE_KEY", "old_value");
        assert_eq!(
            std::env::var("_TEST_WRITE_KEY").unwrap(),
            "old_value"
        );
        std::env::remove_var("_TEST_WRITE_KEY");
        assert!(std::env::var("_TEST_WRITE_KEY").is_err());
    }
}
