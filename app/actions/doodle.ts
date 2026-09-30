"use server"

import { createServerSupabase } from "@/lib/server/supabase-server"

export interface ActiveDoodleRoom {
  roomCode: string
  hostName: string
  playerCount: number
  maxPlayers: number
  map: string
  gameMode?: string
  createdAt: string
  updatedAt?: number
}

// Global in-memory cache on the Node.js server instance
interface RoomMemoryEntry extends ActiveDoodleRoom {
  lastHeartbeat: number
}

declare global {
  // eslint-disable-next-line no-var
  var __doodleActiveRoomsMemory: Map<string, RoomMemoryEntry> | undefined
}

if (!globalThis.__doodleActiveRoomsMemory) {
  globalThis.__doodleActiveRoomsMemory = new Map<string, RoomMemoryEntry>()
}

const memoryRooms = globalThis.__doodleActiveRoomsMemory

// TTL: 25 seconds without heartbeat before a room is automatically considered dead
const ROOM_TTL_MS = 35 * 1000

export async function registerDoodleRoomAction(
  room: ActiveDoodleRoom
): Promise<{ success: boolean }> {
  try {
    const code = room.roomCode.trim().toUpperCase()
    memoryRooms.set(code, {
      ...room,
      roomCode: code,
      createdAt: room.createdAt || new Date().toISOString(),
      lastHeartbeat: Date.now(),
    })
    return { success: true }
  } catch {
    return { success: false }
  }
}

export async function heartbeatDoodleRoomAction(
  roomCode: string,
  playerCount?: number
): Promise<{ success: boolean }> {
  try {
    const code = roomCode.trim().toUpperCase()
    const existing = memoryRooms.get(code)
    if (existing) {
      existing.lastHeartbeat = Date.now()
      if (typeof playerCount === "number") {
        existing.playerCount = playerCount
      }
      memoryRooms.set(code, existing)
    }
    return { success: true }
  } catch {
    return { success: false }
  }
}

export async function unregisterDoodleRoomAction(
  roomCode: string
): Promise<{ success: boolean }> {
  try {
    const code = roomCode.trim().toUpperCase()
    memoryRooms.delete(code)
    return { success: true }
  } catch {
    return { success: false }
  }
}

export async function fetchActiveDoodleRoomsAction(
  token?: string | null
): Promise<{ rooms: ActiveDoodleRoom[] }> {
  const now = Date.now()
  const resultRooms: ActiveDoodleRoom[] = []
  const seenCodes = new Set<string>()

  // 1. Gather live rooms from server in-memory cache
  for (const [code, entry] of Array.from(memoryRooms.entries())) {
    if (now - entry.lastHeartbeat < ROOM_TTL_MS) {
      seenCodes.add(code)
      resultRooms.push({
        roomCode: entry.roomCode,
        hostName: entry.hostName,
        playerCount: entry.playerCount,
        maxPlayers: entry.maxPlayers,
        map: entry.map,
        createdAt: entry.createdAt,
        updatedAt: entry.lastHeartbeat,
      })
    } else {
      // Clean up dead room
      memoryRooms.delete(code)
    }
  }

  return { rooms: resultRooms }
}

// ========================================================
// DOODLE WAVE SOLO LEADERBOARD ACTIONS
// ========================================================

export interface DoodleLeaderboardEntry {
  userId: string
  userName: string
  userAvatar?: string | null
  highestWave: number
  highestScore: number
  totalKills: number
  totalHeadshots: number
  gamesPlayed: number
  updatedAt: string
}

export interface DoodleLeaderboardResult {
  entries: DoodleLeaderboardEntry[]
  myStats?: DoodleLeaderboardEntry | null
  error?: string
}

function getDatabaseErrorMessage(code?: string): string {
  if (["PGRST205", "PGRST204", "42P01"].includes(code ?? "")) {
    return "Tabel klasemen belum dimigrasi di Supabase."
  }
  return "Gagal memuat klasemen Doodle Shooter."
}

