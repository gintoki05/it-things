"use server"

import { createServerSupabase } from "@/lib/server/supabase-server"

export interface ActiveDoodleRoom {
  roomCode: string
  hostName: string
  playerCount: number
  maxPlayers: number
  map: string
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
const ROOM_TTL_MS = 25 * 1000

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

  // 2. Fallback: Parse recent chat invitations from chat_messages (last 20 mins)
  try {
    const supabase = createServerSupabase(token)
    if (supabase) {
      const twentyMinsAgo = new Date(now - 20 * 60 * 1000).toISOString()
      const { data: messages } = await supabase
        .from("chat_messages")
        .select("message, user_name, created_at")
        .gte("created_at", twentyMinsAgo)
        .ilike("message", "%[DOODLE WAR 98]%")
        .order("created_at", { ascending: false })
        .limit(10)

      if (messages && messages.length > 0) {
        for (const msg of messages) {
          const match = msg.message?.match(/Kode:\s*\[([a-zA-Z0-9_-]+)\]/i)
          if (match && match[1]) {
            const code = match[1].trim().toUpperCase()
            if (!seenCodes.has(code)) {
              seenCodes.add(code)
              resultRooms.push({
                roomCode: code,
                hostName: msg.user_name || "Host",
                playerCount: 1,
                maxPlayers: 10,
                map: "district",
                createdAt: msg.created_at,
                updatedAt: new Date(msg.created_at).getTime(),
              })
            }
          }
        }
      }
    }
  } catch {
    // Non-fatal fallback
  }

  return { rooms: resultRooms }
}
