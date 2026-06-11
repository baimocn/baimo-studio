# ── Stage 1: Build frontend ───────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --silent
COPY frontend/ ./
ENV NEXT_PUBLIC_API_BASE=
RUN npm run build

# ── Stage 2: Runtime ─────────────────────────
FROM python:3.12-slim
WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/app ./app
COPY backend/run.py ./
COPY backend/desktop.py ./
COPY backend/.env.example ./

# Copy frontend build output
COPY --from=frontend-build /build/out ./static

# Create data directory
RUN mkdir -p data

# Expose port
EXPOSE 5180

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:5180/api/health || exit 1

# Run
CMD ["python", "run.py"]
