"use client"

import * as React from "react"
import { Refrigerator, AlertTriangle, RotateCw, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  useFridgeStore,
  FridgeItem,
  FridgeCategory,
  FridgeSlot,
  FRIDGE_CATEGORIES,
  getExpiryStatus,
  formatExpiredAt,
  isExpired,
} from "@/lib/fridge-store"
import { useAuth } from "@/lib/auth"
import { FridgeAddDialog } from "./fridge-add-dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { RetroActionButton } from "@/components/ui/retro-action-button"
import { playRetroNotificationSound } from "@/lib/sound-effects"
import { FridgeSvgScene } from "./fridge-svg-scene"
import { FridgeSlotPanel } from "./fridge-slot-panel"

// ─── Category filter tabs ────────────────────────────────────

const ALL_FILTER = { value: "all" as const, label: "Semua", emoji: "🧊" }
const CATEGORY_FILTERS = [ALL_FILTER, ...FRIDGE_CATEGORIES]

// ─── Item Card ───────────────────────────────────────────────

function FridgeItemCard({
  item,
  canEdit,
  onEdit,
  onDelete,
}: {
  item: FridgeItem
  canEdit: boolean
  onEdit: (item: FridgeItem) => void
  onDelete: (item: FridgeItem) => void
}) {
  const status = getExpiryStatus(item)
  const expired = status === "expired"
  const soon = status === "soon"
  const cat = FRIDGE_CATEGORIES.find((c) => c.value === item.category)

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-1.5 p-2.5 rounded-[3px] border bg-white shadow-sm transition-all",
        expired
          ? "border-red-200 bg-red-50/60 opacity-70"
          : soon
            ? "border-amber-300 bg-amber-50/60"
            : "border-[#CBD5E1] hover:border-[#94A3B8]"
      )}
    >
      {/* Header row: emoji + name + actions */}
      <div className="flex items-start gap-2">
        <span className="text-xl leading-none shrink-0 mt-0.5">{cat?.emoji ?? "📦"}</span>
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "font-mono text-[12px] font-bold leading-snug truncate",
              expired ? "text-red-700 line-through" : "text-[#14253D]"
            )}
          >
            {item.name}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            {cat?.label ?? item.category}
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <RetroActionButton
              action="edit"
              visual="icon"
              size="xs"
              onClick={() => onEdit(item)}
              tooltip="Edit item"
            />
            <RetroActionButton
              action="delete"
              visual="icon"
              size="xs"
              onClick={() => onDelete(item)}
              tooltip="Hapus item"
            />
          </div>
        )}
      </div>

      {/* Owner */}
      <div className="flex items-center gap-1.5">
        {item.ownerAvatar ? (
          <img
            src={item.ownerAvatar}
            alt={item.ownerName}
            className="size-4 rounded-full border border-slate-200 shrink-0"
          />
        ) : (
          <div className="size-4 rounded-full bg-[#1E4E8C] text-white flex items-center justify-center text-[8px] font-bold shrink-0">
            {item.ownerName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-[10px] text-slate-600 font-mono truncate">{item.ownerName}</span>
      </div>

      {/* Notes */}
      {item.notes && (
        <div className="text-[10px] text-slate-500 italic leading-snug line-clamp-2 bg-slate-50 px-1.5 py-1 rounded border border-slate-100">
          {item.notes}
        </div>
      )}

      {/* Expiry badge */}
      {item.expiredAt && (
        <div
          className={cn(
            "flex items-center gap-1 text-[10px] font-mono font-bold rounded-[2px] px-1.5 py-0.5 w-fit",
            expired
              ? "bg-red-100 text-red-700 border border-red-200"
              : soon
                ? "bg-amber-100 text-amber-700 border border-amber-200 animate-pulse"
                : "bg-green-50 text-green-700 border border-green-200"
          )}
        >
          <Clock className="size-2.5 shrink-0" />
          {expired
            ? `EXPIRED — ${formatExpiredAt(item.expiredAt)}`
            : `Exp: ${formatExpiredAt(item.expiredAt)}`}
        </div>
      )}
    </div>
  )
}

// ─── Main App ────────────────────────────────────────────────

export function FridgeApp() {
  const { user, isGuest } = useAuth()
  const {
    items,
    isLoading,
    tableMissing,
    error,
    expiredCount,
    expiringSoonCount,
    addItem,
    deleteItem,
    updateItem,
    refresh,
    canEdit,
  } = useFridgeStore()

  const [viewMode, setViewMode] = React.useState<"visual" | "list">("visual")
  const [selectedSlot, setSelectedSlot] = React.useState<FridgeSlot | null>(null)
  const [filterCategory, setFilterCategory] = React.useState<FridgeCategory | "all">("all")
  const [showAddDialog, setShowAddDialog] = React.useState(false)
  const [editingItem, setEditingItem] = React.useState<FridgeItem | null>(null)
  const [deletingItem, setDeletingItem] = React.useState<FridgeItem | null>(null)
  const [addDefaultSlot, setAddDefaultSlot] = React.useState<FridgeSlot>("main_upper")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const filteredItems = React.useMemo(() => {
    if (filterCategory === "all") return items
    return items.filter((i) => i.category === filterCategory)
  }, [items, filterCategory])

  // Sort: expired last, expiring soon first among active, pastikan item unik by id
  const sortedItems = React.useMemo(() => {
    const seenIds = new Set<string>()
    const uniqueItems = filteredItems.filter((item) => {
      if (seenIds.has(item.id)) return false
      seenIds.add(item.id)
      return true
    })

    return uniqueItems.sort((a, b) => {
      const sa = getExpiryStatus(a)
      const sb = getExpiryStatus(b)
      if (sa === "expired" && sb !== "expired") return 1
      if (sb === "expired" && sa !== "expired") return -1
      if (sa === "soon" && sb !== "soon") return -1
      if (sb === "soon" && sa !== "soon") return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [filteredItems])


  const handleSubmit = async (data: {
    name: string
    category: FridgeCategory
    slot: FridgeSlot
    notes?: string
    expiredAt?: string
  }) => {
    setIsSubmitting(true)
    let result: { success: boolean; error?: string }
    if (editingItem) {
      result = await updateItem(editingItem.id, {
        name: data.name,
        category: data.category,
        slot: data.slot,
        notes: data.notes,
        expiredAt: data.expiredAt,
      })
    } else {
      result = await addItem(data)
    }
    setIsSubmitting(false)
    if (result.success) {
      playRetroNotificationSound()
    }
    return result
  }

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return
    setIsDeleting(true)
    await deleteItem(deletingItem.id)
    setIsDeleting(false)
    setDeletingItem(null)
    playRetroNotificationSound()
  }

  const alertCount = expiredCount + expiringSoonCount

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#E8EEF5] select-none">
      {/* ── Header Toolbar ── */}
      <div className="shrink-0 border-b border-[#CBD5E1] bg-white px-4 py-2 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <Refrigerator className="size-5 text-[#1E4E8C] shrink-0" />
          <div className="min-w-0">
            <div className="font-mono text-sm font-bold text-[#14253D] truncate">
              Kulkas Virtual LG 1 Pintu
            </div>
            <div className="font-mono text-[10px] text-slate-500">
              {items.length} item tersimpan
              {alertCount > 0 && (
                <span className="ml-2 text-amber-600 font-bold">
                  · {alertCount} perlu perhatian
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* View Switcher */}
          <div className="flex items-center rounded border border-[#CBD5E1] bg-slate-100 p-0.5 text-[10px] font-mono font-bold">
            <button
              type="button"
              onClick={() => setViewMode("visual")}
              className={cn(
                "px-2 py-0.5 rounded-[2px] transition-colors cursor-pointer flex items-center gap-1",
                viewMode === "visual" ? "bg-[#1E4E8C] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              🧊 Visual
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "px-2 py-0.5 rounded-[2px] transition-colors cursor-pointer",
                viewMode === "list" ? "bg-[#1E4E8C] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              )}
            >
              Daftar
            </button>
          </div>

          <RetroActionButton
            action="refresh"
            visual="icon"
            size="sm"
            onClick={refresh}
            isLoading={isLoading}
            tooltip="Segarkan data"
          />

          {!isGuest && (
            <RetroActionButton
              action="add"
              visual="button"
              label="Titip Item"
              onClick={() => {
                setEditingItem(null)
                setAddDefaultSlot(selectedSlot ?? "main_upper")
                setShowAddDialog(true)
              }}
            />
          )}
        </div>
      </div>


      {/* ── Alert Expired / Expiring Soon Banner ── */}
      {alertCount > 0 && (
        <div className="shrink-0 flex items-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-1.5">
          <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
          <span className="text-[11px] font-mono text-amber-800">
            {expiredCount > 0 && (
              <span className="text-red-700 font-bold">{expiredCount} item expired</span>
            )}
            {expiredCount > 0 && expiringSoonCount > 0 && <span className="mx-1">·</span>}
            {expiringSoonCount > 0 && (
              <span>{expiringSoonCount} item expired dalam 3 hari</span>
            )}
            {" — segera konsumsi atau ambil dari kulkas."}
          </span>
        </div>
      )}

      {/* ── MAIN CONTENT VIEW ── */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {viewMode === "visual" ? (
          /* SVG ILLUSTRATED FRIDGE + SLOT PANEL */
          <div className="flex h-full">
            {/* Fridge illustration (fixed width) */}
            <div className="shrink-0 w-[360px] h-full overflow-hidden">
              <FridgeSvgScene
                items={items}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
              />
            </div>

            {/* Slot detail panel */}
            <FridgeSlotPanel
              selectedSlot={selectedSlot}
              items={items}
              canEdit={canEdit}
              onEdit={(item) => {
                setEditingItem(item)
                setShowAddDialog(true)
              }}
              onDelete={(item) => setDeletingItem(item)}
              onAddItem={(slot) => {
                setEditingItem(null)
                setAddDefaultSlot(slot)
                setShowAddDialog(true)
              }}
              isGuest={isGuest}
            />
          </div>
        ) : (
          /* CARD LIST VIEW WITH FILTER */
          <div className="flex flex-col h-full">
            {/* Category Filter */}
            <div className="shrink-0 border-b border-[#CBD5E1] bg-white px-4 py-1.5 flex gap-1 overflow-x-auto">
              {CATEGORY_FILTERS.map((cat) => {
                const count =
                  cat.value === "all"
                    ? items.length
                    : items.filter((i) => i.category === cat.value).length
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFilterCategory(cat.value as FridgeCategory | "all")}
                    className={cn(
                      "shrink-0 flex items-center gap-1 h-6 px-2 rounded-[2px] border text-[10px] font-mono font-bold transition-all cursor-pointer",
                      filterCategory === cat.value
                        ? "bg-[#1E4E8C] text-white border-[#102A45]"
                        : "bg-white text-slate-600 border-[#CBD5E1] hover:bg-slate-50"
                    )}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                    <span className={cn("ml-0.5 rounded px-0.5", filterCategory === cat.value ? "text-blue-200" : "text-slate-400")}>
                      ({count})
                    </span>
                  </button>
                )
              })}
            </div>

            {/* List Grid */}
            <div className="flex-1 min-w-0 overflow-y-auto p-4">
              {isLoading && (
                <div className="flex items-center justify-center h-32 gap-2 text-xs font-mono text-slate-500">
                  <RotateCw className="size-4 animate-spin" />
                  Memuat isi kulkas...
                </div>
              )}

              {!isLoading && sortedItems.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
                  <Refrigerator className="size-10 text-slate-300" />
                  <div className="font-mono text-sm text-slate-400 font-bold">
                    {filterCategory === "all" ? "Kulkas kosong!" : "Tidak ada item di kategori ini"}
                  </div>
                </div>
              )}

              {!isLoading && sortedItems.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                  {sortedItems.map((item) => (
                    <FridgeItemCard
                      key={item.id}
                      item={item}
                      canEdit={canEdit(item)}
                      onEdit={(i) => {
                        setEditingItem(i)
                        setShowAddDialog(true)
                      }}
                      onDelete={(i) => setDeletingItem(i)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Dialogs ── */}
      <FridgeAddDialog
        isOpen={showAddDialog}
        onClose={() => {
          setShowAddDialog(false)
          setEditingItem(null)
        }}
        onSubmit={handleSubmit}
        editItem={editingItem}
        defaultSlot={editingItem ? editingItem.slot : addDefaultSlot}
        isLoading={isSubmitting}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDeleteConfirm}
        title="HAPUS_ITEM.EXE"
        message={
          deletingItem ? (
            <>
              Hapus <strong>&quot;{deletingItem.name}&quot;</strong> dari kulkas virtual?
              {isExpired(deletingItem) && (
                <span className="block mt-1 text-red-600 font-bold">Item ini sudah expired.</span>
              )}
            </>
          ) : null
        }
        confirmText="Hapus / Buang"
        variant="destructive"
        isLoading={isDeleting}
      />
    </div>
  )
}
