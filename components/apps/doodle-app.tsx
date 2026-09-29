"use client"

import * as React from "react"
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
  type ActiveDoodleRoom,
} from "@/app/actions/doodle"
import { playRetroNotificationSound } from "@/lib/sound-effects"
import { Maximize2, Minimize2, RotateCw, Share2, Copy, Check, Gamepad2, Palette, Users, Wifi } from "lucide-react"

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
  const pendingRoomBroadcastsRef = React.useRef<any[]>([])
  const lastBroadcastTimeRef = React.useRef<number>(0)
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
  const [isHosting, setIsHosting] = React.useState<boolean>(false)
  const isHostingRef = React.useRef<boolean>(false)
  const currentLobbyCodeRef = React.useRef<string | null>(null)
  currentLobbyCodeRef.current = currentLobbyCode
  const hostRoomDataRef = React.useRef<ActiveDoodleRoom | null>(null)
  const [showRoomList, setShowRoomList] = React.useState<boolean>(false)

  const nickname = React.useMemo(() => {
    return (user?.name || "Player").trim().slice(0, 14)
  }, [user?.name])

  // Helper to merge and clean active rooms list without duplicates
  const mergeRooms = React.useCallback((incoming: ActiveDoodleRoom[]) => {
    setActiveRooms((prev) => {
      const map = new Map<string, ActiveDoodleRoom>()
      // Existing
      prev.forEach((r) => map.set(r.roomCode.toUpperCase(), r))
      // Incoming
      incoming.forEach((r) => {
        const code = r.roomCode.toUpperCase()
        map.set(code, {
          ...r,
          roomCode: code,
          updatedAt: r.updatedAt || Date.now(),
        })
      })
      // Drop stale rooms (> 30s without update)
      const now = Date.now()
      const clean = Array.from(map.values()).filter(
        (r) => !r.updatedAt || now - r.updatedAt < 30000
      )
      activeRoomsRef.current = clean
      iframeRef.current?.contentWindow?.postMessage(
        { type: "DOODLE_ACTIVE_ROOMS", rooms: clean },
        "*"
      )
      return clean
    })
  }, [])

  // Query active rooms from all available sources (Realtime Broadcast Ping + Server Action Cache)
  const queryActiveRooms = React.useCallback(async () => {
    // 1. Send broadcast query to all live hosts
    if (lobbyChannelReadyRef.current && lobbyChannelRef.current) {
      lobbyChannelRef.current.send({
        type: "broadcast",
        event: "doodle_query_rooms",
        payload: { from: clientId },
      })
    }

    // 2. Fetch from Next.js server actions (in-memory + recent chat fallback)
    try {
      const res = await fetchActiveDoodleRoomsAction()
      if (res?.rooms && res.rooms.length > 0) {
        mergeRooms(res.rooms)
      }
    } catch {
      // Non-fatal fallback
    }
  }, [clientId, mergeRooms])

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
        // If I am hosting an active room, immediately respond with my beacon
        if (isHostingRef.current && currentLobbyCodeRef.current && hostRoomDataRef.current) {
          channel.send({
            type: "broadcast",
            event: "doodle_room_beacon",
            payload: hostRoomDataRef.current,
          })
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
          // Flush any pending track that arrived before channel was ready
          if (pendingLobbyTrackRef.current) {
            channel.track(pendingLobbyTrackRef.current)
            pendingLobbyTrackRef.current = null
          }
          // Immediately discover any live rooms
          void queryActiveRooms()
        }
      })

    return () => {
      lobbyChannelReadyRef.current = false
      pendingLobbyTrackRef.current = null
      if (lobbyChannelRef.current && supabase) {
        supabase.removeChannel(lobbyChannelRef.current)
        lobbyChannelRef.current = null
      }
    }
  }, [clientId, mergeRooms, queryActiveRooms])

  // Host heartbeat effect: periodic beacon push and server action refresh every 3.5s
  React.useEffect(() => {
    if (!isHosting || !currentLobbyCode) return

    const sendBeacon = () => {
      if (hostRoomDataRef.current) {
        if (lobbyChannelReadyRef.current && lobbyChannelRef.current) {
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
    const timer = setInterval(sendBeacon, 3500)
    return () => clearInterval(timer)
  }, [isHosting, currentLobbyCode])

  // Client background sync: query active rooms every 4s when not hosting
  React.useEffect(() => {
    if (currentLobbyCode) return

    void queryActiveRooms()
    const timer = setInterval(() => {
      void queryActiveRooms()
    }, 4000)

    return () => clearInterval(timer)
  }, [currentLobbyCode, queryActiveRooms])

  // Sync active rooms to game iframe whenever activeRooms updates
  React.useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "DOODLE_ACTIVE_ROOMS", rooms: activeRooms },
      "*"
    )
  }, [activeRooms])

  // Supabase Realtime Signaling Channel for Doodle War Room


  React.useEffect(() => {
    if (!subscribedRoom || !supabase) {
      roomChannelReadyRef.current = false
      pendingRoomBroadcastsRef.current = []
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
        presence: { key: nickname },
      },
    })
    roomChannelRef.current = channel

    channel
      .on("broadcast", { event: "doodle_signal" }, ({ payload }) => {
        if (payload) {
          iframeRef.current?.contentWindow?.postMessage(
            { type: "SUPABASE_SIGNAL", payload },
            "*"
          )
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
          // Drain max 3 essential handshake packets with spacing to prevent REST fallback flood
          const queued = pendingRoomBroadcastsRef.current.splice(0, 3)
          pendingRoomBroadcastsRef.current = []
          queued.forEach((p, idx) => {
            setTimeout(() => {
              if (roomChannelRef.current && roomChannelReadyRef.current) {
                try {
                  void roomChannelRef.current.send({
                    type: "broadcast",
                    event: "doodle_signal",
                    payload: p,
                  })
                } catch {}
              }
            }, (idx + 1) * 80)
          })
          iframeRef.current?.contentWindow?.postMessage(
            { type: "SUPABASE_CHANNEL_READY", roomCode: subscribedRoom },
            "*"
          )
        } else {
          roomChannelReadyRef.current = false
        }
      })

    return () => {
      roomChannelReadyRef.current = false
      pendingRoomBroadcastsRef.current = []
      if (roomChannelRef.current && supabase) {
        supabase.removeChannel(roomChannelRef.current)
        roomChannelRef.current = null
      }
    }
  }, [subscribedRoom, nickname])

  const handleSelectInk = React.useCallback((inkId: number) => {
    setSelectedInk(inkId)
    if (typeof window !== "undefined") {
      localStorage.setItem("doodle_ink", String(inkId))
    }
    iframeRef.current?.contentWindow?.postMessage({ type: "SET_INK", ink: inkId }, "*")
  }, [])

  // Safe track helper: queues if channel not ready yet, otherwise tracks immediately
  const trackLobby = React.useCallback((data: Record<string, unknown> | ActiveDoodleRoom) => {
    if (lobbyChannelReadyRef.current && lobbyChannelRef.current) {
      lobbyChannelRef.current.track(data as Record<string, unknown>)
    } else {
      // Queue it — will be flushed when channel reaches SUBSCRIBED
      pendingLobbyTrackRef.current = data as Record<string, unknown>
    }
  }, [])

  const untrackLobby = React.useCallback(() => {
    pendingLobbyTrackRef.current = null
    if (lobbyChannelRef.current) {
      lobbyChannelRef.current.untrack()
    }
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
            ;(navigator as any).keyboard.lock(["Tab", "KeyW", "KeyA", "KeyS", "KeyD", "Escape"]).catch(() => {})
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

  // Intercept Tab and Ctrl+W to protect game focus and prevent browser shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTarget =
        document.activeElement === iframeRef.current ||
        (containerRef.current ? containerRef.current.contains(document.activeElement) : false)
      if (isTarget) {
        if (
          e.key === "Tab" ||
          e.code === "Tab" ||
          (e.ctrlKey && ["KeyW", "KeyA", "KeyS", "KeyD", "Tab"].includes(e.code))
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

  // Listen to messages from iframe game
  React.useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "DOODLE_LOBBY_STATE") {
        const code = e.data.roomCode || null
        const hosting = e.data.isHost === true
        setCurrentLobbyCode(code)
        setIsHosting(hosting)
        isHostingRef.current = hosting
        if (code) {
          setSubscribedRoom(code)
          // Announce to global lobby if host
          if (hosting) {
            const roomData: ActiveDoodleRoom = {
              roomCode: code,
              hostName: nickname,
              playerCount: e.data.playerCount ?? 1,
              maxPlayers: e.data.maxPlayers ?? 10,
              map: e.data.map ?? "district",
              createdAt: new Date().toISOString(),
              updatedAt: Date.now(),
            }
            hostRoomDataRef.current = roomData
            trackLobby(roomData)
            void registerDoodleRoomAction(roomData)
            if (lobbyChannelReadyRef.current && lobbyChannelRef.current) {
              lobbyChannelRef.current.send({
                type: "broadcast",
                event: "doodle_room_beacon",
                payload: roomData,
              })
            }
          }
        } else {
          // Untrack from global lobby when leaving host
          if (isHostingRef.current && currentLobbyCodeRef.current) {
            const oldCode = currentLobbyCodeRef.current
            void unregisterDoodleRoomAction(oldCode)
            if (lobbyChannelReadyRef.current && lobbyChannelRef.current) {
              lobbyChannelRef.current.send({
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
        // Update player count / map in lobby while still hosting
        if (isHostingRef.current) {
          const roomData: ActiveDoodleRoom = {
            roomCode: e.data.roomCode,
            hostName: nickname,
            playerCount: e.data.playerCount ?? 1,
            maxPlayers: e.data.maxPlayers ?? 10,
            map: e.data.map ?? "district",
            createdAt: hostRoomDataRef.current?.createdAt || new Date().toISOString(),
            updatedAt: Date.now(),
          }
          hostRoomDataRef.current = roomData
          trackLobby(roomData)
          void registerDoodleRoomAction(roomData)
          if (lobbyChannelReadyRef.current && lobbyChannelRef.current) {
            lobbyChannelRef.current.send({
              type: "broadcast",
              event: "doodle_room_beacon",
              payload: roomData,
            })
          }
        }
      } else if (e.data?.type === "SUBSCRIBE_ROOM" && e.data.roomCode) {
        const nextRoom = String(e.data.roomCode).trim().toUpperCase()
        setSubscribedRoom((prev) => {
          if (prev !== nextRoom) {
            pendingRoomBroadcastsRef.current = []
            return nextRoom
          }
          return prev
        })
      } else if (e.data?.type === "UNSUBSCRIBE_ROOM") {
        pendingRoomBroadcastsRef.current = []
        setSubscribedRoom(null)
        if (isHostingRef.current && currentLobbyCodeRef.current) {
          const oldCode = currentLobbyCodeRef.current
          void unregisterDoodleRoomAction(oldCode)
          if (lobbyChannelReadyRef.current && lobbyChannelRef.current) {
            lobbyChannelRef.current.send({
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
        if (roomChannelReadyRef.current && roomChannelRef.current) {
          if (isPosPacket) {
            if (now - lastBroadcastTimeRef.current < 200) return
            lastBroadcastTimeRef.current = now
          }
          try {
            void roomChannelRef.current.send({
              type: "broadcast",
              event: "doodle_signal",
              payload,
            })
          } catch {}
        } else if (!isPosPacket) {
          if (pendingRoomBroadcastsRef.current.length < 3) {
            pendingRoomBroadcastsRef.current.push(payload)
          }
        }
      } else if (e.data?.type === "DOODLE_SHARE_ROOM") {
        if (e.data.roomCode) {
          void handleShareToChat(e.data.roomCode)
        }
      } else if (e.data?.type === "DOODLE_REQUEST_ROOMS") {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "DOODLE_ACTIVE_ROOMS", rooms: activeRoomsRef.current },
          "*"
        )
        void queryActiveRooms()
      } else if (e.data?.type === "DOODLE_READY") {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "DOODLE_ACTIVE_ROOMS", rooms: activeRoomsRef.current },
          "*"
        )
        void queryActiveRooms()
        if (pendingRoomRef.current) {
          const room = pendingRoomRef.current
          pendingRoomRef.current = null
          iframeRef.current?.contentWindow?.postMessage(
            { type: "JOIN_ROOM", roomCode: room },
            "*"
          )
        }
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [handleShareToChat, nickname, queryActiveRooms, trackLobby, untrackLobby])

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

      {/* Doodle War Game Viewport */}
      <div className="relative flex-1 w-full h-full bg-[#f6f3e6] overflow-hidden">
        <iframe
          key={key}
          ref={iframeRef}
          src={iframeSrc}
          className="w-full h-full border-0 block"
          allow="autoplay; fullscreen; pointer-lock"
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
    </div>
  )
}
