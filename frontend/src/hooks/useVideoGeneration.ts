"use client"

import { useState, useEffect, useCallback } from "react"
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

const MAX_POLL_DURATION_MS = 10 * 60 * 1000 // 10 minutes timeout
const MAX_RETRIES = 3

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
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const active = getActiveVideos()
    if (active.length > 0) {
      const latest = active[active.length - 1]
      setVideoId(latest.videoId)
      setTaskCreated(true)
      setPollStartTime(Date.now())
    }
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
        if (pollStartTime && Date.now() - pollStartTime > MAX_POLL_DURATION_MS) return 0
        if (!data) return 10000
        if (data.status === "completed" || data.status === "failed") return 0
        return 10000
      },
      dedupingInterval: 8000,
      onErrorRetry: (error, _key, config, revalidate, { retryCount }) => {
        if (statusData?.status === "completed" || statusData?.status === "failed") return
        if (retryCount >= 10) return
        const delay = Math.min(2000 * 2 ** retryCount, 60000)
        setTimeout(() => revalidate({ retryCount }), delay)
      },
    }
  )

  const handleCreate = useCallback(async () => {
    if (!prompt.trim()) return
    
    try {
      const res = await trigger()
      setVideoId(res.video_id)
      setTaskCreated(true)
      setPollStartTime(Date.now())
      setRetryCount(0)
      saveActiveVideo(res.video_id, prompt)
    } catch (err) {
      console.error("Video creation failed:", err)
    }
  }, [trigger, prompt])

  const handleRetry = useCallback(async () => {
    if (retryCount >= MAX_RETRIES) {
      setRetryCount(0)
      handleReset()
      return
    }
    
    setRetryCount(prev => prev + 1)
    await handleCreate()
  }, [retryCount, handleCreate])

  const handleReset = useCallback(() => {
    if (videoId) removeActiveVideo(videoId)
    setPrompt("")
    setVideoParams(DEFAULT_VIDEO_PARAMS)
    setVideoId(null)
    setTaskCreated(false)
    setNegativePrompt("")
    setSeed("")
    setNumInferenceSteps("")
    setPollStartTime(null)
    setRetryCount(0)
  }, [videoId])

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
    handleRetry,
    retryCount,
    maxRetries: MAX_RETRIES,
  }
}
