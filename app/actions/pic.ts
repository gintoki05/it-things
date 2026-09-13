"use server"

import { createServerSupabase } from "@/lib/server/supabase-server"
import type { Database } from "@/lib/database.types"

export type DbModulePic = Database["public"]["Tables"]["module_pics"]["Row"]

export async function fetchModulePicsAction(
  token?: string | null
): Promise<{ data: DbModulePic[]; error?: string }> {
  const supabase = createServerSupabase(token)
  if (!supabase) return { data: [], error: "Supabase not configured" }

  try {
    const { data, error } = await supabase
      .from("module_pics")
      .select("*")
      .order("updated_at", { ascending: true })

    if (error) return { data: [], error: error.message }
    return { data: data || [] }
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : "Error fetching pics" }
  }
}

export async function assignModulePicAction(params: {
  module: string
  targetUserId: string
  targetUserName: string
  targetUserAvatar?: string | null
  assignedById: string
  assignedByName: string
  token?: string | null
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabase(params.token)
  if (!supabase) return { success: false, error: "Supabase not configured" }

  try {
    const { error } = await supabase.from("module_pics").upsert(
      {
        module: params.module,
        user_id: params.targetUserId,
        user_name: params.targetUserName,
        user_avatar: params.targetUserAvatar || "👤",
        assigned_by_id: params.assignedById,
        assigned_by_name: params.assignedByName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "module,user_id" }
    )

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error assigning pic" }
  }
}

export async function removeModulePicAction(params: {
  module: string
  targetUserId: string
  token?: string | null
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabase(params.token)
  if (!supabase) return { success: false, error: "Supabase not configured" }

  try {
    const { error } = await supabase
      .from("module_pics")
      .delete()
      .eq("module", params.module)
      .eq("user_id", params.targetUserId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error removing pic" }
  }
}
