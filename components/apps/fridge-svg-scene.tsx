"use client"

import * as React from "react"
import { FridgeItem, FridgeSlot, FRIDGE_SLOTS, getExpiryStatus } from "@/lib/fridge-store"
import { resolveItemSprite } from "./fridge-item-sprite"
import { cn } from "@/lib/utils"

interface FridgeSvgSceneProps {
  items: FridgeItem[]
  selectedSlot: FridgeSlot | null
  onSelectSlot: (slot: FridgeSlot) => void
}

// Zone positions calibrated precisely to public/fridge-pixel.png (819 x 1024)
const ZONES: {
  id: FridgeSlot
  left: number
  top: number
  width: number
  height: number
}[] = [
  { id: "freezer",    left: 12.8, top: 11.2, width: 41.5, height: 16.5 },
  { id: "chiller",    left: 13.0, top: 28.5, width: 41.0, height: 14.5 },
  { id: "main_upper", left: 13.0, top: 44.0, width: 41.0, height: 13.0 },
  { id: "main_lower", left: 13.0, top: 58.0, width: 41.0, height: 11.5 },
  { id: "crisper",    left: 13.0, top: 70.0, width: 41.0, height: 15.5 },
  { id: "door",       left: 57.5, top: 9.0,  width: 33.5, height: 81.0 },
]

function getSlotStatus(items: FridgeItem[]) {
  if (items.some((i) => getExpiryStatus(i) === "expired")) return "expired"
  if (items.some((i) => getExpiryStatus(i) === "soon")) return "soon"
  if (items.length > 0) return "ok"
  return "empty"
}

export function FridgeSvgScene({ items, selectedSlot, onSelectSlot }: FridgeSvgSceneProps) {
  return (
    <div className="h-full flex items-center justify-center p-3 bg-[#E8EEF5] select-none">
      <div
        className="relative drop-shadow-md"
        style={{ height: "100%", maxHeight: 490, aspectRatio: "819 / 1024" }}
      >
        {/* Pixel art fridge background */}
        <img
          src="/fridge-pixel.png"
          alt="Kulkas Kantor"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
          draggable={false}
        />

        {/* Clickable zone overlays */}
        {ZONES.map((zone) => {
          const slotConfig = FRIDGE_SLOTS.find((s) => s.id === zone.id)!
          const zoneItems = items.filter((i) => i.slot === zone.id)
          const status = getSlotStatus(zoneItems)
          const isSelected = selectedSlot === zone.id
          const displayItems = zoneItems.slice(0, zone.id === "door" ? 4 : 3)
          const extra = zoneItems.length - displayItems.length

          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => onSelectSlot(zone.id)}
              title={slotConfig.emoji + " " + slotConfig.label + " (" + zoneItems.length + " item)"}
              style={{
                position: "absolute",
                left: zone.left + "%",
                top: zone.top + "%",
                width: zone.width + "%",
                height: zone.height + "%",
              }}
              className={cn(
                "rounded-[4px] transition-all duration-150 cursor-pointer group flex flex-col justify-end overflow-hidden",
                isSelected
                  ? "bg-[#1E4E8C]/20 ring-2 ring-[#1E4E8C] ring-inset shadow-inner"
                  : status === "expired"
                    ? "hover:bg-red-500/15 hover:ring-1 hover:ring-red-400/50"
                    : status === "soon"
                      ? "hover:bg-amber-500/15 hover:ring-1 hover:ring-amber-400/50"
                      : "hover:bg-sky-400/15 hover:ring-1 hover:ring-sky-300/40"
              )}
            >
              {/* Item sprite previews di atas rak */}
              {displayItems.length > 0 ? (
                <div className="flex items-end justify-center gap-1 w-full pb-1 px-1 overflow-hidden z-10">
                  {displayItems.map((item) => (
                    <div
                      key={item.id}
                      className="relative shrink-0 transition-transform group-hover:scale-105"
                      title={item.name + " (" + item.ownerName + ")"}
                    >
                      <div className="scale-75 origin-bottom">
                        {resolveItemSprite(item)}
                      </div>
                      {item.expiredAt && (
                        <span
                          className={cn(
                            "absolute -top-1 -right-0.5 size-2 rounded-full border border-white shadow-xs",
                            getExpiryStatus(item) === "expired"
                              ? "bg-red-500 animate-pulse"
                              : getExpiryStatus(item) === "soon"
                                ? "bg-amber-400"
                                : "bg-emerald-500"
                          )}
                        />
                      )}
                    </div>
                  ))}
                  {extra > 0 && (
                    <span className="font-mono text-[8px] font-bold text-[#14253D] bg-white/90 border border-slate-300 rounded px-1 self-center shadow-xs">
                      +{extra}
                    </span>
                  )}
                </div>
              ) : (
                <div className="w-full text-center pb-1 font-mono text-[8px] text-slate-400/70 italic opacity-0 group-hover:opacity-100 transition-opacity">
                  + Titip
                </div>
              )}

              {/* Count badge pojok kanan atas rak */}
              {zoneItems.length > 0 && (
                <span
                  className={cn(
                    "absolute top-1 right-1 font-mono text-[8px] font-bold px-1 py-0.2 rounded-full shadow-xs z-20 border border-white/80",
                    status === "expired"
                      ? "bg-red-600 text-white"
                      : status === "soon"
                        ? "bg-amber-500 text-white"
                        : "bg-emerald-600 text-white"
                  )}
                >
                  {zoneItems.length}
                </span>
              )}

              {/* Minimalist slot name label on hover/selected */}
              <div
                className={cn(
                  "absolute top-1 left-1 font-mono text-[7px] font-bold uppercase tracking-wider px-1 py-0.2 rounded-[2px] backdrop-blur-xs transition-opacity z-20",
                  isSelected
                    ? "bg-[#1E4E8C] text-white opacity-100"
                    : "bg-white/80 text-slate-700 opacity-0 group-hover:opacity-100"
                )}
              >
                {slotConfig.label}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
