"use client"

import * as React from "react"
import { useChatStore } from "@/lib/chat-store"
import { useAuth } from "@/lib/auth"
import { fetchYouTubeMeta } from "@/lib/youtube-meta"

export type VideoFilter = "crt" | "vhs" | "matrix" | "clean"

export interface WinampTrack {
  id: string
  title: string
  url: string
  sourceType: "youtube" | "audio"
  youtubeId?: string
  duration?: string
  channel?: string
}

export const WINAMP_PRESETS: WinampTrack[] = []

export function extractYouTubeId(url: string): string | null {
  if (!url) return null
  const clean = url.trim()
  // Match youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  const match = clean.match(regExp)
  if (match && match[1]) return match[1]
  // Fallback if user just entered 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean
  return null
}

interface WinampContextType {
  playlist: WinampTrack[]
  currentTrack: WinampTrack | null
  currentTrackIndex: number
  isPlaying: boolean
  volume: number
  isMuted: boolean
  videoFilter: VideoFilter
  isVideoOpen: boolean
  isPlaylistOpen: boolean
  elapsedSeconds: number
  totalDurationSeconds: number
  playTrack: (id: string) => void
  togglePlay: () => void
  pause: () => void
  stop: () => void
  nextTrack: () => void
  prevTrack: () => void
  setVolume: (vol: number) => void
  toggleMute: () => void
  setVideoFilter: (filter: VideoFilter) => void
  toggleVideo: (open?: boolean) => void
  togglePlaylist: (open?: boolean) => void
  addTrack: (url: string, customTitle?: string) => WinampTrack | null
  removeTrack: (id: string) => void
  clearPlaylist: () => void
  shareCurrentTrackToChat: () => Promise<boolean>
}

const WinampContext = React.createContext<WinampContextType | undefined>(undefined)

const STORAGE_PLAYLIST_KEY = "it_things_winamp_playlist_v3"
const STORAGE_FILTER_KEY = "it_things_winamp_filter_v1"
const STORAGE_VOLUME_KEY = "it_things_winamp_volume_v1"

