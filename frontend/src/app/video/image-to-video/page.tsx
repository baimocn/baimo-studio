"use client"

import { useState, useCallback } from "react"
import { api } from "@/lib/api"
import { streamOptimize } from "@/lib/optimize-helpers"
import ImageUploader from "@/components/ImageUploader"
import { useVideoGeneration } from "@/hooks/useVideoGeneration"
import VideoGenerationLayout from "@/components/VideoGenerationLayout"
import { VideoAdvancedOptions } from "@/components/AdvancedOptions"
import { useToast } from "@/components/Toast"

export default function ImageToVideoPage() {
  const [imageUrl, setImageUrl] = useState("")
  const toast = useToast()
  const [uploading, setUploading] = useState(false)

  const uploadFileToServer = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append("file", file)
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ""
    const res = await fetch(`${API_BASE}/api/image/upload`, { method: "POST", body: formData })
    if (!res.ok) throw new Error("图片上传失败")
    const data = await res.json()
    return data.url as string
  }, [])

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true)
    try {
      const url = await uploadFileToServer(file)
      setImageUrl(url)
    } catch {
      toast.error("图片上传失败，请重试")
    } finally {
      setUploading(false)
    }
  }, [uploadFileToServer, toast])
  const vg = useVideoGeneration({
    mutationKey: "video-image-create",
    buildCreateArgs: ({ prompt, videoParams, negativePrompt, seed, numInferenceSteps }) => ({
      prompt, image_url: imageUrl, ...videoParams,
      negative_prompt: negativePrompt || undefined,
      seed: seed !== "" ? parseInt(seed) : undefined,
      num_inference_steps: numInferenceSteps ? parseInt(numInferenceSteps) : undefined,
    }),
  })

  return (
    <VideoGenerationLayout
      title="图生视频"
      navLinks={[{ href: "/video", label: "← 文生视频" }, { href: "/video/multi-image", label: "多图视频 →" }, { href: "/video/keyframes", label: "关键帧动画 →" }]}
      promptPlaceholder="描述动画化效果..."
      uploaderSlot={<ImageUploader onUpload={handleUpload} onError={toast.error} />}
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

