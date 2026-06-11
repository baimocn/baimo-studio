"use client"

import { useCallback, useRef, useState } from "react"
import { useToast } from "@/components/Toast"

interface Props {
  onUpload: (dataUris: string[]) => void
  maxFiles?: number
  maxFileSizeMB?: number
}

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/svg+xml"]

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function MultiImageUploader({ onUpload, maxFiles = 10, maxFileSizeMB = 10 }: Props) {
  const [previews, setPreviews] = useState<{ url: string; dataUri: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const blobUrlsRef = useRef<string[]>([])
  const toast = useToast()

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setLoading(true)
      setError(null)
      const newEntries: { url: string; dataUri: string }[] = []
      for (const file of Array.from(files)) {
        if (previews.length + newEntries.length >= maxFiles) break
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          toast.error(`文件 ${file.name} 不是支持的图片格式，请上传 JPG/PNG/WebP/GIF 格式`)
          continue
        }
        if (file.size > maxFileSizeMB * 1024 * 1024) {
          toast.error(`文件 ${file.name} 超过 ${maxFileSizeMB}MB 限制，请压缩后重试`)
          continue
        }
        const blobUrl = URL.createObjectURL(file)
        blobUrlsRef.current.push(blobUrl)
        try {
          const dataUri = await fileToDataUri(file)
          newEntries.push({ url: blobUrl, dataUri })
        } catch {
          URL.revokeObjectURL(blobUrl)
        }
      }
      const updated = [...previews, ...newEntries]
      setPreviews(updated)
      onUpload(updated.map((e) => e.dataUri))
      setLoading(false)
    },
    [previews, maxFiles, maxFileSizeMB, onUpload, toast]
  )

  const handleRemove = useCallback(
    (index: number) => {
      const removed = previews[index]
      if (removed) URL.revokeObjectURL(removed.url)
      const updated = previews.filter((_, i) => i !== index)
      setPreviews(updated)
      setError(null)
      onUpload(updated.map((e) => e.dataUri))
    },
    [previews, onUpload]
  )

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[#a1a1aa]">
        上传图片（已选 {previews.length} 张）
      </label>

      {error && (
        <div className="rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 px-3 py-2 text-xs text-[#ef4444]">
          {error}
        </div>
      )}

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {previews.map((p, i) => (
            <div key={i} className="relative group">
              <img src={p.url} alt={`图片 ${i + 1}`} className="h-32 w-full rounded-xl object-cover shadow-sm border border-white/[0.08]" />
              <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#a855f7] text-xs text-white font-medium">
                {i + 1}
              </span>
              <button
                aria-label={`删除图片 ${i + 1}`}
                onClick={() => handleRemove(i)}
                className="absolute -right-1.5 -top-1.5 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-[#ef4444] text-xs text-white shadow opacity-0 group-hover:opacity-100 transition hover:bg-[#dc2626]"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {previews.length < maxFiles && (
        <div
          onDrop={(e) => {
            e.preventDefault()
            handleFiles(e.dataTransfer.files)
          }}
          onDragOver={(e) => e.preventDefault()}
          className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 p-6 text-sm text-[#71717a] transition hover:border-[#a855f7]/50 hover:bg-[#a855f7]/5"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a855f7] border-t-transparent" />
              <span className="text-xs text-[#71717a]">读取中...</span>
            </div>
          ) : (
            <>
              <div className="mb-2 text-2xl">📁</div>
              <p className="font-medium text-[#a1a1aa]">拖拽图片到此处</p>
              <p className="mt-1 text-xs text-[#71717a]">或</p>
              <label className="mt-2 cursor-pointer rounded-lg bg-gradient-to-r from-[#a855f7] to-[#06b6d4] px-4 py-3 text-xs font-medium text-white shadow transition hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                选择文件
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFiles(e.target.files)
                  }}
                />
              </label>
              <p className="mt-2 text-xs text-[#71717a]">最多 {maxFiles} 张，单张 ≤ {maxFileSizeMB}MB</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
