"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useToast } from "@/components/Toast"

interface Props {
  onUpload: (dataUri: string) => void
  onError?: (msg: string) => void
  emptyHint?: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ""
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/svg+xml"]
const MAX_FILE_SIZE_MB = 20

async function uploadToBackend(file: File): Promise<string> {
  const form = new FormData()
  form.append("file", file)
  const res = await fetch(`${API_BASE}/api/image/upload`, { method: "POST", body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "上传失败" }))
    throw new Error(err.detail || "上传失败")
  }
  const data = await res.json()
  return data.url as string
}

export default function ImageUploader({ onUpload, onError, emptyHint }: Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const previewUrlRef = useRef<string | null>(null)
  const toast = useToast()

  const handleFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error(`文件 ${file.name} 不是支持的图片格式，请上传 JPG/PNG/WebP/GIF 格式`)
        return
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast.error(`文件 ${file.name} 超过 ${MAX_FILE_SIZE_MB}MB 限制，请压缩后重试`)
        return
      }

      setLoading(true)
      const blobUrl = URL.createObjectURL(file)
      previewUrlRef.current = blobUrl
      setPreview(blobUrl)

      try {
        const url = await uploadToBackend(file)
        onUpload(url)
      } catch (err) {
        if (onError) onError(err instanceof Error ? err.message : "图片上传失败")
      } finally {
        setLoading(false)
      }
    },
    [onUpload, onError, toast]
  )

  const handleRemove = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setPreview(null)
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[#a1a1aa]">上传图片</label>
      <div
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
        onDragOver={(e) => e.preventDefault()}
        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 p-8 text-sm text-[#71717a] transition hover:border-[#a855f7]/50 hover:bg-[#a855f7]/5"
      >
        {loading && (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a855f7] border-t-transparent" />
            <span className="text-xs text-[#71717a]">上传中...</span>
          </div>
        )}
        {preview && !loading ? (
          <div className="relative">
            <img src={preview} alt="预览" className="max-h-48 rounded-xl object-contain shadow-sm" />
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleRemove()
              }}
              className="absolute -right-2 -top-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-[#ef4444] text-xs text-white shadow transition hover:bg-[#dc2626]"
            >
              ×
            </button>
          </div>
        ) : !loading ? (
          <>
            <div className="mb-2 text-3xl">📁</div>
            <p className="font-medium text-[#a1a1aa]">拖拽图片到此处</p>
            <p className="mt-1 text-xs text-[#71717a]">或</p>
            {emptyHint && <p className="mt-2 text-xs text-[#a855f7]/80">{emptyHint}</p>}
            <label className="mt-3 cursor-pointer rounded-lg bg-gradient-to-r from-[#a855f7] to-[#06b6d4] px-4 py-3 text-xs font-medium text-white shadow transition hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]">
              选择文件
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                }}
              />
            </label>
          </>
        ) : null}
      </div>
    </div>
  )
}
