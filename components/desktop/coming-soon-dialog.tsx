"use client"

import * as React from "react"
import { X, Clock } from "lucide-react"
import { RetroIcon } from "@/components/ui/retro-icon"
import type { WindowState } from "./desktop-context"

interface ComingSoonDialogProps {
  app: WindowState | null
  onClose: () => void
}

export function ComingSoonDialog({ app, onClose }: ComingSoonDialogProps) {
  const okButtonRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (!app) return

    okButtonRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [app, onClose])

  if (!app) return null

  const appLabel = app.title.includes(" - ") ? app.title.split(" - ")[1] : app.title

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4 select-none animate-in fade-in-0 duration-150"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="retro-window-frame max-w-sm w-full rounded-[4px] overflow-hidden shadow-[6px_6px_0px_rgba(0,0,0,0.35)] bg-white flex flex-col border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287]"
      >
        {/* Retro Titlebar */}
        <div className="bg-gradient-to-r from-[#1E4E8C] via-[#2A65B2] to-[#1E4E8C] px-3 py-1.5 flex items-center justify-between font-mono text-xs font-bold text-white shadow-inner">
          <div className="flex items-center gap-1.5">
            <span className="text-yellow-300">ℹ</span>
            <span>{app.filename} - INFORMASI.EXE</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hover:bg-red-600 hover:text-white px-1.5 py-0.5 rounded-[2px] transition-colors leading-none cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 bg-[#F4F6F9] space-y-4">
          <div className="flex items-start gap-3.5">
            {/* App Icon with Soon Badge */}
            <div className="relative shrink-0 size-12 rounded-[4px] bg-[#2D4564]/30 border border-[#A4B5C6] flex items-center justify-center p-1 shadow-inner">
              <RetroIcon name={app.icon || app.id} iconSize={48} className="size-9 object-contain drop-shadow" />
              <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 font-mono text-[9px] font-black px-1 rounded shadow border border-amber-600">
                SOON
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold text-[#14253D]">
                  {app.filename}
                </span>
                <span className="text-[9px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300 px-1 py-0.2 rounded">
                  Coming Soon
                </span>
              </div>
              <div className="text-[11px] font-sans font-semibold text-[#1E4E8C] mt-0.5">
                {appLabel}
              </div>
              <p className="text-xs text-gray-600 font-sans mt-1.5 leading-relaxed">
                Fitur ini sedang dalam tahap pengembangan dan dinonaktifkan sementara. Nantikan pembaruan pada rilis IT-THINGS berikutnya!
              </p>
            </div>
          </div>

          <div className="p-2 bg-amber-50/80 border border-amber-200 rounded-[2px] text-[10px] text-amber-900 flex items-center gap-2 font-mono">
            <Clock className="size-3.5 text-amber-700 shrink-0" />
            <span>Status: Segera hadir di rilis modul selanjutnya.</span>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end pt-2 border-t border-[#CBD5E1]">
            <button
              ref={okButtonRef}
              type="button"
              onClick={onClose}
              className="bg-[#D4DDE6] border border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] active:border-t-[#5E7287] active:border-l-[#5E7287] active:border-r-white active:border-b-white hover:bg-[#E2EAF2] px-6 py-1 text-xs font-mono font-bold text-[#14253D] rounded-[2px] shadow-[1px_1px_0px_#5E7287] cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
