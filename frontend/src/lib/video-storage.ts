/**
 * localStorage persistence for active video generation tasks.
 * Stores active videos so polling can resume after page refresh.
 *
 * Storage format: [{ videoId, prompt, createdAt }]
 */

export interface ActiveVideo {
  videoId: string
  prompt: string
  createdAt: number
}

const STORAGE_KEY = "agnes_active_videos"

/**
 * Read all active videos from localStorage.
 * Returns an empty array if nothing is stored or data is corrupted.
 */
export function getActiveVideos(): ActiveVideo[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as ActiveVideo[]
  } catch {
    return []
  }
}

/**
 * Save a new active video entry. If the videoId already exists, it is not duplicated.
 */
export function saveActiveVideo(videoId: string, prompt: string): void {
  if (typeof window === "undefined") return
  const existing = getActiveVideos()
  if (existing.some((v) => v.videoId === videoId)) return
  existing.push({ videoId, prompt, createdAt: Date.now() })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
}

/**
 * Remove a video entry by videoId.
 */
export function removeActiveVideo(videoId: string): void {
  if (typeof window === "undefined") return
  const existing = getActiveVideos()
  const filtered = existing.filter((v) => v.videoId !== videoId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}
