"use client"

import * as React from "react"
import { useDesktop } from "./desktop-context"
import { useLapakStore } from "@/lib/lapak-store"
import { cn } from "@/lib/utils"
import { Flame, ShoppingBag, Sparkles } from "lucide-react"

interface TaskbarTickerProps {
  className?: string
}

export function TaskbarTicker({ className }: TaskbarTickerProps = {}) {
  const { openWindow } = useDesktop()
  const { activeItems } = useLapakStore()

  const handleOpenLapak = () => {
    openWindow("lapak")
  }

  if (activeItems.length === 0) {
    return (
      <button
        type="button"
        onClick={handleOpenLapak}
        title="Buka Lapak_Teman.exe (Pasang Iklan Usaha)"
        className={cn(
          "hidden md:flex items-center gap-1.5 h-7 px-2 bg-[#1A1600] hover:bg-[#2A2400] text-[#FFD700] font-mono text-[11px] border-2 border-t-[#FFE600] border-l-[#FFE600] border-r-[#8A7500] border-b-[#8A7500] rounded-[2px] shadow-[0_0_6px_rgba(255,215,0,0.25)] cursor-pointer transition-all active:translate-y-px shrink-0 select-none",
          className
        )}
      >
        <ShoppingBag className="size-3.5 text-[#FFE600] shrink-0" />
        <span className="truncate font-bold tracking-tight">🛍️ LAPAK TEMAN (+)</span>
      </button>
    )
  }

  // Build the ticker text string
  const promoItems = activeItems.map((item) => {
    const badgeText = item.badge ? `[${item.badge}] ` : ""
    const promoText = item.tagline || item.description || `Hubungi ${item.contactName}`
    return `${badgeText}${item.title}: ${promoText}`
  })

  const tickerContent = promoItems.join("  ⚡  ")

  return (
    <button
      type="button"
      onClick={handleOpenLapak}
      title="Klik untuk membuka Lapak_Teman.exe (Etalase & Iklan Usaha Teman)"
      className={cn(
        "hidden md:flex items-center gap-1.5 h-7 px-2 bg-[#120F00] hover:bg-[#221D00] text-[#FFE838] font-mono text-[11px] border-2 border-t-[#FFE600] border-l-[#FFE600] border-r-[#7A6700] border-b-[#7A6700] rounded-[2px] shadow-[0_0_10px_rgba(255,230,0,0.35)] cursor-pointer transition-all active:translate-y-px max-w-[140px] sm:max-w-[280px] md:max-w-[380px] lg:max-w-[480px] xl:max-w-[560px] overflow-hidden select-none shrink-0 group",
        className
      )}
    >
      {/* High-Visibility Glowing Pulsing Badge */}
      <div className="flex items-center gap-1 bg-gradient-to-r from-red-600 via-amber-600 to-yellow-500 text-white px-1.5 py-0.5 rounded-[2px] text-[10px] font-black shrink-0 border border-yellow-300 shadow-sm animate-pulse">
        <Flame className="size-3 text-yellow-200 fill-current shrink-0" />
        <span className="tracking-wider uppercase hidden sm:inline">PROMO</span>
        <span className="text-[9px] bg-black/40 px-1 rounded-sm">{activeItems.length}</span>
      </div>

      {/* Marquee Scrolling Box */}
      <div className="overflow-hidden flex-1 relative flex items-center">
        <div className="animate-marquee flex items-center gap-6 whitespace-nowrap text-[#FFE838] font-mono text-[11px] font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] group-hover:[animation-play-state:paused]">
          <span>{tickerContent}</span>
          <span className="text-yellow-400">⚡</span>
          <span>{tickerContent}</span>
          <span className="text-yellow-400">⚡</span>
        </div>
      </div>
    </button>
  )
}
