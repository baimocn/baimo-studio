"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { api } from "@/lib/api"

export default function SettingsPage() {
  const [masked, setMasked] = useState("")
  const [newKey, setNewKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  const { data: stats, isLoading: statsLoading } = useSWR(
    "stats",
    () => api.stats.get(),
    { revalidateOnFocus: false }
  )

  useEffect(() => {
    api.settings.getApiKey().then((res) => setMasked(res.api_key_masked)).catch(() => {})
  }, [])

  const handleSave = async () => {
    if (!newKey.trim()) return
    setLoading(true)
    setMessage(null)
    try {
      const res = await api.settings.updateApiKey(newKey.trim())
      setMasked(res.api_key_masked)
      setNewKey("")
      setMessage({ type: "ok", text: "API Key 已更新" })
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : "更新失败"
      setMessage({ type: "err", text })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-[#f5f5f5]">设置</h1>

      <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#18181b] p-6">
        <h2 className="text-base font-semibold text-[#f5f5f5]">API Key</h2>
        <div className="rounded-lg bg-[#0a0a0a] border border-white/[0.08] px-4 py-3 text-sm text-[#a1a1aa]">
          当前 Key：<span className="font-mono font-medium text-[#f5f5f5]">{masked || "未设置"}</span>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="api-key-input" className="text-sm font-medium text-[#a1a1aa]">新的 API Key</label>
          <div className="relative">
            <input
              id="api-key-input"
              type={showKey ? "text" : "password"}
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="sk-..."
              className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 pr-16 text-sm text-[#f5f5f5] outline-none transition placeholder:text-[#71717a] focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/20"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              aria-label={showKey ? "隐藏 API Key" : "显示 API Key"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-[#71717a] hover:bg-white/5"
            >
              {showKey ? "隐藏" : "显示"}
            </button>
          </div>
        </div>

        {message && (
          <div className={`rounded-lg px-4 py-2.5 text-sm ${
            message.type === "ok" ? "bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20" : "bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20"
          }`}>
            {message.text}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={loading || !newKey.trim()}
          aria-label="保存 API Key"
          className="w-full rounded-xl bg-gradient-to-r from-[#a855f7] to-[#06b6d4] py-2.5 text-sm font-medium text-white shadow transition hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-50"
        >
          {loading ? "保存中..." : "保存"}
        </button>
      </div>

      {/* 用量统计卡片 */}
      <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#18181b] p-6">
        <h2 className="text-base font-semibold text-[#f5f5f5]">用量统计</h2>
        {statsLoading ? (
          <div className="flex items-center gap-2 py-4">
            <svg className="h-4 w-4 animate-spin text-[#a855f7]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm text-[#71717a]">加载中...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "总生成次数", value: stats?.total_generations ?? 0 },
              { label: "图片次数", value: stats?.image_count ?? 0 },
              { label: "视频次数", value: stats?.video_count ?? 0 },
              { label: "今日次数", value: stats?.today_count ?? 0 },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-[#0a0a0a] border border-white/[0.08] px-4 py-3">
                <div className="text-2xl font-bold text-[#f5f5f5]">{item.value}</div>
                <div className="text-xs text-[#71717a]">{item.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
