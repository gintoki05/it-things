"use server"

import { createServerSupabase } from "@/lib/server/supabase-server"

export interface DbPomodoroSession {
  id: string
  user_id: string
  user_name: string
  user_avatar: string | null
  mode: "focus" | "short_break" | "long_break"
  duration_minutes: number
  completed_at: string
  created_at: string
}

export async function savePomodoroSessionAction(params: {
  userId: string
  userName: string
  userAvatar?: string | null
  mode: "focus" | "short_break" | "long_break"
  durationMinutes: number
  completedAt?: string
  token?: string | null
}): Promise<{ data?: DbPomodoroSession; error?: string }> {
  const supabase = createServerSupabase(params.token)
  if (!supabase) return { error: "Supabase not configured" }

  try {
    const row = {
      user_id: params.userId,
      user_name: params.userName,
      user_avatar: params.userAvatar || null,
      mode: params.mode,
      duration_minutes: params.durationMinutes,
      completed_at: params.completedAt || new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from("pomodoro_sessions")
      .insert(row)
      .select()
      .single()

    if (error) {
      console.warn("Failed to save pomodoro session:", error.message)
      return { error: error.message }
    }

    return { data: data as DbPomodoroSession }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Error saving pomodoro session" }
  }
}

export async function fetchUserPomodoroSessionsAction(params: {
  userId?: string
  limit?: number
  token?: string | null
}): Promise<{ data: DbPomodoroSession[]; error?: string }> {
  const supabase = createServerSupabase(params.token)
  if (!supabase) return { data: [], error: "Supabase not configured" }

  try {
    let query = supabase
      .from("pomodoro_sessions")
      .select("*")
      .order("completed_at", { ascending: false })
      .limit(params.limit || 50)

    if (params.userId) {
      query = query.eq("user_id", params.userId)
    }

    const { data, error } = await query

    if (error) {
      console.warn("Failed to fetch pomodoro sessions:", error.message)
      return { data: [], error: error.message }
    }

    return { data: (data as DbPomodoroSession[]) || [] }
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : "Error fetching pomodoro sessions" }
  }
}

export async function clearUserPomodoroSessionsAction(params: {
  userId: string
  token?: string | null
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabase(params.token)
  if (!supabase) return { success: false, error: "Supabase not configured" }

  try {
    const { error } = await supabase
      .from("pomodoro_sessions")
      .delete()
      .eq("user_id", params.userId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error clearing sessions" }
  }
}
