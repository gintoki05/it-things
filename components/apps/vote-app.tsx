"use client"

import * as React from "react"
import { useAuth } from "@/lib/auth"
import {
  useVoteStore,
  VoteGroup,
  VoteOption,
  VoteType,
  isGroupArchived,
  daysRemaining,
} from "@/lib/vote-store"
import { RetroIcon } from "@/components/ui/retro-icon"
import {
  Plus,
  RotateCw,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  Trash2,
  Users,
  Lock,
  Unlock,
  Archive,
  Vote,
  LayoutList,
  Eye,
  Pencil,
  Check,
  X,
  Trophy,
  Share2,
  Calendar,
  Clock,
} from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { UserAvatar } from "@/components/retro/user-avatar"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

// ─── Helpers ─────────────────────────────────────────────────
function formatDateTime(dateStr?: string) {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ""
  const dateFormatted = d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  const timeFormatted = d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })
  return `${dateFormatted}, ${timeFormatted} WIB`
}

function formatDateShort(dateStr?: string) {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function VoteTypeBadge({ type }: { type: VoteType }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
        type === "single"
          ? "bg-blue-50 text-blue-700 border-blue-200"
          : "bg-violet-50 text-violet-700 border-violet-200"
      }`}
    >
      {type === "single" ? "● Single" : "◉ Multi"}
    </span>
  )
}

function StatusBadge({ archived, days }: { archived: boolean; days: number }) {
  if (archived) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-gray-100 text-gray-500 border border-gray-200">
        <Archive className="size-2.5" /> Arsip
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
      ● Aktif {days > 0 ? `· ${days}h` : ""}
    </span>
  )
}

// ─── Progress Bar ────────────────────────────────────────────
function VoteBar({ count, max }: { count: number; max: number }) {
  const pct = max === 0 ? 0 : Math.round((count / max) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#1E4E8C] rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-gray-500 w-6 text-right">{pct}%</span>
    </div>
  )
}

const PRESET_ICONS = ["🗳️", "💡", "☕", "🍕", "🎮", "🎯", "📅", "👥", "🏆", "💰"]

// ─── Create Group Modal ──────────────────────────────────────
function CreateGroupModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (title: string, desc: string, emoji: string, type: VoteType) => Promise<void>
}) {
  const [title, setTitle] = React.useState("")
  const [desc, setDesc] = React.useState("")
  const [emoji, setEmoji] = React.useState("🗳️")
  const [showPicker, setShowPicker] = React.useState(false)
  const [voteType, setVoteType] = React.useState<VoteType>("single")
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    const finalEmoji = emoji.trim() || "🗳️"
    await onCreate(title.trim(), desc.trim(), finalEmoji, voteType)
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="retro-window-frame max-w-sm w-full rounded-[4px] overflow-hidden shadow-[5px_5px_0px_rgba(0,0,0,0.3)] bg-white flex flex-col">
        <div className="retro-titlebar px-3 py-1.5 flex items-center justify-between font-mono text-xs font-bold text-[#14253D]">
          <div className="flex items-center gap-1.5">
            <RetroIcon name="vote" iconSize={32} className="size-3.5 object-contain" />
            <span>BUAT_VOTE_GROUP.EXE</span>
          </div>
          <button type="button" onClick={onClose} className="text-[#526374] hover:text-black font-bold px-1">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {/* Icon Selector + Title Input */}
          <div className="space-y-1.5">
            <div className="flex gap-2">
              {/* Icon Preview / Picker Toggle Button */}
              <button
                type="button"
                onClick={() => setShowPicker(!showPicker)}
                title="Pilih Icon / Emoji"
                className="size-9 rounded-[2px] border border-[#95A5B5] bg-[#FAFBFD] hover:bg-[#EEF2F6] flex items-center justify-center shrink-0 transition-colors shadow-sm cursor-pointer"
              >
                <RetroIcon name={emoji || "vote"} iconSize={32} className="size-6 object-contain" />
              </button>

              {/* Title input - typing here will NEVER alter emoji */}
              <input
                type="text"
                placeholder="Judul vote group..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="flex-1 h-9 px-2.5 border border-[#95A5B5] rounded-[2px] bg-[#FAFBFD] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
              />
            </div>

            {/* Quick Icon Selector Pallet */}
            <div className="p-2 bg-[#F1F5F9] border border-[#CBD5E1] rounded-[2px] space-y-1.5">
              <div className="flex items-center justify-between text-[9px] font-mono text-gray-500">
                <span>PILIH ICON:</span>
                <span className="text-gray-400">klik untuk mengganti</span>
              </div>
              <div className="flex flex-wrap gap-1 items-center">
                {PRESET_ICONS.map((item) => {
                  const isSelected = emoji === item || (!emoji.trim() && item === "🗳️")
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setEmoji(item)}
                      className={`size-7 rounded flex items-center justify-center border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#1E4E8C] border-[#102A45] shadow-inner"
                          : "bg-white border-[#CBD5E1] hover:bg-slate-200"
                      }`}
                    >
                      <RetroIcon name={item} iconSize={32} className="size-4 object-contain" />
                    </button>
                  )
                })}
                {/* Custom input */}
                <input
                  type="text"
                  placeholder="Ketik..."
                  value={PRESET_ICONS.includes(emoji) ? "" : emoji}
                  onChange={(e) => {
                    setEmoji(e.target.value)
                  }}
                  onBlur={() => {
                    if (!emoji.trim()) setEmoji("🗳️")
                  }}
                  className="w-14 h-7 text-center text-xs border border-[#CBD5E1] bg-white rounded font-mono focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
                  title="Emoji / simbol kustom"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <textarea
            placeholder="Deskripsi (opsional)..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
            className="w-full px-2 py-1.5 border border-[#95A5B5] rounded-[2px] bg-[#FAFBFD] text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
          />

          {/* Vote Type */}
          <div className="space-y-1">
            <div className="text-[10px] font-mono font-bold text-[#526374] uppercase">Tipe Voting</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVoteType("single")}
                className={`p-2 border rounded-[2px] text-left transition-colors cursor-pointer ${
                  voteType === "single"
                    ? "bg-[#1E4E8C] text-white border-[#102A45]"
                    : "bg-white text-[#14253D] border-[#95A5B5] hover:bg-[#EEF2F6]"
                }`}
              >
                <div className="text-xs font-mono font-bold">● Single</div>
                <div className="text-[9px] opacity-75 mt-0.5">1 pilihan per orang</div>
              </button>
              <button
                type="button"
                onClick={() => setVoteType("multiple")}
                className={`p-2 border rounded-[2px] text-left transition-colors cursor-pointer ${
                  voteType === "multiple"
                    ? "bg-[#1E4E8C] text-white border-[#102A45]"
                    : "bg-white text-[#14253D] border-[#95A5B5] hover:bg-[#EEF2F6]"
                }`}
              >
                <div className="text-xs font-mono font-bold">◉ Multiple</div>
                <div className="text-[9px] opacity-75 mt-0.5">Boleh pilih banyak</div>
              </button>
            </div>
          </div>

          <div className="text-[10px] font-mono text-gray-500 border-t border-[#E2E8F0] pt-2">
            ⏱ Auto-arsip setelah 21 hari
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="retro-button-3d px-3 py-1 text-xs font-mono font-bold rounded-[2px] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="px-3 py-1 bg-[#1E4E8C] hover:bg-[#153A6B] disabled:opacity-50 text-white text-xs font-mono font-bold rounded-[2px] border border-[#102A45] flex items-center gap-1 cursor-pointer"
            >
              <Plus className="size-3" />
              {loading ? "Membuat..." : "Buat Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Group Card ──────────────────────────────────────────────
function GroupCard({ group, onClick }: { group: VoteGroup; onClick: () => void }) {
  const archived = isGroupArchived(group)
  const days = daysRemaining(group)
  const totalVotes = group.options.reduce((acc, o) => acc + o.voters.length, 0)
  const uniqueVoters = new Set(group.options.flatMap((o) => o.voters.map((v) => v.id))).size

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-3 bg-white border border-[#CBD5E1] rounded-[3px] hover:border-[#7D8E9E] hover:bg-[#F8FAFC] transition-all group cursor-pointer"
    >
      <div className="flex items-start gap-2.5">
        <div className="size-9 rounded bg-[#F1F5F9] border border-[#CBD5E1] flex items-center justify-center shrink-0 mt-0.5">
          <RetroIcon name={group.emoji || "vote"} iconSize={32} className="size-6 object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="font-bold text-xs text-[#14253D] truncate">{group.title}</span>
            <VoteTypeBadge type={group.voteType} />
            <StatusBadge archived={archived} days={days} />
          </div>
          {group.description && (
            <p className="text-[10px] text-gray-500 truncate mb-1">{group.description}</p>
          )}
          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono flex-wrap">
            <span>{group.options.length} opsi</span>
            <span>·</span>
            <span>{totalVotes} vote</span>
            <span>·</span>
            <span>by {group.createdByName.split(" ")[0]}</span>
            {group.createdAt && (
              <>
                <span>·</span>
                <span className="text-gray-400">{formatDateShort(group.createdAt)}</span>
              </>
            )}
          </div>
        </div>
        <span className="text-[#7D8E9E] group-hover:text-[#1E4E8C] text-xs font-mono shrink-0">›</span>
      </div>
    </button>
  )
}

// ─── Group Detail View ───────────────────────────────────────
function GroupDetail({
  group,
  currentUserId,
  isAdmin,
  isGuest = false,
  onBack,
  onVote,
  onAddOption,
  onDeleteOption,
  onToggleClose,
  onDeleteGroup,
  onUpdateGroup,
  onToast,
}: {
  group: VoteGroup
  currentUserId: string | null
  isAdmin: boolean
  isGuest?: boolean
  onBack: () => void
  onVote: (optionId: string) => void
  onAddOption: (name: string, emoji: string) => Promise<void>
  onDeleteOption: (optionId: string) => void
  onToggleClose: () => void
  onDeleteGroup: () => void
  onUpdateGroup: (updates: { title?: string; description?: string; emoji?: string }) => Promise<{ success: boolean; error?: string }>
  onToast?: (type: "success" | "error", msg: string) => void
}) {
  const [newOptionName, setNewOptionName] = React.useState("")
  const [addingOption, setAddingOption] = React.useState(false)
  const [showDeleteGroupDialog, setShowDeleteGroupDialog] = React.useState(false)
  const [optionToDelete, setOptionToDelete] = React.useState<VoteOption | null>(null)
  const [showToggleCloseDialog, setShowToggleCloseDialog] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isTogglingClose, setIsTogglingClose] = React.useState(false)
  const [copiedWA, setCopiedWA] = React.useState(false)

  // Edit group state
  const [isEditing, setIsEditing] = React.useState(false)
  const [editTitle, setEditTitle] = React.useState(group.title)
  const [editDesc, setEditDesc] = React.useState(group.description || "")
  const [editEmoji, setEditEmoji] = React.useState(group.emoji || "🗳️")
  const [isSavingEdit, setIsSavingEdit] = React.useState(false)

  React.useEffect(() => {
    setEditTitle(group.title)
    setEditDesc(group.description || "")
    setEditEmoji(group.emoji || "🗳️")
  }, [group.title, group.description, group.emoji])

  const archived = isGroupArchived(group)
  const days = daysRemaining(group)
  const isCreator = Boolean(currentUserId && currentUserId === group.createdById)
  const canManage = Boolean(isCreator || isAdmin)

  const maxVotes = Math.max(...group.options.map((o) => o.voters.length), 0)
  const totalVotes = group.options.reduce((acc, o) => acc + o.voters.length, 0)

  const sortedOptions = React.useMemo(() => {
    return [...group.options].sort((a, b) => b.voters.length - a.voters.length)
  }, [group.options])

  const top3 = React.useMemo(() => {
    return sortedOptions.filter((o) => o.voters.length > 0).slice(0, 3)
  }, [sortedOptions])

  const handleShareWhatsApp = () => {
    const uniqueVoters = new Set(group.options.flatMap((o) => o.voters.map((v) => v.id))).size
    const statusStr = archived ? "🔒 Selesai (Arsip)" : "🟢 Masih Aktif"
    const typeStr = group.voteType === "single" ? "Single Vote (1 Suara/Orang)" : "Multiple Vote (Boleh Banyak Pilihan)"

    const medals = ["🥇", "🥈", "🥉"]

    const now = new Date()
    const dateTimeStr = `${now.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })} pukul ${now.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    })} WIB`

    const lines = [
      `🗳️ *HASIL VOTING: ${group.title.toUpperCase()}*`,
      ...(group.description ? [`_${group.description}_`] : []),
      `📅 *Waktu:* ${dateTimeStr}`,
      `---------------------------------`,
      `📊 *Status:* ${statusStr}`,
      `⚙️ *Tipe:* ${typeStr}`,
      `👥 *Partisipan:* ${uniqueVoters} orang · ${totalVotes} total suara`,
      `---------------------------------`,
      `🏆 *KLASEMEN / HASIL VOTING:*`,
      ...sortedOptions.map((opt, idx) => {
        const medal = idx < 3 && opt.voters.length > 0 ? `${medals[idx]} ` : `${idx + 1}. `
        const pct = totalVotes > 0 ? Math.round((opt.voters.length / totalVotes) * 100) : 0
        return `${medal}*${opt.name}*: ${opt.voters.length} suara (${pct}%)`
      }),
      `---------------------------------`,
      `_Akses & tentukan pilihanmu di it-things! 🚀_`,
    ]

    const text = lines.join("\n")
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
    }
    setCopiedWA(true)
    setTimeout(() => setCopiedWA(false), 2500)
    if (onToast) {
      onToast("success", "Format WhatsApp berhasil disalin ke clipboard!")
    }
  }

  const handleSaveEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!editTitle.trim()) return
    setIsSavingEdit(true)
    const finalEmoji = editEmoji.trim() || "🗳️"
    const res = await onUpdateGroup({
      title: editTitle.trim(),
      description: editDesc.trim(),
      emoji: finalEmoji,
    })
    setIsSavingEdit(false)
    if (res.success) {
      setIsEditing(false)
    }
  }

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOptionName.trim()) return
    setAddingOption(true)
    await onAddOption(newOptionName.trim(), "📌")
    setNewOptionName("")
    setAddingOption(false)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="bg-white border border-[#95A5B5] rounded-[3px] p-3">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={onBack}
            className="p-1 hover:bg-[#EEF2F6] rounded text-[#526374] hover:text-[#14253D] transition-colors shrink-0 cursor-pointer"
          >
            <ChevronLeft className="size-4" />
          </button>

          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#1E4E8C] uppercase">
                <Pencil className="size-3" />
                <span>Edit Judul, Deskripsi & Icon:</span>
              </div>

              {/* Icon Preview + Title input */}
              <div className="flex gap-2">
                <div className="size-9 rounded-[2px] border border-[#95A5B5] bg-[#FAFBFD] flex items-center justify-center shrink-0 shadow-sm">
                  <RetroIcon name={editEmoji || "vote"} iconSize={32} className="size-6 object-contain" />
                </div>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Judul vote group..."
                  required
                  autoFocus
                  className="flex-1 h-9 px-2.5 bg-[#FAFBFD] border border-[#1E4E8C] rounded-[2px] text-xs font-bold font-mono focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
                />
              </div>

              {/* Quick Icon Selector Pallet */}
              <div className="p-1.5 bg-[#F1F5F9] border border-[#CBD5E1] rounded-[2px] space-y-1">
                <div className="flex items-center justify-between text-[9px] font-mono text-gray-500">
                  <span>GANTI ICON:</span>
                  <span className="text-gray-400">klik icon atau ketik</span>
                </div>
                <div className="flex flex-wrap gap-1 items-center">
                  {PRESET_ICONS.map((item) => {
                    const isSelected = editEmoji === item || (!editEmoji.trim() && item === "🗳️")
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setEditEmoji(item)}
                        className={`size-6 rounded flex items-center justify-center border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#1E4E8C] border-[#102A45] shadow-inner"
                            : "bg-white border-[#CBD5E1] hover:bg-slate-200"
                        }`}
                      >
                        <RetroIcon name={item} iconSize={32} className="size-3.5 object-contain" />
                      </button>
                    )
                  })}
                  <input
                    type="text"
                    placeholder="Ketik..."
                    value={PRESET_ICONS.includes(editEmoji) ? "" : editEmoji}
                    onChange={(e) => setEditEmoji(e.target.value)}
                    onBlur={() => {
                      if (!editEmoji.trim()) setEditEmoji("🗳️")
                    }}
                    className="w-14 h-6 text-center text-xs border border-[#CBD5E1] bg-white rounded font-mono focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
                    title="Emoji / simbol kustom"
                  />
                </div>
              </div>

              {/* Description */}
              <input
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Deskripsi (opsional)..."
                className="w-full h-7 px-2 bg-[#FAFBFD] border border-[#95A5B5] rounded-[2px] text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
              />

              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  type="submit"
                  disabled={isSavingEdit || !editTitle.trim()}
                  className="h-6 px-2.5 bg-[#1E4E8C] hover:bg-[#153A6B] disabled:opacity-50 text-white font-mono text-[10px] font-bold rounded-[2px] flex items-center gap-1 border border-[#102A45] cursor-pointer"
                >
                  <Check className="size-3" />
                  {isSavingEdit ? "Menyimpan..." : "Simpan"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditTitle(group.title)
                    setEditDesc(group.description || "")
                    setEditEmoji(group.emoji || "🗳️")
                    setIsEditing(false)
                  }}
                  className="h-6 px-2 bg-white text-[#526374] hover:bg-[#EEF2F6] font-mono text-[10px] rounded-[2px] flex items-center gap-1 border border-[#95A5B5] cursor-pointer"
                >
                  <X className="size-3" />
                  Batal
                </button>
              </div>
            </form>
          ) : (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <div className="size-7 rounded bg-[#F1F5F9] border border-[#CBD5E1] flex items-center justify-center shrink-0">
                  <RetroIcon name={group.emoji || "vote"} iconSize={32} className="size-4.5 object-contain" />
                </div>
                <span className="font-bold text-sm text-[#14253D]">{group.title}</span>
                <VoteTypeBadge type={group.voteType} />
                <StatusBadge archived={archived} days={days} />
              </div>
              {group.description && (
                <p className="text-xs text-gray-500 ml-9">{group.description}</p>
              )}
              <div className="text-[10px] text-gray-500 font-mono ml-9 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>oleh <span className="font-semibold text-gray-700">{group.createdByName}</span></span>
                {group.createdAt && (
                  <>
                    <span>·</span>
                    <span className="text-gray-400">{formatDateTime(group.createdAt)}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Action buttons (Share WA & Manage) */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              title="Salin format WhatsApp ke clipboard"
              className="h-7 px-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-mono text-[10px] font-bold rounded-[2px] flex items-center gap-1 border border-[#128C7E] shadow-sm cursor-pointer transition-colors active:translate-y-px"
            >
              {copiedWA ? <Check className="size-3" /> : <Share2 className="size-3" />}
              <span className="hidden sm:inline">{copiedWA ? "Disalin!" : "Copy WA"}</span>
            </button>

            {canManage && !isEditing && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditTitle(group.title)
                    setEditDesc(group.description || "")
                    setEditEmoji(group.emoji || "🗳️")
                    setIsEditing(true)
                  }}
                  title="Edit judul & deskripsi"
                  className="p-1.5 hover:bg-[#EEF2F6] rounded text-[#526374] hover:text-[#1E4E8C] transition-colors cursor-pointer"
                >
                  <Pencil className="size-3.5" />
                </button>
                {archived ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowToggleCloseDialog(true)}
                      title="Buka kembali voting"
                      className="p-1.5 hover:bg-[#EEF2F6] rounded text-[#526374] hover:text-[#14253D] transition-colors cursor-pointer"
                    >
                      <Unlock className="size-3.5 text-emerald-600" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteGroupDialog(true)}
                      title="Hapus permanen group"
                      className="p-1.5 hover:bg-red-50 rounded text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowToggleCloseDialog(true)}
                    title="Arsipkan voting"
                    className="p-1.5 hover:bg-[#EEF2F6] rounded text-[#526374] hover:text-[#14253D] transition-colors cursor-pointer"
                  >
                    <Archive className="size-3.5 text-amber-600" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Archive Notice Banner */}
      {archived && (
        <div className="bg-[#FAFBFD] border border-[#CBD5E1] rounded-[3px] p-2.5 flex items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-gray-600">
            <Archive className="size-3.5 text-amber-600 shrink-0" />
            <span>Voting ini berada di Arsip. Pemungutan suara telah ditutup.</span>
          </div>
          {canManage && (
            <span className="text-[10px] text-gray-400 hidden sm:inline">
              Opsi: Buka Kembali atau Hapus Permanen
            </span>
          )}
        </div>
      )}

      {/* Top 3 Leaderboard Card */}
      {top3.length > 0 && (
        <div className="bg-white border border-[#95A5B5] rounded-[3px] p-3 space-y-2.5">
          <div className="flex items-center justify-between pb-1 border-b border-[#E2E8F0]">
            <div className="font-mono text-[11px] font-bold text-[#14253D] flex items-center gap-1.5">
              <Trophy className="size-3.5 text-amber-500" />
              <span>{top3.length === 1 ? "PILIHAN TERTINGGI" : `TOP ${top3.length} PILIHAN`}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {top3.map((opt, idx) => {
              const medalConfig = [
                {
                  badge: "bg-amber-100 text-amber-800 border-amber-300",
                  card: "bg-gradient-to-b from-amber-50/70 to-white border-amber-300 shadow-sm",
                  label: "Juara 1",
                  medal: "🥇",
                },
                {
                  badge: "bg-slate-100 text-slate-700 border-slate-300",
                  card: "bg-gradient-to-b from-slate-50/70 to-white border-slate-300",
                  label: "Juara 2",
                  medal: "🥈",
                },
                {
                  badge: "bg-orange-100 text-orange-800 border-orange-300",
                  card: "bg-gradient-to-b from-orange-50/70 to-white border-orange-300",
                  label: "Juara 3",
                  medal: "🥉",
                },
              ][idx]

              const pct = totalVotes > 0 ? Math.round((opt.voters.length / totalVotes) * 100) : 0

              return (
                <div
                  key={opt.id}
                  className={`p-2.5 rounded-[3px] border flex flex-col justify-between relative overflow-hidden ${medalConfig.card}`}
                >
                  <div className="flex items-start justify-between gap-1.5 mb-1.5">
                    <span className="text-xl leading-none">{medalConfig.medal}</span>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${medalConfig.badge}`}>
                      #{idx + 1} · {pct}%
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-[#14253D] truncate" title={opt.name}>
                      <RetroIcon name={opt.emoji || "📌"} iconSize={32} className="size-3.5 object-contain shrink-0" />
                      <span className="truncate">{opt.name}</span>
                    </div>
                    <div className="text-[10px] font-mono text-gray-500 mt-1 flex items-center justify-between">
                      <span>{opt.voters.length} suara</span>
                      <div className="flex -space-x-1">
                        {opt.voters.slice(0, 3).map((v) => (
                          <UserAvatar
                            key={v.id}
                            src={v.avatarUrl}
                            name={v.name}
                            size="size-3.5"
                            textClass="text-[7px]"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Options */}
      <div className="bg-white border border-[#95A5B5] rounded-[3px] p-3 space-y-2">
        <div className="font-mono text-[11px] font-bold text-[#14253D] flex items-center gap-1.5 pb-1 border-b border-[#E2E8F0]">
          <LayoutList className="size-3.5 text-[#1E4E8C]" />
          OPSI ({group.options.length})
        </div>

        {group.options.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-500 font-mono">
            Belum ada opsi. Tambahkan opsi di bawah!
          </div>
        ) : (
          <div className="divide-y divide-[#F1F5F9]">
            {sortedOptions.map((option, idx) => {
              const hasVoted = currentUserId ? option.voters.some((v) => v.id === currentUserId) : false
              const canDeleteOpt = currentUserId && (option.proposedById === currentUserId || canManage)
              const isTopRank = idx < 3 && option.voters.length > 0
              const medalIcons = ["🥇", "🥈", "🥉"]

              return (
                <div key={option.id} className="py-2.5 flex items-center gap-2.5">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isTopRank && (
                        <span className="text-xs shrink-0" title={`Peringkat #${idx + 1}`}>
                          {medalIcons[idx]}
                        </span>
                      )}
                      <RetroIcon name={option.emoji || "📌"} iconSize={32} className="size-4 object-contain shrink-0" />
                      <span className="font-semibold text-xs text-[#14253D] truncate">{option.name}</span>
                      {isTopRank && (
                        <span className="text-[9px] font-mono px-1 py-0.5 rounded font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          #{idx + 1}
                        </span>
                      )}
                      {hasVoted && (
                        <span className="text-[9px] font-mono text-[#1E4E8C] font-bold">✓ Voted</span>
                      )}
                      {canDeleteOpt && !archived && (
                        <button
                          type="button"
                          onClick={() => setOptionToDelete(option)}
                          title="Hapus opsi ini"
                          className="text-gray-300 hover:text-red-500 transition-colors cursor-pointer p-0.5"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                      <VoteBar count={option.voters.length} max={maxVotes} />
                      <div className="flex items-center gap-1">
                        {option.voters.slice(0, 8).map((v) => (
                          <UserAvatar
                            key={v.id}
                            src={v.avatarUrl}
                            name={v.name}
                            size="size-4"
                            textClass="text-[8px]"
                          />
                        ))}
                        <span className="text-[10px] text-gray-500 font-mono ml-0.5">
                          {option.voters.length} vote
                        </span>
                      </div>
                    </div>

                    {/* Vote button */}
                    {!archived && currentUserId && (
                      isGuest ? (
                        <span className="text-[10px] text-amber-800 font-mono font-medium italic bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                          Read-Only
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onVote(option.id)}
                          className={`h-7 px-2.5 rounded-[2px] font-mono text-[11px] font-bold flex items-center gap-1 border transition-all active:translate-y-px shrink-0 cursor-pointer ${
                            hasVoted
                              ? "bg-[#1E4E8C] text-white border-[#102A45] shadow-inner"
                              : "bg-[#EEF2F6] text-[#14253D] border-[#7D8E9E] hover:bg-[#E2E8F0]"
                          }`}
                        >
                          {hasVoted ? "★ Voted" : "☆ Vote"}
                        </button>
                      )
                    )}
                  </div>
                )
              })}
          </div>
        )}

        {/* Add Option Form or Guest Info */}
        {!archived && currentUserId && (
          isGuest ? (
            <div className="pt-2 border-t border-[#CBD5E1] flex items-center gap-1.5 text-[10px] font-mono text-amber-800 bg-amber-50/90 p-2 rounded-[2px] border border-amber-200">
              <Eye className="size-3.5 shrink-0 text-amber-600" />
              <span>Mode Tamu: Masuk dengan Google untuk mengusulkan opsi baru dan voting.</span>
            </div>
          ) : (
            <form onSubmit={handleAddOption} className="pt-2 border-t border-[#CBD5E1] flex items-center gap-2">
              <input
                type="text"
                placeholder="Tambah opsi baru..."
                value={newOptionName}
                onChange={(e) => setNewOptionName(e.target.value)}
                className="flex-1 h-7 px-2 bg-[#FAFBFD] border border-[#95A5B5] rounded-[2px] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
              />
              <button
                type="submit"
                disabled={addingOption || !newOptionName.trim()}
                className="h-7 px-2.5 bg-[#1E4E8C] hover:bg-[#153A6B] disabled:opacity-50 text-white font-mono text-xs font-bold rounded-[2px] flex items-center gap-1 border border-[#102A45] shrink-0 cursor-pointer"
              >
                <Plus className="size-3" />
                Tambah
              </button>
            </form>
          )
        )}
      </div>

      {/* Voters sidebar info */}
      {totalVotes > 0 && (
        <div className="bg-white border border-[#95A5B5] rounded-[3px] p-3 space-y-2">
          <div className="font-mono text-[11px] font-bold text-[#14253D] flex items-center gap-1.5">
            <Users className="size-3.5 text-[#2E5AA8]" />
            PESERTA
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from(
              new Map(
                group.options.flatMap((o) => o.voters).map((v) => [v.id, v])
              ).values()
            ).map((v) => (
              <div key={v.id} className="flex items-center gap-1 p-1 bg-[#F4F6F9] border border-[#CBD5E1] rounded text-[10px]">
                <UserAvatar src={v.avatarUrl} name={v.name} size="size-4" textClass="text-[8px]" />
                <span className="font-semibold text-[#14253D]">{v.name.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Confirm Delete Group Dialog */}
      <ConfirmDialog
        isOpen={showDeleteGroupDialog}
        onClose={() => setShowDeleteGroupDialog(false)}
        isLoading={isDeleting}
        onConfirm={async () => {
          setIsDeleting(true)
          await onDeleteGroup()
          setIsDeleting(false)
          setShowDeleteGroupDialog(false)
        }}
        title="HAPUS_PERMANEN.EXE"
        message={
          <>
            Apakah Anda yakin ingin menghapus <span className="font-bold text-red-600">PERMANEN</span> vote group{" "}
            <span className="font-bold text-[#14253D]">"{group.title}"</span>?
            <br />
            Semua data voting dan opsi di dalamnya akan dihapus selamanya dari database dan tidak dapat dipulihkan.
          </>
        }
        confirmText="Ya, Hapus Permanen"
        cancelText="Batal"
        variant="destructive"
      />

      {/* Confirm Delete Option Dialog */}
      <ConfirmDialog
        isOpen={Boolean(optionToDelete)}
        onClose={() => setOptionToDelete(null)}
        isLoading={isDeleting}
        onConfirm={async () => {
          if (optionToDelete) {
            setIsDeleting(true)
            await onDeleteOption(optionToDelete.id)
            setIsDeleting(false)
            setOptionToDelete(null)
          }
        }}
        title="HAPUS_OPSI.EXE"
        message={
          <>
            Apakah Anda yakin ingin menghapus opsi{" "}
            <span className="font-bold text-[#14253D]">"{optionToDelete?.name}"</span>?
            <br />
            Semua suara peserta pada opsi ini akan ikut terhapus.
          </>
        }
        confirmText="Ya, Hapus Opsi"
        cancelText="Batal"
        variant="destructive"
      />

      {/* Confirm Toggle Close / Reopen Dialog */}
      <ConfirmDialog
        isOpen={showToggleCloseDialog}
        onClose={() => setShowToggleCloseDialog(false)}
        isLoading={isTogglingClose}
        onConfirm={async () => {
          setIsTogglingClose(true)
          await onToggleClose()
          setIsTogglingClose(false)
          setShowToggleCloseDialog(false)
        }}
        title={archived ? "BUKA_VOTING.EXE" : "ARSIPKAN_VOTING.EXE"}
        icon={archived ? <Unlock className="size-5 text-emerald-600" /> : <Archive className="size-5 text-amber-600" />}
        message={
          archived ? (
            <>
              Buka kembali sesi voting untuk group{" "}
              <span className="font-bold text-[#14253D]">"{group.title}"</span>?
              <br />
              Voting akan dikembalikan ke tab aktif dan peserta dapat kembali memberikan suara.
            </>
          ) : (
            <>
              Apakah Anda yakin ingin mengarsipkan sesi voting untuk group{" "}
              <span className="font-bold text-[#14253D]">"{group.title}"</span>?
              <br />
              Setelah diarsipkan, voting akan masuk ke tab arsip dan peserta tidak dapat memberikan suara lagi.
            </>
          )
        }
        confirmText={archived ? "Buka Kembali" : "Ya, Arsipkan"}
        cancelText="Batal"
        variant={archived ? "default" : "warning"}
      />
    </div>
  )
}

// ─── Main VoteApp ─────────────────────────────────────────────
export function VoteApp() {
  const { user, isAdmin, isGuest } = useAuth()
  const { groups, isLoading, tableMissing, createGroup, updateGroup, deleteGroup, toggleCloseGroup, addOption, deleteOption, castVote, refresh } =
    useVoteStore()

  const [activeTab, setActiveTab] = React.useState<"all" | "active" | "archived">("active")
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [toast, setToast] = React.useState<{ type: "success" | "error"; msg: string } | null>(null)

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  const selectedGroup = selectedGroupId ? groups.find((g) => g.id === selectedGroupId) : null

  const filtered = React.useMemo(() => {
    if (activeTab === "active") return groups.filter((g) => !isGroupArchived(g))
    if (activeTab === "archived") return groups.filter((g) => isGroupArchived(g))
    return groups
  }, [groups, activeTab])

  const activeCount = groups.filter((g) => !isGroupArchived(g)).length
  const archivedCount = groups.filter((g) => isGroupArchived(g)).length

  const handleCreateGroup = async (title: string, desc: string, emoji: string, voteType: VoteType) => {
    if (!user || isGuest) {
      showToast("error", "Mode Tamu tidak dapat membuat vote group.")
      return
    }
    const res = await createGroup(title, desc, emoji, voteType, { id: user.id, name: user.name, avatarUrl: user.avatarUrl })
    if (res.success) showToast("success", `Group "${title}" berhasil dibuat!`)
    else showToast("error", res.error || "Gagal membuat group.")
  }

  return (
    <div className="flex flex-col gap-3 min-h-full font-sans">
      {/* Create Modal */}
      {showCreateModal && (
        <CreateGroupModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateGroup} />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-3 py-2 rounded-[3px] border text-xs font-mono font-bold shadow-lg flex items-center gap-2 ${
          toast.type === "success" ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-red-50 border-red-300 text-red-800"
        }`}>
          {toast.type === "success" ? <CheckCircle className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
          {toast.msg}
        </div>
      )}

      {/* Nav */}
      {!selectedGroup && (
        <div className="bg-[#D8E0E8] border border-[#96A6B6] px-2 py-1 flex items-center justify-between gap-2 rounded-[2px]">
          <div className="flex items-center gap-1 text-xs font-mono">
            {(
              [
                { key: "active", label: `Aktif (${activeCount})` },
                { key: "archived", label: `Arsip (${archivedCount})` },
                { key: "all", label: `Semua (${groups.length})` },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`px-2.5 py-1 rounded-[2px] flex items-center gap-1.5 border transition-all ${
                  activeTab === key
                    ? "bg-[#E5E9EE] border-[#7D8E9E] font-bold text-[#14253D]"
                    : "border-transparent text-[#526374] hover:bg-[#CAD4DE]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {user && (
              isGuest ? (
                <span className="h-6 px-2 bg-amber-100 text-amber-850 font-mono text-[10px] font-bold rounded-[2px] flex items-center gap-1 border border-amber-300">
                  <Eye className="size-3 text-amber-700" /> Read-Only
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  title="Buat Vote Group Baru"
                  className="h-6 px-2 bg-[#1E4E8C] hover:bg-[#153A6B] text-white font-mono text-[10px] font-bold rounded-[2px] flex items-center gap-1 border border-[#102A45] cursor-pointer"
                >
                  <Plus className="size-3" /> Buat Group
                </button>
              )
            )}
            <button type="button" onClick={refresh} title="Refresh" className="p-1 hover:bg-[#CAD4DE] rounded text-[#526374] cursor-pointer">
              <RotateCw className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Table missing warning */}
      {tableMissing && (
        <Alert variant="warning">
          <AlertTriangle className="size-4" />
          <div>
            <AlertTitle>Tabel Belum Dibuat di Supabase</AlertTitle>
            <AlertDescription>
              Silakan jalankan <code>supabase/schema.sql</code> di SQL Editor Supabase Anda.
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Content */}
      {selectedGroup ? (
        <GroupDetail
          group={selectedGroup}
          currentUserId={user?.id || null}
          isAdmin={isAdmin}
          isGuest={isGuest}
          onBack={() => setSelectedGroupId(null)}
          onVote={(optionId) => {
            if (!user || isGuest) return
            castVote(selectedGroup.id, optionId, { id: user.id, name: user.name, avatarUrl: user.avatarUrl }, selectedGroup.voteType)
          }}
          onAddOption={async (name, emoji) => {
            if (!user || isGuest) return
            const res = await addOption(selectedGroup.id, name, emoji, { id: user.id, name: user.name, avatarUrl: user.avatarUrl })
            if (!res.success) showToast("error", res.error || "Gagal menambah opsi.")
          }}
          onDeleteOption={(optionId) => {
            if (isGuest) return
            deleteOption(selectedGroup.id, optionId)
          }}
          onToggleClose={() => {
            const isCreator = Boolean(user?.id && user.id === selectedGroup.createdById)
            const canManage = Boolean(isCreator || isAdmin)
            if (!canManage) {
              showToast("error", "Akses ditolak: Hanya pembuat vote atau admin yang dapat mengarsipkan group ini.")
              return
            }
            const archived = isGroupArchived(selectedGroup)
            toggleCloseGroup(selectedGroup.id, !selectedGroup.isClosed, user, isAdmin)
            if (archived) showToast("success", `Group "${selectedGroup.title}" dibuka kembali.`)
            else showToast("success", `Group "${selectedGroup.title}" berhasil diarsipkan.`)
          }}
          onDeleteGroup={() => {
            const isCreator = Boolean(user?.id && user.id === selectedGroup.createdById)
            const canManage = Boolean(isCreator || isAdmin)
            if (!canManage) {
              showToast("error", "Akses ditolak: Hanya pembuat vote atau admin yang dapat menghapus group ini.")
              return
            }
            deleteGroup(selectedGroup.id, user, isAdmin)
            setSelectedGroupId(null)
            showToast("success", `Group "${selectedGroup.title}" berhasil dihapus permanen.`)
          }}
          onUpdateGroup={async (updates) => {
            const isCreator = Boolean(user?.id && user.id === selectedGroup.createdById)
            const canManage = Boolean(isCreator || isAdmin)
            if (!canManage) {
              const errMsg = "Akses ditolak: Hanya pembuat vote atau admin yang dapat mengubah group ini."
              showToast("error", errMsg)
              return { success: false, error: errMsg }
            }
            const res = await updateGroup(selectedGroup.id, updates, user, isAdmin)
            if (res.success) showToast("success", "Judul vote group berhasil diperbarui.")
            else showToast("error", res.error || "Gagal memperbarui group.")
            return res
          }}
          onToast={showToast}
        />
      ) : isLoading ? (
        <div className="py-16 text-center font-mono text-xs text-gray-500 flex flex-col items-center gap-2">
          <RotateCw className="size-4 animate-spin text-[#2E5AA8]" />
          <span>Memuat vote groups...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center font-mono text-xs text-[#526374] space-y-3 bg-[#FAFBFD] border border-dashed border-[#CBD5E1] rounded-[3px]">
          <div className="text-4xl">🗳️</div>
          <div className="font-bold text-slate-700">
            {activeTab === "active" ? "Belum ada vote group aktif" : activeTab === "archived" ? "Belum ada arsip" : "Belum ada vote group"}
          </div>
          {activeTab !== "archived" && user && !isGuest && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1E4E8C] hover:bg-[#153A6B] text-white text-xs font-mono font-bold rounded-[2px] border border-[#102A45] cursor-pointer"
            >
              <Plus className="size-3" /> Buat Vote Group Pertama
            </button>
          )}
          {activeTab !== "archived" && isGuest && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-300 rounded-[2px] text-[11px] text-amber-800 font-mono">
              <Eye className="size-3 text-amber-700" />
              <span>Mode Tamu: Masuk dengan Google untuk membuat vote group baru.</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((group) => (
            <GroupCard key={group.id} group={group} onClick={() => setSelectedGroupId(group.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
