"use client"

import * as React from "react"
import { BilliardCanvas } from "./billiard/billiard-canvas"
import {
  Ball,
  GameState,
  PlayerId,
  ShotResult,
  BilliardRealtimeMessage,
} from "@/lib/billiard/types"
import {
  createInitialBalls,
  stepPhysics,
  areBallsAtRest,
  stopSlowBalls,
  findClosestValidCuePlacement,
} from "@/lib/billiard/physics"
import { evaluateShot, countRemainingBalls } from "@/lib/billiard/rules"
import {
  playCueHitSound,
  playFoulSound,
  playTimerTickSound,
  playReactionSound,
  playVictorySound,
  setBilliardSoundEnabled,
} from "@/lib/billiard/sound"
import {
  useBilliardOnline,
  useBilliardLobby,
} from "@/lib/billiard/online-store"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { recordBilliardMatchAction } from "@/app/actions/billiard"
import { BilliardLeaderboard } from "./billiard/billiard-leaderboard"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { RetroIcon } from "@/components/ui/retro-icon"
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Globe,
  Users,
  HelpCircle,
  Trophy,
  AlertTriangle,
  Play,
  Copy,
  Check,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Menu,
  MessageCircle,
  Smile,
  X,
} from "lucide-react"

function getBallColor(num: number): string {
  switch (num) {
    case 1:
    case 9:
      return "#FBC02D"
    case 2:
    case 10:
      return "#1976D2"
    case 3:
    case 11:
      return "#D32F2F"
    case 4:
    case 12:
      return "#7B1FA2"
    case 5:
    case 13:
      return "#F57C00"
    case 6:
    case 14:
      return "#388E3C"
    case 7:
    case 15:
      return "#5D4037"
    case 8:
      return "#111111"
    default:
      return "#FFFFFF"
  }
}

const DEFAULT_GAME_STATE: GameState = {
  mode: "local",
  currentTurn: "player1",
  phase: "aiming",
  turnTimeLeft: 30,
  isBreakShot: true,
  openTable: true,
  player1: {
    id: "player1",
    name: "Player 1",
    group: null,
    pocketedCount: 0,
  },
  player2: {
    id: "player2",
    name: "Player 2",
    group: null,
    pocketedCount: 0,
  },
  winner: null,
  winReason: null,
  foulMessage: null,
  consecutiveFouls: { player1: 0, player2: 0 },
  pocketedOrder: [],
}

