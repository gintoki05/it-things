"use server"

import { createServerSupabase } from "@/lib/server/supabase-server"
import type { Database } from "@/lib/database.types"

export type DbChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"]
export type DbChatReaction = Database["public"]["Tables"]["chat_reactions"]["Row"]

export interface FetchChatResult {
  messages: DbChatMessage[]
  reactions: DbChatReaction[]
  hasMore: boolean
  error?: string
}

export async function fetchChatDataAction(params: {
  limit?: number
  beforeCreatedAt?: string
  token?: string | null
}): Promise<FetchChatResult> {
  const limit = params.limit || 50
  const supabase = createServerSupabase(params.token)
  if (!supabase) {
    return { messages: [], reactions: [], hasMore: false, error: "Supabase belum terkonfigurasi" }
  }

  try {
    let query = supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (params.beforeCreatedAt) {
      query = query.lt("created_at", params.beforeCreatedAt)
    }

    const { data: messagesData, error: msgError } = await query

    if (msgError) {
      return { messages: [], reactions: [], hasMore: false, error: msgError.message }
    }

    const messages = messagesData || []
    const hasMore = messages.length === limit

    // Ambil reaksi untuk seluruh pesan ini di server sekaligus (1 server roundtrip)
    const messageIds = messages.map((m) => m.id)
    let reactions: DbChatReaction[] = []

    if (messageIds.length > 0) {
      const { data: rxData, error: rxError } = await supabase
        .from("chat_reactions")
        .select("*")
        .in("message_id", messageIds)

      if (!rxError && rxData) {
        reactions = rxData
      }
    }

    return { messages, reactions, hasMore }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat pesan chat"
    return { messages: [], reactions: [], hasMore: false, error: message }
  }
}

export async function getUnreadChatCountAction(params: {
  lastRead: string
  userId?: string | null
  token?: string | null
}): Promise<{ count: number; error?: string }> {
  const supabase = createServerSupabase(params.token)
  if (!supabase) return { count: 0 }

  try {
    let query = supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .gt("created_at", params.lastRead)

    if (params.userId) {
      query = query.neq("user_id", params.userId)
    }

    const { count, error } = await query
    if (error) return { count: 0, error: error.message }
    return { count: count ?? 0 }
  } catch (err: unknown) {
    return { count: 0, error: err instanceof Error ? err.message : "Error count" }
  }
}

export async function sendChatMessageAction(params: {
  id?: string
  message: string
  mentions: string[]
  userId: string
  userName: string
  userAvatar?: string | null
  userRole?: string
  token?: string | null
}): Promise<{ success: boolean; data?: DbChatMessage; error?: string }> {
  const supabase = createServerSupabase(params.token)
  if (!supabase) return { success: false, error: "Supabase belum terkonfigurasi" }

  try {
    const payload = {
      ...(params.id ? { id: params.id } : {}),
      message: params.message,
      mentions: params.mentions,
      user_id: params.userId,
      user_name: params.userName,
      user_avatar: params.userAvatar || null,
      user_role: params.userRole || "member",
    }

    const { data, error } = await supabase
      .from("chat_messages")
      .insert(payload)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true, data }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Gagal mengirim pesan" }
  }
}

export async function editChatMessageAction(params: {
  messageId: string
  newMessage: string
  token?: string | null
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabase(params.token)
  if (!supabase) return { success: false, error: "Supabase belum terkonfigurasi" }

  try {
    const { error } = await supabase
      .from("chat_messages")
      .update({
        message: params.newMessage,
        is_edited: true,
        edited_at: new Date().toISOString(),
      })
      .eq("id", params.messageId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Gagal mengedit pesan" }
  }
}

export async function deleteChatMessageAction(params: {
  messageId: string
  deletedBy: "creator" | "admin"
  token?: string | null
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabase(params.token)
  if (!supabase) return { success: false, error: "Supabase belum terkonfigurasi" }

  try {
    const { error } = await supabase
      .from("chat_messages")
      .update({
        message: "[Pesan telah dihapus]",
        mentions: [],
        is_deleted: true,
        deleted_by: params.deletedBy,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", params.messageId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Gagal menghapus pesan" }
  }
}

export async function toggleChatReactionAction(params: {
  tempId?: string
  messageId: string
  emoji: string
  userId: string
  userName: string
  token?: string | null
}): Promise<{ success: boolean; action: "inserted" | "updated" | "deleted"; error?: string }> {
  const supabase = createServerSupabase(params.token)
  if (!supabase) {
    return { success: false, action: "deleted", error: "Supabase belum terkonfigurasi" }
  }

  try {
    // Periksa reaksi yang sudah ada dari user ini pada pesan terkait
    const { data: existing, error: findError } = await supabase
      .from("chat_reactions")
      .select("id, emoji")
      .eq("message_id", params.messageId)
      .eq("user_id", params.userId)
      .maybeSingle()

    if (findError) {
      return { success: false, action: "deleted", error: findError.message }
    }

    if (existing) {
      if (existing.emoji === params.emoji) {
        // Hapus reaksi (un-react)
        const { error: delError } = await supabase
          .from("chat_reactions")
          .delete()
          .eq("id", existing.id)

        if (delError) return { success: false, action: "deleted", error: delError.message }
        return { success: true, action: "deleted" }
      } else {
        // Ganti emoji reaksi
        const { error: updError } = await supabase
          .from("chat_reactions")
          .update({ emoji: params.emoji })
          .eq("id", existing.id)

        if (updError) return { success: false, action: "updated", error: updError.message }
        return { success: true, action: "updated" }
      }
    } else {
      // Tambah reaksi baru
      const { error: insError } = await supabase
        .from("chat_reactions")
        .insert({
          ...(params.tempId ? { id: params.tempId } : {}),
          message_id: params.messageId,
          emoji: params.emoji,
          user_id: params.userId,
          user_name: params.userName,
        })

      if (insError) return { success: false, action: "inserted", error: insError.message }
      return { success: true, action: "inserted" }
    }
  } catch (err: unknown) {
    return {
      success: false,
      action: "deleted",
      error: err instanceof Error ? err.message : "Gagal memproses reaksi",
    }
  }
}
