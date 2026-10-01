"use client"

import * as React from "react"
import { DoodleBroadcastQueue } from "@/lib/doodle-broadcast-queue"
import { RetroActionButton } from "@/components/ui/retro-action-button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { announceGameRoomAction } from "@/app/actions/chat"
import {
  registerDoodleRoomAction,
  unregisterDoodleRoomAction,
  heartbeatDoodleRoomAction,
  fetchActiveDoodleRoomsAction,
  submitDoodleSoloScoreAction,
  type ActiveDoodleRoom,
} from "@/app/actions/doodle"
import { DoodleLeaderboard } from "@/components/apps/doodle/doodle-leaderboard"
import {
  DoodleSkinCustomizer,
  type DoodleCustomSkin,
} from "@/components/apps/doodle/doodle-skin-customizer"
import { playRetroNotificationSound } from "@/lib/sound-effects"
import { Maximize2, Minimize2, RotateCw, Share2, Copy, Check, Gamepad2, Palette, Users, Wifi, Trophy, Sparkles } from "lucide-react"

const INK_OPTIONS = [
  { id: 0, name: "Pulpen Biru", hex: "#1a31c2" },
  { id: 1, name: "Pulpen Merah", hex: "#dc1f33" },
  { id: 2, name: "Spidol Hitam", hex: "#2e3342" },
  { id: 3, name: "Stabilo Oranye", hex: "#eb8c14" },
  { id: 4, name: "Stabilo Hijau", hex: "#1f994d" },
  { id: 5, name: "Stabilo Pink", hex: "#e666a8" },
]

