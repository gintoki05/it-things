"use client"

import * as React from "react"
import { useDesktop, AppId } from "./desktop-context"
import { useAuth } from "@/lib/auth"
import { useNotification } from "@/lib/notification-store"
import { cn } from "@/lib/utils"
import { RetroIcon } from "@/components/ui/retro-icon"

const ITEM_GRID_POSITIONS: Record<AppId, string> = {
  readme: "col-start-1 row-start-1",
  vote: "col-start-1 row-start-2",
  chat: "col-start-1 row-start-3",
  team: "col-start-1 row-start-4",
  wheel: "col-start-2 row-start-1",
  splitbill: "col-start-2 row-start-1",
  kas: "col-start-2 row-start-2",
  pantry: "col-start-2 row-start-3",
  lapak: "col-start-2 row-start-4",
}

export function DesktopIcons() {
  const { windows, openWindow } = useDesktop()
  const { isAdmin } = useAuth()
  const { unreadChatCount, activeVoteCount, clearUnreadChat } = useNotification()
  const [selectedId, setSelectedId] = React.useState<AppId | null>(null)

  // Hanya tampilkan modul yang tidak disembunyikan dan bukan adminOnly (kecuali admin)
  const items = Object.values(windows).filter((item) => !item.isHidden && (!item.adminOnly || isAdmin))

  const handleOpen = (id: AppId) => {
    if (id === "chat") {
      clearUnreadChat()
    }
    openWindow(id)
  }

  return (
    <div className="absolute top-4 left-4 grid grid-flow-col grid-rows-5 auto-cols-max gap-y-4 gap-x-2 select-none z-0">
      {items.map((item) => {
        const isSelected = selectedId === item.id

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedId(item.id)}
            onDoubleClick={() => handleOpen(item.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                handleOpen(item.id)
              }
            }}
            title={
              item.isComingSoon
                ? `${item.title} (Fitur Segera Hadir / Coming Soon)`
                : `${item.title} (Klik ganda untuk membuka)`
            }
            // For mobile tap: if already selected or on tap
            onTouchEnd={() => {
              if (selectedId === item.id) {
                handleOpen(item.id)
              } else {
                setSelectedId(item.id)
              }
            }}
            className={cn(
              "group flex flex-col items-center justify-center w-20 p-2 rounded cursor-pointer text-center transition-all",
              ITEM_GRID_POSITIONS[item.id],
              isSelected
                ? "bg-[#1E4E8C]/50 border border-dotted border-white/80"
                : "hover:bg-white/10"
            )}
          >
            <div className="relative size-12 rounded bg-[#2D4564]/40 border border-white/20 shadow-md flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
              <RetroIcon name={item.icon || item.id} iconSize={48} className="size-9 object-contain drop-shadow" />
              {item.isComingSoon && (
                <span className="absolute -top-1.5 -right-2 bg-amber-500 text-slate-950 font-mono text-[8px] font-black px-1 py-0.5 rounded border border-amber-600 shadow leading-none uppercase">
                  SOON
                </span>
              )}
              {!item.isComingSoon && item.id === "readme" && (
                <span
                  title="Panduan & Info Web"
                  className="absolute -top-1.5 -right-2 bg-blue-500 text-white font-mono text-[8px] font-black px-1 py-0.5 rounded border border-blue-400 shadow leading-none uppercase"
                >
                  INFO
                </span>
              )}
              {!item.isComingSoon && item.id === "vote" && activeVoteCount > 0 && (
                <span
                  title={`${activeVoteCount} Poll Aktif`}
                  className="absolute -top-1.5 -right-2 bg-emerald-500 text-slate-950 font-mono text-[8px] font-black px-1 py-0.5 rounded border border-emerald-600 shadow leading-none uppercase"
                >
                  {activeVoteCount > 1 ? `${activeVoteCount} AKTIF` : "1 AKTIF"}
                </span>
              )}
              {!item.isComingSoon && item.id === "chat" && unreadChatCount > 0 && (
                <span
                  title={`${unreadChatCount} Pesan Belum Dibaca`}
                  className="absolute -top-1.5 -right-2 bg-rose-500 text-white font-mono text-[8px] font-black px-1 py-0.5 rounded border border-rose-600 shadow leading-none uppercase animate-pulse"
                >
                  {unreadChatCount > 99 ? "99+" : `${unreadChatCount} BARU`}
                </span>
              )}
            </div>
            <span className="mt-1 font-mono text-[11px] text-white font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] tracking-tight leading-snug px-1 rounded truncate max-w-full">
              {item.filename}
            </span>
          </button>
        )
      })}
    </div>
  )
}
