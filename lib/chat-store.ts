"use client"

import * as React from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { AuthUser } from "@/lib/auth"

export interface ChatMessage {
  id: string
  message: string
  mentions: string[]
  userId: string
  userName: string
  userAvatar?: string | null
  userRole: string
  isEdited: boolean
  editedAt?: string | null
  isDeleted: boolean
  deletedBy?: "creator" | "admin" | null
  deletedAt?: string | null
  createdAt: string
}

export interface ChatReaction {
  id: string
  messageId: string
  emoji: string
  userId: string
  userName: string
  createdAt: string
}

interface DbChatMessage {
  id: string
  message: string
  mentions?: string[] | null
  user_id: string
  user_name: string
  user_avatar?: string | null
  user_role?: string | null
  is_edited?: boolean | null
  edited_at?: string | null
  is_deleted?: boolean | null
  deleted_by?: string | null
  deleted_at?: string | null
  created_at: string
}

interface DbChatReaction {
  id: string
  message_id: string
  emoji: string
  user_id: string
  user_name: string
  created_at: string
}

function mapDbReaction(db: DbChatReaction): ChatReaction {
  return {
    id: db.id,
    messageId: db.message_id,
    emoji: db.emoji,
    userId: db.user_id,
    userName: db.user_name,
    createdAt: db.created_at,
  }
}

function mapDbMessage(db: DbChatMessage): ChatMessage {
  const isDeleted = Boolean(db.is_deleted)
  return {
    id: db.id,
    message: isDeleted ? "[Pesan telah dihapus]" : db.message,
    mentions: isDeleted ? [] : Array.isArray(db.mentions) ? db.mentions : [],
    userId: db.user_id,
    userName: db.user_name,
    userAvatar: db.user_avatar,
    userRole: db.user_role || "member",
    isEdited: Boolean(db.is_edited),
    editedAt: db.edited_at,
    isDeleted,
    deletedBy: (db.deleted_by as "creator" | "admin") || null,
    deletedAt: db.deleted_at,
    createdAt: db.created_at,
  }
}

export const MAX_MESSAGE_LENGTH = 1000

/**
 * Sanitasi & normalisasi pesan chat untuk mencegah pesan kosong, spasi enter,
 * Unicode zero-width / invisible flood, dan pembengkakan teks.
 */
export function sanitizeChatMessage(raw: string): string {
  if (!raw) return ""
  // 1. Bersihkan karakter non-printable, zero-width spaces, LRM/RLM, dan invisible formatting
  let cleaned = raw.replace(
    /[\u200B-\u200F\u2028-\u202F\u205F-\u206F\uFEFF\u180E\u2800\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g,
    ""
  )
  // 2. Normalisasi baris kosong berlebihan: maksimal 2 enter berturut-turut (1 baris kosong pemisah)
  cleaned = cleaned.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n")
  // 3. Trim spasi luar
  return cleaned.trim()
}

export function isMessageDeletable(
  msg: ChatMessage,
  currentUserId?: string | null,
  isAdmin?: boolean
): boolean {
  if (!currentUserId || msg.isDeleted) return false
  if (isAdmin) return true
  if (msg.userId !== currentUserId) return false

  const messageAgeMs = Date.now() - new Date(msg.createdAt).getTime()
  return messageAgeMs <= 15 * 60 * 1000 // 15 menit
}

export function isMessageEditable(
  msg: ChatMessage,
  currentUserId?: string | null
): boolean {
  if (!currentUserId || msg.isDeleted) return false
  if (msg.userId !== currentUserId) return false

  const messageAgeMs = Date.now() - new Date(msg.createdAt).getTime()
  return messageAgeMs <= 15 * 60 * 1000 // 15 menit
}

export function getRemainingDeleteMinutes(msg: ChatMessage): number {
  const messageAgeMs = Date.now() - new Date(msg.createdAt).getTime()
  const remainingMs = 15 * 60 * 1000 - messageAgeMs
  return Math.max(0, Math.ceil(remainingMs / (60 * 1000)))
}

export function isSameDay(dateIso1: string, dateIso2: string): boolean {
  try {
    const d1 = new Date(dateIso1)
    const d2 = new Date(dateIso2)
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    )
  } catch {
    return false
  }
}

