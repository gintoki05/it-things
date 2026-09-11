"use client"

import * as React from "react"
import { X, Refrigerator } from "lucide-react"
import { cn } from "@/lib/utils"
import { FRIDGE_CATEGORIES, FRIDGE_SLOTS, FridgeCategory, FridgeSlot, FridgeItem, getDefaultSlotForCategory } from "@/lib/fridge-store"

interface FridgeAddDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    name: string
    category: FridgeCategory
    slot: FridgeSlot
    notes?: string
    expiredAt?: string
  }) => Promise<{ success: boolean; error?: string }>
  editItem?: FridgeItem | null
  defaultSlot?: FridgeSlot
  isLoading?: boolean
}

export function FridgeAddDialog({
  isOpen,
  onClose,
  onSubmit,
  editItem,
  defaultSlot = "main_upper",
  isLoading = false,
}: FridgeAddDialogProps) {
  const isEdit = Boolean(editItem)

  const [name, setName] = React.useState("")
  const [category, setCategory] = React.useState<FridgeCategory>("makanan")
  const [slot, setSlot] = React.useState<FridgeSlot>(defaultSlot)
  const [expiredAt, setExpiredAt] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  // Reset / pre-fill form
  React.useEffect(() => {
    if (!isOpen) return
    if (editItem) {
      setName(editItem.name)
      setCategory(editItem.category)
      setSlot(editItem.slot || "main_upper")
      setExpiredAt(editItem.expiredAt ?? "")
      setNotes(editItem.notes ?? "")
    } else {
      setName("")
      setCategory("makanan")
      setSlot(defaultSlot)
      setExpiredAt("")
      setNotes("")
    }
    setSubmitError(null)
  }, [isOpen, editItem, defaultSlot])

  // Close on Escape
  React.useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isOpen, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!name.trim()) return

    const result = await onSubmit({
      name: name.trim(),
      category,
      slot,
      notes: notes.trim() || undefined,
      expiredAt: expiredAt || undefined,
    })

    if (result.success) {
      onClose()
    } else {
      setSubmitError(result.error ?? "Terjadi kesalahan")
    }
  }

  if (!isOpen) return null

  const todayStr = new Date().toISOString().split("T")[0]

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-4 select-none animate-in fade-in-0 duration-150">
      <div
        role="dialog"
        aria-modal="true"
        className="retro-window-frame max-w-md w-full rounded-[4px] overflow-hidden shadow-[6px_6px_0px_rgba(0,0,0,0.35)] bg-white flex flex-col max-h-[90vh] overflow-y-auto"
      >
        {/* Titlebar */}
        <div className="retro-titlebar px-3 py-1.5 flex items-center justify-between font-mono text-xs font-bold text-[#14253D] border-b border-[#A0AEC0] sticky top-0 bg-white z-10">
          <div className="flex items-center gap-1.5">
            <Refrigerator className="size-3.5 text-[#1E4E8C]" />
            <span>{isEdit ? "EDIT_ITEM.EXE" : "TAMBAH_ITEM.EXE"}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="hover:opacity-75 font-bold px-1 text-sm leading-none cursor-pointer disabled:opacity-50"
            title="Tutup (Esc)"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {/* Nama Item */}
          <div className="space-y-1">
            <label className="block font-mono text-[11px] font-bold text-[#14253D] uppercase tracking-wide">
              Nama Item <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                const val = e.target.value
                setName(val)
                if (!isEdit && val) {
                  setSlot(getDefaultSlotForCategory(category, val))
                }
              }}
              placeholder="cth: Bekal nasi, Susu UHT, Sambal..."
              maxLength={100}
              required
              disabled={isLoading}
              className="w-full h-8 px-2 text-xs font-sans border border-[#94A3B8] rounded-[2px] bg-white focus:outline-none focus:border-[#1E4E8C] focus:ring-1 focus:ring-[#1E4E8C] disabled:opacity-50 shadow-inner"
            />
          </div>

          {/* Kategori */}
          <div className="space-y-1">
            <label className="block font-mono text-[11px] font-bold text-[#14253D] uppercase tracking-wide">
              Kategori
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {FRIDGE_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setCategory(cat.value)
                    if (!isEdit) {
                      setSlot(getDefaultSlotForCategory(cat.value, name))
                    }
                  }}
                  className={cn(
                    "h-7 px-2 text-xs font-mono font-bold rounded-[2px] border transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50",
                    category === cat.value
                      ? "bg-[#1E4E8C] text-white border-[#102A45] shadow-[inset_1px_1px_0px_rgba(255,255,255,0.2)]"
                      : "bg-white text-[#14253D] border-[#CBD5E1] hover:bg-slate-50"
                  )}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Target Rak / Kompartemen */}
          <div className="space-y-1">
            <label className="block font-mono text-[11px] font-bold text-[#14253D] uppercase tracking-wide">
              Simpan Di Rak Mana?
            </label>
            <div className="grid grid-cols-2 gap-1">
              {FRIDGE_SLOTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setSlot(s.id)}
                  className={cn(
                    "p-1.5 text-left rounded-[2px] border transition-all cursor-pointer flex flex-col disabled:opacity-50",
                    slot === s.id
                      ? "bg-blue-50 border-[#1E4E8C] ring-1 ring-[#1E4E8C]"
                      : "bg-white border-[#CBD5E1] hover:bg-slate-50"
                  )}
                >
                  <span className="font-mono text-[10px] font-bold text-[#1E4E8C] flex items-center gap-1">
                    <span>{s.emoji}</span>
                    <span>{s.label}</span>
                  </span>
                  <span className="font-mono text-[8px] text-slate-500 truncate">
                    {s.sub}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tanggal Expired (opsional) */}
          <div className="space-y-1">
            <label className="block font-mono text-[11px] font-bold text-[#14253D] uppercase tracking-wide">
              Tanggal Expired
              <span className="ml-1 font-normal text-slate-400 normal-case">(opsional)</span>
            </label>
            <input
              type="date"
              value={expiredAt}
              onChange={(e) => setExpiredAt(e.target.value)}
              min={todayStr}
              disabled={isLoading}
              className="w-full h-8 px-2 text-xs font-sans border border-[#94A3B8] rounded-[2px] bg-white focus:outline-none focus:border-[#1E4E8C] focus:ring-1 focus:ring-[#1E4E8C] disabled:opacity-50 shadow-inner"
            />
          </div>

          {/* Catatan (opsional) */}
          <div className="space-y-1">
            <label className="block font-mono text-[11px] font-bold text-[#14253D] uppercase tracking-wide">
              Catatan
              <span className="ml-1 font-normal text-slate-400 normal-case">(opsional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="cth: Jangan diambil! Punya Aji"
              maxLength={300}
              rows={2}
              disabled={isLoading}
              className="w-full px-2 py-1.5 text-xs font-sans border border-[#94A3B8] rounded-[2px] bg-white focus:outline-none focus:border-[#1E4E8C] focus:ring-1 focus:ring-[#1E4E8C] disabled:opacity-50 resize-none shadow-inner"
            />
            <div className="text-right font-mono text-[10px] text-slate-400">
              {notes.length}/300
            </div>
          </div>

          {/* Error */}
          {submitError && (
            <div className="text-xs text-red-600 font-mono bg-red-50 border border-red-200 rounded-[2px] px-2 py-1.5">
              ⚠️ {submitError}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1 border-t border-[#CBD5E1]">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="retro-button-3d px-3.5 py-1 text-xs font-mono font-bold rounded-[2px] cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="px-3.5 py-1 text-white text-xs font-mono font-bold rounded-[2px] flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-sm bg-[#1E4E8C] hover:bg-[#153A6B] border border-[#102A45]"
            >
              <Refrigerator className="size-3" />
              {isLoading ? "Menyimpan..." : isEdit ? "Simpan" : "Masukkan ke Kulkas"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
