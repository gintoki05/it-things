"use client"

import * as React from "react"
import { useDesktop, AppId } from "./desktop-context"
import { cn } from "@/lib/utils"

export function DesktopIcons() {
  const { windows, openWindow } = useDesktop()
  const [selectedId, setSelectedId] = React.useState<AppId | null>(null)

  const items = Object.values(windows)

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
            title={`${item.title} (Klik ganda untuk membuka)`}
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
            <div className="size-12 rounded bg-[#2D4564]/40 border border-white/20 shadow-md flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
              {item.icon}
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
