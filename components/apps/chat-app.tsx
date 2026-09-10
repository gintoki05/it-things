"use client"

import * as React from "react"
import { useAuth } from "@/lib/auth"
import { useTeamStore, TeamMember } from "@/lib/team-store"
import {
  useChatStore,
  ChatMessage,
  ChatReaction,
  isMessageDeletable,
  isMessageEditable,
  getRemainingDeleteMinutes,
  isSameDay,
  getDateSeparatorLabel,
} from "@/lib/chat-store"
import { UserAvatar } from "@/components/retro/user-avatar"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  Send,
  Trash2,
  Lock,
  LogIn,
  RotateCw,
  AtSign,
  Clock,
  ShieldCheck,
  Crown,
  AlertCircle,
  Hash,
  Users,
  Pencil,
  Check,
  X,
  ShieldAlert,
  SmilePlus,
  Bell,
  BellOff,
} from "lucide-react"
import { useNotification } from "@/lib/notification-store"
import { cn } from "@/lib/utils"

const QUICK_EMOJIS = ["👍", "☕", "🚀", "😂", "❤️", "🔥", "🙏"]
const REACTION_EMOJIS = ["👍", "❤️", "😂", "🔥", "🚀", "☕", "🎉"]

interface ReactionGroup {
  emoji: string
  count: number
  hasReacted: boolean
  userNames: string[]
}

function getGroupedReactions(
  reactionsList: ChatReaction[] = [],
  currentUserId?: string
): ReactionGroup[] {
  const map = new Map<string, { count: number; hasReacted: boolean; userNames: string[] }>()
  for (const r of reactionsList) {
    let entry = map.get(r.emoji)
    if (!entry) {
      entry = { count: 0, hasReacted: false, userNames: [] }
      map.set(r.emoji, entry)
    }
    entry.count += 1
    if (r.userId === currentUserId) {
      entry.hasReacted = true
    }
    entry.userNames.push(r.userName)
  }

  return Array.from(map.entries()).map(([emoji, data]) => ({
    emoji,
    count: data.count,
    hasReacted: data.hasReacted,
    userNames: data.userNames,
  }))
}

function formatMessageTime(isoString: string): string {
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return ""
  }
}

interface MentionOption {
  id: string
  name: string
  label: string
  avatarUrl?: string
  role?: string
}

