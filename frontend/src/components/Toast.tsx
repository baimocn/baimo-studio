"use client"

import { createContext, useCallback, useContext, useState, useRef } from "react"

type ToastType = "success" | "error" | "info"

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  success: (msg: string) => void
  error: (msg: string) => void
  info: (msg: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const STYLES: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: "bg-[#22c55e]/10", border: "border-[#22c55e]/20", text: "text-[#22c55e]", icon: "✓" },
  error: { bg: "bg-[#ef4444]/10", border: "border-[#ef4444]/20", text: "text-[#ef4444]", icon: "✗" },
  info: { bg: "bg-[#06b6d4]/10", border: "border-[#06b6d4]/20", text: "text-[#06b6d4]", icon: "ⓘ" },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = nextId.current++
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const ctx: ToastContextValue = {
    success: (msg) => addToast("success", msg),
    error: (msg) => addToast("error", msg),
    info: (msg) => addToast("info", msg),
  }

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((toast) => {
          const style = STYLES[toast.type]
          return (
            <div
              key={toast.id}
              aria-atomic="true"
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-sm animate-toast-in ${style.bg} ${style.border} ${style.text}`}
            >
              <span className="flex-shrink-0 text-base font-bold">{style.icon}</span>
              <span className="flex-1">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center opacity-60 hover:opacity-100 transition"
                aria-label="关闭通知"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // Fallback for when used outside ToastProvider (e.g. during SSR)
    return {
      success: () => {},
      error: (msg) => { if (typeof window !== "undefined") alert(msg) },
      info: () => {},
    }
  }
  return ctx
}
