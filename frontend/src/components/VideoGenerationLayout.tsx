"use client"

import { useEffect, useCallback } from "react"
import Link from "next/link"
import PromptInput from "@/components/PromptInput"
import SizeSelector from "@/components/SizeSelector"
import TaskStatus from "@/components/TaskStatus"
import VideoResult from "@/components/VideoResult"
import ErrorDisplay from "@/components/ErrorDisplay"
import type { VideoParams } from "@/hooks/useVideoGeneration"

interface NavLink { href: string; label: string }

interface Props {
  title: string
  navLinks?: NavLink[]
  promptPlaceholder?: string
  videoParams: VideoParams
  onVideoParamsChange: (params: VideoParams) => void
  prompt: string
  onPromptChange: (val: string) => void
  advancedOptionsSlot?: React.ReactNode
  uploaderSlot?: React.ReactNode
  isMutating: boolean
  createError?: Error | null
  taskCreated: boolean
  statusData?: { status: string; progress: number; video_url: string | null; error?: string } | null
  pollError?: Error | null
  onCreate: () => void
  onReset: () => void
  createButtonText?: string
  onOptimize?: (userInput: string, type: string) => Promise<string>
  onOptimizeStream?: (userInput: string, type: string, onChunk: (chunk: string) => void) => Promise<void>
  onError?: (msg: string) => void
}

export default function VideoGenerationLayout({
  title, navLinks, promptPlaceholder, videoParams, onVideoParamsChange,
  prompt, onPromptChange, advancedOptionsSlot, uploaderSlot,
  isMutating, createError, taskCreated, statusData, pollError,
  onCreate, onReset, createButtonText = "生成视频", onOptimize, onOptimizeStream, onError,
}: Props) {
  // #42b: Ctrl+Enter / Cmd+Enter keyboard shortcut to trigger generation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !taskCreated && !isMutating && prompt.trim()) {
      e.preventDefault()
      onCreate()
    }
  }, [taskCreated, isMutating, prompt, onCreate])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  // #38: Estimate completion time based on video duration (num_frames / frame_rate)
  const durationSeconds = videoParams.num_frames / videoParams.frame_rate
  let estimatedTime: string | null = null
  if (durationSeconds <= 4) {
    estimatedTime = "预计 1-2 分钟"
  } else if (durationSeconds <= 8) {
    estimatedTime = "预计 2-3 分钟"
  } else if (durationSeconds <= 14) {
    estimatedTime = "预计 4-6 分钟"
  } else {
    estimatedTime = "预计 8-12 分钟"
  }

  if (statusData?.status === "completed" && statusData.video_url) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-[#f5f5f5]">{title}</h1>
        <VideoResult url={statusData.video_url} />
        <button
          onClick={onReset}
          className="w-full rounded-xl border border-white/[0.08] py-2.5 text-sm text-[#a1a1aa] transition hover:bg-white/5"
        >
          重新生成
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#f5f5f5]">{title}</h1>
        {navLinks && navLinks.length > 0 && (
          <div className="flex gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-[#71717a] transition hover:bg-white/5 hover:text-[#a1a1aa]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {uploaderSlot}
      <PromptInput
        value={prompt}
        onChange={onPromptChange}
        type="video"
        placeholder={promptPlaceholder}
        onOptimize={onOptimize}
        onOptimizeStream={onOptimizeStream}
        onError={onError}
      />
      <SizeSelector
        value=""
        onChange={() => {}}
        type="video"
        videoParams={videoParams}
        onVideoParamsChange={onVideoParamsChange}
      />

      {advancedOptionsSlot}

      {!taskCreated ? (
        <>
          {createError && (
            <ErrorDisplay message={createError.message} onRetry={onCreate} prefix="创建失败" />
          )}
          <button
            onClick={onCreate}
            disabled={isMutating || !prompt.trim()}
            className="w-full rounded-xl bg-gradient-to-r from-[#a855f7] to-[#06b6d4] py-3 text-sm font-medium text-white shadow-lg shadow-[#a855f7]/25 transition hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] disabled:opacity-50"
          >
            {isMutating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                创建任务...
              </span>
            ) : createButtonText}
          </button>
        </>
      ) : (
        <div className="space-y-4">
          {pollError && (
            <ErrorDisplay message={pollError.message} onRetry={onCreate} prefix="查询失败" />
          )}
          <TaskStatus status={statusData?.status || "queued"} progress={statusData?.progress || 0} />
          {estimatedTime && statusData?.status !== "completed" && statusData?.status !== "failed" && (
            <p className="text-center text-xs text-[#71717a]">{estimatedTime}</p>
          )}
          {statusData?.error && (
            <ErrorDisplay message={statusData.error} onRetry={onReset} prefix="任务失败" />
          )}
          {statusData?.status === "failed" && (
            <button onClick={onReset} className="w-full rounded-xl border border-white/[0.08] py-2.5 text-sm text-[#a1a1aa] transition hover:bg-white/5">重试</button>
          )}
        </div>
      )}
    </div>
  )
}
