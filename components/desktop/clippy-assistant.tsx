"use client"

import * as React from "react"
import { useClippy } from "@/lib/clippy-store"
import { useDesktop } from "./desktop-context"
import {
  Calendar,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Move,
  ChevronRight,
  Maximize2,
  Settings,
  Clock,
} from "lucide-react"

interface Position {
  x: number
  y: number
}

const STORAGE_KEY_POS = "it_things_clippy_position_v1"

export function ClippyAssistant() {
  const {
    enabled,
    soundEnabled,
    setSoundEnabled,
    minimized,
    setMinimized,
    toggleMinimized,
    schedule,
    nextPrayer,
    selectedCity,
    speechText,
    speechVisible,
    setSpeechVisible,
    showPrayerCountdown,
    triggerRandomQuote,
    openPrayerDialog,
  } = useClippy()

  const [position, setPosition] = React.useState<Position | null>(null)
  const [isDragging, setIsDragging] = React.useState<boolean>(false)
  const [showMenu, setShowMenu] = React.useState<boolean>(false)
  const [isBlinking, setIsBlinking] = React.useState<boolean>(false)
  const dragRef = React.useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Clamp helper
  const clampPosition = React.useCallback((x: number, y: number) => {
    if (typeof window === "undefined") return { x, y }
    const maxX = Math.max(10, window.innerWidth - 70)
    const maxY = Math.max(10, window.innerHeight - 80)
    return {
      x: Math.max(8, Math.min(maxX, x)),
      y: Math.max(8, Math.min(maxY, y)),
    }
  }, [])

  // Load position
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const isSmall = window.innerWidth < 768
    // Default di sisi kiri bawah (desktop: x=180 pas di samping kolom ikon desktop; mobile: x=12)
    const defaultX = isSmall ? 12 : 180
    const defaultY = Math.max(10, window.innerHeight - 120)

    try {
      const saved = localStorage.getItem(STORAGE_KEY_POS)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          // Jika posisi tersimpan di sisi kanan (versi lama), otomatis reset ke kiri
          if (parsed.x > window.innerWidth - 260) {
            setPosition({ x: defaultX, y: defaultY })
            localStorage.setItem(STORAGE_KEY_POS, JSON.stringify({ x: defaultX, y: defaultY }))
          } else {
            setPosition(clampPosition(parsed.x, parsed.y))
          }
          return
        }
      }
    } catch {
      // ignore
    }

    setPosition({ x: defaultX, y: defaultY })
  }, [clampPosition])

  // Random eye blinking for cute personality
  React.useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true)
      setTimeout(() => setIsBlinking(false), 200)
    }, 4000 + Math.random() * 3000)
    return () => clearInterval(blinkInterval)
  }, [])

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest(".no-drag")) {
      return
    }
    e.preventDefault()
    setIsDragging(true)
    const currentX = position?.x ?? 0
    const currentY = position?.y ?? 0
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: currentX,
      posY: currentY,
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    const nextPos = clampPosition(dragRef.current.posX + dx, dragRef.current.posY + dy)
    setPosition(nextPos)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return
    setIsDragging(false)
    dragRef.current = null
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
    if (position && typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(position))
    }
  }

  if (!enabled || !position) return null

  // Render Mini Docked Pill when Minimized
  if (minimized) {
    return (
      <div className="fixed z-40 left-3 sm:left-44 bottom-12 select-none animate-in fade-in slide-in-from-bottom-2 duration-150">
        {speechVisible && (
          <div className="absolute bottom-full mb-2.5 left-0 w-[210px] sm:w-[230px] bg-[#FFFFE1] text-black rounded-[3px] p-2 border-2 border-t-white border-l-white border-r-black border-b-black shadow-[2px_2px_0px_rgba(0,0,0,0.35)] font-sans text-xs animate-in zoom-in-95 duration-150 pointer-events-auto z-50">
            <div className="flex items-center justify-between gap-1 pb-1 mb-1 border-b border-black/20 text-[9px] font-mono text-slate-600">
              <span className="font-bold text-[#102A45] flex items-center gap-1">
                <span>📎</span>
                <span>Asisten Tim IT</span>
              </span>
              <button
                type="button"
                onClick={() => setSpeechVisible(false)}
                className="hover:bg-black/10 p-0.5 rounded text-slate-700 cursor-pointer"
                title="Tutup Balon"
              >
                <X className="size-2.5" />
              </button>
            </div>
            <p className="text-[10.5px] leading-snug text-slate-900 select-text">
              {speechText || `🕌 ${nextPrayer.name} dalam ${nextPrayer.formattedCountdown} (${nextPrayer.time} ${selectedCity.tzLabel})`}
            </p>
            <div className="absolute -bottom-2 left-5 size-0 border-x-8 border-x-transparent border-t-8 border-t-black">
              <div className="absolute -top-[9px] -left-[7px] size-0 border-x-7 border-x-transparent border-t-7 border-t-[#FFFFE1]" />
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={toggleMinimized}
          title="Klik untuk membuka Asisten Clippy & Jadwal Sholat"
          className="flex items-center gap-1.5 px-2 py-0.5 bg-[#FFFFE1] hover:bg-white text-slate-900 font-mono text-[10px] font-bold rounded-[3px] border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] shadow-[2px_2px_0px_rgba(0,0,0,0.3)] active:border-t-[#404040] active:border-l-[#404040] active:border-r-white active:border-b-white cursor-pointer"
        >
          <span className="text-xs">📎</span>
          <span className="text-[#102A45] truncate max-w-[130px]">
            {nextPrayer.name} {nextPrayer.time} ({nextPrayer.remainingMinutes}m)
          </span>
          <Maximize2 className="size-2.5 text-slate-600" />
        </button>
      </div>
    )
  }

  const isNearTop = (position?.y ?? 0) < 140

  return (
    <div
      ref={containerRef}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      className={`fixed z-40 select-none pointer-events-auto touch-none ${
        isDragging ? "cursor-grabbing opacity-90 scale-105" : "cursor-grab"
      } transition-transform duration-75`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Speech Balloon - Absolute positioned so Clippy's anchor position never jumps */}
      {speechVisible && (
        <div
          className={`absolute left-0 w-[210px] sm:w-[230px] bg-[#FFFFE1] text-black rounded-[3px] p-2 border-2 border-t-white border-l-white border-r-black border-b-black shadow-[2px_2px_0px_rgba(0,0,0,0.35)] font-sans text-xs animate-in zoom-in-95 duration-150 pointer-events-auto z-50 ${
            isNearTop ? "top-full mt-2.5" : "bottom-full mb-2.5"
          }`}
        >
          {/* Header row in balloon */}
          <div className="flex items-center justify-between gap-1 pb-1 mb-1 border-b border-black/20 text-[9px] font-mono text-slate-600">
            <span className="font-bold text-[#102A45] flex items-center gap-1">
              <span>📎</span>
              <span>Asisten Tim IT</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSpeechVisible(false)}
                className="hover:bg-black/10 p-0.5 rounded text-slate-700 cursor-pointer"
                title="Tutup Balon"
              >
                <X className="size-2.5" />
              </button>
            </div>
          </div>

          {/* Balloon text */}
          <p className="text-[10.5px] leading-snug text-slate-900 select-text">
            {speechText || `🕌 ${nextPrayer.name} dalam ${nextPrayer.formattedCountdown} (${nextPrayer.time} ${selectedCity.tzLabel})`}
          </p>

          {/* Quick Action Chips in Balloon */}
          <div className="mt-1.5 pt-1 border-t border-black/15 flex items-center gap-1 flex-wrap text-[9px] font-mono">
            <button
              type="button"
              onClick={openPrayerDialog}
              className="px-1.5 py-0.5 bg-[#D4D0C8] hover:bg-white text-slate-900 font-bold rounded-[2px] border border-t-white border-l-white border-r-black border-b-black active:translate-y-px flex items-center gap-1 cursor-pointer"
            >
              <Clock className="size-2.5 text-[#000080]" />
              <span>Jadwal</span>
            </button>
            <button
              type="button"
              onClick={triggerRandomQuote}
              className="px-1.5 py-0.5 bg-[#D4D0C8] hover:bg-white text-slate-800 rounded-[2px] border border-t-white border-l-white border-r-black border-b-black active:translate-y-px flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="size-2.5 text-amber-600" />
              <span>Tips</span>
            </button>
          </div>

          {/* Speech Balloon Tail pointing towards Clippy */}
          {isNearTop ? (
            <div className="absolute -top-2 left-5 size-0 border-x-8 border-x-transparent border-b-8 border-b-black">
              <div className="absolute top-0.5 -left-[7px] size-0 border-x-7 border-x-transparent border-b-7 border-b-[#FFFFE1]" />
            </div>
          ) : (
            <div className="absolute -bottom-2 left-5 size-0 border-x-8 border-x-transparent border-t-8 border-t-black">
              <div className="absolute -top-[9px] -left-[7px] size-0 border-x-7 border-x-transparent border-t-7 border-t-[#FFFFE1]" />
            </div>
          )}
        </div>
      )}

      {/* Main Character Avatar & Mini Control Bar */}
      <div className="flex items-end gap-1.5">
        {/* Character Illustration / Clickable Avatar */}
        <div
          onClick={() => {
            if (speechVisible) {
              triggerRandomQuote()
            } else {
              showPrayerCountdown()
            }
          }}
          className="relative group p-0.5 cursor-pointer transition-transform hover:scale-105 active:scale-95"
          title="Klik Clippy untuk tips atau pengingat sholat!"
        >
          <ClippySvg isBlinking={isBlinking} />

          {/* Mini Next Prayer Badge below character */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#1E4E8C] text-white font-mono text-[8.5px] font-bold px-1 py-0.2 rounded border border-white shadow-sm flex items-center gap-1">
            <span className="size-1 rounded-full bg-emerald-400 animate-pulse" />
            <span>{nextPrayer.name} {nextPrayer.time}</span>
          </div>
        </div>

        {/* Quick Side Action Buttons */}
        <div className="flex flex-col gap-0.5 opacity-80 hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={openPrayerDialog}
            title="Buka JADWAL_SHOLAT.EXE"
            className="size-5 bg-[#C0C0C0] hover:bg-white text-[#000080] rounded-[2px] border border-t-white border-l-white border-r-[#404040] border-b-[#404040] shadow-sm flex items-center justify-center cursor-pointer active:translate-y-px"
          >
            <Calendar className="size-2.5" />
          </button>
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Suara Pengingat Aktif" : "Suara Dibisukan"}
            className="size-5 bg-[#C0C0C0] hover:bg-white text-slate-800 rounded-[2px] border border-t-white border-l-white border-r-[#404040] border-b-[#404040] shadow-sm flex items-center justify-center cursor-pointer active:translate-y-px"
          >
            {soundEnabled ? <Volume2 className="size-2.5 text-emerald-700" /> : <VolumeX className="size-2.5 text-rose-700" />}
          </button>
          <button
            type="button"
            onClick={toggleMinimized}
            title="Kecilkan Asisten"
            className="size-5 bg-[#C0C0C0] hover:bg-white text-slate-700 rounded-[2px] border border-t-white border-l-white border-r-[#404040] border-b-[#404040] shadow-sm flex items-center justify-center cursor-pointer active:translate-y-px"
          >
            <X className="size-2.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Otentik Retro Clippy SVG (Animated Eyes & Eyebrows)
 */
function ClippySvg({ isBlinking }: { isBlinking: boolean }) {
  return (
    <svg width="44" height="50" viewBox="0 0 68 76" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[2px_3px_0px_rgba(0,0,0,0.4)]">
      {/* Paperclip Metallic Wire Frame */}
      <path
        d="M26 68 C 16 68, 10 60, 10 46 L 10 24 C 10 12, 20 4, 34 4 C 48 4, 58 12, 58 24 L 58 52 C 58 62, 50 70, 38 70 C 26 70, 20 62, 20 52 L 20 26 C 20 18, 26 14, 34 14 C 42 14, 48 18, 48 26 L 48 48"
        stroke="#475569"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M26 68 C 16 68, 10 60, 10 46 L 10 24 C 10 12, 20 4, 34 4 C 48 4, 58 12, 58 24 L 58 52 C 58 62, 50 70, 38 70 C 26 70, 20 62, 20 52 L 20 26 C 20 18, 26 14, 34 14 C 42 14, 48 18, 48 26 L 48 48"
        stroke="#CBD5E1"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M26 68 C 16 68, 10 60, 10 46 L 10 24 C 10 12, 20 4, 34 4 C 48 4, 58 12, 58 24 L 58 52 C 58 62, 50 70, 38 70 C 26 70, 20 62, 20 52 L 20 26 C 20 18, 26 14, 34 14 C 42 14, 48 18, 48 26 L 48 48"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Eyes Container */}
      <g transform="translate(18, 20)">
        {/* Left Eyebrow */}
        <path d="M 0 0 Q 6 -5 13 -1" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        {/* Right Eyebrow */}
        <path d="M 17 -1 Q 24 -5 30 0" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" fill="none" />

        {/* Eye Whites */}
        <ellipse cx="6" cy="10" rx="6.5" ry="8" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.5" />
        <ellipse cx="23" cy="10" rx="6.5" ry="8" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.5" />

        {/* Pupils */}
        {!isBlinking ? (
          <>
            <ellipse cx="8" cy="10.5" rx="3.2" ry="4" fill="#0F172A" />
            <circle cx="9" cy="9" r="1.2" fill="#FFFFFF" />
            <ellipse cx="25" cy="10.5" rx="3.2" ry="4" fill="#0F172A" />
            <circle cx="26" cy="9" r="1.2" fill="#FFFFFF" />
          </>
        ) : (
          <>
            {/* Blinking Lines */}
            <line x1="1" y1="10" x2="11" y2="10" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
            <line x1="18" y1="10" x2="28" y2="10" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
      </g>
    </svg>
  )
}
