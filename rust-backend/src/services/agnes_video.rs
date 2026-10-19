use std::time::Duration;

use serde_json::{json, Value};
use tracing::{debug, error};

use crate::error::AppError;
use crate::types::video::VideoCreateRequest;

/// Default timeout for video creation requests (5 minutes).
const CREATE_TIMEOUT: Duration = Duration::from_secs(300);
/// Timeout for status polling requests (30 seconds, matching Python impl).
const POLL_TIMEOUT: Duration = Duration::from_secs(30);

/// Agnes Video API service client.
///
/// Implements the async task-based Agnes Video V2.0 API:
/// 1. `create()` submits a video generation task and returns a `video_id`.
/// 2. `poll_status()` queries the task status until completed or failed.
pub struct AgnesVideoService<'a> {
    pub client: &'a reqwest::Client,
    pub base_url: &'a str,
    pub api_key: &'a str,
}

impl<'a> AgnesVideoService<'a> {
    pub fn new(client: &'a reqwest::Client, base_url: &'a str, api_key: &'a str) -> Self {
        Self {
            client,
            base_url,
            api_key,
        }
    }

    /// Create a new video generation task.
    ///
    /// Supports four modes:
    /// - **text-to-video**: no image, just prompt.
    /// - **image-to-video**: single image URL at top-level `image` field.
    /// - **keyframe animation**: multiple images in `extra_body.image` with `mode: "keyframes"`.
    /// - **multi-image video**: multiple images in `extra_body.image` (no mode).
    pub async fn create(
        &self,
        params: &VideoCreateRequest,
    ) -> Result<Value, AppError> {
        let payload = self.build_payload(params)?;

        debug!(
            "Agnes Video create: mode={:?}, image_url={:?}",
            params.mode, params.image_url
        );

        let url = format!("{}/v1/videos", self.base_url);

        let resp = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .timeout(CREATE_TIMEOUT)
            .json(&payload)
            .send()
            .await?;

        let status = resp.status();
        let text = resp.text().await?;

        if !status.is_success() {
            error!("Agnes Video create failed: HTTP {} - {}", status, &text[..text.len().min(500)]);
            return Err(AppError::ExternalApiError(format!(
                "Agnes Video API 返回错误状态码 {}: {}",
                status,
                &text[..text.len().min(500)]
            )));
        }

        let data: Value = serde_json::from_str(&text).map_err(|e| {
            error!("Agnes Video create response parse error: {}, body: {}", e, &text[..text.len().min(500)]);
            AppError::ExternalApiError("Agnes API 返回了无法解析的响应".to_string())
        })?;

        // Extract video_id and task_id, matching Python: data.get("video_id", ""), data.get("task_id", data.get("id", ""))
        let video_id = data["video_id"]
            .as_str()
            .unwrap_or("")
            .to_string();
        let task_id = data["task_id"]
            .as_str()
            .or_else(|| data["id"].as_str())
            .unwrap_or("")
            .to_string();

        debug!("Agnes Video create success: video_id={}, task_id={}", video_id, task_id);

        Ok(json!({
            "video_id": video_id,
            "task_id": task_id,
            "status": data["status"].as_str().unwrap_or("queued"),
        }))
    }

