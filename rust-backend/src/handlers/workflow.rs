use axum::extract::State;
use axum::Json;

use crate::AppState;
use crate::error::AppError;
use crate::middleware::auth::AuthUser;
use crate::services::agnes_image::AgnesImageService;
use crate::services::agnes_llm::AgnesLLMService;
use crate::services::workflow::WorkflowService;
use crate::types::workflow::*;

// ---------------------------------------------------------------------------
// POST /api/workflow/analyze-and-generate  (legacy)
// ---------------------------------------------------------------------------

/// POST /api/workflow/analyze-and-generate
///
/// Legacy 3-step pipeline: analyze image -> optimize prompt -> generate new image.
/// Saves the generation record to the database (matching Python behavior).
/// Requires authentication.
pub async fn analyze_and_generate(
    State(state): State<AppState>,
    _auth: AuthUser,
    Json(body): Json<AnalyzeAndGenerateRequest>,
) -> Result<Json<AnalyzeAndGenerateResponse>, AppError> {
    validate_image_url(&body.image_url)?;

    let api_key = state.api_key.read().await;
    let llm = AgnesLLMService::new(&state.http, &state.config.agnes_api_base, &api_key);
    let image = AgnesImageService::new(&state.http, &state.config.agnes_api_base, &api_key);
    let svc = WorkflowService::new(llm, image);

    let (analysis, optimized_prompt, generated_url) = svc
        .execute_and_save(
            &state.db,
            &body.image_url,
            body.style_modifiers.as_deref(),
            &body.size,
            &body.model,
        )
        .await?;

    Ok(Json(AnalyzeAndGenerateResponse {
        original_analysis: analysis,
        optimized_prompt,
        generated_url,
    }))
}

// ---------------------------------------------------------------------------
// POST /api/workflow/execute
// ---------------------------------------------------------------------------

/// POST /api/workflow/execute
///
/// Multi-step pipeline: analyze -> optimize -> generate.
///
/// Identical logic to `analyze_and_generate` but with a request/response shape
/// that matches the frontend workflow contract (field names: `analysis`,
/// `optimized_prompt`, `generated_url`, `model`).
/// Requires authentication.
pub async fn execute(
    State(state): State<AppState>,
    _auth: AuthUser,
    Json(body): Json<WorkflowExecuteRequest>,
) -> Result<Json<WorkflowExecuteResponse>, AppError> {
    validate_image_url(&body.image_url)?;

    let api_key = state.api_key.read().await;
    let llm = AgnesLLMService::new(&state.http, &state.config.agnes_api_base, &api_key);
    let image = AgnesImageService::new(&state.http, &state.config.agnes_api_base, &api_key);
    let svc = WorkflowService::new(llm, image);

    let (analysis, optimized_prompt, generated_url) = svc
        .execute_and_save(
            &state.db,
            &body.image_url,
            body.style_modifiers.as_deref(),
            &body.size,
            &body.model,
        )
        .await?;

    Ok(Json(WorkflowExecuteResponse {
        analysis,
        optimized_prompt,
        generated_url,
        model: body.model,
    }))
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

fn validate_image_url(url: &str) -> Result<(), AppError> {
    if url.is_empty() {
        return Err(AppError::ValidationError("image_url 不能为空".to_string()));
    }
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err(AppError::ValidationError(
            "image_url 必须是 http/https URL".to_string(),
        ));
    }
    Ok(())
}
