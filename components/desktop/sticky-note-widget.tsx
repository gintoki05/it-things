"use client"

import * as React from "react"
import { useMemoStore } from "@/lib/memo-store"
import { useLapakStore } from "@/lib/lapak-store"
import { useDesktop } from "./desktop-context"
import { useAuth } from "@/lib/auth"
import { UserAvatar } from "@/components/retro/user-avatar"
import { cn } from "@/lib/utils"
import { formatDisplayPrice } from "@/components/apps/lapak-app"
import { useWordle } from "@/lib/wordle-store"
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  FileText,
  Clock,
  Move,
  ShoppingBag,
  MessageCircle,
  ExternalLink,
  Sparkles,
  Flame,
  Plus,
  Trophy,
  Play,
} from "lucide-react"

interface Position {
  x: number
  y: number
}

const STORAGE_KEY_MINIMIZED = "it_things_sticky_note_minimized"
const STORAGE_KEY_POSITION = "it_things_sticky_note_position"

export function StickyNoteWidget() {
  const { memo, isLoading, isSaving, canManageMemo, updateMemo } = useMemoStore()
  const { activeItems } = useLapakStore()
  const { openWindow } = useDesktop()
  const { isGuest } = useAuth()
  const { leaderboard, puzzle } = useWordle()

  const [activeTab, setActiveTab] = React.useState<"memo" | "lapak" | "rank">("memo")
  const [lapakIndex, setLapakIndex] = React.useState<number>(0)

  const solvers = React.useMemo(() => {
    return leaderboard.filter((entry) => entry.isSolved)
  }, [leaderboard])

  const [isMinimized, setIsMinimized] = React.useState<boolean>(false)
  const [isEditing, setIsEditing] = React.useState<boolean>(false)
  const [editTitle, setEditTitle] = React.useState<string>("")
  const [editContent, setEditContent] = React.useState<string>("")
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  // Dragging & Position State
  const [position, setPosition] = React.useState<Position | null>(null)
  const [isDragging, setIsDragging] = React.useState<boolean>(false)
  const containerRef = React.useRef<HTMLElement>(null)

  // Helper to safely clamp coordinates within viewport bounds for 360px+ screens
  const getSafeClampedPosition = React.useCallback((x: number, y: number) => {
    if (typeof window === "undefined") return { x, y }
    const isNarrow = window.innerWidth < 640
    // w-72 is 288px on mobile, sm:w-80 is 320px on desktop. 10px padding on both sides.
    const widgetWidth = isNarrow ? Math.min(288, window.innerWidth - 32) : 320
    const maxX = Math.max(10, window.innerWidth - widgetWidth - 10)
    const maxY = Math.max(10, window.innerHeight - 150)
    return {
      x: Math.max(10, Math.min(maxX, x)),
      y: Math.max(10, Math.min(maxY, y)),
    }
  }, [])

  // Load minimize & position preferences from localStorage
  React.useEffect(() => {
    if (typeof window === "undefined") return

    const savedMin = localStorage.getItem(STORAGE_KEY_MINIMIZED)
    if (savedMin !== null) {
      setIsMinimized(savedMin === "true")
    } else if (window.innerWidth < 768) {
      setIsMinimized(true)
    }

    const savedPos = localStorage.getItem(STORAGE_KEY_POSITION)
    if (savedPos) {
      try {
        const parsed = JSON.parse(savedPos)
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          setPosition(getSafeClampedPosition(parsed.x, parsed.y))
        }
      } catch {
        // ignore invalid json
      }
    }

    // Clamp position on window resize
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return null
        return getSafeClampedPosition(prev.x, prev.y)
      })
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [getSafeClampedPosition])

  // Auto carousel for Lapak Tab if more than 1 item
  React.useEffect(() => {
    if (activeTab !== "lapak" || activeItems.length <= 1) return
    const interval = setInterval(() => {
      setLapakIndex((prev) => (prev + 1) % activeItems.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [activeTab, activeItems.length])

  // Handle Dragging
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (typeof window === "undefined" || window.innerWidth < 768) return
    if (e.button !== 0 && e.pointerType === "mouse") return
    if ((e.target as HTMLElement).closest("button, input, textarea, a")) return

    const containerEl = containerRef.current
    if (!containerEl) return

    const rect = containerEl.getBoundingClientRect()
    const startX = position ? position.x : rect.left
    const startY = position ? position.y : rect.top
    const startMouseX = e.clientX
    const startMouseY = e.clientY

    let currentX = startX
    let currentY = startY
    let hasMoved = false
    let rafId: number | null = null

    setIsDragging(true)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // ignore
    }

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startMouseX
      const deltaY = moveEvent.clientY - startMouseY

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        hasMoved = true
      }

      const clamped = getSafeClampedPosition(startX + deltaX, startY + deltaY)
      currentX = clamped.x
      currentY = clamped.y

      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          setPosition({ x: currentX, y: currentY })
          rafId = null
        })
      }
    }

    const onPointerUp = (upEvent: PointerEvent) => {
      setIsDragging(false)
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      try {
        e.currentTarget.releasePointerCapture(upEvent.pointerId)
      } catch {
        // ignore
      }
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)

      if (hasMoved) {
        try {
          localStorage.setItem(
            STORAGE_KEY_POSITION,
            JSON.stringify({ x: currentX, y: currentY })
          )
        } catch {
          // ignore
        }
      }
    }

    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
  }

  // Toggle Minimize
  const toggleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation()
    const nextState = !isMinimized
    setIsMinimized(nextState)
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_MINIMIZED, String(nextState))
      } catch {
        // ignore
      }
    }
  }

  // Reset Position to Default
  const handleResetPosition = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPosition(null)
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY_POSITION)
      } catch {
        // ignore
      }
    }
  }

  // Edit Memo handlers
  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditTitle(memo.title || "MEMO_PENGUMUMAN.TXT")
    setEditContent(memo.content || "")
    setErrorMsg(null)
    setIsEditing(true)
  }

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(false)
    setErrorMsg(null)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTitle.trim()) {
      setErrorMsg("Judul dokumen tidak boleh kosong.")
      return
    }
    setErrorMsg(null)

    const res = await updateMemo(editTitle, editContent)
    if (res.success) {
      setIsEditing(false)
    } else {
      setErrorMsg(res.error || "Gagal menyimpan memo.")
    }
  }

  // Formatting date
  const formattedTime = React.useMemo(() => {
    if (!memo.updated_at) return null
    try {
      const d = new Date(memo.updated_at)
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return null
    }
  }, [memo.updated_at])

  // WA clean link
  const getWhatsAppUrl = (phone: string, title: string) => {
    const cleaned = phone.replace(/[^0-9]/g, "")
    const normalizedPhone = cleaned.startsWith("0") ? `62${cleaned.slice(1)}` : cleaned
    const text = encodeURIComponent(
      `Halo kak, mau tanya seputar promo/jualan "${title}" di IT-THINGS 98.`
    )
    return `https://wa.me/${normalizedPhone}?text=${text}`
  }

  // Common positioning style
  const positionStyle: React.CSSProperties = position
    ? {
        left: `${position.x}px`,
        top: `${position.y}px`,
        right: "auto",
      }
    : {}

  // Current lapak item
  const currentLapak = activeItems[lapakIndex % (activeItems.length || 1)]

  // ============================================================
  // MINIMIZED VIEW (Ikon Pin Retro di Desktop - Bisa Digeser)
  // ============================================================
  if (isMinimized) {
    return (
      <aside
        ref={containerRef}
        aria-label="Papan Pengumuman Minimized"
        style={positionStyle}
        className={`absolute z-20 select-none animate-in fade-in duration-200 ${
          !position ? "top-10 right-3 sm:top-12 sm:left-[190px] sm:right-auto" : ""
        }`}
      >
        <div
          onPointerDown={handlePointerDown}
          title="Tahan & geser untuk memindahkan posisi memo"
          className="cursor-grab active:cursor-grabbing inline-flex items-center"
        >
          <button
            type="button"
            onClick={toggleMinimize}
            className="h-7 px-2.5 bg-[#FFF9A6] hover:bg-[#FFF380] border border-[#DCD36A] shadow-md flex items-center gap-1.5 text-xs font-mono text-gray-900 active:translate-y-px cursor-pointer rounded-[2px] rotate-[-1deg]"
          >
            <span className="size-2 rounded-full bg-red-600 border border-black shrink-0 shadow-xs" />
            <span className="font-bold flex items-center gap-1">
              <span className="text-[11px]">📌</span>
              <span className="truncate max-w-[90px]">{memo.title || "PENGUMUMAN"}</span>
              {solvers.length > 0 && (
                <span
                  title={`${solvers.length} orang berhasil memecahkan Wordle hari ini`}
                  className="bg-[#047857] text-white text-[9px] px-1 py-0.2 rounded-xs font-black"
                >
                  🏆 {solvers.length}
                </span>
              )}
              {activeItems.length > 0 && (
                <span className="bg-amber-600 text-white text-[9px] px-1 py-0.2 rounded-xs font-black">
                  🔥 {activeItems.length}
                </span>
              )}
            </span>
            <ChevronDown className="size-3 text-gray-600 shrink-0 ml-0.5" />
          </button>
        </div>
      </aside>
    )
  }

  // ============================================================
  // EXPANDED VIEW (Kertas Post-It Kuning Retro - Bisa Digeser)
  // ============================================================
  return (
    <aside
      ref={containerRef}
      aria-label="Papan Pengumuman & Lapak Tim"
      style={positionStyle}
      className={`absolute z-20 w-72 max-w-[calc(100vw-32px)] sm:w-80 bg-[#FFF9A6] border border-[#DCD36A] shadow-[4px_4px_14px_rgba(0,0,0,0.35)] rounded-[2px] select-none flex flex-col font-mono rotate-[-1deg] transition-transform hover:rotate-0 duration-150 animate-in fade-in ${
        !position ? "top-10 right-3 sm:top-12 sm:left-[190px] sm:right-auto" : ""
      } ${isDragging ? "opacity-95 shadow-2xl scale-[1.01] cursor-grabbing" : ""}`}
    >
      {/* Visual Red Pushpin on Top Header (Klik ganda untuk reset posisi) */}
      <div
        onDoubleClick={handleResetPosition}
        title="Klik ganda pin untuk kembalikan posisi ke default (samping kiri desktop)"
        className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center cursor-pointer group"
      >
        <div className="size-4 rounded-full bg-gradient-to-br from-red-500 to-red-700 border border-black shadow-[1px_1px_2px_rgba(0,0,0,0.6)] flex items-center justify-center group-hover:scale-110 transition-transform">
          <div className="size-1 rounded-full bg-white/70" />
        </div>
      </div>

      {/* Top Tabs Switcher Header */}
      <div
        onPointerDown={handlePointerDown}
        title="Tahan & geser untuk memindahkan posisi memo"
        className="pt-2 px-2 pb-1 flex items-center justify-between border-b border-[#E8DF7E] text-gray-800 cursor-grab active:cursor-grabbing hover:bg-black/[0.02]"
      >
        {/* Tab Buttons */}
        <div className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => {
              setIsEditing(false)
              setActiveTab("memo")
            }}
            className={cn(
              "px-1.5 sm:px-2 py-0.5 text-[10px] font-bold rounded-[2px] border transition-colors cursor-pointer flex items-center gap-1 shrink-0",
              activeTab === "memo"
                ? "bg-[#1E4E8C] text-white border-[#102A45] shadow-xs"
                : "bg-[#F4EC8E] hover:bg-[#ECE276] text-gray-800 border-[#D4CB68]"
            )}
          >
            <FileText className="size-2.5 shrink-0" />
            <span>Memo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsEditing(false)
              setActiveTab("lapak")
            }}
            className={cn(
              "px-1.5 sm:px-2 py-0.5 text-[10px] font-bold rounded-[2px] border transition-colors cursor-pointer flex items-center gap-1 shrink-0",
              activeTab === "lapak"
                ? "bg-[#D97706] text-white border-[#92400E] shadow-xs"
                : "bg-[#F4EC8E] hover:bg-[#ECE276] text-amber-900 border-[#D4CB68]"
            )}
          >
            <Flame className="size-2.5 text-red-500 fill-current shrink-0" />
            <span>Lapak</span>
            {activeItems.length > 0 && (
              <span className={cn(
                "text-[8px] px-1 rounded-xs font-black",
                activeTab === "lapak" ? "bg-black/30 text-white" : "bg-red-600 text-white"
              )}>
                {activeItems.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsEditing(false)
              setActiveTab("rank")
            }}
            className={cn(
              "px-1.5 sm:px-2 py-0.5 text-[10px] font-bold rounded-[2px] border transition-colors cursor-pointer flex items-center gap-1 shrink-0",
              activeTab === "rank"
                ? "bg-[#047857] text-white border-[#065F46] shadow-xs"
                : "bg-[#F4EC8E] hover:bg-[#ECE276] text-emerald-900 border-[#D4CB68]"
            )}
          >
            <Trophy className="size-2.5 text-yellow-600 shrink-0" />
            <span>Klasemen</span>
            {solvers.length > 0 && (
              <span className={cn(
                "text-[8px] px-1 rounded-xs font-black",
                activeTab === "rank" ? "bg-black/30 text-white" : "bg-emerald-700 text-white"
              )}>
                {solvers.length}
              </span>
            )}
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {activeTab === "memo" && !isEditing && canManageMemo && (
            <button
              type="button"
              onClick={handleStartEdit}
              title="Edit Memo Pengumuman (Admin & Bendahara)"
              className="px-1 py-0.5 text-[9px] font-bold bg-[#F4EC8E] hover:bg-[#ECE276] border border-[#D4CB68] rounded-[2px] text-amber-900 cursor-pointer active:translate-y-px"
            >
              Ubah
            </button>
          )}
          <button
            type="button"
            onClick={toggleMinimize}
            title="Ciutkan memo"
            className="size-4.5 bg-[#F4EC8E] hover:bg-[#ECE276] text-gray-700 border border-[#D4CB68] rounded-[2px] flex items-center justify-center cursor-pointer active:translate-y-px"
          >
            <ChevronUp className="size-3" />
          </button>
        </div>
      </div>

      {/* ==================== TAB 1: MEMO TIM ==================== */}
      {activeTab === "memo" && (
        <>
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="p-2.5 flex flex-col gap-2">
              <div>
                <label className="text-[9px] font-bold text-gray-600 block mb-0.5 uppercase tracking-wider">
                  Judul Dokumen:
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="MEMO_PENGUMUMAN.TXT"
                  maxLength={40}
                  className="w-full bg-white/80 border border-[#C5BB50] px-1.5 py-1 text-[11px] font-mono text-black rounded-[1px] focus:outline-none focus:bg-white focus:border-amber-600"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-gray-600 block mb-0.5 uppercase tracking-wider">
                  Isi Catatan:
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={5}
                  placeholder="Tulis pengumuman di sini..."
                  className="w-full bg-white/80 border border-[#C5BB50] p-1.5 text-[11px] font-mono text-black leading-relaxed rounded-[1px] resize-none focus:outline-none focus:bg-white focus:border-amber-600"
                />
              </div>

              {errorMsg && (
                <div className="text-[10px] text-red-700 font-bold bg-red-100 p-1 border border-red-300">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-2 py-0.5 text-[10px] font-bold bg-[#E6DE7A] hover:bg-[#DED56E] border border-[#BDB44D] text-gray-800 rounded-[2px] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-2.5 py-0.5 text-[10px] font-bold bg-[#1E4E8C] hover:bg-[#153A6B] text-white border border-[#102A45] rounded-[2px] shadow-xs cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  <Check className="size-3" />
                  <span>{isSaving ? "Menyimpan..." : "Simpan.exe"}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-2.5 flex flex-col justify-between min-h-[90px] gap-2">
              {/* Note Text */}
              <div className="text-[11px] leading-relaxed text-gray-900 whitespace-pre-wrap break-words font-mono">
                {isLoading ? (
                  <span className="text-gray-500 italic animate-pulse">Memuat memo...</span>
                ) : (
                  (memo.content || "").replace(/\\n/g, "\n") || "Belum ada pengumuman tim."
                )}
              </div>

              {/* Footer Metadata */}
              <div className="pt-2 border-t border-[#E8DF7E] text-[9px] text-gray-600 flex items-center justify-between gap-1 select-none">
                <div className="flex items-center gap-1 truncate">
                  {memo.updated_by_avatar ? (
                    <UserAvatar
                      name={memo.updated_by_name}
                      src={memo.updated_by_avatar}
                      size="size-3.5"
                      textClass="text-[7px]"
                      className="shrink-0"
                    />
                  ) : (
                    <span className="text-gray-500">✍️</span>
                  )}
                  <span className="truncate max-w-[110px]" title={memo.updated_by_name}>
                    {memo.updated_by_name || "Admin"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {formattedTime && (
                    <div className="flex items-center gap-0.5 text-gray-500">
                      <Clock className="size-2.5" />
                      <span>{formattedTime}</span>
                    </div>
                  )}
                  {position && (
                    <button
                      type="button"
                      onClick={handleResetPosition}
                      title="Kembalikan posisi memo ke default (samping kiri desktop)"
                      className="text-[8px] text-amber-800 underline hover:text-black cursor-pointer ml-1"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ==================== TAB 2: LAPAK TEMAN ==================== */}
      {activeTab === "lapak" && (
        <div className="p-2.5 flex flex-col justify-between min-h-[110px] gap-2">
          {activeItems.length === 0 ? (
            <div className="text-center py-3 flex flex-col items-center justify-center">
              <ShoppingBag className="size-6 text-amber-700 opacity-60 mb-1" />
              <div className="text-xs font-bold text-gray-800">Belum ada promo aktif</div>
              <button
                type="button"
                onClick={() => openWindow("lapak")}
                className="mt-2 px-2.5 py-0.5 bg-[#1E4E8C] hover:bg-[#153A6B] text-white text-[10px] font-bold rounded-[2px] border border-[#102A45] cursor-pointer"
              >
                + Pasang Iklan
              </button>
            </div>
          ) : currentLapak ? (
            <div className="flex flex-col gap-1.5">
              {/* Carousel Header Nav */}
              <div className="flex items-center justify-between text-[10px] text-amber-900 pb-1 border-b border-[#E8DF7E]">
                <div className="flex items-center gap-1">
                  {currentLapak.badge && (
                    <span className="bg-red-600 text-white text-[8px] font-black px-1 py-0.2 rounded-xs uppercase tracking-wider">
                      {currentLapak.badge}
                    </span>
                  )}
                  <span className="bg-amber-100 text-amber-800 text-[8px] px-1 py-0.2 rounded-xs border border-amber-300">
                    {currentLapak.category}
                  </span>
                </div>

                {activeItems.length > 1 && (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-gray-600">
                      {((lapakIndex % activeItems.length) + 1)} / {activeItems.length}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setLapakIndex(
                          (prev) => (prev - 1 + activeItems.length) % activeItems.length
                        )
                      }
                      className="size-4 bg-[#F4EC8E] hover:bg-[#ECE276] border border-[#D4CB68] rounded-[2px] flex items-center justify-center cursor-pointer"
                    >
                      <ChevronLeft className="size-2.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setLapakIndex((prev) => (prev + 1) % activeItems.length)
                      }
                      className="size-4 bg-[#F4EC8E] hover:bg-[#ECE276] border border-[#D4CB68] rounded-[2px] flex items-center justify-center cursor-pointer"
                    >
                      <ChevronRight className="size-2.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Product Info Card */}
              <div className="bg-white/90 border border-[#DCD36A] p-2 rounded-[2px] shadow-xs">
                <div className="font-bold text-xs text-gray-900 leading-tight">
                  {currentLapak.title}
                </div>
                {currentLapak.tagline && (
                  <div className="text-[10px] text-amber-900 font-sans mt-0.5 leading-snug">
                    {currentLapak.tagline}
                  </div>
                )}
                {currentLapak.priceRange && (
                  <div className="mt-1 text-[10px] font-bold text-emerald-800 font-mono">
                    🏷️ {formatDisplayPrice(currentLapak.priceRange)}
                  </div>
                )}
                <div className="mt-1 flex items-center gap-1 text-[9px] text-gray-600">
                  <UserAvatar
                    src={currentLapak.createdByAvatar}
                    name={currentLapak.contactName}
                    size="size-3.5"
                    textClass="text-[7px]"
                  />
                  <span className="truncate">{currentLapak.contactName}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 pt-1">
                {currentLapak.contactWa && (
                  <a
                    href={getWhatsAppUrl(currentLapak.contactWa, currentLapak.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-[10px] font-bold py-1 px-2 rounded-[2px] border border-[#1BA850] flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                  >
                    <MessageCircle className="size-3 fill-current shrink-0" />
                    <span>Chat WA</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => openWindow("lapak")}
                  className="bg-[#1E4E8C] hover:bg-[#153A6B] text-white text-[10px] font-bold py-1 px-2 rounded-[2px] border border-[#102A45] flex items-center justify-center gap-1 cursor-pointer shadow-xs shrink-0"
                >
                  <ShoppingBag className="size-3 shrink-0" />
                  <span>Katalog</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ==================== TAB 3: KLASEMEN WORDLE ==================== */}
      {activeTab === "rank" && (
        <div className="p-2.5 flex flex-col justify-between min-h-[120px] gap-2">
          {/* Header Info */}
          <div className="flex items-center justify-between pb-1 border-b border-[#E8DF7E] text-[10px] text-gray-800">
            <div className="flex items-center gap-1 font-bold">
              <Trophy className="size-3 text-amber-600" />
              <span>Wordle #{puzzle.dayNumber}</span>
              <span className="text-[9px] text-gray-600 font-normal">({puzzle.targetDate})</span>
            </div>
            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-300">
              {solvers.length} Solved
            </span>
          </div>

          {/* Solvers List / Empty State */}
          {solvers.length === 0 ? (
            <div className="text-center py-2.5 flex flex-col items-center justify-center bg-white/70 rounded-[2px] border border-[#DCD36A] p-2">
              <span className="text-lg mb-0.5">🎯</span>
              <div className="text-xs font-bold text-gray-900">Belum ada pemenang hari ini</div>
              <p className="text-[10px] text-gray-600 mt-0.5">Jadilah yang pertama memecahkan tebak kata 98!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1 max-h-[135px] overflow-y-auto pr-0.5">
              {solvers.slice(0, 3).map((entry, idx) => {
                const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"
                const bgRank =
                  idx === 0
                    ? "bg-amber-100/90 border-amber-300"
                    : idx === 1
                    ? "bg-slate-100/90 border-slate-300"
                    : "bg-orange-50/90 border-orange-200"

                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex items-center justify-between gap-1.5 p-1.5 rounded-[2px] border text-xs shadow-2xs",
                      bgRank
                    )}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="text-xs font-bold shrink-0">{medal}</span>
                      <UserAvatar
                        src={entry.userAvatar || undefined}
                        name={entry.userName}
                        size="size-4"
                        textClass="text-[8px]"
                        className="shrink-0"
                      />
                      <span className="font-bold text-[11px] text-gray-900 truncate">
                        {entry.userName}
                      </span>
                    </div>
                    <div className="shrink-0 font-mono text-[10px] font-bold bg-[#1E4E8C] text-white px-1.5 py-0.2 rounded-[2px]">
                      {entry.attempts}/6
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-1 pt-1 border-t border-[#E8DF7E]">
            <button
              type="button"
              onClick={() => openWindow("wordle")}
              className="flex-1 bg-[#1E4E8C] hover:bg-[#153A6B] text-white text-[10px] font-bold py-1 px-2 rounded-[2px] border border-[#102A45] flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs active:translate-y-px"
            >
              <Play className="size-2.5 fill-current text-yellow-300" />
              <span>Main Wordle Sekarang</span>
            </button>
            <button
              type="button"
              onClick={() => openWindow("game")}
              title="Buka Koleksi Game Lengkap (game.exe)"
              className="bg-[#F4EC8E] hover:bg-[#ECE276] text-gray-800 text-[10px] font-bold py-1 px-2 rounded-[2px] border border-[#D4CB68] flex items-center justify-center cursor-pointer shadow-xs active:translate-y-px"
            >
              Arcade
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
