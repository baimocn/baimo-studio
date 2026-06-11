"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import gsap from "gsap"

const features = [
  {
    title: "文生图",
    desc: "通过文字描述生成高质量图片",
    href: "/image",
    icon: "🎨",
    glow: "rgba(168, 85, 247, 0.15)",
    border: "hover:border-[#a855f7]/40",
  },
  {
    title: "图生图",
    desc: "上传图片进行风格转换、编辑优化",
    href: "/image/edit",
    icon: "✏️",
    glow: "rgba(6, 182, 212, 0.15)",
    border: "hover:border-[#06b6d4]/40",
  },
  {
    title: "文生视频",
    desc: "通过文字描述生成电影级视频",
    href: "/video",
    icon: "🎬",
    glow: "rgba(236, 72, 153, 0.15)",
    border: "hover:border-[#ec4899]/40",
  },
  {
    title: "图生视频",
    desc: "将静态图片动画化为动态视频",
    href: "/video/image-to-video",
    icon: "🎞️",
    glow: "rgba(249, 115, 22, 0.15)",
    border: "hover:border-orange-500/40",
  },
]

const extraFeatures = [
  { label: "智能工作流", href: "/workflow", icon: "🧠" },
  { label: "多图合成", href: "/image/compose", icon: "🖼️" },
  { label: "多图视频", href: "/video/multi-image", icon: "🎞️" },
  { label: "关键帧动画", href: "/video/keyframes", icon: "🎭" },
]

function getUsageCounts(): Record<string, number> {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(localStorage.getItem("feature_usage") || "{}")
  } catch {
    return {}
  }
}