export function DoodleApp() {
  const { user } = useAuth()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  const [isFullscreen, setIsFullscreen] = React.useState<boolean>(false)
  const [showRestartConfirm, setShowRestartConfirm] = React.useState<boolean>(false)
  const [showLeaderboard, setShowLeaderboard] = React.useState<boolean>(false)
  const [showSkinCustomizer, setShowSkinCustomizer] = React.useState<boolean>(false)
  const [key, setKey] = React.useState<number>(0)
  const [selectedInk, setSelectedInk] = React.useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("doodle_ink")
      if (saved != null && !isNaN(Number(saved))) {
        return Math.max(0, Math.min(5, Number(saved)))
      }
    }
    return 0
  })

  // Multiplayer room state
  const [currentLobbyCode, setCurrentLobbyCode] = React.useState<string | null>(null)
  const [subscribedRoom, setSubscribedRoom] = React.useState<string | null>(null)
  const roomChannelRef = React.useRef<RealtimeChannel | null>(null)
  const roomChannelReadyRef = React.useRef<boolean>(false)
  const roomBroadcastQueueRef = React.useRef(new DoodleBroadcastQueue())
  const roomPlayerCountRef = React.useRef(4)
  const lastBroadcastTimeRef = React.useRef<Map<string, number>>(new Map())
  const [isSharing, setIsSharing] = React.useState<boolean>(false)
  const [notificationMsg, setNotificationMsg] = React.useState<string | null>(null)
  const [isCopied, setIsCopied] = React.useState<boolean>(false)
  const pendingRoomRef = React.useRef<string | null>(null)

  // Unique client session ID to prevent Supabase Presence key collisions
  const clientId = React.useMemo(() => {
    if (typeof window !== "undefined") {
      let id = sessionStorage.getItem("doodle_client_id")
      if (!id) {
        id = "c_" + Math.random().toString(36).substring(2, 10)
        sessionStorage.setItem("doodle_client_id", id)
      }
      return id
    }
    return "c_" + Math.random().toString(36).substring(2, 10)
  }, [])

  // Live lobby discovery via Supabase Realtime & Server Action
  const [activeRooms, setActiveRooms] = React.useState<ActiveDoodleRoom[]>([])
  const activeRoomsRef = React.useRef<ActiveDoodleRoom[]>([])
  activeRoomsRef.current = activeRooms
  const lobbyChannelRef = React.useRef<RealtimeChannel | null>(null)
  const lobbyChannelReadyRef = React.useRef<boolean>(false)
  const pendingLobbyTrackRef = React.useRef<Record<string, unknown> | null>(null)
  const lobbyUntrackPendingRef = React.useRef(false)
  const lastLobbyPresenceRef = React.useRef<number | null>(null)
  const lobbyPresenceSignatureRef = React.useRef<string | null>(null)
  const [isHosting, setIsHosting] = React.useState<boolean>(false)
  const isHostingRef = React.useRef<boolean>(false)
  const currentLobbyCodeRef = React.useRef<string | null>(null)
  currentLobbyCodeRef.current = currentLobbyCode
  const hostRoomDataRef = React.useRef<ActiveDoodleRoom | null>(null)
  const [showRoomList, setShowRoomList] = React.useState<boolean>(false)

  const lastBeaconResponseRef = React.useRef<number>(0)

  const nickname = React.useMemo(() => {
    return (user?.name || "Player").trim().slice(0, 14)
  }, [user?.name])
  const nicknameRef = React.useRef(nickname)
  nicknameRef.current = nickname

  // Helper to merge and clean active rooms list without duplicates
  const mergeRooms = React.useCallback((incoming: ActiveDoodleRoom[]) => {
    setActiveRooms((prev) => {
      const map = new Map<string, ActiveDoodleRoom>()
      const now = Date.now()
      // Existing (only if fresh < 20s)
      prev.forEach((r) => {
        if (r.updatedAt && now - r.updatedAt < 35000) {
          map.set(r.roomCode.toUpperCase(), r)
        }
      })
      // Incoming
      incoming.forEach((r) => {
        const code = r.roomCode.toUpperCase()
        map.set(code, {
          ...r,
          roomCode: code,
          updatedAt: r.updatedAt || now,
        })
      })
      // Drop stale rooms (> 20s without update)
      const clean = Array.from(map.values()).filter(
        (r) => r.updatedAt && now - r.updatedAt < 35000
      )
      activeRoomsRef.current = clean
      iframeRef.current?.contentWindow?.postMessage(
        { type: "DOODLE_ACTIVE_ROOMS", rooms: clean },
        "*"
      )
      return clean
    })
  }, [])

  // Query active rooms from all available sources
  // Broadcast query ONLY sent if broadcastQuery is explicitly true (manual refresh or initial mount).
  // Background interval ONLY uses Next.js server actions to prevent Realtime broadcast spam!
  const queryActiveRooms = React.useCallback(async (broadcastQuery = false) => {
    // 1. Send broadcast query to all live hosts ONLY if explicitly requested and channel joined
    if (broadcastQuery && lobbyChannelReadyRef.current && lobbyChannelRef.current) {
      if (lobbyChannelRef.current.state === "joined") {
        lobbyChannelRef.current.send({
          type: "broadcast",
          event: "doodle_query_rooms",
          payload: { from: clientId },
        })
      }
    }

    // 2. Fetch from Next.js server actions (in-memory cache with 25s TTL)
    try {
      const res = await fetchActiveDoodleRoomsAction()
      if (res?.rooms) {
        const now = Date.now()
        setActiveRooms((prev) => {
          const map = new Map<string, ActiveDoodleRoom>()
          prev.forEach((r) => {
            if (r.updatedAt && now - r.updatedAt < 25000) {
              map.set(r.roomCode.toUpperCase(), r)
            }
          })
          res.rooms.forEach((r) => {
            const code = r.roomCode.toUpperCase()
            map.set(code, {
              ...r,
              roomCode: code,
              updatedAt: r.updatedAt || now,
            })
          })
          const clean = Array.from(map.values()).filter(
            (r) => r.updatedAt && now - r.updatedAt < 35000
          )
          activeRoomsRef.current = clean
          iframeRef.current?.contentWindow?.postMessage(
            { type: "DOODLE_ACTIVE_ROOMS", rooms: clean },
            "*"
          )
          return clean
        })
      }
    } catch {
      // Non-fatal fallback
    }
  }, [clientId])

  // Initial iframeSrc that only regenerates when explicitly restarted via key
  const [iframeSrc, setIframeSrc] = React.useState<string>(() => {
    const params = new URLSearchParams()
    if (nickname) {
      params.set("name", nickname)
    }
    params.set("ink", String(selectedInk))
    const q = params.toString()
    return `/games/doodle/index.html${q ? `?${q}` : ""}`
  })

  // Supabase Realtime — global lobby discovery (Broadcast Beacon + Presence)
  React.useEffect(() => {
    if (!supabase) return

    lobbyChannelReadyRef.current = false

    const channel = supabase.channel("doodle-lobby-channel", {
      config: {
        broadcast: { self: false },
        presence: { key: clientId },
      },
    })
    lobbyChannelRef.current = channel

    channel
      .on("broadcast", { event: "doodle_room_beacon" }, ({ payload }) => {
        if (payload?.roomCode && payload?.hostName) {
          mergeRooms([
            {
              roomCode: payload.roomCode,
              hostName: payload.hostName,
              playerCount: payload.playerCount ?? 1,
              maxPlayers: payload.maxPlayers ?? 10,
              map: payload.map ?? "district",
              createdAt: payload.createdAt ?? new Date().toISOString(),
              updatedAt: Date.now(),
            },
          ])
        }
      })
      .on("broadcast", { event: "doodle_query_rooms" }, () => {
        // If I am hosting an active room, respond with beacon (throttled to max 1 per 4s)
        const now = Date.now()
        if (now - lastBeaconResponseRef.current < 4000) return
        lastBeaconResponseRef.current = now
        if (isHostingRef.current && currentLobbyCodeRef.current && hostRoomDataRef.current) {
          if (lobbyChannelRef.current?.state === "joined") {
            channel.send({
              type: "broadcast",
              event: "doodle_room_beacon",
              payload: hostRoomDataRef.current,
            })
          }
        }
      })
      .on("broadcast", { event: "doodle_room_closed" }, ({ payload }) => {
        if (payload?.roomCode) {
          const codeToRemove = String(payload.roomCode).toUpperCase()
          setActiveRooms((prev) => {
            const filtered = prev.filter((r) => r.roomCode.toUpperCase() !== codeToRemove)
            activeRoomsRef.current = filtered
            iframeRef.current?.contentWindow?.postMessage(
              { type: "DOODLE_ACTIVE_ROOMS", rooms: filtered },
              "*"
            )
            return filtered
          })
        }
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState()
        const rooms: ActiveDoodleRoom[] = []
        Object.values(state).forEach((presences) => {
          ;(presences as any[]).forEach((p) => {
            if (p.roomCode && p.hostName) {
              rooms.push({
                roomCode: p.roomCode,
                hostName: p.hostName,
                playerCount: p.playerCount ?? 1,
                maxPlayers: p.maxPlayers ?? 10,
                map: p.map ?? "district",
                gameMode: p.gameMode ?? "ffa",
                createdAt: p.createdAt ?? new Date().toISOString(),
                updatedAt: Date.now(),
              })
            }
          })
        })
        if (rooms.length > 0) {
          mergeRooms(rooms)
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          lobbyChannelReadyRef.current = true
          // Re-announce the current host after reconnect, through the same limiter.
          if (hostRoomDataRef.current) {
            pendingLobbyTrackRef.current = hostRoomDataRef.current as unknown as Record<string, unknown>
          }
          lobbyPresenceSignatureRef.current = null
          // Immediately discover any live rooms (initial broadcast query)
          void queryActiveRooms(true)
        } else {
          lobbyChannelReadyRef.current = false
        }
      })

    // Presence is slow-changing metadata, capped below 5 calls / 30 seconds.
    const presenceTimer = setInterval(() => {
      if (channel.state !== "joined") return
      const now = Date.now()
      if (lastLobbyPresenceRef.current !== null && now - lastLobbyPresenceRef.current < 15000) return
      const data = pendingLobbyTrackRef.current
      if (data) {
        const signature = JSON.stringify([
          data.roomCode, data.hostName, data.playerCount,
          data.maxPlayers, data.map, data.gameMode,
        ])
        pendingLobbyTrackRef.current = null
        if (signature === lobbyPresenceSignatureRef.current) return
        lastLobbyPresenceRef.current = now
        void channel.track(data).then((result) => {
          if (result === "ok") lobbyPresenceSignatureRef.current = signature
          else if (!pendingLobbyTrackRef.current && hostRoomDataRef.current) {
            pendingLobbyTrackRef.current = hostRoomDataRef.current as unknown as Record<string, unknown>
          }
        }).catch((error) => console.warn("[Doodle] Lobby presence failed:", error))
      } else if (lobbyUntrackPendingRef.current) {
        lobbyUntrackPendingRef.current = false
        lastLobbyPresenceRef.current = now
        lobbyPresenceSignatureRef.current = null
        void channel.untrack().catch((error) => console.warn("[Doodle] Lobby untrack failed:", error))
      }
    }, 500)

    return () => {
      clearInterval(presenceTimer)
      lobbyChannelReadyRef.current = false
      pendingLobbyTrackRef.current = null
      if (lobbyChannelRef.current && supabase) {
        supabase.removeChannel(lobbyChannelRef.current)
        lobbyChannelRef.current = null
      }
    }
  }, [clientId, mergeRooms, queryActiveRooms])

  // Host heartbeat effect: periodic beacon push and server action refresh every 6s
  React.useEffect(() => {
    if (!isHosting || !currentLobbyCode) return

    const sendBeacon = () => {
      if (hostRoomDataRef.current) {
        if (lobbyChannelReadyRef.current && lobbyChannelRef.current && lobbyChannelRef.current.state === "joined") {
          lobbyChannelRef.current.send({
            type: "broadcast",
            event: "doodle_room_beacon",
            payload: hostRoomDataRef.current,
          })
        }
        void heartbeatDoodleRoomAction(currentLobbyCode, hostRoomDataRef.current.playerCount)
      }
    }

    sendBeacon()
    const timer = setInterval(sendBeacon, 6000)
    return () => clearInterval(timer)
  }, [isHosting, currentLobbyCode])

  // Client background sync: query active rooms every 5s when not hosting (via Server Action ONLY - 0 Realtime broadcasts!)
  React.useEffect(() => {
    if (currentLobbyCode) return

    void queryActiveRooms(false)
    const timer = setInterval(() => {
      void queryActiveRooms(false)
    }, 5000)

    return () => clearInterval(timer)
  }, [currentLobbyCode, queryActiveRooms])

  // Sync active rooms to game iframe whenever activeRooms updates
  React.useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "DOODLE_ACTIVE_ROOMS", rooms: activeRooms },
      "*"
    )
  }, [activeRooms])

  // Queue all sends; the room timer drains batches without depending on new input.
  const trySendRoomBroadcast = React.useCallback((payload: any) => {
    if (!roomBroadcastQueueRef.current.enqueue(payload)) {
      console.warn("[Doodle] Control queue full; waiting for Realtime recovery")
    }
  }, [])

  // Supabase Realtime Signaling Channel for Doodle War Room
  React.useEffect(() => {
    const queue = roomBroadcastQueueRef.current
    if (!subscribedRoom || !supabase) {
      roomChannelReadyRef.current = false
      queue.clear()
      if (roomChannelRef.current && supabase) {
        supabase.removeChannel(roomChannelRef.current)
        roomChannelRef.current = null
      }
      return
    }

    roomChannelReadyRef.current = false
    const channelName = `doodle-room-${subscribedRoom.toUpperCase()}`
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: nicknameRef.current || clientId },
      },
    })
    roomChannelRef.current = channel

    channel
      .on("broadcast", { event: "doodle_signal" }, ({ payload }) => {
        const packets = payload?.type === "doodle_batch"
          ? (Array.isArray(payload.packets) ? payload.packets.slice(0, 64) : [])
          : [payload]
        for (const packet of packets) {
          if (packet && typeof packet === "object") {
            iframeRef.current?.contentWindow?.postMessage(
              { type: "SUPABASE_SIGNAL", payload: packet },
              "*"
            )
          }
        }
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState()
        iframeRef.current?.contentWindow?.postMessage(
          { type: "SUPABASE_PRESENCE", state },
          "*"
        )
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          roomChannelReadyRef.current = true
          iframeRef.current?.contentWindow?.postMessage(
            { type: "SUPABASE_CHANNEL_READY", roomCode: subscribedRoom },
            "*"
          )
        } else {
          roomChannelReadyRef.current = false
        }
      })

    const flushTimer = setInterval(() => {
      if (roomChannelRef.current !== channel || channel.state !== "joined") return
      const packets = queue.take(Date.now(), roomPlayerCountRef.current)
      if (!packets.length) return
      void channel.send({
        type: "broadcast",
        event: "doodle_signal",
        payload: { type: "doodle_batch", packets },
      }).then((result) => {
        if (result !== "ok") console.warn("[Doodle] Broadcast failed:", result)
      }).catch((error) => console.warn("[Doodle] Broadcast failed:", error))
    }, 100)

    return () => {
      clearInterval(flushTimer)
      roomChannelReadyRef.current = false
      queue.clear()
      if (roomChannelRef.current && supabase) {
        supabase.removeChannel(roomChannelRef.current)
        roomChannelRef.current = null
      }
    }
  }, [subscribedRoom, clientId])

  const handleSelectInk = React.useCallback((inkId: number) => {
    setSelectedInk(inkId)
    if (typeof window !== "undefined") {
      localStorage.setItem("doodle_ink", String(inkId))
    }
    iframeRef.current?.contentWindow?.postMessage({ type: "SET_INK", ink: inkId }, "*")
  }, [])

  // Keep only the latest lobby metadata during bursts of join/map updates.
  const trackLobby = React.useCallback((data: Record<string, unknown> | ActiveDoodleRoom) => {
    pendingLobbyTrackRef.current = data as Record<string, unknown>
    lobbyUntrackPendingRef.current = false
  }, [])

  const untrackLobby = React.useCallback(() => {
    pendingLobbyTrackRef.current = null
    lobbyUntrackPendingRef.current = true
  }, [])

  const handleRestart = React.useCallback(() => {
    setShowRestartConfirm(false)
    const params = new URLSearchParams()
    if (nickname) {
      params.set("name", nickname)
    }
    params.set("ink", String(selectedInk))
    const q = params.toString()
    setIframeSrc(`/games/doodle/index.html${q ? `?${q}` : ""}`)
    setKey((prev) => prev + 1)
  }, [nickname, selectedInk])

  const handleToggleFullscreen = React.useCallback(() => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current
        .requestFullscreen()
        .then(() => {
          setIsFullscreen(true)
          if (typeof window !== "undefined" && "keyboard" in navigator && typeof (navigator as any).keyboard?.lock === "function") {
            ;(navigator as any).keyboard.lock(["Tab", "KeyW", "KeyA", "KeyS", "KeyD", "KeyR", "KeyF", "Escape"]).catch(() => {})
          }
        })
        .catch(() => {})
    } else {
      if (typeof window !== "undefined" && "keyboard" in navigator && typeof (navigator as any).keyboard?.unlock === "function") {
        ;(navigator as any).keyboard.unlock()
      }
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }, [])

  // Prevent accidental browser tab close when in active room
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentLobbyCode) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [currentLobbyCode])

  // Intercept Tab, F5, and Ctrl+W/A/S/D/R to protect game focus and prevent browser refresh/shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTarget =
        document.activeElement === iframeRef.current ||
        (containerRef.current ? containerRef.current.contains(document.activeElement) : false)
      if (isTarget) {
        if (
          e.key === "Tab" ||
          e.code === "Tab" ||
          e.key === "F5" ||
          e.code === "F5" ||
          ((e.ctrlKey || e.metaKey) && ["KeyW", "KeyA", "KeyS", "KeyD", "KeyR", "KeyF", "Tab"].includes(e.code)) ||
          ((e.ctrlKey || e.metaKey) && (e.key === "r" || e.key === "R" || e.key === "w" || e.key === "W"))
        ) {
          e.preventDefault()
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown, { capture: true, passive: false })
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true } as any)
  }, [])


  const handleShareToChat = React.useCallback(
    async (codeToShare: string) => {
      if (isSharing || !codeToShare) return
      setIsSharing(true)
      try {
        const token = (await supabase?.auth.getSession())?.data.session?.access_token ?? null
        await announceGameRoomAction({
          game: "doodle",
          roomCode: codeToShare,
          userName: nickname,
          userId: user?.id,
          token,
        })
        playRetroNotificationSound()
        setNotificationMsg(`Lobby [${codeToShare}] berhasil diumumkan ke Chat.exe!`)
        setTimeout(() => setNotificationMsg(null), 4000)
      } catch {
        setNotificationMsg("Gagal mengirim ajakan mabar ke Chat")
        setTimeout(() => setNotificationMsg(null), 3000)
      } finally {
        setIsSharing(false)
      }
    },
    [isSharing, nickname, user?.id]
  )

  const handleCopyCode = React.useCallback((codeToCopy: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(codeToCopy)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    }
  }, [])

  const handleApplySkin = React.useCallback((newSkin: DoodleCustomSkin) => {
    setSelectedInk(newSkin.ink)
    iframeRef.current?.contentWindow?.postMessage(
      { type: "SET_CUSTOM_SKIN", skin: newSkin },
      "*"
    )
    iframeRef.current?.contentWindow?.postMessage(
      { type: "SET_INK", ink: newSkin.ink },
      "*"
    )
  }, [])

  // Listen to messages from iframe game
  React.useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow || e.origin !== window.location.origin) return
      if (e.data?.type === "DOODLE_NETWORK_STATE") {
        const count = Number(e.data.playerCount)
        if (Number.isFinite(count)) roomPlayerCountRef.current = Math.min(10, Math.max(4, count))
      } else if (e.data?.type === "DOODLE_LOBBY_STATE") {
        const code = e.data.roomCode || null
        const hosting = e.data.isHost === true
        roomPlayerCountRef.current = Math.max(4, Number(e.data.playerCount) || 4)
        setCurrentLobbyCode(code)
        setIsHosting(hosting)
        const wasHosting = isHostingRef.current
        isHostingRef.current = hosting
        if (code) {
          setSubscribedRoom(String(code).toUpperCase().replace(/-\d+$/, ""))
          // Announce to global lobby if host
          if (hosting) {
            const roomData: ActiveDoodleRoom = {
              roomCode: code,
              hostName: nickname,
              playerCount: e.data.playerCount ?? 1,
              maxPlayers: e.data.maxPlayers ?? 10,
              map: e.data.map ?? "district",
              gameMode: e.data.gameMode ?? "ffa",
              createdAt: new Date().toISOString(),
              updatedAt: Date.now(),
            }
            hostRoomDataRef.current = roomData
            trackLobby(roomData)
            void registerDoodleRoomAction(roomData)
            if (lobbyChannelReadyRef.current && lobbyChannelRef.current && lobbyChannelRef.current.state === "joined") {
              void lobbyChannelRef.current.send({
                type: "broadcast",
                event: "doodle_room_beacon",
                payload: roomData,
              })
            }
          }
        } else {
          // Untrack from global lobby when leaving host
          if (wasHosting && currentLobbyCodeRef.current) {
            const oldCode = currentLobbyCodeRef.current
            void unregisterDoodleRoomAction(oldCode)
            if (lobbyChannelReadyRef.current && lobbyChannelRef.current && lobbyChannelRef.current.state === "joined") {
              void lobbyChannelRef.current.send({
                type: "broadcast",
                event: "doodle_room_closed",
                payload: { roomCode: oldCode },
              })
            }
          }
          hostRoomDataRef.current = null
          untrackLobby()
        }
      } else if (e.data?.type === "DOODLE_LOBBY_UPDATE" && e.data.roomCode) {
        roomPlayerCountRef.current = Math.max(4, Number(e.data.playerCount) || 4)
        // Update player count / map in lobby while still hosting
        if (isHostingRef.current) {
          const roomData: ActiveDoodleRoom = {
            roomCode: e.data.roomCode,
            hostName: nickname,
            playerCount: e.data.playerCount ?? 1,
            maxPlayers: e.data.maxPlayers ?? 10,
            map: e.data.map ?? "district",
            gameMode: e.data.gameMode ?? "ffa",
            createdAt: hostRoomDataRef.current?.createdAt || new Date().toISOString(),
            updatedAt: Date.now(),
          }
          hostRoomDataRef.current = roomData
          trackLobby(roomData)
          void registerDoodleRoomAction(roomData)
          if (lobbyChannelReadyRef.current && lobbyChannelRef.current && lobbyChannelRef.current.state === "joined") {
            void lobbyChannelRef.current.send({
              type: "broadcast",
              event: "doodle_room_beacon",
              payload: roomData,
            })
          }
        }
      } else if (e.data?.type === "SUBSCRIBE_ROOM" && e.data.roomCode) {
        const nextRoom = String(e.data.roomCode).trim().toUpperCase().replace(/-\d+$/, "")
        setSubscribedRoom((prev) => {
          if (prev !== nextRoom) {
            return nextRoom
          }
          return prev
        })
      } else if (e.data?.type === "UNSUBSCRIBE_ROOM") {
        roomBroadcastQueueRef.current.clear()
        lastBroadcastTimeRef.current.clear()
        setSubscribedRoom(null)
        if (isHostingRef.current && currentLobbyCodeRef.current) {
          const oldCode = currentLobbyCodeRef.current
          void unregisterDoodleRoomAction(oldCode)
          if (lobbyChannelReadyRef.current && lobbyChannelRef.current && lobbyChannelRef.current.state === "joined") {
            void lobbyChannelRef.current.send({
              type: "broadcast",
              event: "doodle_room_closed",
              payload: { roomCode: oldCode },
            })
          }
        }
        hostRoomDataRef.current = null
        untrackLobby()
        setIsHosting(false)
        isHostingRef.current = false
      } else if (e.data?.type === "DOODLE_BROADCAST" && e.data.payload) {
        const payload = e.data.payload
        const isPosPacket = payload?.type === "game_msg" && payload?.msg?.t === "ps"
        const now = Date.now()
        if (isPosPacket) {
          const stream = `${payload.to || "*"}|${payload.msg?.from || payload.from}`
          const last = lastBroadcastTimeRef.current.get(stream)
          if (last !== undefined && now - last < 95) return
          lastBroadcastTimeRef.current.set(stream, now)
        }
        trySendRoomBroadcast(payload)
      } else if (e.data?.type === "DOODLE_SHARE_ROOM") {
        if (e.data.roomCode) {
          void handleShareToChat(e.data.roomCode)
        }
      } else if (e.data?.type === "DOODLE_REQUEST_ROOMS") {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "DOODLE_ACTIVE_ROOMS", rooms: activeRoomsRef.current },
          "*"
        )
        // Background lobby update from iframe uses Server Action only — no realtime broadcast!
        void queryActiveRooms(false)
      } else if (e.data?.type === "DOODLE_READY") {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "DOODLE_ACTIVE_ROOMS", rooms: activeRoomsRef.current },
          "*"
        )
        void queryActiveRooms()
        try {
          const savedSkin = localStorage.getItem("doodle_custom_skin")
          if (savedSkin) {
            iframeRef.current?.contentWindow?.postMessage(
              { type: "SET_CUSTOM_SKIN", skin: JSON.parse(savedSkin) },
              "*"
            )
          }
        } catch {}
        if (pendingRoomRef.current) {
          const room = pendingRoomRef.current
          pendingRoomRef.current = null
          iframeRef.current?.contentWindow?.postMessage(
            { type: "JOIN_ROOM", roomCode: room },
            "*"
          )
        }
      } else if (e.data?.type === "OPEN_DOODLE_LEADERBOARD") {
        setShowLeaderboard(true)
      } else if (e.data?.type === "OPEN_DOODLE_SKINS") {
        setShowSkinCustomizer(true)
      } else if (e.data?.type === "DOODLE_SOLO_GAMEOVER") {
        const wave = Math.max(1, Number(e.data.wave) || 1)
        const score = Math.max(0, Number(e.data.score) || 0)
        const kills = Math.max(0, Number(e.data.kills) || 0)
        const headshots = Math.max(0, Number(e.data.headshots) || 0)
        void (async () => {
          try {
            const token = (await supabase?.auth.getSession())?.data.session?.access_token ?? null
            if (token && user) {
              await submitDoodleSoloScoreAction(token, {
                wave,
                score,
                kills,
                headshots,
                nickname,
              })
            }
          } catch {}
        })()
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [handleShareToChat, nickname, queryActiveRooms, trackLobby, untrackLobby, trySendRoomBroadcast, user])

  // Listen to custom global event: join doodle room from chat
  React.useEffect(() => {
    const handleJoinEvent = (e: Event) => {
      const custom = e as CustomEvent<{ roomCode: string }>
      const code = custom.detail?.roomCode?.trim().toUpperCase()
      if (code) {
        pendingRoomRef.current = code
        setSubscribedRoom(code)
        const sendMsg = () => {
          iframeRef.current?.contentWindow?.postMessage(
            { type: "JOIN_ROOM", roomCode: code },
            "*"
          )
        }
        sendMsg()
        setTimeout(sendMsg, 600)
      }
    }
    window.addEventListener("join-doodle-room", handleJoinEvent)
    return () => window.removeEventListener("join-doodle-room", handleJoinEvent)
  }, [])

  return (
    <div ref={containerRef} className="flex flex-col h-full w-full bg-[#c0c0c0] font-sans select-none overflow-hidden text-black">
      {/* Top Toolbar Windows 98 */}
      <div className="flex flex-wrap items-center justify-between px-2 py-1 bg-[#dfdfdf] border-b border-[#808080] text-xs gap-1">
        <div className="flex items-center gap-1.5 font-bold">
          <span className="text-blue-800 font-mono tracking-wider font-extrabold">DOODLE.EXE</span>
          <span className="text-[#606060] font-normal hidden sm:inline">| Doodle War 98</span>
          {nickname && (
            <span className="text-[11px] font-mono px-1.5 py-0.5 bg-[#f0f0f0] border border-[#a0a0a0] rounded-[2px] text-[#1a30c0]">
              👤 {nickname}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Ink Selector */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[#f0f0f0] border border-[#a0a0a0] rounded-[2px]" title="Pilihan Warna Tinta Bolpoin & Stabilo">
            <Palette className="w-3 h-3 text-[#505050]" />
            <div className="flex items-center gap-1">
              {INK_OPTIONS.map((ink) => (
                <button
                  key={ink.id}
                  type="button"
                  onClick={() => handleSelectInk(ink.id)}
                  className={`w-3.5 h-3.5 rounded-full border cursor-pointer transition-transform ${
                    selectedInk === ink.id
                      ? "scale-125 border-black ring-1 ring-white shadow"
                      : "border-black/30 hover:scale-110 opacity-70 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: ink.hex }}
                  title={ink.name}
                />
              ))}
            </div>
          </div>

          {/* Lobby info & Quick Share Button */}
          {currentLobbyCode && (
            <div className="flex items-center gap-1 bg-[#fff8e7] px-1.5 py-0.5 border border-[#c49000] rounded-[2px]">
              <span className="font-mono font-bold text-[#d02030] text-[11px]">
                ROOM: {currentLobbyCode}
              </span>
              <button
                type="button"
                onClick={() => handleCopyCode(currentLobbyCode)}
                className="p-0.5 hover:bg-black/10 rounded cursor-pointer"
                title="Salin Kode Room"
              >
                {isCopied ? <Check className="w-3 h-3 text-green-700" /> : <Copy className="w-3 h-3 text-gray-700" />}
              </button>
              <button
                type="button"
                onClick={() => void handleShareToChat(currentLobbyCode)}
                disabled={isSharing}
                className="flex items-center gap-1 px-1.5 py-0.5 bg-[#d02030] hover:bg-[#b01828] text-white font-mono text-[10px] font-bold rounded-[2px] border border-white/50 shadow active:translate-y-px cursor-pointer disabled:opacity-50"
                title="Bagikan Room ke Chat Umum IT-Things"
              >
                <Share2 className="w-2.5 h-2.5" />
                <span>{isSharing ? "MENGIRIM..." : "AJAK CHAT"}</span>
              </button>
            </div>
          )}

          {/* Room List Toggle Button */}
          {!currentLobbyCode && (
            <button
              type="button"
              onClick={() => setShowRoomList((v) => !v)}
              className={`flex items-center gap-1 px-1.5 py-0.5 font-mono text-[10px] font-bold border rounded-[2px] cursor-pointer transition-colors ${
                showRoomList
                  ? "bg-[#1E4E8C] text-white border-[#1a3a6e]"
                  : "bg-[#f0f0f0] text-[#1a30c0] border-[#a0a0a0] hover:bg-[#e0e8ff]"
              }`}
              title="Lihat daftar room aktif dari anggota tim"
            >
              <Wifi className="w-3 h-3" />
              <span>ROOM AKTIF</span>
              {activeRooms.length > 0 && (
                <span className="bg-[#d02030] text-white text-[9px] font-bold rounded-full px-1 min-w-[14px] text-center leading-tight">
                  {activeRooms.length}
                </span>
              )}
            </button>
          )}

          {/* Klasemen Solo Button */}
          <button
            type="button"
            onClick={() => setShowLeaderboard(true)}
            className="flex items-center gap-1 px-1.5 py-0.5 font-mono text-[10px] font-bold bg-[#fff8e7] hover:bg-[#ffeed0] text-[#8a4b00] border border-[#d49b20] rounded-[2px] cursor-pointer active:translate-y-px shadow-sm transition-colors"
            title="Lihat Klasemen & Rekor Solo Wave Tim"
          >
            <Trophy className="w-3 h-3 text-amber-500 fill-amber-500/20" />
            <span>KLASEMEN</span>
          </button>

          {/* Custom Skin & Lemari Kostum Button */}
          <button
            type="button"
            onClick={() => setShowSkinCustomizer(true)}
            className="flex items-center gap-1 px-1.5 py-0.5 font-mono text-[10px] font-bold bg-[#f5f3ff] hover:bg-[#ede9fe] text-[#6d28d9] border border-[#a78bfa] rounded-[2px] cursor-pointer active:translate-y-px shadow-sm transition-colors"
            title="Buka Lemari Kostum (Custom Skin Topi, Senjata & Wajah)"
          >
            <Sparkles className="w-3 h-3 text-purple-600" />
            <span>SKIN</span>
          </button>

          {/* Restart */}

          <RetroActionButton
            action="refresh"
            visual="icon"
            onClick={() => setShowRestartConfirm(true)}
            tooltip="Restart Game"
            className="p-1"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </RetroActionButton>

          {/* Fullscreen */}
          <RetroActionButton
            action="edit"
            visual="icon"
            onClick={handleToggleFullscreen}
            tooltip={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
            className="p-1"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </RetroActionButton>
        </div>
      </div>

      {/* Notification Banner */}
      {notificationMsg && (
        <div className="bg-[#1E4E8C] text-white text-[11px] font-mono px-3 py-1 flex items-center justify-between border-b border-white/20 animate-in fade-in duration-200">
          <span className="flex items-center gap-1.5">
            <Gamepad2 className="w-3.5 h-3.5 text-yellow-300" />
            {notificationMsg}
          </span>
          <button
            type="button"
            onClick={() => setNotificationMsg(null)}
            className="text-white/70 hover:text-white text-xs cursor-pointer font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Office Quiet Mode Warning Banner */}
      <div className="bg-[#fff8e7] text-[#7a4b00] text-[11px] font-mono px-3 py-0.5 flex items-center justify-between border-b border-[#e2c880] select-none">
        <span className="flex items-center gap-1.5">
          <span>🤫</span>
          <span className="font-bold">PERINGATAN:</span>
          <span>Bermain dengan tenang, jangan berisik di kantor!</span>
        </span>
        <span className="text-[10px] text-[#9a6b10] hidden sm:inline">(Gunakan headset &amp; kecilkan volume)</span>
      </div>

      {/* Doodle War Game Viewport */}
      <div className="relative flex-1 w-full h-full bg-[#f6f3e6] overflow-hidden">
        <iframe
          key={key}
          ref={iframeRef}
          src={iframeSrc}
          className="w-full h-full border-0 block"
          allow="autoplay; fullscreen"
          title="Doodle War 98"
        />

        {/* Active Room List Overlay */}
        {showRoomList && !currentLobbyCode && (
          <div className="absolute inset-0 z-10 flex items-start justify-center pt-8 px-4 pointer-events-none">
            <div
              className="pointer-events-auto w-full max-w-sm bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] shadow-[2px_2px_0px_#000] font-mono text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Win98 Title Bar */}
              <div className="flex items-center justify-between px-2 py-0.5 bg-gradient-to-r from-[#1E4E8C] to-[#3a7bd5] text-white font-bold text-[11px] select-none">
                <div className="flex items-center gap-1.5">
                  <Gamepad2 className="w-3 h-3" />
                  <span>DOODLE_ROOMS.EXE</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRoomList(false)}
                  className="w-4 h-4 flex items-center justify-center bg-[#c0c0c0] border border-t-white border-l-white border-b-[#808080] border-r-[#808080] text-black text-[10px] font-bold leading-none hover:bg-[#d0d0d0] cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="p-2">
                <div className="flex items-center justify-between mb-2 text-[10px] text-[#404040]">
                  <div className="flex items-center gap-1.5">
                    <Wifi className="w-3 h-3 text-green-700" />
                    <span>
                      {activeRooms.length === 0
                        ? "Tidak ada room aktif saat ini"
                        : `${activeRooms.length} room aktif dari anggota tim`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void queryActiveRooms()}
                    className="flex items-center gap-1 px-1.5 py-0.5 bg-[#dfdfdf] hover:bg-[#e8e8e8] border border-t-white border-l-white border-b-[#808080] border-r-[#808080] rounded-[2px] text-[9px] font-bold cursor-pointer active:translate-y-px"
                    title="Segarkan daftar room sekarang"
                  >
                    <RotateCw className="w-2.5 h-2.5" />
                    <span>Segarkan</span>
                  </button>
                </div>

                {activeRooms.length === 0 ? (
                  <div className="text-center py-4 text-[#808080] text-[10px] border border-[#a0a0a0] bg-white/50">
                    <Users className="w-6 h-6 mx-auto mb-1 opacity-30" />
                    <div>Belum ada yang buka lobby.</div>
                    <div className="mt-0.5">Klik PLAY ONLINE → BUAT LOBBY dulu!</div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                    {activeRooms.map((room) => (
                      <div
                        key={room.roomCode}
                        className="flex items-center justify-between bg-white border border-[#a0a0a0] px-2 py-1.5 gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[#1a30c0] truncate">{room.hostName}</div>
                          <div className="text-[10px] text-[#606060] flex items-center gap-2">
                            <span className="flex items-center gap-0.5">
                              <Users className="w-2.5 h-2.5" />
                              {room.playerCount}/{room.maxPlayers}
                            </span>
                            <span className="uppercase">{room.map}</span>
                            {room.gameMode === "bomb" && (
                              <span className="px-1 py-0.2 bg-[#ff5555]/20 text-[#cc0000] font-bold text-[9px] border border-[#ff5555]/50 rounded-[2px]">
                                BOMB
                              </span>
                            )}
                            {room.gameMode === "tdm" && (
                              <span className="px-1 py-0.2 bg-[#3a7bd5]/20 text-[#1E4E8C] font-bold text-[9px] border border-[#3a7bd5]/50 rounded-[2px]">
                                TDM
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowRoomList(false)
                            const code = room.roomCode
                            pendingRoomRef.current = code
                            setSubscribedRoom(code)
                            const send = () =>
                              iframeRef.current?.contentWindow?.postMessage(
                                { type: "JOIN_ROOM", roomCode: code },
                                "*"
                              )
                            send()
                            setTimeout(send, 600)
                          }}
                          className="flex-shrink-0 px-2 py-1 bg-[#1E4E8C] hover:bg-[#163a6a] text-white text-[10px] font-bold border border-t-[#4a8fd0] border-l-[#4a8fd0] border-b-[#0a2040] border-r-[#0a2040] active:border-t-[#0a2040] active:border-l-[#0a2040] cursor-pointer"
                        >
                          GABUNG
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-2 text-[9px] text-[#808080] text-center">
                  room akan muncul otomatis saat teman membuka lobby
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Restart Confirm Dialog (Win98 Standard) */}
      <ConfirmDialog
        isOpen={showRestartConfirm}
        onClose={() => setShowRestartConfirm(false)}
        title="RESTART_DOODLE.EXE"
        message="Apakah kamu yakin ingin mengulang pertempuran Doodle War 98 dari awal?"
        confirmText="RESTART"
        cancelText="BATAL"
        variant="warning"
        onConfirm={handleRestart}
      />

      {/* Klasemen / Leaderboard Modal */}
      {showLeaderboard && (
        <DoodleLeaderboard onClose={() => setShowLeaderboard(false)} />
      )}

      {/* Lemari Kostum / Skin Customizer Modal */}
      {showSkinCustomizer && (
        <DoodleSkinCustomizer
          onApply={handleApplySkin}
          onClose={() => setShowSkinCustomizer(false)}
        />
      )}
    </div>
  )
}
