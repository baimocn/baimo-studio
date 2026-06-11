"use client"

import { useState, useEffect, useCallback } from "react"
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

const STATUS_LABELS: Record<string, { text: string; className: string }> = {
  completed: { text: "完成", className: "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20" },
  pending: { text: "处理中", className: "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20" },
  failed: { text: "失败", className: "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20" },
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

export default function HistoryPage() {
  const [items, setItems] = useState<GenerationItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const limit = 20

  const loadPage = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.generations.list(p, limit)
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
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_favorite: res.is_favorite } : item
        )
      )
    } catch {
      // silently ignore
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除此记录？")) return
    try {
      await api.generations.delete(id)
      setItems((prev) => prev.filter((item) => item.id !== id))
      setTotal((prev) => prev - 1)
    } catch {
      // silently ignore
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#f5f5f5]">生成历史</h1>
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
            <path d="M12 8v4l3 3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="9" />
          </svg>
          <p className="text-[#a1a1aa]">暂无生成记录</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const statusInfo = STATUS_LABELS[item.status] || STATUS_LABELS.pending
            return (
              <div
                key={item.id}
                className="group rounded-2xl border border-white/[0.08] bg-[#18181b] p-4 transition hover:border-white/[0.15]"
              >
                <div className="flex gap-4">
                  {/* 缩略图 */}
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-[#0a0a0a] border border-white/[0.06]">
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
                          className="h-full w-full object-cover"
                        />
                      )
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#71717a]">
                          <rect x="3" y="3" width="18" height="18" rx="3" />
                          <circle cx="9" cy="10" r="2" />
                          <path d="M21 15l-5-5L5 21" strokeLinecap="round" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* 内容 */}
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm text-[#f5f5f5] line-clamp-2 leading-relaxed">
                      {item.prompt}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-xs text-[#a1a1aa]">
                        {TYPE_LABELS[item.type] || item.type}
                      </span>
                      <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-xs text-[#a1a1aa]">
                        {item.model}
                      </span>
                      <span className={`rounded-md border px-2 py-0.5 text-xs ${statusInfo.className}`}>
                        {statusInfo.text}
                      </span>
                      <span className="text-xs text-[#71717a]">
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => handleToggleFavorite(item.id)}
                      aria-label={item.is_favorite ? "取消收藏" : "收藏"}
                      className="rounded-lg p-1.5 text-[#71717a] transition hover:bg-white/5"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill={item.is_favorite ? "#f59e0b" : "none"}
                        stroke={item.is_favorite ? "#f59e0b" : "currentColor"}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      aria-label="删除"
                      className="rounded-lg p-1.5 text-[#71717a] transition hover:bg-[#ef4444]/10 hover:text-[#ef4444]"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
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
    </div>
  )
}
