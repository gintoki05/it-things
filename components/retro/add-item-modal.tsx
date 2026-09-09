"use client"

import * as React from "react"
import { RetroWindow } from "@/components/retro/window"
import { RetroButton } from "@/components/retro/button"
import { RetroInput } from "@/components/retro/input"
import { useAuth } from "@/lib/auth"
import { PlusCircle, AlertCircle } from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { RetroIcon, RetroIconName } from "@/components/ui/retro-icon"

interface AddItemModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (name: string, category: string, notes: string, emoji: string, proposedBy: string) => void
}

const ICON_OPTIONS: RetroIconName[] = [
  "pantry",
  "coffee",
  "gift",
  "favorite",
  "like",
  "idea",
  "task",
  "trophy",
  "poll",
  "archive",
]

export function AddItemModal({ isOpen, onClose, onAdd }: AddItemModalProps) {
  const { user } = useAuth()
  const [name, setName] = React.useState("")
  const [category, setCategory] = React.useState("Snack Gurih")
  const [notes, setNotes] = React.useState("")
  const [selectedEmoji, setSelectedEmoji] = React.useState<string>("pantry")
  const [error, setError] = React.useState("")

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError("Nama item belanja wajib diisi!")
      return
    }

    onAdd(
      name.trim(),
      category,
      notes.trim(),
      selectedEmoji,
      user?.name || "Anonim"
    )

    // Reset & close
    setName("")
    setNotes("")
    setError("")
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
      <RetroWindow
        title="TAMBAH USULAN BELANJA KONSUMSI — NEW_ITEM.EXE"
        icon={<PlusCircle className="size-4 text-[var(--primary)]" />}
        onClose={onClose}
        className="w-full max-w-lg shadow-retro-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <div>
                <AlertTitle>INPUT INVALID</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </div>
            </Alert>
          )}

          <div className="space-y-1.5">
            <label className="block font-mono text-xs font-semibold text-[var(--foreground)]">
              PILIH IKON RETRO:
            </label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((iconName) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setSelectedEmoji(iconName)}
                  title={iconName}
                  className={`size-9 rounded-[3px] border flex items-center justify-center p-1 transition-all ${
                    selectedEmoji === iconName
                      ? "border-[#1E4E8C] bg-blue-100/60 shadow-inner scale-105"
                      : "border-[var(--border)] bg-white dark:bg-[var(--surface-muted)] hover:bg-[#EEF2F6]"
                  }`}
                >
                  <RetroIcon name={iconName} iconSize={32} className="size-6 object-contain" />
                </button>
              ))}
            </div>
          </div>

          <RetroInput
            label="NAMA ITEM / MAKANAN / SNACK:"
            placeholder="Contoh: Pop Mie Kuah Kari, Kopi Drip Bag, dll."
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={error}
            autoFocus
          />

          <div className="space-y-1">
            <label className="block font-mono text-xs font-semibold text-[var(--foreground)]">
              KATEGORI:
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-9 px-3 rounded-[3px] bg-white dark:bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="Snack Gurih">Snack Gurih / Keripik</option>
              <option value="Biskuit / Manis">Biskuit & Makanan Manis</option>
              <option value="Makanan Berat / Instant">Makanan Instan / Cup / Berat</option>
              <option value="Minuman & Kopi">Kopi, Teh & Minuman Dingin</option>
              <option value="Bumbu & Pelengkap">Bumbu & Pelengkap Pantry</option>
              <option value="Lain-lain">Lain-lain</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block font-mono text-xs font-semibold text-[var(--foreground)]">
              CATATAN TAMBAHAN (OPSIONAL):
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: Beli 2 pack rasa keju, jangan yang terlalu pedas..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 rounded-[3px] bg-white dark:bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
            />
          </div>

          <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
            <div className="font-mono text-[11px] text-[var(--foreground-muted)]">
              Pengusul: <span className="font-bold text-[var(--foreground)]">{user?.name || "Anggota Tim"}</span>
            </div>
            <div className="flex gap-2">
              <RetroButton type="button" variant="outline" size="default" onClick={onClose}>
                [ Batal ]
              </RetroButton>
              <RetroButton type="submit" variant="primary" size="default">
                [ + Tambahkan ]
              </RetroButton>
            </div>
          </div>
        </form>
      </RetroWindow>
    </div>
  )
}