export function ChatApp() {
  const { user, isGuest, isAdmin, signInWithGoogle } = useAuth()
  const { members } = useTeamStore()
  const {
    messages,
    reactions,
    isLoading,
    isLoadingMore,
    hasMore,
    isSending,
    tableMissing,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    fetchOlderMessages,
    refetch,
  } = useChatStore()
  const {
    isMuted,
    toggleMute,
    clearUnreadChat,
    browserPermission,
    requestNotificationPermission,
  } = useNotification()

  React.useEffect(() => {
    clearUnreadChat()
  }, [clearUnreadChat])

  const [inputVal, setInputVal] = React.useState("")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  // Edit Message state (Bottom Input Bar Mode ala Telegram)
  const [editingMessageId, setEditingMessageId] = React.useState<string | null>(null)
  const [isSavingEdit, setIsSavingEdit] = React.useState(false)

  // Mention Autocomplete state
  const [mentionQuery, setMentionQuery] = React.useState<string | null>(null)
  const [mentionStartIndex, setMentionStartIndex] = React.useState<number>(-1)
  const [mentionActiveIndex, setMentionActiveIndex] = React.useState(0)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)

  // Confirm delete dialog state
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Active Message selection (Tap to show actions on mobile)
  const [activeMessageId, setActiveMessageId] = React.useState<string | null>(null)

  // Active Emoji Reaction Picker popover
  const [activeReactionPickerMessageId, setActiveReactionPickerMessageId] = React.useState<string | null>(null)

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement
      if (
        !target.closest(".reaction-picker-popover") &&
        !target.closest(".reaction-picker-trigger") &&
        !target.closest(".message-action-toolbar") &&
        !target.closest(".message-bubble")
      ) {
        setActiveReactionPickerMessageId(null)
        setActiveMessageId(null)
      }
    }
    window.addEventListener("mousedown", handleOutsideClick)
    window.addEventListener("touchstart", handleOutsideClick)
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick)
      window.removeEventListener("touchstart", handleOutsideClick)
    }
  }, [])

  // Timer update for 15-minute countdowns
  const [, setTick] = React.useState(0)
  React.useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(interval)
  }, [])

  const startEdit = (msg: ChatMessage) => {
    setEditingMessageId(msg.id)
    setInputVal(msg.message)
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(msg.message.length, msg.message.length)
      }
    }, 0)
  }

  const cancelEdit = () => {
    setEditingMessageId(null)
    setInputVal("")
  }

  const handleSaveEdit = async () => {
    if (!editingMessageId || !user) return
    const trimmed = inputVal.trim()
    if (!trimmed) return
    setIsSavingEdit(true)
    const res = await editMessage(editingMessageId, trimmed, user)
    setIsSavingEdit(false)
    if (res.success) {
      setEditingMessageId(null)
      setInputVal("")
    } else if (res.error) {
      setErrorMessage(res.error)
    }
  }

  // Auto-scroll ke bawah hanya saat pertama kali load atau ada pesan baru di bawah
  const lastMessageId = messages[messages.length - 1]?.id
  const isInitialLoadRef = React.useRef(true)

  React.useEffect(() => {
    if (isLoading) return
    if (isInitialLoadRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
      isInitialLoadRef.current = false
      return
    }
    // Hanya scroll jika pesan paling bawah berubah (pesan baru masuk)
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [lastMessageId, isLoading])

  // Muat pesan lama saat tombol load more diklik tanpa melompatkan posisi scroll
  const handleLoadOlder = async () => {
    if (!scrollContainerRef.current || isLoadingMore || !hasMore) return
    const container = scrollContainerRef.current
    const prevScrollHeight = container.scrollHeight
    const prevScrollTop = container.scrollTop

    const loadedCount = await fetchOlderMessages()
    if (loadedCount > 0) {
      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight
          container.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight)
        }
      })
    }
  }

  // Build mention options list (@all + team members)
  const mentionOptions = React.useMemo<MentionOption[]>(() => {
    const list: MentionOption[] = [
      {
        id: "all",
        name: "all",
        label: "@all (Panggil Semua Anggota Tim)",
        role: "announcement",
      },
    ]

    members.forEach((m) => {
      list.push({
        id: m.id,
        name: m.name,
        label: `@${m.name}`,
        avatarUrl: m.avatar_url,
        role: m.role,
      })
    })

    if (!mentionQuery) return list

    const q = mentionQuery.toLowerCase()
    return list.filter(
      (opt) =>
        opt.name.toLowerCase().includes(q) ||
        opt.label.toLowerCase().includes(q)
    )
  }, [members, mentionQuery])

  // Detect "@" query from cursor position
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setInputVal(val)
    setErrorMessage(null)

    const cursorPos = e.target.selectionStart
    const textBeforeCursor = val.slice(0, cursorPos)
    const atMatch = textBeforeCursor.match(/(^|\s)@([a-zA-Z0-9_\u00C0-\u017F]*)$/)

    if (atMatch) {
      const matchText = atMatch[2]
      const startIndex = cursorPos - matchText.length - 1
      setMentionQuery(matchText)
      setMentionStartIndex(startIndex)
      setMentionActiveIndex(0)
    } else {
      setMentionQuery(null)
      setMentionStartIndex(-1)
    }
  }

  // Choose a mention option
  const applyMention = (opt: MentionOption) => {
    if (mentionStartIndex < 0 || !textareaRef.current) return

    const cursorPos = textareaRef.current.selectionStart
    const before = inputVal.slice(0, mentionStartIndex)
    const after = inputVal.slice(cursorPos)
    const inserted = `@${opt.name} `
    const newVal = before + inserted + after

    setInputVal(newVal)
    setMentionQuery(null)
    setMentionStartIndex(-1)

    // Move cursor after inserted mention
    setTimeout(() => {
      if (textareaRef.current) {
        const nextPos = before.length + inserted.length
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(nextPos, nextPos)
      }
    }, 0)
  }

  // Keyboard navigation for mention autocomplete and Enter to send
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && mentionOptions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setMentionActiveIndex((prev) => (prev + 1) % mentionOptions.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setMentionActiveIndex((prev) =>
          prev <= 0 ? mentionOptions.length - 1 : prev - 1
        )
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        applyMention(mentionOptions[mentionActiveIndex])
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setMentionQuery(null)
        return
      }
    }

    if (e.key === "Escape" && editingMessageId) {
      e.preventDefault()
      cancelEdit()
      return
    }

    // Submit on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Parse mentions from input text
  const extractMentions = (text: string): string[] => {
    const found = new Set<string>()
    if (/@all\b/i.test(text)) {
      found.add("all")
    }
    members.forEach((m) => {
      const regex = new RegExp(`@${m.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")
      if (regex.test(text)) {
        found.add(m.id)
      }
    })
    return Array.from(found)
  }

  // Send or Edit message
  const handleSendMessage = async () => {
    if (editingMessageId) {
      handleSaveEdit()
      return
    }

    if (!user || isGuest) return
    const trimmed = inputVal.trim()
    if (!trimmed || isSending) return

    const mentions = extractMentions(trimmed)
    setInputVal("")
    setMentionQuery(null)

    const res = await sendMessage(trimmed, mentions, user)
    if (!res.success && res.error) {
      setErrorMessage(res.error)
    }
  }

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deleteTargetId || !user) return
    setIsDeleting(true)
    const res = await deleteMessage(deleteTargetId, user, isAdmin)
    setIsDeleting(false)
    setDeleteTargetId(null)
    if (!res.success && res.error) {
      setErrorMessage(res.error)
    }
  }

  // Add emoji to input
  const addEmoji = (emoji: string) => {
    setInputVal((prev) => prev + emoji)
    textareaRef.current?.focus()
  }

  // Render highlighted text with @mentions badges
  const renderMessageContent = (text: string) => {
    // Ambil daftar nama yang valid, urutkan dari yang terpanjang agar nama lengkap diutamakan
    const knownNames = Array.from(
      new Set([
        "all",
        "semua",
        ...members.map((m) => m.name.trim()).filter(Boolean),
      ])
    ).sort((a, b) => b.length - a.length)

    // Regex yang hanya mencocokkan nama anggota yang valid atau single-word mention (@user)
    const escapedNames = knownNames.map((n) =>
      n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    )
    const mentionPattern = new RegExp(
      `(@(?:${escapedNames.join("|")}|[a-zA-Z0-9_]+))(?![a-zA-Z0-9_])`,
      "gi"
    )

    const parts = text.split(mentionPattern)

    return parts.map((part, idx) => {
      if (part.startsWith("@")) {
        const namePart = part.slice(1).trim()
        const lower = namePart.toLowerCase()
        const isAll = lower === "all" || lower === "semua"
        const isTargetSelf =
          user &&
          (isAll || user.name.toLowerCase() === lower || user.name.toLowerCase().startsWith(lower))

        return (
          <span
            key={idx}
            className={cn(
              "inline-flex items-center px-1.5 py-0.2 mx-0.5 rounded font-mono font-bold text-[11px] shadow-sm select-none",
              isTargetSelf
                ? "bg-[#FFE066] text-[#7A4B00] border border-[#D4A017]"
                : "bg-[#1E4E8C] text-white border border-[#102A45]"
            )}
          >
            @{namePart}
          </span>
        )
      }
      return <span key={idx}>{part}</span>
    })
  }

  // ─── GUEST MODE LOCKED SCREEN ────────────────────────────────
  if (isGuest || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center select-none bg-[#D4DDE6]">
        <div className="bg-[#CBD5E1] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] p-6 max-w-sm w-full shadow-[4px_4px_0px_rgba(0,0,0,0.25)] flex flex-col items-center">
          <div className="size-12 rounded-full bg-[#102A45] flex items-center justify-center mb-3 shadow-inner border border-white/40">
            <Lock className="size-6 text-[#FFD700]" />
          </div>
          <h3 className="font-mono text-sm font-black text-[#102A45] tracking-wider mb-1 uppercase">
            CHAT.EXE // AKSES TERBATAS
          </h3>
          <div className="w-full h-px bg-[#5E7287] my-2" />
          <p className="text-xs text-gray-700 mb-4 leading-relaxed font-sans">
            Pesan instan tim bersifat privat. Pengunjung dalam <span className="font-bold text-amber-800">Mode Tamu</span> tidak dapat membaca maupun mengirim pesan obrolan.
          </p>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="flex items-center justify-center gap-2 w-full py-2 px-4 text-xs font-bold font-mono text-white bg-[#1E4E8C] hover:bg-[#153A6B] border-2 border-t-[#6BA3E8] border-l-[#6BA3E8] border-r-[#0D2440] border-b-[#0D2440] shadow-[2px_2px_0px_#0D2440] active:translate-y-px cursor-pointer"
          >
            <LogIn className="size-4" />
            <span>MASUK DENGAN GOOGLE</span>
          </button>
        </div>
      </div>
    )
  }

  // ─── MAIN CHAT INTERFACE ─────────────────────────────────────
  return (
    <div 
      onClickCapture={clearUnreadChat}
      onFocusCapture={clearUnreadChat}
      className="flex flex-col h-full bg-[#E5ECF2] select-none text-[#14253D]"
    >
      {/* Retro Channel Header */}
      <div className="h-8 px-2.5 bg-[#D4DDE6] border-b-2 border-b-[#A4B5C6] flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1 font-mono font-bold text-xs bg-[#102A45] text-white px-2 py-0.5 rounded-[2px] shadow-inner shrink-0">
            <Hash className="size-3 text-blue-300" />
            <span>general</span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={toggleMute}
            title={
              isMuted
                ? "Notifikasi Suara: DIBISUKAN (Klik untuk mengaktifkan)"
                : "Notifikasi Suara: AKTIF (Klik untuk membisukan)"
            }
            className={cn(
              "px-1.5 py-0.5 border border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] shadow-sm active:translate-y-px cursor-pointer rounded-[2px] flex items-center gap-1 text-[10px] font-mono",
              isMuted
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-[#CBD5E1] hover:bg-white text-[#102A45]"
            )}
          >
            {isMuted ? <BellOff className="size-3" /> : <Bell className="size-3" />}
            <span className="hidden sm:inline">{isMuted ? "Bisu" : "Suara"}</span>
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            title="Muat ulang pesan (Hapus pesan: max 15 menit)"
            className="p-1 bg-[#CBD5E1] hover:bg-white text-[#102A45] border border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] shadow-sm active:translate-y-px cursor-pointer rounded-[2px]"
          >
            <RotateCw className="size-3" />
          </button>
        </div>
      </div>

      {/* Browser Notification Permission Banner */}
      {browserPermission === "default" && (
        <div className="bg-[#FFF8E7] border-b border-[#E0C48C] px-2.5 py-1.5 flex items-center justify-between text-[11px] text-[#7A5210] shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <Bell className="size-3.5 text-[#B8860B] shrink-0" />
            <span className="truncate">Aktifkan notifikasi Windows agar tidak ketinggalan pesan obrolan tim.</span>
          </div>
          <button
            type="button"
            onClick={() => requestNotificationPermission()}
            className="ml-2 px-2 py-0.5 bg-[#CBD5E1] hover:bg-white text-[#14253D] border border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] rounded-[2px] font-mono font-bold text-[10px] shrink-0 active:translate-y-px cursor-pointer"
          >
            Izinkan
          </button>
        </div>
      )}

      {/* Table missing error banner */}
      {tableMissing && (
        <div className="bg-amber-100 border-b border-amber-300 px-3 py-1.5 text-xs text-amber-900 flex items-center gap-2">
          <AlertCircle className="size-4 text-amber-700 shrink-0" />
          <span>Tabel obrolan Supabase belum termigrasi. Pesan baru tidak akan tersimpan secara permanen.</span>
        </div>
      )}

      {/* Error alert banner */}
      {errorMessage && (
        <div className="bg-red-100 border-b border-red-300 px-3 py-1.5 text-xs text-red-900 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-700 font-bold hover:underline text-[10px]"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#F8FAFC]"
      >
        {/* Tombol Muat Pesan Sebelumnya (Reverse Pagination) */}
        {hasMore && (
          <div className="flex justify-center pb-1 pt-0.5">
            <button
              type="button"
              onClick={handleLoadOlder}
              disabled={isLoadingMore}
              className="text-[10px] font-mono text-[#1E4E8C] hover:text-[#102A45] hover:bg-white bg-[#E2E8F0] border border-[#CBD5E1] px-2.5 py-1 rounded-[2px] shadow-sm flex items-center gap-1 active:translate-y-px cursor-pointer"
            >
              {isLoadingMore ? (
                <span className="flex items-center gap-1 text-gray-600">
                  <RotateCw className="size-3 animate-spin" />
                  Memuat pesan lama...
                </span>
              ) : (
                <span>↑ Muat pesan sebelumnya</span>
              )}
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <span className="font-mono text-xs text-gray-500 animate-pulse tracking-wider">
              MEMUAT PERCAKAPAN...
            </span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 select-none py-8">
            <div className="size-10 rounded-full bg-gray-200 flex items-center justify-center mb-2">
              <Hash className="size-5 text-gray-400" />
            </div>
            <p className="font-mono text-xs font-bold text-gray-600">Belum ada percakapan</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Jadilah yang pertama menyapa tim di #general! Ketik @ untuk mention anggota.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isOwn = msg.userId === user.id
            const canDelete = isMessageDeletable(msg, user.id, isAdmin)
            const canEdit = isMessageEditable(msg, user.id)
            const remainingMins = getRemainingDeleteMinutes(msg)
            const isEditingThis = editingMessageId === msg.id

            const reactionsForMsg = reactions[msg.id] || []
            const groupedRx = getGroupedReactions(reactionsForMsg, user.id)

            // Cek apakah hari berbeda dari pesan sebelumnya untuk menampilkan badge tanggal
            const showDateSeparator =
              idx === 0 || !isSameDay(messages[idx - 1].createdAt, msg.createdAt)

            // Check if current user is mentioned in this message (hanya jika pesan tidak dihapus)
            const isMentioned =
              !msg.isDeleted &&
              (msg.mentions.includes("all") ||
              msg.mentions.includes(user.id) ||
              msg.message.toLowerCase().includes(`@${user.name.toLowerCase()}`) ||
              msg.message.toLowerCase().includes("@all") ||
              msg.message.toLowerCase().includes("@semua"))

            return (
              <React.Fragment key={msg.id}>
                {/* Date Separator Pill */}
                {showDateSeparator && (
                  <div className="flex items-center justify-center my-3 select-none">
                    <div className="h-px bg-[#E2E8F0] flex-1" />
                    <span className="mx-2 px-2.5 py-0.5 rounded-full bg-[#E2E8F0] border border-[#CBD5E1] font-mono text-[9px] font-bold text-gray-600 shadow-xs tracking-wider uppercase">
                      {getDateSeparatorLabel(msg.createdAt)}
                    </span>
                    <div className="h-px bg-[#E2E8F0] flex-1" />
                  </div>
                )}

                {/* Deleted Message Placeholder */}
                {msg.isDeleted ? (
                  <div className={cn("flex w-full my-1.5", isOwn ? "justify-end" : "justify-start")}>
                    <div className="max-w-[85%] px-3 py-1.5 rounded-lg bg-[#E2E8F0]/80 border border-[#CBD5E1] text-gray-500 italic text-[11px] flex items-center gap-1.5 shadow-xs select-none">
                      {msg.deletedBy === "admin" ? (
                        <>
                          <ShieldAlert className="size-3.5 text-red-500 shrink-0" />
                          <span className="font-medium text-gray-600">Pesan ini telah dihapus oleh Admin</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="size-3.5 text-gray-400 shrink-0" />
                          <span>Pesan ini telah dihapus oleh pengirim</span>
                        </>
                      )}
                      <span className="text-[9px] font-mono text-gray-400 ml-1">
                        {formatMessageTime(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                ) : isOwn ? (
                  /* Own Message Bubble (Right-aligned) */
                  <div className="relative flex w-full justify-end items-end gap-1.5 my-2 group">
                    {/* Action Toolbar */}
                    <div
                      className={cn(
                        "message-action-toolbar flex items-center gap-0.5 bg-white/95 border border-gray-300 rounded px-1.5 py-0.5 shadow-sm text-gray-500 transition-all z-20",
                        "absolute -top-7.5 right-1 sm:relative sm:top-auto sm:right-auto sm:mb-1",
                        activeReactionPickerMessageId === msg.id || activeMessageId === msg.id
                          ? "opacity-100 scale-100 pointer-events-auto"
                          : "opacity-0 scale-95 pointer-events-none sm:pointer-events-auto sm:group-hover:opacity-100 sm:group-hover:scale-100"
                      )}
                    >
                      {/* Reaction Trigger & Popover */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveReactionPickerMessageId(
                              activeReactionPickerMessageId === msg.id ? null : msg.id
                            )
                          }}
                          title="Beri reaksi emoji"
                          className={cn(
                            "reaction-picker-trigger p-1.5 sm:p-1 hover:text-amber-600 hover:bg-amber-50 rounded cursor-pointer transition-colors",
                            activeReactionPickerMessageId === msg.id && "text-amber-600 bg-amber-50"
                          )}
                        >
                          <SmilePlus className="size-3.5 sm:size-3" />
                        </button>

                        {/* Reaction Popover */}
                        {activeReactionPickerMessageId === msg.id && (
                          <div
                            className="reaction-picker-popover absolute bottom-full right-0 mb-1.5 flex items-center gap-0.5 bg-white border border-gray-300 rounded-full px-1.5 py-1 shadow-lg z-30 animate-in fade-in zoom-in-95 whitespace-nowrap max-w-[calc(100vw-32px)]"
                          >
                            {REACTION_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleReaction(msg.id, emoji, user)
                                  setActiveReactionPickerMessageId(null)
                                  setActiveMessageId(null)
                                }}
                                className="size-7 sm:size-6 flex items-center justify-center hover:scale-125 transition-transform rounded-full hover:bg-gray-100 text-sm sm:text-xs cursor-pointer"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            startEdit(msg)
                            setActiveMessageId(null)
                          }}
                          title={`Edit pesan (Sisa waktu: ${remainingMins} menit)`}
                          className="p-1.5 sm:p-1 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                        >
                          <Pencil className="size-3.5 sm:size-3" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteTargetId(msg.id)
                            setActiveMessageId(null)
                          }}
                          title={
                            isAdmin
                              ? "Hapus pesan ini (Hak Akses Admin)"
                              : `Hapus pesan (Sisa waktu: ${remainingMins} menit)`
                          }
                          className="p-1.5 sm:p-1 hover:text-red-600 hover:bg-red-50 text-red-500 sm:text-gray-500 rounded cursor-pointer"
                        >
                          <Trash2 className="size-3.5 sm:size-3" />
                        </button>
                      )}
                    </div>

                    {/* Own Bubble Body & Reaction Pills */}
                    <div className="max-w-[85%] sm:max-w-[76%] flex flex-col items-end">
                      <div
                        onClick={() => setActiveMessageId((prev) => (prev === msg.id ? null : msg.id))}
                        className={cn(
                          "message-bubble w-full rounded-2xl rounded-br-xs px-3.5 py-2 shadow-sm text-[13px] leading-relaxed bg-[#1E4E8C] text-white border border-[#163B6B] select-text transition-all cursor-pointer",
                          isEditingThis && "ring-2 ring-blue-300 ring-offset-1",
                          activeMessageId === msg.id && "ring-2 ring-blue-300 ring-offset-1"
                        )}
                      >
                        <div className="break-words whitespace-pre-wrap select-text flow-root">
                          {renderMessageContent(msg.message)}
                          {/* WhatsApp-style inline timestamp */}
                          <span className="inline-flex items-center gap-1 float-right ml-2.5 mt-1 -mb-0.5 text-[10px] text-blue-200/90 font-mono select-none whitespace-nowrap">
                            {msg.isEdited && (
                              <span className="text-[9px] text-blue-200/70 italic">(diedit)</span>
                            )}
                            <span>{formatMessageTime(msg.createdAt)}</span>
                          </span>
                        </div>
                      </div>

                      {/* Reaction Pills for Own Message */}
                      {groupedRx.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 justify-end select-none">
                          {groupedRx.map((group) => (
                            <button
                              key={group.emoji}
                              type="button"
                              onClick={() => toggleReaction(msg.id, group.emoji, user)}
                              title={group.userNames.join(", ")}
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono border transition-all cursor-pointer shadow-xs active:scale-95",
                                group.hasReacted
                                  ? "bg-blue-50 text-[#1E4E8C] border-blue-400 font-bold"
                                  : "bg-white/90 hover:bg-white text-gray-700 border-gray-300"
                              )}
                            >
                              <span>{group.emoji}</span>
                              <span className="text-[10px]">{group.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Other Team Member Bubble (Left-aligned) */
                  <div className="relative flex w-full justify-start items-start gap-2 my-2 group">
                    <UserAvatar
                      src={msg.userAvatar}
                      name={msg.userName}
                      size="size-7"
                      textClass="text-[10px]"
                      className="mt-1 shrink-0"
                    />

                    <div className="max-w-[85%] sm:max-w-[76%] flex flex-col items-start">
                      {/* Name & Role Header */}
                      <div className="flex items-center gap-1.5 mb-0.5 ml-1">
                        <span className="font-bold text-[11px] text-[#1E3A8A]">
                          {msg.userName}
                        </span>
                        {msg.userRole === "admin" && (
                          <span className="flex items-center gap-0.5 text-[9px] font-bold font-mono px-1 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-300">
                            <ShieldCheck className="size-2.5" /> Admin
                          </span>
                        )}
                        {msg.userRole === "treasurer" && (
                          <span className="flex items-center gap-0.5 text-[9px] font-bold font-mono px-1 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            <Crown className="size-2.5" /> Bendahara
                          </span>
                        )}
                        {isMentioned && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#FEF08A] text-[#854D0E] border border-[#FACC15]">
                            Mentioned
                          </span>
                        )}
                      </div>

                      <div className="relative flex items-end gap-1.5 w-full">
                        {/* Bubble Body */}
                        <div
                          onClick={() => setActiveMessageId((prev) => (prev === msg.id ? null : msg.id))}
                          className={cn(
                            "message-bubble rounded-2xl rounded-tl-xs px-3.5 py-2 shadow-sm text-[13px] leading-relaxed select-text transition-all cursor-pointer",
                            isMentioned
                              ? "bg-[#FFFDE7] border border-[#FACC15] text-[#1E293B] shadow-[2px_2px_0px_rgba(245,158,11,0.15)]"
                              : "bg-white text-[#1E293B] border border-[#E2E8F0]",
                            activeMessageId === msg.id && "ring-2 ring-[#1E4E8C]/60 ring-offset-1"
                          )}
                        >
                          <div className="break-words whitespace-pre-wrap select-text flow-root">
                            {renderMessageContent(msg.message)}
                            {/* WhatsApp-style inline timestamp */}
                            <span className="inline-flex items-center gap-1 float-right ml-2.5 mt-1 -mb-0.5 text-[10px] text-gray-400 font-mono select-none whitespace-nowrap">
                              {msg.isEdited && (
                                <span className="text-[9px] text-gray-400 italic">(diedit)</span>
                              )}
                              <span>{formatMessageTime(msg.createdAt)}</span>
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons for Other Messages */}
                        <div
                          className={cn(
                            "message-action-toolbar flex items-center gap-0.5 bg-white/95 border border-gray-300 rounded px-1.5 py-0.5 shadow-sm text-gray-500 transition-all z-20",
                            "absolute -top-7.5 left-1 sm:relative sm:top-auto sm:left-auto sm:mb-1",
                            activeReactionPickerMessageId === msg.id || activeMessageId === msg.id
                              ? "opacity-100 scale-100 pointer-events-auto"
                              : "opacity-0 scale-95 pointer-events-none sm:pointer-events-auto sm:group-hover:opacity-100 sm:group-hover:scale-100"
                          )}
                        >
                          {/* Reaction Trigger & Popover */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveReactionPickerMessageId(
                                  activeReactionPickerMessageId === msg.id ? null : msg.id
                                )
                              }}
                              title="Beri reaksi emoji"
                              className={cn(
                                "reaction-picker-trigger p-1.5 sm:p-1 hover:text-amber-600 hover:bg-amber-50 rounded cursor-pointer transition-colors",
                                activeReactionPickerMessageId === msg.id && "text-amber-600 bg-amber-50"
                              )}
                            >
                              <SmilePlus className="size-3.5 sm:size-3" />
                            </button>

                            {/* Reaction Popover */}
                            {activeReactionPickerMessageId === msg.id && (
                              <div className="reaction-picker-popover absolute bottom-full left-0 mb-1.5 flex items-center gap-0.5 bg-white border border-gray-300 rounded-full px-1.5 py-1 shadow-lg z-30 animate-in fade-in zoom-in-95 whitespace-nowrap max-w-[calc(100vw-32px)]">
                                {REACTION_EMOJIS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleReaction(msg.id, emoji, user)
                                      setActiveReactionPickerMessageId(null)
                                      setActiveMessageId(null)
                                    }}
                                    className="size-7 sm:size-6 flex items-center justify-center hover:scale-125 transition-transform rounded-full hover:bg-gray-100 text-sm sm:text-xs cursor-pointer"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {canDelete && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteTargetId(msg.id)
                                setActiveMessageId(null)
                              }}
                              title="Hapus pesan ini (Hak Akses Admin)"
                              className="p-1.5 sm:p-1 hover:text-red-600 hover:bg-red-50 text-red-500 sm:text-gray-500 rounded cursor-pointer"
                            >
                              <Trash2 className="size-3.5 sm:size-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Reaction Pills for Other Message */}
                      {groupedRx.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 justify-start select-none ml-1">
                          {groupedRx.map((group) => (
                            <button
                              key={group.emoji}
                              type="button"
                              onClick={() => toggleReaction(msg.id, group.emoji, user)}
                              title={group.userNames.join(", ")}
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono border transition-all cursor-pointer shadow-xs active:scale-95",
                                group.hasReacted
                                  ? "bg-blue-50 text-[#1E4E8C] border-blue-400 font-bold"
                                  : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                              )}
                            >
                              <span>{group.emoji}</span>
                              <span className="text-[10px]">{group.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </React.Fragment>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="relative bg-[#D4DDE6] border-t-2 border-t-[#A4B5C6] p-2.5 flex flex-col gap-1.5 shrink-0">
        {/* Mention Autocomplete Dropdown Popup */}
        {mentionQuery !== null && mentionOptions.length > 0 && (
          <div className="absolute bottom-full left-2 mb-1 w-64 max-h-48 overflow-y-auto bg-white border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] shadow-xl rounded-[3px] z-50 select-none py-1">
            <div className="px-2 py-1 text-[10px] font-mono font-bold text-gray-500 bg-[#E2E8F0] border-b border-gray-300 flex items-center gap-1">
              <AtSign className="size-3 text-blue-600" />
              <span>PILIH MENTION TIM</span>
            </div>
            {mentionOptions.map((opt, idx) => {
              const isActive = idx === mentionActiveIndex
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => applyMention(opt)}
                  onMouseEnter={() => setMentionActiveIndex(idx)}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors",
                    isActive
                      ? "bg-[#1E4E8C] text-white font-semibold"
                      : "hover:bg-blue-50 text-[#14253D]"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    {opt.id === "all" ? (
                      <div className="size-4 rounded-full bg-[#102A45] text-[#FFD700] font-black text-[9px] flex items-center justify-center shrink-0">
                        @
                      </div>
                    ) : (
                      <UserAvatar
                        src={opt.avatarUrl}
                        name={opt.name}
                        size="size-4"
                        textClass="text-[8px]"
                      />
                    )}
                    <span className="truncate">{opt.name}</span>
                  </div>

                  {opt.role === "admin" && (
                    <span
                      className={cn(
                        "text-[9px] font-mono px-1 rounded",
                        isActive ? "bg-white/20 text-white" : "bg-purple-100 text-purple-800"
                      )}
                    >
                      Admin
                    </span>
                  )}
                  {opt.id === "all" && (
                    <span
                      className={cn(
                        "text-[9px] font-mono px-1 rounded",
                        isActive ? "bg-white/20 text-white" : "bg-blue-100 text-blue-800"
                      )}
                    >
                      Semua
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Quick Emoji Bar & Mention Hint */}
        <div className="flex items-center justify-between text-xs gap-1">
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => addEmoji(emoji)}
                className="px-1.5 py-0.5 text-xs bg-white/70 hover:bg-white rounded border border-[#A4B5C6] shadow-sm active:translate-y-px cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>

          <div
            className="flex items-center gap-1 text-[10px] text-gray-500 font-mono shrink-0"
            title="Ketik @ untuk mention anggota tim"
          >
            <AtSign className="size-3 text-blue-600" />
            <span>@mention</span>
          </div>
        </div>

        {/* Edit Message Mode Banner (Gaya Telegram / Discord) */}
        {editingMessageId && (
          <div className="flex items-center justify-between px-2.5 py-1 bg-[#CBD5E1] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] rounded-[2px] shadow-inner text-xs animate-in fade-in slide-in-from-bottom-1">
            <div className="flex items-center gap-2 min-w-0">
              <Pencil className="size-3.5 text-[#1E4E8C] shrink-0" />
              <div className="truncate text-[11px] text-gray-700">
                <span className="font-bold text-[#1E4E8C]">Edit Pesan: </span>
                <span className="italic text-gray-600">
                  {messages.find((m) => m.id === editingMessageId)?.message}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={cancelEdit}
              className="text-gray-500 hover:text-red-700 font-bold text-xs p-0.5 rounded cursor-pointer flex items-center gap-1 shrink-0"
              title="Batal edit (Esc)"
            >
              <X className="size-3.5" />
              <span className="text-[10px] font-mono hidden sm:inline">Batal (Esc)</span>
            </button>
          </div>
        )}

        {/* Input Textarea & Send / Save Button */}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={2}
            placeholder={
              editingMessageId
                ? "Edit pesan... (Tekan Enter untuk simpan, Esc untuk batal)"
                : "Tulis pesan... (@ untuk mention)"
            }
            value={inputVal}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className={cn(
              "flex-1 p-2 bg-white text-xs font-sans rounded-[2px] border-2 border-t-[#5E7287] border-l-[#5E7287] border-r-white border-b-white shadow-inner focus:outline-none focus:ring-1 resize-none",
              editingMessageId
                ? "focus:ring-emerald-600 border-emerald-500/50 bg-emerald-50/20"
                : "focus:ring-[#1E4E8C]"
            )}
          />

          <button
            type="button"
            onClick={handleSendMessage}
            disabled={!inputVal.trim() || isSending || isSavingEdit}
            className={cn(
              "h-12 px-4 flex items-center justify-center gap-1.5 font-mono font-bold text-xs rounded-[2px] transition-all cursor-pointer select-none",
              !inputVal.trim() || isSending || isSavingEdit
                ? "bg-gray-300 text-gray-500 border-2 border-gray-400 cursor-not-allowed opacity-60"
                : editingMessageId
                  ? "bg-emerald-700 text-white hover:bg-emerald-800 border-2 border-t-emerald-400 border-l-emerald-400 border-r-emerald-950 border-b-emerald-950 shadow-[2px_2px_0px_#064e3b] active:translate-y-px"
                  : "bg-[#1E4E8C] text-white hover:bg-[#153A6B] border-2 border-t-[#6BA3E8] border-l-[#6BA3E8] border-r-[#0D2440] border-b-[#0D2440] shadow-[2px_2px_0px_#0D2440] active:translate-y-px"
            )}
          >
            {editingMessageId ? (
              <>
                <Check className="size-3.5" />
                <span className="hidden sm:inline">
                  {isSavingEdit ? "Simpan..." : "Simpan"}
                </span>
              </>
            ) : (
              <>
                <Send className="size-3.5" />
                <span className="hidden sm:inline">Kirim</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Message Deletion */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleConfirmDelete}
        title="HAPUS_PESAN.EXE"
        message={
          <div>
            <p className="mb-1">Apakah Anda yakin ingin menghapus pesan ini?</p>
            <p className="text-[11px] text-gray-500 font-mono">
              Pesan yang dihapus tidak dapat dipulihkan kembali.
            </p>
          </div>
        }
        confirmText={isDeleting ? "Menghapus..." : "Hapus Pesan"}
        cancelText="Batal"
        isLoading={isDeleting}
      />
    </div>
  )
}
