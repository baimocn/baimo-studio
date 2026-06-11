export type GenerationType = "image" | "video"

export type ImageModel = "agnes-image-2.1-flash" | "agnes-image-2.0-flash"

export type VideoStatus = "queued" | "in_progress" | "completed" | "failed"

export interface ImageResult {
  url: string
  model: string
}

export interface VideoTask {
  video_id: string
  task_id: string
  status: VideoStatus
}

export interface VideoStatusResult {
  video_id: string
  status: VideoStatus
  progress: number
  video_url: string | null
}
