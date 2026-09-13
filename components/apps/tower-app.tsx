"use client"

import * as React from "react"
import { ArrowDown, Pause, Play, Volume2, VolumeX, Trophy, Sparkles, Building2, Users } from "lucide-react"
import { useDesktop } from "@/components/desktop/desktop-context"
import { RetroActionButton } from "@/components/ui/retro-action-button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { playRetroBuzzerSound, playRetroCorrectSound, playRetroNotificationSound } from "@/lib/sound-effects"
import { TowerClock, TowerGame, DIFFICULTY_CONFIGS } from "@/lib/tower/physics"
import type { TowerSnapshot, TowerDifficulty } from "@/lib/tower/physics"
import { drawTower } from "@/lib/tower/render"
import { cn } from "@/lib/utils"
import { submitTowerScoreAction } from "@/app/actions/tower"
import { supabase } from "@/lib/supabase"

import { TowerLeaderboard } from "./tower-leaderboard"

const INITIAL: TowerSnapshot = { phase: "ready", difficulty: "normal", score: 0, floors: 0, combo: 0, residents: 0, message: "Bangun setinggi mungkin." }

export function TowerApp() {
  const { windows, activeWindowId } = useDesktop()
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const gameRef = React.useRef<TowerGame | null>(null)
  const [difficulty, setDifficulty] = React.useState<TowerDifficulty>(() => {
    try {
      const saved = localStorage.getItem("it-things-tower-difficulty")
      if (saved === "santai" || saved === "normal" || saved === "ekstrim") return saved
    } catch { /* Ignore */ }
    return "normal"
  })
  const [snapshot, setSnapshot] = React.useState(INITIAL)
  const [leaderboardOpen, setLeaderboardOpen] = React.useState(false)
  const [paused, setPaused] = React.useState(false)
  const [hidden, setHidden] = React.useState(() => typeof document !== "undefined" && document.hidden)
  const [muted, setMuted] = React.useState(false)
  const [restartOpen, setRestartOpen] = React.useState(false)
  const [bestRun, setBestRun] = React.useState<{ score: number; floors: number }>(() => {
    try {
      const storedRun = localStorage.getItem("it-things-tower-best-run")
      if (storedRun) {
        const parsed = JSON.parse(storedRun)
        if (Number.isSafeInteger(parsed.score) && Number.isSafeInteger(parsed.floors)) {
          return parsed
        }
      }
      const legacyBest = Number(localStorage.getItem("it-things-tower-best"))
      if (Number.isSafeInteger(legacyBest) && legacyBest > 0) {
        const approxFloors = Math.min(Math.max(1, Math.round(legacyBest / 150)), Math.floor(legacyBest / 100))
        return { score: legacyBest, floors: approxFloors }
      }
    } catch { /* Ignore */ }
    return { score: 0, floors: 0 }
  })
  const [best, setBest] = React.useState(() => bestRun.score)
  const bestRef = React.useRef(best)
  const [error, setError] = React.useState("")
  const suspended = leaderboardOpen || paused || hidden || restartOpen || windows.tower.isMinimized || activeWindowId !== "tower"
  const live = React.useRef({ suspended, muted })
  React.useEffect(() => { live.current = { suspended, muted } }, [suspended, muted])

  React.useEffect(() => {
    const visibility = () => setHidden(document.hidden)
    document.addEventListener("visibilitychange", visibility)
    return () => document.removeEventListener("visibilitychange", visibility)
  }, [])

  React.useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) {
      setError("Canvas tidak tersedia. Coba browser lain atau muat ulang halaman.")
      return
    }
    gameRef.current = new TowerGame(difficulty)
    const clock = new TowerClock()
    let previous = 0
    let raf = 0
    let lastSnapshot = ""
    let lastPhase = "ready"
    let width = 360
    let height = 500
    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      width = bounds.width
      height = bounds.height
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()
    const render = (now: number) => {
      const game = gameRef.current
      if (!game) return
      try {
        if (live.current.suspended || document.hidden) clock.reset()
        else clock.advance(previous ? (now - previous) / 1000 : 0, () => game.step())
        previous = now
        drawTower(context, game, width, height)
        const next = game.snapshot()
        const key = JSON.stringify(next)
        if (key !== lastSnapshot) {
          lastSnapshot = key
          setSnapshot(next)
          if (!live.current.muted && next.phase !== lastPhase) {
            if (next.phase === "landed") {
              if (next.combo) playRetroCorrectSound(0.1)
              else playRetroNotificationSound(0.1)
            }
            if (next.phase === "over") playRetroBuzzerSound(0.1)
          }

          if (next.phase === "over" && next.score > 0 && next.phase !== lastPhase) {
            // Auto submit to leaderboard in background
            void (async () => {
              try {
                const token = (await supabase?.auth.getSession())?.data.session?.access_token
                if (token) {
                  await submitTowerScoreAction(token, next.score, next.floors)
                }
              } catch {
                // Non-blocking background submission
              }
            })()
          }

          lastPhase = next.phase
          if (next.score > bestRef.current) {
            bestRef.current = next.score
            setBest(next.score)
            const run = { score: next.score, floors: next.floors }
            setBestRun(run)
            try {
              localStorage.setItem("it-things-tower-best", String(next.score))
              localStorage.setItem("it-things-tower-best-run", JSON.stringify(run))
            } catch { /* Optional local record. */ }
          }
        }
        raf = requestAnimationFrame(render)
      } catch {
        setError("Game terhenti. Tutup lalu buka Tower 98 untuk mencoba lagi.")
      }
    }
    raf = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      gameRef.current = null
    }
  }, [])

  const drop = () => {
    if (!suspended) gameRef.current?.release()
  }
  const start = () => {
    gameRef.current?.start()
    if (!muted) playRetroNotificationSound(0.08)
    canvasRef.current?.focus()
  }
  const restart = (targetDiff = difficulty) => {
    gameRef.current = new TowerGame(targetDiff)
    gameRef.current.start()
    setSnapshot(gameRef.current.snapshot())
    setRestartOpen(false)
    setPaused(false)
    canvasRef.current?.focus()
  }

  const changeDifficulty = (d: TowerDifficulty) => {
    setDifficulty(d)
    try { localStorage.setItem("it-things-tower-difficulty", d) } catch {}
    if (snapshot.phase === "ready" || snapshot.phase === "over") {
      gameRef.current = new TowerGame(d)
      setSnapshot(gameRef.current.snapshot())
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#c0c0c0] font-mono text-xs text-[#14253d]">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#808080] bg-[#d4d0c8] px-3 py-1.5 shadow-sm">
        <div className="flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-[#000080]" />
          <span className="font-bold tracking-wide text-black">TOWER 98</span>
          <button
            type="button"
            title={`Tingkat Kesulitan: ${DIFFICULTY_CONFIGS[difficulty].name}. Klik untuk ubah.`}
            onClick={() => {
              const next: TowerDifficulty = difficulty === "santai" ? "normal" : difficulty === "normal" ? "ekstrim" : "santai"
              changeDifficulty(next)
            }}
            className={cn(
              "ml-1 px-1.5 py-0.5 text-[9px] font-mono font-bold border rounded-[2px] transition-colors cursor-pointer",
              difficulty === "santai"
                ? "bg-emerald-100 text-emerald-900 border-emerald-500 hover:bg-emerald-200"
                : difficulty === "normal"
                ? "bg-amber-100 text-amber-900 border-amber-500 hover:bg-amber-200"
                : "bg-rose-100 text-rose-900 border-rose-500 hover:bg-rose-200"
            )}
          >
            {DIFFICULTY_CONFIGS[difficulty].badge}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <RetroActionButton action="custom" icon={Trophy} aria-label="Klasemen harian" tooltip="Klasemen harian" onClick={() => setLeaderboardOpen(true)} className="min-h-8 min-w-8" />
          <RetroActionButton action="custom" icon={muted ? VolumeX : Volume2} aria-label={muted ? "Aktifkan suara" : "Matikan suara"} aria-pressed={muted} tooltip={muted ? "Aktifkan suara" : "Matikan suara"} onClick={() => setMuted(!muted)} className="min-h-8 min-w-8" />
          <RetroActionButton action="custom" icon={paused ? Play : Pause} aria-label={paused ? "Lanjutkan game" : "Jeda game"} tooltip={paused ? "Lanjutkan game" : "Jeda game"} disabled={snapshot.phase === "ready" || snapshot.phase === "over"} onClick={() => setPaused(!paused)} className="min-h-8 min-w-8" />
          <RetroActionButton action="refresh" aria-label="Ulangi game" tooltip="Ulangi game" disabled={snapshot.phase === "ready"} onClick={() => snapshot.phase === "over" ? restart() : setRestartOpen(true)} className="min-h-8 min-w-8" />
        </div>
      </div>
      <div className="relative min-h-[240px] flex-1 overflow-hidden bg-[#87bfda]">
        <canvas ref={canvasRef} tabIndex={0} role="button" aria-label="Area Tower 98. Klik atau tekan Spasi untuk menjatuhkan lantai." aria-disabled={suspended || snapshot.phase !== "swinging"}
          className="block h-full w-full touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#000080]"
          onClick={drop} onKeyDown={event => {
            if (event.code === "Space" || event.code === "Enter") {
              event.preventDefault()
              if (!event.repeat) drop()
            }
          }}>
          Game susun gedung. Gunakan tombol Lepas lantai untuk bermain.
        </canvas>

        {/* ── Retro LED Scoreboard Overlay ── */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-1.5 p-2 select-none">
          <div className="flex flex-col bg-[#101820] px-2 py-1 border-2 border-t-[#374151] border-l-[#374151] border-r-white/40 border-b-white/40 shadow-inner rounded-[2px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-bold text-amber-400 tracking-wider">SKOR</span>
              <span className={cn(
                "text-[7px] font-bold px-1 rounded-[1px] tracking-wider uppercase font-mono",
                snapshot.difficulty === "santai" ? "text-emerald-400 bg-emerald-950/80 border border-emerald-600/50" : snapshot.difficulty === "normal" ? "text-amber-300 bg-amber-950/80 border border-amber-600/50" : "text-rose-400 bg-rose-950/80 border border-rose-600/50"
              )}>
                {DIFFICULTY_CONFIGS[snapshot.difficulty || "normal"].badge}
              </span>
            </div>
            <span className="text-base sm:text-lg font-black font-mono text-emerald-400 tracking-tight tabular-nums">
              {snapshot.score.toLocaleString("id-ID")}
            </span>
          </div>

          <div className="flex flex-col items-center bg-[#101820] px-2 py-1 border-2 border-t-[#374151] border-l-[#374151] border-r-white/40 border-b-white/40 shadow-inner rounded-[2px]">
            <span className="text-[9px] font-bold text-rose-400 tracking-wider flex items-center gap-1">
              <Users className="w-2.5 h-2.5" /> WARGA
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-rose-300 tracking-tight tabular-nums">
              {snapshot.residents.toLocaleString("id-ID")}
            </span>
          </div>

          <div className="flex flex-col items-end bg-[#101820] px-2 py-1 border-2 border-t-[#374151] border-l-[#374151] border-r-white/40 border-b-white/40 shadow-inner rounded-[2px]">
            <span className="text-[9px] font-bold text-sky-400 tracking-wider">LANTAI</span>
            <span className="text-base sm:text-lg font-black font-mono text-sky-300 tracking-tight tabular-nums">
              {snapshot.floors}F
            </span>
          </div>
        </div>

        {/* Floating Combo Indicator */}
        {snapshot.combo > 1 && (
          <div className="pointer-events-none absolute inset-x-0 top-14 flex justify-center select-none">
            <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-400 text-black font-mono font-black text-xs border-2 border-amber-600 rounded-[2px] shadow-lg animate-bounce">
              <Sparkles className="w-3.5 h-3.5 text-red-600" />
              <span>COMBO x{snapshot.combo}!</span>
            </div>
          </div>
        )}

        {/* ── Authentic Win98 Dialog Overlay ── */}
        {(snapshot.phase === "ready" || snapshot.phase === "over" || paused || error) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] p-5 select-none">
            <div className="w-full max-w-[295px] border-2 border-t-white border-l-white border-r-black border-b-black bg-[#c0c0c0] shadow-2xl overflow-hidden">
              <div className="bg-[#000080] text-white px-2 py-1 font-bold text-[11px] flex items-center justify-between">
                <span>{error ? "KESALAHAN_SISTEM.EXE" : snapshot.phase === "ready" ? "TOWER98.EXE" : snapshot.phase === "over" ? "HASIL_KONSTRUKSI.LOG" : "JEDA_PERMAINAN.EXE"}</span>
                <span className="font-mono text-[9px] px-1 bg-blue-900 border border-blue-400/40 rounded">v1.1</span>
              </div>

              <div className="p-3.5 text-center bg-[#ece9d8]">
                <h2 className="text-lg font-black text-black">
                  {error ? "OOPS!" : snapshot.phase === "ready" ? "Bangun menaramu." : snapshot.phase === "over" ? "Yah, ambruk!" : "Lagi jeda."}
                </h2>

                {snapshot.phase === "over" && !error ? (
                  <div className="bg-white p-2 border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white font-mono text-xs space-y-1 my-2.5 text-left shadow-inner">
                    <div className="flex justify-between text-gray-700">
                      <span>Tinggi Menara:</span>
                      <span className="font-bold text-blue-900">{snapshot.floors} Lantai</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Total Warga:</span>
                      <span className="font-bold text-rose-800">{snapshot.residents.toLocaleString("id-ID")} Orang</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Total Skor:</span>
                      <span className="font-bold text-emerald-800">{snapshot.score.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="pt-1 border-t border-gray-200 flex justify-between text-gray-600 text-[11px]">
                      <span>Rekor Perangkat:</span>
                      <span className="font-bold text-amber-700">{best.toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1.5 mb-2.5 text-xs leading-relaxed text-gray-700">
                    {error || (snapshot.phase === "ready" ? "Lepas lantai dari crane. Susun rapi dan jaga keseimbangan fisika menaramu!" : "Menaranya aman. Lanjut kapan saja.")}
                  </p>
                )}

                {/* ── Difficulty / Level Selector ── */}
                {!error && (snapshot.phase === "ready" || snapshot.phase === "over") && (
                  <div className="my-2.5 text-left bg-white p-2 border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white shadow-inner font-mono">
                    <div className="flex items-center justify-between text-[10px] font-bold text-gray-700 mb-1.5">
                      <span>TINGKAT KESULITAN:</span>
                      <span className={cn(
                        "px-1 py-0.2 text-[9px] rounded font-bold uppercase",
                        difficulty === "santai" ? "bg-emerald-100 text-emerald-800" : difficulty === "normal" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                      )}>
                        {DIFFICULTY_CONFIGS[difficulty].badge}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {(["santai", "normal", "ekstrim"] as const).map((d) => {
                        const active = difficulty === d
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => changeDifficulty(d)}
                            className={cn(
                              "py-1 px-0.5 text-[10px] font-bold transition-all text-center rounded-[1px] cursor-pointer",
                              active
                                ? "bg-[#000080] text-white border-2 border-t-black border-l-black border-r-white border-b-white shadow-inner"
                                : "bg-[#ece9d8] text-gray-800 border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] hover:bg-[#dfdbcc]"
                            )}
                          >
                            {d === "santai" ? "🟢 Santai" : d === "normal" ? "🟡 Normal" : "🔴 Ekstrim"}
                          </button>
                        )
                      })}
                    </div>
                    <p className="mt-1.5 text-[9px] text-gray-600 leading-tight">
                      {DIFFICULTY_CONFIGS[difficulty].description}
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {snapshot.phase === "over" && !error && (
                    <RetroActionButton action="custom" icon={Trophy} visual="button" label="Klasemen & simpan skor" tooltip="Buka klasemen" onClick={() => setLeaderboardOpen(true)} className="min-h-9 w-full font-bold" />
                  )}
                  {!error && (
                    <RetroActionButton
                      action={snapshot.phase === "ready" || snapshot.phase === "over" ? "add" : "custom"}
                      visual="button"
                      size="md"
                      icon={Play}
                      label={snapshot.phase === "ready" ? "Mulai bangun" : snapshot.phase === "over" ? "Main lagi" : "Lanjutkan"}
                      tooltip="Main Tower 98"
                      onClick={() => (snapshot.phase === "ready" ? start() : snapshot.phase === "over" ? restart() : setPaused(false))}
                      className="min-h-10 w-full font-bold"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {leaderboardOpen && (
          <TowerLeaderboard
            score={
              snapshot.phase === "over" && snapshot.score > 0
                ? snapshot.score
                : bestRun.score > 0
                ? bestRun.score
                : snapshot.score
            }
            floors={
              snapshot.phase === "over" && snapshot.floors > 0
                ? snapshot.floors
                : bestRun.floors > 0
                ? bestRun.floors
                : snapshot.floors
            }
            muted={muted}
            onClose={() => setLeaderboardOpen(false)}
          />
        )}
      </div>

      {/* ── Retro Control Panel Bottom ── */}
      <div className="shrink-0 space-y-2 border-t-2 border-t-white bg-[#c0c0c0] p-2.5 shadow-inner">
        {/* Retro Inset Status Ticker */}
        <div className="flex items-center justify-center px-3 py-1.5 bg-[#121820] border-2 border-t-[#4b5563] border-l-[#4b5563] border-r-white border-b-white rounded-[2px] shadow-inner min-h-[34px]">
          <p
            role="status"
            aria-live="polite"
            className={cn(
              "text-xs font-mono font-bold tracking-wide transition-colors truncate text-center",
              snapshot.phase === "over"
                ? "text-rose-400 animate-pulse"
                : snapshot.phase === "falling"
                ? "text-yellow-300 animate-pulse"
                : snapshot.combo > 1
                ? "text-amber-300"
                : "text-emerald-400"
            )}
          >
            {snapshot.message}
          </p>
        </div>

        {/* Big Retro Action Drop Button */}
        <RetroActionButton
          action={snapshot.phase === "swinging" ? "add" : "custom"}
          visual="button"
          icon={ArrowDown}
          size="md"
          label={
            snapshot.phase === "swinging"
              ? "LEPAS LANTAI (SPASI)"
              : snapshot.phase === "falling"
              ? "TUNGGU STABIL..."
              : snapshot.phase === "ready"
              ? "MULAI BANGUN"
              : "LEPAS LANTAI"
          }
          tooltip="Klik atau tekan Spasi untuk melepaskan lantai"
          disabled={snapshot.phase !== "swinging" || suspended || !!error}
          onClick={drop}
          className={cn(
            "w-full min-h-11 font-mono font-extrabold text-xs tracking-wider",
            snapshot.phase === "swinging" && !suspended && !error
              ? "shadow-md active:translate-y-0.5"
              : "opacity-60"
          )}
        />

        {/* Beveled Footer Status */}
        <div className="flex items-center justify-between px-2.5 py-1 bg-[#d4d0c8] border border-t-[#808080] border-l-[#808080] border-r-white border-b-white text-[10px] font-mono shadow-inner text-[#475569]">
          <span className="flex items-center gap-1 font-semibold">
            <span className="px-1 py-0.2 bg-white/80 border border-gray-400 rounded-[1px] text-[9px] text-gray-800 shadow-sm font-bold">
              SPASI
            </span>
            <span>atau Tap Layar</span>
          </span>
          <span className="flex items-center gap-1 font-bold text-emerald-800">
            <Trophy className="w-3 h-3 text-amber-600" />
            <span>Rekor: {best.toLocaleString("id-ID")}</span>
          </span>
        </div>
      </div>
      <ConfirmDialog isOpen={restartOpen} onClose={() => setRestartOpen(false)} onConfirm={restart} title="ULANG_TOWER.EXE" variant="warning" message="Mulai dari fondasi lagi? Progres permainan ini akan diulang." confirmText="Ulangi" />
    </div>
  )
}
