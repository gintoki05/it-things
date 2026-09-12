"use client"

import * as React from "react"
import { useWinamp, VideoFilter } from "@/lib/winamp-store"
import { cn } from "@/lib/utils"
import { Tv, Sparkles, Film, Eye, X, Plus, Link } from "lucide-react"

export function WinampVideoScreen() {
  const {
    currentTrack,
    isPlaying,
    videoFilter,
    setVideoFilter,
    toggleVideo,
    elapsedSeconds,
    addTrack,
  } = useWinamp()

  const [inputUrl, setInputUrl] = React.useState("")
  const [showQuickBar, setShowQuickBar] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const handlePlayUrl = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = inputUrl.trim()
    if (!trimmed) return
    const added = addTrack(trimmed)
    if (added) {
      setInputUrl("")
      setShowQuickBar(false)
      setErrorMsg(null)
    } else {
      setErrorMsg("URL tidak valid. Masukkan link YouTube yang benar.")
      setTimeout(() => setErrorMsg(null), 3500)
    }
  }

  // Format elapsed time as HH:MM:SS for VHS OSD
  const vhsTimeStr = React.useMemo(() => {
    const hrs = String(Math.floor(elapsedSeconds / 3600)).padStart(2, "0")
    const mins = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, "0")
    const secs = String(elapsedSeconds % 60).padStart(2, "0")
    return `${hrs}:${mins}:${secs}`
  }, [elapsedSeconds])

  const filterButtons: { id: VideoFilter; label: string; icon: string }[] = [
    { id: "crt", label: "CRT 90s", icon: "📺" },
    { id: "vhs", label: "VHS Tape", icon: "📼" },
    { id: "matrix", label: "Matrix", icon: "🟢" },
    { id: "clean", label: "Normal", icon: "🖥️" },
  ]

  const isYouTube = currentTrack?.sourceType === "youtube" && currentTrack.youtubeId

  return (
    <div className="flex flex-col shrink-0 bg-[#1A1A1A] border-2 border-t-[#505050] border-l-[#505050] border-r-black border-b-black rounded-[2px] shadow-lg overflow-hidden select-none mb-2 font-mono">
      {/* Mini Title Bar for Video Module */}
      <div className="h-5 bg-gradient-to-r from-[#102A45] via-[#1E4E8C] to-[#102A45] px-2 flex items-center justify-between text-white text-[10px] font-bold">
        <div className="flex items-center gap-1.5">
          <Tv className="size-3 text-cyan-300" />
          <span className="tracking-wider">WINAMP VIDEO DISPLAY (AVS)</span>
          <span className="text-[8px] bg-black/40 px-1 rounded text-cyan-200">
            {videoFilter.toUpperCase()} MODE
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowQuickBar((prev) => !prev)}
            title="Paste link video YouTube baru"
            className="px-1.5 py-0.5 bg-[#000080] hover:bg-blue-800 text-cyan-100 border border-blue-400 rounded-[1px] text-[8px] font-bold cursor-pointer active:translate-y-px flex items-center gap-1"
          >
            <Plus className="size-2" />
            <span>{showQuickBar ? "Tutup" : "Paste Link"}</span>
          </button>
          <button
            type="button"
            onClick={() => toggleVideo(false)}
            title="Tutup Layar Video (Tekan VID untuk buka kembali)"
            className="size-3.5 bg-[#CBD5E1] hover:bg-white text-black border border-black rounded-[1px] flex items-center justify-center text-[9px] leading-none cursor-pointer"
          >
            ×
          </button>
        </div>
      </div>

      {/* Dropdown Quick Input Bar right on top of the Video Chassis */}
      {showQuickBar && (
        <form
          onSubmit={handlePlayUrl}
          className="bg-[#1A1A1A] border-b border-[#444] px-2 py-1.5 flex items-center gap-1.5 z-30"
        >
          <span className="text-cyan-400 text-[9px] font-bold shrink-0 flex items-center gap-1">
            <Link className="size-2.5" />
            <span>YouTube:</span>
          </span>
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            autoFocus
            className="flex-1 bg-black border border-[#555] px-2 py-0.5 text-white text-[11px] rounded-[1px] focus:outline-hidden focus:border-cyan-400 font-mono"
          />
          <button
            type="submit"
            className="px-2.5 py-0.5 bg-[#000080] hover:bg-blue-800 text-white font-bold text-[9px] rounded-[1px] border border-blue-400 cursor-pointer shadow-xs active:translate-y-px"
          >
            Putar ▶
          </button>
        </form>
      )}

      {/* Retro Monitor Tube Chassis */}
      <div className="p-2 bg-[#2D2D2D] border-t border-[#404040]">
        {/* Curved Glass Screen Container */}
        <div className="relative w-full aspect-video min-h-[220px] sm:min-h-[280px] bg-black rounded-[8px] overflow-hidden border-4 border-[#141414] shadow-[inset_0_0_20px_rgba(0,0,0,0.9)]">
          {isYouTube ? (
            <div
              className={cn(
                "absolute inset-0 size-full overflow-hidden transition-all",
                videoFilter === "matrix" && "contrast-125 brightness-90 hue-rotate-[95deg] saturate-150",
                videoFilter === "vhs" && "contrast-110 saturate-125",
                videoFilter === "crt" && "contrast-105"
              )}
            >
              {/* Actual YouTube Embed */}
              <iframe
                id="winamp-crt-youtube-iframe"
                src={`https://www.youtube.com/embed/${currentTrack.youtubeId}?autoplay=1&enablejsapi=1&controls=1&modestbranding=1&rel=0`}
                title={currentTrack.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                className="size-full border-0 pointer-events-auto"
              />

              {/* ── Overlay Filter Layer ── */}
              {/* 1. CRT Scanlines Horizontal Lines */}
              {videoFilter === "crt" && (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 pointer-events-none z-10 opacity-40 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.75)_50%)] bg-[length:100%_4px]"
                />
              )}

              {/* 2. VHS OSD & Glitch Overlay */}
              {videoFilter === "vhs" && (
                <>
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none z-10 opacity-30 bg-[linear-gradient(rgba(255,255,255,0.05)_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_3px]"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute top-2 left-3 z-20 pointer-events-none font-mono text-[11px] font-bold text-[#39FF14] tracking-widest drop-shadow-[0_0_4px_#39FF14]"
                  >
                    <div>{isPlaying ? "PLAY ▶" : "PAUSE ❚❚"} SP</div>
                    <div className="text-[10px] text-yellow-300 mt-0.5">{vhsTimeStr}</div>
                  </div>
                  <div
                    aria-hidden="true"
                    className="absolute top-2 right-3 z-20 pointer-events-none font-mono text-[9px] font-bold text-white/80 bg-red-600/80 px-1 py-0.2 rounded"
                  >
                    REC ●
                  </div>
                </>
              )}

              {/* 3. Matrix Green Terminal Overlay */}
              {videoFilter === "matrix" && (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 pointer-events-none z-10 bg-emerald-900/20 mix-blend-color bg-[linear-gradient(rgba(0,255,65,0.1)_50%,rgba(0,0,0,0.6)_50%)] bg-[length:100%_4px]"
                />
              )}

              {/* Glass Tube Glare & Vignette Curve Reflection (Active on all retro filters) */}
              {videoFilter !== "clean" && (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_35px_rgba(0,0,0,0.85)] bg-[radial-gradient(ellipse_at_center,transparent_65%,rgba(0,0,0,0.6)_100%)]"
                />
              )}
            </div>
          ) : !currentTrack ? (
            /* Standby / Direct CRT Input Screen for Pasting YouTube Link */
            <div className="size-full flex flex-col items-center justify-center bg-[#071307] text-[#00FF66] p-4 text-center relative overflow-hidden">
              {/* Scanlines */}
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none opacity-40 bg-[linear-gradient(rgba(0,255,0,0)_50%,rgba(0,0,0,0.8)_50%)] bg-[length:100%_4px]"
              />
              <div className="relative z-10 flex flex-col items-center w-full max-w-md px-3">
                <div className="size-10 rounded-full border-2 border-[#00FF66] bg-[#032003] flex items-center justify-center mb-1.5 shadow-[0_0_12px_#00FF66]">
                  <Tv className="size-5 text-[#00FF66] animate-pulse" />
                </div>
                <div className="font-bold text-xs tracking-wider uppercase text-[#00FF66] drop-shadow-[0_0_8px_#00FF66]">
                  [ STANDBY: SIAP MEMUTAR VIDEO ]
                </div>
                <p className="text-[11px] text-emerald-300 mt-1 font-mono">
                  Paste link YouTube langsung di bawah untuk mulai memutar:
                </p>

                {/* Direct Inline Form inside CRT Monitor */}
                <form
                  onSubmit={handlePlayUrl}
                  className="w-full mt-2.5 flex flex-col gap-1.5"
                >
                  <div className="flex items-center gap-1.5 bg-black/90 border-2 border-[#00FF66] p-1.5 rounded shadow-[0_0_15px_rgba(0,255,102,0.35)]">
                    <span className="text-[#00FF66] font-mono text-[10px] pl-1 select-none font-bold">
                      URL&gt;
                    </span>
                    <input
                      type="text"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder="Paste link YouTube (video / shorts)..."
                      className="flex-1 bg-transparent border-0 text-[#00FF66] placeholder:text-emerald-700/80 text-xs font-mono focus:outline-hidden"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1 bg-[#00FF66] hover:bg-[#33FF88] text-black font-black text-xs font-mono rounded-[1px] cursor-pointer active:translate-y-px transition-all shadow-[0_0_8px_#00FF66]"
                    >
                      PUTAR ▶
                    </button>
                  </div>

                  {errorMsg && (
                    <div className="text-rose-400 text-[10px] font-mono text-center">
                      {errorMsg}
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2 text-[9px] text-emerald-400/75 font-mono">
                    <span>A:\WINAMP&gt; READY</span>
                    <span>•</span>
                    <span>TEKAN ENTER ATAU KLIK PUTAR</span>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            /* Audio-Only Visualizer Placeholder Screen */
            <div className="size-full flex flex-col items-center justify-center bg-[#051105] text-[#00FF66] p-4 text-center relative overflow-hidden">
              {/* Scanlines */}
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none opacity-40 bg-[linear-gradient(rgba(0,255,0,0)_50%,rgba(0,0,0,0.8)_50%)] bg-[length:100%_4px]"
              />
              <div className="relative z-10 flex flex-col items-center">
                <div className="size-10 rounded-full border-2 border-[#00FF66] flex items-center justify-center mb-2 shadow-[0_0_10px_#00FF66]">
                  <Sparkles className="size-5 text-[#00FF66] animate-spin" />
                </div>
                <div className="font-bold text-xs tracking-wider uppercase drop-shadow-[0_0_6px_#00FF66]">
                  {currentTrack.title}
                </div>
                <div className="text-[10px] text-emerald-400/80 mt-1 font-mono">
                  [ AUDIO STREAM / DIRECT MP3 MODE ]
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Bezel Controls: Filter Mode Switcher */}
        <div className="mt-2 pt-1.5 border-t border-[#404040] flex items-center justify-between gap-1 text-[10px]">
          <div className="flex items-center gap-1">
            <span className="text-gray-400 text-[9px] mr-1 hidden sm:inline">FILTER:</span>
            {filterButtons.map((btn) => {
              const isActive = videoFilter === btn.id
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setVideoFilter(btn.id)}
                  title={`Ganti filter layar ke mode ${btn.label}`}
                  className={cn(
                    "px-1.5 py-0.5 rounded-[2px] font-bold border flex items-center gap-1 cursor-pointer transition-all active:translate-y-px",
                    isActive
                      ? "bg-[#1E4E8C] text-white border-t-[#6BA3E8] border-l-[#6BA3E8] border-r-[#0D2440] border-b-[#0D2440] shadow-xs"
                      : "bg-[#3A3A3A] hover:bg-[#4A4A4A] text-gray-300 border-t-[#505050] border-l-[#505050] border-r-black border-b-black"
                  )}
                >
                  <span className="text-[10px]">{btn.icon}</span>
                  <span className="text-[9px]">{btn.label}</span>
                </button>
              )
            })}
          </div>

          {/* Monitor Power LED */}
          <div className="flex items-center gap-1 text-[9px] text-gray-400 font-mono">
            <span
              className={cn(
                "size-2 rounded-full border border-black",
                isPlaying ? "bg-emerald-400 shadow-[0_0_6px_#34D399]" : "bg-amber-500"
              )}
            />
            <span className="hidden sm:inline">60Hz</span>
          </div>
        </div>
      </div>
    </div>
  )
}
