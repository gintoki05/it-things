"use client"

import * as React from "react"
import { useWinamp, WinampTrack, extractYouTubeId } from "@/lib/winamp-store"
import { fetchYouTubeMeta } from "@/lib/youtube-meta"
import { WinampVideoScreen } from "./winamp/winamp-video-screen"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { RetroActionButton } from "@/components/ui/retro-action-button"
import { cn } from "@/lib/utils"
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Share2,
  Tv,
  ListMusic,
  Sparkles,
  Link,
  Music,
  Check,
} from "lucide-react"

export function WinampApp() {
  const {
    playlist,
    currentTrack,
    currentTrackIndex,
    isPlaying,
    volume,
    isMuted,
    isVideoOpen,
    isPlaylistOpen,
    elapsedSeconds,
    playTrack,
    togglePlay,
    stop,
    nextTrack,
    prevTrack,
    setVolume,
    toggleMute,
    toggleVideo,
    togglePlaylist,
    addTrack,
    removeTrack,
    clearPlaylist,
    shareCurrentTrackToChat,
  } = useWinamp()

  const [inputUrl, setInputUrl] = React.useState("")
  const [inputTitle, setInputTitle] = React.useState("")
  const [isFetchingTitle, setIsFetchingTitle] = React.useState(false)
  const [isAdding, setIsAdding] = React.useState(playlist.length === 0)
  const [sharedNotice, setSharedNotice] = React.useState(false)
  const [trackToDelete, setTrackToDelete] = React.useState<WinampTrack | null>(null)
  const [showClearConfirm, setShowClearConfirm] = React.useState(false)

  // Auto-detect YouTube video title when user pastes or types a link
  React.useEffect(() => {
    const trimmed = inputUrl.trim()
    const ytId = extractYouTubeId(trimmed)
    if (ytId && !inputTitle) {
      let active = true
      setIsFetchingTitle(true)
      fetchYouTubeMeta(ytId)
        .then((meta) => {
          if (active && meta?.title) {
            setInputTitle(meta.title)
          }
        })
        .finally(() => {
          if (active) setIsFetchingTitle(false)
        })
      return () => {
        active = false
      }
    }
  }, [inputUrl, inputTitle])

  // Dynamic Spectrum Equalizer: Reactive to playback, volume level, and mute
  const [spectrumHeights, setSpectrumHeights] = React.useState<number[]>(Array(16).fill(2))

  React.useEffect(() => {
    if (!isPlaying || isMuted || volume === 0) {
      setSpectrumHeights(Array(16).fill(2))
      return
    }

    const volScale = volume / 100

    const interval = setInterval(() => {
      setSpectrumHeights(
        Array.from({ length: 16 }, (_, i) => {
          // Rhythmic frequency curve: bass on left (0-4), mid in center (5-11), treble on right (12-15)
          const freqMultiplier = i < 4 ? 1.15 : i < 11 ? 0.95 : 0.8
          const variance = Math.random() * 20 * volScale * freqMultiplier
          const rawHeight = Math.floor(variance) + 2
          return Math.min(22, Math.max(2, rawHeight))
        })
      )
    }, 100)

    return () => clearInterval(interval)
  }, [isPlaying, isMuted, volume])

  // Format MM:SS for LCD
  const elapsedMinutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")
  const elapsedSecs = String(elapsedSeconds % 60).padStart(2, "0")

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputUrl.trim()) return
    const added = addTrack(inputUrl, inputTitle)
    if (added) {
      setInputUrl("")
      setInputTitle("")
      setIsAdding(false)
    }
  }

  const handleShareClick = async () => {
    const success = await shareCurrentTrackToChat()
    if (success) {
      setSharedNotice(true)
      setTimeout(() => setSharedNotice(false), 2500)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#1C1C1C] text-gray-200 font-mono text-xs select-none p-2 overflow-y-auto overscroll-contain">
      {/* ═══════════════════════════════════════════════════════════
          MODULE 1: CRT VIDEO SCREEN (IF ENABLED)
      ════════════════════════════════════════════════════════════ */}
      {isVideoOpen && <WinampVideoScreen />}

      {/* ═══════════════════════════════════════════════════════════
          MODULE 2: MAIN WINAMP CHASSIS (AUTHENTIC 2.91 RETRO LOOK)
      ════════════════════════════════════════════════════════════ */}
      <div className="bg-[#2B2B2B] shrink-0 border-2 border-t-[#555] border-l-[#555] border-r-black border-b-black rounded-[2px] shadow-2xl p-2.5 flex flex-col gap-2 relative">
        {/* Top Winamp Title Strip */}
        <div className="flex items-center justify-between pb-1 border-b border-[#3E3E3E] text-[10px] text-gray-400 font-bold">
          <div className="flex items-center gap-1.5 text-blue-300">
            <Music className="size-3 text-yellow-400" />
            <span className="tracking-widest text-[#00E5FF]">WINAMP 2.91</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Quick Paste Link Button */}
            <button
              type="button"
              onClick={() => {
                if (!isPlaylistOpen) togglePlaylist()
                setIsAdding(true)
              }}
              title="Tambah / Paste link musik atau video YouTube"
              className="px-1.5 py-0.5 rounded-[1px] font-bold text-[9px] border bg-[#000080] hover:bg-blue-800 text-cyan-100 border-blue-400 cursor-pointer active:translate-y-px transition-colors shadow-xs flex items-center gap-1"
            >
              <Plus className="size-2.5" />
              <span>Paste Link</span>
            </button>

            {/* Toggle Video Button */}
            <button
              type="button"
              onClick={() => toggleVideo()}
              title="Toggle Layar Video CRT (VID)"
              className={cn(
                "px-1.5 py-0.5 rounded-[1px] font-bold text-[9px] border cursor-pointer active:translate-y-px transition-colors",
                isVideoOpen
                  ? "bg-cyan-700 text-cyan-100 border-cyan-400 shadow-xs"
                  : "bg-[#383838] hover:bg-[#484848] text-gray-400 border-black"
              )}
            >
              VID
            </button>

            {/* Toggle Playlist Button */}
            <button
              type="button"
              onClick={() => togglePlaylist()}
              title="Toggle Modul Playlist (PL)"
              className={cn(
                "px-1.5 py-0.5 rounded-[1px] font-bold text-[9px] border cursor-pointer active:translate-y-px transition-colors",
                isPlaylistOpen
                  ? "bg-amber-700 text-amber-100 border-amber-400 shadow-xs"
                  : "bg-[#383838] hover:bg-[#484848] text-gray-400 border-black"
              )}
            >
              PL
            </button>
          </div>
        </div>

        {/* ── Classic Green LCD Display ── */}
        <div className="bg-black border-2 border-t-black border-l-black border-r-[#404040] border-b-[#404040] rounded-[2px] p-2 flex flex-col justify-between shadow-[inset_0_0_10px_rgba(0,0,0,0.9)] relative overflow-hidden">
          {/* Subtle LCD glass lines */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(0,255,0,0)_50%,rgba(0,0,0,0.8)_50%)] bg-[length:100%_2px]"
          />

          {/* Top Row: Track Time & Running Title Marquee */}
          <div className="flex items-center gap-3 relative z-10">
            {/* Elapsed Timer Digits */}
            <div className="bg-[#041F04] border border-[#005500] px-2 py-0.5 rounded-[2px] text-center shrink-0 shadow-inner">
              <div className="text-[14px] font-black tracking-widest text-[#00FF41] drop-shadow-[0_0_6px_#00FF41]">
                {elapsedMinutes}:{elapsedSecs}
              </div>
            </div>

            {/* Marquee Running Song Title */}
            <div className="flex-1 overflow-hidden relative h-6 flex items-center bg-[#041804] border border-[#004400] px-2 rounded-[2px]">
              <div
                className={cn(
                  "whitespace-nowrap text-[#00FF66] font-bold text-[11px] drop-shadow-[0_0_5px_#00FF66]",
                  isPlaying || !currentTrack ? "animate-marquee" : ""
                )}
              >
                {currentTrack
                  ? `${currentTrackIndex + 1}. ${currentTrack.title} *** IT-THINGS WINAMP 2.91 *** `
                  : "*** PASTE LINK YOUTUBE DI BAWAH UNTUK MEMUTAR MUSIK & VIDEO *** WINAMP 2.91 *** "}
              </div>
            </div>
          </div>

          {/* Bottom Row: Bitrate Specs & 16-Band Spectrum Equalizer */}
          <div className="flex items-end justify-between mt-2 pt-1.5 border-t border-[#003300] relative z-10">
            {/* Technical Bitrate & Sample Rate Readout */}
            <div className="flex items-center gap-2 text-[9px] text-[#00CC55] font-mono opacity-90">
              <span className="bg-[#002B00] px-1 py-0.2 rounded border border-[#005500]">
                {currentTrack?.sourceType === "youtube" ? "YOUTUBE" : "192 kbps"}
              </span>
              <span className="bg-[#002B00] px-1 py-0.2 rounded border border-[#005500]">
                44.1 kHz
              </span>
              <span className="text-[#00FF66] font-bold">STEREO</span>
            </div>

            {/* 16-Band Vertical Animated Spectrum Bars */}
            <div className="flex items-end gap-0.5 h-6 px-1 bg-[#021002] border border-[#003300] rounded-[1px]">
              {spectrumHeights.map((height, i) => (
                <div
                  key={i}
                  style={{ height: `${height}px` }}
                  className={cn(
                    "w-1 transition-all duration-75 rounded-[0.5px]",
                    height > 18
                      ? "bg-red-500 shadow-[0_0_3px_red]"
                      : height > 10
                      ? "bg-yellow-400"
                      : "bg-[#00FF41]"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Transport Controls & Sliders ── */}
        <div className="flex flex-col gap-2 pt-1">
          {/* Main Transport Buttons */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevTrack}
                title="Lagu Sebelumnya"
                className="size-7 bg-[#383838] hover:bg-[#484848] active:bg-[#202020] text-gray-200 border-2 border-t-[#666] border-l-[#666] border-r-black border-b-black rounded-[2px] flex items-center justify-center cursor-pointer shadow-xs active:translate-y-px"
              >
                <SkipBack className="size-3.5 fill-current" />
              </button>

              <button
                type="button"
                onClick={togglePlay}
                title={isPlaying ? "Jeda (Pause)" : "Putar (Play)"}
                className={cn(
                  "h-7 px-3 border-2 rounded-[2px] flex items-center gap-1 font-bold text-xs cursor-pointer shadow-xs active:translate-y-px transition-colors",
                  isPlaying
                    ? "bg-emerald-700 hover:bg-emerald-600 text-white border-t-emerald-400 border-l-emerald-400 border-r-emerald-950 border-b-emerald-950 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    : "bg-[#383838] hover:bg-[#484848] text-emerald-400 border-t-[#666] border-l-[#666] border-r-black border-b-black"
                )}
              >
                {isPlaying ? (
                  <>
                    <Pause className="size-3.5 fill-current" />
                    <span>PAUSE</span>
                  </>
                ) : (
                  <>
                    <Play className="size-3.5 fill-current" />
                    <span>PLAY</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={stop}
                title="Berhenti (Stop)"
                className="size-7 bg-[#383838] hover:bg-[#484848] active:bg-[#202020] text-gray-200 border-2 border-t-[#666] border-l-[#666] border-r-black border-b-black rounded-[2px] flex items-center justify-center cursor-pointer shadow-xs active:translate-y-px"
              >
                <Square className="size-3 fill-current" />
              </button>

              <button
                type="button"
                onClick={nextTrack}
                title="Lagu Berikutnya"
                className="size-7 bg-[#383838] hover:bg-[#484848] active:bg-[#202020] text-gray-200 border-2 border-t-[#666] border-l-[#666] border-r-black border-b-black rounded-[2px] flex items-center justify-center cursor-pointer shadow-xs active:translate-y-px"
              >
                <SkipForward className="size-3.5 fill-current" />
              </button>
            </div>

            {/* Quick Share to Chat Button */}
            <button
              type="button"
              onClick={handleShareClick}
              disabled={!currentTrack}
              title="Bagikan lagu yang sedang diputar ke obrolan tim (chat.exe)"
              className="h-7 px-2 bg-[#1E4E8C] hover:bg-[#153A6B] text-white border border-t-[#6BA3E8] border-l-[#6BA3E8] border-r-[#0D2440] border-b-[#0D2440] rounded-[2px] font-bold text-[10px] flex items-center gap-1 cursor-pointer active:translate-y-px shadow-xs disabled:opacity-50"
            >
              {sharedNotice ? (
                <>
                  <Check className="size-3 text-emerald-300" />
                  <span>Terkirim!</span>
                </>
              ) : (
                <>
                  <Share2 className="size-3 text-cyan-200" />
                  <span>Share ke Chat</span>
                </>
              )}
            </button>
          </div>

          {/* Volume Slider Bar */}
          <div className="flex items-center gap-2 bg-[#202020] px-2 py-1.5 rounded border border-[#333]">
            <button
              type="button"
              onClick={toggleMute}
              title={isMuted ? "Unmute Volume" : "Mute Volume"}
              className="text-gray-400 hover:text-white cursor-pointer"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="size-3.5 text-red-400" />
              ) : (
                <Volume2 className="size-3.5 text-cyan-400" />
              )}
            </button>
            <span className="text-[9px] text-gray-400 w-6">VOL</span>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume Slider"
              className="flex-1 h-1.5 bg-black rounded-lg appearance-none cursor-pointer accent-[#00E5FF]"
            />
            <span className="text-[10px] font-bold text-[#00FF41] w-7 text-right">
              {isMuted ? "0%" : `${volume}%`}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MODULE 3: PLAYLIST DRAWER & URL INPUT
      ════════════════════════════════════════════════════════════ */}
      {isPlaylistOpen && (
        <div className="mt-2 shrink-0 bg-[#222222] border-2 border-t-[#555] border-l-[#555] border-r-black border-b-black rounded-[2px] p-2 flex flex-col gap-2 shadow-xl">
          {/* Playlist Title & Preset Header */}
          <div className="flex items-center justify-between pb-1 border-b border-[#3A3A3A] text-[10px]">
            <div className="flex items-center gap-1 text-amber-400 font-bold">
              <ListMusic className="size-3.5" />
              <span>PLAYLIST & INPUT URL ({playlist.length})</span>
            </div>
            <div className="flex items-center gap-1.5">
              {playlist.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  title="Kosongkan seluruh playlist"
                  className="px-1.5 py-0.5 bg-[#333] hover:bg-red-950 text-red-300 hover:text-red-200 border border-t-[#666] border-l-[#666] border-r-black border-b-black rounded-[2px] font-bold text-[9px] cursor-pointer flex items-center gap-1 active:translate-y-px"
                >
                  <Trash2 className="size-2.5" />
                  <span>Kosongkan</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsAdding((prev) => !prev)}
                className="px-2 py-0.5 bg-[#333] hover:bg-[#444] text-yellow-300 border border-t-[#666] border-l-[#666] border-r-black border-b-black rounded-[2px] font-bold text-[9px] cursor-pointer flex items-center gap-1 active:translate-y-px"
              >
                <Plus className="size-2.5" />
                <span>{isAdding ? "Tutup Form" : "Paste Link"}</span>
              </button>
            </div>
          </div>

          {/* URL Input Form (Collapsible) */}
          {isAdding && (
            <form
              onSubmit={handleAddSubmit}
              className="p-2 bg-[#1A1A1A] border border-[#444] rounded-[2px] flex flex-col gap-1.5"
            >
              <div className="text-[10px] font-bold text-gray-300 flex items-center gap-1">
                <Link className="size-3 text-cyan-400" />
                <span>Paste Link YouTube atau URL Audio MP3:</span>
              </div>
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... atau stream .mp3"
                required
                className="w-full bg-black border border-[#555] px-2 py-1 text-white text-[11px] rounded-[2px] focus:outline-hidden focus:border-cyan-400 font-mono"
              />
              <input
                type="text"
                value={inputTitle}
                onChange={(e) => setInputTitle(e.target.value)}
                placeholder={
                  isFetchingTitle
                    ? "⏳ Mendeteksi judul video YouTube..."
                    : "Judul lagu / video (otomatis terdeteksi dari YouTube)"
                }
                className="w-full bg-black border border-[#555] px-2 py-1 text-white text-[11px] rounded-[2px] focus:outline-hidden focus:border-cyan-400 font-mono"
              />
              <div className="flex items-center justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-2 py-0.5 bg-[#333] hover:bg-[#444] text-gray-300 rounded-[2px] text-[10px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3 py-0.5 bg-[#000080] hover:bg-blue-800 text-white font-bold rounded-[2px] text-[10px] border border-blue-400 cursor-pointer shadow-xs"
                >
                  + Masukkan ke Playlist
                </button>
              </div>
            </form>
          )}

          {/* Playlist Track List */}
          <div className="max-h-48 overflow-y-auto bg-black border border-[#333] p-1 flex flex-col gap-0.5 rounded-[2px]">
            {playlist.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-[11px] flex flex-col items-center gap-2">
                <span className="text-gray-400 italic">Playlist kosong. Paste URL YouTube / link audio di atas untuk memutar!</span>
                {!isAdding && (
                  <button
                    type="button"
                    onClick={() => setIsAdding(true)}
                    className="px-2.5 py-1 bg-[#1E4E8C] hover:bg-[#2A65B2] text-white font-bold rounded-[2px] text-[10px] border border-cyan-400 cursor-pointer shadow-xs flex items-center gap-1 active:translate-y-px"
                  >
                    <Plus className="size-3" />
                    <span>Paste Link</span>
                  </button>
                )}
              </div>
            ) : (
              playlist.map((track, idx) => {
                const isActive = currentTrack?.id === track.id
                return (
                  <div
                    key={track.id}
                    onClick={() => playTrack(track.id)}
                    className={cn(
                      "flex items-center justify-between gap-1.5 px-2 py-1 rounded-[1px] cursor-pointer text-[11px] transition-colors group",
                      isActive
                        ? "bg-[#000080] text-white font-bold shadow-xs"
                        : "hover:bg-[#1A1A1A] text-gray-300"
                    )}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="text-[10px] opacity-60 w-4">{idx + 1}.</span>
                      {isActive && isPlaying ? (
                        <span className="text-[#00FF41] animate-pulse shrink-0">▶</span>
                      ) : (
                        <span className="text-gray-500 shrink-0">♪</span>
                      )}
                      <span className="truncate">{track.title}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[9px] font-mono opacity-50 hidden sm:inline">
                        {track.duration || "Audio"}
                      </span>
                      <RetroActionButton
                        action="delete"
                        visual="icon"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          setTrackToDelete(track)
                        }}
                        tooltip="Hapus lagu dari playlist"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Retro Confirm Dialog: Hapus Single Lagu dari Playlist */}
      <ConfirmDialog
        isOpen={Boolean(trackToDelete)}
        onClose={() => setTrackToDelete(null)}
        onConfirm={() => {
          if (trackToDelete) {
            removeTrack(trackToDelete.id)
            setTrackToDelete(null)
          }
        }}
        title="HAPUS_LAGU.EXE"
        message={
          <span>
            Yakin ingin menghapus lagu{" "}
            <strong className="text-[#14253D] font-bold">
              &quot;{trackToDelete?.title}&quot;
            </strong>{" "}
            dari playlist?
          </span>
        }
        confirmText="Hapus Lagu"
        variant="destructive"
      />

      {/* Retro Confirm Dialog: Kosongkan Seluruh Playlist */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={() => {
          clearPlaylist()
          setShowClearConfirm(false)
        }}
        title="KOSONGKAN_PLAYLIST.EXE"
        message={
          <span>
            Yakin ingin menghapus seluruh{" "}
            <strong className="text-[#14253D] font-bold">
              {playlist.length} lagu
            </strong>{" "}
            dari playlist?
          </span>
        }
        confirmText="Kosongkan Semua"
        variant="destructive"
      />
    </div>
  )
}
