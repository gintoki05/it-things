"use client"

import * as React from "react"
import { X, Sparkles, Music, Gamepad2, Users, Monitor, Check } from "lucide-react"
import { RetroIcon } from "@/components/ui/retro-icon"
import { APP_VERSION, APP_NAME } from "@/lib/version"
import { useDesktop } from "@/components/desktop/desktop-context"
import { useWallpaper } from "@/lib/wallpaper-store"
import { playRetroNotificationSound } from "@/lib/sound-effects"

interface WhatsNewDialogProps {
  isOpen: boolean
  onClose: () => void
}

const STORAGE_KEY_SEEN = "it-things_last_seen_version"

export function WhatsNewDialog({ isOpen, onClose }: WhatsNewDialogProps) {
  const { openWindow } = useDesktop()
  const { openDialog: openWallpaperDialog } = useWallpaper()
  const okButtonRef = React.useRef<HTMLButtonElement>(null)

  // Keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return

    // Hanya fokus ke tombol OK jika tidak ada input/textarea yang sedang aktif
    const activeTag = document.activeElement?.tagName
    if (activeTag !== "INPUT" && activeTag !== "TEXTAREA") {
      okButtonRef.current?.focus()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Jangan cegat tombol jika user sedang mengetik di input / textarea
      const target = e.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)

      if (isInput) return

      // Hanya tangani Escape untuk menutup modal pengumuman
      if (e.key === "Escape") {
        e.preventDefault()
        handleDismiss()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  const handleDismiss = (triggerTip = true) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_SEEN, APP_VERSION)
    }
    playRetroNotificationSound(0.2)
    onClose()

    if (triggerTip && typeof window !== "undefined") {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("show-start-tip-balloon"))
      }, 250)
    }
  }

  const handleLaunchApp = (action: () => void) => {
    handleDismiss(true)
    // Trigger window open segera setelah modal ditutup
    setTimeout(() => {
      action()
    }, 120)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-3 select-none animate-in fade-in-0 duration-150"
      onClick={() => handleDismiss(true)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
        onClick={(e) => e.stopPropagation()}
        className="retro-window-frame w-[94vw] sm:w-[560px] max-w-[95vw] max-h-[90dvh] rounded-[4px] overflow-hidden shadow-[6px_6px_0px_rgba(0,0,0,0.4)] bg-[#D4DDE6] flex flex-col border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287]"
      >
        {/* Retro Titlebar */}
        <div className="bg-gradient-to-r from-[#102A45] via-[#1E4E8C] to-[#2E6FB5] px-2.5 py-1.5 flex items-center justify-between font-mono text-xs font-bold text-white shadow-inner shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <Sparkles className="size-3.5 text-yellow-300 shrink-0" />
            <span id="whats-new-title" className="truncate">
              welcome98.exe - Apa yang Baru di {APP_NAME}?
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleDismiss(true)}
            className="hover:bg-red-600 hover:text-white px-1.5 py-0.5 rounded-[2px] transition-colors leading-none cursor-pointer shrink-0 ml-2"
            title="Tutup (Esc)"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-3 sm:p-3.5 space-y-3 overflow-y-auto flex-1 text-slate-800">
          {/* Header Banner */}
          <div className="flex items-center gap-3 p-2.5 bg-gradient-to-r from-[#EBF2F7] to-white rounded-[2px] border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white">
            <div className="size-12 shrink-0 bg-slate-900 rounded-[2px] p-1 flex items-center justify-center shadow-inner border border-slate-700">
              <RetroIcon name="idea" iconSize={48} className="size-9 object-contain drop-shadow" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono font-black text-sm text-[#102A45] tracking-wide">
                  {APP_NAME}
                </span>
                <span className="text-[10px] font-mono font-bold bg-[#1E4E8C] text-white px-1.5 py-0.5 rounded">
                  {APP_VERSION}
                </span>
                <span className="text-[10px] font-mono font-bold bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded border border-amber-500 shadow-sm animate-pulse">
                  ★ UPDATE TERBARU
                </span>
              </div>
              <p className="text-[11px] font-sans text-gray-700 mt-0.5 line-clamp-2">
                Sistem operasi tim baru saja diperbarui! Berikut fitur dan modul baru yang siap kamu gunakan:
              </p>
            </div>
          </div>

          {/* 4 Highlight Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Card 1: Winamp */}
            <div className="p-2.5 bg-white/90 rounded-[2px] border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base leading-none">📻</span>
                    <span className="font-mono font-bold text-xs text-[#102A45] truncate">
                      Winamp 2.91 & CRT
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-1 py-0.2 rounded">
                    HOT
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 leading-snug mb-2.5">
                  Pemutar YouTube retro dengan equalizer spektrum reaktif, kontrol volume 2-arah, dan layar tabung CRT filter VHS.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleLaunchApp(() => openWindow("winamp"))}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-[#1E4E8C] hover:bg-[#153A6B] text-white font-mono text-[11px] font-bold rounded-[2px] border-2 border-t-[#6B93C4] border-l-[#6B93C4] border-r-[#0E243A] border-b-[#0E243A] active:border-t-[#0E243A] active:border-l-[#0E243A] active:border-r-[#6B93C4] active:border-b-[#6B93C4] transition-colors cursor-pointer min-h-[32px]"
              >
                <Music className="size-3.5" />
                <span>Buka Winamp</span>
              </button>
            </div>

            {/* Card 2: Games (Wordle & Paint War) */}
            <div className="p-2.5 bg-white/90 rounded-[2px] border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <RetroIcon name="game" iconSize={32} className="size-4 object-contain" />
                    <span className="font-mono font-bold text-xs text-[#102A45] truncate">
                      Game Center 98
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-purple-100 text-purple-800 border border-purple-300 px-1 py-0.2 rounded">
                    ARCADE
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 leading-snug mb-2.5">
                  Main tebak 1 kata harian Wordle 98 (reset 00:00) dan adu tebak gambar live realtime bareng tim di Paint War 98.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleLaunchApp(() => openWindow("game"))}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-[#1E4E8C] hover:bg-[#153A6B] text-white font-mono text-[11px] font-bold rounded-[2px] border-2 border-t-[#6B93C4] border-l-[#6B93C4] border-r-[#0E243A] border-b-[#0E243A] active:border-t-[#0E243A] active:border-l-[#0E243A] active:border-r-[#6B93C4] active:border-b-[#6B93C4] transition-colors cursor-pointer min-h-[32px]"
              >
                <Gamepad2 className="size-3.5" />
                <span>Buka Game Center</span>
              </button>
            </div>

            {/* Card 3: Online Status */}
            <div className="p-2.5 bg-white/90 rounded-[2px] border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-mono font-bold text-xs text-[#102A45] truncate">
                      Status Online Tim
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-300 px-1 py-0.2 rounded">
                    LIVE
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 leading-snug mb-2.5">
                  Pantau siapa saja rekan tim yang sedang aktif realtime langsung dari widget desktop tanpa perlu tanya di chat.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleLaunchApp(() => openWindow("chat"))}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-[#1E4E8C] hover:bg-[#153A6B] text-white font-mono text-[11px] font-bold rounded-[2px] border-2 border-t-[#6B93C4] border-l-[#6B93C4] border-r-[#0E243A] border-b-[#0E243A] active:border-t-[#0E243A] active:border-l-[#0E243A] active:border-r-[#6B93C4] active:border-b-[#6B93C4] transition-colors cursor-pointer min-h-[32px]"
              >
                <Users className="size-3.5" />
                <span>Buka Obrolan / Tim</span>
              </button>
            </div>

            {/* Card 4: Wallpaper */}
            <div className="p-2.5 bg-white/90 rounded-[2px] border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <Monitor className="size-3.5 text-[#1E4E8C]" />
                    <span className="font-mono font-bold text-xs text-[#102A45] truncate">
                      Ganti Wallpaper
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300 px-1 py-0.2 rounded">
                    TEMA
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 leading-snug mb-2.5">
                  Kustomisasi desktop sesukamu: 20+ preset retro (Win98 Teal, Matrix, Bliss XP) atau unggah berkas gambar milikmu sendiri.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleLaunchApp(() => openWallpaperDialog())}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-[#1E4E8C] hover:bg-[#153A6B] text-white font-mono text-[11px] font-bold rounded-[2px] border-2 border-t-[#6B93C4] border-l-[#6B93C4] border-r-[#0E243A] border-b-[#0E243A] active:border-t-[#0E243A] active:border-l-[#0E243A] active:border-r-[#6B93C4] active:border-b-[#6B93C4] transition-colors cursor-pointer min-h-[32px]"
              >
                <Monitor className="size-3.5" />
                <span>Ubah Wallpaper</span>
              </button>
            </div>
          </div>
        </div>

        {/* Retro Footer */}
        <div className="p-2.5 bg-[#C3D0DC] border-t border-[#7D8E9E] flex items-center justify-between gap-2 shrink-0">
          <span className="text-[10px] font-mono text-gray-500 hidden sm:inline">
            welcome98.exe • IT-Things 98
          </span>

          <button
            ref={okButtonRef}
            type="button"
            onClick={() => handleDismiss(true)}
            className="w-full sm:w-auto ml-auto flex items-center justify-center gap-1.5 px-5 py-1.5 bg-[#D4DDE6] hover:bg-[#E2EAF2] text-[#102A45] font-mono text-xs font-bold rounded-[2px] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] active:border-t-[#5E7287] active:border-l-[#5E7287] active:border-r-white active:border-b-white shadow-sm cursor-pointer min-h-[34px]"
          >
            <Check className="size-3.5 text-emerald-700 font-bold" />
            <span>Paham & Mulai Eksplorasi</span>
          </button>
        </div>
      </div>
    </div>
  )
}
