"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  FridgeItem,
  FridgeCategory,
  getExpiryStatus,
  formatExpiredAt,
  isExpired,
} from "@/lib/fridge-store"
import { Clock, Trash2, Edit3, User } from "lucide-react"

// ─── Sprite SVG Renderers ─────────────────────────────────────

function MilkBottleSprite({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 32" className={cn("size-7 drop-shadow", className)}>
      {/* Cap */}
      <rect x="9" y="1" width="6" height="3" fill="#2563EB" rx="0.5" />
      {/* Neck */}
      <rect x="8" y="4" width="8" height="3" fill="#E2E8F0" />
      {/* Bottle Body */}
      <rect x="5" y="7" width="14" height="23" fill="#F8FAFC" rx="2" stroke="#94A3B8" strokeWidth="1" />
      {/* Label */}
      <rect x="6" y="14" width="12" height="10" fill="#3B82F6" rx="1" />
      <rect x="8" y="17" width="8" height="2" fill="#FFFFFF" />
      <rect x="9" y="20" width="6" height="1.5" fill="#DBEAFE" />
    </svg>
  )
}

function CanSprite({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 28" className={cn("size-6 drop-shadow", className)}>
      {/* Can Body */}
      <rect x="3" y="3" width="14" height="23" fill="#0284C7" rx="2" stroke="#0369A1" strokeWidth="1" />
      {/* Can Top Rim */}
      <ellipse cx="10" cy="3" rx="7" ry="2" fill="#94A3B8" />
      <ellipse cx="10" cy="3" rx="4" ry="1" fill="#64748B" />
      {/* Can Highlight */}
      <rect x="5" y="6" width="2" height="17" fill="#38BDF8" opacity="0.6" />
      {/* Text wave */}
      <path d="M4 14 Q7 11 10 14 T16 14" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

function BentoBoxSprite({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 34 22" className={cn("w-9 h-6 drop-shadow", className)}>
      {/* Tupperware Base */}
      <rect x="2" y="7" width="30" height="13" rx="2" fill="#F1F5F9" stroke="#64748B" strokeWidth="1" />
      {/* Lid */}
      <rect x="1" y="4" width="32" height="4" rx="1" fill="#EF4444" stroke="#B91C1C" strokeWidth="1" />
      {/* Food contents visible inside */}
      <circle cx="10" cy="14" r="3" fill="#EAB308" />
      <rect x="16" y="11" width="12" height="6" rx="1" fill="#84CC16" />
      <rect x="18" y="13" width="8" height="2" fill="#A16207" />
    </svg>
  )
}

function JarSprite({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 22 26" className={cn("size-6 drop-shadow", className)}>
      {/* Lid */}
      <rect x="5" y="2" width="12" height="4" rx="1" fill="#DC2626" stroke="#991B1B" strokeWidth="1" />
      {/* Glass Jar */}
      <rect x="3" y="6" width="16" height="18" rx="2" fill="#FEF3C7" stroke="#D97706" strokeWidth="1" />
      {/* Sambal/Jam contents */}
      <rect x="4" y="10" width="14" height="13" fill="#B91C1C" rx="1" />
      <circle cx="9" cy="15" r="1.5" fill="#FBBF24" />
      <circle cx="14" cy="17" r="1" fill="#FBBF24" />
    </svg>
  )
}

function FruitSprite({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 24" className={cn("w-7 h-6 drop-shadow", className)}>
      {/* Watermelon Slice */}
      <path d="M4 8 Q14 22 24 8 Z" fill="#EF4444" stroke="#15803D" strokeWidth="2" />
      <path d="M6 8 Q14 20 22 8 Z" fill="#DC2626" />
      {/* Seeds */}
      <circle cx="11" cy="10" r="0.8" fill="#000000" />
      <circle cx="17" cy="10" r="0.8" fill="#000000" />
      <circle cx="14" cy="13" r="0.8" fill="#000000" />
    </svg>
  )
}

function PastrySprite({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 26 24" className={cn("size-6 drop-shadow", className)}>
      {/* Donut base */}
      <circle cx="13" cy="12" r="9" fill="#D97706" />
      {/* Frosting */}
      <circle cx="13" cy="12" r="8" fill="#EC4899" />
      {/* Hole */}
      <circle cx="13" cy="12" r="3.5" fill="#FFFFFF" />
      {/* Sprinkles */}
      <rect x="8" y="8" width="2" height="1" fill="#FDE047" transform="rotate(25 9 8)" />
      <rect x="15" y="7" width="2" height="1" fill="#60A5FA" transform="rotate(-30 16 7)" />
      <rect x="16" y="15" width="2" height="1" fill="#A78BFA" transform="rotate(45 17 15)" />
    </svg>
  )
}

function IcePackSprite({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 24" className={cn("w-7 h-6 drop-shadow", className)}>
      {/* Ice pack gel pouch */}
      <rect x="2" y="4" width="24" height="16" rx="3" fill="#38BDF8" stroke="#0284C7" strokeWidth="1.5" />
      {/* Inner ice crystal pattern */}
      <path d="M14 6 L14 18 M8 12 L20 12 M9 8 L19 16 M9 16 L19 8" stroke="#E0F2FE" strokeWidth="1" opacity="0.8" />
    </svg>
  )
}

function GenericBoxSprite({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 26 24" className={cn("size-6 drop-shadow", className)}>
      <rect x="3" y="5" width="20" height="15" rx="1" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
      <rect x="2" y="4" width="22" height="3" rx="0.5" fill="#D97706" />
      <rect x="6" y="10" width="14" height="6" fill="#FEF3C7" rx="0.5" />
    </svg>
  )
}

// ─── Sprite Resolver ──────────────────────────────────────────

export function resolveItemSprite(item: FridgeItem) {
  const name = item.name.toLowerCase()
  if (name.includes("ice") || name.includes("gel") || name.includes("es batu")) {
    return <IcePackSprite />
  }
  if (name.includes("susu") || name.includes("uht") || name.includes("milk") || name.includes("greenfield")) {
    return <MilkBottleSprite />
  }
  if (name.includes("pocari") || name.includes("cola") || name.includes("kaleng") || name.includes("soda") || name.includes("kopi")) {
    return <CanSprite />
  }
  if (name.includes("bekal") || name.includes("nasi") || name.includes("teriyaki") || name.includes("ayam") || name.includes("tupperware") || name.includes("bento")) {
    return <BentoBoxSprite />
  }
  if (name.includes("sambal") || name.includes("saus") || name.includes("bumbu") || name.includes("mayo") || name.includes("kecap") || name.includes("selai")) {
    return <JarSprite />
  }
  if (name.includes("semangka") || name.includes("buah") || name.includes("sayur") || name.includes("salad") || name.includes("jeruk") || name.includes("apel")) {
    return <FruitSprite />
  }
  if (name.includes("donat") || name.includes("kue") || name.includes("roti") || name.includes("cake") || name.includes("j.co") || name.includes("pastry")) {
    return <PastrySprite />
  }
  if (item.category === "minuman") return <MilkBottleSprite />
  if (item.category === "bumbu") return <JarSprite />
  if (item.category === "makanan") return <BentoBoxSprite />
  return <GenericBoxSprite />
}

// ─── Interactive Sprite Component ─────────────────────────────

interface FridgeItemSpriteProps {
  item: FridgeItem
  canEdit: boolean
  isSelected: boolean
  onSelect: (item: FridgeItem) => void
  onEdit: (item: FridgeItem) => void
  onDelete: (item: FridgeItem) => void
}

export function FridgeItemSprite({
  item,
  canEdit,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: FridgeItemSpriteProps) {
  const status = getExpiryStatus(item)
  const isExp = status === "expired"
  const isSoon = status === "soon"

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ itemId: item.id }))
    e.dataTransfer.effectAllowed = "move"
  }

  return (
    <div className="relative group select-none">
      {/* Drag & Click Target */}
      <button
        type="button"
        draggable
        onDragStart={handleDragStart}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(item)
        }}
        title={`${item.name} (${item.ownerName}) — Tarik untuk pindah rak, klik untuk detail`}
        className={cn(
          "relative flex flex-col items-center justify-center p-1 rounded transition-all cursor-grab active:cursor-grabbing",
          "hover:scale-110 active:scale-95",
          isSelected && "ring-2 ring-[#1E4E8C] ring-offset-1 bg-blue-100/40",
          isExp && "opacity-60 grayscale-[40%]",
          isSoon && "animate-pulse"
        )}
      >
        {/* Visual Sprite */}
        <div className="relative">
          {resolveItemSprite(item)}

          {/* Expiry Indicator Dot */}
          {item.expiredAt && (
            <span
              className={cn(
                "absolute -top-1 -right-1 size-2 rounded-full border border-white shadow-sm",
                isExp ? "bg-red-600" : isSoon ? "bg-amber-500" : "bg-emerald-500"
              )}
            />
          )}
        </div>

        {/* Minimal name label below sprite */}
        <span className="font-mono text-[9px] font-bold text-slate-800 bg-white/80 px-1 rounded-[2px] shadow-sm max-w-[65px] truncate mt-0.5 leading-tight border border-slate-200">
          {item.name}
        </span>
      </button>

      {/* Popover Detail Modal when Selected */}
      {isSelected && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-white rounded-[3px] border-2 border-[#102A45] shadow-[4px_4px_0px_rgba(0,0,0,0.25)] p-2.5 text-[#14253D] font-mono text-left animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-1 border-b border-slate-200 pb-1.5 mb-1.5">
            <div className="min-w-0 flex-1">
              <div className="font-bold text-[11px] leading-tight text-[#102A45] truncate">
                {item.name}
              </div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wide">
                {item.category}
              </div>
            </div>
            <span className="text-lg leading-none shrink-0">{item.category === "makanan" ? "🍱" : item.category === "minuman" ? "🧃" : item.category === "bumbu" ? "🧂" : "📦"}</span>
          </div>

          {/* Owner info */}
          <div className="flex items-center gap-1.5 py-0.5">
            {item.ownerAvatar ? (
              <img
                src={item.ownerAvatar}
                alt={item.ownerName}
                className="size-4 rounded-full border border-slate-200 shrink-0"
              />
            ) : (
              <User className="size-3.5 text-slate-400 shrink-0" />
            )}
            <span className="text-[10px] text-slate-700 truncate font-semibold">
              {item.ownerName}
            </span>
          </div>

          {/* Expiry date */}
          <div className="flex items-center gap-1.5 text-[9px] text-slate-600 mt-1">
            <Clock className="size-3 shrink-0 text-slate-400" />
            <span>
              {item.expiredAt ? (
                <span
                  className={cn(
                    "font-bold",
                    isExp ? "text-red-600" : isSoon ? "text-amber-600" : "text-emerald-700"
                  )}
                >
                  {isExp ? `Expired: ${formatExpiredAt(item.expiredAt)}` : `Exp: ${formatExpiredAt(item.expiredAt)}`}
                </span>
              ) : (
                <span className="text-slate-400 italic">Tanpa tanggal expired</span>
              )}
            </span>
          </div>

          {/* Notes */}
          {item.notes && (
            <div className="mt-1.5 text-[9px] text-slate-600 italic bg-slate-50 p-1 rounded border border-slate-200 leading-snug break-words">
              &quot;{item.notes}&quot;
            </div>
          )}

          {/* Action buttons */}
          {canEdit && (
            <div className="flex items-center justify-end gap-1 mt-2 pt-1.5 border-t border-slate-200">
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="h-5 px-1.5 text-[9px] font-bold rounded-[2px] bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="size-2.5" /> Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(item)}
                className="h-5 px-1.5 text-[9px] font-bold rounded-[2px] bg-red-50 text-red-800 border border-red-300 hover:bg-red-100 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="size-2.5" /> Ambil/Buang
              </button>
            </div>
          )}

          {/* Popover Arrow */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 size-2 bg-white border-b-2 border-r-2 border-[#102A45] rotate-45" />
        </div>
      )}
    </div>
  )
}
