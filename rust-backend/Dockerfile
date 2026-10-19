# ==============================================================================
# baimo Studio - Rust Backend Dockerfile (multi-stage)
# ==============================================================================

# ── Stage 1: Builder ───────────────────────────────────────────────────────
FROM rust:1.82-bookworm AS builder

WORKDIR /build

# Install build dependencies for SQLite (sqlx)
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Cache dependency builds: copy only Cargo.toml + Cargo.lock first,
# create a dummy src/main.rs, then build dependencies.
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release 2>/dev/null || true

# Now copy the real source code and rebuild (only changed files trigger recompile)
COPY src/ src/
RUN touch src/main.rs && cargo build --release

# ── Stage 2: Runtime ──────────────────────────────────────────────────────
FROM debian:bookworm-slim AS runtime

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the compiled binary from builder
COPY --from=builder /build/target/release/baimo-studio-backend /app/baimo-studio-backend

# Create data directories
RUN mkdir -p /app/data /app/uploads /app/static /app/frontend

# Expose the server port
EXPOSE 5180

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5180/api/health || exit 1

# Run
CMD ["/app/baimo-studio-backend"]
