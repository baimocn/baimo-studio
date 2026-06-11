const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ""

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  429: "请求过于频繁，请稍后重试",
}

function getDefaultMessage(status: number): string {
  if (STATUS_MESSAGES[status]) return STATUS_MESSAGES[status]
  if (status >= 500) return "服务器繁忙，请稍后重试"
  if (status === 0) return "请求超时，请检查网络连接"
  return `请求失败 (${status})`
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 120000)

  try {
    const res = await fetch(`${API_BASE}${url}`, { ...options, headers, signal: controller.signal })
    clearTimeout(timeoutId)

    if (!res.ok) {
      let message = getDefaultMessage(res.status)
      try {
        const errBody = await res.json()
        if (typeof errBody.detail === "string") {
          message = errBody.detail
        } else if (Array.isArray(errBody.detail)) {
          message = errBody.detail.map((d: { msg: string }) => d.msg).join("; ")
        }
      } catch {
        // keep default message
      }
      throw new ApiError(res.status, message)
    }
    return res.json()
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(0, "请求超时，请检查网络连接")
    }
    throw err
  }
}

export const api = {
  settings: {
    getApiKey: () =>
      request<{ api_key_masked: string }>("/api/settings/api-key"),
    updateApiKey: (api_key: string) =>
      request<{ ok: boolean; api_key_masked: string }>("/api/settings/api-key", {
        method: "PUT",
        body: JSON.stringify({ api_key }),
      }),
  },
  image: {
    generate: (data: { prompt: string; size: string; model: string; negative_prompt?: string }) =>
      request<{ url: string; model: string }>("/api/image/generate", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    edit: (data: { prompt: string; size: string; model: string; image_url: string; negative_prompt?: string }) =>
      request<{ url: string; model: string }>("/api/image/edit", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    compose: (data: { prompt: string; size: string; image_urls: string[] }) =>
      request<{ url: string; model: string }>("/api/image/compose", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    batchGenerate: (data: { prompt: string; size: string; model: string; num_images: number; seed?: number }) =>
      request<{ results: { url: string; model: string; seed: number }[]; total: number }>("/api/image/batch-generate", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    downloadUrl: (url: string) =>
      `${API_BASE}/api/image/download?url=${encodeURIComponent(url)}`,
  },
  video: {
    create: (data: {
      prompt: string
      image_url?: string | string[]
      mode?: string
      height?: number
      width?: number
      num_frames?: number
      frame_rate?: number
      negative_prompt?: string
      seed?: number
      num_inference_steps?: number
    }) =>
      request<{ video_id: string; task_id: string; status: string }>("/api/video/create", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    status: (videoId: string) =>
      request<{ video_id: string; status: string; progress: number; video_url: string | null; error?: string }>(
        `/api/video/status/${videoId}`
      ),
    downloadUrl: (url: string) =>
      `${API_BASE}/api/video/download?url=${encodeURIComponent(url)}`,
  },
  prompt: {
    optimize: (data: { user_input: string; type: string }) =>
      request<{ optimized: string; original: string }>("/api/prompt/optimize", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    optimizeStream: async function* (
      userInput: string,
      type: string,
      signal?: AbortSignal
    ): AsyncGenerator<string> {
      const res = await fetch(`${API_BASE}/api/prompt/optimize-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_input: userInput, type }),
        signal,
      })
      if (!res.ok || !res.body) {
        throw new ApiError(res.status, "流式请求失败")
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = line.slice(6)
          if (data === "[DONE]") return
          try {
            const parsed = JSON.parse(data)
            if (parsed.chunk) yield parsed.chunk
            if (parsed.error) throw new Error(parsed.error)
          } catch (e) {
            if (e instanceof Error && e.message !== "Unexpected end of JSON input") throw e
          }
        }
      }
    },
    analyzeImage: (data: { image_url: string; instruction?: string }) =>
      request<{ analysis: string }>("/api/prompt/analyze-image", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  models: {
    list: () =>
      request<{
        image: { id: string; name: string; description: string; capabilities: string[] }[]
        video: { id: string; name: string; description: string; capabilities: string[] }[]
      }>("/api/models"),
  },
  stats: {
    get: () =>
      request<{
        total_generations: number
        image_count: number
        video_count: number
        today_count: number
        favorite_count: number
      }>("/api/stats"),
  },
  workflow: {
    analyzeAndGenerate: (data: {
      image_url: string
      style_modifiers?: string
      size?: string
      model?: string
    }) =>
      request<{
        original_analysis: string
        optimized_prompt: string
        generated_url: string
      }>("/api/workflow/analyze-and-generate", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  generations: {
    list: (page: number = 1, limit: number = 20) =>
      request<{
        items: {
          id: number
          prompt: string
          type: string
          model: string
          result_url: string | null
          params: string | null
          is_favorite: boolean
          status: string
          created_at: string | null
        }[]
        total: number
        page: number
        limit: number
      }>(`/api/generations?page=${page}&limit=${limit}`),
    get: (id: number) =>
      request<{
        id: number
        prompt: string
        type: string
        model: string
        result_url: string | null
        params: string | null
        is_favorite: boolean
        status: string
        created_at: string | null
      }>(`/api/generations/${id}`),
    listFavorites: (page: number = 1, limit: number = 20) =>
      request<{
        items: {
          id: number
          prompt: string
          type: string
          model: string
          result_url: string | null
          params: string | null
          is_favorite: boolean
          status: string
          created_at: string | null
        }[]
        total: number
        page: number
        limit: number
      }>(`/api/generations/favorites?page=${page}&limit=${limit}`),
    toggleFavorite: (id: number) =>
      request<{ id: number; is_favorite: boolean }>(`/api/generations/${id}/favorite`, {
        method: "PUT",
      }),
    delete: (id: number) =>
      request<{ ok: boolean }>(`/api/generations/${id}`, {
        method: "DELETE",
      }),
  },
}
