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
  sanitizeChatMessage,
  MAX_MESSAGE_LENGTH,
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
  User,
  Pencil,
  Check,
  X,
  ShieldAlert,
  SmilePlus,
  Bell,
  BellOff,
  ExternalLink,
  Copy,
  Play,
} from "lucide-react"
import { useNotification } from "@/lib/notification-store"
import { usePresence } from "@/lib/presence-store"
import { usePicStore } from "@/lib/pic-store"
import { useWordle } from "@/lib/wordle-store"
import { useLapakStore } from "@/lib/lapak-store"
import { useDesktop } from "@/components/desktop/desktop-context"
import { useWinamp, extractYouTubeId } from "@/lib/winamp-store"
import { fetchYouTubeMeta, YouTubeMeta } from "@/lib/youtube-meta"
import { computeUserBadges } from "@/lib/user-badges"
import { UserBadge } from "@/components/retro/user-badge"
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
  currentUserId?: string,
  membersMap?: Map<string, TeamMember>
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
    const resolvedName = membersMap?.get(r.userId)?.name || r.userName
    entry.userNames.push(resolvedName)
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

function ChatLiveLink({
  url,
  isOwn,
  onPlayInWinamp,
  hideRawUrl = false,
}: {
  url: string
  isOwn?: boolean
  onPlayInWinamp?: (url: string, title?: string) => void
  hideRawUrl?: boolean
}) {
  const [copied, setCopied] = React.useState(false)
  const isYouTube = Boolean(extractYouTubeId(url))
  const [ytMeta, setYtMeta] = React.useState<YouTubeMeta | null>(null)
  const [isLoadingTitle, setIsLoadingTitle] = React.useState(false)

  React.useEffect(() => {
    if (!isYouTube) return
    let active = true
    setIsLoadingTitle(true)
    fetchYouTubeMeta(url)
      .then((meta) => {
        if (active && meta) {
          setYtMeta(meta)
        }
      })
      .finally(() => {
        if (active) setIsLoadingTitle(false)
      })
    return () => {
      active = false
    }
  }, [url, isYouTube])

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (onPlayInWinamp) {
      onPlayInWinamp(url, ytMeta?.title || undefined)
    }
  }

  return (
    <span className="inline-flex flex-col my-1 max-w-full align-baseline">
      {/* YouTube Title & Preview Card to prevent prank/rickroll */}
      {isYouTube && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title={ytMeta?.title ? `Buka di YouTube: ${ytMeta.title}` : `Buka tautan YouTube: ${url}`}
          className={cn(
            "w-full mb-1.5 p-1.5 rounded-[3px] border shadow-2xs text-[11px] select-text flex flex-col gap-0.5 text-left transition-all hover:opacity-95 cursor-pointer block group",
            isOwn
              ? "bg-[#0B1E33] border-cyan-500/50 text-cyan-100 hover:border-cyan-400"
              : "bg-[#F8FAFC] border-[#94A3B8] text-[#0F172A] hover:border-[#64748B]"
          )}
        >
          <span className="flex items-center justify-between gap-1 font-mono text-[9px] uppercase tracking-wider opacity-80 select-none">
            <span className="flex items-center gap-1">
              <span className="text-[11px]">🎬</span>
              <span className="font-bold">
                {ytMeta?.author ? `YouTube • ${ytMeta.author}` : "YouTube Video"}
              </span>
            </span>
            <ExternalLink className="size-3 opacity-60 group-hover:opacity-100 shrink-0" />
          </span>
          <span className="font-bold leading-snug break-words text-[12px] text-left group-hover:underline">
            {ytMeta?.title ? (
              `"${ytMeta.title}"`
            ) : isLoadingTitle ? (
              <span className="italic opacity-70 font-normal">Memuat judul video...</span>
            ) : (
              <span className="italic opacity-70 font-normal">Tautan Video YouTube</span>
            )}
          </span>
        </a>
      )}

      <span className="inline-flex items-center flex-wrap gap-1 align-baseline max-w-full">
        {!hideRawUrl && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={ytMeta?.title ? `Buka: ${ytMeta.title} (${url})` : `Buka tautan: ${url}`}
            className={cn(
              "inline-flex items-center gap-1 font-medium underline underline-offset-2 break-all rounded-[2px] px-1 py-0.2 transition-colors",
              isOwn
                ? "text-cyan-200 hover:text-white hover:bg-blue-800/60"
                : "text-[#1E4E8C] hover:text-blue-900 hover:bg-blue-50"
            )}
          >
            <ExternalLink className="size-3 shrink-0 inline opacity-80" />
            <span className="break-all">{url}</span>
          </a>
        )}

        {/* Salin Button */}
        <button
          type="button"
          onClick={handleCopy}
          title="Salin link ke clipboard"
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] font-mono text-[10px] font-bold border transition-all cursor-pointer select-none active:translate-y-px shadow-2xs",
            copied
              ? "bg-emerald-600 text-white border-emerald-400"
              : isOwn
              ? "bg-[#102A45]/80 hover:bg-[#102A45] text-cyan-200 hover:text-white border-cyan-400/40"
              : "bg-[#CBD5E1] hover:bg-white text-[#102A45] border-[#94A3B8]"
          )}
        >
          {copied ? (
            <>
              <Check className="size-2.5 text-white" />
              <span>Tersalin!</span>
            </>
          ) : (
            <>
              <Copy className="size-2.5" />
              <span>Salin</span>
            </>
          )}
        </button>

        {/* Putar di Winamp Button (if YouTube / Audio) */}
        {isYouTube && onPlayInWinamp && (
          <button
            type="button"
            onClick={handlePlay}
            title={ytMeta?.title ? `Putar "${ytMeta.title}" di WINAMP.EXE` : "Putar video/lagu ini di WINAMP.EXE"}
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] font-mono text-[10px] font-bold border transition-all cursor-pointer select-none active:translate-y-px shadow-2xs",
              isOwn
                ? "bg-amber-400 hover:bg-amber-300 text-black border-amber-300 font-bold"
                : "bg-[#1E4E8C] hover:bg-[#2A65B2] text-white border-blue-400 font-bold"
            )}
          >
            <Play className="size-2.5 fill-current" />
            <span>Putar di Winamp</span>
          </button>
        )}
      </span>
    </span>
  )
}

