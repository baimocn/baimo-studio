"use client"

import { useState } from "react"
import { api } from "@/lib/api"
import { streamOptimize } from "@/lib/optimize-helpers"
import MultiImageUploader from "@/components/MultiImageUploader"
import { useVideoGeneration } from "@/hooks/useVideoGeneration"
import VideoGenerationLayout from "@/components/VideoGenerationLayout"
import { VideoAdvancedOptions } from "@/components/AdvancedOptions"
import { useToast } from "@/components/Toast"

export default function MultiImageVideoPage() {
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const toast = useToast()
  const vg = useVideoGeneration({
    mutationKey: "video-multi-create",
    buildCreateArgs: ({ prompt, videoParams, negativePrompt, seed, numInferenceSteps }) => ({
      prompt, image_url: imageUrls, ...videoParams,
      negative_prompt: negativePrompt || undefined,
      seed: seed !== "" ? parseInt(seed) : undefined,
      num_inference_steps: numInferenceSteps ? parseInt(numInferenceSteps) : undefined,
    }),
  })

  return (
    <VideoGenerationLayout
      title="多图视频"
      navLinks={[{ href: "/video", label: "← 文生视频" }, { href: "/video/image-to-video", label: "图生视频" }, { href: "/video/keyframes", label: "关键帧动画 →" }]}
      promptPlaceholder="描述多张图片之间的过渡效果..."
      uploaderSlot={<MultiImageUploader onUpload={setImageUrls} maxFiles={5} />}
      videoParams={vg.videoParams} onVideoParamsChange={vg.setVideoParams}
      prompt={vg.prompt} onPromptChange={vg.setPrompt}
      onOptimizeStream={streamOptimize}
      onError={toast.error}
      advancedOptionsSlot={<VideoAdvancedOptions negativePrompt={vg.negativePrompt} onNegativePromptChange={vg.setNegativePrompt} seed={vg.seed} onSeedChange={vg.setSeed} numInferenceSteps={vg.numInferenceSteps} onNumInferenceStepsChange={vg.setNumInferenceSteps} />}
      isMutating={vg.isMutating} createError={vg.createError} taskCreated={vg.taskCreated}
      statusData={vg.statusData} pollError={vg.pollError} onCreate={vg.handleCreate} onReset={vg.handleReset}
    />
  )
}
