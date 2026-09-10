"use client"

import * as React from "react"
import { useAuth } from "@/lib/auth"
import {
  useVoteStore,
  VoteGroup,
  VoteType,
  isGroupArchived,
  daysRemaining,
} from "@/lib/vote-store"
import { detectEmoji } from "@/lib/emoji-helper"
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
} from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { UserAvatar } from "@/components/retro/user-avatar"

// ─── Helpers ─────────────────────────────────────────────────
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
  const [voteType, setVoteType] = React.useState<VoteType>("single")
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    await onCreate(title.trim(), desc.trim(), emoji || "🗳️", voteType)
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="retro-window-frame max-w-sm w-full rounded-[4px] overflow-hidden shadow-[5px_5px_0px_rgba(0,0,0,0.3)] bg-white flex flex-col">
        <div className="retro-titlebar px-3 py-1.5 flex items-center justify-between font-mono text-xs font-bold text-[#14253D]">
          <div className="flex items-center gap-1.5">
            <Vote className="size-3.5 text-[#1E4E8C]" />
            <span>BUAT_VOTE_GROUP.EXE</span>
          </div>
          <button type="button" onClick={onClose} className="text-[#526374] hover:text-black font-bold px-1">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {/* Emoji + Title */}
          <div className="flex gap-2">
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              maxLength={2}
              className="w-12 h-8 text-center text-lg border border-[#95A5B5] rounded-[2px] bg-[#FAFBFD] focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
            />
            <input
              type="text"
              placeholder="Judul vote group..."
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                const detected = detectEmoji(e.target.value)
                if (detected && detected !== "📦") setEmoji(detected)
              }}
              required
              className="flex-1 h-8 px-2 border border-[#95A5B5] rounded-[2px] bg-[#FAFBFD] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
            />
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
                className={`p-2 border rounded-[2px] text-left transition-colors ${
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
                className={`p-2 border rounded-[2px] text-left transition-colors ${
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
              className="retro-button-3d px-3 py-1 text-xs font-mono font-bold rounded-[2px]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="px-3 py-1 bg-[#1E4E8C] hover:bg-[#153A6B] disabled:opacity-50 text-white text-xs font-mono font-bold rounded-[2px] border border-[#102A45] flex items-center gap-1"
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
      className="w-full text-left p-3 bg-white border border-[#CBD5E1] rounded-[3px] hover:border-[#7D8E9E] hover:bg-[#F8FAFC] transition-all group"
    >
      <div className="flex items-start gap-2.5">
        <span className="text-2xl shrink-0 mt-0.5">{group.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="font-bold text-xs text-[#14253D] truncate">{group.title}</span>
            <VoteTypeBadge type={group.voteType} />
            <StatusBadge archived={archived} days={days} />
          </div>
          {group.description && (
            <p className="text-[10px] text-gray-500 truncate mb-1">{group.description}</p>
          )}
          <div className="flex items-center gap-3 text-[10px] text-gray-500 font-mono">
            <span>{group.options.length} opsi</span>
            <span>·</span>
            <span>{totalVotes} vote</span>
            <span>·</span>
            <span>{uniqueVoters} voter</span>
            <span>·</span>
            <span>by {group.createdByName.split(" ")[0]}</span>
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
}) {
  const [newOptionName, setNewOptionName] = React.useState("")
  const [addingOption, setAddingOption] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)

  const archived = isGroupArchived(group)
  const days = daysRemaining(group)
  const isCreator = currentUserId === group.createdById
  const canManage = isCreator || isAdmin

  const maxVotes = Math.max(...group.options.map((o) => o.voters.length), 0)
  const totalVotes = group.options.reduce((acc, o) => acc + o.voters.length, 0)

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOptionName.trim()) return
    setAddingOption(true)
    const emoji = detectEmoji(newOptionName.trim())
    await onAddOption(newOptionName.trim(), emoji !== "📦" ? emoji : "📌")
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
            className="p-1 hover:bg-[#EEF2F6] rounded text-[#526374] hover:text-[#14253D] transition-colors shrink-0"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-xl">{group.emoji}</span>
              <span className="font-bold text-sm text-[#14253D]">{group.title}</span>
              <VoteTypeBadge type={group.voteType} />
              <StatusBadge archived={archived} days={days} />
            </div>
            {group.description && (
              <p className="text-xs text-gray-500 ml-7">{group.description}</p>
            )}
            <div className="text-[10px] text-gray-400 font-mono ml-7 mt-0.5">
              by {group.createdByName} · {totalVotes} total vote
              {!archived && days > 0 && ` · berakhir dalam ${days} hari`}
              {!archived && days === 0 && " · berakhir hari ini"}
            </div>
          </div>
          {/* Manage buttons */}
          {canManage && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={onToggleClose}
                title={archived ? "Buka kembali voting" : "Tutup voting"}
                className="p-1.5 hover:bg-[#EEF2F6] rounded text-[#526374] hover:text-[#14253D] transition-colors"
              >
                {archived ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />}
              </button>
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  title="Hapus group"
                  className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={onDeleteGroup}
                    className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-mono font-bold rounded border border-red-800"
                  >
                    Hapus
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-2 py-0.5 bg-white text-[#526374] text-[10px] font-mono rounded border border-[#95A5B5]"
                  >
                    Batal
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
            {group.options
              .sort((a, b) => b.voters.length - a.voters.length)
              .map((option) => {
                const hasVoted = currentUserId ? option.voters.some((v) => v.id === currentUserId) : false
                const canDeleteOpt = currentUserId && (option.proposedById === currentUserId || canManage)

                return (
                  <div key={option.id} className="py-2.5 flex items-center gap-2.5">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base shrink-0">{option.emoji}</span>
                        <span className="font-semibold text-xs text-[#14253D] truncate">{option.name}</span>
                        {hasVoted && (
                          <span className="text-[9px] font-mono text-[#1E4E8C] font-bold">✓ Voted</span>
                        )}
                        {canDeleteOpt && !archived && (
                          <button
                            type="button"
                            onClick={() => onDeleteOption(option.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors"
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
    </div>
  )
}

// ─── Main VoteApp ─────────────────────────────────────────────
export function VoteApp() {
  const { user, isAdmin, isGuest } = useAuth()
  const { groups, isLoading, tableMissing, createGroup, deleteGroup, toggleCloseGroup, addOption, deleteOption, castVote, refresh } =
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
            const archived = isGroupArchived(selectedGroup)
            toggleCloseGroup(selectedGroup.id, !selectedGroup.isClosed)
            if (archived) showToast("success", "Voting dibuka kembali.")
            else showToast("success", "Voting ditutup.")
          }}
          onDeleteGroup={() => {
            deleteGroup(selectedGroup.id)
            setSelectedGroupId(null)
            showToast("success", `Group "${selectedGroup.title}" dihapus.`)
          }}
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
