"use client"

import * as React from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"
import {
  playRetroCorrectSound,
  playRetroBuzzerSound,
  playRetroRoundStartSound,
  playRetroNotificationSound,
} from "@/lib/sound-effects"

export const DEFAULT_PAINT_ROOM_ID = "00000000-0000-0000-0000-000000000099"

// ─── Word Bank ──────────────────────────────────────────────
export interface WordItem {
  word: string
  hint: string
  category: "IT & Tech" | "Kultur Kantor" | "Umum"
}

export const PAINT_WAR_WORDS: WordItem[] = [
  // IT & Tech
  { word: "KABEL LAN", hint: "Kabel jaringan warna biru/abu", category: "IT & Tech" },
  { word: "BLUE SCREEN", hint: "Layar biru maut Windows", category: "IT & Tech" },
  { word: "KEYBOARD", hint: "Papan ketik mekanikal", category: "IT & Tech" },
  { word: "MOUSEPAD", hint: "Alas mouse gaming/kantor", category: "IT & Tech" },
  { word: "ROUTER WIFI", hint: "Alat pemancar sinyal internet", category: "IT & Tech" },
  { word: "SERVER RACK", hint: "Lemari server berkedip", category: "IT & Tech" },
  { word: "FLASH DISK", hint: "Penyimpan data colokan USB", category: "IT & Tech" },
  { word: "HEADSET", hint: "Dipakai pas meeting online", category: "IT & Tech" },
  { word: "LAPTOP", hint: "Komputer lipat", category: "IT & Tech" },
  { word: "PRINTER", hint: "Sering paper jam", category: "IT & Tech" },
  { word: "DOCKER", hint: "Paus biru bawa kontainer", category: "IT & Tech" },
  { word: "BUG", hint: "Kutu kode yang bikin pusing", category: "IT & Tech" },
  { word: "FIREWALL", hint: "Tembok api pengaman jaringan", category: "IT & Tech" },
  { word: "DATABASE", hint: "Tempat simpan data bertingkat", category: "IT & Tech" },
  { word: "TERMINAL", hint: "Layar hitam ketik CLI", category: "IT & Tech" },
  { word: "WEBCAM", hint: "Kamera buat Zoom / GMeet", category: "IT & Tech" },
  { word: "KODING", hint: "Aktivitas ngetik baris kode", category: "IT & Tech" },
  { word: "CPU TOWER", hint: "Casing PC desktop", category: "IT & Tech" },

  // Kultur Kantor
  { word: "GALON AQUA", hint: "Diangkat pas air dispenser abis", category: "Kultur Kantor" },
  { word: "KOPI KAPAL API", hint: "Minuman penyelamat mata ngantuk", category: "Kultur Kantor" },
  { word: "DISPENSER", hint: "Ada keran merah dan biru", category: "Kultur Kantor" },
  { word: "GORENGAN", hint: "Bakwan, tahu isi, tempe mendoan", category: "Kultur Kantor" },
  { word: "MIE INSTAN", hint: "Makanan lembur sejuta umat", category: "Kultur Kantor" },
  { word: "KARTU AKSES", hint: "Dikalungin di leher buat buka pintu", category: "Kultur Kantor" },
  { word: "MEJA KANTOR", hint: "Banyak sticky notes & kabel", category: "Kultur Kantor" },
  { word: "KURSI ERGONOMIS", hint: "Penyelamat pinggang jompo", category: "Kultur Kantor" },
  { word: "SLIP GAJI", hint: "Ditunggu tanggal 25", category: "Kultur Kantor" },
  { word: "WHITEBOARD", hint: "Papan putih buat coret-coret sprint", category: "Kultur Kantor" },
  { word: "TUMBLER", hint: "Botol minum anak kantor", category: "Kultur Kantor" },
  { word: "SENDOK PANTRY", hint: "Sering hilang misterius di kantor", category: "Kultur Kantor" },

  // Umum
  { word: "KUCING", hint: "Hewan berbulu suka ngeong", category: "Umum" },
  { word: "SEPEDA MOTOR", hint: "Kendaraan roda dua", category: "Umum" },
  { word: "MARTABAK", hint: "Manis atau telor, sogokan lembur", category: "Umum" },
  { word: "PAYUNG", hint: "Dibawa pas mendung / hujan", category: "Umum" },
  { word: "GITAR", hint: "Alat musik petik 6 senar", category: "Umum" },
  { word: "PIZZA", hint: "Makanan bundar dipotong segitiga", category: "Umum" },
  { word: "KACAMATA", hint: "Dipakai biar monitor gak bikin silau", category: "Umum" },
  { word: "KULKAS", hint: "Lemari pendingin makanan", category: "Umum" },
  { word: "JAM DINDING", hint: "Diliatin terus pas jam 5 sore", category: "Umum" },
  { word: "SEPATU SNEAKERS", hint: "Alas kaki santai anak IT", category: "Umum" },
  { word: "PISANG GORENG", hint: "Camilan sore hangat", category: "Umum" },
]