export function getDateSeparatorLabel(dateIso: string): string {
  try {
    const target = new Date(dateIso)
    const now = new Date()

    const targetDateOnly = new Date(target.getFullYear(), target.getMonth(), target.getDate())
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const diffDays = Math.round(
      (nowDateOnly.getTime() - targetDateOnly.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays === 0) return "Hari ini"
    if (diffDays === 1) return "Kemarin"

    if (target.getFullYear() === now.getFullYear()) {
      return target.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
      })
    }

    return target.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return ""
  }
}

const PAGE_SIZE = 50

export function useChatStore() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [reactions, setReactions] = React.useState<Record<string, ChatReaction[]>>({})
  const [isLoading, setIsLoading] = React.useState(true)
  const [isLoadingMore, setIsLoadingMore] = React.useState(false)
  const [hasMore, setHasMore] = React.useState(false)
  const [tableMissing, setTableMissing] = React.useState(false)
  const [isSending, setIsSending] = React.useState(false)

  const isTableMissingError = (err: { code?: string; message?: string }) =>
    err?.code === "PGRST205" ||
    err?.code === "PGRST204" ||
    err?.code === "42P01" ||
    err?.message?.includes("schema cache") ||
    err?.message?.includes("does not exist")

  // Helper untuk fetch reactions berdasarkan daftar message ID
  const fetchReactionsForMessages = React.useCallback(async (messageIds: string[]) => {
    if (!isSupabaseConfigured || !supabase || messageIds.length === 0) return
    try {
      const { data, error } = await supabase
        .from("chat_reactions")
        .select("*")
        .in("message_id", messageIds)

      if (error) {
        if (isTableMissingError(error)) return
        console.warn("fetch reactions error:", error)
        return
      }

      if (data && data.length > 0) {
        const mapped = data.map((r) => mapDbReaction(r as DbChatReaction))
        setReactions((prev) => {
          const next = { ...prev }
          mapped.forEach((rx) => {
            if (!next[rx.messageId]) {
              next[rx.messageId] = []
            }
            const existingIdx = next[rx.messageId].findIndex(
              (r) => r.id === rx.id || r.userId === rx.userId
            )
            if (existingIdx >= 0) {
              next[rx.messageId][existingIdx] = rx
            } else {
              next[rx.messageId].push(rx)
            }
          })
          return next
        })
      }
    } catch (err) {
      console.warn("fetch reactions error:", err)
    }
  }, [])

  // ─── Initial Fetch (50 pesan terbaru) ───────────────────────
  const fetchMessages = React.useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setMessages([])
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE)

      if (error) {
        if (isTableMissingError(error)) {
          setTableMissing(true)
          setIsLoading(false)
          return
        }
        throw error
      }

      setTableMissing(false)
      const raw = data || []
      setHasMore(raw.length === PAGE_SIZE)
      const mapped = raw.map((m) => mapDbMessage(m as DbChatMessage)).reverse()
      setMessages(mapped)

      const ids = raw.map((m) => m.id)
      if (ids.length > 0) {
        fetchReactionsForMessages(ids)
      }
    } catch (err) {
      if (isTableMissingError(err as { code?: string; message?: string })) {
        setTableMissing(true)
      } else {
        console.warn("chat-store fetchMessages error:", err)
      }
    } finally {
      setIsLoading(false)
    }
  }, [fetchReactionsForMessages])

  // ─── Fetch Older Messages (Reverse Pagination) ──────────────
  const fetchOlderMessages = React.useCallback(async (): Promise<number> => {
    if (!isSupabaseConfigured || !supabase || isLoadingMore || !hasMore) return 0
    if (messages.length === 0) return 0

    const oldestMsg = messages[0]
    if (!oldestMsg) return 0

    setIsLoadingMore(true)
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .lt("created_at", oldestMsg.createdAt)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE)

      if (error) throw error

      const raw = data || []
      if (raw.length < PAGE_SIZE) {
        setHasMore(false)
      }

      if (raw.length > 0) {
        const olderMapped = raw.map((m) => mapDbMessage(m as DbChatMessage)).reverse()
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id))
          const filteredNew = olderMapped.filter((m) => !existingIds.has(m.id))
          return [...filteredNew, ...prev]
        })

        const olderIds = raw.map((m) => m.id)
        if (olderIds.length > 0) {
          fetchReactionsForMessages(olderIds)
        }

        return raw.length
      }
      return 0
    } catch (err) {
      console.warn("fetchOlderMessages error:", err)
      return 0
    } finally {
      setIsLoadingMore(false)
    }
  }, [hasMore, isLoadingMore, messages, fetchReactionsForMessages])

  // ─── Realtime Subscription & Background Sync ───────────────
  React.useEffect(() => {
    fetchMessages()

    // 1. Throttled refetch saat perangkat bangun dari sleep / tab aktif kembali / online
    let lastFetchTime = Date.now()
    const handleReactivation = () => {
      const now = Date.now()
      if (now - lastFetchTime > 2500) {
        lastFetchTime = now
        fetchMessages()
      }
    }

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        handleReactivation()
      }
    }

    const handleProfileUpdated = () => {
      fetchMessages()
    }

    // 2. Bridge pesan dari channel global (NotificationProvider)
    // Memastikan jika channel notifikasi berhasil menangkap pesan, chat langsung tersinkron
    const handleExternalMessage = (e: Event) => {
      const customEvent = e as CustomEvent<DbChatMessage>
      if (customEvent.detail) {
        const newMsg = mapDbMessage(customEvent.detail)
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev
          return [...prev, newMsg]
        })
      }
    }

    const handleExternalUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<DbChatMessage>
      if (customEvent.detail) {
        const updatedMsg = mapDbMessage(customEvent.detail)
        setMessages((prev) =>
          prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
        )
      }
    }

    const handleExternalDelete = (e: Event) => {
      const customEvent = e as CustomEvent<{ id?: string }>
      const deletedId = customEvent.detail?.id
      if (deletedId) {
        setMessages((prev) => prev.filter((m) => m.id !== deletedId))
      }
    }

    const handleExternalReactionInsert = (e: Event) => {
      const customEvent = e as CustomEvent<DbChatReaction>
      if (customEvent.detail) {
        const newRx = mapDbReaction(customEvent.detail)
        setReactions((prev) => {
          const list = prev[newRx.messageId] || []
          const existingIdx = list.findIndex(
            (r) => r.id === newRx.id || r.userId === newRx.userId
          )
          if (existingIdx >= 0) {
            const nextList = [...list]
            nextList[existingIdx] = newRx
            return {
              ...prev,
              [newRx.messageId]: nextList,
            }
          }
          return {
            ...prev,
            [newRx.messageId]: [...list, newRx],
          }
        })
      }
    }

    const handleExternalReactionUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<DbChatReaction>
      if (customEvent.detail) {
        const updatedRx = mapDbReaction(customEvent.detail)
        setReactions((prev) => {
          const list = prev[updatedRx.messageId] || []
          const existingIdx = list.findIndex(
            (r) => r.id === updatedRx.id || r.userId === updatedRx.userId
          )
          if (existingIdx >= 0) {
            const nextList = [...list]
            nextList[existingIdx] = updatedRx
            return {
              ...prev,
              [updatedRx.messageId]: nextList,
            }
          }
          return {
            ...prev,
            [updatedRx.messageId]: [...list, updatedRx],
          }
        })
      }
    }

    const handleExternalReactionDelete = (e: Event) => {
      const customEvent = e as CustomEvent<{ id?: string }>
      const oldRx = customEvent.detail
      if (oldRx?.id) {
        setReactions((prev) => {
          let changed = false
          const next: Record<string, ChatReaction[]> = {}
          for (const [mId, list] of Object.entries(prev)) {
            const filtered = list.filter((r) => r.id !== oldRx.id)
            if (filtered.length !== list.length) changed = true
            next[mId] = filtered
          }
          return changed ? next : prev
        })
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("profile-updated", handleProfileUpdated)
      window.addEventListener("focus", handleReactivation)
      window.addEventListener("online", handleReactivation)
      window.addEventListener("chat-focused", handleReactivation)
      window.addEventListener("chat-message-received", handleExternalMessage)
      window.addEventListener("chat-message-updated", handleExternalUpdate)
      window.addEventListener("chat-message-deleted", handleExternalDelete)
      window.addEventListener("chat-reaction-inserted", handleExternalReactionInsert)
      window.addEventListener("chat-reaction-updated", handleExternalReactionUpdate)
      window.addEventListener("chat-reaction-deleted", handleExternalReactionDelete)
      document.addEventListener("visibilitychange", handleVisibilityChange)
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("profile-updated", handleProfileUpdated)
        window.removeEventListener("focus", handleReactivation)
        window.removeEventListener("online", handleReactivation)
        window.removeEventListener("chat-focused", handleReactivation)
        window.removeEventListener("chat-message-received", handleExternalMessage)
        window.removeEventListener("chat-message-updated", handleExternalUpdate)
        window.removeEventListener("chat-message-deleted", handleExternalDelete)
        window.removeEventListener("chat-reaction-inserted", handleExternalReactionInsert)
        window.removeEventListener("chat-reaction-updated", handleExternalReactionUpdate)
        window.removeEventListener("chat-reaction-deleted", handleExternalReactionDelete)
        document.removeEventListener("visibilitychange", handleVisibilityChange)
      }
    }
  }, [fetchMessages])

  // ─── Helpers: Session Verification & Error Sanitizer ────────
  const ensureFreshSession = async () => {
    if (!isSupabaseConfigured || !supabase) return null
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        const refreshed = await supabase.auth.refreshSession()
        return refreshed.data.session || null
      }
      if (session.expires_at && session.expires_at * 1000 < Date.now() + 120000) {
        const refreshed = await supabase.auth.refreshSession()
        return refreshed.data.session || session
      }
      return session
    } catch {
      return null
    }
  }

  const formatChatErrorMessage = (err: unknown): string => {
    if (!err) return "Terjadi kesalahan yang tidak diketahui."
    const msg =
      typeof err === "object" && err !== null && "message" in err
        ? String((err as { message: string }).message)
        : String(err)
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String((err as { code: string }).code)
        : ""
    if (
      code === "42501" ||
      msg.toLowerCase().includes("row-level security") ||
      msg.toLowerCase().includes("jwt") ||
      msg.toLowerCase().includes("not authenticated")
    ) {
      return "Sesi login telah kedaluwarsa. Silakan refresh halaman atau login ulang akun Google Anda."
    }
    return msg
  }

  // ─── Send Message ──────────────────────────────────────────
  const sendMessage = async (
    text: string,
    mentions: string[],
    currentUser: AuthUser
  ): Promise<{ success: boolean; error?: string }> => {
    const sanitized = sanitizeChatMessage(text)
    if (!sanitized) return { success: false, error: "Pesan tidak boleh kosong." }
    if (sanitized.length > MAX_MESSAGE_LENGTH) {
      return {
        success: false,
        error: `Pesan terlalu panjang (maksimal ${MAX_MESSAGE_LENGTH} karakter).`,
      }
    }

    if (currentUser.isGuest || currentUser.id === "guest-user") {
      return {
        success: false,
        error: "Mode Tamu tidak dapat mengirim pesan. Silakan masuk dengan akun Google.",
      }
    }

    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: "Supabase belum terkonfigurasi." }
    }

    // Pastikan session auth segar dan ambil user id yang valid dari auth.uid()
    const activeSession = await ensureFreshSession()
    const verifiedUserId = activeSession?.user?.id || currentUser.id

    // Sanitize mentions (max 20 entries, alphanumeric/uuid/all)
    const cleanMentions = Array.isArray(mentions)
      ? mentions
          .map((m) => String(m).trim().slice(0, 64))
          .filter(Boolean)
          .slice(0, 20)
      : []

    const tempId = crypto.randomUUID()
    const nowIso = new Date().toISOString()

    const optimisticMsg: ChatMessage = {
      id: tempId,
      message: sanitized,
      mentions: cleanMentions,
      userId: verifiedUserId,
      userName: currentUser.name,
      userAvatar: currentUser.avatarUrl || null,
      userRole: currentUser.role || "member",
      isEdited: false,
      isDeleted: false,
      createdAt: nowIso,
    }

    setMessages((prev) => [...prev, optimisticMsg])
    setIsSending(true)

    try {
      let { error } = await supabase.from("chat_messages").insert({
        id: tempId,
        message: sanitized,
        mentions: cleanMentions,
        user_id: verifiedUserId,
        user_name: currentUser.name,
        user_avatar: currentUser.avatarUrl || null,
        user_role: currentUser.role || "member",
        is_edited: false,
        is_deleted: false,
        created_at: nowIso,
      })

      // Jika gagal karena RLS / token kedaluwarsa, paksa refresh session dan coba kirim ulang sekali
      if (error && (error.code === "42501" || error.message?.toLowerCase().includes("row-level security"))) {
        try {
          const refreshed = await supabase.auth.refreshSession()
          if (refreshed.data.session?.user) {
            const retryRes = await supabase.from("chat_messages").insert({
              id: tempId,
              message: sanitized,
              mentions: cleanMentions,
              user_id: refreshed.data.session.user.id,
              user_name: currentUser.name,
              user_avatar: currentUser.avatarUrl || null,
              user_role: currentUser.role || "member",
              is_edited: false,
              is_deleted: false,
              created_at: nowIso,
            })
            error = retryRes.error
          }
        } catch {
          // ignore refresh error
        }
      }

      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        return { success: false, error: formatChatErrorMessage(error) }
      }

      return { success: true }
    } catch (err: unknown) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      return { success: false, error: formatChatErrorMessage(err) }
    } finally {
      setIsSending(false)
    }
  }

  // ─── Edit Message ──────────────────────────────────────────
  const editMessage = async (
    messageId: string,
    newText: string,
    currentUser: AuthUser
  ): Promise<{ success: boolean; error?: string }> => {
    const target = messages.find((m) => m.id === messageId)
    if (!target) return { success: false, error: "Pesan tidak ditemukan" }

    if (!isMessageEditable(target, currentUser.id)) {
      return {
        success: false,
        error: "Batas waktu 15 menit untuk mengedit pesan telah habis.",
      }
    }

    const sanitized = sanitizeChatMessage(newText)
    if (!sanitized) return { success: false, error: "Pesan tidak boleh kosong." }
    if (sanitized.length > MAX_MESSAGE_LENGTH) {
      return {
        success: false,
        error: `Pesan terlalu panjang (maksimal ${MAX_MESSAGE_LENGTH} karakter).`,
      }
    }

    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: "Supabase belum terkonfigurasi." }
    }

    const nowIso = new Date().toISOString()
    const previousMessages = [...messages]

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              message: sanitized,
              isEdited: true,
              editedAt: nowIso,
            }
          : m
      )
    )

    try {
      const { error } = await supabase
        .from("chat_messages")
        .update({
          message: sanitized,
          is_edited: true,
          edited_at: nowIso,
        })
        .eq("id", messageId)

      if (error) {
        setMessages(previousMessages)
        return { success: false, error: formatChatErrorMessage(error) }
      }

      return { success: true }
    } catch (err: unknown) {
      setMessages(previousMessages)
      return { success: false, error: formatChatErrorMessage(err) }
    }
  }

  // ─── Soft Delete Message ───────────────────────────────────
  const deleteMessage = async (
    messageId: string,
    currentUser: AuthUser,
    isAdmin: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    const target = messages.find((m) => m.id === messageId)
    if (!target) return { success: false, error: "Pesan tidak ditemukan" }

    if (!isMessageDeletable(target, currentUser.id, isAdmin)) {
      return {
        success: false,
        error: "Batas waktu 15 menit untuk menghapus pesan telah habis.",
      }
    }

    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: "Supabase belum terkonfigurasi." }
    }

    const isDeletedByAdmin = isAdmin && target.userId !== currentUser.id
    const deletedBy: "creator" | "admin" = isDeletedByAdmin ? "admin" : "creator"
    const nowIso = new Date().toISOString()
    const previousMessages = [...messages]

    // Optimistic soft delete: pertahankan balon tapi tandai isDeleted dan bersihkan isi pesan
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              message: "[Pesan telah dihapus]",
              mentions: [],
              isDeleted: true,
              deletedBy,
              deletedAt: nowIso,
            }
          : m
      )
    )

    try {
      const { error } = await supabase
        .from("chat_messages")
        .update({
          message: "[Pesan telah dihapus]",
          mentions: [],
          is_deleted: true,
          deleted_by: deletedBy,
          deleted_at: nowIso,
        })
        .eq("id", messageId)

      if (error) {
        setMessages(previousMessages)
        return { success: false, error: formatChatErrorMessage(error) }
      }

      return { success: true }
    } catch (err: unknown) {
      setMessages(previousMessages)
      return { success: false, error: formatChatErrorMessage(err) }
    }
  }

  // ─── Toggle Reaction ───────────────────────────────────────
  const toggleReaction = async (
    messageId: string,
    emoji: string,
    currentUser: AuthUser
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmoji = emoji?.trim().slice(0, 16)
    if (!cleanEmoji) {
      return { success: false, error: "Emoji tidak valid." }
    }

    if (currentUser.isGuest || currentUser.id === "guest-user") {
      return {
        success: false,
        error: "Mode Tamu tidak dapat memberi reaksi. Silakan masuk dengan akun Google.",
      }
    }

    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: "Supabase belum terkonfigurasi." }
    }

    const session = await ensureFreshSession()
    const verifiedUserId = session?.user?.id || currentUser.id

    const currentList = reactions[messageId] || []
    const existingRx = currentList.find((r) => r.userId === verifiedUserId || r.userId === currentUser.id)

    const previousReactions = { ...reactions }

    if (existingRx) {
      if (existingRx.emoji === cleanEmoji) {
        // Toggle OFF: user mengklik emoji yang sama -> hapus reaksi
        setReactions((prev) => ({
          ...prev,
          [messageId]: (prev[messageId] || []).filter((r) => r.id !== existingRx.id),
        }))

        try {
          const { error } = await supabase
            .from("chat_reactions")
            .delete()
            .eq("id", existingRx.id)

          if (error) {
            setReactions(previousReactions)
            return { success: false, error: formatChatErrorMessage(error) }
          }
          return { success: true }
        } catch (err) {
          setReactions(previousReactions)
          return { success: false, error: formatChatErrorMessage(err) }
        }
      } else {
        // Ganti reaksi: user mengklik emoji berbeda -> update reaksi sebelumnya
        const nowIso = new Date().toISOString()
        const updatedRx: ChatReaction = {
          ...existingRx,
          emoji: cleanEmoji,
          userName: currentUser.name,
          createdAt: nowIso,
        }

        setReactions((prev) => ({
          ...prev,
          [messageId]: (prev[messageId] || []).map((r) =>
            r.id === existingRx.id ? updatedRx : r
          ),
        }))

        try {
          const { error } = await supabase
            .from("chat_reactions")
            .update({
              emoji: cleanEmoji,
              user_name: currentUser.name,
              created_at: nowIso,
            })
            .eq("id", existingRx.id)

          if (error) {
            setReactions(previousReactions)
            return { success: false, error: formatChatErrorMessage(error) }
          }
          return { success: true }
        } catch (err) {
          setReactions(previousReactions)
          return { success: false, error: formatChatErrorMessage(err) }
        }
      }
    } else {
      // Optimistic insert: user belum memberi reaksi
      const tempId = crypto.randomUUID()
      const nowIso = new Date().toISOString()
      const newRx: ChatReaction = {
        id: tempId,
        messageId,
        emoji: cleanEmoji,
        userId: verifiedUserId,
        userName: currentUser.name,
        createdAt: nowIso,
      }

      setReactions((prev) => ({
        ...prev,
        [messageId]: [...(prev[messageId] || []), newRx],
      }))

      try {
        const { error } = await supabase.from("chat_reactions").insert({
          id: tempId,
          message_id: messageId,
          emoji: cleanEmoji,
          user_id: verifiedUserId,
          user_name: currentUser.name,
          created_at: nowIso,
        })

        if (error) {
          setReactions(previousReactions)
          return { success: false, error: formatChatErrorMessage(error) }
        }
        return { success: true }
      } catch (err) {
        setReactions(previousReactions)
        return { success: false, error: formatChatErrorMessage(err) }
      }
    }
  }

  return {
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
    refetch: fetchMessages,
  }
}
