"use server"

import { createServerSupabase } from "@/lib/server/supabase-server"
import { isValidTowerScore, towerDate } from "@/lib/tower/leaderboard"
import type { TowerEntry } from "@/lib/tower/leaderboard"

export interface TowerLeaderboardResult { entries: TowerEntry[]; date: string; error?: string }

function databaseMessage(code?: string) {
  return ["PGRST205", "PGRST204", "42P01"].includes(code ?? "")
    ? "Klasemen belum aktif: tabel Tower belum dimigrasi. Rekor perangkat tetap tersimpan."
    : "Klasemen belum bisa diakses. Coba lagi sebentar."
}

export async function fetchTowerLeaderboardAction(token?: string | null): Promise<TowerLeaderboardResult> {
  const date = towerDate()
  const empty = { entries: [], date }
  try {
    const db = createServerSupabase(token)
    if (!db || !token) return { ...empty, error: "Login untuk melihat klasemen tim." }
    const { data: { user }, error: authError } = await db.auth.getUser(token)
    if (!user || authError) return { ...empty, error: "Sesi login habis. Login lagi untuk membuka klasemen." }
    const { data, error } = await db.from("tower_daily_scores")
      .select("user_id,user_name,score,floors")
      .eq("target_date", date)
      .order("score", { ascending: false })
      .order("achieved_at", { ascending: true })
      .order("user_id", { ascending: true })
      .limit(20)
    if (error) return { ...empty, error: databaseMessage(error.code) }
    return { date, entries: (data ?? []).map(row => ({ userId: row.user_id, name: row.user_name, score: row.score, floors: row.floors })) }
  } catch { return { ...empty, error: databaseMessage() } }
}

export async function submitTowerScoreAction(token: string | null, score: number, floors: number): Promise<TowerLeaderboardResult> {
  const date = towerDate()
  const empty = { entries: [], date }
  if (!isValidTowerScore(score, floors)) return { ...empty, error: "Skor tidak valid. Mainkan satu sesi baru." }
  try {
    const db = createServerSupabase(token)
    if (!db || !token) return { ...empty, error: "Login untuk menyimpan skor ke klasemen." }
    const { data: { user }, error: authError } = await db.auth.getUser(token)
    if (!user || authError) return { ...empty, error: "Sesi login habis. Login lagi lalu coba simpan ulang." }
    // Display metadata is not used for authorization. Never accept a client user ID.
    const rawName = user.user_metadata?.full_name ?? user.user_metadata?.name
    const name = typeof rawName === "string" && rawName.trim() ? rawName.trim().slice(0, 80) : "Pemain"
    const row = { user_id: user.id, user_name: name, target_date: date, score, floors, achieved_at: new Date().toISOString() }
    const { error: insertError } = await db.from("tower_daily_scores").insert(row)
    if (insertError && insertError.code !== "23505") return { ...empty, error: databaseMessage(insertError.code) }
    if (insertError) {
      // The conditional update makes concurrent submissions monotonic: a lower
      // score can never overwrite a higher score from a different browser tab.
      const { error } = await db.from("tower_daily_scores").update({ score, floors, user_name: name, achieved_at: row.achieved_at })
        .eq("user_id", user.id).eq("target_date", date).lt("score", score)
      if (error) return { ...empty, error: databaseMessage(error.code) }
    }
    return fetchTowerLeaderboardAction(token)
  } catch { return { ...empty, error: databaseMessage() } }
}
