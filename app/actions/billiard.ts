"use server"

import { createServerSupabase } from "@/lib/server/supabase-server"

export interface BilliardLeaderboardEntry {
  userId: string
  userName: string
  wins: number
  losses: number
  matchesPlayed: number
  ballsPocketed: number
  winStreak: number
  highestStreak: number
  ratingPoints: number
  winRate: number
  updatedAt: string
}

export interface BilliardLeaderboardResult {
  entries: BilliardLeaderboardEntry[]
  myStats?: BilliardLeaderboardEntry | null
  error?: string
}

function getDatabaseErrorMessage(code?: string): string {
  if (["PGRST205", "PGRST204", "42P01"].includes(code ?? "")) {
    return "Klasemen belum aktif: tabel Billiard belum dimigrasi."
  }
  return "Gagal memuat klasemen biliar. Silakan coba lagi."
}

export async function fetchBilliardLeaderboardAction(
  token?: string | null
): Promise<BilliardLeaderboardResult> {
  const empty: BilliardLeaderboardResult = { entries: [] }

  try {
    const db = createServerSupabase(token)
    if (!db) return { ...empty, error: "Database tidak tersedia." }

    let currentUserId: string | null = null
    if (token) {
      const {
        data: { user },
      } = await db.auth.getUser(token)
      if (user) currentUserId = user.id
    }

    const { data, error } = await (db as any)
      .from("billiard_leaderboard")
      .select(
        "user_id, user_name, wins, losses, matches_played, balls_pocketed, win_streak, highest_streak, rating_points, updated_at"
      )
      .order("wins", { ascending: false })
      .order("rating_points", { ascending: false })
      .order("balls_pocketed", { ascending: false })
      .limit(50)

    if (error) {
      return { ...empty, error: getDatabaseErrorMessage(error.code) }
    }

    const entries: BilliardLeaderboardEntry[] = (data ?? []).map((row: any) => {
      const matches = row.matches_played || 0
      const wins = row.wins || 0
      const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0

      return {
        userId: row.user_id,
        userName: row.user_name || "Pemain",
        wins,
        losses: row.losses || 0,
        matchesPlayed: matches,
        ballsPocketed: row.balls_pocketed || 0,
        winStreak: row.win_streak || 0,
        highestStreak: row.highest_streak || 0,
        ratingPoints: row.rating_points || 1000,
        winRate,
        updatedAt: row.updated_at || new Date().toISOString(),
      }
    })

    const myStats = currentUserId
      ? entries.find((e) => e.userId === currentUserId) || null
      : null

    return { entries, myStats }
  } catch {
    return { ...empty, error: getDatabaseErrorMessage() }
  }
}

export async function recordBilliardMatchAction(
  token: string | null,
  params: {
    won: boolean
    ballsPocketed: number
  }
): Promise<BilliardLeaderboardResult> {
  const empty: BilliardLeaderboardResult = { entries: [] }

  if (!token) {
    return { ...empty, error: "Login untuk mencatatkan rekor kemenangan ke klasemen tim." }
  }

  try {
    const db = createServerSupabase(token)
    if (!db) return { ...empty, error: "Database tidak tersedia." }

    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser(token)

    if (!user || authError) {
      return { ...empty, error: "Sesi login habis. Silakan login kembali." }
    }

    const rawName = user.user_metadata?.full_name ?? user.user_metadata?.name
    const name =
      typeof rawName === "string" && rawName.trim()
        ? rawName.trim().slice(0, 80)
        : "Pemain"

    // Fetch existing stats
    const { data: existing } = await (db as any)
      .from("billiard_leaderboard")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    const currentWins = existing?.wins || 0
    const currentLosses = existing?.losses || 0
    const currentMatches = existing?.matches_played || 0
    const currentBalls = existing?.balls_pocketed || 0
    const currentStreak = existing?.win_streak || 0
    const currentHighest = existing?.highest_streak || 0
    const currentRating = existing?.rating_points || 1000

    const newWins = params.won ? currentWins + 1 : currentWins
    const newLosses = params.won ? currentLosses : currentLosses + 1
    const newMatches = currentMatches + 1
    const newBalls = currentBalls + Math.max(0, Math.min(15, params.ballsPocketed))
    const newStreak = params.won ? currentStreak + 1 : 0
    const newHighest = Math.max(currentHighest, newStreak)
    const newRating = params.won
      ? currentRating + 25
      : Math.max(700, currentRating - 15)

    const payload = {
      user_id: user.id,
      user_name: name,
      wins: newWins,
      losses: newLosses,
      matches_played: newMatches,
      balls_pocketed: newBalls,
      win_streak: newStreak,
      highest_streak: newHighest,
      rating_points: newRating,
      updated_at: new Date().toISOString(),
    }

    const { error: upsertError } = await (db as any)
      .from("billiard_leaderboard")
      .upsert(payload, { onConflict: "user_id" })

    if (upsertError) {
      return { ...empty, error: getDatabaseErrorMessage(upsertError.code) }
    }

    return fetchBilliardLeaderboardAction(token)
  } catch {
    return { ...empty, error: getDatabaseErrorMessage() }
  }
}
