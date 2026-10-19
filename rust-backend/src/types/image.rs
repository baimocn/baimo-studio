use serde::{Deserialize, Serialize};

/// POST /api/image/generate request body.
#[derive(Deserialize)]
pub struct ImageGenerateRequest {
    pub prompt: String,
    #[serde(default = "default_size")]
    pub size: String,
    #[serde(default = "default_image_model")]
    pub model: String,
    pub negative_prompt: Option<String>,
}

fn default_size() -> String {
    "1024x768".to_string()
}

fn default_image_model() -> String {
    "agnes-image-2.1-flash".to_string()
}

/// POST /api/image/batch-generate request body.
#[derive(Deserialize)]
pub struct BatchGenerateRequest {
    pub prompt: String,
    #[serde(default = "default_size")]
    pub size: String,
    #[serde(default = "default_image_model")]
    pub model: String,
    pub num_images: Option<u8>,
    pub seed: Option<u32>,
}

/// POST /api/image/edit request body.
#[derive(Deserialize)]
pub struct ImageEditRequest {
    pub prompt: String,
    #[serde(default = "default_size")]
    pub size: String,
    #[serde(default = "default_image_model")]
    pub model: String,
    pub image_url: String,
    pub negative_prompt: Option<String>,
}

/// POST /api/image/compose request body.
#[derive(Deserialize)]
pub struct ImageComposeRequest {
    pub prompt: String,
    #[serde(default = "default_size")]
    pub size: String,
    pub image_urls: Vec<String>,
}

/// GET /api/image/download query params.
#[derive(Deserialize)]
pub struct DownloadParams {
    pub url: String,
}

/// Single image generation response.
#[derive(Serialize)]
pub struct ImageResponse {
    pub url: String,
    pub model: String,
}

/// Single result in a batch generation.
#[derive(Serialize)]
pub struct BatchImageResult {
    pub url: String,
    pub model: String,
    pub seed: u32,
}

/// Batch image generation response.
#[derive(Serialize)]
pub struct BatchImageResponse {
    pub results: Vec<BatchImageResult>,
    pub total: usize,
}
