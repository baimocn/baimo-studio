"use client"

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"

interface Props {
  status: string
  progress: number
}

const statusLabels: Record<string, string> = {
  queued: "排队中",
  in_progress: "生成中",
  completed: "已完成",
  failed: "生成失败",
}

const statusIcons: Record<string, string> = {
  queued: "⏳",
  in_progress: "⚡",
  completed: "✅",
  failed: "❌",
}

export default function TaskStatus({ status, progress }: Props) {
  const barRef = useRef<HTMLDivElement>(null)
  const startTimeRef = useRef<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const label = statusLabels[status] || status
  const icon = statusIcons[status] || "⏳"

  useEffect(() => {
    if (status === "in_progress") {
      if (!startTimeRef.current) startTimeRef.current = Date.now()
      const id = setInterval(() => {
        if (startTimeRef.current) setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
      return () => clearInterval(id)
    }
    if (status === "completed" || status === "failed") {
      // keep final elapsed value
    }
  }, [status])

  useEffect(() => {
    if (!barRef.current) return
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced) return  // 跳过动画

    gsap.to(barRef.current, { width: `${progress}%`, duration: 0.5, ease: "power2.out" })
  }, [progress])

  return (
    <div className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#18181b] p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2" aria-live="polite">
          <span>{icon}</span>
          <span className="text-sm font-medium text-[#a1a1aa]">{label}</span>
          {elapsed > 0 && (
            <span className="text-xs text-[#71717a]">
              ({Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")})
            </span>
          )}
        </div>
        <span className="text-sm font-medium text-[#a855f7]">{progress}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-[#27272a]"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          ref={barRef}
          className="h-full rounded-full bg-gradient-to-r from-[#a855f7] to-[#06b6d4] transition-all"
          style={{
            width: `${progress}%`,
            animation: status === "in_progress" ? "progress-glow 2s ease-in-out infinite" : undefined,
          }}
        />
      </div>
      {status === "in_progress" && (
        <p className="text-xs text-[#71717a]">视频生成中，请耐心等待...</p>
      )}
      {status === "queued" && (
        <p className="text-xs text-[#71717a]">任务排队中，即将开始生成...</p>
      )}
      {status === "failed" && (
        <p className="text-sm text-[#ef4444]">生成失败，请重试</p>
      )}
    </div>
  )
}
