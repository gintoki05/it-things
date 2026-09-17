"use client"

import * as React from "react"
import {
  usePaintWar,
  getRandomWordOptions,
  WordItem,
  DEFAULT_PAINT_ROOM_ID,
} from "@/lib/paint-war-store"
import { PaintCanvas } from "@/components/apps/paint-war/paint-canvas"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { announceGameRoomAction } from "@/app/actions/chat"
import { cn } from "@/lib/utils"
import {
  Send,
  Trophy,
  Users,
  Clock,
  Palette,
  Play,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Medal,
  Settings,
  Sliders,
} from "lucide-react"

export function PaintWarApp() {
  const { user } = useAuth()
  const {
    room,
    players,
    messages,
    timeLeft,
    isLoading,
    isCurrentDrawer,
    hasGuessedWord,
    myPlayer,
    startNextTurn,
    startNewGame,
    selectWordAndStartRound,
    sendGuess,
    broadcastCanvasEvent,
    saveCanvasSnapshot,
    resetToLobby,
    setDrawEventListener,
  } = usePaintWar(DEFAULT_PAINT_ROOM_ID)

  // Local state
  const [guessInput, setGuessInput] = React.useState("")
  const [activeTab, setActiveTab] = React.useState<"chat" | "players">("chat")
  const [wordChoices, setWordChoices] = React.useState<WordItem[]>([])
  const [selectedRounds, setSelectedRounds] = React.useState<number>(5)
  const [selectedDuration, setSelectedDuration] = React.useState<number>(60)
  const [selectedCategory, setSelectedCategory] = React.useState<string>("Campuran")
  const [sortBy, setSortBy] = React.useState<"session" | "total">("session")
  const chatBottomRef = React.useRef<HTMLDivElement | null>(null)

  // Sort players based on selected criteria
  const sortedPlayers = React.useMemo(() => {
    return [...players].sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1
      if (!a.isOnline && b.isOnline) return 1
      if (sortBy === "total") {
        return (b.totalScore || 0) - (a.totalScore || 0)
      }
      return b.score - a.score
    })
  }, [players, sortBy])

  // Auto-scroll chat to bottom
  React.useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // When drawer enters selecting_word, generate 3 word choices based on room category
  React.useEffect(() => {
    if (room?.status === "selecting_word" && isCurrentDrawer) {
      setWordChoices(getRandomWordOptions(3, room?.category))
    }
  }, [room?.status, isCurrentDrawer, room?.category])

  const handleSendGuess = (e: React.FormEvent) => {
    e.preventDefault()
    if (!guessInput.trim()) return
    sendGuess(guessInput)
    setGuessInput("")
  }

  const isGameRunning = room?.status === "drawing"
  const isSelectingWord = room?.status === "selecting_word"
  const isRoundEnded = room?.status === "round_ended"
  const isGameOver = room?.status === "game_over"

  // Cek apakah drawer saat ini sedang online di room
  const isDrawerOnline = Boolean(
    room?.currentDrawerId &&
    players.some((p) => p.userId === room.currentDrawerId && p.isOnline)
  )

  const onlinePlayersCount = players.filter((p) => p.isOnline).length

  return (
    <div className="flex flex-col h-full bg-[#C0C0C0] font-sans text-xs select-none">
      {/* ── 1. Game Top Header & Status Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#D4D0C8] border-b-2 border-[#808080]">
        {/* Left: Round & Category */}
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 bg-white border border-[#808080] font-mono font-bold text-blue-900 shadow-inner flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-blue-700" />
            <span>
              RONDE {Math.min(room?.roundNumber || 1, room?.totalRounds || 5)} / {room?.totalRounds || 5}
            </span>
          </div>

          <div className="px-2 py-1 bg-[#ECE9D8] border border-[#808080] font-mono text-[11px] text-gray-700">
            Kategori: <strong className="text-black">{room?.category || "Campuran"}</strong>
          </div>
        </div>

        {/* Center: Word or Hint Banner */}
        <div className="flex-1 max-w-md mx-2 text-center">
          {isGameRunning ? (
            isCurrentDrawer ? (
              <div className="px-3 py-1 bg-amber-100 border border-amber-500 rounded font-mono text-amber-900">
                Gambar kata ini: <strong className="text-sm tracking-wider font-black text-black">{room?.currentWord}</strong>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 px-3 py-1 bg-white border border-[#808080] rounded font-mono text-black font-bold tracking-widest text-sm shadow-inner">
                <span>{room?.wordHint || "_ _ _ _ _"}</span>
                <span className="text-[10px] font-normal tracking-normal text-purple-700 font-sans">
                  ({room?.currentDrawerName || "Drawer"} menggambar)
                </span>
              </div>
            )
          ) : isSelectingWord ? (
            !isDrawerOnline ? (
              <div className="flex items-center justify-center gap-2 px-3 py-1 bg-red-100 border border-red-500 font-mono text-red-900 font-bold animate-pulse">
                <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                <span>{room?.currentDrawerName || "Drawer"} Offline!</span>
                <button
                  type="button"
                  onClick={() => startNextTurn()}
                  className="px-2 py-0.5 bg-[#000080] text-white text-[10px] font-sans font-bold border border-white hover:bg-blue-800"
                >
                  Ganti Giliran
                </button>
              </div>
            ) : (
              <div className="px-3 py-1 bg-yellow-100 border border-yellow-400 font-mono text-yellow-900 animate-pulse">
                {isCurrentDrawer
                  ? "PILIH KATA UNTUK DIGAMBAR DI BAWAH!"
                  : `Menunggu ${room?.currentDrawerName || "Drawer"} memilih kata...`}
              </div>
            )
          ) : isRoundEnded ? (
            <div className="px-3 py-1 bg-red-100 border border-red-400 font-mono text-red-900 font-bold">
              Kata rahasia: {room?.currentWord}
            </div>
          ) : isGameOver ? (
            <div className="px-3 py-1 bg-amber-100 border border-amber-500 font-mono text-amber-900 font-bold flex items-center justify-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-600" />
              <span>PERTANDINGAN SELESAI ({room?.totalRounds || 5} RONDE)</span>
            </div>
          ) : (
            <div className="px-3 py-1 bg-blue-100 border border-blue-400 font-mono text-blue-900">
              Lobby Siap. Pilih ronde & klik "Mulai Game"!
            </div>
          )}
        </div>

        {/* Right: Timer & Online Players Count */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 border font-mono font-bold shadow-inner transition-colors",
              timeLeft <= 15 && isGameRunning
                ? "bg-red-600 text-white border-red-800 animate-bounce"
                : "bg-white text-black border-[#808080]"
            )}
            title="Sisa waktu ronde"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{isGameRunning ? `${timeLeft}s` : "--"}</span>
          </div>

          <div
            className="flex items-center gap-1 px-2 py-1 bg-[#ECE9D8] border border-[#808080] font-mono text-gray-700"
            title={`${onlinePlayersCount} pemain sedang aktif di room`}
          >
            <Users className="w-3.5 h-3.5 text-blue-800" />
            <span>{onlinePlayersCount} Online</span>
          </div>

          {(isGameOver || isRoundEnded || room?.status === "waiting") && (
            <button
              type="button"
              onClick={() => resetToLobby()}
              className="flex items-center gap-1 px-2 py-1 bg-[#D4D0C8] hover:bg-gray-200 border-2 border-white border-b-[#808080] border-r-[#808080] active:border-[#404040] text-gray-800 font-bold text-[11px]"
              title="Buka panel Lobby Setup"
            >
              <Settings className="w-3.5 h-3.5 text-blue-900" />
              <span>Lobby</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Main Game Body (Canvas + Chat/Scoreboard) ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-2 gap-2">
        {/* ── Sisi Kiri: Canvas & Word Selection Overlay ── */}
        <div className="relative flex-1 flex flex-col min-w-0 bg-[#808080] p-1 border-2 border-[#404040] border-r-white border-b-white">
          <PaintCanvas
            isDrawer={isCurrentDrawer && isGameRunning}
            canvasSnapshot={room?.canvasSnapshot}
            onBroadcastDraw={broadcastCanvasEvent}
            onSaveSnapshot={saveCanvasSnapshot}
            setDrawEventListener={setDrawEventListener}
          />

          {/* Overlay: Pemilihan Kata (Hanya untuk Drawer) */}
          {isSelectingWord && isCurrentDrawer && (
            <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center p-4 z-20">
              <div className="bg-[#C0C0C0] border-2 border-white border-b-[#404040] border-r-[#404040] p-4 max-w-sm w-full shadow-2xl">
                <div className="bg-[#000080] text-white font-bold px-2 py-1 mb-3 text-xs tracking-wider flex items-center justify-between">
                  <span>PILIH_KATA.EXE</span>
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                </div>
                <p className="text-center font-bold text-gray-800 mb-3">
                  Pilih 1 kata rahasia yang mau lu gambar:
                </p>
                <div className="flex flex-col gap-2">
                  {wordChoices.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectWordAndStartRound(item)}
                      className="p-2.5 bg-[#D4D0C8] hover:bg-yellow-100 active:bg-yellow-200 border-2 border-white border-b-[#808080] border-r-[#808080] font-mono text-left flex items-center justify-between group transition-all"
                    >
                      <div>
                        <div className="font-bold text-sm text-black group-hover:text-blue-900">
                          {item.word}
                        </div>
                        <div className="text-[10px] text-gray-600">
                          Petunjuk: {item.hint}
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 bg-blue-900 text-white text-[9px] rounded uppercase font-sans">
                        {item.category}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Overlay: Pemilihan Kata Drawer Sedang Offline */}
          {isSelectingWord && !isCurrentDrawer && !isDrawerOnline && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4 z-20">
              <div className="bg-[#C0C0C0] border-2 border-white border-b-[#404040] border-r-[#404040] p-4 max-w-xs w-full shadow-2xl text-center">
                <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <h3 className="font-bold text-sm text-red-900 mb-1">DRAWER SEDANG OFFLINE</h3>
                <p className="text-gray-700 text-[11px] mb-3">
                  Pemain <strong>{room?.currentDrawerName || "Drawer"}</strong> sedang tidak aktif di room. Klik tombol di bawah untuk mengganti giliran.
                </p>
                <button
                  type="button"
                  onClick={() => startNextTurn()}
                  className="w-full py-2 bg-[#000080] hover:bg-blue-800 text-white font-bold border-2 border-white border-b-[#404040] border-r-[#404040] active:border-[#404040] flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>GANTI GILIRAN SEKARANG</span>
                </button>
              </div>
            </div>
          )}

          {/* Overlay: Game Berakhir / Next Round Bar */}
          {isRoundEnded && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4 z-20">
              <div className="bg-[#C0C0C0] border-2 border-white border-b-[#404040] border-r-[#404040] p-4 max-w-sm w-full shadow-2xl text-center">
                <div className="bg-red-800 text-white font-bold px-2 py-1 mb-2 text-xs">
                  RONDE {Math.min(room?.roundNumber || 1, room?.totalRounds || 5)} SELESAI
                </div>
                <p className="text-gray-700 mb-1">Kata rahasianya adalah:</p>
                <div className="font-mono text-lg font-black text-blue-900 mb-3">
                  {room?.currentWord}
                </div>
                <button
                  type="button"
                  onClick={() => startNextTurn()}
                  className="w-full py-2 bg-[#000080] hover:bg-blue-800 text-white font-bold border-2 border-white border-b-[#404040] border-r-[#404040] active:border-[#404040] flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>
                    LANJUT KE RONDE {Math.min((room?.roundNumber || 1) + 1, room?.totalRounds || 5)} / {room?.totalRounds || 5}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Overlay: Podium Game Over (Seluruh Ronde Selesai) */}
          {isGameOver && (
            <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center p-4 z-20">
              <div className="bg-[#C0C0C0] border-2 border-white border-b-[#404040] border-r-[#404040] p-4 max-w-sm w-full shadow-2xl text-center">
                <div className="bg-amber-600 text-white font-bold px-2 py-1 mb-3 text-xs flex items-center justify-center gap-1.5">
                  <Trophy className="w-4 h-4 text-yellow-200" />
                  <span>PERTANDINGAN SELESAI - PODIUM JUARA</span>
                </div>

                {/* Top 3 Podium */}
                <div className="bg-white border border-[#808080] p-2 mb-3 shadow-inner space-y-1.5 text-left">
                  {players.slice(0, 3).map((p, idx) => (
                    <div
                      key={p.id}
                      className={cn(
                        "flex items-center justify-between p-1.5 rounded font-mono text-xs",
                        idx === 0
                          ? "bg-yellow-100 text-yellow-900 font-bold border border-yellow-400"
                          : idx === 1
                          ? "bg-gray-100 text-gray-900 font-semibold"
                          : "bg-amber-50 text-amber-900"
                      )}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span>{idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}</span>
                        <span className="truncate">{p.userName}</span>
                      </div>
                      <div className="text-right flex flex-col items-end leading-tight">
                        <span className="font-bold text-xs text-blue-900">
                          {p.score} PTS
                        </span>
                        <span className="text-[9px] text-amber-800 font-semibold" title="Akumulasi skor permanen sepanjang masa">
                          Total: {p.totalScore || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selector Pengaturan Match Baru */}
                <div className="mb-3 space-y-2 text-left">
                  {/* Ronde */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-800 mb-1">
                      <span>Ronde:</span>
                      <span className="font-mono text-blue-900">{selectedRounds} Ronde</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[3, 5, 8, 10].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setSelectedRounds(num)}
                          className={cn(
                            "py-1 font-mono font-bold text-xs border-2 transition-all text-center",
                            selectedRounds === num
                              ? "bg-[#000080] text-white border-white border-b-[#404040] border-r-[#404040]"
                              : "bg-[#D4D0C8] text-black border-white border-b-[#808080] border-r-[#808080] hover:bg-gray-200"
                          )}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Durasi */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-800 mb-1">
                      <span>Durasi Gambar:</span>
                      <span className="font-mono text-blue-900">{selectedDuration}s</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {[45, 60, 90].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setSelectedDuration(sec)}
                          className={cn(
                            "py-1 font-mono font-bold text-xs border-2 transition-all text-center",
                            selectedDuration === sec
                              ? "bg-[#000080] text-white border-white border-b-[#404040] border-r-[#404040]"
                              : "bg-[#D4D0C8] text-black border-white border-b-[#808080] border-r-[#808080] hover:bg-gray-200"
                          )}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Kategori */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-800 mb-1">
                      <span>Kategori:</span>
                      <span className="font-mono text-blue-900 truncate max-w-[150px]">{selectedCategory}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {["Campuran", "IT & Tech", "Kultur Kantor", "Umum"].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={cn(
                            "py-1 px-1 font-mono font-bold text-[11px] border-2 transition-all text-center truncate",
                            selectedCategory === cat
                              ? "bg-[#000080] text-white border-white border-b-[#404040] border-r-[#404040]"
                              : "bg-[#D4D0C8] text-black border-white border-b-[#808080] border-r-[#808080] hover:bg-gray-200"
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      startNewGame({
                        totalRounds: selectedRounds,
                        roundDurationSec: selectedDuration,
                        category: selectedCategory,
                        targetDrawerId: user?.id,
                      })
                    }
                    className="w-full py-2 bg-[#000080] hover:bg-blue-800 text-white font-bold border-2 border-white border-b-[#404040] border-r-[#404040] active:border-[#404040] flex items-center justify-center gap-1.5 shadow"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>MULAI MATCH BARU</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => resetToLobby()}
                    className="w-full py-1.5 bg-[#D4D0C8] hover:bg-gray-200 text-gray-800 font-bold border-2 border-white border-b-[#808080] border-r-[#808080] active:border-[#404040] flex items-center justify-center gap-1.5 text-[11px]"
                  >
                    <Settings className="w-3.5 h-3.5 text-gray-700" />
                    <span>Kembali ke Lobby Setup</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Overlay: Status Menunggu / Setup Lobby Sebelum Mulai */}
          {room?.status === "waiting" && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex flex-col items-center justify-center p-3 z-20 overflow-y-auto">
              <div className="bg-[#C0C0C0] border-2 border-white border-b-[#404040] border-r-[#404040] max-w-md w-full shadow-2xl my-auto">
                {/* Windows 98 Title Bar */}
                <div className="bg-gradient-to-r from-[#000080] via-[#000080] to-[#1084d0] text-white font-bold px-2 py-1 flex items-center justify-between text-xs tracking-wide select-none">
                  <div className="flex items-center gap-1.5 truncate">
                    <Palette className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                    <span className="truncate">SETTING_LOBBY.EXE - Parameter Match</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] shrink-0 font-mono">
                    <span className="w-3.5 h-3.5 bg-[#C0C0C0] text-black border border-white border-b-black border-r-black flex items-center justify-center font-bold">_</span>
                    <span className="w-3.5 h-3.5 bg-[#C0C0C0] text-black border border-white border-b-black border-r-black flex items-center justify-center font-bold">✕</span>
                  </div>
                </div>

                <div className="p-3 space-y-3">
                  {/* Banner Subtitle */}
                  <div className="bg-[#ECE9D8] border border-[#808080] p-2 flex items-center gap-2 text-gray-800 text-[11px] shadow-inner">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Atur jumlah ronde, durasi waktu, dan kategori kata sebelum bermain!</span>
                  </div>

                  {/* 1. Target Jumlah Ronde */}
                  <div className="bg-white border border-[#808080] p-2 shadow-inner">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-[11px] text-gray-800 flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-amber-600" />
                        Target Jumlah Ronde:
                      </span>
                      <span className="text-[10px] text-blue-900 font-mono font-bold">
                        {selectedRounds} Ronde
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[3, 5, 8, 10].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setSelectedRounds(num)}
                          className={cn(
                            "py-1.5 font-mono font-bold text-xs border-2 transition-all text-center",
                            selectedRounds === num
                              ? "bg-[#000080] text-white border-white border-b-[#404040] border-r-[#404040] shadow-inner"
                              : "bg-[#D4D0C8] text-black border-white border-b-[#808080] border-r-[#808080] hover:bg-gray-200 active:border-[#404040]"
                          )}
                        >
                          {num} {num === 5 ? "(Std)" : ""}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Durasi Menggambar */}
                  <div className="bg-white border border-[#808080] p-2 shadow-inner">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-[11px] text-gray-800 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-700" />
                        Durasi Tiap Ronde:
                      </span>
                      <span className="text-[10px] text-blue-900 font-mono font-bold">
                        {selectedDuration} Detik
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { sec: 45, label: "⚡ 45s (Kilat)" },
                        { sec: 60, label: "⏱️ 60s (Standar)" },
                        { sec: 90, label: "☕ 90s (Santai)" },
                      ].map((item) => (
                        <button
                          key={item.sec}
                          type="button"
                          onClick={() => setSelectedDuration(item.sec)}
                          className={cn(
                            "py-1.5 font-mono font-bold text-xs border-2 transition-all text-center",
                            selectedDuration === item.sec
                              ? "bg-[#000080] text-white border-white border-b-[#404040] border-r-[#404040] shadow-inner"
                              : "bg-[#D4D0C8] text-black border-white border-b-[#808080] border-r-[#808080] hover:bg-gray-200 active:border-[#404040]"
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Kategori Kata */}
                  <div className="bg-white border border-[#808080] p-2 shadow-inner">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-[11px] text-gray-800 flex items-center gap-1">
                        <Palette className="w-3.5 h-3.5 text-purple-700" />
                        Kategori Bank Kata:
                      </span>
                      <span className="text-[10px] text-blue-900 font-mono font-bold">
                        {selectedCategory}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { cat: "Campuran", label: "🎲 Campuran (Semua)" },
                        { cat: "IT & Tech", label: "💻 IT & Tech" },
                        { cat: "Kultur Kantor", label: "🏢 Kultur Kantor" },
                        { cat: "Umum", label: "🌍 Kategori Umum" },
                      ].map((item) => (
                        <button
                          key={item.cat}
                          type="button"
                          onClick={() => setSelectedCategory(item.cat)}
                          className={cn(
                            "p-1.5 font-mono font-bold text-xs border-2 transition-all text-left truncate",
                            selectedCategory === item.cat
                              ? "bg-[#000080] text-white border-white border-b-[#404040] border-r-[#404040] shadow-inner"
                              : "bg-[#D4D0C8] text-black border-white border-b-[#808080] border-r-[#808080] hover:bg-gray-200 active:border-[#404040]"
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. Pemain yang Siap di Lobby */}
                  <div className="bg-[#D4D0C8] border border-[#808080] p-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-[11px] text-gray-800 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-blue-900" />
                        Pemain Standby ({onlinePlayersCount} Online):
                      </span>
                      <span className="text-[10px] text-gray-600 font-mono">
                        {players.length} Terdaftar
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto bg-white border border-[#808080] p-1.5 shadow-inner">
                      {players.filter((p) => p.isOnline).length === 0 ? (
                        <span className="text-gray-400 italic text-[10px]">Menunggu pemain connect...</span>
                      ) : (
                        players
                          .filter((p) => p.isOnline)
                          .map((p) => (
                            <div
                              key={p.id}
                              className={cn(
                                "flex items-center gap-1 px-1.5 py-0.5 border text-[11px] font-mono",
                                p.userId === user?.id
                                  ? "bg-blue-50 border-blue-400 text-blue-950 font-bold"
                                  : "bg-gray-50 border-gray-300 text-gray-800"
                              )}
                            >
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                              <span className="truncate max-w-[110px]">{p.userName}</span>
                              {p.userId === user?.id && (
                                <span className="text-[9px] bg-blue-900 text-white px-1 rounded uppercase font-sans">
                                  YOU
                                </span>
                              )}
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  {/* Tombol Start Game */}
                  <button
                    type="button"
                    onClick={() => {
                      startNewGame({
                        totalRounds: selectedRounds,
                        roundDurationSec: selectedDuration,
                        category: selectedCategory,
                        targetDrawerId: user?.id,
                      })

                      // Lempar pengumuman room aktif ke Chat Umum
                      void (async () => {
                        try {
                          const token =
                            (await supabase?.auth.getSession())?.data.session?.access_token ?? null
                          await announceGameRoomAction({
                            game: "paintwar",
                            rounds: selectedRounds,
                            userName: user?.name || "Pemain",
                            userId: user?.id,
                            token,
                          })
                        } catch {
                          // Silently ignore if chat announcement fails
                        }
                      })()
                    }}
                    className="w-full py-2.5 bg-[#000080] hover:bg-blue-800 text-white font-bold text-xs border-2 border-white border-b-[#404040] border-r-[#404040] active:border-[#404040] shadow-md flex items-center justify-center gap-2 group transition-all"
                  >
                    <Play className="w-4 h-4 fill-white text-white group-hover:scale-110 transition-transform" />
                    <span>
                      MULAI PERTANDINGAN ({selectedRounds} RONDE • {selectedDuration}s)
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Sisi Kanan: Tab Tebakan & Papan Skor ── */}
        <div className="w-full md:w-80 flex flex-col bg-[#D4D0C8] border-2 border-white border-b-[#808080] border-r-[#808080] shadow-sm">
          {/* Tabs Selector */}
          <div className="flex border-b-2 border-[#808080] bg-[#C0C0C0]">
            <button
              type="button"
              onClick={() => setActiveTab("chat")}
              className={cn(
                "flex-1 py-1.5 font-bold text-center border-r border-[#808080] transition-colors flex items-center justify-center gap-1",
                activeTab === "chat"
                  ? "bg-[#D4D0C8] text-black shadow-inner"
                  : "bg-[#C0C0C0] text-gray-700 hover:bg-gray-200"
              )}
            >
              <span>TEBAKAN LIVE</span>
              <span className="px-1.5 py-0.2 bg-blue-900 text-white text-[9px] rounded-full">
                {messages.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("players")}
              className={cn(
                "flex-1 py-1.5 font-bold text-center transition-colors flex items-center justify-center gap-1",
                activeTab === "players"
                  ? "bg-[#D4D0C8] text-black shadow-inner"
                  : "bg-[#C0C0C0] text-gray-700 hover:bg-gray-200"
              )}
            >
              <Trophy className="w-3.5 h-3.5 text-yellow-700" />
              <span>PAPAN SKOR ({onlinePlayersCount} Aktif)</span>
            </button>
          </div>

          {/* Tab 1: Chat Tebakan */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col min-h-[220px] md:min-h-0">
              {/* Message List */}
              <div className="flex-1 p-2 overflow-y-auto space-y-1.5 bg-white border border-[#808080] m-1 shadow-inner font-mono text-[11px]">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 py-6 italic font-sans text-xs">
                    Belum ada tebakan. Ketik tebakanmu di bawah!
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "p-1.5 rounded leading-relaxed break-words",
                        msg.isSystem
                          ? msg.message.includes("hampir benar")
                            ? "bg-amber-100 text-amber-900 border-l-2 border-amber-500 font-bold text-[10px]"
                            : "bg-blue-50 text-blue-900 border-l-2 border-blue-600 italic text-[10px]"
                          : msg.isCorrectGuess
                          ? "bg-green-100 text-green-900 border border-green-400 font-bold"
                          : "bg-gray-50 text-black hover:bg-gray-100"
                      )}
                    >
                      {!msg.isSystem && (
                        <span className="font-bold text-blue-800 mr-1">
                          {msg.userName}:
                        </span>
                      )}
                      <span>{msg.message}</span>
                    </div>
                  ))
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSendGuess} className="p-1.5 bg-[#D4D0C8] flex gap-1">
                {isCurrentDrawer ? (
                  <div className="flex-1 p-1.5 bg-gray-200 text-gray-600 text-[10px] text-center italic border border-[#808080]">
                    🎨 Lu lagi gambar, gak bisa nebak kata sendiri
                  </div>
                ) : hasGuessedWord ? (
                  <div className="flex-1 p-1.5 bg-green-100 text-green-800 text-[10px] text-center font-bold border border-green-500 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-green-700" />
                    <span>Lu udah nebak bener! Tunggu ronde selesai.</span>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={guessInput}
                      onChange={(e) => setGuessInput(e.target.value)}
                      placeholder={isGameRunning ? "Ketik tebakanmu di sini..." : "Chat / tebak kata..."}
                      maxLength={80}
                      className="flex-1 px-2 py-1 bg-white border border-[#808080] shadow-inner text-black placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-800"
                    />
                    <button
                      type="submit"
                      disabled={!guessInput.trim()}
                      className="px-3 py-1 bg-[#C0C0C0] hover:bg-gray-300 disabled:opacity-50 border-2 border-white border-b-[#808080] border-r-[#808080] active:border-[#404040] font-bold text-black flex items-center justify-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>TEBAK</span>
                    </button>
                  </>
                )}
              </form>
            </div>
          )}

          {/* Tab 2: Papan Skor / Pemain */}
          {activeTab === "players" && (
            <div className="flex-1 flex flex-col p-1 min-h-[220px] md:min-h-0 overflow-y-auto">
              {/* Filter Sort: Skor Sesi vs Akumulasi Total */}
              <div className="flex items-center justify-between p-1 bg-[#ECE9D8] border border-[#808080] mb-1 text-[10px] font-mono">
                <span className="text-gray-600 font-sans font-bold">Urutan:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSortBy("session")}
                    className={cn(
                      "px-2 py-0.5 border font-bold text-[9px] transition-all",
                      sortBy === "session"
                        ? "bg-[#000080] text-white border-blue-950"
                        : "bg-[#D4D0C8] text-black border-white hover:bg-gray-200"
                    )}
                  >
                    Skor Sesi
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy("total")}
                    className={cn(
                      "px-2 py-0.5 border font-bold text-[9px] transition-all",
                      sortBy === "total"
                        ? "bg-amber-800 text-white border-amber-950"
                        : "bg-[#D4D0C8] text-black border-white hover:bg-gray-200"
                    )}
                  >
                    Akumulasi Total
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                {sortedPlayers.map((p, idx) => {
                  const isDrawer = p.userId === room?.currentDrawerId
                  const isMe = p.userId === user?.id
                  const isOnline = p.isOnline

                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "flex items-center justify-between p-1.5 border transition-all",
                        !isOnline
                          ? "bg-gray-100/60 border-gray-300 opacity-60"
                          : isMe
                          ? "bg-amber-50 border-amber-400 font-bold"
                          : "bg-white border-[#808080]"
                      )}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-5 text-center font-mono font-bold text-gray-500">
                          #{idx + 1}
                        </span>

                        <div className="relative">
                          <div
                            className={cn(
                              "w-6 h-6 rounded text-white flex items-center justify-center font-mono text-[10px] uppercase font-bold overflow-hidden",
                              isOnline ? "bg-blue-900" : "bg-gray-400"
                            )}
                          >
                            {p.userAvatar ? (
                              <img src={p.userAvatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              p.userName.slice(0, 2)
                            )}
                          </div>
                          <span
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-2 h-2 border border-white rounded-full",
                              isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"
                            )}
                            title={isOnline ? "Online" : "Offline"}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-black leading-tight flex items-center gap-1">
                            <span className={cn(!isOnline && "text-gray-500")}>
                              {p.userName}
                            </span>
                            {isMe && <span className="text-[9px] text-blue-700">(Lu)</span>}
                            {!isOnline && (
                              <span className="text-[8px] text-gray-400 font-sans">(Offline)</span>
                            )}
                          </div>
                          <div className="text-[9px] text-gray-500">
                            {!isOnline ? (
                              <span className="text-gray-400">Tidak aktif di room</span>
                            ) : isDrawer ? (
                              <span className="text-purple-700 font-bold">🎨 Menggambar</span>
                            ) : p.hasGuessed ? (
                              <span className="text-green-700 font-bold">✅ Berhasil Nebak</span>
                            ) : (
                              <span>Menebak...</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-0.5 font-mono text-[10px]">
                        <div
                          className={cn(
                            "px-1.5 py-0.2 border rounded flex items-center gap-1 leading-tight",
                            sortBy === "session"
                              ? "bg-blue-100 text-blue-900 border-blue-400 font-bold"
                              : "bg-blue-50/70 text-blue-800 border-blue-200"
                          )}
                          title="Skor match sesi saat ini (reset saat match baru)"
                        >
                          <span className="text-[8px] font-sans font-normal opacity-70">SESI</span>
                          <span className="font-bold">{p.score}</span>
                        </div>

                        <div
                          className={cn(
                            "px-1.5 py-0.2 border rounded flex items-center gap-1 leading-tight",
                            sortBy === "total"
                              ? "bg-amber-100 text-amber-950 border-amber-400 font-bold"
                              : "bg-amber-50/70 text-amber-900 border-amber-200"
                          )}
                          title="Akumulasi skor permanen sepanjang masa"
                        >
                          <span className="text-[8px] font-sans font-normal opacity-70">TOTAL</span>
                          <span className="font-bold">{p.totalScore || 0}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Action Controls (Ganti Giliran & Mulai Match Baru) */}
              <div className="mt-auto pt-2 border-t border-[#808080] p-1.5 flex flex-col gap-1.5 bg-[#C0C0C0]">
                <button
                  type="button"
                  onClick={() => startNextTurn()}
                  title="Lewati giliran jika drawer AFK atau koneksi terputus"
                  className="w-full py-1.5 bg-[#D4D0C8] hover:bg-gray-200 border-2 border-white border-b-[#808080] border-r-[#808080] active:border-[#808080] font-bold text-[11px] flex items-center justify-center gap-1.5 text-black"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-800" />
                  <span>Ganti Giliran (Skip AFK)</span>
                </button>

                {(isRoundEnded || isGameOver || room?.status === "waiting") && (
                  <button
                    type="button"
                    onClick={() => startNewGame(selectedRounds)}
                    className="w-full py-1.5 bg-[#000080] hover:bg-blue-800 text-white border-2 border-white border-b-[#404040] border-r-[#404040] active:border-[#404040] font-bold text-[11px] flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Mulai Match Baru ({selectedRounds} Ronde)</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
