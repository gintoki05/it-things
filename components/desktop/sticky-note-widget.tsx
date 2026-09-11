"use client"

import * as React from "react"
import { useMemoStore } from "@/lib/memo-store"
import { useAuth } from "@/lib/auth"
import { UserAvatar } from "@/components/retro/user-avatar"
import { ChevronUp, ChevronDown, Check, FileText, Clock, Move } from "lucide-react"

interface Position {
  x: number
  y: number
}

const STORAGE_KEY_MINIMIZED = "it_things_sticky_note_minimized"
const STORAGE_KEY_POSITION = "it_things_sticky_note_position"

export function StickyNoteWidget() {
  const { memo, isLoading, isSaving, canManageMemo, updateMemo } = useMemoStore()
  const { isGuest } = useAuth()

  const [isMinimized, setIsMinimized] = React.useState<boolean>(false)
  const [isEditing, setIsEditing] = React.useState<boolean>(false)
  const [editTitle, setEditTitle] = React.useState<string>("")
  const [editContent, setEditContent] = React.useState<string>("")
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  // Dragging & Position State
  const [position, setPosition] = React.useState<Position | null>(null)
  const [isDragging, setIsDragging] = React.useState<boolean>(false)
  const containerRef = React.useRef<HTMLElement>(null)

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
          // Clamp to screen bounds safely
          const clampedX = Math.max(10, Math.min(window.innerWidth - 280, parsed.x))
          const clampedY = Math.max(10, Math.min(window.innerHeight - 150, parsed.y))
          setPosition({ x: clampedX, y: clampedY })
        }
      } catch {
        // ignore invalid json
      }
    }

    // Clamp position on window resize
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return null
        const clampedX = Math.max(10, Math.min(window.innerWidth - 280, prev.x))
        const clampedY = Math.max(10, Math.min(window.innerHeight - 150, prev.y))
        return { x: clampedX, y: clampedY }
      })
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

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

      if (!hasMoved && Math.abs(deltaX) < 3 && Math.abs(deltaY) < 3) return
      hasMoved = true

      currentX = Math.max(10, Math.min(window.innerWidth - 280, startX + deltaX))
      currentY = Math.max(10, Math.min(window.innerHeight - 120, startY + deltaY))

      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          if (containerEl) {
            containerEl.style.left = `${currentX}px`
            containerEl.style.top = `${currentY}px`
            containerEl.style.right = "auto"
          }
          rafId = null
        })
      }
    }

    const onPointerUp = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerUp)

      setIsDragging(false)
      if (hasMoved) {
        const finalPos = { x: currentX, y: currentY }
        setPosition(finalPos)
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY_POSITION, JSON.stringify(finalPos))
        }
      }
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true })
    window.addEventListener("pointerup", onPointerUp)
    window.addEventListener("pointercancel", onPointerUp)
  }

  // Reset position back to top-right
  const handleResetPosition = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPosition(null)
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY_POSITION)
    }
  }

  const toggleMinimize = () => {
    setIsMinimized((prev) => {
      const next = !prev
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_MINIMIZED, String(next))
      }
      return next
    })
  }

  const handleStartEdit = () => {
    if (!canManageMemo) return
    setEditTitle(memo.title || "MEMO_PENGUMUMAN.TXT")
    setEditContent((memo.content || "").replace(/\\n/g, "\n"))
    setErrorMsg(null)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setErrorMsg(null)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editContent.trim()) {
      setErrorMsg("Isi memo tidak boleh kosong.")
      return
    }

    const res = await updateMemo(editTitle, editContent)
    if (res.success) {
      setIsEditing(false)
      setErrorMsg(null)
    } else {
      setErrorMsg(res.error || "Gagal menyimpan catatan.")
    }
  }

  // Format updated timestamp
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

  // Common positioning style
  const positionStyle: React.CSSProperties = position
    ? {
        left: `${position.x}px`,
        top: `${position.y}px`,
        right: "auto",
      }
    : {}

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
          !position ? "top-10 sm:top-12 left-4 sm:left-[190px]" : ""
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
              <span className="truncate max-w-[130px]">{memo.title || "PENGUMUMAN"}</span>
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
      aria-label="Papan Pengumuman Tim"
      style={positionStyle}
      className={`absolute z-20 w-64 sm:w-72 bg-[#FFF9A6] border border-[#DCD36A] shadow-[4px_4px_14px_rgba(0,0,0,0.35)] rounded-[2px] select-none flex flex-col font-mono rotate-[-1deg] transition-transform hover:rotate-0 duration-150 animate-in fade-in ${
        !position ? "top-10 sm:top-12 left-4 sm:left-[190px]" : ""
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

      {/* Header Bar (Drag Handle) */}
      <div
        onPointerDown={handlePointerDown}
        title="Tahan & geser untuk memindahkan posisi memo"
        className="pt-2 px-2.5 pb-1 flex items-center justify-between border-b border-[#E8DF7E] text-gray-800 cursor-grab active:cursor-grabbing hover:bg-black/[0.02]"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <FileText className="size-3 text-amber-900 shrink-0" />
          <span className="font-bold text-[11px] truncate tracking-tight text-gray-900">
            {memo.title || "MEMO_PENGUMUMAN.TXT"}
          </span>
          <Move className="size-2.5 text-gray-400 opacity-60 shrink-0 ml-0.5 hidden sm:inline" />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!isEditing && canManageMemo && (
            <button
              type="button"
              onClick={handleStartEdit}
              title="Edit Memo Pengumuman (Admin & Bendahara)"
              className="px-1 py-0.5 text-[10px] font-bold bg-[#F4EC8E] hover:bg-[#ECE276] border border-[#D4CB68] rounded-[2px] text-amber-900 cursor-pointer active:translate-y-px"
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

      {/* Content Area */}
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
                  Reset Posisi
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
