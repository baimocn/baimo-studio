import type { Metadata } from "next"
import "./globals.css"
import Navbar from "@/components/Navbar"
import { ToastProvider } from "@/components/Toast"

export const metadata: Metadata = {
  title: "baimo Studio — AI 图片与视频生成",
  description: "基于 Agnes AI 模型的高质量图片与视频生成平台",
  icons: {
    icon: "/favicon.svg",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] antialiased">
        <ToastProvider>
          <Navbar />
          <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
        </ToastProvider>
      </body>
    </html>
  )
}