export function WinampProvider({ children }: { children: React.ReactNode }) {
  const { sendMessage } = useChatStore()
  const { user, isGuest } = useAuth()

  const [playlist, setPlaylist] = React.useState<WinampTrack[]>([])
  const [currentTrackId, setCurrentTrackId] = React.useState<string | null>(null)
  const [isPlaying, setIsPlaying] = React.useState<boolean>(false)
  const [volume, setVolumeState] = React.useState<number>(80)
  const [isMuted, setIsMuted] = React.useState<boolean>(false)
  const [videoFilter, setVideoFilterState] = React.useState<VideoFilter>("crt")
  const [isVideoOpen, setIsVideoOpen] = React.useState<boolean>(true)
  const [isPlaylistOpen, setIsPlaylistOpen] = React.useState<boolean>(true)
  const [elapsedSeconds, setElapsedSeconds] = React.useState<number>(0)
  const [isMounted, setIsMounted] = React.useState<boolean>(false)

  // Audio element ref for direct MP3 / audio stream
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  // Mark mounted on client
  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  // Load persisted settings
  React.useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const savedList = localStorage.getItem(STORAGE_PLAYLIST_KEY)
      if (savedList) {
        const parsed = JSON.parse(savedList)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPlaylist(parsed)
          setCurrentTrackId(parsed[0].id)

          // Auto-resolve any existing YouTube tracks with placeholder titles
          parsed.forEach((t: WinampTrack) => {
            if (
              t.youtubeId &&
              (!t.title ||
                t.title.startsWith("YouTube [") ||
                t.title.startsWith("YouTube Audio [") ||
                t.title.startsWith("YouTube Video [") ||
                t.title === "YouTube Audio")
            ) {
              fetchYouTubeMeta(t.youtubeId).then((meta) => {
                if (meta?.title) {
                  setPlaylist((prev) => {
                    const next = prev.map((item) =>
                      item.id === t.id ? { ...item, title: meta.title } : item
                    )
                    try {
                      localStorage.setItem(STORAGE_PLAYLIST_KEY, JSON.stringify(next))
                    } catch {}
                    return next
                  })
                }
              })
            }
          })
        }
      }
      const savedFilter = localStorage.getItem(STORAGE_FILTER_KEY) as VideoFilter | null
      if (savedFilter) setVideoFilterState(savedFilter)

      const savedVol = localStorage.getItem(STORAGE_VOLUME_KEY)
      if (savedVol) setVolumeState(Number(savedVol))
    } catch {
      // ignore
    }
  }, [])

  // Save playlist changes
  const savePlaylist = React.useCallback((tracks: WinampTrack[]) => {
    setPlaylist(tracks)
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_PLAYLIST_KEY, JSON.stringify(tracks))
      } catch {
        // ignore
      }
    }
  }, [])

  const currentTrackIndex = React.useMemo(() => {
    return playlist.findIndex((t) => t.id === currentTrackId)
  }, [playlist, currentTrackId])

  const currentTrack = playlist[currentTrackIndex] || null

  // Timer counter when playing
  React.useEffect(() => {
    if (!isPlaying) return
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [isPlaying])

  // Reset elapsed timer on track switch
  React.useEffect(() => {
    setElapsedSeconds(0)
  }, [currentTrackId])

  // Direct Audio element management
  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (!audioRef.current) {
      audioRef.current = new Audio()
    }
    const audio = audioRef.current

    if (currentTrack && currentTrack.sourceType === "audio") {
      if (audio.src !== currentTrack.url) {
        audio.src = currentTrack.url
      }
      audio.volume = isMuted ? 0 : volume / 100
      if (isPlaying) {
        audio.play().catch(() => {})
      } else {
        audio.pause()
      }
    } else {
      audio.pause()
    }
  }, [currentTrack, isPlaying, volume, isMuted])

  // Real YouTube IFrame API Synchronization (Volume, Mute, Play/Pause via postMessage)
  React.useEffect(() => {
    if (typeof window === "undefined") return

    const sendYTCommand = (func: string, args: unknown[] = []) => {
      const iframes = document.querySelectorAll<HTMLIFrameElement>("iframe")
      iframes.forEach((iframe) => {
        try {
          if (iframe.src && iframe.src.includes("youtube.com/embed")) {
            iframe.contentWindow?.postMessage(
              JSON.stringify({
                event: "command",
                func,
                args,
              }),
              "*"
            )
          }
        } catch {
          // ignore
        }
      })
    }

    const targetVol = isMuted ? 0 : volume
    sendYTCommand("setVolume", [targetVol])

    if (isMuted) {
      sendYTCommand("mute")
    } else {
      sendYTCommand("unMute")
    }

    if (isPlaying) {
      sendYTCommand("playVideo")
    } else {
      sendYTCommand("pauseVideo")
    }
  }, [currentTrackId, volume, isMuted, isPlaying])

  // Re-sync volume after iframe finishes initial load
  React.useEffect(() => {
    if (typeof window === "undefined" || !currentTrackId) return
    const timer = setTimeout(() => {
      const iframes = document.querySelectorAll<HTMLIFrameElement>("iframe")
      const targetVol = isMuted ? 0 : volume
      iframes.forEach((iframe) => {
        try {
          if (iframe.src && iframe.src.includes("youtube.com/embed")) {
            iframe.contentWindow?.postMessage(
              JSON.stringify({
                event: "command",
                func: "setVolume",
                args: [targetVol],
              }),
              "*"
            )
          }
        } catch {
          // ignore
        }
      })
    }, 800)
    return () => clearTimeout(timer)
  }, [currentTrackId, volume, isMuted])

  const playTrack = React.useCallback((id: string) => {
    setCurrentTrackId(id)
    setIsPlaying(true)
    setElapsedSeconds(0)
  }, [])

  const togglePlay = React.useCallback(() => {
    if (!currentTrack) return
    setIsPlaying((prev) => !prev)
  }, [currentTrack])

  const pause = React.useCallback(() => {
    setIsPlaying(false)
  }, [])

  const stop = React.useCallback(() => {
    setIsPlaying(false)
    setElapsedSeconds(0)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    if (typeof window !== "undefined") {
      const iframes = document.querySelectorAll<HTMLIFrameElement>("iframe")
      iframes.forEach((iframe) => {
        try {
          if (iframe.src && iframe.src.includes("youtube.com/embed")) {
            iframe.contentWindow?.postMessage(
              JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
              "*"
            )
            iframe.contentWindow?.postMessage(
              JSON.stringify({ event: "command", func: "seekTo", args: [0, true] }),
              "*"
            )
          }
        } catch {
          // ignore
        }
      })
    }
  }, [])

  const nextTrack = React.useCallback(() => {
    if (playlist.length === 0) return
    const nextIdx = (currentTrackIndex + 1) % playlist.length
    setCurrentTrackId(playlist[nextIdx].id)
    setIsPlaying(true)
  }, [playlist, currentTrackIndex])

  const prevTrack = React.useCallback(() => {
    if (playlist.length === 0) return
    const prevIdx = (currentTrackIndex - 1 + playlist.length) % playlist.length
    setCurrentTrackId(playlist[prevIdx].id)
    setIsPlaying(true)
  }, [playlist, currentTrackIndex])

  // 2-Way Synchronization: Listen to events from YouTube player (e.g. pause/play directly inside the video)
  React.useEffect(() => {
    if (typeof window === "undefined") return

    const registerListening = () => {
      const iframes = document.querySelectorAll<HTMLIFrameElement>("iframe")
      iframes.forEach((iframe) => {
        try {
          if (iframe.src && iframe.src.includes("youtube.com/embed")) {
            iframe.contentWindow?.postMessage(
              JSON.stringify({ event: "listening" }),
              "*"
            )
          }
        } catch {
          // ignore
        }
      })
    }

    registerListening()
    const interval = setInterval(registerListening, 2000)

    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return
      let data = event.data
      if (typeof data === "string") {
        try {
          data = JSON.parse(data)
        } catch {
          return
        }
      }
      if (typeof data !== "object" || data === null) return

      // Handle onStateChange (1: playing, 2: paused, 0: ended)
      if (data.event === "onStateChange") {
        const state = data.info
        if (state === 1) {
          setIsPlaying(true)
        } else if (state === 2) {
          setIsPlaying(false)
        } else if (state === 0) {
          setIsPlaying(false)
          nextTrack()
        }
      }

      // Handle infoDelivery
      if (data.event === "infoDelivery" && data.info) {
        const playerState = data.info.playerState
        if (playerState === 1) {
          setIsPlaying(true)
        } else if (playerState === 2) {
          setIsPlaying(false)
        } else if (playerState === 0) {
          setIsPlaying(false)
          nextTrack()
        }

        if (typeof data.info.currentTime === "number") {
          setElapsedSeconds(Math.floor(data.info.currentTime))
        }
      }
    }

    window.addEventListener("message", handleMessage)
    return () => {
      clearInterval(interval)
      window.removeEventListener("message", handleMessage)
    }
  }, [nextTrack])

  const setVolume = React.useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(vol)))
    setVolumeState(clamped)
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_VOLUME_KEY, String(clamped))
      } catch {
        // ignore
      }
    }
  }, [])

  const toggleMute = React.useCallback(() => {
    setIsMuted((prev) => !prev)
  }, [])

  const setVideoFilter = React.useCallback((filter: VideoFilter) => {
    setVideoFilterState(filter)
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_FILTER_KEY, filter)
      } catch {
        // ignore
      }
    }
  }, [])

  const toggleVideo = React.useCallback((open?: boolean) => {
    setIsVideoOpen((prev) => (typeof open === "boolean" ? open : !prev))
  }, [])

  const togglePlaylist = React.useCallback((open?: boolean) => {
    setIsPlaylistOpen((prev) => (typeof open === "boolean" ? open : !prev))
  }, [])

  const addTrack = React.useCallback(
    (url: string, customTitle?: string): WinampTrack | null => {
      const trimmedUrl = url.trim()
      if (!trimmedUrl) return null

      const ytId = extractYouTubeId(trimmedUrl)
      const isYt = Boolean(ytId)
      const newTrack: WinampTrack = {
        id: `track-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title:
          customTitle?.trim() ||
          (isYt ? `YouTube [${ytId}]` : trimmedUrl.split("/").pop() || "Audio Stream"),
        url: trimmedUrl,
        sourceType: isYt ? "youtube" : "audio",
        youtubeId: ytId || undefined,
        duration: isYt ? "Video" : "Audio",
      }

      const updated = [...playlist, newTrack]
      savePlaylist(updated)
      playTrack(newTrack.id)

      // Fetch real YouTube title in background if not provided
      if (isYt && ytId && !customTitle?.trim()) {
        fetchYouTubeMeta(ytId).then((meta) => {
          if (meta?.title) {
            setPlaylist((prev) => {
              const next = prev.map((t) => (t.id === newTrack.id ? { ...t, title: meta.title } : t))
              savePlaylist(next)
              return next
            })
          }
        })
      }

      return newTrack
    },
    [playlist, savePlaylist, playTrack]
  )

  const removeTrack = React.useCallback(
    (id: string) => {
      const updated = playlist.filter((t) => t.id !== id)
      savePlaylist(updated)
      if (currentTrackId === id) {
        if (updated.length > 0) {
          setCurrentTrackId(updated[0].id)
        } else {
          setCurrentTrackId(null)
          setIsPlaying(false)
        }
      }
    },
    [playlist, savePlaylist, currentTrackId]
  )

  const clearPlaylist = React.useCallback(() => {
    savePlaylist([])
    setCurrentTrackId(null)
    setIsPlaying(false)
  }, [savePlaylist])

  const shareCurrentTrackToChat = React.useCallback(async (): Promise<boolean> => {
    if (!currentTrack || !user || isGuest || user.isGuest) return false

    let trackTitle = currentTrack.title
    if (
      currentTrack.youtubeId &&
      (!trackTitle ||
        trackTitle.startsWith("YouTube [") ||
        trackTitle.startsWith("YouTube Audio [") ||
        trackTitle.startsWith("YouTube Video [") ||
        trackTitle === "YouTube Audio")
    ) {
      const meta = await fetchYouTubeMeta(currentTrack.youtubeId)
      if (meta?.title) {
        trackTitle = meta.title
        setPlaylist((prev) => {
          const next = prev.map((t) => (t.id === currentTrack.id ? { ...t, title: meta.title } : t))
          savePlaylist(next)
          return next
        })
      }
    }

    const msg = `📻 [WINAMP 98] Lagi dengerin: "${trackTitle}" — ${currentTrack.url}`
    const res = await sendMessage(msg, [], user)
    return res.success
  }, [currentTrack, user, isGuest, sendMessage, savePlaylist])

  return (
    <WinampContext.Provider
      value={{
        playlist,
        currentTrack,
        currentTrackIndex,
        isPlaying,
        volume,
        isMuted,
        videoFilter,
        isVideoOpen,
        isPlaylistOpen,
        elapsedSeconds,
        totalDurationSeconds: 0,
        playTrack,
        togglePlay,
        pause,
        stop,
        nextTrack,
        prevTrack,
        setVolume,
        toggleMute,
        setVideoFilter,
        toggleVideo,
        togglePlaylist,
        addTrack,
        removeTrack,
        clearPlaylist,
        shareCurrentTrackToChat,
      }}
    >
      {children}

      {/* Hidden YouTube Iframe Anchor: Keeps audio playing in background even when window is minimized or video screen closed */}
      {isMounted && !isVideoOpen && currentTrack?.sourceType === "youtube" && currentTrack.youtubeId && (
        <div
          id="winamp-global-youtube-anchor"
          aria-hidden="true"
          className="fixed -bottom-[9999px] -right-[9999px] opacity-0 pointer-events-none size-1 overflow-hidden"
        >
          <iframe
            key={currentTrack.youtubeId}
            src={`https://www.youtube.com/embed/${currentTrack.youtubeId}?autoplay=1&enablejsapi=1`}
            title="Winamp Background Audio"
            allow="autoplay"
            className="size-full"
          />
        </div>
      )}
    </WinampContext.Provider>
  )
}

export function useWinamp() {
  const context = React.useContext(WinampContext)
  if (!context) {
    throw new Error("useWinamp must be used within a WinampProvider")
  }
  return context
}