export function BilliardApp() {
  const { user } = useAuth()
  const myPlayerName = user?.name || "Pemain IT"

  // App Screen View: "lobby" saat pertama dibuka, "game" saat sudah ada room / main lokal
  const [appView, setAppView] = React.useState<"lobby" | "game">("lobby")

  const [balls, setBalls] = React.useState<Ball[]>(() => createInitialBalls())
  const [gameState, setGameState] = React.useState<GameState>(() => ({
    ...DEFAULT_GAME_STATE,
    player1: {
      ...DEFAULT_GAME_STATE.player1,
      name: myPlayerName,
    },
  }))

  const [soundOn, setSoundOn] = React.useState(true)
  const [isRulesOpen, setIsRulesOpen] = React.useState(false)
  const [isLeaderboardOpen, setIsLeaderboardOpen] = React.useState(false)
  const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false)
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = React.useState(false)

  // 8 Ball Pool Features: Spin, Quick Chat, Menu
  const [cueSpin, setCueSpin] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isSpinModalOpen, setIsSpinModalOpen] = React.useState(false)
  const [isChatMenuOpen, setIsChatMenuOpen] = React.useState(false)
  const [isMenuDropdownOpen, setIsMenuDropdownOpen] = React.useState(false)
  const [activeChatBubble, setActiveChatBubble] = React.useState<{
    sender: PlayerId
    text: string
  } | null>(null)
  const [chatMenuTab, setChatMenuTab] = React.useState<"emoji" | "phrases">("emoji")
  const [floatingReactions, setFloatingReactions] = React.useState<
    Array<{ id: string; sender: PlayerId; emoji: string; xOffset: number }>
  >([])

  // Online lobby & room state
  const [roomCodeInput, setRoomCodeInput] = React.useState("")
  const [activeRoomCode, setActiveRoomCode] = React.useState<string | null>(null)
  const [isHost, setIsHost] = React.useState(true)
  const [isWaitingForOpponent, setIsWaitingForOpponent] = React.useState(false)
  const [isCopied, setIsCopied] = React.useState(false)

  // Hook untuk discovery room aktif di lobby
  const { activeRooms, announceRoom, leaveLobbyAnnouncement } = useBilliardLobby(myPlayerName)

  // Tracker for current shot
  const shotTrackerRef = React.useRef<{
    cueBallPocketed: boolean
    eightBallPocketed: boolean
    pocketedBalls: number[]
    firstBallHit: number | null
    cushionsHit: number
    spinX?: number
    spinY?: number
    shotAngle?: number
  }>({
    cueBallPocketed: false,
    eightBallPocketed: false,
    pocketedBalls: [],
    firstBallHit: null,
    cushionsHit: 0,
  })

  // ── Trigger Emoji / Reaction Animation & Sound ──
  const triggerReaction = React.useCallback((sender: PlayerId, emoji: string) => {
    playReactionSound()

    const reactionId = `${Date.now()}-${Math.random()}`
    const xOffset = (Math.random() - 0.5) * 28

    setFloatingReactions((prev) => [
      ...prev.slice(-8),
      { id: reactionId, sender, emoji, xOffset },
    ])

    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== reactionId))
    }, 2200)

    setActiveChatBubble({ sender, text: emoji })
    setTimeout(() => {
      setActiveChatBubble((curr) => (curr?.text === emoji ? null : curr))
    }, 2500)
  }, [])

  // ── Disconnect Grace Period State (Cegah false WO saat reconnect singkat / lag sesaat) ──
  const [disconnectCountdown, setDisconnectCountdown] = React.useState<number | null>(null)
  const disconnectTimerRef = React.useRef<NodeJS.Timeout | null>(null)
  const disconnectIntervalRef = React.useRef<NodeJS.Timeout | null>(null)

  const clearDisconnectTimer = React.useCallback(() => {
    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current)
      disconnectTimerRef.current = null
    }
    if (disconnectIntervalRef.current) {
      clearInterval(disconnectIntervalRef.current)
      disconnectIntervalRef.current = null
    }
    setDisconnectCountdown(null)
  }, [])

  React.useEffect(() => {
    return () => {
      clearDisconnectTimer()
    }
  }, [clearDisconnectTimer])

  // ── Online Realtime Message Handler ──
  const handleRemoteMessage = React.useCallback(
    (msg: BilliardRealtimeMessage) => {
      // Setiap kali ada pesan dari lawan, bersihkan timer disconnect karena lawan terbukti aktif
      clearDisconnectTimer()

      if (msg.type === "player_joined") {
        // Lawan bergabung! Jika kita host dan sedang di waiting screen, langsung masuk ke meja
        setIsWaitingForOpponent(false)
        setAppView("game")
      } else if (msg.type === "shot_taken") {
        // Terapkan pukulan dari lawan secara fungsional (bebas dependensi mutable `balls`)
        setBalls((prev) => {
          const next = [...prev]
          const cueBall = next.find((b) => b.number === 0)
          if (cueBall) {
            cueBall.x = msg.cueX
            cueBall.y = msg.cueY
            const speed = msg.power * 24
            cueBall.vx = Math.cos(msg.angle) * speed
            cueBall.vy = Math.sin(msg.angle) * speed
          }
          return next
        })
        playCueHitSound(msg.power)

        shotTrackerRef.current = {
          cueBallPocketed: false,
          eightBallPocketed: false,
          pocketedBalls: [],
          firstBallHit: null,
          cushionsHit: 0,
          spinX: msg.spinX || 0,
          spinY: msg.spinY || 0,
          shotAngle: msg.angle,
        }
        setGameState((prev) => ({ ...prev, phase: "simulating" }))
      } else if (msg.type === "ball_placed") {
        setBalls((prev) => {
          const next = [...prev]
          const cueBall = next.find((b) => b.number === 0)
          if (cueBall) {
            cueBall.x = msg.x
            cueBall.y = msg.y
            cueBall.vx = 0
            cueBall.vy = 0
            cueBall.isPocketed = false
            cueBall.pocketAnimationProgress = undefined
          }
          return next
        })
        setGameState((prev) => ({ ...prev, phase: "aiming", foulMessage: null }))
      } else if (msg.type === "quick_chat") {
        setActiveChatBubble({ sender: msg.sender, text: msg.text })
        setTimeout(() => setActiveChatBubble(null), 3500)
      } else if (msg.type === "emoji_reaction") {
        triggerReaction(msg.sender, msg.emoji)
      } else if (msg.type === "sync_balls") {
        // Sync posisi bola dari host
        setBalls((prev) =>
          prev.map((b) => {
            const remoteB = msg.balls.find((rb) => rb.id === b.id)
            if (!remoteB) return b
            return {
              ...b,
              x: remoteB.x,
              y: remoteB.y,
              vx: remoteB.vx,
              vy: remoteB.vy,
              isPocketed: remoteB.isPocketed,
            }
          })
        )
        setGameState((prev) => ({
          ...prev,
          currentTurn: msg.currentTurn,
          phase: msg.phase,
          winner: msg.winner,
          pocketedOrder: msg.pocketedOrder || prev.pocketedOrder,
        }))
      } else if (msg.type === "rematch") {
        matchSubmittedRef.current = null
        clearDisconnectTimer()
        setBalls(createInitialBalls())
        setGameState((prev) => ({
          ...DEFAULT_GAME_STATE,
          mode: "online",
          roomCode: activeRoomCode || undefined,
          isHost,
          player1: prev.player1,
          player2: prev.player2,
        }))
      } else if (msg.type === "player_forfeited") {
        clearDisconnectTimer()
        const myPlayerId: PlayerId = isHost ? "player1" : "player2"
        setGameState((prev) => {
          if (prev.mode !== "online" || prev.winner) return prev
          return {
            ...prev,
            winner: myPlayerId,
            winReason: `${msg.leaverName || "Lawan"} menyerah / meninggalkan permainan (WO). Kemenangan otomatis diberikan kepadamu!`,
            phase: "game_over",
          }
        })
        playVictorySound()
      }
    },
    [activeRoomCode, isHost, triggerReaction, clearDisconnectTimer]
  )

  // Lawan terputus koneksi (Supabase Presence leave) — berikan grace period 15 detik sebelum memutuskan WO
  const handleOpponentDisconnected = React.useCallback(
    (leaverName?: string) => {
      setGameState((prev) => {
        if (prev.mode !== "online" || prev.winner) return prev
        // Jangan timpa jika timer WO sedang berjalan
        if (disconnectTimerRef.current) return prev

        let remaining = 15
        setDisconnectCountdown(remaining)

        disconnectIntervalRef.current = setInterval(() => {
          remaining -= 1
          if (remaining <= 0) {
            if (disconnectIntervalRef.current) {
              clearInterval(disconnectIntervalRef.current)
              disconnectIntervalRef.current = null
            }
            setDisconnectCountdown(null)
          } else {
            setDisconnectCountdown(remaining)
          }
        }, 1000)

        disconnectTimerRef.current = setTimeout(() => {
          clearDisconnectTimer()
          setGameState((current) => {
            if (current.mode !== "online" || current.winner) return current
            const myPlayerId: PlayerId = isHost ? "player1" : "player2"
            return {
              ...current,
              winner: myPlayerId,
              winReason: `${leaverName || current.player2.name || "Lawan"} terputus dan tidak kembali dalam batas waktu (WO). Kemenangan otomatis diberikan kepadamu!`,
              phase: "game_over",
            }
          })
          playVictorySound()
        }, 15000)

        return prev
      })
    },
    [isHost, clearDisconnectTimer]
  )

  const { isConnected, opponentName, sendEvent } = useBilliardOnline({
    roomCode: activeRoomCode,
    playerName: myPlayerName,
    onMessageReceived: handleRemoteMessage,
    onOpponentDisconnected: handleOpponentDisconnected,
  })

  // Update opponent name when they connect or reconnect
  React.useEffect(() => {
    if (opponentName) {
      clearDisconnectTimer()
      setGameState((prev) => ({
        ...prev,
        player2: {
          ...prev.player2,
          name: opponentName,
        },
      }))
      if (isWaitingForOpponent) {
        setIsWaitingForOpponent(false)
        setAppView("game")
      }
    }
  }, [opponentName, isWaitingForOpponent, clearDisconnectTimer])

  // Toggle audio
  const handleToggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    setBilliardSoundEnabled(next)
  }

  // ── Physics Simulation Loop ──
  React.useEffect(() => {
    if (gameState.phase !== "simulating" || appView !== "game") return

    let animId: number
    const tracker = {
      firstBallHit: shotTrackerRef.current.firstBallHit,
      cushionsHit: shotTrackerRef.current.cushionsHit,
      pocketedThisShot: [] as number[],
    }

    const step = () => {
      // Jalankan 2 sub-step fisika per frame untuk akurasi tinggi & cegah tunneling
      stepPhysics(balls, tracker)
      stepPhysics(balls, tracker)

      // Catat bola yang masuk
      tracker.pocketedThisShot.forEach((num) => {
        if (!shotTrackerRef.current.pocketedBalls.includes(num)) {
          shotTrackerRef.current.pocketedBalls.push(num)
        }
        if (num === 0) shotTrackerRef.current.cueBallPocketed = true
        if (num === 8) shotTrackerRef.current.eightBallPocketed = true
      })
      shotTrackerRef.current.firstBallHit = tracker.firstBallHit
      shotTrackerRef.current.cushionsHit = tracker.cushionsHit

      if (areBallsAtRest(balls)) {
        stopSlowBalls(balls)

        // Evaluasi tembakan sesuai aturan 8-Ball
        const shotResult: ShotResult = {
          cueBallPocketed: shotTrackerRef.current.cueBallPocketed,
          eightBallPocketed: shotTrackerRef.current.eightBallPocketed,
          pocketedBalls: shotTrackerRef.current.pocketedBalls,
          firstBallHit: shotTrackerRef.current.firstBallHit,
          cushionsHitAfterContact: shotTrackerRef.current.cushionsHit,
          isLegalBreak: true,
        }

        const evalResult = evaluateShot(gameState, balls, shotResult)

        // Sync ke remote jika online & host
        if (gameState.mode === "online" && isHost) {
          sendEvent({
            type: "sync_balls",
            balls: balls.map((b) => ({
              id: b.id,
              x: b.x,
              y: b.y,
              vx: b.vx,
              vy: b.vy,
              isPocketed: b.isPocketed,
            })),
            currentTurn: evalResult.nextTurn,
            phase: evalResult.nextPhase,
            winner: evalResult.winner,
            pocketedOrder: gameState.pocketedOrder,
          })
        }

        setGameState((prev) => ({
          ...prev,
          currentTurn: evalResult.nextTurn,
          phase: evalResult.nextPhase,
          winner: evalResult.winner,
          winReason: evalResult.winReason,
          foulMessage: evalResult.foulMessage,
          openTable: evalResult.openTable,
          isBreakShot: false,
          turnTimeLeft: 30,
          player1: {
            ...prev.player1,
            group: evalResult.assignedGroups?.player1 || prev.player1.group,
          },
          player2: {
            ...prev.player2,
            group: evalResult.assignedGroups?.player2 || prev.player2.group,
          },
        }))
        return
      }

      animId = requestAnimationFrame(step)
    }

    animId = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(animId)
    }
  }, [gameState.phase, appView, balls, gameState, isHost, sendEvent])

  // ── 30-Second Shot Turn Timer ──
  React.useEffect(() => {
    if (appView !== "game") return
    if (gameState.phase !== "aiming" && gameState.phase !== "ball_in_hand") {
      return
    }

    const timer = setInterval(() => {
      setGameState((prev) => {
        if (prev.turnTimeLeft <= 1) {
          // Waktu habis = FOUL! Giliran berpindah dengan ball in hand
          playFoulSound()
          const opponent: PlayerId =
            prev.currentTurn === "player1" ? "player2" : "player1"
          return {
            ...prev,
            currentTurn: opponent,
            phase: "ball_in_hand",
            turnTimeLeft: 30,
            foulMessage: `Waktu ${prev[prev.currentTurn].name} habis! Ball in hand untuk lawan.`,
          }
        }

        if (prev.turnTimeLeft <= 6) {
          playTimerTickSound()
        }

        return {
          ...prev,
          turnTimeLeft: prev.turnTimeLeft - 1,
        }
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [appView, gameState.phase, gameState.currentTurn])

  // ── Auto-submit Match Result ke Klasemen Tim saat Game Selesai (Khusus Online Multiplayer) ──
  const matchSubmittedRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    // Klasemen tim hanya diperuntukkan bagi mode online multiplayer
    if (!gameState.winner || gameState.mode !== "online") return

    const myPlayerId: PlayerId = isHost ? "player1" : "player2"
    const won = gameState.winner === myPlayerId
    const myPocketed =
      myPlayerId === "player1"
        ? gameState.player1.pocketedCount
        : gameState.player2.pocketedCount

    // Cegah double recording untuk sesi pertandingan yang sama
    const matchKey = `${activeRoomCode || "online"}-${gameState.winner}-${myPlayerId}`
    if (matchSubmittedRef.current === matchKey) return
    matchSubmittedRef.current = matchKey

    const submitStats = async () => {
      try {
        const token =
          (await supabase?.auth.getSession())?.data.session?.access_token ?? null
        if (token) {
          await recordBilliardMatchAction(token, {
            won,
            ballsPocketed: myPocketed,
          })
        }
      } catch {
        // Silently fail jika offline
      }
    }

    void submitStats()
  }, [
    gameState.winner,
    gameState.mode,
    isHost,
    gameState.player1.pocketedCount,
    gameState.player2.pocketedCount,
    activeRoomCode,
  ])

  // ── Quick Chat Sender ──
  const handleSendQuickChat = (text: string) => {
    setIsChatMenuOpen(false)
    const myPlayerId: PlayerId =
      gameState.mode === "online" ? (isHost ? "player1" : "player2") : gameState.currentTurn
    setActiveChatBubble({ sender: myPlayerId, text })
    setTimeout(() => setActiveChatBubble(null), 3500)

    if (gameState.mode === "online") {
      sendEvent({
        type: "quick_chat",
        sender: myPlayerId,
        senderName: myPlayerName,
        text,
      })
    }
  }

  // ── Emoji Reaction Sender (Khusus untuk reaksi ke lawan saat sedang menunggu giliran) ──
  const handleSendReaction = (emoji: string, senderOverride?: PlayerId) => {
    let sender: PlayerId
    if (senderOverride) {
      sender = senderOverride
    } else if (gameState.mode === "online") {
      sender = isHost ? "player1" : "player2"
    } else {
      // Pada mode lokal: jika sedang giliran player1, yang nonton / reaksi adalah player2 (dan sebaliknya)
      sender = gameState.currentTurn === "player1" ? "player2" : "player1"
    }

    triggerReaction(sender, emoji)

    if (gameState.mode === "online") {
      sendEvent({
        type: "emoji_reaction",
        sender,
        senderName: myPlayerName,
        emoji,
      })
    }
  }

  // ── Cue Ball Spin Control Handler ──
  const handleSpinPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const radius = rect.width / 2

    const dx = (e.clientX - cx) / radius
    const dy = (e.clientY - cy) / radius
    const dist = Math.hypot(dx, dy)

    if (dist <= 1) {
      setCueSpin({ x: dx, y: dy })
    } else {
      setCueSpin({ x: dx / dist, y: dy / dist })
    }
  }

  // ── Tembak Bola Putih ──
  const handleShoot = (
    angle: number,
    power: number,
    spin: { x: number; y: number } = { x: 0, y: 0 }
  ) => {
    const cueBall = balls.find((b) => b.number === 0)
    if (!cueBall) return

    const speed = power * 24
    cueBall.vx = Math.cos(angle) * speed
    cueBall.vy = Math.sin(angle) * speed

    playCueHitSound(power)

    shotTrackerRef.current = {
      cueBallPocketed: false,
      eightBallPocketed: false,
      pocketedBalls: [],
      firstBallHit: null,
      cushionsHit: 0,
      spinX: spin.x,
      spinY: spin.y,
      shotAngle: angle,
    }

    if (gameState.mode === "online") {
      sendEvent({
        type: "shot_taken",
        shooter: gameState.currentTurn,
        angle,
        power,
        cueX: cueBall.x,
        cueY: cueBall.y,
        spinX: spin.x,
        spinY: spin.y,
      })
    }

    setGameState((prev) => ({
      ...prev,
      phase: "simulating",
      foulMessage: null,
    }))
  }

  // ── Letakkan Bola Putih saat Ball-in-Hand ──
  const handlePlaceCueBall = (x: number, y: number) => {
    setBalls((prev) =>
      prev.map((b) =>
        b.number === 0
          ? {
              ...b,
              x,
              y,
              vx: 0,
              vy: 0,
              isPocketed: false,
              pocketAnimationProgress: undefined,
            }
          : b
      )
    )

    if (gameState.mode === "online") {
      sendEvent({
        type: "ball_placed",
        shooter: gameState.currentTurn,
        x,
        y,
      })
    }

    setGameState((prev) => ({
      ...prev,
      phase: "aiming",
      foulMessage: null,
    }))
  }

  // Restart / Reset Game
  const resetGame = () => {
    clearDisconnectTimer()
    matchSubmittedRef.current = null
    setBalls(createInitialBalls())
    setGameState((prev) => ({
      ...DEFAULT_GAME_STATE,
      mode: prev.mode,
      roomCode: prev.roomCode,
      isHost: prev.isHost,
      player1: prev.player1,
      player2: prev.player2,
    }))
    setIsResetConfirmOpen(false)

    if (gameState.mode === "online") {
      sendEvent({ type: "rematch" })
    }
  }

  // ── Buat Room Online Baru ──
  const handleCreateRoom = () => {
    clearDisconnectTimer()
    matchSubmittedRef.current = null
    const code = Math.random().toString(36).substring(2, 6).toUpperCase()
    setActiveRoomCode(code)
    setIsHost(true)
    setIsWaitingForOpponent(true)
    announceRoom(code, "waiting")

    setBalls(createInitialBalls())
    setGameState((prev) => ({
      ...DEFAULT_GAME_STATE,
      mode: "online",
      roomCode: code,
      isHost: true,
      player1: { ...prev.player1, name: myPlayerName },
      player2: { ...prev.player2, name: "Menunggu..." },
    }))
  }

  // ── Gabung Room Online Tertentu ──
  const handleJoinSpecificRoom = (code: string) => {
    const cleanCode = code.trim().toUpperCase()
    if (!cleanCode) return
    clearDisconnectTimer()
    matchSubmittedRef.current = null
    setActiveRoomCode(cleanCode)
    setIsHost(false)
    setIsWaitingForOpponent(false)

    setBalls(createInitialBalls())
    setGameState((prev) => ({
      ...DEFAULT_GAME_STATE,
      mode: "online",
      roomCode: cleanCode,
      isHost: false,
      player2: { ...prev.player2, name: myPlayerName },
    }))
    setAppView("game")
  }

  // ── Mulai Mode Lokal (Pass & Play) ──
  const handleStartLocalGame = () => {
    clearDisconnectTimer()
    matchSubmittedRef.current = null
    setActiveRoomCode(null)
    setIsWaitingForOpponent(false)
    leaveLobbyAnnouncement()

    setBalls(createInitialBalls())
    setGameState({
      ...DEFAULT_GAME_STATE,
      mode: "local",
      player1: { ...DEFAULT_GAME_STATE.player1, name: `${myPlayerName} (P1)` },
      player2: { ...DEFAULT_GAME_STATE.player2, name: "Teman (P2)" },
    })
    setAppView("game")
  }

  // ── Tinggalkan Game & Kembali ke Lobby ──
  const handleLeaveToLobby = () => {
    clearDisconnectTimer()
    // Jika sedang di tengah permainan online dan belum selesai, pemain yang keluar dianggap WO (kalah)
    if (gameState.mode === "online" && appView === "game" && !gameState.winner) {
      const myPlayerId: PlayerId = isHost ? "player1" : "player2"
      const myPocketed =
        myPlayerId === "player1"
          ? gameState.player1.pocketedCount
          : gameState.player2.pocketedCount

      // Kirim sinyal WO ke lawan agar lawan otomatis menang & dapat skor kemenangan
      sendEvent({
        type: "player_forfeited",
        leaverId: myPlayerId,
        leaverName: myPlayerName,
      })

      // Catat kekalahan (WO) bagi pemain yang meninggalkan game
      void (async () => {
        try {
          const token =
            (await supabase?.auth.getSession())?.data.session?.access_token ?? null
          if (token) {
            await recordBilliardMatchAction(token, {
              won: false,
              ballsPocketed: myPocketed,
            })
          }
        } catch {
          // Silently fail
        }
      })()
    }

    matchSubmittedRef.current = null
    leaveLobbyAnnouncement()
    setActiveRoomCode(null)
    setIsWaitingForOpponent(false)
    setAppView("lobby")
    setIsLeaveConfirmOpen(false)
  }

  // Peringatkan pemain jika mencoba menutup tab/browser saat pertandingan online masih berlangsung
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (appView === "game" && gameState.mode === "online" && !gameState.winner) {
        const myPlayerId: PlayerId = isHost ? "player1" : "player2"
        sendEvent({
          type: "player_forfeited",
          leaverId: myPlayerId,
          leaverName: myPlayerName,
        })
        e.preventDefault()
        e.returnValue = ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [appView, gameState.mode, gameState.winner, isHost, myPlayerName, sendEvent])

  // Cek apakah pemain saat ini boleh menembak
  const canCurrentPlayerShoot =
    gameState.mode === "local" ||
    (gameState.mode === "online" &&
      ((isHost && gameState.currentTurn === "player1") ||
        (!isHost && gameState.currentTurn === "player2")))

  // Posisi "tidak bermain" (menunggu giliran lawan atau bola sedang meluncur/simulating)
  const isWaitingOpponentTurn =
    gameState.mode === "online"
      ? !canCurrentPlayerShoot || gameState.phase === "simulating"
      : true

  const currentShooterName =
    gameState.currentTurn === "player1"
      ? gameState.player1.name
      : gameState.player2.name

  // Hitung sisa bola tiap grup
  const solidsLeft = countRemainingBalls(balls, "solid")
  const stripesLeft = countRemainingBalls(balls, "stripe")

  return (
    <div className="flex flex-col h-full bg-[#C0C0C0] text-black font-sans select-none overflow-hidden text-xs">
      {/* ── Win98 Classic Menu Bar ── */}
      <div className="flex items-center gap-3 px-2 py-1 bg-[#C0C0C0] border-b border-[#808080] shadow-sm text-xs">
        <div className="flex items-center gap-1">
          {appView === "game" && (
            <>
              <button
                onClick={() => setIsLeaveConfirmOpen(true)}
                className="px-2 py-0.5 hover:bg-[#000080] hover:text-white rounded-[2px] transition-colors flex items-center gap-1 font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Lobby Room</span>
              </button>

              <button
                onClick={() => setIsResetConfirmOpen(true)}
                className="px-2 py-0.5 hover:bg-[#000080] hover:text-white rounded-[2px] transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Ulangi Game</span>
              </button>
            </>
          )}

          {appView === "lobby" && (
            <span className="font-bold text-[#000080] px-1 flex items-center gap-1.5">
              <RetroIcon name="billiard" iconSize={16} className="w-4 h-4 object-contain inline-block shrink-0" />
              <span>POOL LOUNGE 98</span>
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleToggleSound}
            title={soundOn ? "Matikan Suara" : "Nyalakan Suara"}
            className="p-1 hover:bg-[#808080]/30 rounded-[2px]"
          >
            {soundOn ? (
              <Volume2 className="w-3.5 h-3.5 text-gray-800" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-red-600" />
            )}
          </button>

          <button
            onClick={() => setIsRulesOpen(true)}
            className="px-2 py-0.5 hover:bg-[#000080] hover:text-white rounded-[2px] flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Aturan 8-Ball</span>
          </button>

          <button
            onClick={() => setIsLeaderboardOpen(true)}
            className="px-2 py-0.5 bg-yellow-400/20 hover:bg-yellow-400 hover:text-black border border-amber-600/40 rounded-[2px] flex items-center gap-1 font-bold text-amber-900 transition-colors"
            title="Buka Papan Klasemen Juara Tim"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
            <span>Klasemen</span>
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          TAMPILAN 1: LOBBY SCREEN (Buat / Join Room Dulu Sebelum Buka Meja)
         ────────────────────────────────────────────────────────────────────────── */}
      {appView === "lobby" && (
        <div className="flex-1 bg-[#D4D0C8] p-4 flex flex-col justify-between overflow-y-auto">
          <div className="max-w-xl w-full mx-auto space-y-4">
            {/* Header Banner Retro */}
            <div className="p-3 bg-[#000080] text-white border-2 border-white shadow flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded bg-[#102A45] border border-blue-400/40 shadow-inner flex items-center justify-center shrink-0">
                  <RetroIcon name="billiard" iconSize={32} className="w-8 h-8 object-contain drop-shadow" />
                </div>
                <div>
                  <h2 className="font-bold text-sm tracking-wide">
                    BILLIARD 98 — MULTIPLAYER ROOMS
                  </h2>
                  <p className="text-blue-200 text-[11px]">
                    Pilih atau buat room untuk mulai bertanding 8-Ball Pool
                  </p>
                </div>
              </div>
              <div className="text-right text-[10px] text-blue-200 font-mono">
                Pemain: <strong>{myPlayerName}</strong>
              </div>
            </div>

            {/* Waiting State saat Host sedang menunggu lawan */}
            {isWaitingForOpponent && activeRoomCode ? (
              <div className="p-5 bg-white border-2 border-[#808080] shadow text-center space-y-3 animate-in fade-in-50">
                <div className="inline-block p-2 bg-yellow-100 rounded-full border border-yellow-400">
                  <RefreshCw className="w-6 h-6 text-amber-600 animate-spin" />
                </div>
                <h3 className="font-bold text-sm text-black">
                  MENUNGGU LAWAN BERGABUNG...
                </h3>
                <p className="text-gray-600 text-xs">
                  Bagikan kode room di bawah ke teman kantormu agar dia bisa join:
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-2xl font-black px-4 py-1 bg-yellow-100 border-2 border-yellow-500 rounded text-[#000080] tracking-widest">
                    {activeRoomCode}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activeRoomCode)
                      setIsCopied(true)
                      setTimeout(() => setIsCopied(false), 2000)
                    }}
                    className="px-3 py-1.5 bg-[#C0C0C0] border-2 border-white shadow rounded font-bold flex items-center gap-1 active:translate-y-0.5"
                  >
                    {isCopied ? (
                      <Check className="w-4 h-4 text-green-700" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-800" />
                    )}
                    <span>{isCopied ? "Disalin!" : "Salin Kode"}</span>
                  </button>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setIsWaitingForOpponent(false)}
                    className="px-3 py-1 bg-gray-200 hover:bg-gray-300 border border-gray-400 rounded text-gray-700 text-xs"
                  >
                    Batalkan Room
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Kolom Kiri: Buat Room Baru */}
                <div className="p-4 bg-white border-2 border-[#808080] shadow flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2 font-bold text-sm text-[#000080]">
                      <Globe className="w-4 h-4 text-blue-700" />
                      <span>Buat Room Online (Host)</span>
                    </div>
                    <p className="text-gray-600 text-xs leading-relaxed mb-4">
                      Buat room baru secara instan dan dapatkan kode 4 karakter unik untuk ditantang ke teman.
                    </p>
                  </div>
                  <button
                    onClick={handleCreateRoom}
                    className="w-full py-2 bg-[#000080] text-white font-bold rounded-[2px] border-2 border-white shadow hover:bg-blue-900 active:translate-y-0.5 flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                    <span>Buat Room Baru</span>
                  </button>
                </div>

                {/* Kolom Kanan: Gabung dengan Kode Room */}
                <div className="p-4 bg-white border-2 border-[#808080] shadow flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2 font-bold text-sm text-[#000080]">
                      <Users className="w-4 h-4 text-green-700" />
                      <span>Gabung Room Teman</span>
                    </div>
                    <p className="text-gray-600 text-xs leading-relaxed mb-3">
                      Punya kode room dari teman? Masukkan kode 4 digit di bawah ini:
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="KODE"
                        value={roomCodeInput}
                        onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                        className="p-1.5 border-2 border-[#808080] font-mono text-center text-sm font-bold uppercase w-28 bg-[#F5F5F5]"
                      />
                      <button
                        onClick={() => handleJoinSpecificRoom(roomCodeInput)}
                        disabled={roomCodeInput.trim().length < 2}
                        className="flex-1 py-1.5 bg-green-700 text-white font-bold rounded-[2px] border-2 border-white shadow disabled:opacity-50 hover:bg-green-800"
                      >
                        Gabung Room
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Card Papan Klasemen Juara */}
            <div className="p-3 bg-gradient-to-r from-[#1B2A4A] via-[#16233B] to-[#0F172A] border-2 border-yellow-400/80 shadow rounded text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-yellow-400 text-black flex items-center justify-center font-black text-lg shadow shrink-0">
                  🏆
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-xs text-yellow-300 tracking-wide">
                    PAPAN KLASEMEN 8-BALL TIM IT
                  </h4>
                  <p className="text-[11px] text-gray-300 truncate">
                    Lihat peringkat juara, rekor kemenangan, dan statistik pemain biliar kantor
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsLeaderboardOpen(true)}
                className="px-3.5 py-1.5 bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-black font-black text-xs rounded border border-white shadow whitespace-nowrap transition-transform flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <span>Buka Klasemen</span>
                <span>→</span>
              </button>
            </div>

            {/* Daftar Room Aktif (Live Discovery) */}
            <div className="p-3 bg-white border-2 border-[#808080] shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-gray-800 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Room Online yang Sedang Menunggu:</span>
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  {activeRooms.length} room aktif
                </span>
              </div>

              {activeRooms.length === 0 ? (
                <div className="p-4 text-center bg-[#F5F5F5] border border-dashed border-[#808080] rounded text-gray-500 text-xs">
                  Belum ada room yang sedang menunggu lawan. Jadilah yang pertama membuat room!
                </div>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {activeRooms.map((r, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-[#ECE9D8] border border-[#808080] rounded hover:bg-yellow-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-[#000080] text-white font-mono font-bold text-xs rounded">
                          {r.roomCode}
                        </span>
                        <span className="font-bold text-xs text-gray-800">
                          Host: {r.hostName}
                        </span>
                      </div>
                      <button
                        onClick={() => handleJoinSpecificRoom(r.roomCode)}
                        className="px-3 py-1 bg-green-700 text-white font-bold rounded text-xs hover:bg-green-800"
                      >
                        Join Room
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Opsi Mode Offline / Lokal */}
            <div className="p-3 bg-[#E8E8E8] border border-[#808080] rounded flex items-center justify-between gap-3">
              <div>
                <strong className="text-black text-xs block">Mau main offline berdua di 1 layar?</strong>
                <span className="text-gray-600 text-[11px]">
                  Gunakan Mode Lokal (Pass & Play) tanpa koneksi internet atau room code.
                </span>
              </div>
              <button
                onClick={handleStartLocalGame}
                className="px-3 py-1.5 bg-[#C0C0C0] border-2 border-white shadow hover:bg-gray-300 font-bold rounded-[2px] whitespace-nowrap"
              >
                Mulai Main Lokal
              </button>
            </div>
          </div>

          <div className="text-center text-[10px] text-gray-500 font-mono mt-4">
            IT-Things Billiard 98 • Aturan 8-Ball Klasik • Supabase Realtime Engine
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAMPILAN 2: GAMEPLAY SCREEN (Meja Biliar Aktif - Replikasi Persis 8 Ball Pool)
         ────────────────────────────────────────────────────────────────────────── */}
      {appView === "game" && (
        <>
          {/* Top Scoreboard Bar (Authentic 8 Ball Pool Carbon-Slate) */}
          <div className="bg-gradient-to-b from-[#1b222d] via-[#141a23] to-[#0d1219] border-b border-[#2d3a4d] px-2 sm:px-3 py-1.5 flex items-center justify-between shadow-2xl relative select-none">
            {/* Left Controls: Green Menu Button & Yellow Quick Chat Button */}
            <div className="flex items-center gap-1.5 relative">
              <button
                onClick={() => setIsMenuDropdownOpen(!isMenuDropdownOpen)}
                className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#4CAF50] to-[#2E7D32] border border-[#81C784] shadow-md flex items-center justify-center text-white active:scale-95 transition-transform"
                title="Menu Game"
              >
                <Menu className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsChatMenuOpen(!isChatMenuOpen)}
                className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#FFD54F] to-[#FF8F00] border border-[#FFE082] shadow-md flex items-center justify-center text-black active:scale-95 transition-transform"
                title="Quick Chat Phrases 💬"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
              </button>

              {/* Menu Dropdown Popup */}
              {isMenuDropdownOpen && (
                <div className="absolute left-0 top-10 z-50 bg-[#1e2633] p-1.5 rounded-lg border border-[#D4AF37] shadow-2xl flex flex-col gap-1 min-w-[150px] animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => {
                      setIsMenuDropdownOpen(false)
                      handleToggleSound()
                    }}
                    className="px-2.5 py-1 text-left text-xs font-bold text-white hover:bg-white/10 rounded flex items-center justify-between"
                  >
                    <span>Suara Efek</span>
                    {soundOn ? <Volume2 className="w-3.5 h-3.5 text-green-400" /> : <VolumeX className="w-3.5 h-3.5 text-red-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setIsMenuDropdownOpen(false)
                      setIsLeaderboardOpen(true)
                    }}
                    className="px-2.5 py-1 text-left text-xs font-bold text-yellow-300 hover:bg-white/10 rounded flex items-center gap-1.5"
                  >
                    <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Klasemen Juara</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsMenuDropdownOpen(false)
                      setIsRulesOpen(true)
                    }}
                    className="px-2.5 py-1 text-left text-xs font-bold text-white hover:bg-white/10 rounded flex items-center gap-1.5"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                    <span>Aturan 8-Ball</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsMenuDropdownOpen(false)
                      setIsResetConfirmOpen(true)
                    }}
                    className="px-2.5 py-1 text-left text-xs font-bold text-white hover:bg-white/10 rounded flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Ulangi Game</span>
                  </button>
                  <div className="h-[1px] bg-white/10 my-0.5" />
                  <button
                    onClick={() => {
                      setIsMenuDropdownOpen(false)
                      setIsLeaveConfirmOpen(true)
                    }}
                    className="px-2.5 py-1 text-left text-xs font-bold text-red-400 hover:bg-red-500/20 rounded flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Keluar ke Lobby</span>
                  </button>
                </div>
              )}

              {/* Quick Chat & Emoji Reactions Menu Popup */}
              {isChatMenuOpen && (
                <div className="absolute left-10 top-10 z-50 bg-[#1e2633] p-2 rounded-xl border-2 border-[#FFD54F] shadow-2xl flex flex-col gap-1.5 min-w-[210px] animate-in fade-in zoom-in-95 select-none">
                  {/* Header with Tabs & Close button */}
                  <div className="flex items-center justify-between pb-1 border-b border-white/10">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setChatMenuTab("emoji")}
                        className={`px-2 py-0.5 rounded text-[11px] font-black transition-colors ${
                          chatMenuTab === "emoji"
                            ? "bg-yellow-400 text-black shadow-sm"
                            : "text-gray-300 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        😀 Emoji
                      </button>
                      <button
                        type="button"
                        onClick={() => setChatMenuTab("phrases")}
                        className={`px-2 py-0.5 rounded text-[11px] font-black transition-colors ${
                          chatMenuTab === "phrases"
                            ? "bg-yellow-400 text-black shadow-sm"
                            : "text-gray-300 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        💬 Kata
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsChatMenuOpen(false)}
                      className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Tab 1: Emoji Reactions Grid */}
                  {chatMenuTab === "emoji" && (
                    <div>
                      <div className="text-[9px] font-bold text-gray-400 mb-1 px-1 flex items-center justify-between">
                        <span>PILIH REAKSI:</span>
                        <span className="text-[8px] text-yellow-400">Klik untuk kirim</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1 max-h-48 overflow-y-auto p-0.5">
                        {[
                          "😂", "🤣", "😱", "😭", "👏",
                          "🔥", "🎯", "🥱", "🍿", "💀",
                          "☕", "🤫", "🤡", "💸", "🎱",
                          "🤝", "💔", "🍀", "🥳", "🤯",
                        ].map((emoji, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSendReaction(emoji)}
                            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-yellow-400/20 active:scale-125 text-lg flex items-center justify-center transition-all cursor-pointer hover:border hover:border-yellow-400/40"
                            title={`Kirim Reaksi ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Quick Phrases */}
                  {chatMenuTab === "phrases" && (
                    <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
                      {[
                        "Good luck! 🍀",
                        "Nice shot! 🎯",
                        "Thanks! 🙏",
                        "Oops! 😅",
                        "Well played! 👏",
                        "Unlucky! 💔",
                        "In your dreams! 😜",
                        "You got this! 🔥",
                        "Aduh kena foul! 🤦‍♂️",
                        "Cepat woy kelamaan! ⏳",
                      ].map((phrase, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendQuickChat(phrase)}
                          className="px-2.5 py-1 text-left text-xs font-bold text-white hover:bg-yellow-500 hover:text-black rounded transition-colors"
                        >
                          {phrase}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Player 1 Profile Card */}
            <div className="flex items-center gap-2 relative">
              {/* Floating Speech Bubble (P1) */}
              {activeChatBubble?.sender === "player1" && (
                <div className="absolute -bottom-7 left-0 z-50 bg-white text-black text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xl border border-yellow-400 animate-in fade-in zoom-in whitespace-nowrap">
                  💬 {activeChatBubble.text}
                </div>
              )}

              {/* Pink Star Level Badge */}
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#D81B60] to-[#F06292] text-white font-black text-[9px] flex items-center justify-center border-2 border-white/80 shadow-md">
                43
              </div>

              {/* Avatar Box with Turn Timer Ring */}
              <div className="relative w-10 h-10 flex items-center justify-center">
                {/* Floating Reaction Particles over P1 Avatar */}
                {floatingReactions
                  .filter((r) => r.sender === "player1")
                  .map((r) => (
                    <div
                      key={r.id}
                      className="absolute pointer-events-none z-50 animate-billiard-reaction text-3xl select-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                      style={{
                        left: `calc(50% + ${r.xOffset}px)`,
                        bottom: "100%",
                      }}
                    >
                      {r.emoji}
                    </div>
                  ))}

                {gameState.currentTurn === "player1" && gameState.phase !== "game_over" && (
                  <svg className="absolute -inset-1 w-12 h-12 -rotate-90 pointer-events-none">
                    <circle
                      cx="24"
                      cy="24"
                      r="21"
                      className="stroke-black/50"
                      strokeWidth="3.5"
                      fill="transparent"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="21"
                      stroke={
                        gameState.turnTimeLeft > 10
                          ? "#00E676"
                          : gameState.turnTimeLeft > 5
                          ? "#FFD600"
                          : "#FF1744"
                      }
                      strokeWidth="3.5"
                      strokeDasharray={131.9}
                      strokeDashoffset={131.9 * (1 - gameState.turnTimeLeft / 30)}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                )}

                <div
                  className={`w-9 h-9 rounded-lg bg-gradient-to-b from-[#5c3810] to-[#2b1803] border-2 ${
                    gameState.currentTurn === "player1"
                      ? "border-[#FFD700] shadow-[0_0_8px_#FFD700]"
                      : "border-[#8B7355] opacity-80"
                  } overflow-hidden flex items-center justify-center text-white font-black text-xs shadow-inner`}
                >
                  <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-300">
                    P1
                  </span>
                </div>
              </div>

              {/* Name & 7-Slot Ball Tray */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-white font-black text-xs tracking-wide drop-shadow">
                    {gameState.player1.name}
                  </span>
                  {gameState.player1.group && (
                    <span
                      className={`text-[8.5px] px-1 rounded font-black uppercase tracking-wider ${
                        gameState.player1.group === "solid"
                          ? "bg-amber-400 text-black"
                          : "bg-blue-400 text-black"
                      }`}
                    >
                      {gameState.player1.group}
                    </span>
                  )}
                </div>

                {/* 8 Ball Pool Ball Tray (7 circular slots) */}
                <div className="flex items-center gap-0.5 mt-0.5 bg-black/60 px-1.5 py-0.5 rounded-full border border-white/10 shadow-inner">
                  {gameState.player1.group ? (
                    (gameState.player1.group === "solid"
                      ? [1, 2, 3, 4, 5, 6, 7]
                      : [9, 10, 11, 12, 13, 14, 15]
                    ).map((num) => {
                      const b = balls.find((ball) => ball.number === num)
                      const isPocketed = b ? b.isPocketed : false
                      return (
                        <div
                          key={num}
                          title={`Bola ${num} ${isPocketed ? "(Sudah Masuk)" : "(Perlu Dimasukkan)"}`}
                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black transition-all ${
                            isPocketed
                              ? "bg-black/90 border border-white/5 opacity-25 shadow-inner"
                              : "border border-black/50 shadow-sm"
                          }`}
                          style={
                            !isPocketed
                              ? {
                                  background:
                                    num <= 7
                                      ? `radial-gradient(circle at 35% 35%, #fff 0%, ${getBallColor(num)} 55%, #000 100%)`
                                      : `radial-gradient(circle at 35% 35%, #fff 0%, #ddd 40%, ${getBallColor(num)} 70%, #000 100%)`,
                                  color: num <= 7 ? "#fff" : "#000",
                                }
                              : {}
                          }
                        >
                          {!isPocketed && num}
                        </div>
                      )
                    })
                  ) : (
                    <span className="text-[9px] text-gray-400 italic px-1 font-mono">
                      Open Table ({solidsLeft}S / {stripesLeft}St)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Middle: 3D Gold Bet Coins & Prize Pool */}
            <div className="flex flex-col items-center justify-center px-2 py-0.5 bg-black/50 rounded-lg border border-white/10 shadow-inner">
              <div className="flex items-center -space-x-1 filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)] text-[11px]">
                <span>🪙</span>
                <span className="relative -top-0.5">🪙</span>
                <span>🪙</span>
              </div>
              <span className="text-[#FFD700] text-xs font-black tracking-widest filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] leading-none mt-0.5">
                200
              </span>
            </div>

            {/* Player 2 Profile Card */}
            <div className="flex items-center gap-2 relative">
              {/* Floating Speech Bubble (P2) */}
              {activeChatBubble?.sender === "player2" && (
                <div className="absolute -bottom-7 right-0 z-50 bg-white text-black text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xl border border-yellow-400 animate-in fade-in zoom-in whitespace-nowrap">
                  💬 {activeChatBubble.text}
                </div>
              )}

              {/* Name & 7-Slot Ball Tray */}
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1.5">
                  {gameState.player2.group && (
                    <span
                      className={`text-[8.5px] px-1 rounded font-black uppercase tracking-wider ${
                        gameState.player2.group === "solid"
                          ? "bg-amber-400 text-black"
                          : "bg-blue-400 text-black"
                      }`}
                    >
                      {gameState.player2.group}
                    </span>
                  )}
                  <span className="text-white font-black text-xs tracking-wide drop-shadow">
                    {gameState.player2.name}
                  </span>
                </div>

                {/* 8 Ball Pool Ball Tray (7 circular slots) */}
                <div className="flex items-center gap-0.5 mt-0.5 bg-black/60 px-1.5 py-0.5 rounded-full border border-white/10 shadow-inner">
                  {gameState.player2.group ? (
                    (gameState.player2.group === "solid"
                      ? [1, 2, 3, 4, 5, 6, 7]
                      : [9, 10, 11, 12, 13, 14, 15]
                    ).map((num) => {
                      const b = balls.find((ball) => ball.number === num)
                      const isPocketed = b ? b.isPocketed : false
                      return (
                        <div
                          key={num}
                          title={`Bola ${num} ${isPocketed ? "(Sudah Masuk)" : "(Perlu Dimasukkan)"}`}
                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black transition-all ${
                            isPocketed
                              ? "bg-black/90 border border-white/5 opacity-25 shadow-inner"
                              : "border border-black/50 shadow-sm"
                          }`}
                          style={
                            !isPocketed
                              ? {
                                  background:
                                    num <= 7
                                      ? `radial-gradient(circle at 35% 35%, #fff 0%, ${getBallColor(num)} 55%, #000 100%)`
                                      : `radial-gradient(circle at 35% 35%, #fff 0%, #ddd 40%, ${getBallColor(num)} 70%, #000 100%)`,
                                  color: num <= 7 ? "#fff" : "#000",
                                }
                              : {}
                          }
                        >
                          {!isPocketed && num}
                        </div>
                      )
                    })
                  ) : (
                    <span className="text-[9px] text-gray-400 italic px-1 font-mono">
                      Open Table ({solidsLeft}S / {stripesLeft}St)
                    </span>
                  )}
                </div>
              </div>

              {/* Avatar Box with Turn Timer Ring */}
              <div className="relative w-10 h-10 flex items-center justify-center">
                {/* Floating Reaction Particles over P2 Avatar */}
                {floatingReactions
                  .filter((r) => r.sender === "player2")
                  .map((r) => (
                    <div
                      key={r.id}
                      className="absolute pointer-events-none z-50 animate-billiard-reaction text-3xl select-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                      style={{
                        left: `calc(50% + ${r.xOffset}px)`,
                        bottom: "100%",
                      }}
                    >
                      {r.emoji}
                    </div>
                  ))}

                {gameState.currentTurn === "player2" && gameState.phase !== "game_over" && (
                  <svg className="absolute -inset-1 w-12 h-12 -rotate-90 pointer-events-none">
                    <circle
                      cx="24"
                      cy="24"
                      r="21"
                      className="stroke-black/50"
                      strokeWidth="3.5"
                      fill="transparent"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="21"
                      stroke={
                        gameState.turnTimeLeft > 10
                          ? "#00E676"
                          : gameState.turnTimeLeft > 5
                          ? "#FFD600"
                          : "#FF1744"
                      }
                      strokeWidth="3.5"
                      strokeDasharray={131.9}
                      strokeDashoffset={131.9 * (1 - gameState.turnTimeLeft / 30)}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                )}

                <div
                  className={`w-9 h-9 rounded-lg bg-gradient-to-b from-[#1b2238] to-[#0c1221] border-2 ${
                    gameState.currentTurn === "player2"
                      ? "border-[#80D8FF] shadow-[0_0_8px_#80D8FF]"
                      : "border-[#4A6572] opacity-80"
                  } overflow-hidden flex items-center justify-center text-white font-black text-xs shadow-inner`}
                >
                  <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-300">
                    P2
                  </span>
                </div>
              </div>

              {/* Blue Star Level Badge */}
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#1976D2] to-[#42A5F5] text-white font-black text-[9px] flex items-center justify-center border-2 border-white/80 shadow-md">
                46
              </div>
            </div>

            {/* Far Right: Interactive Cue Ball Spin Selector Widget */}
            <div className="flex items-center gap-1.5 relative">
              <div
                onClick={() => setIsSpinModalOpen(!isSpinModalOpen)}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-white via-[#EAEAEA] to-[#BDBDBD] border-2 border-[#D4AF37] shadow-[0_0_8px_rgba(0,0,0,0.8)] relative cursor-pointer active:scale-95 transition-transform flex items-center justify-center"
                title="Atur Spin Bola Putih (Topspin, Backspin/Draw, English)"
              >
                {/* 3D Ball Specular Highlight */}
                <div className="absolute top-1 left-1.5 w-2.5 h-1.5 bg-white/80 rounded-full blur-[0.4px]" />
                {/* Draggable Red Dot Spin Indicator */}
                <div
                  className="w-2.5 h-2.5 rounded-full bg-red-600 border border-white shadow-sm transition-transform duration-75"
                  style={{
                    transform: `translate(${cueSpin.x * 10}px, ${cueSpin.y * 10}px)`,
                  }}
                />
              </div>

              {/* Cue Sticks Icon Badge */}
              <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#00897B] to-[#004D40] border border-[#4DB6AC] shadow flex items-center justify-center text-white text-xs">
                🥢
              </div>

              {/* Interactive Spin Overlay Modal */}
              {isSpinModalOpen && (
                <div className="absolute right-0 top-11 z-50 bg-[#1e2633] p-3 rounded-xl border-2 border-[#D4AF37] shadow-2xl flex flex-col items-center select-none animate-in fade-in zoom-in-95 w-44">
                  <div className="text-[10px] font-black text-[#FFD700] mb-2 uppercase tracking-wider">
                    CUE BALL SPIN
                  </div>
                  <div
                    onPointerDown={handleSpinPointerMove}
                    onPointerMove={(e) => {
                      if (e.buttons === 1) handleSpinPointerMove(e)
                    }}
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-white via-[#E0E0E0] to-[#9E9E9E] border-4 border-[#333] shadow-inner relative cursor-crosshair touch-none"
                  >
                    {/* Grid Crosshair Lines */}
                    <div className="absolute inset-x-0 top-1/2 h-[1px] bg-gray-400/60 -translate-y-1/2" />
                    <div className="absolute inset-y-0 left-1/2 w-[1px] bg-gray-400/60 -translate-x-1/2" />
                    {/* Draggable Red Indicator */}
                    <div
                      className="w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow-md absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                      style={{
                        left: `${(cueSpin.x + 1) * 50}%`,
                        top: `${(cueSpin.y + 1) * 50}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between w-full mt-2 text-[9px] text-gray-300 font-mono">
                    <span>{cueSpin.y < -0.2 ? "Draw (Back)" : cueSpin.y > 0.2 ? "Follow (Top)" : "Center"}</span>
                    <span>{cueSpin.x < -0.2 ? "Left" : cueSpin.x > 0.2 ? "Right" : "No English"}</span>
                  </div>
                  <div className="flex gap-2 mt-2.5 w-full">
                    <button
                      onClick={() => setCueSpin({ x: 0, y: 0 })}
                      className="flex-1 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-[10px] font-bold"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => setIsSpinModalOpen(false)}
                      className="flex-1 py-1 bg-[#D4AF37] hover:bg-yellow-400 text-black rounded text-[10px] font-black"
                    >
                      OK
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Silver Ball Return Rack (Rel Kawat Perak di Atas Meja) ── */}
          <div className="bg-[#12161f] py-0.5 px-4 flex items-center justify-center border-b border-[#222b3a] shadow-inner">
            <div className="relative flex items-center px-3 py-0.5 rounded-full bg-black/40 border border-gray-600 shadow-inner min-w-[220px] max-w-xl w-full h-6 justify-center">
              {/* Double Silver Wire Rail Tracks */}
              <div className="absolute inset-x-3 top-1.5 h-[1.5px] bg-gradient-to-r from-gray-600 via-gray-300 to-gray-600 opacity-70" />
              <div className="absolute inset-x-3 bottom-1.5 h-[1.5px] bg-gradient-to-r from-gray-600 via-gray-300 to-gray-600 opacity-70" />

              {/* Pocketed Balls in sequence */}
              <div className="relative z-10 flex items-center gap-1 overflow-x-auto py-0.5">
                {gameState.pocketedOrder.length === 0 ? (
                  <span className="text-[9px] text-gray-400 font-mono italic">
                    Ball Return Rack (Kosong)
                  </span>
                ) : (
                  gameState.pocketedOrder.map((num, idx) => (
                    <div
                      key={idx}
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black border border-black/50 shadow-sm shrink-0 animate-in zoom-in-50"
                      style={{
                        background:
                          num === 8
                            ? "#000"
                            : num <= 7
                            ? `radial-gradient(circle at 35% 35%, #fff 0%, ${getBallColor(num)} 55%, #000 100%)`
                            : `radial-gradient(circle at 35% 35%, #fff 0%, #ddd 40%, ${getBallColor(num)} 70%, #000 100%)`,
                        color: num <= 7 || num === 8 ? "#fff" : "#000",
                      }}
                    >
                      {num}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Foul / Status Alert Banner */}
          {gameState.foulMessage && (
            <div className="bg-red-100 border-b border-red-400 px-3 py-1 flex items-center justify-between gap-2 text-red-800 text-[11px]">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span>{gameState.foulMessage}</span>
              </div>
              <span className="text-[10px] bg-red-200 px-1.5 py-0.2 rounded text-red-900 font-bold">
                Ball in hand
              </span>
            </div>
          )}

          {/* Ball-in-Hand Action Banner (Memastikan pemain tidak pernah bingung atau stuck) */}
          {gameState.phase === "ball_in_hand" && canCurrentPlayerShoot && (
            <div className="bg-[#FFFFCC] border-b border-[#808080] px-3 py-1 flex items-center justify-between gap-2 text-black text-xs font-bold shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                </span>
                <span>BALL-IN-HAND: Klik atau geser meja untuk memindahkan bola putih.</span>
              </div>
              <button
                onClick={() => {
                  const cueBall = balls.find((b) => b.number === 0)
                  const target = cueBall
                    ? findClosestValidCuePlacement(cueBall.x, cueBall.y, balls)
                    : { x: 200, y: 200 }
                  handlePlaceCueBall(target.x, target.y)
                }}
                className="px-2.5 py-0.5 bg-[#000080] text-white hover:bg-blue-800 active:translate-y-0.5 rounded-[2px] border border-white font-bold flex items-center gap-1 text-[11px] shadow cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-green-300" />
                <span>Siap Tembak</span>
              </button>
            </div>
          )}

          {/* Table & Canvas Area */}
          <div className="flex-1 bg-[#12161f] flex items-center justify-center p-2 sm:p-4 overflow-hidden relative">
            {/* Disconnect Grace Period Alert Banner */}
            {disconnectCountdown !== null && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-[#FFFFCC] text-black px-3.5 py-1.5 rounded-[2px] border-2 border-red-600 shadow-[3px_3px_0px_rgba(0,0,0,0.5)] font-bold flex items-center gap-2 text-xs animate-pulse">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>
                  Lawan terputus! Menunggu koneksi kembali... ({disconnectCountdown}s)
                </span>
              </div>
            )}

            <BilliardCanvas
              balls={balls}
              isAiming={gameState.phase === "aiming"}
              isBallInHand={gameState.phase === "ball_in_hand"}
              canShoot={canCurrentPlayerShoot && gameState.phase !== "simulating"}
              spin={cueSpin}
              onShoot={handleShoot}
              onPlaceCueBall={handlePlaceCueBall}
            />

            {/* Floating Spectator Reaction Dock (Khusus saat posisi tidak bermain / menunggu giliran lawan) */}
            {isWaitingOpponentTurn && gameState.phase !== "game_over" && (
              <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 sm:gap-1.5 bg-[#0e1626]/95 hover:bg-[#0e1626] border-2 border-[#D4AF37] shadow-[0_6px_24px_rgba(0,0,0,0.85)] px-2.5 sm:px-3 py-1 rounded-full backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 select-none max-w-[95%] overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1.5 mr-1 text-[10px] font-black text-amber-400 font-mono shrink-0">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  <span className="hidden sm:inline">
                    {gameState.mode === "online"
                      ? !canCurrentPlayerShoot
                        ? "Giliran Lawan... Reaksi:"
                        : "Bola Bergulir... Reaksi:"
                      : gameState.currentTurn === "player1"
                      ? "Reaksi P2 (Menunggu):"
                      : "Reaksi P1 (Menunggu):"}
                  </span>
                  <span className="sm:hidden">Reaksi:</span>
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                  {["😂", "😱", "👏", "🔥", "🎯", "🍿", "💀", "☕"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleSendReaction(emoji)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-white/20 active:scale-125 transition-transform text-base sm:text-lg flex items-center justify-center cursor-pointer"
                      title={`Kirim Reaksi ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setChatMenuTab("emoji")
                      setIsChatMenuOpen(true)
                    }}
                    className="ml-0.5 sm:ml-1 px-2 py-0.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 hover:text-white rounded-full text-[9px] sm:text-[10px] font-black border border-yellow-500/40 cursor-pointer whitespace-nowrap"
                  >
                    + Lainnya
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Status Bar */}
          <div className="h-6 bg-[#C0C0C0] border-t-2 border-[#FFFFFF] shadow flex items-center justify-between px-2 text-[10px] text-gray-700 font-mono">
            <div className="flex items-center gap-2">
              <span className="text-[#000080] font-bold">POOL98.EXE</span>
              <span>•</span>
              <span>
                {gameState.mode === "online"
                  ? isConnected
                    ? `ONLINE: ROOM ${activeRoomCode} (2 Player)`
                    : "MENGHUBUNGKAN..."
                  : "MODE LOKAL (PASS & PLAY)"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span>Tarik stik ke belakang untuk power</span>
              <span>•</span>
              <span>8 Ball Pool Realistic Engine</span>
            </div>
          </div>
        </>
      )}

      {/* ── Game Over / Winner Modal ── */}
      {gameState.winner && (
        <div className="fixed inset-0 z-[999] bg-black/70 flex items-center justify-center p-4">
          <div className="retro-window-frame max-w-sm w-full bg-[#C0C0C0] p-4 border-2 border-white shadow-[6px_6px_0px_rgba(0,0,0,0.5)] flex flex-col items-center text-center">
            <Trophy className="w-12 h-12 text-yellow-500 mb-2 animate-bounce" />
            <h3 className="text-base font-bold text-[#000080] mb-1">
              PERMAINAN SELESAI!
            </h3>
            <p className="font-bold text-sm text-black mb-2">
              🏆 {gameState[gameState.winner].name} Menang!
            </p>
            <p className="text-gray-700 text-xs mb-4">{gameState.winReason}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={resetGame}
                className="px-3.5 py-1.5 bg-[#000080] text-white font-bold rounded-[2px] border-2 border-white shadow hover:bg-blue-800 active:translate-y-0.5 text-xs"
              >
                Main Lagi (Rematch)
              </button>
              <button
                onClick={() => setIsLeaderboardOpen(true)}
                className="px-3.5 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black rounded-[2px] border-2 border-white shadow active:translate-y-0.5 flex items-center gap-1 text-xs"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Klasemen</span>
              </button>
              <button
                onClick={handleLeaveToLobby}
                className="px-3.5 py-1.5 bg-gray-300 text-black font-bold rounded-[2px] border-2 border-white shadow hover:bg-gray-400 active:translate-y-0.5 text-xs"
              >
                Kembali ke Lobby
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Billiard Leaderboard Modal ── */}
      {isLeaderboardOpen && (
        <BilliardLeaderboard onClose={() => setIsLeaderboardOpen(false)} />
      )}

      {/* ── Aturan 8-Ball Pool Modal ── */}
      {isRulesOpen && (
        <div className="fixed inset-0 z-[999] bg-black/60 flex items-center justify-center p-4">
          <div className="retro-window-frame max-w-md w-full bg-[#C0C0C0] border-2 border-white shadow-[6px_6px_0px_rgba(0,0,0,0.5)]">
            <div className="bg-[#000080] text-white px-2 py-1 flex items-center justify-between font-bold text-xs">
              <span>ATURAN RESMI 8-BALL POOL</span>
              <button
                onClick={() => setIsRulesOpen(false)}
                className="hover:bg-red-600 px-1.5 text-xs font-mono"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-2 text-xs text-gray-800 leading-relaxed max-h-[70vh] overflow-y-auto">
              <p><strong>1. Break Shot:</strong> Pemain 1 menyodok bola putih untuk memecah susunan bola segitiga di awal permainan.</p>
              <p><strong>2. Alokasi Grup:</strong> Meja berstatus <em>Open Table</em> sampai ada bola sah yang masuk. Pemain yang berhasil memasukkan bola Solid (1-7) atau Stripe (9-15) akan mendapatkan grup tersebut.</p>
              <p><strong>3. Legal Shot:</strong> Bola putih wajib menyentuh bola grup sendiri terlebih dahulu. Menyentuh bola lawan atau bola 8 terlebih dahulu adalah <em>Foul</em>.</p>
              <p><strong>4. Penalti Foul & Scratch:</strong> Jika bola putih masuk lubang atau terjadi pelanggaran, lawan mendapatkan <em>Ball in Hand</em> (bebas geser bola putih ke mana saja di meja).</p>
              <p><strong>5. Memasukkan Bola 8:</strong> Bola 8 hitam hanya boleh dimasukkan setelah semua bola grup milikmu sudah habis. Memasukkan bola 8 lebih awal atau scratch saat bola 8 masuk = langsung kalah.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Confirm Dialog ── */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={resetGame}
        title="RESET_GAME.EXE"
        message="Mulai ulang game biliar dari awal? Seluruh susunan bola akan dikocok kembali ke rak segitiga."
        confirmText="Reset Game"
        variant="warning"
      />

      {/* ── Leave to Lobby Confirm Dialog ── */}
      <ConfirmDialog
        isOpen={isLeaveConfirmOpen}
        onClose={() => setIsLeaveConfirmOpen(false)}
        onConfirm={handleLeaveToLobby}
        title="KELUAR_LOBBY.EXE"
        message={
          gameState.mode === "online" && !gameState.winner
            ? "Pertandingan online sedang berlangsung! Jika kamu keluar sekarang, kamu akan dianggap menyerah (Walkover / WO) dan lawan otomatis mendapatkan kemenangan serta poin klasemen."
            : "Tinggalkan permainan biliar saat ini dan kembali ke menu Room Lobby?"
        }
        confirmText={
          gameState.mode === "online" && !gameState.winner
            ? "Menyerah & Keluar"
            : "Kembali ke Lobby"
        }
        variant="warning"
      />

      {/* ── Keyframes Animasi Floating Emoji Reaction ── */}
      <style>{`
        @keyframes billiardReactionFloat {
          0% {
            opacity: 0;
            transform: translate(-50%, 8px) scale(0.6);
          }
          15% {
            opacity: 1;
            transform: translate(-50%, -6px) scale(1.35);
          }
          60% {
            opacity: 1;
            transform: translate(-50%, -30px) scale(1.15) rotate(6deg);
          }
          85% {
            opacity: 0.9;
            transform: translate(-50%, -50px) scale(1) rotate(-6deg);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -68px) scale(0.8);
          }
        }
        .animate-billiard-reaction {
          animation: billiardReactionFloat 2.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>
    </div>
  )
}
