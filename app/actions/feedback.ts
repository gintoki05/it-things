"use server"

import { createServerSupabase } from "@/lib/server/supabase-server"
import type { Database } from "@/lib/database.types"

export type FeedbackCategory = "bug" | "feature" | "suggestion"
export type FeedbackUrgency = "low" | "normal" | "urgent"
export type FeedbackStatus = "new" | "in_review" | "in_progress" | "resolved" | "closed"

export interface FeedbackItem {
  id: string
  title: string
  description: string
  category: FeedbackCategory
  urgency: FeedbackUrgency
  status: FeedbackStatus
  isAnonymous: boolean
  createdById: string
  createdByName: string
  createdByAvatar: string | null
  adminNote: string | null
  upvoteCount: number
  hasUpvoted: boolean
  createdAt: string
  updatedAt: string
}

export async function fetchFeedbacksAction(params: {
  category?: string
  status?: string
  sortBy?: "top" | "newest" | "status"
  currentUserId?: string | null
  token?: string | null
}): Promise<{ data: FeedbackItem[]; error?: string }> {
  const supabase = createServerSupabase(params.token)
  if (!supabase) return { data: [], error: "Supabase not configured" }

  try {
    let query = supabase.from("feedbacks").select("*")

    if (params.category && params.category !== "all") {
      query = query.eq("category", params.category as FeedbackCategory)
    }

    if (params.status && params.status !== "all") {
      query = query.eq("status", params.status as FeedbackStatus)
    }

    if (params.sortBy === "top") {
      query = query.order("upvote_count", { ascending: false }).order("created_at", { ascending: false })
    } else if (params.sortBy === "status") {
      query = query.order("status", { ascending: true }).order("created_at", { ascending: false })
    } else {
      query = query.order("created_at", { ascending: false })
    }

    const { data, error } = await query

    if (error) return { data: [], error: error.message }
    if (!data || data.length === 0) return { data: [] }

    // Fetch user's upvotes if currentUserId is provided
    let userUpvotedSet = new Set<string>()
    if (params.currentUserId) {
      const feedbackIds = data.map((item) => item.id)
      const { data: upvotes } = await supabase
        .from("feedback_upvotes")
        .select("feedback_id")
        .eq("user_id", params.currentUserId)
        .in("feedback_id", feedbackIds)

      if (upvotes) {
        userUpvotedSet = new Set(upvotes.map((u) => u.feedback_id))
      }
    }

    // Sanitize anonymous feedback
    const mapped: FeedbackItem[] = data.map((item) => {
      const isAnon = item.is_anonymous
      const isSelf = Boolean(params.currentUserId && params.currentUserId === item.created_by_id)

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        category: item.category,
        urgency: item.urgency,
        status: item.status,
        isAnonymous: isAnon,
        // Redact user ID if anonymous and not current user
        createdById: isAnon && !isSelf ? "anonymous" : item.created_by_id,
        createdByName: isAnon ? "Rekan IT (Anonim)" : item.created_by_name,
        createdByAvatar: isAnon ? null : item.created_by_avatar,
        adminNote: item.admin_note,
        upvoteCount: item.upvote_count ?? 0,
        hasUpvoted: userUpvotedSet.has(item.id),
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }
    })

    return { data: mapped }
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : "Gagal memuat daftar feedback" }
  }
}

export async function createFeedbackAction(params: {
  title: string
  description: string
  category: FeedbackCategory
  urgency: FeedbackUrgency
  isAnonymous: boolean
  userId: string
  userName: string
  userAvatar?: string | null
  token?: string | null
}): Promise<{ success: boolean; data?: FeedbackItem; error?: string }> {
  const supabase = createServerSupabase(params.token)
  if (!supabase) return { success: false, error: "Supabase not configured" }

  const trimmedTitle = params.title.trim()
  const trimmedDesc = params.description.trim()

  if (!trimmedTitle || !trimmedDesc) {
    return { success: false, error: "Judul dan deskripsi tidak boleh kosong" }
  }

  try {
    const row = {
      title: trimmedTitle,
      description: trimmedDesc,
      category: params.category,
      urgency: params.urgency,
      status: "new" as FeedbackStatus,
      is_anonymous: params.isAnonymous,
      created_by_id: params.userId,
      created_by_name: params.isAnonymous ? "Rekan IT (Anonim)" : params.userName,
      created_by_avatar: params.isAnonymous ? null : params.userAvatar || null,
      admin_note: null,
      upvote_count: 0,
    }

    const { data, error } = await supabase.from("feedbacks").insert(row).select().single()

    if (error) return { success: false, error: error.message }

    const created: FeedbackItem = {
      id: data.id,
      title: data.title,
      description: data.description,
      category: data.category,
      urgency: data.urgency,
      status: data.status,
      isAnonymous: data.is_anonymous,
      createdById: data.is_anonymous ? "anonymous" : data.created_by_id,
      createdByName: data.created_by_name,
      createdByAvatar: data.created_by_avatar,
      adminNote: data.admin_note,
      upvoteCount: 0,
      hasUpvoted: false,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }

    return { success: true, data: created }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Gagal mengirim feedback" }
  }
}

export async function toggleFeedbackUpvoteAction(params: {
  feedbackId: string
  userId: string
  token?: string | null
}): Promise<{ success: boolean; hasUpvoted?: boolean; error?: string }> {
  const supabase = createServerSupabase(params.token)
  if (!supabase) return { success: false, error: "Supabase not configured" }

  try {
    // Check if already upvoted
    const { data: existing } = await supabase
      .from("feedback_upvotes")
      .select("id")
      .eq("feedback_id", params.feedbackId)
      .eq("user_id", params.userId)
      .maybeSingle()

    if (existing) {
      // Remove upvote
      const { error: delErr } = await supabase
        .from("feedback_upvotes")
        .delete()
        .eq("id", existing.id)

      if (delErr) return { success: false, error: delErr.message }
      return { success: true, hasUpvoted: false }
    } else {
      // Insert upvote
      const { error: insErr } = await supabase.from("feedback_upvotes").insert({
        feedback_id: params.feedbackId,
        user_id: params.userId,
      })

      if (insErr) return { success: false, error: insErr.message }
      return { success: true, hasUpvoted: true }
    }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Gagal melakukan upvote" }
  }
}

export async function updateFeedbackStatusAction(params: {
  feedbackId: string
  status: FeedbackStatus
  adminNote?: string | null
  token?: string | null
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabase(params.token)
  if (!supabase) return { success: false, error: "Supabase not configured" }

  try {
    const updatePayload: { status: FeedbackStatus; admin_note?: string | null; updated_at: string } = {
      status: params.status,
      updated_at: new Date().toISOString(),
    }
    if (params.adminNote !== undefined) {
      updatePayload.admin_note = params.adminNote ? params.adminNote.trim() : null
    }

    const { error } = await supabase
      .from("feedbacks")
      .update(updatePayload)
      .eq("id", params.feedbackId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Gagal memperbarui status feedback" }
  }
}

export async function deleteFeedbackAction(params: {
  feedbackId: string
  userId: string
  isAdmin?: boolean
  token?: string | null
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabase(params.token)
  if (!supabase) return { success: false, error: "Supabase not configured" }

  try {
    let query = supabase.from("feedbacks").delete().eq("id", params.feedbackId)

    // Non-admin can only delete their own
    if (!params.isAdmin) {
      query = query.eq("created_by_id", params.userId)
    }

    const { error } = await query
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Gagal menghapus feedback" }
  }
}
