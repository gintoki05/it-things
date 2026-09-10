"use client"

import * as React from "react"
import { useDesktop, AppId } from "./desktop-context"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { RetroIcon } from "@/components/ui/retro-icon"

export function DesktopIcons() {
  const { windows, openWindow } = useDesktop()
  const { isAdmin } = useAuth()
  const [selectedId, setSelectedId] = React.useState<AppId | null>(null)

  // Hanya tampilkan modul adminOnly jika user adalah admin
  const items = Object.values(windows).filter((item) => !item.adminOnly || isAdmin)

  return (
    <div className="absolute top-4 left-4 flex flex-col gap-5 select-none z-0">
      {items.map((item) => {
        const isSelected = selectedId === item.id

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedId(item.id)}
            onDoubleClick={() => openWindow(item.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                openWindow(item.id)
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
                openWindow(item.id)
              } else {
                setSelectedId(item.id)
              }
            }}
            className={cn(
              "group flex flex-col items-center justify-center w-20 p-2 rounded cursor-pointer text-center transition-all",
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
