/**
 * 统一下载工具 — 自动适配桌面客户端（原生保存对话框）和浏览器（fetch+blob）
 */

declare global {
  interface Window {
    pywebview?: {
      api: {
        save_file: (url: string, filename: string) => Promise<{ ok: boolean; path?: string; error?: string }>
        open_folder: (path: string) => Promise<{ ok: boolean; error?: string }>
      }
    }
  }
}

function isDesktop(): boolean {
  return typeof window !== "undefined" && !!window.pywebview?.api?.save_file
}

/**
 * 下载文件。
 * - 桌面端：弹出原生保存对话框，由 Python 下载并写入磁盘
 * - 浏览器：fetch + blob + <a> download
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  if (isDesktop()) {
    // 桌面端：调用原生桥接
    const result = await window.pywebview!.api.save_file(url, filename)
    if (!result.ok) {
      if (result.error !== "用户取消") {
        throw new Error(result.error || "保存失败")
      }
      return
    }
    // 下载完成，不打开文件夹（避免干扰）
  } else {
    // 浏览器：fetch + blob
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  }
}
