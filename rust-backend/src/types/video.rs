use serde::{Deserialize, Serialize};

/// A value that can be either a single item or a vector.
#[derive(Deserialize, Serialize, Debug, Clone)]
#[serde(untagged)]
pub enum OneOrMany<T> {
    One(T),
    Many(Vec<T>),
}

impl<T> OneOrMany<T> {
    /// Convert to a Vec.
    pub fn into_vec(self) -> Vec<T> {
        match self {
            OneOrMany::One(v) => vec![v],
            OneOrMany::Many(v) => v,
        }
    }
}

/// POST /api/video/create request body.
#[derive(Deserialize)]
pub struct VideoCreateRequest {
    pub prompt: String,
    pub image_url: Option<OneOrMany<String>>,
    pub mode: Option<String>,
    pub height: Option<u16>,
    pub width: Option<u16>,
    pub num_frames: Option<u16>,
    pub frame_rate: Option<u8>,
    pub negative_prompt: Option<String>,
    pub seed: Option<u32>,
    pub num_inference_steps: Option<u8>,
}

/// POST /api/video/create response.
#[derive(Serialize)]
pub struct VideoCreateResponse {
    pub video_id: String,
    pub task_id: String,
    pub status: String,
}

/// GET /api/video/status/{video_id} response.
#[derive(Serialize)]
pub struct VideoStatusResponse {
    pub video_id: String,
    pub status: String,
    pub progress: u8,
    pub video_url: Option<String>,
    pub error: Option<String>,
}
