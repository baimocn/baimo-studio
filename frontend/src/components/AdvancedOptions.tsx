"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const NEGATIVE_PRESETS = [
  { id: "blurry", label: "模糊", value: "blurry" },
  { id: "deformed", label: "变形", value: "deformed, disfigured" },
  { id: "lowquality", label: "低质量", value: "low quality, worst quality" },
  { id: "watermark", label: "水印", value: "watermark, text, logo" },
  { id: "ugly", label: "丑陋", value: "ugly, ugly face" },
  { id: "duplicate", label: "重复", value: "duplicate, copy" },
  { id: "noise", label: "噪点", value: "noise, grainy, artifacts" },
  { id: "oversaturated", label: "过饱和", value: "oversaturated, overexposed" },
]

function Tooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  const toggle = useCallback(() => setOpen((v) => !v), [])

  // Close on outside click/tap
  useEffect(() => {
    if (!open) return
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleOutside)
    document.addEventListener("touchstart", handleOutside)
    return () => {
      document.removeEventListener("mousedown", handleOutside)
      document.removeEventListener("touchstart", handleOutside)
    }
  }, [open])

  return (
    <span ref={ref} className="group relative ml-1 inline-block">
      <button
        type="button"
        onClick={toggle}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label="提示信息"
        className="flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-white/10 text-xs text-[#71717a]"
      >
        ?
      </button>
      <span
        className={`pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-56 -translate-x-1/2 rounded-lg bg-[#27272a] border border-white/[0.08] px-3 py-2 text-xs text-[#a1a1aa] shadow-lg transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
      >
        {text}
      </span>
    </span>
  )
}

interface NegativePromptSectionProps {
  labelId: string
  negativePrompt: string
  onNegativePromptChange: (val: string) => void
  tooltipText: string
}

export function NegativePromptSection({
  labelId,
  negativePrompt,
  onNegativePromptChange,
  tooltipText,
}: NegativePromptSectionProps) {
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set())

  const handlePresetToggle = (preset: typeof NEGATIVE_PRESETS[number]) => {
    const next = new Set(selectedPresets)
    if (next.has(preset.id)) { next.delete(preset.id) } else { next.add(preset.id) }
    setSelectedPresets(next)
    const allValues = NEGATIVE_PRESETS.filter((p) => next.has(p.id)).map((p) => p.value)
    onNegativePromptChange(allValues.join(", "))
  }

  return (
    <div>
      <label htmlFor={labelId} className="flex items-center text-sm font-medium text-[#a1a1aa]">
        负面提示词
        <Tooltip text={tooltipText} />
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {NEGATIVE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => handlePresetToggle(preset)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              selectedPresets.has(preset.id)
                ? "bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40 shadow-[0_0_8px_rgba(239,68,68,0.2)]"
                : "bg-white/5 text-[#71717a] border border-white/[0.08] hover:bg-white/10 hover:text-[#a1a1aa]"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <textarea
        id={labelId}
        value={negativePrompt}
        onChange={(e) => onNegativePromptChange(e.target.value)}
        placeholder="或手动输入负面提示词..."
        rows={2}
        className="mt-2 w-full resize-none rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-2 text-sm text-[#f5f5f5] outline-none transition placeholder:text-[#71717a] focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/20"
      />
    </div>
  )
}

interface ImageAdvancedOptionsProps {
  negativePrompt: string
  onNegativePromptChange: (val: string) => void
  batchMode: boolean
  onBatchModeChange: (val: boolean) => void
  numImages: number
  onNumImagesChange: (val: number) => void
}

export function ImageAdvancedOptions({
  negativePrompt, onNegativePromptChange,
  batchMode, onBatchModeChange,
  numImages, onNumImagesChange,
}: ImageAdvancedOptionsProps) {
  return (
    <details className="group rounded-xl border border-white/[0.08] bg-[#18181b] p-4">
      <summary className="cursor-pointer text-sm font-medium text-[#a1a1aa] hover:text-[#f5f5f5] transition">
        高级选项
      </summary>
      <div className="mt-3 space-y-4">
        <NegativePromptSection
          labelId="image-negative-prompt"
          negativePrompt={negativePrompt}
          onNegativePromptChange={onNegativePromptChange}
          tooltipText="描述不想在图片中出现的内容。选择预设或手动输入，多个用逗号分隔。"
        />
        <div>
          <label className="flex items-center justify-between text-sm font-medium text-[#a1a1aa]">
            <span>批量生成</span>
            <button
              type="button"
              role="switch"
              aria-checked={batchMode}
              onClick={() => onBatchModeChange(!batchMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                batchMode ? "bg-[#a855f7]" : "bg-white/10"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  batchMode ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>
          {batchMode && (
            <div className="mt-2">
              <label className="text-xs text-[#71717a]">生成数量：{numImages} 张</label>
              <input
                type="range"
                min={1}
                max={8}
                step={1}
                value={numImages}
                onChange={(e) => onNumImagesChange(Number(e.target.value))}
                className="mt-1 w-full accent-[#a855f7]"
              />
              <div className="flex justify-between text-xs text-[#52525b]">
                <span>1</span>
                <span>8</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </details>
  )
}

interface VideoAdvancedOptionsProps {
  negativePrompt: string
  onNegativePromptChange: (val: string) => void
  seed: string
  onSeedChange: (val: string) => void
  numInferenceSteps: string
  onNumInferenceStepsChange: (val: string) => void
}

export function VideoAdvancedOptions({
  negativePrompt, onNegativePromptChange,
  seed, onSeedChange,
  numInferenceSteps, onNumInferenceStepsChange,
}: VideoAdvancedOptionsProps) {
  return (
    <details className="group rounded-xl border border-white/[0.08] bg-[#18181b] p-4">
      <summary className="cursor-pointer text-sm font-medium text-[#a1a1aa] hover:text-[#f5f5f5] transition">
        高级选项
      </summary>
      <div className="mt-3 space-y-4">
        <NegativePromptSection
          labelId="video-negative-prompt"
          negativePrompt={negativePrompt}
          onNegativePromptChange={onNegativePromptChange}
          tooltipText="描述不想在视频中出现的内容。选择预设或手动输入。"
        />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="video-seed" className="flex items-center text-sm font-medium text-[#a1a1aa]">
              随机种子
              <Tooltip text="设置固定种子可复现相同结果。留空则每次随机生成。" />
            </label>
            <input
              id="video-seed"
              type="number"
              value={seed}
              onChange={(e) => onSeedChange(e.target.value)}
              placeholder="留空则随机"
              className="mt-1 w-full rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-2 text-sm text-[#f5f5f5] outline-none transition placeholder:text-[#71717a] focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/20"
            />
          </div>
          <div>
            <label htmlFor="video-inference-steps" className="flex items-center text-sm font-medium text-[#a1a1aa]">
              推理步数
              <Tooltip text="步数越多质量越高但速度越慢。留空使用默认值。" />
            </label>
            <input
              id="video-inference-steps"
              type="number"
              value={numInferenceSteps}
              onChange={(e) => onNumInferenceStepsChange(e.target.value)}
              placeholder="留空则使用默认值"
              className="mt-1 w-full rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-4 py-2 text-sm text-[#f5f5f5] outline-none transition placeholder:text-[#71717a] focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/20"
            />
          </div>
        </div>
      </div>
    </details>
  )
}
