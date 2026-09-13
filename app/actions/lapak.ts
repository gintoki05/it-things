"use server"

import { createServerSupabase } from "@/lib/server/supabase-server"
import type { Database } from "@/lib/database.types"

export type DbLapakItem = Database["public"]["Tables"]["lapak_items"]["Row"]

export async function fetchLapakItemsAction(
  token?: string | null
): Promise<{ data: DbLapakItem[]; error?: string }> {
  const supabase = createServerSupabase(token)
  if (!supabase) return { data: [], error: "Supabase not configured" }

  try {
    const { data, error } = await supabase
      .from("lapak_items")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) return { data: [], error: error.message }
    return { data: data || [] }
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : "Error fetching lapak" }
  }
}

export async function createLapakItemAction(
  payload: Database["public"]["Tables"]["lapak_items"]["Insert"],
  token?: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabase(token)
  if (!supabase) return { success: false, error: "Supabase not configured" }

  try {
    const { error } = await supabase.from("lapak_items").insert(payload)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error creating lapak item" }
  }
}

export async function updateLapakItemAction(
  id: string,
  payload: Database["public"]["Tables"]["lapak_items"]["Update"],
  token?: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabase(token)
  if (!supabase) return { success: false, error: "Supabase not configured" }

  try {
    const { error } = await supabase
      .from("lapak_items")
      .update(payload)
      .eq("id", id)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error updating lapak item" }
  }
}

export async function deleteLapakItemAction(
  id: string,
  token?: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabase(token)
  if (!supabase) return { success: false, error: "Supabase not configured" }

  try {
    const { error } = await supabase
      .from("lapak_items")
      .delete()
      .eq("id", id)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error deleting lapak item" }
  }
}