function trackUsage(href: string) {
  try {
    const counts = getUsageCounts()
    counts[href] = (counts[href] || 0) + 1
    localStorage.setItem("feature_usage", JSON.stringify(counts))
  } catch { /* noop */ }
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    let paused = false
    const particles: { x: number; y: number; vx: number; vy: number; r: number; color: string; alpha: number }[] = []
    const colors = ["#a855f7", "#06b6d4", "#ec4899", "#6366f1"]

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2
      canvas.height = canvas.offsetHeight * 2
      ctx.scale(2, 2)
    }
    resize()

    const isMobile = window.innerWidth < 768
    const particleCount = isMobile ? 15 : 40

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.4 + 0.1,
      })
    }

    const draw = () => {
      if (paused) {
        animId = requestAnimationFrame(draw)
        return
      }
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > canvas.offsetWidth) p.vx *= -1
        if (p.y < 0 || p.y > canvas.offsetHeight) p.vy *= -1

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.alpha
        ctx.fill()

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.alpha * 0.15
        ctx.fill()
      }
      ctx.globalAlpha = 1
      animId = requestAnimationFrame(draw)
    }

    // IntersectionObserver: pause when canvas not visible
    const observer = new IntersectionObserver(
      (entries) => {
        paused = !entries[0].isIntersecting
      },
      { threshold: 0 }
    )
    observer.observe(canvas)

    // visibilitychange: pause when tab hidden
    const onVisibility = () => {
      paused = document.hidden
    }
    document.addEventListener("visibilitychange", onVisibility)

    draw()

    return () => {
      cancelAnimationFrame(animId)
      observer.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full pointer-events-none"
      style={{ opacity: 0.6 }}
      aria-hidden="true"
      role="presentation"
    />
  )
}

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)
  const extraRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)

  const [sortedFeatures, setSortedFeatures] = useState(features)
  const [sortedExtraFeatures, setSortedExtraFeatures] = useState(extraFeatures)

  useEffect(() => {
    const counts = getUsageCounts()
    const byCount = (a: { href: string }, b: { href: string }) => (counts[b.href] || 0) - (counts[a.href] || 0)
    setSortedFeatures([...features].sort(byCount))
    setSortedExtraFeatures([...extraFeatures].sort(byCount))
  }, [])

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced) return  // 跳过动画

    const ctx = gsap.context(() => {
      gsap.from(".hero-element", {
        y: 30, duration: 0.8, stagger: 0.15, ease: "power3.out",
      })
      if (cardsRef.current) {
        gsap.from(cardsRef.current.children, {
          y: 50, scale: 0.95, duration: 0.7, stagger: 0.12, ease: "power3.out", delay: 0.4,
        })
      }
      if (extraRef.current) {
        gsap.from(extraRef.current.children, {
          y: 30, duration: 0.5, stagger: 0.1, ease: "power3.out", delay: 0.8,
        })
      }
      if (featuresRef.current) {
        gsap.from(featuresRef.current.children, {
          y: 20, duration: 0.5, stagger: 0.1, ease: "power3.out", delay: 1.0,
        })
      }
    })
    return () => ctx.revert()
  }, [])

  return (
    <div className="space-y-12">
      <div ref={heroRef} className="relative pt-8 pb-12 text-center overflow-hidden rounded-3xl">
        <ParticleCanvas />
        <div className="relative z-10">
          <div className="hero-element mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl overflow-hidden animate-ink-spread">
            <img src="/logo.svg" alt="baimo Studio" className="h-20 w-20" />
          </div>
          <h1 className="hero-element text-4xl font-extrabold tracking-tight">
            <span className="neon-text">baimo Studio</span>
          </h1>
          <p className="hero-element mx-auto mt-3 max-w-md text-base text-[#71717a]">
            基于 Agnes AI 系列模型的高质量图片与视频生成平台
          </p>
        </div>
      </div>

      <div ref={cardsRef} className="grid gap-6 sm:grid-cols-2">
        {sortedFeatures.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            onClick={() => trackUsage(f.href)}
            className={`group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#18181b] p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${f.border}`}
            style={{ "--card-glow": f.glow } as React.CSSProperties}
          >
            <div className="text-4xl transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-1">{f.icon}</div>
            <h2 className="mt-4 text-xl font-bold text-[#f5f5f5]">{f.title}</h2>
            <p className="mt-2 text-sm text-[#71717a]">{f.desc}</p>
            <div
              className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
              style={{ background: f.glow }}
            />
          </Link>
        ))}
      </div>

      <div ref={extraRef}>
        <h3 className="mb-4 text-sm font-medium text-[#71717a]">更多功能</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sortedExtraFeatures.map((f) => {
            const isHighlight = f.href === "/workflow"
            return (
              <Link
                key={f.href}
                href={f.href}
                onClick={() => trackUsage(f.href)}
                className={`flex items-center gap-3 rounded-xl border px-5 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(168,85,247,0.1)] ${
                  isHighlight
                    ? "border-[#a855f7]/30 bg-[#a855f7]/5 hover:border-[#a855f7]/50 hover:bg-[#a855f7]/10"
                    : "border-white/[0.08] bg-[#18181b] hover:border-white/15 hover:bg-[#1f1f23]"
                }`}
              >
                <span className="text-xl">{f.icon}</span>
                <div>
                  <span className={`text-sm font-medium ${isHighlight ? "text-[#a855f7]" : "text-[#a1a1aa]"}`}>
                    {f.label}
                  </span>
                  {isHighlight && (
                    <p className="text-xs text-[#a855f7]/60 mt-0.5">上传图片一键生成</p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      <div ref={featuresRef} className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "智能 Prompt 优化", icon: "✨", desc: "AI 实时优化你的描述" },
          { label: "多种尺寸可选", icon: "📐", desc: "方形、横屏、竖屏、宽屏" },
          { label: "一键下载结果", icon: "⬇️", desc: "图片和视频直接下载" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#18181b] px-5 py-4">
            <span className="text-xl">{item.icon}</span>
            <div>
              <span className="text-sm font-medium text-[#a1a1aa]">{item.label}</span>
              <p className="text-xs text-[#71717a] mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
