use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// POST /api/workflow/analyze-and-generate (legacy)
// ---------------------------------------------------------------------------

/// POST /api/workflow/analyze-and-generate request body.
#[derive(Deserialize)]
pub struct AnalyzeAndGenerateRequest {
    pub image_url: String,
    pub style_modifiers: Option<String>,
    #[serde(default = "default_size")]
    pub size: String,
    #[serde(default = "default_model")]
    pub model: String,
}

fn default_size() -> String {
    "1024x768".to_string()
}

fn default_model() -> String {
    "agnes-image-2.1-flash".to_string()
}

/// POST /api/workflow/analyze-and-generate response.
#[derive(Serialize)]
pub struct AnalyzeAndGenerateResponse {
    pub original_analysis: String,
    pub optimized_prompt: String,
    pub generated_url: String,
}

// ---------------------------------------------------------------------------
// POST /api/workflow/execute  (multi-step: analyze -> optimize -> generate)
// ---------------------------------------------------------------------------

/// POST /api/workflow/execute request body.
///
/// Chains three steps:
/// 1. **Analyze** – LLM inspects the image and produces a structured description.
/// 2. **Optimize** – LLM turns the description + style modifiers into a polished prompt.
/// 3. **Generate** – Agnes Image API produces the final image.
#[derive(Deserialize)]
pub struct WorkflowExecuteRequest {
    /// Source image URL to analyze.
    pub image_url: String,
    /// Optional style modifiers appended to the prompt (e.g. "anime, vibrant colors").
    pub style_modifiers: Option<String>,
    /// Output size, defaults to "1024x768".
    #[serde(default = "default_size")]
    pub size: String,
    /// Image generation model, defaults to "agnes-image-2.1-flash".
    #[serde(default = "default_model")]
    pub model: String,
}

/// POST /api/workflow/execute response.
///
/// Contains every intermediate artifact so the frontend can display the pipeline.
#[derive(Serialize)]
pub struct WorkflowExecuteResponse {
    /// Structured analysis returned by the LLM.
    pub analysis: String,
    /// Optimized prompt after the second LLM pass.
    pub optimized_prompt: String,
    /// URL of the generated image.
    pub generated_url: String,
    /// Model used for generation.
    pub model: String,
}
