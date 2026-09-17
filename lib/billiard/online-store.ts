"use client"

import * as React from "react"
import { supabase } from "@/lib/supabase"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { BilliardRealtimeMessage } from "./types"

export interface ActiveBilliardRoom {
  roomCode: string
  hostName: string
  createdAt: string
  status: "waiting" | "in_game"
}

/**
 * Hook untuk Lobby: Menampilkan daftar room online yang sedang aktif & menunggu lawan
 */
export function useBilliardLobby(playerName: string) {
  const [activeRooms, setActiveRooms] = React.useState<ActiveBilliardRoom[]>([])
  const lobbyChannelRef = React.useRef<RealtimeChannel | null>(null)

  React.useEffect(() => {
    if (!supabase) return

    const channel = supabase.channel("billiard-lobby-channel", {
      config: { presence: { key: playerName } },
    })
    lobbyChannelRef.current = channel

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState()
        const rooms: ActiveBilliardRoom[] = []
        Object.values(state).forEach((presences) => {
          presences.forEach((p: any) => {
            if (p.roomCode && p.hostName) {
              rooms.push({
                roomCode: p.roomCode,
                hostName: p.hostName,
                createdAt: p.createdAt || new Date().toISOString(),
                status: p.status || "waiting",
              })
            }
          })
        })
        setActiveRooms(rooms)
      })
      .subscribe()

    return () => {
      if (lobbyChannelRef.current && supabase) {
        supabase.removeChannel(lobbyChannelRef.current)
        lobbyChannelRef.current = null
      }
    }
  }, [playerName])

  const announceRoom = React.useCallback(
    (roomCode: string, status: "waiting" | "in_game" = "waiting") => {
      if (lobbyChannelRef.current) {
        lobbyChannelRef.current.track({
          roomCode,
          hostName: playerName,
          status,
          createdAt: new Date().toISOString(),
        })
      }
    },
    [playerName]
  )

  const leaveLobbyAnnouncement = React.useCallback(() => {
    if (lobbyChannelRef.current) {
      lobbyChannelRef.current.untrack()
    }
  }, [])

  return {
    activeRooms,
    announceRoom,
    leaveLobbyAnnouncement,
  }
}

export interface UseBilliardOnlineProps {
  roomCode: string | null
  playerName: string
  onMessageReceived: (message: BilliardRealtimeMessage) => void
  onOpponentDisconnected?: (opponentName?: string) => void
}

/**
 * Hook untuk Gameplay Room: Mengirim pukulan dan sinkronisasi status antar dua pemain
 */
export function useBilliardOnline({
  roomCode,
  playerName,
  onMessageReceived,
  onOpponentDisconnected,
}: UseBilliardOnlineProps) {
  const channelRef = React.useRef<RealtimeChannel | null>(null)
  const [isConnected, setIsConnected] = React.useState(false)
  const [opponentName, setOpponentName] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!roomCode || !supabase) {
      setIsConnected(false)
      setOpponentName(null)
      return
    }

    const channelName = `billiard-room-${roomCode.toUpperCase()}`
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: playerName },
      },
    })

    channelRef.current = channel

    // Handle broadcast events
    channel
      .on("broadcast", { event: "billiard_event" }, ({ payload }) => {
        if (payload) {
          const msg = payload as BilliardRealtimeMessage
          if (msg.type === "player_joined") {
            setOpponentName(msg.playerName)
          }
          onMessageReceived(msg)
        }
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState()
        const keys = Object.keys(state)
        const otherPlayer = keys.find((k) => k !== playerName)
        if (otherPlayer) {
          setOpponentName(otherPlayer)
        }
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        if (key && key !== playerName) {
          onOpponentDisconnected?.(key)
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true)
          channel.track({
            name: playerName,
            onlineAt: new Date().toISOString(),
          })
          // Broadcast pengumuman agar pemain lawan mengetahui nama kita
          channel.send({
            type: "broadcast",
            event: "billiard_event",
            payload: {
              type: "player_joined",
              playerId: "player2",
              playerName,
            } satisfies BilliardRealtimeMessage,
          })
        } else {
          setIsConnected(false)
        }
      })

    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsConnected(false)
      setOpponentName(null)
    }
  }, [roomCode, playerName, onMessageReceived])

  const sendEvent = React.useCallback(
    (message: BilliardRealtimeMessage) => {
      if (channelRef.current && isConnected) {
        channelRef.current.send({
          type: "broadcast",
          event: "billiard_event",
          payload: message,
        })
      }
    },
    [isConnected]
  )

  return {
    isConnected,
    opponentName,
    sendEvent,
  }
}
