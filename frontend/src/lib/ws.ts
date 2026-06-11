const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ""

export interface VideoStatusMessage {
  video_id: string
  status: string
  progress: number
  video_url: string | null
  error: string | null
}

export interface VideoWsHandle {
  close: () => void
}

export function connectVideoWs(
  videoId: string,
  onStatus: (msg: VideoStatusMessage) => void,
  onError?: (err: Event) => void,
  onClose?: () => void,
): VideoWsHandle {
  let wsBase: string
  if (API_BASE) {
    wsBase = API_BASE.replace(/^http/, "ws")
  } else if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:"
    wsBase = `${proto}//${window.location.host}`
  } else {
    wsBase = "ws://localhost:5180"
  }

  const url = `${wsBase}/ws/video/${encodeURIComponent(videoId)}`

  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let closed = false
  let retryCount = 0
  const MAX_RETRIES = 5
  const BASE_DELAY = 2000

  function connect() {
    if (closed) return

    ws = new WebSocket(url)

    ws.onopen = () => {
      retryCount = 0
    }

    ws.onmessage = (ev: MessageEvent) => {
      try {
        const msg: VideoStatusMessage = JSON.parse(ev.data)
        onStatus(msg)
      } catch {
        // ignore unparseable messages
      }
    }

    ws.onerror = (ev: Event) => {
      onError?.(ev)
    }

    ws.onclose = () => {
      if (closed) {
        onClose?.()
        return
      }
      if (retryCount < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, retryCount)
        retryCount++
        reconnectTimer = setTimeout(connect, delay)
      } else {
        onClose?.()
      }
    }
  }

  connect()

  return {
    close: () => {
      closed = true
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      if (ws) {
        ws.close()
        ws = null
      }
    },
  }
}
