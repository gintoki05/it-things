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
