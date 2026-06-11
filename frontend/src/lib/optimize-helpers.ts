"use client"

import { api } from "@/lib/api"

export async function streamOptimize(
  userInput: string,
  type: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<void> {
  for await (const chunk of api.prompt.optimizeStream(userInput, type, signal)) {
    onChunk(chunk)
  }
}
