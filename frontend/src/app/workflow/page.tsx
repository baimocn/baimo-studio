"use client"

import { useCallback, useRef, useState } from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { useToast } from "@/components/Toast"
import ErrorDisplay from "@/components/ErrorDisplay"

type Step = "upload" | "analyzing" | "optimizing" | "generating" | "done"

const STEPS: { key: Step; label: string; icon: string }[] = [
  { key: "upload", label: "上传图片", icon: "1" },
  { key: "analyzing", label: "AI 分析", icon: "2" },
  { key: "optimizing", label: "优化 Prompt", icon: "3" },
  { key: "generating", label: "生成新图", icon: "4" },
  { key: "done", label: "完成", icon: "5" },
]

const STEP_INDEX: Record<Step, number> = {
  upload: 0,
  analyzing: 1,
  optimizing: 2,
  generating: 3,
  done: 4,
}

export default function WorkflowPage() {
  const [step, setStep] = useState<Step>("upload")
  const [imageUrl, setImageUrl] = useState("")
  const [styleModifiers, setStyleModifiers] = useState("")
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState("")
  const [optimizedPrompt, setOptimizedPrompt] = useState("")
  const [generatedUrl, setGeneratedUrl] = useState("")
  const [error, setError] = useState("")
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("图片大小不能超过 10MB")
      return
    }

    setUploading(true)
    setError("")

    try {
      // 上传到 Agnes image API 临时获取 URL — 这里用 FormData 上传到后端
      const formData = new FormData()
      formData.append("file", file)
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ""
      const res = await fetch(`${API_BASE}/api/image/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })

      if (!res.ok) {
        // 如果后端没有 upload 接口，回退到用 Object URL + 提示用户粘贴 URL
        const blobUrl = URL.createObjectURL(file)
        setUploadedPreview(blobUrl)
        toast.info("请在下方粘贴图片的公开 URL（当前图片仅本地预览）")
        setUploading(false)
        return
      }

      const data = await res.json()
      setImageUrl(data.url)
      setUploadedPreview(URL.createObjectURL(file))
    } catch {
      // 上传失败，回退到本地预览
      const blobUrl = URL.createObjectURL(file)
      setUploadedPreview(blobUrl)
      toast.info("请在下方粘贴图片的公开 URL（当前图片仅本地预览）")
    } finally {
      setUploading(false)
    }
  }, [toast])

  const handleSubmit = useCallback(async () => {
    if (!imageUrl.trim()) {
      setError("请提供图片 URL")
      return
    }

    setError("")
    setAnalysis("")
    setOptimizedPrompt("")
    setGeneratedUrl("")

    // Simulate step transitions by calling the single workflow API
    setStep("analyzing")

    try {
      // 小延迟让 UI 显示分析状态
      await new Promise((r) => setTimeout(r, 500))

      setStep("optimizing")
      await new Promise((r) => setTimeout(r, 300))

      setStep("generating")

      const result = await api.workflow.analyzeAndGenerate({
        image_url: imageUrl.trim(),
        style_modifiers: styleModifiers.trim() || undefined,
      })

      setAnalysis(result.original_analysis)
      setOptimizedPrompt(result.optimized_prompt)
      setGeneratedUrl(result.generated_url)
      setStep("done")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "工作流执行失败，请重试"
      setError(msg)
      setStep("upload")
    }
  }, [imageUrl, styleModifiers])

  const handleReset = () => {
    setStep("upload")
    setImageUrl("")
    setStyleModifiers("")
    setUploadedPreview(null)
    setAnalysis("")
    setOptimizedPrompt("")
    setGeneratedUrl("")
    setError("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const currentStepIndex = STEP_INDEX[step]

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#f5f5f5]">智能工作流</h1>
        <p className="mt-1 text-sm text-[#71717a]">
          上传图片 → AI 自动分析风格 → 优化 Prompt → 生成类似风格的新图
        </p>
      </div>

      {/* Step Progress Indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const isActive = i === currentStepIndex
          const isCompleted = i < currentStepIndex
          return (
            <div key={s.key} className="flex items-center flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    isCompleted
                      ? "bg-green-500/20 text-green-400 border border-green-500/40"
                      : isActive
                      ? "bg-[#a855f7]/20 text-[#a855f7] border border-[#a855f7]/40 animate-pulse"
                      : "bg-[#27272a] text-[#52525b] border border-white/[0.08]"
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    s.icon
                  )}
                </div>
                <span
                  className={`text-xs font-medium truncate hidden sm:block ${
                    isActive ? "text-[#a855f7]" : isCompleted ? "text-green-400" : "text-[#52525b]"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 rounded transition-colors ${
                    i < currentStepIndex ? "bg-green-500/40" : "bg-white/[0.08]"
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>

      {error && <ErrorDisplay message={error} onRetry={step === "upload" ? handleSubmit : undefined} />}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="space-y-6">
          {/* Image URL Input */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#18181b] p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[#f5f5f5]">图片来源</h2>

            <div className="space-y-3">
              <label className="text-sm text-[#a1a1aa]">图片 URL</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full rounded-xl border border-white/[0.08] bg-[#09090b] px-4 py-3 text-sm text-[#f5f5f5] placeholder-[#52525b] outline-none focus:border-[#a855f7]/50 focus:ring-1 focus:ring-[#a855f7]/30"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.08]" />
              <span className="text-xs text-[#52525b]">或</span>
              <div className="h-px flex-1 bg-white/[0.08]" />
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full rounded-xl border border-dashed border-white/[0.15] bg-[#09090b] px-4 py-6 text-center transition-colors hover:border-[#a855f7]/30 hover:bg-[#1a1a1f]"
              >
                {uploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a855f7] border-t-transparent" />
                    <span className="text-sm text-[#a1a1aa]">上传中...</span>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl mb-2">📁</div>
                    <span className="text-sm text-[#a1a1aa]">点击选择图片文件</span>
                    <p className="text-xs text-[#52525b] mt-1">支持 JPG / PNG / WebP，最大 10MB</p>
                  </>
                )}
              </button>
            </div>

            {/* Preview */}
            {(uploadedPreview || imageUrl) && (
              <div className="mt-4">
                <p className="text-xs text-[#71717a] mb-2">预览：</p>
                <div className="relative rounded-xl overflow-hidden border border-white/[0.08] bg-[#09090b]">
                  <img
                    src={uploadedPreview || imageUrl}
                    alt="预览"
                    className="max-h-64 w-full object-contain"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = "none"
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Style Modifiers */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#18181b] p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[#f5f5f5]">风格偏好（可选）</h2>
            <textarea
              value={styleModifiers}
              onChange={(e) => setStyleModifiers(e.target.value)}
              placeholder="例如：更梦幻的氛围、加入星空元素、水彩风格..."
              rows={3}
              className="w-full rounded-xl border border-white/[0.08] bg-[#09090b] px-4 py-3 text-sm text-[#f5f5f5] placeholder-[#52525b] outline-none focus:border-[#a855f7]/50 focus:ring-1 focus:ring-[#a855f7]/30 resize-none"
            />
            <p className="text-xs text-[#52525b]">
              告诉 AI 你希望在生成结果中加入哪些额外风格或元素
            </p>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!imageUrl.trim()}
            className="w-full rounded-xl bg-[#a855f7] px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#9333ea] hover:shadow-lg hover:shadow-[#a855f7]/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            开始智能工作流
          </button>
        </div>
      )}

      {/* Steps 2-4: Processing */}
      {(step === "analyzing" || step === "optimizing" || step === "generating") && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#18181b] p-8">
          <div className="flex flex-col items-center gap-6">
            {/* Spinner */}
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 rounded-full border-4 border-white/[0.06]" />
              <div
                className="absolute inset-0 rounded-full border-4 border-transparent animate-spin"
                style={{
                  borderTopColor: "#a855f7",
                  borderRightColor: step === "analyzing" ? "#06b6d4" : step === "optimizing" ? "#ec4899" : "#a855f7",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-2xl">
                {step === "analyzing" ? "🔍" : step === "optimizing" ? "✨" : "🎨"}
              </div>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-[#f5f5f5]">
                {step === "analyzing" && "AI 正在分析图片..."}
                {step === "optimizing" && "正在优化生成 Prompt..."}
                {step === "generating" && "正在生成新图片..."}
              </h2>
              <p className="text-sm text-[#71717a]">
                {step === "analyzing" && "分析图片的构图、色彩、风格和氛围"}
                {step === "optimizing" && "基于分析结果构建高质量生成指令"}
                {step === "generating" && "调用 AI 模型生成类似风格的新图"}
              </p>
            </div>

            {/* 上传图片的小预览 */}
            {(uploadedPreview || imageUrl) && (
              <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-[#09090b] w-32 h-24">
                <img
                  src={uploadedPreview || imageUrl}
                  alt="原图"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 5: Results */}
      {step === "done" && (
        <div className="space-y-6">
          {/* Image Comparison */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.08] bg-[#18181b] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#71717a]" />
                <span className="text-xs font-medium text-[#71717a]">原图</span>
              </div>
              <div className="rounded-xl overflow-hidden bg-[#09090b]">
                <img
                  src={uploadedPreview || imageUrl}
                  alt="原图"
                  className="w-full aspect-[4/3] object-cover"
                />
              </div>
            </div>
            <div className="rounded-2xl border border-[#a855f7]/20 bg-[#18181b] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#a855f7] animate-pulse" />
                <span className="text-xs font-medium text-[#a855f7]">AI 生成</span>
              </div>
              <div className="rounded-xl overflow-hidden bg-[#09090b]">
                <img
                  src={generatedUrl}
                  alt="AI 生成"
                  className="w-full aspect-[4/3] object-cover"
                />
              </div>
            </div>
          </div>

          {/* Analysis Result */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#18181b] p-6 space-y-3">
            <h3 className="text-sm font-semibold text-[#f5f5f5] flex items-center gap-2">
              <span>🔍</span> AI 图片分析
            </h3>
            <p className="text-sm text-[#a1a1aa] leading-relaxed whitespace-pre-wrap">{analysis}</p>
          </div>

          {/* Optimized Prompt */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#18181b] p-6 space-y-3">
            <h3 className="text-sm font-semibold text-[#f5f5f5] flex items-center gap-2">
              <span>✨</span> 优化后的 Prompt
            </h3>
            <p className="text-sm text-[#a1a1aa] leading-relaxed">{optimizedPrompt}</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(optimizedPrompt)
                toast.success("已复制到剪贴板")
              }}
              className="text-xs text-[#a855f7] hover:text-[#c084fc] transition-colors"
            >
              复制 Prompt
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 rounded-xl border border-white/[0.08] bg-[#18181b] px-6 py-3 text-sm font-medium text-[#a1a1aa] transition-all hover:border-white/15 hover:bg-[#1f1f23]"
            >
              重新开始
            </button>
            <a
              href={api.image.downloadUrl(generatedUrl)}
              download
              className="flex-1 rounded-xl bg-[#a855f7] px-6 py-3 text-sm font-semibold text-white text-center transition-all hover:bg-[#9333ea] hover:shadow-lg hover:shadow-[#a855f7]/20"
            >
              下载结果
            </a>
            <Link
              href="/image"
              className="flex-1 rounded-xl border border-[#a855f7]/30 bg-[#a855f7]/10 px-6 py-3 text-sm font-medium text-[#a855f7] text-center transition-all hover:bg-[#a855f7]/20"
            >
              用这个 Prompt 继续生成
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