export function getRandomWordOptions(count = 3): WordItem[] {
  const shuffled = [...PAINT_WAR_WORDS].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

// ─── Interfaces ─────────────────────────────────────────────
export interface PaintWarRoom {
  id: string
  status: "waiting" | "selecting_word" | "drawing" | "round_ended"
  currentDrawerId: string | null
  currentDrawerName: string | null
  currentDrawerAvatar: string | null
  currentWord: string | null
  wordHint: string | null
  category: string | null
  roundNumber: number
  totalRounds: number
  roundStartTime: string | null
  roundDurationSec: number
  canvasSnapshot: string | null
  createdAt: string
  updatedAt: string
}

export interface PaintWarPlayer {
  id: string
  roomId: string
  userId: string
  userName: string
  userAvatar: string | null
  score: number
  hasGuessed: boolean
  isDrawing: boolean
  isOnline: boolean
  lastSeen: string
  createdAt: string
}

export interface PaintWarMessage {
  id: string
  roomId: string
  userId: string
  userName: string
  userAvatar: string | null
  message: string
  isSystem: boolean
  isCorrectGuess: boolean
  pointsAwarded: number
  createdAt: string
}

export type DrawEvent =
  | {
      type: "stroke"
      tool: "pencil" | "eraser"
      color: string
      size: number
      points: { x: number; y: number }[]
      isEnd?: boolean
    }
  | {
      type: "fill"
      x: number
      y: number
      color: string
    }
  | {
      type: "clear"
    }

export function generateMaskedHint(word: string): string {
  return word
    .split("")
    .map((char) => (char === " " ? "  " : "_ "))
    .join("")
    .trim()
}

// ─── Main Hook: usePaintWar ─────────────────────────────────
export function usePaintWar(roomId: string = DEFAULT_PAINT_ROOM_ID) {
  const { user } = useAuth()

  const [room, setRoom] = React.useState<PaintWarRoom | null>(null)
  const [players, setPlayers] = React.useState<PaintWarPlayer[]>([])
  const [messages, setMessages] = React.useState<PaintWarMessage[]>([])
  const [wordChoices, setWordChoices] = React.useState<WordItem[]>([])
  const [timeLeft, setTimeLeft] = React.useState<number>(60)
  const [isLoading, setIsLoading] = React.useState<boolean>(true)

  // External listener for incoming realtime draw events
  const drawEventListenerRef = React.useRef<((event: DrawEvent) => void) | null>(null)

  const isCurrentDrawer = Boolean(user && room && room.currentDrawerId === user.id)
  const myPlayer = React.useMemo(
    () => players.find((p) => p.userId === user?.id),
    [players, user?.id]
  )
  const hasGuessedWord = Boolean(myPlayer?.hasGuessed)

  // ─── 1. Fetch Initial Data ────────────────────────────────
  const fetchRoomData = React.useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return

    try {
      // Room
      const { data: roomData, error: roomError } = await supabase
        .from("paint_war_rooms")
        .select("*")
        .eq("id", roomId)
        .maybeSingle()

      if (!roomError && roomData) {
        setRoom({
          id: roomData.id,
          status: roomData.status as PaintWarRoom["status"],
          currentDrawerId: roomData.current_drawer_id,
          currentDrawerName: roomData.current_drawer_name,
          currentDrawerAvatar: roomData.current_drawer_avatar,
          currentWord: roomData.current_word,
          wordHint: roomData.word_hint,
          category: roomData.category,
          roundNumber: roomData.round_number,
          totalRounds: roomData.total_rounds,
          roundStartTime: roomData.round_start_time,
          roundDurationSec: roomData.round_duration_sec,
          canvasSnapshot: roomData.canvas_snapshot,
          createdAt: roomData.created_at,
          updatedAt: roomData.updated_at,
        })
      }

      // Players
      const { data: playersData } = await supabase
        .from("paint_war_players")
        .select("*")
        .eq("room_id", roomId)
        .order("score", { ascending: false })

      if (playersData) {
        setPlayers(
          playersData.map((p) => ({
            id: p.id,
            roomId: p.room_id,
            userId: p.user_id,
            userName: p.user_name,
            userAvatar: p.user_avatar,
            score: p.score,
            hasGuessed: p.has_guessed,
            isDrawing: p.is_drawing,
            isOnline: p.is_online,
            lastSeen: p.last_seen,
            createdAt: p.created_at,
          }))
        )
      }

      // Messages (recent 50)
      const { data: messagesData } = await supabase
        .from("paint_war_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(50)

      if (messagesData) {
        setMessages(
          messagesData.map((m) => ({
            id: m.id,
            roomId: m.room_id,
            userId: m.user_id,
            userName: m.user_name,
            userAvatar: m.user_avatar,
            message: m.message,
            isSystem: m.is_system,
            isCorrectGuess: m.is_correct_guess,
            pointsAwarded: m.points_awarded,
            createdAt: m.created_at,
          }))
        )
      }
    } catch (err) {
      console.warn("Error fetching paint war data:", err)
    } finally {
      setIsLoading(false)
    }
  }, [roomId])

  // ─── 2. Join / Register Player ────────────────────────────
  React.useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !user) return

    let isMounted = true

    const joinLobby = async () => {
      if (!supabase) return
      try {
        await supabase.from("paint_war_players").upsert(
          {
            room_id: roomId,
            user_id: user.id,
            user_name: user.name || "Anon Player",
            user_avatar: user.avatarUrl || null,
            is_online: true,
            last_seen: new Date().toISOString(),
          },
          { onConflict: "room_id,user_id" }
        )
        if (isMounted) fetchRoomData()
      } catch (err) {
        console.warn("Could not join paint war lobby:", err)
      }
    }

    joinLobby()

    // Heartbeat every 20s
    const heartbeat = setInterval(() => {
      if (supabase && user) {
        supabase
          .from("paint_war_players")
          .update({ last_seen: new Date().toISOString(), is_online: true })
          .match({ room_id: roomId, user_id: user.id })
          .then()
      }
    }, 20000)

    const setOffline = () => {
      if (supabase && user) {
        supabase
          .from("paint_war_players")
          .update({ is_online: false })
          .match({ room_id: roomId, user_id: user.id })
          .then()
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", setOffline)
    }

    return () => {
      isMounted = false
      clearInterval(heartbeat)
      if (typeof window !== "undefined") {
        window.removeEventListener("beforeunload", setOffline)
      }
      setOffline()
    }
  }, [roomId, user, fetchRoomData])

  // ─── 3. Realtime Subscription (DB Changes + Broadcast Canvas) ──
  React.useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return

    const channelName = `paint-war-lobby-${roomId}`
    const channel = supabase.channel(channelName)

    // A. Broadcast draw events (ultra-low latency)
    channel
      .on("broadcast", { event: "draw_event" }, ({ payload }) => {
        if (payload && drawEventListenerRef.current) {
          drawEventListenerRef.current(payload as DrawEvent)
        }
      })

      // B. DB changes on room
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "paint_war_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            const row = payload.new as any
            setRoom({
              id: row.id,
              status: row.status,
              currentDrawerId: row.current_drawer_id,
              currentDrawerName: row.current_drawer_name,
              currentDrawerAvatar: row.current_drawer_avatar,
              currentWord: row.current_word,
              wordHint: row.word_hint,
              category: row.category,
              roundNumber: row.round_number,
              totalRounds: row.total_rounds,
              roundStartTime: row.round_start_time,
              roundDurationSec: row.round_duration_sec,
              canvasSnapshot: row.canvas_snapshot,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            })
          }
        }
      )

      // C. DB changes on players
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "paint_war_players",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          // Refetch players to maintain proper sorting by score
          if (supabase) {
            supabase
              .from("paint_war_players")
              .select("*")
              .eq("room_id", roomId)
              .order("score", { ascending: false })
              .then(({ data }) => {
                if (data) {
                  setPlayers(
                    data.map((p) => ({
                      id: p.id,
                      roomId: p.room_id,
                      userId: p.user_id,
                      userName: p.user_name,
                      userAvatar: p.user_avatar,
                      score: p.score,
                      hasGuessed: p.has_guessed,
                      isDrawing: p.is_drawing,
                      isOnline: p.is_online,
                      lastSeen: p.last_seen,
                      createdAt: p.created_at,
                    }))
                  )
                }
              })
          }
        }
      )

      // D. DB changes on messages
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "paint_war_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const row = payload.new as any
          const newMsg: PaintWarMessage = {
            id: row.id,
            roomId: row.room_id,
            userId: row.user_id,
            userName: row.user_name,
            userAvatar: row.user_avatar,
            message: row.message,
            isSystem: row.is_system,
            isCorrectGuess: row.is_correct_guess,
            pointsAwarded: row.points_awarded,
            createdAt: row.created_at,
          }
          setMessages((prev) => [...prev, newMsg])

          if (newMsg.isCorrectGuess) {
            playRetroCorrectSound()
          }
        }
      )
      .subscribe()

    return () => {
      supabase?.removeChannel(channel)
    }
  }, [roomId])

  // ─── 4. Synced Countdown Timer ────────────────────────────
  React.useEffect(() => {
    if (!room || room.status !== "drawing" || !room.roundStartTime) {
      if (room?.status === "waiting") setTimeLeft(60)
      return
    }

    const interval = setInterval(() => {
      const startTime = new Date(room.roundStartTime!).getTime()
      const now = Date.now()
      const elapsedSec = Math.floor((now - startTime) / 1000)
      const remain = Math.max(0, room.roundDurationSec - elapsedSec)
      setTimeLeft(remain)

      // When timer hits 0 and current user is drawer or admin, trigger round end
      if (remain === 0 && (isCurrentDrawer || user?.role === "admin")) {
        handleEndRound()
      }
    }, 500)

    return () => clearInterval(interval)
  }, [room?.status, room?.roundStartTime, room?.roundDurationSec, isCurrentDrawer, user?.role])

  // ─── 5. Actions ───────────────────────────────────────────

  // Broadcast Draw Event helper
  const broadcastCanvasEvent = React.useCallback(
    (event: DrawEvent) => {
      if (!isSupabaseConfigured || !supabase) return
      const channel = supabase.channel(`paint-war-lobby-${roomId}`)
      channel.send({
        type: "broadcast",
        event: "draw_event",
        payload: event,
      })
    },
    [roomId]
  )

  // End Round
  const handleEndRound = React.useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return

    try {
      const revealedWord = room?.currentWord || "???"
      await supabase
        .from("paint_war_rooms")
        .update({
          status: "round_ended",
          updated_at: new Date().toISOString(),
        })
        .eq("id", roomId)

      await supabase.from("paint_war_messages").insert({
        room_id: roomId,
        user_id: "system",
        user_name: "SYSTEM",
        message: `⏰ Waktu habis! Kata rahasianya adalah: "${revealedWord}"`,
        is_system: true,
      })

      playRetroBuzzerSound()
    } catch (err) {
      console.warn("endRound error:", err)
    }
  }, [roomId, room?.currentWord])

  // Start / Next Turn
  const startNextTurn = React.useCallback(
    async (targetDrawerId?: string) => {
      if (!isSupabaseConfigured || !supabase || !user) return

      try {
        const onlinePlayers = players.filter((p) => p.isOnline)
        if (onlinePlayers.length === 0) return

        let nextDrawer = onlinePlayers[0]
        if (targetDrawerId) {
          const found = onlinePlayers.find((p) => p.userId === targetDrawerId)
          if (found) nextDrawer = found
        } else if (room?.currentDrawerId) {
          const currentIndex = onlinePlayers.findIndex(
            (p) => p.userId === room.currentDrawerId
          )
          const nextIndex = (currentIndex + 1) % onlinePlayers.length
          nextDrawer = onlinePlayers[nextIndex]
        }

        // Reset has_guessed on all players for this room
        await supabase
          .from("paint_war_players")
          .update({ has_guessed: false, is_drawing: false })
          .eq("room_id", roomId)

        // Set drawer flag
        await supabase
          .from("paint_war_players")
          .update({ is_drawing: true })
          .match({ room_id: roomId, user_id: nextDrawer.userId })

        // Update room status to selecting_word
        await supabase
          .from("paint_war_rooms")
          .update({
            status: "selecting_word",
            current_drawer_id: nextDrawer.userId,
            current_drawer_name: nextDrawer.userName,
            current_drawer_avatar: nextDrawer.userAvatar,
            current_word: null,
            word_hint: null,
            canvas_snapshot: null,
            round_start_time: null,
            round_number: (room?.roundNumber || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", roomId)

        // Post system message
        await supabase.from("paint_war_messages").insert({
          room_id: roomId,
          user_id: "system",
          user_name: "SYSTEM",
          message: `🎮 Giliran ${nextDrawer.userName} memilih kata untuk digambar!`,
          is_system: true,
        })

        // Broadcast clear canvas
        broadcastCanvasEvent({ type: "clear" })
        playRetroNotificationSound()
      } catch (err) {
        console.warn("startNextTurn error:", err)
      }
    },
    [roomId, user, players, room, broadcastCanvasEvent]
  )

  // Drawer chooses a word to start drawing
  const selectWordAndStartRound = React.useCallback(
    async (selectedWordItem: WordItem) => {
      if (!isSupabaseConfigured || !supabase || !user) return

      try {
        const masked = generateMaskedHint(selectedWordItem.word)

        await supabase
          .from("paint_war_rooms")
          .update({
            status: "drawing",
            current_word: selectedWordItem.word.toUpperCase(),
            word_hint: `${masked} (${selectedWordItem.word.replace(/\s/g, "").length} huruf)`,
            category: selectedWordItem.category,
            round_start_time: new Date().toISOString(),
            round_duration_sec: 60,
            canvas_snapshot: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", roomId)

        // System message
        await supabase.from("paint_war_messages").insert({
          room_id: roomId,
          user_id: "system",
          user_name: "SYSTEM",
          message: `🎨 ${user.name} mulai menggambar! Kategori: [${selectedWordItem.category}]. Tebak sekarang!`,
          is_system: true,
        })

        broadcastCanvasEvent({ type: "clear" })
        playRetroRoundStartSound()
      } catch (err) {
        console.warn("selectWord error:", err)
      }
    },
    [roomId, user, broadcastCanvasEvent]
  )

  // Send Guess Message
  const sendGuess = React.useCallback(
    async (text: string) => {
      if (!isSupabaseConfigured || !supabase || !user || !text.trim()) return

      const cleanText = text.trim()
      const normalizedGuess = cleanText.toUpperCase().replace(/\s+/g, " ")
      const targetWord = (room?.currentWord || "").toUpperCase().trim()

      const isGuessingActive = room?.status === "drawing" && targetWord.length > 0
      const isCorrect =
        isGuessingActive &&
        !isCurrentDrawer &&
        !hasGuessedWord &&
        normalizedGuess === targetWord

      try {
        if (isCorrect) {
          // Calculate score based on remaining time (max 100, min 25)
          const points = Math.max(25, Math.floor((timeLeft / (room?.roundDurationSec || 60)) * 100))
          const currentScore = myPlayer?.score || 0
          const newPlayerScore = currentScore + points

          // Update player record
          await supabase
            .from("paint_war_players")
            .update({
              score: newPlayerScore,
              has_guessed: true,
            })
            .match({ room_id: roomId, user_id: user.id })

          // Award drawer bonus 25 pts
          if (room?.currentDrawerId) {
            const drawer = players.find((p) => p.userId === room.currentDrawerId)
            if (drawer) {
              await supabase
                .from("paint_war_players")
                .update({ score: drawer.score + 25 })
                .match({ room_id: roomId, user_id: room.currentDrawerId })
            }
          }

          // Insert announcement in chat
          await supabase.from("paint_war_messages").insert({
            room_id: roomId,
            user_id: user.id,
            user_name: user.name || "Pemain",
            user_avatar: user.avatarUrl || null,
            message: `🎉 MENEBAK DENGAN BENAR! (+${points} poin)`,
            is_system: false,
            is_correct_guess: true,
            points_awarded: points,
          })

          // Check if all other players have guessed
          const nonDrawers = players.filter(
            (p) => p.userId !== room?.currentDrawerId && p.isOnline
          )
          const allGuessed = nonDrawers.every(
            (p) => p.userId === user.id || p.hasGuessed
          )
          if (allGuessed && nonDrawers.length > 0) {
            handleEndRound()
          }
        } else {
          // Regular chat / wrong guess
          const containsWord =
            targetWord.length > 2 && normalizedGuess.includes(targetWord)
          const messageContent =
            containsWord && (hasGuessedWord || isCurrentDrawer)
              ? "••••• (disensor karena membocorkan kata)"
              : cleanText

          await supabase.from("paint_war_messages").insert({
            room_id: roomId,
            user_id: user.id,
            user_name: user.name || "Pemain",
            user_avatar: user.avatarUrl || null,
            message: messageContent,
            is_system: false,
            is_correct_guess: false,
            points_awarded: 0,
          })
        }
      } catch (err) {
        console.warn("sendGuess error:", err)
      }
    },
    [
      roomId,
      user,
      room,
      isCurrentDrawer,
      hasGuessedWord,
      timeLeft,
      myPlayer,
      players,
      handleEndRound,
    ]
  )

  // Save Snapshot periodically / on stroke end
  const saveCanvasSnapshot = React.useCallback(
    async (snapshotDataUrl: string) => {
      if (!isSupabaseConfigured || !supabase || !isCurrentDrawer) return
      try {
        await supabase
          .from("paint_war_rooms")
          .update({ canvas_snapshot: snapshotDataUrl })
          .eq("id", roomId)
      } catch (err) {
        console.warn("saveCanvasSnapshot error:", err)
      }
    },
    [roomId, isCurrentDrawer]
  )

  // Reset Match Scores
  const resetMatchScores = React.useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return
    try {
      await supabase
        .from("paint_war_players")
        .update({ score: 0, has_guessed: false })
        .eq("room_id", roomId)

      await supabase
        .from("paint_war_rooms")
        .update({
          status: "waiting",
          current_drawer_id: null,
          current_drawer_name: null,
          current_word: null,
          word_hint: null,
          round_number: 1,
          canvas_snapshot: null,
          round_start_time: null,
        })
        .eq("id", roomId)

      await supabase.from("paint_war_messages").insert({
        room_id: roomId,
        user_id: "system",
        user_name: "SYSTEM",
        message: "🔄 Skor dan sesi game telah di-reset kembali ke awal.",
        is_system: true,
      })

      broadcastCanvasEvent({ type: "clear" })
    } catch (err) {
      console.warn("resetMatchScores error:", err)
    }
  }, [roomId, broadcastCanvasEvent])

  // Register draw event listener for canvas component
  const setDrawEventListener = React.useCallback(
    (fn: ((event: DrawEvent) => void) | null) => {
      drawEventListenerRef.current = fn
    },
    []
  )

  return {
    room,
    players,
    messages,
    wordChoices,
    timeLeft,
    isLoading,
    isCurrentDrawer,
    hasGuessedWord,
    myPlayer,
    startNextTurn,
    selectWordAndStartRound,
    handleEndRound,
    sendGuess,
    broadcastCanvasEvent,
    saveCanvasSnapshot,
    resetMatchScores,
    setDrawEventListener,
  }
}
