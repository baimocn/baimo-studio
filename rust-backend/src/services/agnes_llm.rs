use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use serde_json::{json, Value};
use tokio::sync::mpsc;

use crate::error::AppError;

// ---------------------------------------------------------------------------
// System prompts (match Python version exactly)
// ---------------------------------------------------------------------------

const MODEL: &str = "agnes-2.0-flash";

const SYSTEM_PROMPT: &str = "\
You are a world-class prompt engineer for AI image and video generation.\n\
Your job is to transform a user's rough idea (often in Chinese) into a vivid, \
detailed English prompt that will produce stunning results.\n\n\
Rules:\n\
1. Understand the user's INTENT and CREATIVE VISION, not just translate words literally.\n\
2. Add sensory details: textures, materials, atmosphere, mood, time of day.\n\
3. Use professional photography/cinema terminology when appropriate (e.g., \"bokeh\", \"golden hour\", \"Dutch angle\", \"rack focus\").\n\
4. Preserve the user's core concept, but enhance it with artistic details they didn't explicitly mention.\n\
5. If the input is vague, make creative choices that align with the mood. Don't ask for clarification — commit to a vision.\n\
6. Keep the prompt concise but rich — typically 1-3 sentences, 30-80 words.\n\
7. Output ONLY the optimized prompt. No explanations, no labels, no prefix like \"Prompt:\".\n\
8. Always write in English, regardless of the input language.\n\n\
Bad example (too mechanical):\n\
  Input: 一只猫在沙发上\n\
  Output: A cat on a sofa, high quality, detailed\n\n\
Good example (creative and vivid):\n\
  Input: 一只猫在沙发上\n\
  Output: A fluffy orange tabby cat curled up on a velvet sofa, afternoon sunlight streaming through sheer curtains casting soft warm shadows, shallow depth of field, cozy domestic scene, photorealistic\n\n\
Bad example (literal translation):\n\
  Input: 赛博朋克城市\n\
  Output: A cyberpunk city, neon lights, high quality\n\n\
Good example (enhanced vision):\n\
  Input: 赛博朋克城市\n\
  Output: A sprawling cyberpunk megacity at night, towering holographic billboards casting electric blue and magenta reflections on rain-soaked streets, dense crowd of augmented humans below, cinematic wide-angle shot, blade runner atmosphere, volumetric fog";

const IMAGE_SUFFIX: &str = "\n\nAdditional context: This prompt will be used for AI IMAGE generation. Focus on visual details, composition, and static elements. Emphasize what the viewer sees.";

const EDIT_SUFFIX: &str = "\n\nAdditional context: This prompt will be used for AI IMAGE EDITING (image-to-image). The user has uploaded an existing image and wants to modify it. Focus on: 1. What CHANGES to make (new elements, style transfer, modifications). 2. What to PRESERVE from the original image (composition, subject, key features). 3. The target STYLE or MOOD after editing. Structure: [modification request] + [new style/scene] + [elements to add/remove] + [elements to preserve]";

const VIDEO_SUFFIX: &str = "\n\nAdditional context: This prompt will be used for AI VIDEO generation. Include motion cues: what moves, how the camera moves, the pacing. Use verbs that describe action and change.";

const DEFAULT_IMAGE_INSTRUCTION: &str = "Describe the content of this image in detail.";

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/// Agnes LLM API service client (supports sync and SSE streaming).
pub struct AgnesLLMService<'a> {
    pub client: &'a reqwest::Client,
    pub base_url: &'a str,
    pub api_key: &'a str,
}

impl<'a> AgnesLLMService<'a> {
    pub fn new(client: &'a reqwest::Client, base_url: &'a str, api_key: &'a str) -> Self {
        Self {
            client,
            base_url,
            api_key,
        }
    }