export function ChatApp() {
  const { user, isGuest, isAdmin, signInWithGoogle } = useAuth()
  const { members } = useTeamStore()
  const { openWindow } = useDesktop()
  const { addTrack } = useWinamp()

  // Map profil member terbaru berdasarkan user_id dan id untuk sinkronisasi realtime nama & avatar di chat
  const membersMap = React.useMemo(() => {
    const map = new Map<string, TeamMember>()
    members.forEach((m) => {
      if (m.user_id) map.set(m.user_id, m)
      map.set(m.id, m)
    })
    return map
  }, [members])
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
  const { isUserOnline, onlineTeamCount } = usePresence()
  const { getUserPicTags } = usePicStore()
  const { leaderboard: wordleLeaderboard } = useWordle()
  const { activeItems: lapakItems } = useLapakStore()

  const topWordleUserId = React.useMemo(() => {
    const top = wordleLeaderboard.find((e) => e.isSolved)
    return top ? top.userId : null
  }, [wordleLeaderboard])

  const lapakSellerUserIds = React.useMemo(() => {
    const set = new Set<string>()
    lapakItems.forEach((item) => {
      if (item.createdById) set.add(item.createdById)
    })
    return set
  }, [lapakItems])

  const getBadgesForUser = React.useCallback(
    (userId?: string, userRole?: string) => {
      if (!userId) return []
      const picTags = getUserPicTags(userId)
      const isLapakSeller = lapakSellerUserIds.has(userId)
      return computeUserBadges({
        userId,
        userRole,
        picTags,
        topWordleUserId,
        isLapakSeller,
      })
    },
    [getUserPicTags, lapakSellerUserIds, topWordleUserId]
  )

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
  const lastSentAtRef = React.useRef<number>(0)

  // Confirm delete dialog state
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Active Message selection (Tap to show actions on mobile)
  const [activeMessageId, setActiveMessageId] = React.useState<string | null>(null)

  // Active Emoji Reaction Picker popover
  const [activeReactionPickerMessageId, setActiveReactionPickerMessageId] = React.useState<string | null>(null)

  // Active Member Profile popover
  const [activeProfileMember, setActiveProfileMember] = React.useState<{
    name: string
    avatarUrl?: string | null
    role?: string
    userId?: string
  } | null>(null)

  // Channel Roster popover
  const [isRosterOpen, setIsRosterOpen] = React.useState(false)

  const handleMentionUser = React.useCallback((name: string) => {
    const mentionTag = `@${name.trim()} `
    setInputVal((prev) => {
      if (prev.endsWith(" ") || prev.length === 0) {
        return prev + mentionTag
      }
      return prev + " " + mentionTag
    })
    setActiveProfileMember(null)
    setIsRosterOpen(false)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  React.useEffect(() => {
    const handleMentionEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ name: string }>
      if (customEvent.detail?.name) {
        handleMentionUser(customEvent.detail.name)
      }
    }
    window.addEventListener("mention-member", handleMentionEvent)
    return () => window.removeEventListener("mention-member", handleMentionEvent)
  }, [handleMentionUser])

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement
      if (
        !target.closest(".reaction-picker-popover") &&
        !target.closest(".reaction-picker-trigger") &&
        !target.closest(".message-action-toolbar") &&
        !target.closest(".message-bubble") &&
        !target.closest(".member-profile-popover") &&
        !target.closest(".member-profile-trigger") &&
        !target.closest(".channel-roster-popover") &&
        !target.closest(".channel-roster-trigger")
      ) {
        setActiveReactionPickerMessageId(null)
        setActiveMessageId(null)
        setActiveProfileMember(null)
        setIsRosterOpen(false)
      }
    }
    window.addEventListener("click", handleOutsideClick)
    window.addEventListener("touchstart", handleOutsideClick)
    return () => {
      window.removeEventListener("click", handleOutsideClick)
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
    const sanitized = sanitizeChatMessage(inputVal)
    if (!sanitized) {
      setErrorMessage("Pesan tidak boleh kosong.")
      return
    }
    if (sanitized.length > MAX_MESSAGE_LENGTH) {
      setErrorMessage(`Pesan terlalu panjang (maksimal ${MAX_MESSAGE_LENGTH} karakter).`)
      return
    }
    setIsSavingEdit(true)
    const res = await editMessage(editingMessageId, sanitized, user)
    setIsSavingEdit(false)
    if (res.success) {
      setEditingMessageId(null)
      setInputVal("")
      setErrorMessage(null)
    } else if (res.error) {
      setErrorMessage(res.error)
    }
  }

  // Auto-resize textarea dynamically based on content (min 38px, max 110px)
  const adjustTextareaHeight = React.useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    const nextHeight = Math.min(Math.max(el.scrollHeight, 38), 110)
    el.style.height = `${nextHeight}px`
  }, [])

  React.useEffect(() => {
    adjustTextareaHeight()
  }, [inputVal, adjustTextareaHeight])

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
      const cleaned = sanitizeChatMessage(inputVal)
      if (!cleaned) {
        setInputVal("")
        return
      }
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
    const sanitized = sanitizeChatMessage(inputVal)
    if (!sanitized) {
      setInputVal("")
      return
    }
    if (isSending) return

    // Cooldown 600ms pencegahan spamming / flooding
    const now = Date.now()
    if (now - lastSentAtRef.current < 600) {
      return
    }

    if (sanitized.length > MAX_MESSAGE_LENGTH) {
      setErrorMessage(`Pesan terlalu panjang (maksimal ${MAX_MESSAGE_LENGTH} karakter).`)
      return
    }

    lastSentAtRef.current = now
    const mentions = extractMentions(sanitized)
    setInputVal("")
    setMentionQuery(null)
    setErrorMessage(null)

    const res = await sendMessage(sanitized, mentions, user)
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

  // Render highlighted text with @mentions badges and live URLs
  const renderMessageContent = (text: string, isOwn?: boolean) => {
    const isWinampShare = /📻\s*\[WINAMP\s*98\]\s*Lagi dengerin:/i.test(text)

    // Ambil daftar nama yang valid, urutkan dari yang terpanjang agar nama lengkap diutamakan
    const knownNames = Array.from(
      new Set([
        "all",
        "semua",
        ...members
          .map((m) => m.name.trim())
          .filter((name) => Boolean(name) && name.length <= 40),
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

      // If not a mention, parse URLs
      const urlPattern = /(https?:\/\/[^\s]+)/gi
      const subParts = part.split(urlPattern)

      return (
        <React.Fragment key={idx}>
          {subParts.map((subPart, subIdx) => {
            if (/^https?:\/\/[^\s]+$/i.test(subPart)) {
              // Separate trailing punctuation if any (like .,:;!?)
              const trailingPunctMatch = subPart.match(/[.,;:!?)\]}>]+$/)
              const trailingPunct = trailingPunctMatch ? trailingPunctMatch[0] : ""
              const cleanUrl = trailingPunct
                ? subPart.slice(0, subPart.length - trailingPunct.length)
                : subPart

              return (
                <React.Fragment key={subIdx}>
                  <ChatLiveLink
                    url={cleanUrl}
                    isOwn={isOwn}
                    hideRawUrl={isWinampShare}
                    onPlayInWinamp={(u, title) => {
                      addTrack(u, title)
                      openWindow("winamp")
                    }}
                  />
                  {trailingPunct}
                </React.Fragment>
              )
            }
            let textToDisplay = subPart
            if (isWinampShare) {
              textToDisplay = textToDisplay.replace(/\s*[—–-]\s*$/, "").trimEnd()
            }
            return <span key={subIdx}>{textToDisplay}</span>
          })}
        </React.Fragment>
      )
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
          {onlineTeamCount > 0 && (
            <span
              title={`${onlineTeamCount} anggota tim sedang online`}
              className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300 shadow-2xs"
            >
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{onlineTeamCount} online</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Member Roster Button & Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsRosterOpen((prev) => !prev)}
              title={`Daftar Anggota Tim (${members.length}, ${onlineTeamCount} Online)`}
              className={cn(
                "channel-roster-trigger px-1.5 py-0.5 border border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] shadow-sm active:translate-y-px cursor-pointer rounded-[2px] flex items-center gap-1 text-[10px] font-mono",
                isRosterOpen
                  ? "bg-[#1E4E8C] text-white font-bold"
                  : "bg-[#CBD5E1] hover:bg-white text-[#102A45]"
              )}
            >
              <Users className={cn("size-3", isRosterOpen ? "text-blue-200" : "text-[#1E4E8C]")} />
              <span>{members.length}</span>
              {onlineTeamCount > 0 && (
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
              )}
            </button>

            {/* Roster Dropdown */}
            {isRosterOpen && (
              <div className="channel-roster-popover absolute top-full right-0 mt-1 w-60 bg-[#D4DDE6] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] shadow-xl rounded-[2px] z-40 overflow-hidden select-none animate-in fade-in zoom-in-95">
                <div className="px-2 py-1 bg-gradient-to-r from-[#102A45] to-[#1E4E8C] text-white flex items-center justify-between text-[11px] font-mono font-bold">
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3 text-blue-200" />
                    <span>Anggota Tim ({members.length})</span>
                    {onlineTeamCount > 0 && (
                      <span className="text-[9px] text-emerald-300 font-normal">
                        • {onlineTeamCount} online
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsRosterOpen(false)}
                    className="size-3.5 hover:bg-white/20 rounded flex items-center justify-center text-xs leading-none cursor-pointer"
                  >
                    ×
                  </button>
                </div>
                <div className="max-h-52 overflow-y-auto p-1 space-y-0.5 bg-white">
                  {members.map((m) => {
                    const isOnline = isUserOnline(m.user_id, m.name)

                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleMentionUser(m.name)}
                        title={`Klik untuk mention @${m.name} (${isOnline ? "Online" : "Offline"})`}
                        className="w-full flex items-center justify-between gap-1.5 p-1 rounded hover:bg-blue-50 text-left cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <div className="relative shrink-0">
                            <UserAvatar src={m.avatar_url} name={m.name} size="size-5" textClass="text-[8px]" />
                            {isOnline && (
                              <span
                                title="Sedang Online"
                                className="absolute -bottom-0.5 -right-0.5 size-1.5 bg-emerald-500 border border-white rounded-full ring-0.5 ring-emerald-600"
                              />
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-[#14253D] truncate">{m.name}</span>
                        </div>
                        <div className="shrink-0 flex items-center gap-1">
                          {isOnline && (
                            <span className="text-[8px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-300">
                              ON
                            </span>
                          )}
                          {getBadgesForUser(m.user_id || m.id, m.role).slice(0, 1).map((b) => (
                            <UserBadge key={b.id} badge={b} size="xs" />
                          ))}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

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
            const isOwn = !!(user && (msg.userId === user.id || (msg.userId === "guest-user" && isGuest)))
            const member = membersMap.get(msg.userId)
            const authorName = (isOwn && user ? user.name : member?.name) || msg.userName
            const authorAvatar = (isOwn && user ? user.avatarUrl : member?.avatar_url) ?? msg.userAvatar
            const authorRole = (isOwn && user ? user.role : member?.role) || msg.userRole

            const canDelete = isMessageDeletable(msg, user?.id || "", isAdmin)
            const canEdit = isMessageEditable(msg, user?.id || "")
            const remainingMins = getRemainingDeleteMinutes(msg)
            const isEditingThis = editingMessageId === msg.id

            const reactionsForMsg = reactions[msg.id] || []
            const groupedRx = getGroupedReactions(reactionsForMsg, user?.id, membersMap)

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
                      {/* Name Header for Own Message */}
                      <div className="flex items-center gap-1.5 mb-0.5 mr-1 flex-wrap justify-end">
                        {getBadgesForUser(msg.userId, authorRole).slice(0, 2).map((b) => (
                          <UserBadge key={b.id} badge={b} size="xs" />
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setActiveProfileMember({
                              name: authorName,
                              avatarUrl: authorAvatar,
                              role: authorRole,
                              userId: msg.userId,
                            })
                          }
                          title={`Lihat profil Anda (${authorName})`}
                          className="member-profile-trigger font-bold text-[11px] text-blue-900 hover:underline cursor-pointer text-right shrink-0"
                        >
                          {authorName.split(" ")[0]} (Kamu)
                        </button>
                      </div>

                      <div
                        onClick={() => setActiveMessageId((prev) => (prev === msg.id ? null : msg.id))}
                        className={cn(
                          "message-bubble w-full rounded-2xl rounded-br-xs px-3.5 py-2 shadow-sm text-[13px] leading-relaxed bg-[#1E4E8C] text-white border border-[#163B6B] select-text transition-all cursor-pointer",
                          isEditingThis && "ring-2 ring-blue-300 ring-offset-1",
                          activeMessageId === msg.id && "ring-2 ring-blue-300 ring-offset-1"
                        )}
                      >
                        <div className="break-words whitespace-pre-wrap select-text flow-root">
                          {renderMessageContent(msg.message, true)}
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
                    <button
                      type="button"
                      onClick={() =>
                        setActiveProfileMember({
                          name: authorName,
                          avatarUrl: authorAvatar,
                          role: authorRole,
                          userId: msg.userId,
                        })
                      }
                      title={`Lihat profil ${authorName}`}
                      className="member-profile-trigger mt-1 shrink-0 cursor-pointer hover:scale-105 transition-transform"
                    >
                      <UserAvatar
                        src={authorAvatar}
                        name={authorName}
                        size="size-7"
                        textClass="text-[10px]"
                      />
                    </button>

                    <div className="max-w-[85%] sm:max-w-[76%] flex flex-col items-start">
                      {/* Name Header */}
                      <div className="flex items-center gap-1.5 mb-0.5 ml-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveProfileMember({
                              name: authorName,
                              avatarUrl: authorAvatar,
                              role: authorRole,
                              userId: msg.userId,
                            })
                          }
                          title={`Lihat profil ${authorName}`}
                          className="member-profile-trigger font-bold text-[11px] text-[#1E3A8A] hover:underline cursor-pointer text-left shrink-0"
                        >
                          {authorName}
                        </button>

                        {/* User Badges (Max 2 for compact chat view) */}
                        {getBadgesForUser(msg.userId, authorRole).slice(0, 2).map((b) => (
                          <UserBadge key={b.id} badge={b} size="xs" />
                        ))}

                        {isMentioned && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#FEF08A] text-[#854D0E] border border-[#FACC15] shrink-0">
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
                            {renderMessageContent(msg.message, false)}
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
      <div className="relative bg-[#D4DDE6] border-t-2 border-t-[#A4B5C6] p-2 sm:p-2.5 flex flex-col gap-1.5 shrink-0">
        {/* Mention Autocomplete Dropdown Popup */}
        {mentionQuery !== null && mentionOptions.length > 0 && (
          <div className="absolute bottom-full left-1.5 right-1.5 sm:right-auto sm:left-2 mb-1 sm:w-64 max-h-36 sm:max-h-48 overflow-y-auto bg-white border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] shadow-xl rounded-[3px] z-50 select-none py-1">
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

        {/* Quick Emoji Bar, Mention Hint & Character Counter */}
        <div className="flex items-center justify-between text-xs gap-1 select-none">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => addEmoji(emoji)}
                className="px-1.5 py-0.5 text-xs bg-white/70 hover:bg-white rounded border border-[#A4B5C6] shadow-sm active:translate-y-px cursor-pointer shrink-0"
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {inputVal.length > 0 && (
              <span
                className={cn(
                  "text-[9px] font-mono px-1 py-0.2 rounded transition-colors",
                  inputVal.length >= MAX_MESSAGE_LENGTH
                    ? "bg-red-100 text-red-700 font-bold border border-red-300"
                    : inputVal.length >= MAX_MESSAGE_LENGTH * 0.8
                    ? "bg-amber-100 text-amber-800 font-semibold border border-amber-300"
                    : "text-gray-500 bg-white/70 border border-gray-200"
                )}
              >
                {inputVal.length}/{MAX_MESSAGE_LENGTH}
              </span>
            )}
            <div
              className="flex items-center gap-0.5 text-[10px] text-gray-500 font-mono"
              title="Ketik @ untuk mention anggota tim"
            >
              <AtSign className="size-3 text-blue-600" />
              <span className="hidden sm:inline">@mention</span>
            </div>
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
        <div className="flex items-end gap-1.5 sm:gap-2">
          <div className="relative flex-1 flex flex-col">
            <textarea
              ref={textareaRef}
              rows={1}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder={
                editingMessageId
                  ? "Edit pesan... (Enter simpan, Esc batal)"
                  : "Tulis pesan... (@ untuk mention)"
              }
              value={inputVal}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                setTimeout(() => {
                  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
                }, 150)
              }}
              className={cn(
                "w-full py-2 px-2.5 bg-white text-[16px] sm:text-xs font-sans rounded-[2px] border-2 border-t-[#5E7287] border-l-[#5E7287] border-r-white border-b-white shadow-inner focus:outline-none focus:ring-1 resize-none leading-relaxed transition-[height] duration-75 overflow-y-auto",
                editingMessageId
                  ? "focus:ring-emerald-600 border-emerald-500/50 bg-emerald-50/20"
                  : "focus:ring-[#1E4E8C]"
              )}
              style={{ minHeight: "38px", maxHeight: "110px" }}
            />
          </div>

          <button
            type="button"
            onClick={handleSendMessage}
            disabled={!sanitizeChatMessage(inputVal) || isSending || isSavingEdit}
            className={cn(
              "h-[38px] px-3 sm:px-4 flex items-center justify-center gap-1.5 font-mono font-bold text-xs rounded-[2px] transition-all cursor-pointer select-none shrink-0",
              !sanitizeChatMessage(inputVal) || isSending || isSavingEdit
                ? "bg-gray-300 text-gray-500 border-2 border-gray-400 cursor-not-allowed opacity-60"
                : editingMessageId
                  ? "bg-emerald-700 text-white hover:bg-emerald-800 border-2 border-t-emerald-400 border-l-emerald-400 border-r-emerald-950 border-b-emerald-950 shadow-[2px_2px_0px_#064e3b] active:translate-y-px"
                  : "bg-[#1E4E8C] text-white hover:bg-[#153A6B] border-2 border-t-[#6BA3E8] border-l-[#6BA3E8] border-r-[#0D2440] border-b-[#0D2440] shadow-[2px_2px_0px_#0D2440] active:translate-y-px"
            )}
          >
            {editingMessageId ? (
              <>
                <Check className="size-4 sm:size-3.5" />
                <span className="hidden sm:inline">
                  {isSavingEdit ? "Simpan..." : "Simpan"}
                </span>
              </>
            ) : (
              <>
                <Send className="size-4 sm:size-3.5" />
                <span className="hidden sm:inline">Kirim</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Retro Member Profile Popover Modal */}
      {activeProfileMember && (
        <div className="member-profile-popover fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-64 bg-[#D4DDE6] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] shadow-2xl rounded-[3px] overflow-hidden select-none animate-in fade-in zoom-in-95">
            {/* Title Bar */}
            <div className="h-7 bg-gradient-to-r from-[#102A45] to-[#1E4E8C] px-2 flex items-center justify-between text-white text-xs font-mono font-bold">
              <span>Profil Anggota</span>
              <button
                type="button"
                onClick={() => setActiveProfileMember(null)}
                className="size-4 hover:bg-white/20 rounded flex items-center justify-center text-sm leading-none cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Profile Content */}
            <div className="p-4 flex flex-col items-center text-center bg-white">
              <UserAvatar
                src={activeProfileMember.avatarUrl}
                name={activeProfileMember.name}
                size="size-14"
                textClass="text-lg"
                className="mb-2.5 shadow-md border-2 border-[#1E4E8C]/20"
              />
              <div className="font-bold text-sm text-[#14253D] leading-tight mb-1">
                {activeProfileMember.name}
              </div>

              {/* Badges & Roles */}
              <div className="flex flex-wrap items-center justify-center gap-1 mb-3 max-w-[220px]">
                {getBadgesForUser(activeProfileMember.userId, activeProfileMember.role).length > 0 ? (
                  getBadgesForUser(activeProfileMember.userId, activeProfileMember.role).map((b) => (
                    <UserBadge key={b.id} badge={b} size="sm" />
                  ))
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-300">
                    <User className="size-3 text-slate-500" />
                    <span>Anggota Tim</span>
                  </span>
                )}
              </div>

              {/* Quick Mention Action */}
              <button
                type="button"
                onClick={() => handleMentionUser(activeProfileMember.name)}
                className="w-full py-1.5 px-3 bg-[#1E4E8C] hover:bg-[#153A6B] text-white rounded-[2px] font-mono text-xs font-bold flex items-center justify-center gap-1.5 active:translate-y-px cursor-pointer shadow-sm"
              >
                <AtSign className="size-3.5" />
                <span>Mention di Pesan</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
