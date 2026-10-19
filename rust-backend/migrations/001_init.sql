-- migrations/001_init.sql

CREATE TABLE IF NOT EXISTS users (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);

CREATE TABLE IF NOT EXISTS generations (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    model VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    type VARCHAR(255) NOT NULL CHECK (type IN ('image', 'video')),
    result_url TEXT,
    params TEXT,
    is_favorite BOOLEAN NOT NULL DEFAULT 0,
    status VARCHAR(255) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_generations_user_id ON generations (user_id);
CREATE INDEX IF NOT EXISTS ix_generations_type ON generations (type);
CREATE INDEX IF NOT EXISTS ix_generations_is_favorite ON generations (is_favorite);
CREATE INDEX IF NOT EXISTS ix_generations_created_at ON generations (created_at DESC);
CREATE INDEX IF NOT EXISTS ix_generations_status ON generations (status);
