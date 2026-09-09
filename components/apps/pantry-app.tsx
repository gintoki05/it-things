"use client"

import * as React from "react"
import { useAuth } from "@/lib/auth"
import { usePantryStore, PantryItem } from "@/lib/pantry-store"
import { detectEmoji } from "@/lib/emoji-helper"
import {
  Calendar,
  Plus,
  RotateCw,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Info,
  Users,
  Archive,
  ListOrdered,
  Home,
  Trash2
} from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { UserAvatar } from "@/components/retro/user-avatar"

export function PantryApp() {
  const { user } = useAuth()

  const now = React.useMemo(() => new Date(), [])
  const currentMonth = React.useMemo(
    () => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    [now]
  )
  const monthFullLabel = React.useMemo(
    () => now.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
    [now]
  )

  const { items, isLoading, isUsingSupabase, tableMissing, toggleVote, addItem, deleteItem, refresh } =
    usePantryStore(currentMonth)

  const [newItemName, setNewItemName] = React.useState("")
  const [activeNav, setActiveNav] = React.useState<"home" | "list" | "members">("home")
  const [itemToDelete, setItemToDelete] = React.useState<PantryItem | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)
  const [deleteSuccess, setDeleteSuccess] = React.useState<string | null>(null)

  // Dynamic Statistics
  const totalItemsCount = items.length
  const totalVotesCount = items.reduce((acc, curr) => acc + (curr.voters?.length || 0), 0)

  const uniqueVoters = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; avatarUrl?: string }>()
    items.forEach((item) => {
      ;(item.voters || []).forEach((v) => {
        if (v && v.name && !map.has(v.id || v.name)) {
          map.set(v.id || v.name, v)
        }
      })
    })
    return Array.from(map.values())
  }, [items])

  const topItem = React.useMemo(() => {
    if (items.length === 0) return null
    const sorted = [...items].sort((a, b) => (b.voters?.length || 0) - (a.voters?.length || 0))
    return sorted[0]?.voters?.length ? sorted[0] : null
  }, [items])

  const handleVote = (itemId: string) => {
    if (!user) return
    toggleVote(itemId, {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
    })
  }

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim() || !user) return

    const emoji = detectEmoji(newItemName.trim())
    addItem(
      newItemName.trim(),
      "Usulan tim " + user.name,
      emoji,
      {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
      }
    )
    setNewItemName("")
  }

  return (
    <div className="flex flex-col gap-3 min-h-full font-sans">
      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4 select-none">
          <div className="retro-window-frame max-w-sm w-full rounded-[4px] overflow-hidden shadow-[5px_5px_0px_rgba(0,0,0,0.3)] flex flex-col bg-white">
            <div className="retro-titlebar px-3 py-1.5 flex items-center justify-between font-mono text-xs font-bold text-[#14253D]">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="size-3.5 text-[#C54139]" />
                <span>CONFIRM_DELETE.EXE</span>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setItemToDelete(null)}
                className="text-[#526374] hover:text-black font-bold font-mono px-1"
              >
                ×
              </button>
            </div>

            <div className="p-4 bg-white space-y-3">
              <Alert variant="destructive">
                <AlertTriangle className="size-4" />
                <div>
                  <AlertTitle>Hapus Usulan Belanja</AlertTitle>
                  <AlertDescription>
                    Hapus usulan <strong>&quot;{itemToDelete.name}&quot;</strong>?
                  </AlertDescription>
                </div>
              </Alert>

              {deleteError && (
                <div className="text-xs text-red-600 font-mono">{deleteError}</div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DDE3EA]">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setItemToDelete(null)}
                  className="retro-button-3d px-3 py-1 text-xs font-mono font-bold rounded-[2px]"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={async () => {
                    setIsDeleting(true)
                    setDeleteError(null)
                    const res = await deleteItem(itemToDelete.id)
                    setIsDeleting(false)
                    if (res.success) {
                      const deletedName = itemToDelete.name
                      setItemToDelete(null)
                      setDeleteSuccess(`"${deletedName}" berhasil dihapus.`)
                      setTimeout(() => setDeleteSuccess(null), 3000)
                    } else {
                      setDeleteError(res.error || "Gagal menghapus item.")
                    }
                  }}
                  className="px-3 py-1 bg-[#C54139] hover:bg-[#A8322B] text-white text-xs font-mono font-bold rounded-[2px] border border-[#8C241E]"
                >
                  {isDeleting ? "Menghapus..." : "Hapus"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nav Tabs */}
      <div className="bg-[#D8E0E8] border border-[#96A6B6] px-2 py-1 flex items-center justify-between gap-2 rounded-[2px]">
        <div className="flex items-center gap-1 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveNav("home")}
            className={`px-2.5 py-1 rounded-[2px] flex items-center gap-1.5 border transition-all ${
              activeNav === "home"
                ? "bg-[#E5E9EE] border-[#7D8E9E] font-bold text-[#14253D]"
                : "border-transparent text-[#526374] hover:bg-[#CAD4DE]"
            }`}
          >
            <Home className="size-3 text-[#2E5AA8]" />
            <span>Home</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveNav("list")}
            className={`px-2.5 py-1 rounded-[2px] flex items-center gap-1.5 border transition-all ${
              activeNav === "list"
                ? "bg-[#E5E9EE] border-[#7D8E9E] font-bold text-[#14253D]"
                : "border-transparent text-[#526374] hover:bg-[#CAD4DE]"
            }`}
          >
            <ListOrdered className="size-3" />
            <span>Daftar ({items.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveNav("members")}
            className={`px-2.5 py-1 rounded-[2px] flex items-center gap-1.5 border transition-all ${
              activeNav === "members"
                ? "bg-[#E5E9EE] border-[#7D8E9E] font-bold text-[#14253D]"
                : "border-transparent text-[#526374] hover:bg-[#CAD4DE]"
            }`}
          >
            <Users className="size-3" />
            <span>Peserta ({uniqueVoters.length})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => refresh()}
          title="Refresh Data"
          className="p-1 hover:bg-[#CAD4DE] rounded text-[#526374]"
        >
          <RotateCw className="size-3.5" />
        </button>
      </div>

      {/* Database Warning if needed */}
      {tableMissing && (
        <Alert variant="warning">
          <AlertTriangle className="size-4" />
          <div>
            <AlertTitle>Tabel Belum Dibuat di Supabase</AlertTitle>
            <AlertDescription>
              Silakan jalankan file <code>supabase/schema.sql</code> di SQL Editor Supabase Anda.
            </AlertDescription>
          </div>
        </Alert>
      )}

      {deleteSuccess && (
        <Alert variant="success">
          <CheckCircle className="size-4" />
          <div>
            <AlertTitle>Sukses</AlertTitle>
            <AlertDescription>{deleteSuccess}</AlertDescription>
          </div>
        </Alert>
      )}

      {/* Workspace Grid */}
      {activeNav === "members" ? (
        <div className="bg-white border border-[#95A5B5] rounded-[3px] p-4 space-y-3">
          <div className="font-mono text-xs font-bold text-[#14253D] flex items-center gap-2">
            <Users className="size-4 text-[#2E5AA8]" />
            <span>ANGGOTA TIM YANG TELAH BERPARTISIPASI ({uniqueVoters.length})</span>
          </div>
          {uniqueVoters.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-500 font-mono">
              Belum ada anggota yang vote bulan ini.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-2">
              {uniqueVoters.map((v) => (
                <div key={v.id || v.name} className="flex items-center gap-2 p-2 bg-[#F4F6F9] border border-[#CBD5E1] rounded">
                  <UserAvatar src={v.avatarUrl} name={v.name} size="size-6" textClass="text-[10px]" />
                  <span className="font-semibold text-xs text-[#14253D] truncate">{v.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-3">
          {/* Main Items Table */}
          <div className="bg-white border border-[#95A5B5] rounded-[3px] p-3 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-[#CBD5E1]">
                <div className="font-mono text-xs font-bold text-[#14253D] flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-[#2E5AA8]" />
                  <span>PERIODE: {monthFullLabel.toUpperCase()}</span>
                </div>
                <div className="font-mono text-[11px] text-[#526374]">
                  {totalItemsCount} Usulan • {totalVotesCount} Total Suara
                </div>
              </div>

              {/* Items List */}
              {isLoading ? (
                <div className="py-12 text-center font-mono text-xs text-gray-500 flex flex-col items-center justify-center gap-2">
                  <RotateCw className="size-4 animate-spin text-[#2E5AA8]" />
                  <span>Memuat usulan belanja...</span>
                </div>
              ) : items.length === 0 ? (
                <div className="py-8 text-center font-mono text-xs text-[#526374] space-y-1 bg-[#FAFBFD] border border-dashed border-[#CBD5E1] rounded my-2">
                  <div className="text-2xl">🛒</div>
                  <div className="font-bold text-slate-800">Daftar belanja masih kosong</div>
                  <div>Tulis usulan cemilan atau kebutuhan pantry di form bawah.</div>
                </div>
              ) : (
                <div className="divide-y divide-[#E2E8F0] my-2">
                  {items.map((item, idx) => {
                    const votersList = item.voters || []
                    const hasVoted = user ? votersList.some((v) => v.id === user.id) : false
                    const canDelete = user && item.proposed_by_id === user.id

                    return (
                      <div
                        key={item.id}
                        className="py-2 px-1 flex items-center justify-between gap-2 hover:bg-[#F8FAFC] transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-mono text-[11px] font-bold text-gray-400 w-4 text-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="size-8 rounded bg-[#EEF2F6] border border-[#CBD5E1] flex items-center justify-center text-base shrink-0">
                            {item.emoji}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-[#14253D] truncate flex items-center gap-1.5">
                              <span>{item.name}</span>
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => setItemToDelete(item)}
                                  title="Hapus usulan Anda"
                                  className="text-gray-400 hover:text-red-600 text-xs"
                                >
                                  <Trash2 className="size-3" />
                                </button>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500 truncate">
                              Oleh {item.proposed_by_name} • {votersList.length} vote
                            </div>
                          </div>
                        </div>

                        {/* Vote Button */}
                        <button
                          type="button"
                          onClick={() => handleVote(item.id)}
                          className={`h-7 px-2.5 rounded-[2px] font-mono text-xs font-bold flex items-center gap-1 border transition-all active:translate-y-px ${
                            hasVoted
                              ? "bg-[#1E4E8C] text-white border-[#102A45] shadow-inner"
                              : "bg-[#EEF2F6] text-[#14253D] border-[#7D8E9E] hover:bg-[#E2E8F0]"
                          }`}
                        >
                          <span>{hasVoted ? "★ Voted" : "☆ Vote"}</span>
                          <span className="bg-white/20 px-1 rounded text-[10px]">
                            {votersList.length}
                          </span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Add Item Form */}
            <form onSubmit={handleAddItem} className="pt-2 border-t border-[#CBD5E1] flex items-center gap-2">
              <input
                type="text"
                placeholder={user ? "Tambah usulan (cth: Kopi Kapal Api, Chitato)..." : "Login terlebih dahulu untuk mengusulkan..."}
                disabled={!user}
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="flex-1 h-8 px-2 bg-[#FAFBFD] border border-[#95A5B5] rounded-[2px] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#1E4E8C] disabled:bg-gray-100"
              />
              <button
                type="submit"
                disabled={!user || !newItemName.trim()}
                className="h-8 px-3 bg-[#1E4E8C] hover:bg-[#153A6B] disabled:opacity-50 text-white font-mono text-xs font-bold rounded-[2px] flex items-center gap-1 border border-[#102A45] shrink-0"
              >
                <Plus className="size-3.5" />
                <span>Usulkan</span>
              </button>
            </form>
          </div>

          {/* Right Sidebar: Top Item & Status */}
          <div className="space-y-3">
            {/* Top Item Card */}
            <div className="bg-white border border-[#95A5B5] rounded-[3px] p-3 space-y-2">
              <div className="font-mono text-[11px] font-bold text-amber-700 flex items-center gap-1">
                <span>👑 TOP USULAN BULAN INI</span>
              </div>
              {topItem ? (
                <div className="p-2.5 bg-amber-50/60 border border-amber-200 rounded text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{topItem.emoji}</span>
                    <div className="font-bold text-[#14253D] truncate">{topItem.name}</div>
                  </div>
                  <div className="text-[11px] text-amber-900 font-mono">
                    {topItem.voters?.length || 0} vote dari tim
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-gray-500 font-mono">
                  Belum ada item yang di-vote.
                </div>
              )}
            </div>

            {/* IT Pantry Motto */}
            <div className="bg-[#EAEFF5] border border-[#CBD5E1] rounded-[3px] p-3 text-xs text-[#14253D] font-mono space-y-1.5">
              <div className="font-bold text-[#1E4E8C]">TIPS PANTRY</div>
              <p className="text-[11px] leading-relaxed text-gray-700">
                Item dengan suara terbanyak di akhir bulan akan diprioritaskan saat pengadaan belanja kantor!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
