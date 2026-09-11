"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { FridgeItem, FridgeSlot } from "@/lib/fridge-store"
import { FridgeItemSprite } from "./fridge-item-sprite"
import { Sparkles } from "lucide-react"

interface FridgeInteractiveProps {
  items: FridgeItem[]
  isOpen: boolean
  onToggleOpen: () => void
  onMoveSlot: (itemId: string, targetSlot: FridgeSlot) => Promise<{ success: boolean; error?: string }>
  canEdit: (item: FridgeItem) => boolean
  onEdit: (item: FridgeItem) => void
  onDelete: (item: FridgeItem) => void
}

// ─── Drop Shelf Area ──────────────────────────────────────────

function FridgeShelfZone({
  slot,
  title,
  subtitle,
  items,
  dragOverSlot,
  onDragOver,
  onDragLeave,
  onDrop,
  selectedItemId,
  onSelectItem,
  canEdit,
  onEdit,
  onDelete,
  className,
}: {
  slot: FridgeSlot
  title: string
  subtitle?: string
  items: FridgeItem[]
  dragOverSlot: FridgeSlot | null
  onDragOver: (e: React.DragEvent, slot: FridgeSlot) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, slot: FridgeSlot) => void
  selectedItemId: string | null
  onSelectItem: (item: FridgeItem) => void
  canEdit: (item: FridgeItem) => boolean
  onEdit: (item: FridgeItem) => void
  onDelete: (item: FridgeItem) => void
  className?: string
}) {
  const isOver = dragOverSlot === slot

  return (
    <div
      onDragOver={(e) => onDragOver(e, slot)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, slot)}
      className={cn(
        "relative rounded-[2px] transition-all flex flex-col justify-end p-1.5 min-h-[64px]",
        isOver
          ? "bg-blue-300/40 border-2 border-dashed border-[#1E4E8C] ring-2 ring-blue-400"
          : "border-b-2 border-b-[#93C5FD]/60 hover:bg-white/20",
        className
      )}
    >
      {/* Shelf Header Tag */}
      <div className="absolute top-1 left-1.5 flex items-center gap-1 opacity-70 pointer-events-none">
        <span className="font-mono text-[8px] font-bold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        {subtitle && (
          <span className="font-mono text-[7px] text-slate-400 hidden sm:inline">
            ({subtitle})
          </span>
        )}
      </div>

      {/* Items on Shelf */}
      <div className="flex flex-wrap items-end gap-1.5 pt-3 min-h-[44px]">
        {items.map((item) => (
          <FridgeItemSprite
            key={item.id}
            item={item}
            isSelected={selectedItemId === item.id}
            onSelect={onSelectItem}
            canEdit={canEdit(item)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}

        {items.length === 0 && (
          <div className="w-full text-center py-1">
            <span className="font-mono text-[8px] text-slate-400 italic">
              (Rak kosong — tarik item ke sini)
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Interactive Fridge ──────────────────────────────────

export function FridgeInteractive({
  items,
  isOpen,
  onToggleOpen,
  onMoveSlot,
  canEdit,
  onEdit,
  onDelete,
}: FridgeInteractiveProps) {
  const [dragOverSlot, setDragOverSlot] = React.useState<FridgeSlot | null>(null)
  const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null)

  // Filter items by slot
  const freezerItems = React.useMemo(() => items.filter((i) => i.slot === "freezer"), [items])
  const chillerItems = React.useMemo(() => items.filter((i) => i.slot === "chiller"), [items])
  const mainUpperItems = React.useMemo(() => items.filter((i) => i.slot === "main_upper"), [items])
  const mainLowerItems = React.useMemo(() => items.filter((i) => i.slot === "main_lower"), [items])
  const crisperItems = React.useMemo(() => items.filter((i) => i.slot === "crisper"), [items])
  const doorItems = React.useMemo(() => items.filter((i) => i.slot === "door"), [items])

  const handleDragOver = (e: React.DragEvent, slot: FridgeSlot) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    if (dragOverSlot !== slot) {
      setDragOverSlot(slot)
    }
  }

  const handleDragLeave = () => {
    setDragOverSlot(null)
  }

  const handleDrop = async (e: React.DragEvent, targetSlot: FridgeSlot) => {
    e.preventDefault()
    setDragOverSlot(null)
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"))
      if (data?.itemId) {
        await onMoveSlot(data.itemId, targetSlot)
      }
    } catch {
      // invalid payload
    }
  }

  // Deselect on outside click
  React.useEffect(() => {
    const handleWindowClick = () => setSelectedItemId(null)
    window.addEventListener("click", handleWindowClick)
    return () => window.removeEventListener("click", handleWindowClick)
  }, [])

  return (
    <div className="relative flex flex-col items-center justify-center p-4 w-full h-full select-none overflow-hidden">
      {/* 3D Viewport Perspective Container */}
      <div
        className="relative flex items-center justify-center"
        style={{ perspective: "1400px" }}
      >
        {/* KULKAS BODY (CABINET) */}
        <div className="relative w-[340px] sm:w-[400px] h-[550px] bg-gradient-to-b from-[#C8D1DC] via-[#D8E1EC] to-[#B0BDCE] rounded-t-[10px] rounded-b-[6px] border-4 border-[#8A9BAE] shadow-2xl p-2.5 flex flex-col justify-between">
          {/* Top Brand Logo Banner */}
          <div className="flex items-center justify-between px-2 pb-1 border-b border-[#94A3B8]/60">
            <div className="flex items-center gap-1">
              <span className="font-mono text-[10px] font-black text-[#1E3A5F] tracking-widest">
                LG
              </span>
              <span className="font-mono text-[8px] text-slate-600 tracking-wider">
                GN-Y201CLS // 1 PINTU
              </span>
            </div>
            <div className="flex items-center gap-1 text-[8px] font-mono font-bold text-slate-500">
              <span className={cn("size-2 rounded-full", isOpen ? "bg-emerald-500 shadow-[0_0_6px_#10B981]" : "bg-slate-400")} />
              <span>{isOpen ? "TERBUKA" : "TERTUTUP"}</span>
            </div>
          </div>

          {/* INTERIOR COMPARTMENTS (VISIBLE WHEN DOOR OPENS) */}
          <div className="relative flex-1 bg-gradient-to-b from-[#F0F6FC] via-[#FFFFFF] to-[#E2ECF7] rounded-[4px] border-2 border-[#CBD5E1] p-2 flex flex-col gap-1.5 overflow-hidden shadow-inner mt-1">
            {/* Interior Light Glow when open */}
            {isOpen && (
              <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-amber-100/60 via-blue-50/20 to-transparent pointer-events-none animate-in fade-in-0 duration-300" />
            )}

            {/* 1. FREEZER BOX (TOP) */}
            <div className="relative bg-gradient-to-r from-blue-100/70 via-blue-50/80 to-blue-100/70 border-2 border-blue-300 rounded-[3px] shadow-sm">
              <div className="bg-blue-200/80 border-b border-blue-300 px-2 py-0.5 flex items-center justify-between">
                <span className="font-mono text-[8px] font-black text-blue-900 tracking-wider flex items-center gap-1">
                  ❄️ FREEZER BOX
                </span>
                <span className="font-mono text-[7px] text-blue-800 font-bold bg-blue-100 px-1 rounded">
                  -18°C
                </span>
              </div>
              <FridgeShelfZone
                slot="freezer"
                title="Freezer"
                items={freezerItems}
                dragOverSlot={dragOverSlot}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                selectedItemId={selectedItemId}
                onSelectItem={(item) => setSelectedItemId(item.id)}
                canEdit={canEdit}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>

            {/* 2. CHILLER TRAY */}
            <div className="bg-white/60 border border-blue-200 rounded-[2px] shadow-sm">
              <FridgeShelfZone
                slot="chiller"
                title="Chiller Tray"
                subtitle="Susu, Daging, Yogurt"
                items={chillerItems}
                dragOverSlot={dragOverSlot}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                selectedItemId={selectedItemId}
                onSelectItem={(item) => setSelectedItemId(item.id)}
                canEdit={canEdit}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>

            {/* 3. MAIN SHELF 1 (UPPER) */}
            <div className="bg-white/80 border border-slate-200 rounded-[2px] shadow-sm">
              <FridgeShelfZone
                slot="main_upper"
                title="Tempered Glass Shelf 1"
                subtitle="Kue, Roti, Makanan"
                items={mainUpperItems}
                dragOverSlot={dragOverSlot}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                selectedItemId={selectedItemId}
                onSelectItem={(item) => setSelectedItemId(item.id)}
                canEdit={canEdit}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>

            {/* 4. MAIN SHELF 2 (LOWER) */}
            <div className="bg-white/80 border border-slate-200 rounded-[2px] shadow-sm">
              <FridgeShelfZone
                slot="main_lower"
                title="Tempered Glass Shelf 2"
                subtitle="Kotak Bekal, Tupperware"
                items={mainLowerItems}
                dragOverSlot={dragOverSlot}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                selectedItemId={selectedItemId}
                onSelectItem={(item) => setSelectedItemId(item.id)}
                canEdit={canEdit}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>

            {/* 5. VEGGIE CRISPER BOX (BOTTOM DRAWER) */}
            <div className="mt-auto bg-gradient-to-r from-emerald-100/60 via-green-50/70 to-emerald-100/60 border-2 border-emerald-300 rounded-[3px] shadow-inner">
              <div className="bg-emerald-200/60 border-b border-emerald-300 px-2 py-0.5 flex items-center justify-between">
                <span className="font-mono text-[8px] font-black text-emerald-900 tracking-wider flex items-center gap-1">
                  🥬 VEGGIE & FRUIT BOX
                </span>
                <span className="font-mono text-[7px] text-emerald-800 font-bold bg-emerald-100 px-1 rounded">
                  Moist Crisper
                </span>
              </div>
              <FridgeShelfZone
                slot="crisper"
                title="Crisper"
                items={crisperItems}
                dragOverSlot={dragOverSlot}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                selectedItemId={selectedItemId}
                onSelectItem={(item) => setSelectedItemId(item.id)}
                canEdit={canEdit}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          </div>

          {/* Bottom Compressor Grille & Legs */}
          <div className="pt-2 flex items-center justify-between px-4">
            <div className="w-5 h-2 bg-[#5E7287] rounded-b" />
            <div className="flex gap-1.5">
              <div className="w-8 h-1 bg-[#8A9BAE] rounded-full" />
              <div className="w-8 h-1 bg-[#8A9BAE] rounded-full" />
              <div className="w-8 h-1 bg-[#8A9BAE] rounded-full" />
            </div>
            <div className="w-5 h-2 bg-[#5E7287] rounded-b" />
          </div>

          {/* 3D SWINGING DOOR */}
          <div
            onClick={!isOpen ? onToggleOpen : undefined}
            style={{
              transformOrigin: "left center",
              transform: isOpen ? "rotateY(-110deg)" : "rotateY(0deg)",
              transition: "transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.6s ease",
              transformStyle: "preserve-3d",
            }}
            className={cn(
              "absolute inset-0 z-30 bg-gradient-to-r from-[#B4C0CF] via-[#D8E1EC] to-[#A4B3C5] rounded-t-[10px] rounded-b-[6px] border-4 border-[#738598] p-3 flex flex-col justify-between select-none",
              isOpen ? "cursor-default shadow-[-16px_10px_24px_rgba(0,0,0,0.35)] pointer-events-auto" : "cursor-pointer shadow-2xl hover:brightness-105"
            )}
          >
            {/* FRONT OF DOOR (Brushed Silver LG Exterior) */}
            <div className={cn("flex flex-col justify-between h-full", isOpen && "opacity-20 transition-opacity")}>
              {/* Door Top Logo & Model */}
              <div className="flex items-center justify-between px-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <div className="size-4 rounded-full bg-[#A50034] text-white flex items-center justify-center font-bold text-[8px] shadow">
                    LG
                  </div>
                  <span className="font-mono text-[9px] font-black text-slate-700 tracking-wider">
                    Life&apos;s Good
                  </span>
                </div>
                <span className="font-mono text-[8px] text-slate-500 font-bold">
                  GN-Y201CLS
                </span>
              </div>

              {/* Center Brushed Texture Lines */}
              <div className="flex-1 flex flex-col items-center justify-center gap-2 pointer-events-none opacity-40">
                <div className="w-24 h-0.5 bg-white rounded-full" />
                <div className="font-mono text-[10px] text-slate-600 font-bold tracking-widest uppercase">
                  {isOpen ? "Pintu Terbuka" : "Klik Untuk Membuka"}
                </div>
                <div className="w-16 h-0.5 bg-white rounded-full" />
              </div>

              {/* Vertical Door Pocket Handle on Right */}
              <div className="absolute top-12 right-2 w-5 h-28 bg-gradient-to-r from-[#5E7287] via-[#8A9BAE] to-[#475569] rounded-[4px] border border-[#334155] shadow-[2px_2px_4px_rgba(0,0,0,0.3)] flex items-center justify-center">
                <div className="w-1.5 h-20 bg-[#1E293B] rounded-full opacity-60" />
              </div>

              {/* Door Bottom Stamp */}
              <div className="px-2 pb-1 flex items-center justify-between text-[7px] font-mono text-slate-500 border-t border-slate-300 pt-1">
                <span>Tempered Glass Shelves</span>
                <span>Recipro Compressor</span>
              </div>
            </div>

            {/* BACK OF DOOR (INNER DOOR POCKETS) - VISIBLE WHEN DOOR IS OPEN */}
            {isOpen && (
              <div
                style={{ transform: "rotateY(180deg)", backfaceVisibility: "visible" }}
                className="absolute inset-0 z-40 bg-gradient-to-r from-[#FFFFFF] via-[#F1F5F9] to-[#E2E8F0] p-2 flex flex-col justify-between rounded-t-[10px] rounded-b-[6px] border-4 border-[#CBD5E1]"
              >
                <div className="bg-blue-100 border-b border-blue-200 px-2 py-1 flex items-center justify-between">
                  <span className="font-mono text-[9px] font-black text-[#1E4E8C] tracking-wide flex items-center gap-1">
                    🍶 DOOR POCKETS (RAK PINTU)
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleOpen()
                    }}
                    className="h-5 px-1.5 bg-[#1E4E8C] hover:bg-[#153A6B] text-white font-mono text-[8px] font-bold rounded cursor-pointer"
                  >
                    Tutup Pintu
                  </button>
                </div>

                {/* Door Shelves Area */}
                <div className="flex-1 flex flex-col justify-around py-1">
                  <FridgeShelfZone
                    slot="door"
                    title="Rak Botol & Bumbu Pintu"
                    subtitle="Pocari, Susu, Toples Sambal"
                    items={doorItems}
                    dragOverSlot={dragOverSlot}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    selectedItemId={selectedItemId}
                    onSelectItem={(item) => setSelectedItemId(item.id)}
                    canEdit={canEdit}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    className="min-h-[140px] bg-white/70 border-2 border-blue-200 rounded"
                  />
                </div>

                <div className="text-center font-mono text-[7px] text-slate-400 py-0.5">
                  Tarik botol / saus ke rak pintu ini
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Helper Banner Under Fridge */}
      <div className="mt-3 flex items-center gap-2 bg-white/90 border border-slate-300 px-3 py-1 rounded-[3px] shadow-sm text-[11px] font-mono text-slate-700">
        <Sparkles className="size-3.5 text-amber-500 shrink-0" />
        <span>
          {isOpen
            ? "Tarik (drag & drop) item antar rak untuk memindahkan slot. Klik item untuk melihat info pemilik."
            : "Klik kulkas atau gagang untuk membuka pintu kulkas 1 pintu LG."}
        </span>
      </div>
    </div>
  )
}
