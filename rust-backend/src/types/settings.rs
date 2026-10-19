use serde::{Deserialize, Serialize};

/// PUT /api/settings/api-key request body.
#[derive(Deserialize)]
pub struct ApiKeyRequest {
    pub api_key: String,
}

/// GET /api/settings/api-key response.
#[derive(Serialize)]
pub struct ApiKeyResponse {
    pub api_key_masked: String,
}