    /// Build default headers for Agnes API requests.
    fn headers(&self) -> HeaderMap {
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!("Bearer {}", self.api_key))
                .unwrap_or_else(|_| HeaderValue::from_static("")),
        );
        headers
    }

    /// Return the suffix for the given prompt type ("image", "edit", "video").
    fn suffix_for_type(prompt_type: &str) -> &'static str {
        match prompt_type {
            "edit" => EDIT_SUFFIX,
            "video" => VIDEO_SUFFIX,
            _ => IMAGE_SUFFIX,
        }
    }

    // -----------------------------------------------------------------------
    // optimize_prompt (synchronous, with thinking mode)
    // -----------------------------------------------------------------------

    /// Optimize a user prompt via the Agnes LLM API.
    /// Enables `enable_thinking` so the model can reason before producing output.
    /// Only the final `content` is returned; `reasoning_content` is discarded.
    pub async fn optimize_prompt(
        &self,
        user_input: &str,
        prompt_type: &str,
    ) -> Result<String, AppError> {
        let url = format!("{}/v1/chat/completions", self.base_url);
        let suffix = Self::suffix_for_type(prompt_type);

        let payload = json!({
            "model": MODEL,
            "messages": [
                { "role": "system", "content": format!("{}{}", SYSTEM_PROMPT, suffix) },
                { "role": "user",   "content": user_input }
            ],
            "temperature": 0.45,
            "max_tokens": 768,
            "chat_template_kwargs": {
                "enable_thinking": true
            }
        });

        let resp = self
            .client
            .post(&url)
            .headers(self.headers())
            .json(&payload)
            .timeout(std::time::Duration::from_secs(60))
            .send()
            .await?;

        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            tracing::error!("Agnes LLM error: {} - {}", status, &body[..body.len().min(500)]);
            return Err(AppError::ExternalApiError(format!(
                "Agnes API 返回错误 ({})",
                status
            )));
        }

        let resp_json: Value = resp.json().await.map_err(|e| {
            AppError::InternalError(anyhow::anyhow!("Failed to parse Agnes LLM response: {}", e))
        })?;

        extract_content_from_message(&resp_json).ok_or_else(|| {
            tracing::error!("Agnes LLM response parse error: {:?}", resp_json);
            AppError::ExternalApiError("Agnes API 返回了无法解析的响应".to_string())
        })
    }

    // -----------------------------------------------------------------------
    // optimize_prompt_stream (SSE streaming)
    // -----------------------------------------------------------------------

    /// Optimize a user prompt with SSE streaming.
    /// Returns a channel receiver; the caller wraps it in a Stream for SSE.
    /// Only `content` deltas are sent; `reasoning_content` (thinking) is skipped.
    pub fn optimize_prompt_stream(
        &self,
        user_input: &str,
        prompt_type: &str,
    ) -> mpsc::Receiver<Result<String, AppError>> {
        let (tx, rx) = mpsc::channel(32);

        let url = format!("{}/v1/chat/completions", self.base_url);
        let suffix = Self::suffix_for_type(prompt_type).to_owned();
        let user_input = user_input.to_owned();
        let headers = self.headers();
        let client = self.client.clone();

        tokio::spawn(async move {
            let payload = json!({
                "model": MODEL,
                "messages": [
                    { "role": "system", "content": format!("{}{}", SYSTEM_PROMPT, suffix) },
                    { "role": "user",   "content": user_input }
                ],
                "temperature": 0.45,
                "max_tokens": 768,
                "stream": true,
                "chat_template_kwargs": {
                    "enable_thinking": true
                }
            });

            let resp = match client
                .post(&url)
                .headers(headers)
                .json(&payload)
                .timeout(std::time::Duration::from_secs(120))
                .send()
                .await
            {
                Ok(r) => r,
                Err(e) => {
                    let _ = tx
                        .send(Err(AppError::ExternalApiError(format!(
                            "Agnes LLM stream request failed: {}",
                            e
                        ))))
                        .await;
                    return;
                }
            };

            let status = resp.status();
            if !status.is_success() {
                let body = resp.text().await.unwrap_or_default();
                tracing::error!(
                    "Agnes LLM stream error: {} - {}",
                    status,
                    &body[..body.len().min(500)]
                );
                let _ = tx
                    .send(Err(AppError::ExternalApiError(format!(
                        "Agnes API 返回错误 ({})",
                        status
                    ))))
                    .await;
                return;
            }

            // Use bytes_stream() to read SSE chunks line by line
            use futures::StreamExt;
            let mut stream = resp.bytes_stream();
            let mut buffer = String::new();

            while let Some(chunk_result) = stream.next().await {
                let bytes = match chunk_result {
                    Ok(b) => b,
                    Err(e) => {
                        let _ = tx
                            .send(Err(AppError::ExternalApiError(format!(
                                "Agnes LLM stream read error: {}",
                                e
                            ))))
                            .await;
                        return;
                    }
                };

                buffer.push_str(&String::from_utf8_lossy(&bytes));

                // Process complete lines from buffer
                while let Some(newline_pos) = buffer.find('\n') {
                    let line = buffer[..newline_pos].trim().to_owned();
                    buffer = buffer[newline_pos + 1..].to_owned();

                    if line.is_empty() {
                        continue;
                    }

                    // SSE data lines start with "data: "
                    let data_str = match line.strip_prefix("data: ") {
                        Some(s) => s,
                        None => continue,
                    };

                    if data_str.trim() == "[DONE]" {
                        return; // Stream finished
                    }

                    // Parse the JSON chunk
                    let chunk: Value = match serde_json::from_str(data_str) {
                        Ok(v) => v,
                        Err(_) => continue,
                    };

                    // Extract content from delta, skipping reasoning_content
                    let content = chunk
                        .get("choices")
                        .and_then(|c| c.get(0))
                        .and_then(|c| c.get("delta"))
                        .and_then(|d| d.get("content"))
                        .and_then(|c| c.as_str())
                        .unwrap_or("");

                    if !content.is_empty() {
                        if tx.send(Ok(content.to_owned())).await.is_err() {
                            return; // Receiver dropped
                        }
                    }
                }
            }
        });

        rx
    }

    // -----------------------------------------------------------------------
    // analyze_image (multimodal)
    // -----------------------------------------------------------------------

    /// Analyze an image via the Agnes LLM API (multimodal: text + image_url).
    /// Returns the description text; reasoning_content is discarded.
    pub async fn analyze_image(
        &self,
        image_url: &str,
        instruction: &str,
    ) -> Result<String, AppError> {
        let url = format!("{}/v1/chat/completions", self.base_url);

        let payload = json!({
            "model": MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        { "type": "text", "text": instruction },
                        { "type": "image_url", "image_url": { "url": image_url } }
                    ]
                }
            ],
            "max_tokens": 2048
        });

        let resp = self
            .client
            .post(&url)
            .headers(self.headers())
            .json(&payload)
            .timeout(std::time::Duration::from_secs(60))
            .send()
            .await?;

        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            tracing::error!(
                "Agnes LLM analyze error: {} - {}",
                status,
                &body[..body.len().min(500)]
            );
            return Err(AppError::ExternalApiError(format!(
                "Agnes API 返回错误 ({})",
                status
            )));
        }

        let resp_json: Value = resp.json().await.map_err(|e| {
            AppError::InternalError(anyhow::anyhow!(
                "Failed to parse Agnes LLM analyze response: {}",
                e
            ))
        })?;

        extract_content_from_message(&resp_json).ok_or_else(|| {
            tracing::error!("Agnes LLM analyze response parse error: {:?}", resp_json);
            AppError::ExternalApiError("Agnes API 返回了无法解析的响应".to_string())
        })
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Extract text from a chat completion response message.
/// Prefers `content` over `reasoning_content` (mirrors the Python `_extract_content`).
fn extract_content_from_message(resp: &Value) -> Option<String> {
    let msg = resp
        .get("choices")?
        .get(0)?
        .get("message")?;

    // Prefer content
    if let Some(content) = msg.get("content").and_then(|v| v.as_str()) {
        let trimmed = content.trim();
        if !trimmed.is_empty() {
            return Some(trimmed.to_owned());
        }
    }

    // Fallback to reasoning_content
    if let Some(reasoning) = msg.get("reasoning_content").and_then(|v| v.as_str()) {
        let trimmed = reasoning.trim();
        if !trimmed.is_empty() {
            return Some(trimmed.to_owned());
        }
    }

    None
}
