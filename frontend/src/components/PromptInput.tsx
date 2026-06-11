"use client"

import { useState, useRef } from "react"

const IMAGE_STYLE_PRESETS = [
  { label: "默认", value: "" },
  { label: "写实摄影", value: "photorealistic" },
  { label: "动漫", value: "anime" },
  { label: "电影", value: "cinematic" },
  { label: "产品", value: "product" },
  { label: "概念艺术", value: "concept-art" },
  { label: "水彩", value: "watercolor" },
]

const VIDEO_STYLE_PRESETS = [
  { label: "默认", value: "" },
  { label: "电影", value: "cinematic" },
  { label: "动画", value: "animation" },
  { label: "纪实", value: "documentary" },
  { label: "赛博朋克", value: "cyberpunk" },
  { label: "慢动作", value: "slow-motion" },
]

interface StylePresetsProps {
  type: "image" | "video"
  styleContext: string
  onStyleChange: (style: string) => void
}

function StylePresets({ type, styleContext, onStyleChange }: StylePresetsProps) {
  const presets = type === "video" ? VIDEO_STYLE_PRESETS : IMAGE_STYLE_PRESETS

  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((preset) => (
        <button
          key={preset.value}
          onClick={() => onStyleChange(preset.value)}
          className={`rounded-lg border px-3 py-1.5 text-xs transition ${
            styleContext === preset.value
              ? "bg-[#a855f7]/15 text-[#a855f7] border-[#a855f7]/30"
              : "border-white/[0.08] text-[#71717a] hover:border-white/15 hover:text-[#a1a1aa]"
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}

const MAX_LENGTH = 5000

interface Props {
  value: string
  onChange: (val: string) => void
  type?: "image" | "video"
  placeholder?: string
  onOptimize?: (userInput: string, type: string) => Promise<string>
  onOptimizeStream?: (userInput: string, type: string, onChunk: (chunk: string) => void, signal?: AbortSignal) => Promise<void>
  onError?: (msg: string) => void
  styleContext?: string
  onStyleChange?: (style: string) => void
}

export default function PromptInput({
  value,
  onChange,
  type = "image",
  placeholder = "描述你想生成的画面...",
  onOptimize,
  onOptimizeStream,
  onError,
  styleContext = "",
  onStyleChange,
}: Props) {
  const [optimizing, setOptimizing] = useState(false)
  const [streamingText, setStreamingText] = useState("")
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleOptimize = async () => {
    if (!value.trim()) return
    if (!onOptimizeStream && !onOptimize) return

    const inputToSend = styleContext ? `Style: ${styleContext}. ${value}` : value

    setOptimizing(true)
    const controller = new AbortController()
    abortControllerRef.current = controller

    if (onOptimizeStream) {
      try {
        let accumulated = ""
        await onOptimizeStream(inputToSend, type, (chunk) => {
          if (controller.signal.aborted) return
          accumulated += chunk
          setStreamingText(accumulated)
          onChange(accumulated)
        }, controller.signal)
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // 用户主动停止，不报错
        } else if (onOptimize) {
          try {
            const result = await onOptimize(inputToSend, type)
            if (!controller.signal.aborted) onChange(result)
          } catch {
            if (!controller.signal.aborted) { if (onError) onError("Prompt 优化失败，请稍后重试") }
          }
        } else {
          if (!controller.signal.aborted) { if (onError) onError("Prompt 优化失败，请稍后重试") }
        }
      } finally {
        setStreamingText("")
        setOptimizing(false)
        abortControllerRef.current = null
      }
    } else if (onOptimize) {
      try {
        const result = await onOptimize(inputToSend, type)
        if (!controller.signal.aborted) onChange(result)
      } catch {
        if (!controller.signal.aborted) { if (onError) onError("Prompt 优化失败，请稍后重试") }
      } finally {
        setOptimizing(false)
        abortControllerRef.current = null
      }
    }
  }

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setOptimizing(false)
    setStreamingText("")
  }

  return (
    <div className="space-y-2">
      <label htmlFor="prompt-input" className="text-sm font-medium text-[#a1a1aa]">描述内容</label>
      {onStyleChange && (
        <StylePresets type={type} styleContext={styleContext} onStyleChange={onStyleChange} />
      )}
      <div className="relative">
        <textarea
          id="prompt-input"
          value={optimizing && streamingText ? streamingText : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          maxLength={MAX_LENGTH}
          readOnly={optimizing && !!streamingText}
          className={`w-full resize-none rounded-xl border border-white/[0.08] bg-[#18181b] px-4 py-3 text-sm text-[#f5f5f5] outline-none transition placeholder:text-[#71717a] focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/20 ${
            optimizing && streamingText ? "bg-[#a855f7]/5" : ""
          }`}
        />
        {optimizing && streamingText && (
          <span className="absolute bottom-3 right-3 inline-block h-4 w-0.5 bg-[#a855f7] animate-cursor-blink" />
        )}
      </div>
      <div className="flex justify-end">
        <span
          className={`text-xs ${
            value.length > 4500 ? "text-[#eab308]" : "text-[#71717a]"
          }`}
        >
          {value.length}/{MAX_LENGTH}
        </span>
      </div>
      {(onOptimize || onOptimizeStream) && (
        <div className="flex gap-2">
          {optimizing ? (
            <button
              onClick={handleStop}
              className="flex items-center gap-1.5 rounded-lg border border-[#ef4444]/30 px-3 py-1.5 text-xs text-[#ef4444] transition hover:bg-[#ef4444]/10"
            >
              停止优化
            </button>
          ) : (
            <button
              onClick={handleOptimize}
              disabled={!value.trim()}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-[#a1a1aa] transition hover:border-[#a855f7]/30 hover:bg-[#a855f7]/10 hover:text-[#a855f7] disabled:opacity-50"
            >
              ✨ 用 AI 优化 Prompt
            </button>
          )}
        </div>
      )}
    </div>
  )
}
