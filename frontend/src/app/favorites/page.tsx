"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import ErrorDisplay from "@/components/ErrorDisplay"

interface GenerationItem {
  id: number
  prompt: string
  type: string
  model: string
  result_url: string | null
  params: string | null
  is_favorite: boolean
  status: string
  created_at: string | null
}

const TYPE_LABELS: Record<string, string> = {
  image: "图片",
  video: "视频",
}

function formatDate(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function FavoritesPage() {
  const [items, setItems] = useState<GenerationItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<GenerationItem | null>(null)
  const limit = 20

  const loadPage = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.generations.listFavorites(p, limit)
      setItems(res.items)
      setTotal(res.total)
      setPage(res.page)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    loadPage(1)
  }, [loadPage])

  const handleToggleFavorite = async (id: number) => {
    try {
      const res = await api.generations.toggleFavorite(id)
      if (!res.is_favorite) {
        // Remove from favorites list when unfavorited
        setItems((prev) => prev.filter((item) => item.id !== id))
        setTotal((prev) => prev - 1)
        if (selectedItem?.id === id) setSelectedItem(null)
      } else {
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, is_favorite: res.is_favorite } : item
          )
        )
      }
    } catch {
      // silently ignore
    }
  }

  const handleDownload = async (item: GenerationItem) => {
    if (!item.result_url) return
    try {
      const res = await fetch(item.result_url)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const isVideo = item.type === "video"
      const prefix = item.prompt?.replace(/[^a-zA-Z0-9一-鿿]/g, "").slice(0, 20) || (isVideo ? "video" : "image")
      const ext = isVideo ? "mp4" : item.result_url.match(/\.(png|jpe?g|webp|gif)/i)?.[1] || "png"
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = `baimo-${prefix}-${Date.now()}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(item.result_url, "_blank")
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#f5f5f5]">我的收藏</h1>
        <span className="text-sm text-[#71717a]">共 {total} 条记录</span>
      </div>

      {error && (
        <ErrorDisplay message={error} onRetry={() => loadPage(page)} />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#a855f7] border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-[#18181b] py-20">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#71717a] mb-4">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <p className="text-[#a1a1aa] mb-2">暂无收藏记录</p>
          <Link href="/history" className="text-sm text-[#a855f7] hover:underline">
            去历史页面收藏
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-2xl border border-white/[0.08] bg-[#18181b] overflow-hidden transition hover:border-white/[0.15] hover:shadow-[0_0_20px_rgba(168,85,247,0.1)] cursor-pointer"
              onClick={() => setSelectedItem(item)}
            >
              {/* 缩略图 */}
              <div className="aspect-square overflow-hidden bg-[#0a0a0a]">
                {item.result_url ? (
                  item.type === "video" ? (
                    <video
                      src={item.result_url}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={item.result_url}
                      alt={item.prompt}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  )
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#71717a]">
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                      <circle cx="9" cy="10" r="2" />
                      <path d="M21 15l-5-5L5 21" strokeLinecap="round" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Prompt 信息 */}
              <div className="p-3">
                <p className="text-xs text-[#a1a1aa] line-clamp-2 leading-relaxed">
                  {item.prompt}
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-[#71717a]">
                    {TYPE_LABELS[item.type] || item.type}
                  </span>
                  <span className="text-[10px] text-[#71717a]">
                    {formatDate(item.created_at)}
                  </span>
                </div>
              </div>

              {/* 悬浮操作 */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggleFavorite(item.id)
                  }}
                  aria-label="取消收藏"
                  className="rounded-lg bg-black/60 p-1.5 text-[#f59e0b] backdrop-blur-sm transition hover:bg-black/80"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => loadPage(page - 1)}
            disabled={page <= 1}
            className="rounded-lg border border-white/[0.08] bg-[#18181b] px-3 py-1.5 text-sm text-[#a1a1aa] transition hover:border-white/[0.15] hover:text-[#f5f5f5] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <span className="text-sm text-[#71717a]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => loadPage(page + 1)}
            disabled={page >= totalPages}
            className="rounded-lg border border-white/[0.08] bg-[#18181b] px-3 py-1.5 text-sm text-[#a1a1aa] transition hover:border-white/[0.15] hover:text-[#f5f5f5] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
      )}

      {/* 详情弹窗 */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-white/[0.08] bg-[#18181b] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-3 right-3 z-10 rounded-lg bg-black/50 p-1.5 text-[#a1a1aa] backdrop-blur-sm transition hover:text-[#f5f5f5]"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="4" x2="16" y2="16" />
                <line x1="16" y1="4" x2="4" y2="16" />
              </svg>
            </button>

            {/* 媒体内容 */}
            <div className="bg-[#0a0a0a]">
              {selectedItem.result_url ? (
                selectedItem.type === "video" ? (
                  <video
                    src={selectedItem.result_url}
                    controls
                    className="w-full max-h-[60vh] object-contain"
                  />
                ) : (
                  <img
                    src={selectedItem.result_url}
                    alt={selectedItem.prompt}
                    className="w-full max-h-[60vh] object-contain"
                  />
                )
              ) : (
                <div className="flex h-48 items-center justify-center text-[#71717a]">
                  暂无内容
                </div>
              )}
            </div>

            {/* 详情信息 */}
            <div className="p-5 space-y-4">
              <p className="text-sm text-[#f5f5f5] leading-relaxed">
                {selectedItem.prompt}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-xs text-[#a1a1aa]">
                  {TYPE_LABELS[selectedItem.type] || selectedItem.type}
                </span>
                <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-xs text-[#a1a1aa]">
                  {selectedItem.model}
                </span>
                <span className="text-xs text-[#71717a]">
                  {formatDate(selectedItem.created_at)}
                </span>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleDownload(selectedItem)}
                  disabled={!selectedItem.result_url}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#a855f7] to-[#06b6d4] px-4 py-2 text-sm font-medium text-white shadow transition hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  下载
                </button>
                <button
                  onClick={() => handleToggleFavorite(selectedItem.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-[#f59e0b] transition hover:bg-white/5"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  取消收藏
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
