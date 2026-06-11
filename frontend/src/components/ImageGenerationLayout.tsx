"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import useSWR from "swr"
import useSWRMutation from "swr/mutation"
import { api } from "@/lib/api"
import { streamOptimize } from "@/lib/optimize-helpers"
import { downloadFile } from "@/lib/download"
import PromptInput from "@/components/PromptInput"
import ImageResult from "@/components/ImageResult"
import ImageUploader from "@/components/ImageUploader"
import MultiImageUploader from "@/components/MultiImageUploader"
import SizeSelector from "@/components/SizeSelector"
import { ImageAdvancedOptions } from "@/components/AdvancedOptions"
import ErrorDisplay from "@/components/ErrorDisplay"
import { useToast } from "@/components/Toast"

// ── Mode configuration ──────────────────────────────────────────────
type Mode = "generate" | "edit" | "compose"

const MODE_META: Record<Mode, { title: string; href: string; tabLabel: string; placeholder: string; buttonText: string; loadingText: string; errorPrefix: string }> = {
  generate: {
    title: "图片生成",
    href: "/image",
    tabLabel: "文生图",
    placeholder: "描述你想生成的画面...",
    buttonText: "生成图片",
    loadingText: "生成中...",
    errorPrefix: "生成失败",
  },
  edit: {
    title: "图片编辑",
    href: "/image/edit",
    tabLabel: "图生图",
    placeholder: "描述要如何编辑图片...",
    buttonText: "应用编辑",
    loadingText: "处理中...",
    errorPrefix: "编辑失败",
  },
  compose: {
    title: "多图合成",
    href: "/image/compose",
    tabLabel: "多图合成",
    placeholder: "描述如何合成这些图片...",
    buttonText: "合成图片",
    loadingText: "合成中...",
    errorPrefix: "合成失败",
  },
}

const TAB_NAV = [
  { href: "/image", label: "文生图" },
  { href: "/image/edit", label: "图生图" },
  { href: "/image/compose", label: "多图合成" },
]

const EXAMPLE_PROMPTS = [
  "赛博朋克风格的未来城市夜景，霓虹灯倒映在雨水中",
  "一只穿宇航服的柴犬漂浮在太空中，背景是地球",
  "水墨风格的中国山水画，云雾缭绕的山峰与古松",
  "微缩世界中的咖啡杯里长出了一片森林",
]

const DEFAULT_MODEL = "agnes-image-2.1-flash"
const DEFAULT_SIZE = "1024x768"

// ── Batch result item interface ─────────────────────────────────────
interface BatchResultItem {
  url: string
  model: string
  seed: number
}

// ── Props ───────────────────────────────────────────────────────────
interface Props {
  mode: Mode
}

