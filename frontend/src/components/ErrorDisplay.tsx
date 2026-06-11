"use client"

import { getErrorType, errorTypeIcons, errorTypeLabels } from "@/lib/error-utils"

interface Props {
  message: string
  onRetry?: () => void
  prefix?: string
  className?: string
}

export default function ErrorDisplay({ message, onRetry, prefix, className }: Props) {
  const type = getErrorType(message)
  const icon = errorTypeIcons[type]
  const label = errorTypeLabels[type]
  const displayMessage = prefix ? `${prefix}：${message}` : message

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={className ?? "rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 px-4 py-3 text-sm text-[#ef4444]"}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox={icon.viewBox} strokeLinecap="round" strokeLinejoin="round">
            <path d={icon.path} />
          </svg>
          <span>{label}：{displayMessage}</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-3 shrink-0 rounded-lg border border-[#ef4444]/30 px-3 py-1 text-xs text-[#ef4444] transition hover:bg-[#ef4444]/10"
          >
            重试
          </button>
        )}
      </div>
    </div>
  )
}
