"use client"

import type { VideoParams } from "@/hooks/useVideoGeneration"

interface Props {
  value: string
  onChange: (val: string) => void
  type?: "image" | "video"
  videoParams?: VideoParams
  onVideoParamsChange?: (p: VideoParams) => void
}

const IMAGE_SIZES = [
  { label: "方形 1024×1024", value: "1024x1024", icon: "⬜" },
  { label: "横屏 1024×768", value: "1024x768", icon: "▬" },
  { label: "竖屏 768×1024", value: "768x1024", icon: "▮" },
  { label: "宽屏 1280×720", value: "1280x720", icon: "🖥" },
  { label: "高清 1536×1024", value: "1536x1024", icon: "📸" },
]

const VIDEO_PARAMS = [
  { label: "3 秒", frames: 81, fps: 24 },
  { label: "5 秒", frames: 121, fps: 24 },
  { label: "10 秒", frames: 241, fps: 24 },
  { label: "18 秒", frames: 441, fps: 24 },
]

export default function SizeSelector({ value, onChange, type = "image", videoParams, onVideoParamsChange }: Props) {
  if (type === "video") {
    const selectedFrames = videoParams?.num_frames ?? null

    return (
      <div className="space-y-2">
        <label htmlFor="video-duration" className="text-sm font-medium text-[#a1a1aa]">视频时长</label>
        <div id="video-duration" className="grid grid-cols-4 gap-2">
          {VIDEO_PARAMS.map((p) => (
            <button
              key={p.label}
              aria-label={`视频时长 ${p.label}`}
              onClick={() =>
                onVideoParamsChange?.({
                  width: 1152,
                  height: 768,
                  num_frames: p.frames,
                  frame_rate: p.fps,
                })
              }
              className={`rounded-xl border-2 py-2.5 text-center text-sm transition ${
                selectedFrames === p.frames
                  ? "border-[#a855f7] bg-[#a855f7]/10 text-[#a855f7] shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                  : "border-white/[0.08] text-[#a1a1aa] hover:border-[#a855f7]/30 hover:bg-[#a855f7]/5"
              }`}
            >
              <div className="font-medium">{p.label}</div>
              <div className="text-xs text-[#71717a]">{p.frames}帧</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label htmlFor="image-size" className="text-sm font-medium text-[#a1a1aa]">输出尺寸</label>
      <div id="image-size" className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {IMAGE_SIZES.map((s) => (
          <button
            key={s.value}
            aria-label={s.label}
            onClick={() => onChange(s.value)}
            className={`rounded-xl border-2 px-3 py-2.5 text-left text-sm transition ${
              value === s.value
                ? "border-[#a855f7] bg-[#a855f7]/10 text-[#a855f7] shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                : "border-white/[0.08] text-[#a1a1aa] hover:border-white/15 hover:bg-white/5"
            }`}
          >
            <div className="font-medium">{s.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
