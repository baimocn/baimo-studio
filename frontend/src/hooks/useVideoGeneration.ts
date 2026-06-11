"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import useSWRMutation from "swr/mutation"
import { api } from "@/lib/api"
import { getActiveVideos, saveActiveVideo, removeActiveVideo } from "@/lib/video-storage"

export interface VideoParams {
  width: number
  height: number
  num_frames: number
  frame_rate: number
}

export const DEFAULT_VIDEO_PARAMS: VideoParams = {
  width: 1152,
  height: 768,
  num_frames: 121,
  frame_rate: 24,
}

const MAX_POLL_DURATION_MS = 10 * 60 * 1000 // 10 分钟超时

interface UseVideoGenerationConfig {
  mutationKey: string
  buildCreateArgs: (params: {
    prompt: string
    videoParams: VideoParams
    negativePrompt: string
    seed: string
    numInferenceSteps: string
  }) => Parameters<typeof api.video.create>[0]
}

export function useVideoGeneration(config: UseVideoGenerationConfig) {
  const [prompt, setPrompt] = useState("")
  const [videoParams, setVideoParams] = useState<VideoParams>(DEFAULT_VIDEO_PARAMS)
  const [videoId, setVideoId] = useState<string | null>(null)
  const [taskCreated, setTaskCreated] = useState(false)
  const [negativePrompt, setNegativePrompt] = useState("")
  const [seed, setSeed] = useState("")
  const [numInferenceSteps, setNumInferenceSteps] = useState("")
  const [pollStartTime, setPollStartTime] = useState<number | null>(null)

  // #58: Restore active video from localStorage on mount
  useEffect(() => {
    const active = getActiveVideos()
    if (active.length > 0) {
      // Restore the most recent active video
      const latest = active[active.length - 1]
      setVideoId(latest.videoId)
      setTaskCreated(true)
      setPollStartTime(Date.now())
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { trigger, isMutating, error: createError } = useSWRMutation(
    config.mutationKey,
    () =>
      api.video.create(
        config.buildCreateArgs({
          prompt,
          videoParams,
          negativePrompt,
          seed,
          numInferenceSteps,
        })
      )
  )

  const shouldPoll = videoId && taskCreated

  const { data: statusData, error: pollError } = useSWR(
    shouldPoll ? `video-status-${videoId}` : null,
    () => api.video.status(videoId!),
    {
      refreshInterval: (data) => {
        // 超时保护：10 分钟后停止轮询
        if (pollStartTime && Date.now() - pollStartTime > MAX_POLL_DURATION_MS) return 0
        if (!data) return 5000
        if (data.status === "completed" || data.status === "failed") return 0
        return 5000
      },
      // 防止短时间内重复请求（5 秒内相同 key 的请求只发一次）
      dedupingInterval: 5000,
      // 失败时指数退避重试，最大间隔 30 秒，最多重试 10 次
      onErrorRetry: (error, _key, config, revalidate, { retryCount }) => {
        // completed/failed 状态下不再重试
        if (statusData?.status === "completed" || statusData?.status === "failed") return
        // 最多重试 10 次
        if (retryCount >= 10) return
        // 指数退避：1s, 2s, 4s, 8s, 16s, 30s(cap)...
        const delay = Math.min(1000 * 2 ** retryCount, 30000)
        setTimeout(() => revalidate({ retryCount }), delay)
      },
    }
  )

  const handleCreate = async () => {
    if (!prompt.trim()) return
    const res = await trigger()
    setVideoId(res.video_id)
    setTaskCreated(true)
    setPollStartTime(Date.now())
    // #58: Persist active video to localStorage
    saveActiveVideo(res.video_id, prompt)
  }

  const handleReset = () => {
    // #58: Remove from localStorage on explicit reset
    if (videoId) removeActiveVideo(videoId)
    setPrompt("")
    setVideoParams(DEFAULT_VIDEO_PARAMS)
    setVideoId(null)
    setTaskCreated(false)
    setNegativePrompt("")
    setSeed("")
    setNumInferenceSteps("")
    setPollStartTime(null)
  }

  // #58: Remove from localStorage when task reaches terminal state
  useEffect(() => {
    if (videoId && statusData && (statusData.status === "completed" || statusData.status === "failed")) {
      removeActiveVideo(videoId)
    }
  }, [videoId, statusData])

  return {
    prompt,
    setPrompt,
    videoParams,
    setVideoParams,
    negativePrompt,
    setNegativePrompt,
    seed,
    setSeed,
    numInferenceSteps,
    setNumInferenceSteps,
    isMutating,
    createError,
    taskCreated,
    statusData,
    pollError,
    handleCreate,
    handleReset,
  }
}