export default function ImageGenerationLayout({ mode }: Props) {
  const meta = MODE_META[mode]
  const toast = useToast()

  // ── Common state ──────────────────────────────────────────────────
  const [prompt, setPrompt] = useState("")
  const [size, setSize] = useState(DEFAULT_SIZE)
  const [model, setModel] = useState(DEFAULT_MODEL)
  const [negativePrompt, setNegativePrompt] = useState("")
  const [styleContext, setStyleContext] = useState("")
  const [formCollapsed, setFormCollapsed] = useState(false)

  // mode-specific state
  const [imageUrl, setImageUrl] = useState("")          // edit
  const [imageUrls, setImageUrls] = useState<string[]>([]) // compose
  const [batchMode, setBatchMode] = useState(false)      // generate only
  const [numImages, setNumImages] = useState(4)           // generate only

  // ── Model list (generate & edit) ──────────────────────────────────
  const { data: modelsData, isLoading: modelsLoading } = useSWR(
    mode !== "compose" ? "models" : null,
    () => api.models.list(),
    { revalidateOnFocus: false }
  )
  const imageModels = modelsData?.image ?? []

  // ── Mutations ─────────────────────────────────────────────────────
  const { trigger: generateTrigger, data: generateData, isMutating: generateMutating, error: generateError, reset: generateReset } = useSWRMutation(
    mode === "generate" ? "image-generate" : null,
    () => api.image.generate({ prompt, size, model, negative_prompt: negativePrompt || undefined })
  )

  const { trigger: batchTrigger, data: batchData, isMutating: batchMutating, error: batchError, reset: batchReset } = useSWRMutation(
    mode === "generate" ? "image-batch-generate" : null,
    () => api.image.batchGenerate({ prompt, size, model, num_images: numImages, negative_prompt: negativePrompt || undefined })
  )

  const { trigger: editTrigger, data: editData, isMutating: editMutating, error: editError, reset: editReset } = useSWRMutation(
    mode === "edit" ? "image-edit" : null,
    () => api.image.edit({ prompt, size, model, image_url: imageUrl, negative_prompt: negativePrompt || undefined })
  )

  const { trigger: composeTrigger, data: composeData, isMutating: composeMutating, error: composeError, reset: composeReset } = useSWRMutation(
    mode === "compose" ? "image-compose" : null,
    () => api.image.compose({ prompt, size, image_urls: imageUrls })
  )

  // ── Derived values ────────────────────────────────────────────────
  const data = generateData || editData || composeData || null
  const batchResultData: { results: BatchResultItem[] } | null = batchData || null
  const isMutating = generateMutating || batchMutating || editMutating || composeMutating
  const error = generateError || editError || composeError || batchError || null

  const handleRetry = useCallback(() => {
    if (!prompt.trim()) return
    if (mode === "generate") {
      if (batchMode) batchTrigger()
      else generateTrigger()
    } else if (mode === "edit" && imageUrl) {
      editTrigger()
    } else if (mode === "compose" && imageUrls.length >= 2) {
      composeTrigger()
    }
  }, [mode, prompt, batchMode, imageUrl, imageUrls, batchTrigger, generateTrigger, editTrigger, composeTrigger])

  const handleResetAll = useCallback(() => {
    setPrompt("")
    setSize(DEFAULT_SIZE)
    setModel(DEFAULT_MODEL)
    setNegativePrompt("")
    setStyleContext("")
    setFormCollapsed(false)
    if (mode === "edit") setImageUrl("")
    if (mode === "compose") setImageUrls([])
    if (mode === "generate") {
      setBatchMode(false)
      setNumImages(4)
      batchReset()
    }
    generateReset()
    editReset()
    composeReset()
  }, [mode, generateReset, editReset, composeReset, batchReset])

  const handleGenerate = useCallback(() => {
    if (!prompt.trim()) return
    if (mode === "generate") {
      if (batchMode) batchTrigger()
      else generateTrigger()
    } else if (mode === "edit") {
      if (!imageUrl) return
      editTrigger()
    } else if (mode === "compose") {
      if (imageUrls.length < 2) return
      composeTrigger()
    }
  }, [mode, prompt, batchMode, imageUrl, imageUrls, batchTrigger, generateTrigger, editTrigger, composeTrigger])

  const canSubmit = mode === "generate"
    ? !!prompt.trim()
    : mode === "edit"
      ? !!prompt.trim() && !!imageUrl
      : !!prompt.trim() && imageUrls.length >= 2

  const batchButtonText = batchMode ? `批量生成 ${numImages} 张` : meta.buttonText

  // ── Keyboard shortcut ─────────────────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !data && !batchResultData && !isMutating && canSubmit) {
      e.preventDefault()
      handleGenerate()
    }
  }, [data, batchResultData, isMutating, canSubmit, handleGenerate])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  // ── Tab navigation ────────────────────────────────────────────────
  const renderTabs = () => (
    <nav className="flex gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
      {TAB_NAV.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`flex-1 rounded-lg py-2 text-center text-sm font-medium transition ${
            tab.href === meta.href
              ? "bg-[#a855f7]/15 text-[#a855f7] shadow"
              : "text-[#71717a] hover:text-[#a1a1aa]"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )

  // ── Model selector (generate & edit) ──────────────────────────────
  const renderModelSelector = () => {
    if (mode === "compose") return null

    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[#a1a1aa]">模型</label>
        {modelsLoading ? (
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
            <svg className="h-4 w-4 animate-spin text-[#a855f7]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs text-[#71717a]">加载模型列表...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {imageModels.map((m) => (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                className={`rounded-xl border-2 p-3 text-left transition ${
                  model === m.id
                    ? "border-[#a855f7] bg-[#a855f7]/10 text-[#a855f7] shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                    : "border-white/[0.08] text-[#a1a1aa] hover:border-white/15 hover:bg-white/5"
                }`}
              >
                <div className="text-sm font-medium">{m.name}</div>
                <div className="text-xs text-[#71717a]">{m.description}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Advanced options ──────────────────────────────────────────────
  const renderAdvancedOptions = () => {
    if (mode === "compose") return null

    return (
      <ImageAdvancedOptions
        negativePrompt={negativePrompt}
        onNegativePromptChange={setNegativePrompt}
        batchMode={mode === "generate" ? batchMode : false}
        onBatchModeChange={mode === "generate" ? setBatchMode : () => {}}
        numImages={numImages}
        onNumImagesChange={setNumImages}
      />
    )
  }

  // ── Form content ──────────────────────────────────────────────────
  const renderForm = () => (
    <>
      {mode === "edit" && (
        <ImageUploader onUpload={setImageUrl} onError={toast.error} emptyHint="请先上传参考图片" />
      )}

      {mode === "compose" && (
        <MultiImageUploader onUpload={setImageUrls} maxFiles={5} />
      )}

      <PromptInput
        value={prompt}
        onChange={setPrompt}
        type="image"
        placeholder={meta.placeholder}
        onOptimizeStream={streamOptimize}
        onError={toast.error}
        styleContext={styleContext}
        onStyleChange={setStyleContext}
      />

      {mode === "generate" && (
        <div className="space-y-2">
          <p className="text-xs text-[#71717a]">试试这些 prompt：</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((ex) => (
              <button
                key={ex}
                onClick={() => setPrompt(ex)}
                className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-[#a1a1aa] transition hover:border-[#a855f7]/40 hover:bg-[#a855f7]/10 hover:text-[#a855f7]"
              >
                {ex.length > 20 ? ex.slice(0, 20) + "..." : ex}
              </button>
            ))}
          </div>
        </div>
      )}

      <SizeSelector value={size} onChange={setSize} type="image" />

      {renderModelSelector()}
      {renderAdvancedOptions()}

      {error && (
        <ErrorDisplay message={error.message} onRetry={handleRetry} prefix={meta.errorPrefix} />
      )}

      <button
        onClick={handleGenerate}
        disabled={isMutating || !canSubmit}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#a855f7] to-[#06b6d4] py-3 text-sm font-medium text-white shadow-lg shadow-[#a855f7]/25 transition hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] disabled:opacity-50"
      >
        {isMutating && (
          <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {isMutating ? meta.loadingText : (mode === "generate" ? batchButtonText : meta.buttonText)}
      </button>
    </>
  )

  // ── Collapsible form toggle ───────────────────────────────────────
  const renderFormToggle = () => (
    <>
      <button
        onClick={() => setFormCollapsed(!formCollapsed)}
        className="flex w-full items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-[#a1a1aa] transition hover:bg-white/5"
      >
        <span>调整参数</span>
        <svg
          className={`h-4 w-4 transition-transform ${formCollapsed ? "" : "rotate-180"}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {!formCollapsed && (
        <div className="space-y-6">{renderForm()}</div>
      )}
    </>
  )

  // ── Action buttons (retry + reset) ────────────────────────────────
  const renderActionButtons = () => (
    <div className="flex gap-2">
      <button
        onClick={handleRetry}
        disabled={isMutating || !canSubmit}
        className="flex-1 rounded-xl bg-gradient-to-r from-[#a855f7] to-[#06b6d4] py-3 text-sm font-medium text-white shadow-lg shadow-[#a855f7]/25 transition hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] disabled:opacity-50"
      >
        再试一次
      </button>
      <button
        onClick={handleResetAll}
        className="flex-1 rounded-xl border border-white/[0.08] py-3 text-sm font-medium text-[#a1a1aa] transition hover:bg-white/5 hover:text-[#f5f5f5]"
      >
        清空重来
      </button>
    </div>
  )

  // ── Single result ─────────────────────────────────────────────────
  const renderSingleResult = () => {
    if (!data || batchResultData) return null
    return (
      <>
        <ImageResult url={data.url} model={data.model} prompt={prompt} onReset={handleResetAll} />
        {renderActionButtons()}
        {renderFormToggle()}
      </>
    )
  }

  // ── Batch results (generate mode only) ────────────────────────────
  const renderBatchResults = () => {
    if (!batchResultData) return null
    return (
      <>
        <div className="grid grid-cols-2 gap-4">
          {batchResultData.results.map((item, idx) => (
            <div key={idx} className="space-y-2">
              <div className="overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_0_20px_rgba(168,85,247,0.08)]">
                <div className="relative w-full" style={{ aspectRatio: "4/3" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={`批量结果 ${idx + 1}`}
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#71717a]">seed: {item.seed}</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={async () => {
                      const ext = item.url.match(/\.(png|jpe?g|webp|gif)/i)?.[1] || "png"
                      const prefix = prompt?.replace(/[^a-zA-Z0-9一-鿿]/g, "").slice(0, 20) || "image"
                      try {
                        await downloadFile(item.url, `baimo-${prefix}-${idx + 1}.${ext}`)
                      } catch {
                        window.open(item.url, "_blank")
                      }
                    }}
                    className="rounded-lg bg-gradient-to-r from-[#a855f7] to-[#06b6d4] px-3 py-2 min-h-[44px] text-xs font-medium text-white transition hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                  >
                    下载
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(item.url)
                      toast.success("图片链接已复制")
                    }}
                    className="rounded-lg border border-white/[0.08] px-3 py-2 min-h-[44px] text-xs text-[#a1a1aa] transition hover:bg-white/5 hover:text-[#f5f5f5]"
                  >
                    收藏
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {renderActionButtons()}
        {renderFormToggle()}
      </>
    )
  }

  // ── Compose description ───────────────────────────────────────────
  const renderComposeHint = () => {
    if (mode !== "compose") return null
    return (
      <p className="text-sm text-[#71717a]">上传多张参考图片，AI 会将它们合成为一张新图片。模型固定使用 2.0 Flash。</p>
    )
  }

  // ── Main render ───────────────────────────────────────────────────
  const hasResult = !!data || !!batchResultData
  const maxWidthClass = batchResultData ? "max-w-4xl" : "max-w-2xl"

  return (
    <div className={`mx-auto space-y-6 animate-fade-in ${maxWidthClass}`}>
      {renderTabs()}

      <h1 className="text-2xl font-bold text-[#f5f5f5]">{meta.title}</h1>

      {renderComposeHint()}
      {renderSingleResult()}
      {renderBatchResults()}

      {/* Show full form when no result */}
      {!hasResult && renderForm()}
    </div>
  )
}
