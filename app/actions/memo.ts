"use server"

import { createServerSupabase } from "@/lib/server/supabase-server"
import type { Database } from "@/lib/database.types"

export type DbDesktopMemo = Database["public"]["Tables"]["desktop_memos"]["Row"]

export async function fetchDesktopMemoAction(
  token?: string | null
): Promise<{ data: DbDesktopMemo | null; error?: string }> {
  const supabase = createServerSupabase(token)
  if (!supabase) return { data: null, error: "Supabase not configured" }

  try {
    const { data, error } = await supabase
      .from("desktop_memos")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return { data: null, error: error.message }
    return { data }
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : "Error fetching memo" }
  }
}

export async function saveDesktopMemoAction(params: {
  id?: string
  title: string
  content: string
  updatedById: string
  updatedByName: string
  updatedByAvatar?: string | null
  token?: string | null
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabase(params.token)
  if (!supabase) return { success: false, error: "Supabase not configured" }

  try {
    const row = {
      id: params.id || "00000000-0000-0000-0000-000000000001",
      title: params.title,
      content: params.content,
      updated_by_id: params.updatedById,
      updated_by_name: params.updatedByName,
      updated_by_avatar: params.updatedByAvatar || null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from("desktop_memos").upsert(row)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error saving memo" }
  }
}
