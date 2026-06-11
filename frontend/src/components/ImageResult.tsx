"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import gsap from "gsap"
import { api } from "@/lib/api"

interface Props {
  url: string
  model: string
  onReset: () => void
  prompt?: string
  id?: number
  isFavorite?: boolean
  onFavoriteToggle?: (id: number, isFavorite: boolean) => void
}

export default function ImageResult({ url, model, onReset, prompt, id, isFavorite, onFavoriteToggle }: Props) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [loadError, setLoadError] = useState(false)
  const [favorite, setFavorite] = useState(isFavorite ?? false)
  const [favLoading, setFavLoading] = useState(false)

  useEffect(() => {
    setFavorite(isFavorite ?? false)
  }, [isFavorite])

  useEffect(() => {
    if (!imgRef.current) return
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced) return  // 跳过动画

    setLoadError(false)
    gsap.fromTo(imgRef.current,
      { filter: "blur(20px)", opacity: 0, scale: 1.02 },
      { filter: "blur(0px)", opacity: 1, scale: 1, duration: 0.8, ease: "power2.out" }
    )
  }, [url])

  const handleToggleFavorite = async () => {
    if (!id || favLoading) return
    setFavLoading(true)
    try {
      const res = await api.generations.toggleFavorite(id)
      setFavorite(res.is_favorite)
      onFavoriteToggle?.(id, res.is_favorite)
    } catch {
      // silently ignore
    } finally {
      setFavLoading(false)
    }
  }

  const handleDownload = async () => {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const ext = url.match(/\.(png|jpe?g|webp|gif)/i)?.[1] || "png"
      const prefix = prompt?.replace(/[^a-zA-Z0-9一-鿿]/g, "").slice(0, 20) || "image"
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = `baimo-${prefix}-${Date.now()}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      // 降级：直接打开链接
      window.open(url, "_blank")
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_0_30px_rgba(168,85,247,0.1)]">
        {loadError ? (
          <div className="flex h-48 items-center justify-center text-sm text-[#ef4444]">
            图片加载失败，请尝试重新生成
          </div>
        ) : (
          <div className="relative w-full" style={{ aspectRatio: "4/3" }}>
            <Image
              ref={imgRef}
              src={url}
              alt="生成结果"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 720px"
              className="object-contain"
              unoptimized
              onError={() => setLoadError(true)}
            />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-[#18181b] border border-white/[0.08] px-3 py-1 text-xs text-[#71717a]">{model}</span>
        <div className="flex gap-2">
          {id !== undefined && (
            <button
              onClick={handleToggleFavorite}
              disabled={favLoading}
              aria-label={favorite ? "取消收藏" : "收藏"}
              className="rounded-lg border border-white/[0.08] px-3 py-2 text-sm transition hover:bg-white/5 hover:text-[#f5f5f5] disabled:opacity-40"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill={favorite ? "#f59e0b" : "none"}
                stroke={favorite ? "#f59e0b" : "currentColor"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          )}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#a855f7] to-[#06b6d4] px-4 py-2 text-sm font-medium text-white shadow transition hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
          >
            下载图片
          </button>
          <button
            onClick={onReset}
            className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-[#a1a1aa] transition hover:bg-white/5 hover:text-[#f5f5f5]"
          >
            重新生成
          </button>
        </div>
      </div>
    </div>
  )
}
