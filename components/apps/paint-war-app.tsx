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
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { RetroActionButton } from "@/components/ui/retro-action-button"
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
} from "lucide-react"

export function PaintWarApp() {
  const { user, isAdmin } = useAuth()
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
    selectWordAndStartRound,
    handleEndRound,
    sendGuess,
    broadcastCanvasEvent,
    saveCanvasSnapshot,
    resetMatchScores,
    setDrawEventListener,
  } = usePaintWar(DEFAULT_PAINT_ROOM_ID)

  // Local state
  const [guessInput, setGuessInput] = React.useState("")
  const [activeTab, setActiveTab] = React.useState<"chat" | "players">("chat")
  const [wordChoices, setWordChoices] = React.useState<WordItem[]>([])
  const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false)
  const chatBottomRef = React.useRef<HTMLDivElement | null>(null)

  // Auto-scroll chat to bottom
  React.useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // When drawer enters selecting_word, generate 3 word choices
  React.useEffect(() => {
    if (room?.status === "selecting_word" && isCurrentDrawer) {
      setWordChoices(getRandomWordOptions(3))
    }
  }, [room?.status, isCurrentDrawer])

  const handleSendGuess = (e: React.FormEvent) => {
    e.preventDefault()
    if (!guessInput.trim()) return
    sendGuess(guessInput)
    setGuessInput("")
  }

  const isGameRunning = room?.status === "drawing"
  const isSelectingWord = room?.status === "selecting_word"
  const isRoundEnded = room?.status === "round_ended"

  return (
    <div className="flex flex-col h-full bg-[#C0C0C0] font-sans text-xs select-none">
      {/* ── 1. Game Top Header & Status Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#D4D0C8] border-b-2 border-[#808080]">
        {/* Left: Round & Category */}
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 bg-white border border-[#808080] font-mono font-bold text-blue-900 shadow-inner flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-blue-700" />
            <span>RONDE #{room?.roundNumber || 1}</span>
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
              <div className="px-3 py-1 bg-white border border-[#808080] rounded font-mono text-black font-bold tracking-widest text-sm shadow-inner">
                {room?.wordHint || "_ _ _ _ _"}
              </div>
            )
          ) : isSelectingWord ? (
            <div className="px-3 py-1 bg-yellow-100 border border-yellow-400 font-mono text-yellow-900 animate-pulse">
              {isCurrentDrawer ? "PILIH KATA UNTUK DIGAMBAR DI BAWAH!" : `Menunggu ${room?.currentDrawerName || "Drawer"} memilih kata...`}
            </div>
          ) : isRoundEnded ? (
            <div className="px-3 py-1 bg-red-100 border border-red-400 font-mono text-red-900 font-bold">
              Kata rahasia: {room?.currentWord}
            </div>
          ) : (
            <div className="px-3 py-1 bg-blue-100 border border-blue-400 font-mono text-blue-900">
              Lobby Siap. Klik "Mulai Ronde" untuk bermain!
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

          <div className="flex items-center gap-1 px-2 py-1 bg-[#ECE9D8] border border-[#808080] font-mono text-gray-700">
            <Users className="w-3.5 h-3.5 text-blue-800" />
            <span>{players.filter((p) => p.isOnline).length} Online</span>
          </div>
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

          {/* Overlay: Game Berakhir / Next Round Bar */}
          {isRoundEnded && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4 z-20">
              <div className="bg-[#C0C0C0] border-2 border-white border-b-[#404040] border-r-[#404040] p-4 max-w-sm w-full shadow-2xl text-center">
                <div className="bg-red-800 text-white font-bold px-2 py-1 mb-2 text-xs">
                  RONDE BERAKHIR
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
                  <span>LANJUT RONDE BERIKUTNYA</span>
                </button>
              </div>
            </div>
          )}

          {/* Overlay: Status Menunggu / Belum Mulai */}
          {room?.status === "waiting" && (
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-4 z-10">
              <div className="bg-[#C0C0C0] border-2 border-white border-b-[#404040] border-r-[#404040] p-4 max-w-xs w-full shadow-xl text-center">
                <Palette className="w-8 h-8 text-blue-900 mx-auto mb-2" />
                <h3 className="font-bold text-sm mb-1">PAINT_WAR.EXE</h3>
                <p className="text-gray-700 text-[11px] mb-3">
                  Adu tebak gambar bareng tim IT di kanvas retro MS Paint 98!
                </p>
                <button
                  type="button"
                  onClick={() => startNextTurn(user?.id)}
                  className="w-full py-2 bg-[#000080] hover:bg-blue-800 text-white font-bold border-2 border-white border-b-[#404040] border-r-[#404040] active:border-[#404040] flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>MULAI GAME SEKARANG</span>
                </button>
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
              <span>PAPAN SKOR</span>
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
                          ? "bg-blue-50 text-blue-900 border-l-2 border-blue-600 italic text-[10px]"
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
              <div className="space-y-1">
                {players.map((p, idx) => {
                  const isDrawer = p.userId === room?.currentDrawerId
                  const isMe = p.userId === user?.id

                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "flex items-center justify-between p-1.5 border transition-all",
                        isMe ? "bg-amber-50 border-amber-400 font-bold" : "bg-white border-[#808080]"
                      )}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-5 text-center font-mono font-bold text-gray-500">
                          #{idx + 1}
                        </span>

                        <div className="relative">
                          <div className="w-6 h-6 rounded bg-blue-900 text-white flex items-center justify-center font-mono text-[10px] uppercase font-bold overflow-hidden">
                            {p.userAvatar ? (
                              <img src={p.userAvatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              p.userName.slice(0, 2)
                            )}
                          </div>
                          {p.isOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 border border-white rounded-full" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-black leading-tight flex items-center gap-1">
                            <span>{p.userName}</span>
                            {isMe && <span className="text-[9px] text-blue-700">(Lu)</span>}
                          </div>
                          <div className="text-[9px] text-gray-500">
                            {isDrawer ? (
                              <span className="text-purple-700 font-bold">🎨 Menggambar</span>
                            ) : p.hasGuessed ? (
                              <span className="text-green-700 font-bold">✅ Berhasil Nebak</span>
                            ) : (
                              <span>Menebak...</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="font-mono font-black text-blue-900 text-xs px-2 py-0.5 bg-blue-50 border border-blue-200 rounded">
                        {p.score} PTS
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Reset Game & Admin Controls */}
              {(isAdmin || players.length > 0) && (
                <div className="mt-auto pt-3 border-t border-[#808080] p-1 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => startNextTurn()}
                    className="flex-1 py-1 bg-[#D4D0C8] hover:bg-gray-200 border border-white border-b-[#808080] border-r-[#808080] active:border-[#808080] font-bold text-[10px] flex items-center justify-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3 text-blue-800" />
                    <span>Ganti Giliran</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsResetConfirmOpen(true)}
                    className="py-1 px-2 bg-red-100 hover:bg-red-200 border border-red-400 font-bold text-[10px] text-red-800"
                  >
                    Reset Skor
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Confirm Dialog Reset Skor ── */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={async () => {
          await resetMatchScores()
          setIsResetConfirmOpen(false)
        }}
        title="RESET_SKOR.EXE"
        message="Yakin mau reset skor semua pemain dan mengulang game dari awal?"
        confirmText="Reset Skor"
        variant="destructive"
      />
    </div>
  )
}
