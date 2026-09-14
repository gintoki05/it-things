"use client"

import * as React from "react"
import {
  Download,
  Video,
  Music,
  Clipboard,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Film,
} from "lucide-react"
import {
  fetchMediaMetadataAction,
  resolveMediaDownloadAction,
  SupportedPlatform,
  MediaMetadataResult,
  MediaDownloadResult,
} from "@/app/actions/media-grabber"
import { playRetroNotificationSound } from "@/lib/sound-effects"
import { cn } from "@/lib/utils"

export function MediaDownloadTool() {
  const [url, setUrl] = React.useState("")
  const [format, setFormat] = React.useState<"video" | "audio">("video")
  const [quality, setQuality] = React.useState<"auto" | "1080" | "720">("auto")

  // States
  const [meta, setMeta] = React.useState<MediaMetadataResult | null>(null)
  const [isLoadingMeta, setIsLoadingMeta] = React.useState(false)
  const [isDownloading, setIsDownloading] = React.useState(false)
  const [downloadResult, setDownloadResult] = React.useState<MediaDownloadResult | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [cooldown, setCooldown] = React.useState<number>(0)

  // Cooldown countdown timer
  React.useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // Debounced auto-fetch metadata when URL changes
  React.useEffect(() => {
    const trimmed = url.trim()

    if (!trimmed || !trimmed.startsWith("http")) {
      const resetTimer = setTimeout(() => {
        setMeta(null)
      }, 0)
      return () => clearTimeout(resetTimer)
    }

    const timer = setTimeout(async () => {
      setIsLoadingMeta(true)
      try {
        const res = await fetchMediaMetadataAction(trimmed)
        setMeta(res.success ? res : null)
      } catch {
        setMeta(null)
      } finally {
        setIsLoadingMeta(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [url])

  // Paste from clipboard
  const handlePaste = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText()
        if (text) {
          setUrl(text.trim())
          setDownloadResult(null)
          setErrorMessage(null)
          playRetroNotificationSound(0.2)
        }
      }
    } catch {
      // ignore clipboard rejection
    }
  }

  // Clear input
  const handleClear = () => {
    setUrl("")
    setMeta(null)
    setDownloadResult(null)
    setErrorMessage(null)
  }

  // Submit Download
  const handleDownload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) {
      setErrorMessage("Masukkan tautan URL terlebih dahulu.")
      return
    }

    if (cooldown > 0 || isDownloading) return

    setErrorMessage(null)
    setDownloadResult(null)
    setIsDownloading(true)

    try {
      const result = await resolveMediaDownloadAction({
        url: trimmed,
        format,
        quality,
      })

      if (!result.success) {
        setErrorMessage(result.error || "Gagal mengunduh media dari tautan ini.")
        playRetroNotificationSound(0.3)
      } else {
        setDownloadResult(result)
        playRetroNotificationSound(0.4)

        if (result.downloadUrl) {
          const a = document.createElement("a")
          a.href = result.downloadUrl
          a.download = result.filename || "media_download"
          a.target = "_blank"
          a.rel = "noopener noreferrer"
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
        } else if (result.helperUrl) {
          window.open(result.helperUrl, "_blank")
        }

        setCooldown(5)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghubungi server."
      setErrorMessage(msg)
      playRetroNotificationSound(0.3)
    } finally {
      setIsDownloading(false)
    }
  }

  const isYouTube = meta?.platform === "youtube" || url.toLowerCase().includes("youtube.com") || url.toLowerCase().includes("youtu.be")

  const renderPlatformBadge = (platform?: SupportedPlatform) => {
    const p = platform || meta?.platform
    switch (p) {
      case "youtube":
        return (
          <span className="bg-amber-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0">
            YOUTUBE (DIBATASI)
          </span>
        )
      case "tiktok":
        return (
          <span className="bg-black text-cyan-400 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0">
            TIKTOK
          </span>
        )
      case "twitter":
        return (
          <span className="bg-sky-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0">
            X / TWITTER
          </span>
        )
      case "instagram":
        return (
          <span className="bg-pink-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0">
            INSTAGRAM
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#C0C0C0] text-black font-sans text-xs p-3 overflow-y-auto select-none space-y-3">
      {/* ── Input Box & Controls ── */}
      <div className="bg-[#D4D0C8] border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white p-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[11px] text-[#000080]">Tautan:</span>
            {renderPlatformBadge()}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePaste}
              className="h-6 px-2 text-[11px] font-mono bg-[#C0C0C0] hover:bg-white border border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:translate-y-px flex items-center gap-1 cursor-pointer font-bold"
              title="Paste dari Clipboard"
            >
              <Clipboard className="size-3" />
              <span>PASTE</span>
            </button>
            {url && (
              <button
                type="button"
                onClick={handleClear}
                className="h-6 px-2 text-[11px] font-mono bg-[#C0C0C0] hover:bg-rose-100 text-rose-900 border border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:translate-y-px flex items-center gap-1 cursor-pointer"
                title="Hapus"
              >
                <Trash2 className="size-3" />
              </button>
            )}
          </div>
        </div>

        <input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setDownloadResult(null)
            setErrorMessage(null)
          }}
          placeholder="Tempel tautan TikTok atau Twitter/X..."
          disabled={isDownloading}
          className="w-full bg-white text-black font-mono text-xs p-2 border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white outline-none focus:bg-amber-50/30 selection:bg-[#000080] selection:text-white"
        />

        {/* Platform Status Bar */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-600 flex-wrap pt-0.5">
          <span className="text-gray-500">Platform:</span>
          <span className="px-1 py-0.2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-bold">
            ✓ TikTok
          </span>
          <span className="px-1 py-0.2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-bold">
            ✓ Twitter / X
          </span>
          <span className="px-1 py-0.2 bg-amber-50 text-amber-700 border border-amber-300 rounded font-bold">
            ! YouTube (Dibatasi)
          </span>
        </div>

        {/* Warning jika link YouTube */}
        {isYouTube && (
          <div className="flex items-start gap-1.5 p-2 bg-amber-50 border border-amber-500 text-amber-950 text-[11px] leading-tight">
            <AlertCircle className="size-3.5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900">Unduhan YouTube Sementara Dibatasi</p>
              <p className="text-[10px] text-amber-800 mt-0.5">
                Karena proteksi bot server YouTube, fitur unduh YouTube ditunda terlebih dahulu. Saat ini silakan gunakan tautan dari <b>TikTok</b> atau <b>Twitter/X</b>.
              </p>
            </div>
          </div>
        )}

        {/* Compact Metadata Preview */}
        {isLoadingMeta && (
          <div className="flex items-center gap-2 py-1 px-2 bg-white/70 border border-gray-400 font-mono text-[10px] text-gray-600">
            <div className="size-2.5 rounded-full border-2 border-[#000080] border-t-transparent animate-spin" />
            <span>Memeriksa tautan...</span>
          </div>
        )}

        {meta && meta.success && !isLoadingMeta && (
          <div className="flex items-center gap-2.5 p-1.5 bg-white border border-gray-400 text-xs shadow-inner">
            {meta.thumbnail ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={meta.thumbnail}
                alt="Thumbnail"
                className="size-10 object-cover shrink-0 border border-gray-400 bg-black rounded-[1px]"
              />
            ) : (
              <div className="size-10 bg-gray-200 border border-gray-400 flex items-center justify-center shrink-0">
                <Film className="size-5 text-gray-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-xs truncate text-slate-900 leading-tight">
                {meta.title}
              </p>
              {meta.author && (
                <p className="text-[10px] text-gray-600 truncate font-mono">
                  {meta.author}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Format & Resolution Bar ── */}
      <div className="bg-[#D4D0C8] border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] p-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold">
            <input
              type="radio"
              name="media-fmt"
              value="video"
              checked={format === "video"}
              onChange={() => setFormat("video")}
              className="accent-[#000080]"
            />
            <Video className="size-3.5 text-blue-800" />
            <span>Video (MP4)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold">
            <input
              type="radio"
              name="media-fmt"
              value="audio"
              checked={format === "audio"}
              onChange={() => setFormat("audio")}
              className="accent-[#000080]"
            />
            <Music className="size-3.5 text-emerald-800" />
            <span>Audio (MP3)</span>
          </label>
        </div>

        {format === "video" && (
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value as "auto" | "1080" | "720")}
            className="bg-white text-black font-mono text-[11px] px-2 py-0.5 border border-t-[#808080] border-l-[#808080] border-r-white border-b-white outline-none cursor-pointer"
          >
            <option value="auto">Auto / 1080p</option>
            <option value="1080">1080p FHD</option>
            <option value="720">720p HD</option>
          </select>
        )}
      </div>

      {/* ── Progress Bar ── */}
      {isDownloading && (
        <div className="bg-[#D4D0C8] border border-[#808080] p-2 space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-[#000080] font-bold">
            <span>MEMPROSES STREAM...</span>
            <span className="animate-pulse">TUNGGU...</span>
          </div>
          <div className="w-full h-3 bg-white border border-[#808080] p-0.5 overflow-hidden">
            <div className="h-full bg-[#000080] w-full animate-pulse" />
          </div>
        </div>
      )}

      {/* ── Error Banner ── */}
      {errorMessage && (
        <div className="bg-red-50 border-2 border-red-600 p-2 flex items-center gap-2 text-red-900 text-xs">
          <AlertCircle className="size-4 shrink-0 text-red-600" />
          <span className="text-[11px] leading-tight flex-1">{errorMessage}</span>
        </div>
      )}

      {/* ── Result Ready ── */}
      {downloadResult && downloadResult.success && (
        <div className="bg-emerald-50 border-2 border-emerald-600 p-2.5 space-y-2 text-emerald-950 text-xs">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-emerald-700 shrink-0" />
            <span className="font-bold truncate text-[11px]">
              {downloadResult.filename || "Unduhan Berhasil"}
            </span>
          </div>

          {downloadResult.downloadUrl ? (
            <a
              href={downloadResult.downloadUrl}
              download={downloadResult.filename}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-1.5 px-3 bg-[#000080] hover:bg-[#0000A0] text-white font-mono font-bold text-center flex items-center justify-center gap-1.5 border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] active:translate-y-px cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>UNDUH BERKAS</span>
            </a>
          ) : downloadResult.helperUrl ? (
            <a
              href={downloadResult.helperUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-1.5 px-3 bg-[#107C41] hover:bg-[#0E6837] text-white font-mono font-bold text-center flex items-center justify-center gap-1.5 border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] active:translate-y-px cursor-pointer"
            >
              <ExternalLink className="size-3.5" />
              <span>UNDUH DI {downloadResult.helperName?.toUpperCase() || "SAVEFROM (IDSAVE)"}</span>
            </a>
          ) : null}
        </div>
      )}

      {/* ── Download Action Button ── */}
      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading || !url.trim() || cooldown > 0 || isYouTube}
        className={cn(
          "w-full py-2 px-4 font-mono font-bold text-xs uppercase flex items-center justify-center gap-2 border-2 transition-all select-none",
          isDownloading || !url.trim() || cooldown > 0 || isYouTube
            ? "bg-[#D4D0C8] text-gray-500 border-gray-400 cursor-not-allowed"
            : "bg-[#000080] hover:bg-[#0000A0] text-white border-t-white border-l-white border-r-[#404040] border-b-[#404040] active:border-t-[#404040] active:border-l-[#404040] active:border-r-white active:border-b-white cursor-pointer shadow-sm"
        )}
      >
        <Download className="size-4" />
        <span>
          {isDownloading
            ? "MEMPROSES..."
            : isYouTube
            ? "YOUTUBE SEMENTARA DIBATASI"
            : cooldown > 0
            ? `COOLDOWN (${cooldown}S)`
            : "DOWNLOAD"}
        </span>
      </button>
    </div>
  )
}
