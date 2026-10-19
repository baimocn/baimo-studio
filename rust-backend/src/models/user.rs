use serde::Serialize;
use sqlx::FromRow;
use sqlx::SqlitePool;
use uuid::Uuid;

/// User database row type.
#[derive(Debug, FromRow, Serialize)]
pub struct User {
    pub id: String,
    pub username: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub hashed_password: String,
    pub is_active: bool,
    pub created_at: chrono::NaiveDateTime,
}

impl User {
    /// Create a new user with a generated UUID.
    pub async fn create(
        pool: &SqlitePool,
        username: &str,
        email: &str,
        hashed_password: &str,
    ) -> Result<Self, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().naive_utc();

        let result = sqlx::query_as::<_, User>(
            "INSERT INTO users (id, username, email, hashed_password, is_active, created_at)
             VALUES (?, ?, ?, ?, 1, ?)
             RETURNING *",
        )
        .bind(&id)
        .bind(username)
        .bind(email)
        .bind(hashed_password)
        .bind(now)
        .fetch_one(pool)
        .await?;

        Ok(result)
    }

    /// Find a user by email address.
    pub async fn find_by_email(
        pool: &SqlitePool,
        email: &str,
    ) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_as::<_, User>("SELECT * FROM users WHERE email = ?")
            .bind(email)
            .fetch_optional(pool)
            .await
    }

    /// Find a user by ID (UUID string).
    pub async fn find_by_id(
        pool: &SqlitePool,
        id: &str,
    ) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = ?")
            .bind(id)
            .fetch_optional(pool)
            .await
    }

    /// Check whether a username is already taken.
    pub async fn username_exists(
        pool: &SqlitePool,
        username: &str,
    ) -> Result<bool, sqlx::Error> {
        let count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM users WHERE username = ?")
                .bind(username)
                .fetch_one(pool)
                .await?;

        Ok(count > 0)
    }
}
