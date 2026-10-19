use axum::extract::State;
use axum::response::sse::{Event, KeepAlive, Sse};
use axum::Json;
use futures::stream::Stream;
use serde_json::json;
use std::convert::Infallible;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;

use crate::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::services::agnes_llm::AgnesLLMService;
use crate::types::prompt::*;

/// POST /api/prompt/optimize
///
/// Optimizes a user prompt for AI generation (synchronous).
/// Requires authentication.
pub async fn optimize(
    State(state): State<AppState>,
    _auth: AuthUser,
    Json(body): Json<PromptOptimizeRequest>,
) -> Result<Json<PromptOptimizeResponse>, AppError> {
    // Python allows empty user_input (default ""), only checks length
    if body.user_input.len() > 5000 {
        return Err(AppError::ValidationError("user_input 长度不能超过 5000 字符".to_string()));
    }

    let api_key = state.api_key.read().await;
    let service = AgnesLLMService::new(&state.http, &state.config.agnes_api_base, &api_key);

    let optimized = service
        .optimize_prompt(&body.user_input, &body.prompt_type)
        .await?;

    Ok(Json(PromptOptimizeResponse {
        optimized,
        original: body.user_input,
    }))
}

/// POST /api/prompt/optimize-stream
///
/// Returns an SSE stream with chunks of the optimized prompt.
/// Requires authentication.
pub async fn optimize_stream(
    State(state): State<AppState>,
    _auth: AuthUser,
    Json(body): Json<PromptOptimizeRequest>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let (tx, rx) = mpsc::channel::<Result<Event, Infallible>>(32);

    tokio::spawn(async move {
        let api_key = state.api_key.read().await;
        let service = AgnesLLMService::new(&state.http, &state.config.agnes_api_base, &api_key);

        let mut chunk_rx = service.optimize_prompt_stream(&body.user_input, &body.prompt_type);

        drop(api_key); // Release the lock before streaming

        while let Some(chunk) = chunk_rx.recv().await {
            match chunk {
                Ok(text) => {
                    let data = json!({"chunk": text}).to_string();
                    let event = Event::default().data(data);
                    if tx.send(Ok(event)).await.is_err() {
                        break;
                    }
                }
                Err(_) => {
                    let event = Event::default().data("[ERROR]");
                    let _ = tx.send(Ok(event)).await;
                    break;
                }
            }
        }

        // Send completion signal
        let _ = tx.send(Ok(Event::default().data("[DONE]"))).await;
    });

    Sse::new(ReceiverStream::new(rx)).keep_alive(KeepAlive::default())
}

/// POST /api/prompt/analyze-image
///
/// Analyzes an image using multimodal LLM.
/// Requires authentication.
pub async fn analyze_image(
    State(state): State<AppState>,
    _auth: AuthUser,
    Json(body): Json<AnalyzeImageRequest>,
) -> Result<Json<AnalyzeImageResponse>, AppError> {
    if body.image_url.is_empty() {
        return Err(AppError::ValidationError("image_url cannot be empty".to_string()));
    }

    let instruction = body
        .instruction
        .as_deref()
        .unwrap_or("Describe the content of this image in detail");

    let api_key = state.api_key.read().await;
    let service = AgnesLLMService::new(&state.http, &state.config.agnes_api_base, &api_key);

    let analysis = service.analyze_image(&body.image_url, instruction).await?;

    Ok(Json(AnalyzeImageResponse { analysis }))
}
