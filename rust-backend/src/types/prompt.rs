use serde::{Deserialize, Serialize};

/// POST /api/prompt/optimize request body.
#[derive(Deserialize)]
pub struct PromptOptimizeRequest {
    pub user_input: String,
    #[serde(rename = "type")]
    pub prompt_type: String, // "image" | "video" | "edit"
}

/// Prompt optimization response.
#[derive(Serialize)]
pub struct PromptOptimizeResponse {
    pub optimized: String,
    pub original: String,
}

/// POST /api/prompt/analyze-image request body.
#[derive(Deserialize)]
pub struct AnalyzeImageRequest {
    pub image_url: String,
    pub instruction: Option<String>,
}

/// Image analysis response.
#[derive(Serialize)]
pub struct AnalyzeImageResponse {
    pub analysis: String,
}
