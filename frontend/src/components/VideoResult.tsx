"use client"

import { useEffect, useRef, useState } from "react"
import { api } from "@/lib/api"

interface Props {
  url: string
  onReset?: () => void
  posterUrl?: string
}

export default function VideoResult({ url, onReset, posterUrl }: Props) {
  const [loadError, setLoadError] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Reset ready state when url changes
  useEffect(() => {
    setIsReady(false)
  }, [url])

  const handleDownload = () => {
    const downloadUrl = api.video.downloadUrl(url)
    const a = document.createElement("a")
    a.href = downloadUrl
    a.download = `baimo-video-${Date.now()}.mp4`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_0_30px_rgba(168,85,247,0.1)]">
        {loadError ? (
          <div className="flex h-48 items-center justify-center text-sm text-[#ef4444]">
            视频加载失败，请尝试重新生成
          </div>
        ) : (
          <div className="relative">
            {!isReady && (
              <div className="absolute inset-0 animate-pulse rounded-2xl bg-[#18181b] bg-[length:200%_100%] bg-gradient-to-r from-[#18181b] via-[#27272a] to-[#18181b]" />
            )}
            <video
              ref={videoRef}
              src={url}
              controls
              preload="metadata"
              {...(posterUrl ? { poster: posterUrl } : {})}
              className={`w-full transition-opacity duration-300 ${isReady ? "opacity-100" : "opacity-0"}`}
              onError={() => setLoadError(true)}
              onCanPlay={() => setIsReady(true)}
            />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span />
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#a855f7] to-[#06b6d4] px-4 py-2 text-sm font-medium text-white shadow transition hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
          >
            下载视频
          </button>
          {onReset && (
            <button
              onClick={onReset}
              className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-[#a1a1aa] transition hover:bg-white/5 hover:text-[#f5f5f5]"
            >
              重新生成
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
