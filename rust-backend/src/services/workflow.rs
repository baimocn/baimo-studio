use tracing::debug;

use crate::error::AppError;
use crate::models::generation::Generation;
use crate::services::agnes_image::AgnesImageService;
use crate::services::agnes_llm::AgnesLLMService;

/// Detailed image analysis instruction (matches Python backend).
const IMAGE_ANALYSIS_INSTRUCTION: &str =
    "Analyze this image in detail. Describe: \
     1) Main subject and composition, \
     2) Color palette and lighting, \
     3) Art style (photorealistic, illustration, painting, etc.), \
     4) Mood and atmosphere, \
     5) Any notable textures, patterns, or techniques. \
     Be thorough — this analysis will be used to generate a similar image.";

/// Workflow service that orchestrates multi-step image generation pipelines.
///
/// Encapsulates the two workflow variants:
/// - `analyze_and_generate`: analyze image -> optimize prompt -> generate (legacy name)
/// - `execute`: same 3-step pipeline with a cleaner interface
pub struct WorkflowService<'a> {
    pub llm: AgnesLLMService<'a>,
    pub image: AgnesImageService<'a>,
}

impl<'a> WorkflowService<'a> {
    pub fn new(
        llm: AgnesLLMService<'a>,
        image: AgnesImageService<'a>,
    ) -> Self {
        Self { llm, image }
    }

    /// Full 3-step pipeline: analyze image -> optimize prompt -> generate new image.
    ///
    /// Returns `(analysis, optimized_prompt, generated_url)`.
    pub async fn execute(
        &self,
        image_url: &str,
        style_modifiers: Option<&str>,
        size: &str,
        model: &str,
    ) -> Result<(String, String, String), AppError> {
        // Step 1: Analyze the input image with detailed instruction
        debug!("Workflow step 1: Analyzing image");
        let analysis = self.llm
            .analyze_image(image_url, IMAGE_ANALYSIS_INSTRUCTION)
            .await?;

        // Step 2: Optimize the prompt based on analysis
        debug!("Workflow step 2: Optimizing prompt");
        let mut prompt_input = format!(
            "Based on the following image analysis, generate a detailed prompt that will create a similar image:\n\n{}",
            analysis
        );
        if let Some(style) = style_modifiers {
            let style = style.trim();
            if !style.is_empty() {
                prompt_input.push_str(&format!("\n\nAdditional style requirements: {}", style));
            }
        }

        let optimized_prompt = self.llm
            .optimize_prompt(&prompt_input, "image")
            .await?;

        // Step 3: Generate a new image from the optimized prompt
        debug!("Workflow step 3: Generating image");
        let generated_url = self.image
            .generate(&optimized_prompt, size, model, None)
            .await?;

        Ok((analysis, optimized_prompt, generated_url))
    }

    /// Run the full pipeline and persist the generation record to the database.
    ///
    /// This is the handler-level helper that combines `execute` with DB writes.
    /// Returns `(analysis, optimized_prompt, generated_url)`.
    pub async fn execute_and_save(
        &self,
        db: &sqlx::SqlitePool,
        image_url: &str,
        style_modifiers: Option<&str>,
        size: &str,
        model: &str,
    ) -> Result<(String, String, String), AppError> {
        let (analysis, optimized_prompt, generated_url) =
            self.execute(image_url, style_modifiers, size, model).await?;

        // Save generation record (fire-and-forget, matching Python behavior)
        let _ = Generation::create(
            db,
            None,
            model,
            &optimized_prompt,
            "image",
            None,
        )
        .await;

        Ok((analysis, optimized_prompt, generated_url))
    }
}
