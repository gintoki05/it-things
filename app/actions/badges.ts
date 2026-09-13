"use server"

import { createServerSupabase } from "@/lib/server/supabase-server"

export interface NotificationBadgesResult {
  votes: number
  pantry: number
  splitBills: number
  paintWar: number
}

export async function fetchNotificationBadgesAction(
  token?: string | null
): Promise<NotificationBadgesResult> {
  const supabase = createServerSupabase(token)
  if (!supabase) {
    return { votes: 0, pantry: 0, splitBills: 0, paintWar: 0 }
  }

  const nowIso = new Date().toISOString()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  try {
    const [votesRes, pantryRes, splitRes, paintRes] = await Promise.all([
      supabase
        .from("vote_groups")
        .select("id", { count: "exact", head: true })
        .eq("is_closed", false)
        .gt("expires_at", nowIso),
      supabase
        .from("pantry_items")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("split_bills")
        .select("id", { count: "exact", head: true })
        .eq("is_settled", false)
        .gte("created_at", sevenDaysAgo),
      supabase
        .from("paint_war_players")
        .select("id", { count: "exact", head: true })
        .eq("is_online", true)
        .gte("last_seen", fiveMinAgo),
    ])

    return {
      votes: votesRes.count ?? 0,
      pantry: pantryRes.count ?? 0,
      splitBills: splitRes.count ?? 0,
      paintWar: paintRes.count ?? 0,
    }
  } catch (err) {
    console.warn("fetchNotificationBadgesAction error:", err)
    return { votes: 0, pantry: 0, splitBills: 0, paintWar: 0 }
  }
}

export async function fetchActiveVoteCountAction(token?: string | null): Promise<number> {
  const supabase = createServerSupabase(token)
  if (!supabase) return 0
  const nowIso = new Date().toISOString()
  const { count } = await supabase
    .from("vote_groups")
    .select("id", { count: "exact", head: true })
    .eq("is_closed", false)
    .gt("expires_at", nowIso)
  return count ?? 0
}

export async function fetchActivePantryCountAction(token?: string | null): Promise<number> {
  const supabase = createServerSupabase(token)
  if (!supabase) return 0
  const { count } = await supabase
    .from("pantry_items")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
  return count ?? 0
}

export async function fetchActiveSplitBillCountAction(token?: string | null): Promise<number> {
  const supabase = createServerSupabase(token)
  if (!supabase) return 0
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from("split_bills")
    .select("id", { count: "exact", head: true })
    .eq("is_settled", false)
    .gte("created_at", sevenDaysAgo)
  return count ?? 0
}

export async function fetchActivePaintWarCountAction(token?: string | null): Promise<number> {
  const supabase = createServerSupabase(token)
  if (!supabase) return 0
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from("paint_war_players")
    .select("id", { count: "exact", head: true })
    .eq("is_online", true)
    .gte("last_seen", fiveMinAgo)
  return count ?? 0
}
