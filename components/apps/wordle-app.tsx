"use client"

import * as React from "react"
import { useWordle } from "@/lib/wordle-store"
import { cn } from "@/lib/utils"
import { RetroIcon } from "@/components/ui/retro-icon"
import { Trophy, HelpCircle, Share2, Check, RefreshCw, Sparkles, Award } from "lucide-react"

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
]

export function WordleApp() {
  const {
    puzzle,
    guesses,
    evaluatedGuesses,
    currentGuess,
    isSolved,
    isGameOver,
    isLoading,
    errorMessage,
    keyboardStatuses,
    leaderboard,
    addLetter,
    removeLetter,
    submitGuess,
    generateShareText,
  } = useWordle()

  const [activeTab, setActiveTab] = React.useState<"game" | "leaderboard" | "help">("game")
  const [copied, setCopied] = React.useState(false)

  // ─── Physical Keyboard Listener ────────────────────────────
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== "game") return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      if (e.key === "Enter") {
        e.preventDefault()
        submitGuess()
      } else if (e.key === "Backspace") {
        e.preventDefault()
        removeLetter()
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault()
        addLetter(e.key.toUpperCase())
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [activeTab, submitGuess, removeLetter, addLetter])

  const handleCopyResult = () => {
    const text = generateShareText()
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }).catch(() => {})
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#C0C0C0] font-sans text-xs select-none">
      {/* ── Top Header Toolbar ── */}
      <div className="p-2 bg-[#D4D0C8] border-b-2 border-[#808080] flex items-center justify-between gap-1.5 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <RetroIcon name="edit" iconSize={32} className="size-4 sm:size-5 shrink-0 object-contain" />
          <div className="min-w-0">
            <div className="font-bold text-xs text-black flex items-center gap-1">
              <span className="truncate">WORDLE 98</span>
              <span className="px-1 py-0.2 bg-[#000080] text-white font-mono text-[9px] font-bold rounded shrink-0">
                #{puzzle.dayNumber}
              </span>
            </div>
            <div className="font-mono text-[9px] text-gray-600 truncate">
              {puzzle.targetDate} <span className="hidden sm:inline">// Kata Harian</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("game")}
            className={cn(
              "px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-bold border-2 transition-all flex items-center gap-1",
              activeTab === "game"
                ? "bg-[#D4D0C8] border-t-[#808080] border-l-[#808080] border-r-white border-b-white text-black"
                : "bg-[#C0C0C0] border-t-white border-l-white border-r-[#808080] border-b-[#808080] text-gray-700 active:border-[#808080]"
            )}
          >
            <span>KATA</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("leaderboard")}
            className={cn(
              "px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-bold border-2 transition-all flex items-center gap-1",
              activeTab === "leaderboard"
                ? "bg-[#D4D0C8] border-t-[#808080] border-l-[#808080] border-r-white border-b-white text-black"
                : "bg-[#C0C0C0] border-t-white border-l-white border-r-[#808080] border-b-[#808080] text-gray-700 active:border-[#808080]"
            )}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="hidden xs:inline">SKOR</span>
            <span>({leaderboard.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("help")}
            className={cn(
              "p-1 border-2 transition-all shrink-0",
              activeTab === "help"
                ? "bg-[#D4D0C8] border-t-[#808080] border-l-[#808080] border-r-white border-b-white"
                : "bg-[#C0C0C0] border-t-white border-l-white border-r-[#808080] border-b-[#808080] text-gray-700"
            )}
            title="Cara Bermain"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Main Body ── */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col items-center justify-between">
        {activeTab === "game" && (
          <div className="flex flex-col items-center justify-between w-full max-w-sm h-full gap-3">
            {/* Error Message banner */}
            {errorMessage && (
              <div className="w-full px-2 py-1 bg-red-600 text-white font-mono text-[11px] font-bold text-center rounded border border-red-800 animate-bounce">
                {errorMessage}
              </div>
            )}

            {/* 6x5 Wordle Letter Grid */}
            <div className="grid grid-rows-6 gap-1 sm:gap-1.5 w-full max-w-[250px] sm:max-w-[280px] p-1.5 sm:p-2 bg-[#D4D0C8] border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white shadow-inner">
              {Array.from({ length: 6 }).map((_, rowIndex) => {
                const isSubmitted = rowIndex < guesses.length
                const isCurrent = rowIndex === guesses.length
                const guessWord = isSubmitted
                  ? guesses[rowIndex]
                  : isCurrent
                  ? currentGuess
                  : ""

                const evaluated = isSubmitted
                  ? evaluatedGuesses[rowIndex] || []
                  : []

                return (
                  <div key={rowIndex} className="grid grid-cols-5 gap-1 sm:gap-1.5">
                    {Array.from({ length: 5 }).map((_, colIndex) => {
                      const char = guessWord[colIndex] || ""
                      const status = isSubmitted ? evaluated[colIndex]?.status : undefined

                      let bgClass = "bg-white text-black border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white"
                      if (status === "correct") {
                        bgClass = "bg-[#1E824C] text-white border-2 border-t-[#2ECC71] border-l-[#2ECC71] border-r-[#145A32] border-b-[#145A32] font-black shadow"
                      } else if (status === "present") {
                        bgClass = "bg-[#D4AC0D] text-white border-2 border-t-[#F1C40F] border-l-[#F1C40F] border-r-[#7D6608] border-b-[#7D6608] font-black shadow"
                      } else if (status === "absent") {
                        bgClass = "bg-[#5D6D7E] text-white border-2 border-t-[#85929E] border-l-[#85929E] border-r-[#2E4053] border-b-[#2E4053]"
                      } else if (char) {
                        bgClass = "bg-yellow-50 text-black border-2 border-[#000080] scale-105"
                      }

                      return (
                        <div
                          key={colIndex}
                          className={cn(
                            "aspect-square flex items-center justify-center font-mono font-bold text-base sm:text-lg transition-transform",
                            bgClass
                          )}
                        >
                          {char}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {/* End of game banner */}
            {isGameOver && (
              <div className="w-full p-2.5 bg-[#EAE8E3] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] shadow flex flex-col items-center gap-1.5 text-center">
                {isSolved ? (
                  <div className="flex items-center gap-1.5 text-green-700 font-bold text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>KERJA BAGUS! KATA TERTEBAK ({guesses.length}/6)</span>
                  </div>
                ) : (
                  <div className="text-red-700 font-bold text-xs">
                    KESEMPATAN HABIS! KATA HARI INI:{" "}
                    <span className="font-mono text-sm underline text-black">{puzzle.word || "???"}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyResult}
                    className="px-3 py-1 bg-[#000080] text-white font-bold text-xs border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] flex items-center gap-1 shadow-sm active:border-[#404040]"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-300" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>{copied ? "TERSALIN!" : "SALIN HASIL"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("leaderboard")}
                    className="px-2.5 py-1 bg-[#D4D0C8] text-black font-bold text-xs border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] flex items-center gap-1"
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-600" />
                    <span>KLASEMEN</span>
                  </button>
                </div>
              </div>
            )}

            {/* Virtual Keyboard */}
            <div className="flex flex-col gap-1 w-full max-w-sm shrink-0 touch-manipulation">
              {KEYBOARD_ROWS.map((row, rIdx) => (
                <div key={rIdx} className="flex justify-center gap-0.5 sm:gap-1 w-full">
                  {row.map((key) => {
                    const status = keyboardStatuses[key]
                    let keyBg = "bg-[#D4D0C8] text-black border-t-white border-l-white border-r-[#808080] border-b-[#808080]"
                    if (status === "correct") {
                      keyBg = "bg-[#1E824C] text-white border-t-[#2ECC71] border-l-[#2ECC71] border-r-[#145A32] border-b-[#145A32]"
                    } else if (status === "present") {
                      keyBg = "bg-[#D4AC0D] text-white border-t-[#F1C40F] border-l-[#F1C40F] border-r-[#7D6608] border-b-[#7D6608]"
                    } else if (status === "absent") {
                      keyBg = "bg-[#7F8C8D] text-white/80 border-t-[#95A5A6] border-l-[#95A5A6] border-r-[#34495E] border-b-[#34495E]"
                    }

                    const isSpecial = key === "ENTER" || key === "BACKSPACE"

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          if (key === "ENTER") submitGuess()
                          else if (key === "BACKSPACE") removeLetter()
                          else addLetter(key)
                        }}
                        className={cn(
                          "h-9 sm:h-10 font-mono font-bold border-2 rounded-[2px] active:border-t-[#808080] active:border-l-[#808080] active:border-r-white active:border-b-white transition-transform active:scale-95 flex items-center justify-center select-none",
                          isSpecial
                            ? "px-1 sm:px-2.5 text-[9px] sm:text-[10px] min-w-[32px] sm:min-w-[40px]"
                            : "flex-1 min-w-[24px] sm:min-w-[28px] text-[11px] sm:text-xs",
                          keyBg
                        )}
                      >
                        {key === "BACKSPACE" ? "⌫" : key}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab: Leaderboard ── */}
        {activeTab === "leaderboard" && (
          <div className="w-full max-w-sm flex flex-col gap-2">
            <div className="p-2 bg-[#000080] text-white font-bold flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-yellow-300" />
                <span>Papan Skor Wordle Hari Ini</span>
              </div>
              <span className="text-[10px] font-mono">{puzzle.targetDate}</span>
            </div>

            <div className="bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white p-2 min-h-[260px] max-h-[360px] overflow-y-auto">
              {leaderboard.length === 0 ? (
                <div className="p-6 text-center text-gray-500 font-mono text-xs">
                  Belum ada yang menyelesaikan kata hari ini. Jadilah yang pertama!
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-gray-200">
                  {leaderboard.map((item, idx) => (
                    <div key={item.id} className="py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "size-5 rounded flex items-center justify-center font-mono font-bold text-[10px]",
                            idx === 0
                              ? "bg-amber-400 text-black border border-amber-600"
                              : idx === 1
                              ? "bg-gray-300 text-black border border-gray-500"
                              : idx === 2
                              ? "bg-amber-700 text-white border border-amber-900"
                              : "bg-gray-100 text-gray-700"
                          )}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-xs text-black flex items-center gap-1">
                            <span>{item.userName}</span>
                            {item.isSolved && (
                              <span className="text-green-600 text-[10px]">✓</span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            {item.completedAt
                              ? new Date(item.completedAt).toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={cn(
                            "px-2 py-0.5 font-mono text-xs font-bold rounded",
                            item.isSolved
                              ? "bg-green-100 text-green-800 border border-green-300"
                              : "bg-red-100 text-red-800 border border-red-300"
                          )}
                        >
                          {item.isSolved ? `${item.attempts}/6` : "X/6"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isGameOver && (
              <button
                type="button"
                onClick={handleCopyResult}
                className="w-full py-2 bg-[#000080] text-white font-bold border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] flex items-center justify-center gap-1.5 shadow"
              >
                {copied ? <Check className="w-4 h-4 text-green-300" /> : <Share2 className="w-4 h-4" />}
                <span>{copied ? "HASIL BERHASIL DISALIN!" : "BAGIKAN HASIL KE KANTOR"}</span>
              </button>
            )}
          </div>
        )}

        {/* ── Tab: Help / Cara Main ── */}
        {activeTab === "help" && (
          <div className="w-full max-w-sm bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white p-3 space-y-3">
            <div className="font-bold text-sm text-black border-b border-gray-300 pb-1 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-blue-700" />
              <span>Cara Bermain Wordle 98</span>
            </div>

            <p className="text-xs text-gray-700 leading-relaxed">
              Tebak kata rahasia <strong>5 huruf</strong> dalam <strong>6 kesempatan</strong>. Tiap hari (jam 00:00 WIB), sistem mengeluarkan 1 kata rahasia baru yang sama untuk seluruh tim IT.
            </p>

            <div className="space-y-2">
              <div className="font-bold text-xs text-black">Indikator Warna:</div>
              <div className="flex items-center gap-2">
                <span className="size-6 bg-[#1E824C] text-white font-mono font-bold flex items-center justify-center text-xs rounded">
                  K
                </span>
                <span className="text-xs text-gray-800">
                  <strong>Hijau:</strong> Huruf benar dan berada di posisi yang tepat.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-6 bg-[#D4AC0D] text-white font-mono font-bold flex items-center justify-center text-xs rounded">
                  A
                </span>
                <span className="text-xs text-gray-800">
                  <strong>Kuning:</strong> Huruf ada di dalam kata, tapi di posisi lain.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-6 bg-[#5D6D7E] text-white font-mono font-bold flex items-center justify-center text-xs rounded">
                  B
                </span>
                <span className="text-xs text-gray-800">
                  <strong>Abu-abu:</strong> Huruf tidak ada sama sekali di kata rahasia.
                </span>
              </div>
            </div>

            <div className="p-2 bg-blue-50 border border-blue-200 text-[11px] text-blue-900 rounded">
              💡 <strong>Tips:</strong> Kosakata mencakup istilah IT/programming, kultur kantor IT-Things, dan kata umum bahasa Indonesia.
            </div>

            <button
              type="button"
              onClick={() => setActiveTab("game")}
              className="w-full py-1.5 bg-[#D4D0C8] text-black font-bold border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:border-[#808080]"
            >
              KEMBALI KE PERMAINAN
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom Status Bar ── */}
      <div className="px-2 py-1 bg-[#D4D0C8] border-t border-[#808080] flex items-center justify-between text-[11px] text-gray-600 font-mono">
        <span>STATUS: {isSolved ? "SELESAI" : isGameOver ? "KALAH" : "BERMAIN"}</span>
        <span>TEBAKAN: {guesses.length}/6</span>
      </div>
    </div>
  )
}