    /// Poll the status of a video generation task.
    ///
    /// Uses the recommended GET `/agnesapi?video_id=<ID>` endpoint.
    /// On completion, the video URL is in the `remixed_from_video_id` field (per official docs).
    pub async fn poll_status(&self, video_id: &str) -> Result<Value, AppError> {
        let poll_url = format!("{}/agnesapi", self.base_url);

        debug!("Agnes Video poll_status: video_id={}", video_id);

        let resp = self
            .client
            .get(&poll_url)
            .query(&[("video_id", video_id)])
            .header("Authorization", format!("Bearer {}", self.api_key))
            .timeout(POLL_TIMEOUT)
            .send()
            .await?;

        let status_code = resp.status();
        let text = resp.text().await?;

        if !status_code.is_success() {
            error!(
                "Agnes Video poll failed: HTTP {} - {}",
                status_code,
                &text[..text.len().min(500)]
            );
            return Err(AppError::ExternalApiError(format!(
                "Agnes Video API 返回错误状态码 {}: {}",
                status_code,
                &text[..text.len().min(500)]
            )));
        }

        let data: Value = serde_json::from_str(&text).map_err(|e| {
            error!("Agnes Video poll response parse error: {}", e);
            AppError::ExternalApiError("Agnes API 返回了无法解析的响应".to_string())
        })?;

        let status_val = data["status"].as_str().unwrap_or("unknown");
        let progress = data["progress"].as_u64().unwrap_or(0);

        let mut result = json!({
            "video_id": data["video_id"].as_str().unwrap_or(video_id),
            "status": status_val,
            "progress": progress,
            "video_url": null,
            "error": null,
        });

        if status_val == "completed" {
            // Official docs: video URL is in `remixed_from_video_id` field
            let video_url = data["remixed_from_video_id"]
                .as_str()
                .or_else(|| data["video_url"].as_str())
                .or_else(|| data["url"].as_str());
            result["video_url"] = match video_url {
                Some(u) => Value::String(u.to_string()),
                None => Value::Null,
            };
        } else if status_val == "failed" {
            let error_msg = data["error"]
                .as_str()
                .or_else(|| data["message"].as_str())
                .unwrap_or("视频生成失败");
            result["error"] = Value::String(error_msg.to_string());
        }

        debug!(
            "Agnes Video poll result: status={}, progress={}, has_url={}",
            status_val,
            progress,
            result["video_url"].is_string()
        );

        Ok(result)
    }

    /// Build the JSON payload for the Agnes Video create API.
    ///
    /// Handles the four video modes with correct parameter placement:
    /// - text2video: no image, prompt only.
    /// - image2video: single image at top-level `image`.
    /// - keyframes: images in `extra_body.image` + `extra_body.mode = "keyframes"`.
    /// - multi-image: images in `extra_body.image`, no mode.
    fn build_payload(&self, params: &VideoCreateRequest) -> Result<Value, AppError> {
        let mut payload = json!({
            "model": "agnes-video-v2.0",
            "prompt": params.prompt,
            "height": params.height.unwrap_or(768),
            "width": params.width.unwrap_or(1152),
            "num_frames": params.num_frames.unwrap_or(121),
            "frame_rate": params.frame_rate.unwrap_or(24),
        });

        // Optional top-level parameters
        if let Some(ref neg) = params.negative_prompt {
            let trimmed = neg.trim();
            if !trimmed.is_empty() {
                payload["negative_prompt"] = json!(trimmed);
            }
        }
        if let Some(seed) = params.seed {
            payload["seed"] = json!(seed);
        }
        if let Some(steps) = params.num_inference_steps {
            payload["num_inference_steps"] = json!(steps);
        }

        // Determine image mode from the frontend mode string
        let is_keyframes = params.mode.as_deref() == Some("keyframes");
        let has_images = params.image_url.is_some();

        if is_keyframes && has_images {
            // Keyframe animation: multiple images in extra_body with mode "keyframes"
            let images = self.extract_image_urls(params);
            payload["extra_body"] = json!({
                "image": images,
                "mode": "keyframes"
            });
        } else if has_images {
            let images = self.extract_image_urls(params);
            if images.len() > 1 {
                // Multi-image video: images in extra_body
                payload["extra_body"] = json!({
                    "image": images
                });
            } else if let Some(single) = images.first() {
                // Single image-to-video: image at top level
                payload["image"] = json!(single);
            }
        }

        Ok(payload)
    }

    /// Extract image URLs from the request params as a Vec<String>.
    fn extract_image_urls(&self, params: &VideoCreateRequest) -> Vec<String> {
        match &params.image_url {
            Some(urls) => urls.clone().into_vec(),
            None => Vec::new(),
        }
    }
}
