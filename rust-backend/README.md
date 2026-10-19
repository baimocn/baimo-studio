# baimo Studio - Rust Backend

High-performance Rust backend for baimo Studio, replacing the Python/FastAPI backend with an Axum-based API server.

## Features

- **Axum web framework** with async/await (Tokio runtime)
- **SQLite** database via SQLx with WAL mode and auto-migration on startup
- **JWT authentication** with bcrypt password hashing
- **Rate limiting** per IP address
- **SSRF-safe download proxy** with host allowlisting
- **WebSocket** real-time video status push
- **SSE streaming** for prompt optimization
- **CORS** configurable for frontend origins
- **Graceful shutdown** on Ctrl+C / SIGTERM
- **Static file serving** for Next.js build output

## Project Structure

```
src/
  main.rs              -- Entry point, router setup, graceful shutdown
  config.rs            -- Settings singleton from .env
  database.rs          -- SQLite pool init + auto-migration
  error.rs             -- Unified AppError -> HTTP response mapping
  auth/                -- JWT, password hashing, auth handlers
  handlers/            -- Business logic handlers for each API domain
  middleware/           -- Auth extractor, rate limiter
  models/              -- Database models (User, Generation)
  routes/              -- Route definitions and sub-routers
  schemas/             -- Shared response/param types
  services/            -- Agnes API clients (image, video, LLM)
  types/               -- Request/response DTOs
```

## Build Instructions

### Prerequisites

- Rust 1.75+ (install via [rustup](https://rustup.rs/))
- SQLite 3.x (bundled via sqlx, no separate install needed)

### Debug Build

```bash
cd rust-backend
cargo build
```

### Release Build

```bash
cd rust-backend
cargo build --release
```

The binary is output to `target/release/baimo-studio-backend`.

### Run

```bash
cd rust-backend
cp .env.example .env
# Edit .env and set AGNES_API_KEY
cargo run --release
```

The server starts on `http://0.0.0.0:5180` by default.

### Check Compilation

```bash
cd rust-backend
cargo check
```

### Run Tests

```bash
cd rust-backend
cargo test
```

## Environment Variables

All configuration is loaded from `.env` file (or OS environment variables).

| Variable | Required | Default | Description |
|---|---|---|---|
| `AGNES_API_KEY` | **Yes** | - | Agnes AI API key |
| `AGNES_API_BASE` | No | `https://apihub.agnes-ai.com` | Agnes API base URL |
| `DATABASE_URL` | No | `sqlite:./data/agnes.db` | SQLite database path |
| `SERVER_PORT` | No | `5180` | HTTP server port |
| `CORS_ORIGINS` | No | `http://localhost:5180,http://localhost:5188` | Comma-separated allowed origins |
| `JWT_SECRET` | No | (auto-generated) | JWT signing secret |
| `JWT_ALGORITHM` | No | `HS256` | JWT algorithm |
| `JWT_EXPIRE_DAYS` | No | `30` | Token expiry in days |
| `MAX_UPLOAD_BYTES` | No | `20971520` (20MB) | Max upload file size |
| `MAX_DOWNLOAD_BYTES` | No | `104857600` (100MB) | Max download proxy size |
| `RATE_LIMIT_PER_MINUTE` | No | `60` | Requests per minute per IP |
| `RUST_LOG` | No | `info` | Log level (trace/debug/info/warn/error) |

## Docker

### Build and Run

```bash
# Build the Rust backend image
docker build -t baimo-studio-rust -f rust-backend/Dockerfile rust-backend/

# Run with environment file
docker run -p 5180:5180 --env-file rust-backend/.env baimo-studio-rust
```

### Docker Compose (with frontend)

```bash
# Run backend + optional frontend dev server
docker compose -f docker-compose.rust.yml up --build

# Run only the backend (frontend served as static files)
docker compose -f docker-compose.rust.yml up --build backend
```

## API Routes

All routes match the Python backend exactly for frontend compatibility.

### Auth
- `POST /api/auth/register` -- Register new user
- `POST /api/auth/login` -- Login, returns JWT
- `GET  /api/auth/me` -- Current user profile (auth required)

### Image
- `POST /api/image/generate` -- Text-to-image
- `POST /api/image/batch-generate` -- Multiple images from one prompt
- `POST /api/image/edit` -- Image-to-image editing
- `POST /api/image/compose` -- Multi-image composition
- `GET  /api/image/download` -- SSRF-safe image download proxy

### Video
- `POST /api/video/generate` -- Create video generation task
- `GET  /api/video/status/{video_id}` -- Poll video status
- `GET  /api/video/download` -- SSRF-safe video download proxy

### Prompt
- `POST /api/prompt/optimize` -- Synchronous prompt optimization
- `POST /api/prompt/optimize-stream` -- SSE streaming prompt optimization
- `POST /api/prompt/analyze-image` -- Multimodal image analysis

### Generations (CRUD)
- `GET    /api/generations` -- List all (paginated)
- `GET    /api/generations/favorites` -- List favorites
- `GET    /api/generations/{id}` -- Get single
- `PUT    /api/generations/{id}/favorite` -- Toggle favorite
- `DELETE /api/generations/{id}` -- Delete

### Stats
- `GET /api/stats` -- Aggregate generation statistics

### Settings
- `GET /api/settings/api-key` -- Get masked API key
- `PUT /api/settings/api-key` -- Update API key

### Workflow
- `POST /api/workflow/analyze-and-generate` -- Legacy 3-step pipeline
- `POST /api/workflow/execute` -- Multi-step pipeline

### Upload & Download
- `POST /api/upload/image` -- Multipart file upload
- `GET  /api/download/proxy` -- Unified SSRF-safe download proxy

### WebSocket
- `WS  /ws/video/{video_id}` -- Real-time video status push

### Other
- `GET /api/health` -- Health check
- `GET /api/models` -- Available models catalog

## Migration from Python Backend

### What Changed
- **Framework**: FastAPI -> Axum
- **Database**: Python SQLAlchemy -> Rust SQLx (same SQLite file)
- **Auth**: python-jose -> jsonwebtoken-rs; passlib -> bcrypt-rs
- **HTTP Client**: httpx -> reqwest

### What Stayed the Same
- All API routes, request/response formats, and field names are identical
- SQLite database schema is identical (auto-created on first startup)
- `.env` configuration variables are the same
- CORS, rate limiting, SSRF protection behavior matches

### Migration Steps
1. Stop the Python backend
2. Copy the existing `data/agnes.db` SQLite file to `rust-backend/data/`
3. Copy the `.env` file (or create from `.env.example`)
4. Build and start the Rust backend: `cargo run --release`
5. The Rust backend auto-creates any missing tables on startup

### Rollback
The SQLite database is fully compatible. To roll back:
1. Stop the Rust backend
2. Start the Python backend (it reads the same `.env` and `data/agnes.db`)

## License

Internal project -- not open source.
