"use client"

import * as React from "react"
import { MessageSquare, X, AtSign } from "lucide-react"
import { useNotification } from "@/lib/notification-store"
import { useDesktop } from "@/components/desktop/desktop-context"
import { cn } from "@/lib/utils"

export function RetroNotificationToast() {
  const { activeToast, dismissToast, clearUnreadChat } = useNotification()
  const { openWindow, bringToFront } = useDesktop()

  if (!activeToast) return null

  const handleClickToast = () => {
    openWindow("chat")
    bringToFront("chat")
    dismissToast()
    clearUnreadChat()
  }

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={handleClickToast}
      className={cn(
        "fixed bottom-[48px] right-2 sm:right-3 z-[999] max-w-[320px] sm:max-w-[340px] w-full cursor-pointer select-none",
        "animate-in fade-in slide-in-from-bottom-2 duration-200"
      )}
    >
      {/* Windows 98 / 2000 Yellow Tooltip Balloon Box */}
      <div className="bg-[#FFFFE1] border-2 border-black rounded-[2px] shadow-[3px_3px_0px_rgba(0,0,0,0.6)] p-2.5 flex flex-col gap-1.5 transition-transform hover:-translate-y-0.5">
        {/* Header: Title & Close Button */}
        <div className="flex items-center justify-between gap-1.5 border-b border-[#DCDCA0] pb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="size-4 rounded-full bg-[#1E4E8C] text-white flex items-center justify-center shrink-0 shadow-xs">
              <MessageSquare className="size-2.5" />
            </div>
            <span className="font-mono font-bold text-[11px] text-[#14253D] tracking-wide truncate">
              CHAT.EXE // PESAN BARU
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {activeToast.isMention && (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-[#FEF08A] text-[#854D0E] border border-[#FACC15] text-[9px] font-mono font-bold shadow-xs">
                <AtSign className="size-2.5" /> Mention
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                dismissToast()
              }}
              className="size-4 hover:bg-black/10 rounded flex items-center justify-center text-gray-700 hover:text-black cursor-pointer"
              title="Tutup notifikasi"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>

        {/* Body: Sender & Message Snippet */}
        <div className="text-xs font-sans leading-snug">
          <div className="font-bold text-[#1E4E8C] text-[11px] mb-0.5 truncate">
            {activeToast.senderName}
          </div>
          <p className="text-gray-800 text-[11px] line-clamp-2 break-words">
            {activeToast.message}
          </p>
        </div>

        {/* Footer Hint */}
        <div className="text-[9px] font-mono text-gray-500 flex items-center justify-between pt-0.5">
          <span>Klik untuk membuka percakapan</span>
          <span className="text-[8px] font-bold text-[#1E4E8C]">IT-THINGS 98</span>
        </div>
      </div>
    </div>
  )
}
