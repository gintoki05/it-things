"use client"

import * as React from "react"
import { FridgeItem, FridgeSlot, FRIDGE_SLOTS, getExpiryStatus, formatExpiredAt } from "@/lib/fridge-store"
import { resolveItemSprite } from "./fridge-item-sprite"
import { RetroActionButton } from "@/components/ui/retro-action-button"
import { cn } from "@/lib/utils"
import { Clock, User, PackageOpen } from "lucide-react"

interface FridgeSlotPanelProps {
  selectedSlot: FridgeSlot | null
  items: FridgeItem[]
  canEdit: (item: FridgeItem) => boolean
  onEdit: (item: FridgeItem) => void
  onDelete: (item: FridgeItem) => void
  onAddItem: (slot: FridgeSlot) => void
  isGuest: boolean
}

export function FridgeSlotPanel({
  selectedSlot,
  items,
  canEdit,
  onEdit,
  onDelete,
  onAddItem,
  isGuest,
}: FridgeSlotPanelProps) {
  const slotConfig = FRIDGE_SLOTS.find((s) => s.id === selectedSlot)
  const slotItems = selectedSlot ? items.filter((i) => i.slot === selectedSlot) : []

  if (!selectedSlot || !slotConfig) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6 bg-[#F5F8FB] border-l border-[#CBD5E1] select-none">
        <PackageOpen className="size-10 text-slate-300" />
        <div>
          <div className="font-mono text-sm font-bold text-slate-400">Pilih Kompartemen</div>
          <div className="font-mono text-[10px] text-slate-300 mt-0.5">Klik salah satu rak di kulkas untuk melihat isinya</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white border-l border-[#CBD5E1]">
      {/* Panel header */}
      <div className="shrink-0 px-3 py-2 border-b border-[#CBD5E1] bg-white flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{slotConfig.emoji}</span>
          <div>
            <div className="font-mono text-xs font-bold text-[#14253D]">{slotConfig.label}</div>
            <div className="font-mono text-[9px] text-slate-400">{slotConfig.sub}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
            {slotItems.length} item
          </span>
          {!isGuest && (
            <RetroActionButton
              action="add"
              visual="button"
              label="Titip di Sini"
              onClick={() => onAddItem(selectedSlot)}
            />
          )}
        </div>
      </div>

      {/* Items grid */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {slotItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-8">
            <span className="text-3xl opacity-30">{slotConfig.emoji}</span>
            <div>
              <div className="font-mono text-xs font-bold text-slate-400">{slotConfig.label} kosong</div>
              <div className="font-mono text-[10px] text-slate-300 mt-0.5">{slotConfig.sub}</div>
            </div>
            {!isGuest && (
              <button
                type="button"
                onClick={() => onAddItem(selectedSlot)}
                className="h-7 px-3 text-[10px] font-mono font-bold rounded-[2px] bg-[#1E4E8C] text-white border border-[#102A45] hover:bg-[#153A6B] flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                + Titip Item di Sini
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {slotItems.map((item) => (
              <SlotItemCard
                key={item.id}
                item={item}
                canEdit={canEdit(item)}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SlotItemCard({
  item,
  canEdit,
  onEdit,
  onDelete,
}: {
  item: FridgeItem
  canEdit: boolean
  onEdit: (i: FridgeItem) => void
  onDelete: (i: FridgeItem) => void
}) {
  const status = getExpiryStatus(item)
  const expired = status === "expired"
  const soon = status === "soon"

  return (
    <div
      className={cn(
        "flex flex-col gap-1 p-2 rounded-[3px] border bg-white transition-colors group",
        expired ? "border-red-200 bg-red-50/40" : soon ? "border-amber-200 bg-amber-50/30" : "border-[#CBD5E1] hover:border-[#A0AEBA]"
      )}
    >
      {/* Sprite + Name row */}
      <div className="flex items-center gap-2">
        <div className={cn("shrink-0", expired && "grayscale-[30%] opacity-70")}>{resolveItemSprite(item)}</div>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] font-bold text-[#14253D] leading-tight truncate">{item.name}</div>
          <div className="font-mono text-[9px] text-slate-400 uppercase tracking-wide">{item.category}</div>
        </div>
      </div>

      {/* Owner */}
      <div className="flex items-center gap-1">
        {item.ownerAvatar ? (
          <img src={item.ownerAvatar} alt={item.ownerName} className="size-3.5 rounded-full border border-slate-200 shrink-0" />
        ) : (
          <User className="size-3 text-slate-400 shrink-0" />
        )}
        <span className="font-mono text-[9px] text-slate-600 truncate">{item.ownerName}</span>
      </div>

      {/* Expiry badge */}
      {item.expiredAt && (
        <div className={cn(
          "flex items-center gap-1 text-[9px] font-mono font-bold rounded-[2px] px-1 py-0.5 w-fit",
          expired ? "bg-red-100 text-red-700" : soon ? "bg-amber-100 text-amber-700 animate-pulse" : "bg-emerald-50 text-emerald-700"
        )}>
          <Clock className="size-2.5 shrink-0" />
          {expired ? `EXPIRED ${formatExpiredAt(item.expiredAt)}` : `Exp: ${formatExpiredAt(item.expiredAt)}`}
        </div>
      )}

      {/* Notes */}
      {item.notes && (
        <div className="text-[9px] text-slate-500 italic bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 line-clamp-2 leading-tight">
          &ldquo;{item.notes}&rdquo;
        </div>
      )}

      {/* Action buttons (show on hover) */}
      {canEdit && (
        <div className="flex items-center justify-end gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <RetroActionButton action="edit" visual="icon" size="sm" onClick={() => onEdit(item)} tooltip="Edit item" />
          <RetroActionButton action="delete" visual="icon" size="sm" onClick={() => onDelete(item)} tooltip="Ambil / Buang" />
        </div>
      )}
    </div>
  )
}
