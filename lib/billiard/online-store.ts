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
  isHost?: boolean
  onMessageReceived: (message: BilliardRealtimeMessage) => void
  onOpponentDisconnected?: (opponentName?: string) => void
  onRoomFull?: (message: string) => void
}

/**
 * Hook untuk Gameplay Room: Mengirim pukulan dan sinkronisasi status antar dua pemain
 */
export function useBilliardOnline({
  roomCode,
  playerName,
  isHost = false,
  onMessageReceived,
  onOpponentDisconnected,
  onRoomFull,
}: UseBilliardOnlineProps) {
  const channelRef = React.useRef<RealtimeChannel | null>(null)
  const [isConnected, setIsConnected] = React.useState(false)
  const [opponentName, setOpponentName] = React.useState<string | null>(null)
  const lockedOpponentRef = React.useRef<string | null>(null)

  // Simpan callback dalam ref agar useEffect channel tidak ter-trigger ulang saat callback berubah
  const onMessageReceivedRef = React.useRef(onMessageReceived)
  onMessageReceivedRef.current = onMessageReceived

  const onOpponentDisconnectedRef = React.useRef(onOpponentDisconnected)
  onOpponentDisconnectedRef.current = onOpponentDisconnected

  const onRoomFullRef = React.useRef(onRoomFull)
  onRoomFullRef.current = onRoomFull

  React.useEffect(() => {
    if (!roomCode || !supabase) {
      setIsConnected(false)
      setOpponentName(null)
      lockedOpponentRef.current = null
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

          if (msg.type === "room_full") {
            // User ini ditolak karena room sudah ada 2 orang
            if (!isHost) {
              onRoomFullRef.current?.(
                msg.message || "Room sudah penuh! Pertandingan sedang berlangsung (2/2 pemain)."
              )
              return
            }
          }

          if (msg.type === "player_joined") {
            if (isHost) {
              // Jika host sudah memiliki lawan aktif yang berbeda, tolak pemain ke-3!
              if (
                lockedOpponentRef.current &&
                lockedOpponentRef.current !== msg.playerName
              ) {
                channel.send({
                  type: "broadcast",
                  event: "billiard_event",
                  payload: {
                    type: "room_full",
                    roomCode,
                    message: "Room sudah penuh! Pertandingan sedang berlangsung (Maksimal 2 Pemain).",
                  } satisfies BilliardRealtimeMessage,
                })
                return
              }
              lockedOpponentRef.current = msg.playerName
            }
            setOpponentName(msg.playerName)
          }

          onMessageReceivedRef.current(msg)
        }
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState()
        const keys = Object.keys(state)

        // Jika bukan host dan room sudah berisi > 2 orang (dan kita orang ke-3), tolak
        if (!isHost && keys.length > 2) {
          const sortedKeys = [...keys].sort()
          const myIndex = sortedKeys.indexOf(playerName)
          if (myIndex >= 2) {
            onRoomFullRef.current?.("Room sudah penuh (Maksimal 2 Pemain)!")
            return
          }
        }

        const otherPlayer = keys.find((k) => k !== playerName)
        if (otherPlayer) {
          if (isHost) {
            if (!lockedOpponentRef.current) {
              lockedOpponentRef.current = otherPlayer
            }
          }
          setOpponentName(otherPlayer)
        }
      })
      .on("presence", { event: "join" }, ({ key }) => {
        if (key && key !== playerName) {
          if (isHost) {
            if (!lockedOpponentRef.current) {
              lockedOpponentRef.current = key
            } else if (lockedOpponentRef.current !== key) {
              // Pemain ke-3 masuk, tolak segera!
              channel.send({
                type: "broadcast",
                event: "billiard_event",
                payload: {
                  type: "room_full",
                  roomCode,
                  message: "Room sudah penuh! Pertandingan sedang berlangsung (Maksimal 2 Pemain).",
                } satisfies BilliardRealtimeMessage,
              })
              return
            }
          }
          setOpponentName(key)
        }
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        if (key && key !== playerName) {
          if (isHost && lockedOpponentRef.current === key) {
            lockedOpponentRef.current = null
          }
          onOpponentDisconnectedRef.current?.(key)
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
              playerId: isHost ? "player1" : "player2",
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
      lockedOpponentRef.current = null
    }
  }, [roomCode, playerName, isHost])

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
