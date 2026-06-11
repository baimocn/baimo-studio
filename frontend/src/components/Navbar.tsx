"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import gsap from "gsap"

export default function Navbar() {
  const pathname = usePathname()
  const logoRef = useRef<HTMLImageElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!logoRef.current) return
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced) return  // 跳过动画

    const ctx = gsap.context(() => {
      gsap.to(logoRef.current, {
        rotate: 3,
        scale: 1.02,
        duration: 3,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      })
    })
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [menuOpen])

  const isActive = (path: string) => pathname === path
  const isImageActive = pathname?.startsWith("/image")
  const isVideoActive = pathname?.startsWith("/video")
  const isHistoryActive = pathname?.startsWith("/history")
  const isFavoritesActive = pathname?.startsWith("/favorites")

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#0a0a0a]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image
            ref={logoRef}
            src="/logo.svg"
            alt="baimo Studio"
            width={32}
            height={32}
            className="rounded-lg"
            priority
          />
          <span className="text-lg font-bold tracking-tight text-[#f5f5f5] group-hover:text-white transition-colors">
            baimo Studio
          </span>
        </Link>
        <button
          className="md:hidden flex items-center justify-center rounded-lg min-h-[44px] min-w-[44px] p-2 text-[#a1a1aa] hover:bg-white/5 hover:text-[#f5f5f5] transition"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="4" x2="16" y2="16" />
              <line x1="16" y1="4" x2="4" y2="16" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="5" x2="17" y2="5" />
              <line x1="3" y1="10" x2="17" y2="10" />
              <line x1="3" y1="15" x2="17" y2="15" />
            </svg>
          )}
        </button>
        <div className="hidden md:flex items-center gap-1">
          <Link
            href="/image"
            {...(isImageActive ? { "aria-current": "page" as const } : {})}
            className={`rounded-lg px-3 py-2 min-h-[44px] flex items-center text-sm font-medium transition ${
              isImageActive
                ? "bg-[#a855f7]/10 text-[#a855f7] shadow-[0_0_10px_rgba(168,85,247,0.15)]"
                : "text-[#a1a1aa] hover:bg-white/5 hover:text-[#f5f5f5]"
            }`}
          >
            图片生成
          </Link>
          <Link
            href="/video"
            {...(isVideoActive ? { "aria-current": "page" as const } : {})}
            className={`rounded-lg px-3 py-2 min-h-[44px] flex items-center text-sm font-medium transition ${
              isVideoActive
                ? "bg-[#a855f7]/10 text-[#a855f7] shadow-[0_0_10px_rgba(168,85,247,0.15)]"
                : "text-[#a1a1aa] hover:bg-white/5 hover:text-[#f5f5f5]"
            }`}
          >
            视频生成
          </Link>
          <Link
            href="/history"
            {...(isHistoryActive ? { "aria-current": "page" as const } : {})}
            className={`rounded-lg px-3 py-2 min-h-[44px] flex items-center text-sm font-medium transition ${
              isHistoryActive
                ? "bg-[#a855f7]/10 text-[#a855f7] shadow-[0_0_10px_rgba(168,85,247,0.15)]"
                : "text-[#a1a1aa] hover:bg-white/5 hover:text-[#f5f5f5]"
            }`}
          >
            历史
          </Link>
          <Link
            href="/favorites"
            {...(isFavoritesActive ? { "aria-current": "page" as const } : {})}
            className={`rounded-lg px-3 py-2 min-h-[44px] flex items-center text-sm font-medium transition ${
              isFavoritesActive
                ? "bg-[#a855f7]/10 text-[#a855f7] shadow-[0_0_10px_rgba(168,85,247,0.15)]"
                : "text-[#a1a1aa] hover:bg-white/5 hover:text-[#f5f5f5]"
            }`}
          >
            收藏
          </Link>
          <div className="mx-2 h-5 w-px bg-white/10" />
          <Link
            href="/settings"
            {...(isActive("/settings") ? { "aria-current": "page" as const } : {})}
            className={`rounded-lg px-3 py-2 min-h-[44px] flex items-center text-sm transition ${
              isActive("/settings")
                ? "bg-[#a855f7]/10 text-[#a855f7]"
                : "text-[#71717a] hover:bg-white/5 hover:text-[#f5f5f5]"
            }`}
          >
            设置
          </Link>
        </div>
      </div>
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="md:hidden border-t border-white/[0.08] bg-[#0a0a0a]/95 backdrop-blur-xl px-6 py-3 flex flex-col gap-1">
          <Link
            href="/image"
            onClick={() => setMenuOpen(false)}
            {...(isImageActive ? { "aria-current": "page" as const } : {})}
            className={`rounded-lg px-3 py-2 min-h-[44px] flex items-center text-sm font-medium transition ${
              isImageActive
                ? "bg-[#a855f7]/10 text-[#a855f7] shadow-[0_0_10px_rgba(168,85,247,0.15)]"
                : "text-[#a1a1aa] hover:bg-white/5 hover:text-[#f5f5f5]"
            }`}
          >
            图片生成
          </Link>
          <Link
            href="/video"
            onClick={() => setMenuOpen(false)}
            {...(isVideoActive ? { "aria-current": "page" as const } : {})}
            className={`rounded-lg px-3 py-2 min-h-[44px] flex items-center text-sm font-medium transition ${
              isVideoActive
                ? "bg-[#a855f7]/10 text-[#a855f7] shadow-[0_0_10px_rgba(168,85,247,0.15)]"
                : "text-[#a1a1aa] hover:bg-white/5 hover:text-[#f5f5f5]"
            }`}
          >
            视频生成
          </Link>
          <Link
            href="/history"
            onClick={() => setMenuOpen(false)}
            {...(isHistoryActive ? { "aria-current": "page" as const } : {})}
            className={`rounded-lg px-3 py-2 min-h-[44px] flex items-center text-sm font-medium transition ${
              isHistoryActive
                ? "bg-[#a855f7]/10 text-[#a855f7] shadow-[0_0_10px_rgba(168,85,247,0.15)]"
                : "text-[#a1a1aa] hover:bg-white/5 hover:text-[#f5f5f5]"
            }`}
          >
            历史
          </Link>
          <Link
            href="/favorites"
            onClick={() => setMenuOpen(false)}
            {...(isFavoritesActive ? { "aria-current": "page" as const } : {})}
            className={`rounded-lg px-3 py-2 min-h-[44px] flex items-center text-sm font-medium transition ${
              isFavoritesActive
                ? "bg-[#a855f7]/10 text-[#a855f7] shadow-[0_0_10px_rgba(168,85,247,0.15)]"
                : "text-[#a1a1aa] hover:bg-white/5 hover:text-[#f5f5f5]"
            }`}
          >
            收藏
          </Link>
          <Link
            href="/settings"
            onClick={() => setMenuOpen(false)}
            {...(isActive("/settings") ? { "aria-current": "page" as const } : {})}
            className={`rounded-lg px-3 py-2 min-h-[44px] flex items-center text-sm transition ${
              isActive("/settings")
                ? "bg-[#a855f7]/10 text-[#a855f7]"
                : "text-[#71717a] hover:bg-white/5 hover:text-[#f5f5f5]"
            }`}
          >
            设置
          </Link>
        </div>
        </>
      )}
    </nav>
  )
}
