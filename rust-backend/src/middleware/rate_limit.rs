use axum::http::{Request, StatusCode};
use axum::response::{IntoResponse, Response};
use serde_json::json;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Instant;
use std::task::Poll;
use tower::Layer;

/// Per-IP rate limiter state.
/// Each IP maps to (request_count_in_current_window, window_start_time).
struct RateLimitEntry {
    count: u32,
    window_start: Instant,
}

/// Shared state for the rate limiter, keyed by client IP address.
struct RateLimitState {
    entries: Mutex<HashMap<String, RateLimitEntry>>,
    max_requests: u32,
    window_duration: std::time::Duration,
}

/// Create a rate limiting layer.
/// Returns a Tower layer that limits requests per minute per client IP.
pub fn rate_limit_layer(requests_per_minute: u64) -> RateLimitLayer {
    let state = std::sync::Arc::new(RateLimitState {
        entries: Mutex::new(HashMap::new()),
        max_requests: requests_per_minute.max(1) as u32,
        window_duration: std::time::Duration::from_secs(60),
    });

    RateLimitLayer { state }
}

/// Rate limiting middleware layer.
#[derive(Clone)]
pub struct RateLimitLayer {
    state: std::sync::Arc<RateLimitState>,
}

impl<S> Layer<S> for RateLimitLayer {
    type Service = RateLimitService<S>;

    fn layer(&self, inner: S) -> Self::Service {
        RateLimitService {
            inner,
            state: self.state.clone(),
        }
    }
}

/// Rate limiting middleware service.
#[derive(Clone)]
pub struct RateLimitService<S> {
    inner: S,
    state: std::sync::Arc<RateLimitState>,
}

impl<S, ReqBody> tower::Service<Request<ReqBody>> for RateLimitService<S>
where
    S: tower::Service<Request<ReqBody>, Response = Response> + Clone + Send + 'static,
    S::Future: Send + 'static,
    ReqBody: Send + 'static,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = std::pin::Pin<
        Box<dyn std::future::Future<Output = Result<Self::Response, Self::Error>> + Send>,
    >;

    fn poll_ready(&mut self, cx: &mut std::task::Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, req: Request<ReqBody>) -> Self::Future {
        // Extract client IP from the request.
        // Prefer X-Forwarded-For (first entry) for reverse-proxy setups,
        // fall back to the socket peer address via X-Real-IP or connect-info.
        let client_ip = extract_client_ip(&req);

        // Check rate limit
        let allowed = {
            let mut entries = match self.state.entries.lock() {
                Ok(guard) => guard,
                Err(poisoned) => poisoned.into_inner(),
            };
            let now = Instant::now();

            let entry = entries
                .entry(client_ip.clone())
                .or_insert(RateLimitEntry {
                    count: 0,
                    window_start: now,
                });

            // Reset window if expired
            if now.duration_since(entry.window_start) >= self.state.window_duration {
                entry.count = 0;
                entry.window_start = now;
            }

            if entry.count >= self.state.max_requests {
                false
            } else {
                entry.count += 1;
                true
            }
        };

        if !allowed {
            tracing::warn!("Rate limit exceeded for IP: {}", client_ip);
            let response = (
                StatusCode::TOO_MANY_REQUESTS,
                axum::Json(json!({"detail": "请求过于频繁，请稍后再试"})),
            )
                .into_response();

            return Box::pin(async { Ok(response) });
        }

        let fut = self.inner.call(req);
        Box::pin(async move { fut.await })
    }
}

/// Extract client IP address from request headers.
/// Checks X-Forwarded-For and X-Real-IP headers, falls back to "unknown".
fn extract_client_ip<B>(req: &Request<B>) -> String {
    // Try X-Forwarded-For (take the first/earliest client IP)
    if let Some(forwarded) = req.headers().get("x-forwarded-for") {
        if let Ok(val) = forwarded.to_str() {
            if let Some(first_ip) = val.split(',').next() {
                let ip = first_ip.trim();
                if !ip.is_empty() {
                    return ip.to_string();
                }
            }
        }
    }

    // Try X-Real-IP
    if let Some(real_ip) = req.headers().get("x-real-ip") {
        if let Ok(val) = real_ip.to_str() {
            let ip = val.trim();
            if !ip.is_empty() {
                return ip.to_string();
            }
        }
    }

    "unknown".to_string()
}
