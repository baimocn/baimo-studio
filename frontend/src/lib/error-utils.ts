/**
 * Shared error handling utilities for unified error display across pages.
 */

export type ErrorType = "network" | "timeout" | "general"

export function getErrorType(message: string): ErrorType {
  const lower = message.toLowerCase()
  if (lower.includes("network") || lower.includes("fetch") || lower.includes("网络")) return "network"
  if (lower.includes("timeout") || lower.includes("超时") || lower.includes("timed out")) return "timeout"
  return "general"
}

export const errorTypeIcons: Record<ErrorType, { viewBox: string; path: string }> = {
  network: { viewBox: "0 0 24 24", path: "M12 9v2m0 4h.01M3.6 9.6l1.2 1.2M20.4 9.6l-1.2 1.2M7.8 16.2l.6.6M16.2 16.2l-.6.6M2 12h2m16 0h2M12 2v2m0 16v2" },
  timeout: { viewBox: "0 0 24 24", path: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  general: { viewBox: "0 0 24 24", path: "M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" },
}

export const errorTypeLabels: Record<ErrorType, string> = {
  network: "网络连接失败",
  timeout: "请求超时",
  general: "操作失败",
}
