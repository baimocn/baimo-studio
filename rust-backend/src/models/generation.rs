use serde::Serialize;
use sqlx::FromRow;
use sqlx::SqlitePool;
use uuid::Uuid;

/// Stats row returned by aggregate queries.
#[derive(Debug, Serialize)]
pub struct StatsRow {
    pub total_generations: i64,
    pub image_count: i64,
    pub video_count: i64,
    pub today_count: i64,
    pub favorite_count: i64,
}

/// Generation database row type.
#[derive(Debug, Serialize, FromRow)]
pub struct Generation {
    pub id: String,
    pub user_id: Option<String>,
    #[sqlx(rename = "type")]
    pub gen_type: String,
    pub model: String,
    pub prompt: String,
    pub parameters: Option<String>,
    pub result_url: Option<String>,
    pub status: String,
    pub is_favorite: bool,
    pub created_at: chrono::NaiveDateTime,
}

impl Generation {
    /// Create a new generation record with a generated UUID.
    pub async fn create(
        pool: &SqlitePool,
        user_id: Option<&str>,
        model: &str,
        prompt: &str,
        gen_type: &str,
        parameters: Option<&str>,
    ) -> Result<Self, sqlx::Error> {
        let id = Uuid::new_v4().to_string();

        let result = sqlx::query_as::<_, Generation>(
            "INSERT INTO generations (id, user_id, model, prompt, type, parameters)
             VALUES (?, ?, ?, ?, ?, ?)
             RETURNING *",
        )
        .bind(&id)
        .bind(user_id)
        .bind(model)
        .bind(prompt)
        .bind(gen_type)
        .bind(parameters)
        .fetch_one(pool)
        .await?;

        Ok(result)
    }

    /// Find a generation by ID (UUID string).
    pub async fn find_by_id(
        pool: &SqlitePool,
        id: &str,
    ) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_as::<_, Generation>("SELECT * FROM generations WHERE id = ?")
            .bind(id)
            .fetch_optional(pool)
            .await
    }

    /// List generations with pagination, ordered by newest first.
    pub async fn list(
        pool: &SqlitePool,
        page: i64,
        limit: i64,
    ) -> Result<(Vec<Self>, i64), sqlx::Error> {
        let offset = (page - 1) * limit;

        let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM generations")
            .fetch_one(pool)
            .await?;

        let items = sqlx::query_as::<_, Generation>(
            "SELECT * FROM generations ORDER BY created_at DESC LIMIT ? OFFSET ?",
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        Ok((items, total))
    }

    /// List generations for a specific user with pagination.
    pub async fn list_by_user(
        pool: &SqlitePool,
        user_id: &str,
        page: i64,
        limit: i64,
    ) -> Result<(Vec<Self>, i64), sqlx::Error> {
        let offset = (page - 1) * limit;

        let total: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM generations WHERE user_id = ?")
                .bind(user_id)
                .fetch_one(pool)
                .await?;

        let items = sqlx::query_as::<_, Generation>(
            "SELECT * FROM generations WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
        )
        .bind(user_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        Ok((items, total))
    }

    /// List favorite generations with pagination.
    pub async fn list_favorites(
        pool: &SqlitePool,
        page: i64,
        limit: i64,
    ) -> Result<(Vec<Self>, i64), sqlx::Error> {
        let offset = (page - 1) * limit;

        let total: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM generations WHERE is_favorite = 1")
                .fetch_one(pool)
                .await?;

        let items = sqlx::query_as::<_, Generation>(
            "SELECT * FROM generations WHERE is_favorite = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?",
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        Ok((items, total))
    }

    /// Toggle the favorite status of a generation.
    pub async fn toggle_favorite(
        pool: &SqlitePool,
        id: &str,
    ) -> Result<bool, sqlx::Error> {
        let new_val = sqlx::query_scalar::<_, bool>(
            "UPDATE generations SET is_favorite = NOT is_favorite WHERE id = ? RETURNING is_favorite",
        )
        .bind(id)
        .fetch_one(pool)
        .await?;

        Ok(new_val)
    }

    /// Delete a generation by ID.
    pub async fn delete(pool: &SqlitePool, id: &str) -> Result<bool, sqlx::Error> {
        let rows = sqlx::query("DELETE FROM generations WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await?
            .rows_affected();

        Ok(rows > 0)
    }

    /// Update the status and result URL of a generation.
    pub async fn update_status(
        pool: &SqlitePool,
        id: &str,
        status: &str,
        result_url: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE generations SET status = ?, result_url = ? WHERE id = ?")
            .bind(status)
            .bind(result_url)
            .bind(id)
            .execute(pool)
            .await?;

        Ok(())
    }

    /// Get aggregate statistics across all generations.
    pub async fn get_stats(pool: &SqlitePool) -> Result<StatsRow, sqlx::Error> {
        let row = sqlx::query_as::<_, (i64, i64, i64, i64, i64)>(
            r#"
            SELECT
                COUNT(*) as total_generations,
                COALESCE(SUM(CASE WHEN type = 'image' THEN 1 ELSE 0 END), 0) as image_count,
                COALESCE(SUM(CASE WHEN type = 'video' THEN 1 ELSE 0 END), 0) as video_count,
                COALESCE(SUM(CASE WHEN DATE(created_at) = DATE('now') THEN 1 ELSE 0 END), 0) as today_count,
                COALESCE(SUM(CASE WHEN is_favorite = 1 THEN 1 ELSE 0 END), 0) as favorite_count
            FROM generations
            "#,
        )
        .fetch_one(pool)
        .await?;

        Ok(StatsRow {
            total_generations: row.0,
            image_count: row.1,
            video_count: row.2,
            today_count: row.3,
            favorite_count: row.4,
        })
    }
}
