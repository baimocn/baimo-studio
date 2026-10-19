use tracing::debug;

use crate::error::AppError;
use crate::services::agnes_base::{
    self, IMAGE_ENDPOINT, IMAGE_TIMEOUT,
};

// ---------------------------------------------------------------------------
// Agnes Image Service
// ---------------------------------------------------------------------------

/// Agnes Image API service client.
///
/// Implements the three core image generation workflows:
/// - **Text-to-Image** (`generate`): generate from a text prompt only.
/// - **Image-to-Image** (`edit`): edit/transform an existing image.
/// - **Multi-Image Compose** (`compose`): combine multiple images into one.
///
/// All methods target `POST /v1/images/generations` with model-specific
/// payload construction. The `image` parameter is placed inside `extra_body`
/// for both 2.0-flash and 2.1-flash models per the official Agnes API spec.
pub struct AgnesImageService<'a> {
    pub client: &'a reqwest::Client,
    pub base_url: &'a str,
    pub api_key: &'a str,
}

impl<'a> AgnesImageService<'a> {
    pub fn new(client: &'a reqwest::Client, base_url: &'a str, api_key: &'a str) -> Self {
        Self {
            client,
            base_url,
            api_key,
        }
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /// Generate an image from a text prompt (text-to-image).
    ///
    /// Sends a minimal payload: `model`, `prompt`, `size`, and `extra_body`
    /// with `response_format: "url"`. No `image` parameter is included.
    ///
    /// # Arguments
    /// * `prompt` - Text description of the desired image.
    /// * `size` - Output dimensions (e.g., "1024x768", "1024x1024").
    /// * `model` - Model name (`agnes-image-2.0-flash` or `agnes-image-2.1-flash`).
    /// * `negative_prompt` - Optional negative prompt (currently ignored by API).
    ///
    /// # Returns
    /// The URL of the generated image.
    pub async fn generate(
        &self,
        prompt: &str,
        size: &str,
        model: &str,
        negative_prompt: Option<&str>,
    ) -> Result<String, AppError> {
        debug!(
            "Agnes Image generate: model={}, size={}, prompt_len={}",
            model,
            size,
            prompt.len()
        );

        let mut payload = serde_json::json!({
            "model": model,
            "prompt": prompt,
            "size": size,
        });

        // Per API docs: response_format MUST be inside extra_body (not top-level)
        payload["extra_body"] = agnes_base::build_extra_body(None, "url");

        // Include negative_prompt if provided (for future model support)
        if let Some(neg) = negative_prompt {
            let trimmed = neg.trim();
            if !trimmed.is_empty() {
                payload["negative_prompt"] = serde_json::json!(trimmed);
            }
        }

        let body = self.send_request(&payload).await?;
        agnes_base::extract_url_from_body(&body)
    }

    /// Edit/transform an existing image with a text prompt (image-to-image).
    ///
    /// Places the input `image` inside `extra_body` per the Agnes API spec.
    /// Works identically for both `agnes-image-2.0-flash` and `agnes-image-2.1-flash`.
    ///
    /// # Arguments
    /// * `image_url` - URL of the input image (must be publicly accessible).
    /// * `prompt` - Editing instructions / target description.
    /// * `size` - Output dimensions.
    /// * `model` - Model name.
    /// * `negative_prompt` - Optional negative prompt.
    ///
    /// # Returns
    /// The URL of the edited/generated image.
    pub async fn edit(
        &self,
        image_url: &str,
        prompt: &str,
        size: &str,
        model: &str,
        negative_prompt: Option<&str>,
    ) -> Result<String, AppError> {
        debug!(
            "Agnes Image edit: model={}, size={}, image_url={}",
            model, size, image_url
        );

        let mut payload = serde_json::json!({
            "model": model,
            "prompt": prompt,
            "size": size,
        });

        // Per API docs: image goes inside extra_body for both 2.0 and 2.1
        payload["extra_body"] = agnes_base::build_extra_body(
            Some(&[image_url.to_string()]),
            "url",
        );

        if let Some(neg) = negative_prompt {
            let trimmed = neg.trim();
            if !trimmed.is_empty() {
                payload["negative_prompt"] = serde_json::json!(trimmed);
            }
        }

        let body = self.send_request(&payload).await?;
        agnes_base::extract_url_from_body(&body)
    }

    /// Compose multiple images into a single image with a text prompt.
    ///
    /// Sends multiple image URLs in `extra_body.image` array.
    /// Uses `agnes-image-2.1-flash` as the default model for composition.
    ///
    /// # Arguments
    /// * `image_urls` - Slice of image URLs (2–10 images recommended).
    /// * `prompt` - Composition instructions.
    /// * `size` - Output dimensions.
    ///
    /// # Returns
    /// The URL of the composed image.
    pub async fn compose(
        &self,
        image_urls: &[String],
        prompt: &str,
        size: &str,
    ) -> Result<String, AppError> {
        debug!(
            "Agnes Image compose: num_images={}, size={}",
            image_urls.len(),
            size
        );

        let mut payload = serde_json::json!({
            "model": "agnes-image-2.1-flash",
            "prompt": prompt,
            "size": size,
        });

        // Multi-image: all images go in extra_body.image
        payload["extra_body"] = agnes_base::build_extra_body(
            Some(image_urls),
            "url",
        );

        let body = self.send_request(&payload).await?;
        agnes_base::extract_url_from_body(&body)
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    /// Send a JSON POST request to the Agnes Image generations endpoint.
    ///
    /// Handles:
    /// - Header construction (Authorization, Content-Type)
    /// - Timeout enforcement (180s default for image generation)
    /// - HTTP error status checking
    /// - Response body reading
    async fn send_request(&self, payload: &serde_json::Value) -> Result<String, AppError> {
        let url = format!("{}{}", self.base_url, IMAGE_ENDPOINT);

        debug!("Agnes Image request: POST {}", url);

        let resp = self
            .client
            .post(&url)
            .headers(agnes_base::build_headers(self.api_key))
            .timeout(IMAGE_TIMEOUT)
            .json(payload)
            .send()
            .await?;

        let status = resp.status();
        let body = resp.text().await?;

        agnes_base::check_status(status, &body)?;

        debug!(
            "Agnes Image response: HTTP {}, body_len={}",
            status,
            body.len()
        );

        Ok(body)
    }
}