export async function fetchDoodleLeaderboardAction(
  token?: string | null
): Promise<DoodleLeaderboardResult> {
  const empty: DoodleLeaderboardResult = { entries: [] }

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
      .from("doodle_leaderboard")
      .select(
        "user_id, user_name, user_avatar, highest_wave, highest_score, total_kills, total_headshots, games_played, updated_at"
      )
      .order("highest_wave", { ascending: false })
      .order("highest_score", { ascending: false })
      .order("total_kills", { ascending: false })
      .limit(50)

    if (error) {
      return { ...empty, error: getDatabaseErrorMessage(error.code) }
    }

    const entries: DoodleLeaderboardEntry[] = (data ?? []).map((row: any) => ({
      userId: row.user_id,
      userName: row.user_name || "Doodler",
      userAvatar: row.user_avatar || null,
      highestWave: row.highest_wave || 1,
      highestScore: row.highest_score || 0,
      totalKills: row.total_kills || 0,
      totalHeadshots: row.total_headshots || 0,
      gamesPlayed: row.games_played || 0,
      updatedAt: row.updated_at || new Date().toISOString(),
    }))

    const myStats = currentUserId
      ? entries.find((e) => e.userId === currentUserId) || null
      : null

    return { entries, myStats }
  } catch {
    return { ...empty, error: getDatabaseErrorMessage() }
  }
}

export async function submitDoodleSoloScoreAction(
  token: string | null,
  params: {
    wave: number
    score: number
    kills: number
    headshots?: number
    nickname?: string
  }
): Promise<{ success: boolean; myStats?: DoodleLeaderboardEntry | null; error?: string }> {
  try {
    const db = createServerSupabase(token)
    if (!db) return { success: false, error: "Database tidak tersedia." }

    let userId: string = "guest"
    let userName: string = params.nickname || "Doodler"
    let userAvatar: string | null = null

    if (token) {
      const {
        data: { user },
      } = await db.auth.getUser(token)
      if (user) {
        userId = user.id
        userName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          params.nickname ||
          "Doodler"
        userAvatar = user.user_metadata?.avatar_url || null
      }
    }

    // Ambil data existing user jika ada
    const { data: existing, error: selectErr } = await (db as any)
      .from("doodle_leaderboard")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    if (selectErr && !["PGRST116"].includes(selectErr.code)) {
      return { success: false, error: getDatabaseErrorMessage(selectErr.code) }
    }

    const highestWave = Math.max(Number(existing?.highest_wave) || 0, Math.max(1, params.wave || 1))
    const highestScore = Math.max(Number(existing?.highest_score) || 0, Math.max(0, params.score || 0))
    const totalKills = (Number(existing?.total_kills) || 0) + Math.max(0, params.kills || 0)
    const totalHeadshots = (Number(existing?.total_headshots) || 0) + Math.max(0, params.headshots || 0)
    const gamesPlayed = (Number(existing?.games_played) || 0) + 1
    const updatedAt = new Date().toISOString()

    const payload = {
      user_id: userId,
      user_name: userName.slice(0, 80),
      user_avatar: userAvatar,
      highest_wave: highestWave,
      highest_score: highestScore,
      total_kills: totalKills,
      total_headshots: totalHeadshots,
      games_played: gamesPlayed,
      updated_at: updatedAt,
    }

    const { error: upsertErr } = await (db as any)
      .from("doodle_leaderboard")
      .upsert(payload, { onConflict: "user_id" })

    if (upsertErr) {
      return { success: false, error: getDatabaseErrorMessage(upsertErr.code) }
    }

    return {
      success: true,
      myStats: {
        userId,
        userName,
        userAvatar,
        highestWave,
        highestScore,
        totalKills,
        totalHeadshots,
        gamesPlayed,
        updatedAt,
      },
    }
  } catch {
    return { success: false, error: getDatabaseErrorMessage() }
  }
}

