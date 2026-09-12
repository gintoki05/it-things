"use client"

import * as React from "react"
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  X,
  ExternalLink,
  Copy,
  Check,
  Search,
  Tv,
  Globe,
  Play,
  Film,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface CuratedVideo {
  id: string
  title: string
  channel: string
  category: "lofi" | "tech" | "live" | "ambient" | "relax"
  duration?: string
  description?: string
  thumbnailUrl?: string
  liveEmbedUrl?: string
  externalUrl?: string
}

const CURATED_VIDEOS: CuratedVideo[] = [
  {
    id: "makkah-live",
    title: "Makkah Live 24/7 - Masjidil Haram",
    channel: "Saudi Quran TV",
    category: "live",
    duration: "LIVE 24/7",
    description: "Siaran langsung 24 jam Masjidil Haram Makkah Al-Mukarramah & lantunan ayat suci Al-Qur'an.",
    thumbnailUrl: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=640&q=80",
    liveEmbedUrl: "https://www.youtube.com/embed?listType=search&list=Makkah+Live+24%2F7+Masjidil+Haram+Quran+TV",
    externalUrl: "https://www.youtube.com/results?search_query=makkah+live+masjidil+haram",
  },
  {
    id: "madinah-live",
    title: "Madinah Live 24/7 - Masjid Nabawi",
    channel: "Saudi Sunnah TV",
    category: "live",
    duration: "LIVE 24/7",
    description: "Siaran langsung 24 jam Masjid Nabawi Madinah Al-Munawwarah & hadits Rasulullah SAW.",
    thumbnailUrl: "https://images.unsplash.com/photo-1565552684305-7e8e50b188c0?w=640&q=80",
    liveEmbedUrl: "https://www.youtube.com/embed?listType=search&list=Madinah+Live+24%2F7+Masjid+Nabawi+Sunnah+TV",
    externalUrl: "https://www.youtube.com/results?search_query=madinah+live+masjid+nabawi",
  },
  {
    id: "jfKfPfyJRdk",
    title: "Lofi Girl - Beats to Relax/Study to",
    channel: "Lofi Girl",
    category: "lofi",
    duration: "LIVE 24/7",
    description: "Radio lofi hip-hop santai paling pas buat nemenin ngetik & ngoding.",
  },
  {
    id: "4xDzrJKXOOY",
    title: "Synthwave / Retrowave Radio 24/7 Chill Beats",
    channel: "Lofi Girl Synthwave",
    category: "lofi",
    duration: "LIVE 24/7",
    description: "Vibes retro futuristik 80-an buat booster semangat fokus.",
  },
  {
    id: "-uleG_UCutdo",
    title: "100+ Computer Science Concepts Explained",
    channel: "Fireship",
    category: "tech",
    duration: "13:08",
    description: "Penjelasan kilat ratusan konsep fundamental CS & web dev.",
  },
  {
    id: "bJzb-EyGUeA",
    title: "100 Web Development Tools you Should Know",
    channel: "Fireship",
    category: "tech",
    duration: "12:15",
    description: "Review tools dan ekosistem modern web development terbaru.",
  },
  {
    id: "lP26UCnoH9s",
    title: "Cozy Coffee Shop Radio - Smooth BGM",
    channel: "Cafe Music BGM",
    category: "ambient",
    duration: "LIVE 24/7",
    description: "Suasana kedai kopi hangat dengan alunan akustik & jazz santai.",
  },
  {
    id: "mPZkdNFkNps",
    title: "Cozy Rain & Thunderstorm Sounds for Focus",
    channel: "Relaxing White Noise",
    category: "relax",
    duration: "10:00:00",
    description: "Suara hujan deras dan gemuruh petir untuk deep focus kerja.",
  },
  {
    id: "Wv-r8U8hFpE",
    title: "Mechanical Keyboard Typing ASMR Deep Sound",
    channel: "Keyb ASMR",
    category: "ambient",
    duration: "30:45",
    description: "Suara thocky switch keyboard mechanical menenangkan.",
  },
]

const CATEGORIES = [
  { id: "all", label: "🌐 Semua Video" },
  { id: "live", label: "🕋 Makkah & Madinah Live" },
  { id: "lofi", label: "🎧 Lo-Fi & Synth" },
  { id: "tech", label: "💻 Tech Talks" },
  { id: "ambient", label: "☕ Kafe & ASMR" },
  { id: "relax", label: "🌧️ Hujan & Relaks" },
] as const

// Helper untuk mengekstrak Video ID dari aneka ragam format YouTube URL
function extractYouTubeId(input: string): string | null {
  if (!input) return null
  const trimmed = input.trim()

  // Jika input adalah 11 karakter ID langsung
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed
  }

  // Pola URL YouTube umum (youtube.com, youtu.be, shorts, embed)
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/
  const match = trimmed.match(regExp)
  if (match && match[1]) {
    return match[1]
  }

  return null
}

export function IExploreApp() {
  const [currentUrl, setCurrentUrl] = React.useState("https://www.youtube.com")
  const [addressInput, setAddressInput] = React.useState("https://www.youtube.com")
  const [activeVideoId, setActiveVideoId] = React.useState<string | null>(null)
  const [activeVideoTitle, setActiveVideoTitle] = React.useState<string>("")
  const [activeEmbedUrl, setActiveEmbedUrl] = React.useState<string | null>(null)
  const [activeExternalUrl, setActiveExternalUrl] = React.useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isCopied, setIsCopied] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [history, setHistory] = React.useState<string[]>(["https://www.youtube.com"])
  const [historyIndex, setHistoryIndex] = React.useState(0)
  const [menuDropdown, setMenuDropdown] = React.useState<string | null>(null)

  // Buka video tertentu
  const playVideo = React.useCallback((videoId: string, title?: string, liveEmbedUrl?: string, externalUrl?: string) => {
    setIsLoading(true)
    setActiveVideoId(videoId)
    setActiveEmbedUrl(liveEmbedUrl || null)
    setActiveExternalUrl(externalUrl || null)
    const newUrl = externalUrl || `https://www.youtube.com/watch?v=${videoId}`
    setCurrentUrl(newUrl)
    setAddressInput(newUrl)
    setActiveVideoTitle(title || `YouTube Video (${videoId})`)

    setHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1)
      next.push(newUrl)
      return next
    })
    setHistoryIndex((prev) => prev + 1)

    setTimeout(() => {
      setIsLoading(false)
    }, 600)
  }, [historyIndex])

  // Kembali ke Halaman Utama YouTube Explorer
  const goHome = React.useCallback(() => {
    setIsLoading(true)
    setActiveVideoId(null)
    setActiveEmbedUrl(null)
    setActiveExternalUrl(null)
    const homeUrl = "https://www.youtube.com"
    setCurrentUrl(homeUrl)
    setAddressInput(homeUrl)

    setHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1)
      next.push(homeUrl)
      return next
    })
    setHistoryIndex((prev) => prev + 1)

    setTimeout(() => {
      setIsLoading(false)
    }, 400)
  }, [historyIndex])

  // Navigasi Back
  const goBack = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1
      const targetUrl = history[prevIdx]
      setHistoryIndex(prevIdx)
      setCurrentUrl(targetUrl)
      setAddressInput(targetUrl)
      const extracted = extractYouTubeId(targetUrl)
      setActiveVideoId(extracted)
    }
  }

  // Navigasi Forward
  const goForward = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1
      const targetUrl = history[nextIdx]
      setHistoryIndex(nextIdx)
      setCurrentUrl(targetUrl)
      setAddressInput(targetUrl)
      const extracted = extractYouTubeId(targetUrl)
      setActiveVideoId(extracted)
    }
  }

  // Refresh
  const handleRefresh = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
    }, 500)
  }

  // Submit Address Bar
  const handleAddressSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const input = addressInput.trim()
    if (!input) return

    const extractedId = extractYouTubeId(input)
    if (extractedId) {
      playVideo(extractedId)
    } else {
      // Jika input bukan URL, anggap sebagai kata kunci pencarian
      setSelectedCategory("all")
      setSearchQuery(input)
      setActiveVideoId(null)
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(input)}`
      setCurrentUrl(searchUrl)
      setAddressInput(searchUrl)
    }
  }

  // Salin Link Video
  const handleCopyLink = async () => {
    if (!activeVideoId) return
    try {
      await navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${activeVideoId}`)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  // Filter video berdasarkan pencarian dan kategori
  const filteredVideos = React.useMemo(() => {
    return CURATED_VIDEOS.filter((v) => {
      const matchCat = selectedCategory === "all" || v.category === selectedCategory
      const matchQuery =
        !searchQuery.trim() ||
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.channel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.description && v.description.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchCat && matchQuery
    })
  }, [selectedCategory, searchQuery])

  return (
    <div
      className="flex flex-col h-full w-full bg-[#D4DDE6] font-sans text-xs select-none"
      onClick={() => setMenuDropdown(null)}
    >
      {/* Menu Bar Win98 */}
      <div className="flex items-center px-1 py-0.5 bg-[#D4DDE6] border-b border-[#7D8E9E] gap-2 text-[11px] select-none shrink-0 relative">
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setMenuDropdown(menuDropdown === "file" ? null : "file")
            }}
            className={cn(
              "px-1.5 py-0.5 hover:bg-[#1E4E8C] hover:text-white rounded-[2px]",
              menuDropdown === "file" && "bg-[#1E4E8C] text-white"
            )}
          >
            File
          </button>
          {menuDropdown === "file" && (
            <div className="absolute top-full left-0 mt-0.5 w-44 bg-[#D4DDE6] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] shadow-md z-50 py-1">
              <button
                type="button"
                onClick={() => {
                  goHome()
                  setMenuDropdown(null)
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#1E4E8C] hover:text-white text-[11px]"
              >
                Halaman Utama
              </button>
              <div className="h-px bg-[#7D8E9E] my-1" />
              <button
                type="button"
                onClick={() => {
                  if (activeVideoId) {
                    window.open(`https://www.youtube.com/watch?v=${activeVideoId}`, "_blank")
                  }
                  setMenuDropdown(null)
                }}
                disabled={!activeVideoId}
                className="w-full text-left px-3 py-1 hover:bg-[#1E4E8C] hover:text-white disabled:opacity-50 text-[11px]"
              >
                Buka di Tab Baru
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setMenuDropdown(menuDropdown === "view" ? null : "view")
            }}
            className={cn(
              "px-1.5 py-0.5 hover:bg-[#1E4E8C] hover:text-white rounded-[2px]",
              menuDropdown === "view" && "bg-[#1E4E8C] text-white"
            )}
          >
            View
          </button>
          {menuDropdown === "view" && (
            <div className="absolute top-full left-0 mt-0.5 w-40 bg-[#D4DDE6] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] shadow-md z-50 py-1">
              <button
                type="button"
                onClick={() => {
                  handleRefresh()
                  setMenuDropdown(null)
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#1E4E8C] hover:text-white text-[11px]"
              >
                Refresh (F5)
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setMenuDropdown(menuDropdown === "favorites" ? null : "favorites")
            }}
            className={cn(
              "px-1.5 py-0.5 hover:bg-[#1E4E8C] hover:text-white rounded-[2px]",
              menuDropdown === "favorites" && "bg-[#1E4E8C] text-white"
            )}
          >
            Favorites
          </button>
          {menuDropdown === "favorites" && (
            <div className="absolute top-full left-0 mt-0.5 w-56 bg-[#D4DDE6] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] shadow-md z-50 py-1">
              {CURATED_VIDEOS.slice(0, 5).map((vid) => (
                <button
                  key={vid.id}
                  type="button"
                  onClick={() => {
                    playVideo(vid.id, vid.title, vid.liveEmbedUrl, vid.externalUrl)
                    setMenuDropdown(null)
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-[#1E4E8C] hover:text-white truncate text-[11px]"
                >
                  ⭐ {vid.title}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto text-[10px] text-slate-500 font-mono pr-1">
          Internet Explorer 5.0
        </div>
      </div>

      {/* Toolbar Utama Win98 */}
      <div className="flex items-center px-2 py-1 bg-[#D4DDE6] border-b border-[#7D8E9E] gap-1 shrink-0">
        <button
          type="button"
          onClick={goBack}
          disabled={historyIndex === 0}
          title="Back"
          className="flex items-center gap-1 px-2 py-1 bg-[#D4DDE6] hover:bg-[#E8EEF5] active:bg-[#BDC9D6] disabled:opacity-40 border border-[#7D8E9E] border-t-white border-l-white active:border-t-[#7D8E9E] active:border-l-[#7D8E9E] rounded-[2px] cursor-pointer"
        >
          <ArrowLeft className="size-3.5 text-slate-700" />
          <span className="text-[11px] font-medium hidden sm:inline">Back</span>
        </button>

        <button
          type="button"
          onClick={goForward}
          disabled={historyIndex >= history.length - 1}
          title="Forward"
          className="flex items-center gap-1 px-2 py-1 bg-[#D4DDE6] hover:bg-[#E8EEF5] active:bg-[#BDC9D6] disabled:opacity-40 border border-[#7D8E9E] border-t-white border-l-white active:border-t-[#7D8E9E] active:border-l-[#7D8E9E] rounded-[2px] cursor-pointer"
        >
          <ArrowRight className="size-3.5 text-slate-700" />
          <span className="text-[11px] font-medium hidden sm:inline">Forward</span>
        </button>

        <button
          type="button"
          onClick={() => setIsLoading(false)}
          title="Stop"
          className="flex items-center gap-1 px-2 py-1 bg-[#D4DDE6] hover:bg-[#E8EEF5] active:bg-[#BDC9D6] border border-[#7D8E9E] border-t-white border-l-white active:border-t-[#7D8E9E] active:border-l-[#7D8E9E] rounded-[2px] cursor-pointer"
        >
          <X className="size-3.5 text-rose-600" />
          <span className="text-[11px] font-medium hidden sm:inline">Stop</span>
        </button>

        <button
          type="button"
          onClick={handleRefresh}
          title="Refresh"
          className="flex items-center gap-1 px-2 py-1 bg-[#D4DDE6] hover:bg-[#E8EEF5] active:bg-[#BDC9D6] border border-[#7D8E9E] border-t-white border-l-white active:border-t-[#7D8E9E] active:border-l-[#7D8E9E] rounded-[2px] cursor-pointer"
        >
          <RotateCw className={cn("size-3.5 text-slate-700", isLoading && "animate-spin")} />
          <span className="text-[11px] font-medium hidden sm:inline">Refresh</span>
        </button>

        <button
          type="button"
          onClick={goHome}
          title="Home"
          className="flex items-center gap-1 px-2 py-1 bg-[#D4DDE6] hover:bg-[#E8EEF5] active:bg-[#BDC9D6] border border-[#7D8E9E] border-t-white border-l-white active:border-t-[#7D8E9E] active:border-l-[#7D8E9E] rounded-[2px] cursor-pointer"
        >
          <Home className="size-3.5 text-blue-700" />
          <span className="text-[11px] font-medium hidden sm:inline">Home</span>
        </button>

        <div className="h-5 w-px bg-[#7D8E9E] mx-1 border-r border-white" />

        {/* Logo Globe IE Berputar Retro */}
        <div className="ml-auto flex items-center gap-2 pr-1">
          <div className="size-6 rounded border border-[#7D8E9E] bg-[#1E4E8C] flex items-center justify-center shadow-inner">
            <Globe className={cn("size-4 text-blue-200", isLoading && "animate-spin")} />
          </div>
        </div>
      </div>

      {/* Address Bar Row */}
      <form
        onSubmit={handleAddressSubmit}
        className="flex items-center px-2 py-1.5 bg-[#D4DDE6] border-b border-[#7D8E9E] gap-2 shrink-0"
      >
        <span className="font-mono text-[11px] font-bold text-slate-700 shrink-0 select-none">
          Address
        </span>
        <div className="flex-1 relative">
          <input
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            placeholder="Paste link video YouTube atau ketik pencarian..."
            className="w-full bg-white text-slate-900 px-2 py-0.5 border-2 border-t-[#5E7287] border-l-[#5E7287] border-r-white border-b-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
          />
        </div>
        <button
          type="submit"
          className="px-3 py-0.5 bg-[#D4DDE6] hover:bg-[#E8EEF5] active:bg-[#BDC9D6] font-bold text-[11px] text-slate-800 border border-[#7D8E9E] border-t-white border-l-white active:border-t-[#7D8E9E] active:border-l-[#7D8E9E] rounded-[2px] cursor-pointer flex items-center gap-1"
        >
          <Search className="size-3 text-slate-600" />
          <span>Go</span>
        </button>
      </form>

      {/* Quick Links / Bookmarks Bar */}
      <div className="flex items-center px-2 py-1 bg-[#CBD5E1] border-b border-[#7D8E9E] gap-1.5 overflow-x-auto scrollbar-none shrink-0 text-[11px]">
        <span className="text-slate-600 font-mono text-[10px] font-bold uppercase shrink-0 mr-1">
          Links:
        </span>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              setSelectedCategory(cat.id)
              setSearchQuery("")
              if (activeVideoId) setActiveVideoId(null)
            }}
            className={cn(
              "px-2 py-0.5 rounded-[2px] shrink-0 font-medium transition-colors cursor-pointer border border-transparent",
              selectedCategory === cat.id && !activeVideoId
                ? "bg-[#1E4E8C] text-white border-[#102A45] shadow-inner"
                : "bg-[#D4DDE6] text-slate-800 hover:bg-[#E8EEF5] border-[#94A3B8]"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Konten Browser (Watch Mode atau Home Feed) */}
      <div className="flex-1 overflow-auto bg-[#F8FAFC] text-slate-800 flex flex-col select-text">
        {activeVideoId ? (
          /* ============================================================ */
          /* WATCH MODE: Tampilan Video YouTube Aktif                     */
          /* ============================================================ */
          <div className="flex flex-col lg:flex-row flex-1 overflow-auto">
            {/* Area Player Video Utama (16:9) */}
            <div className="flex-1 flex flex-col p-3 bg-black/95">
              <div className="relative w-full aspect-video bg-black rounded overflow-hidden shadow-2xl border border-slate-700">
                <iframe
                  key={activeEmbedUrl || activeVideoId}
                  src={
                    activeEmbedUrl
                      ? (activeEmbedUrl.includes("?") ? `${activeEmbedUrl}&autoplay=1` : `${activeEmbedUrl}?autoplay=1`)
                      : `https://www.youtube.com/embed/${activeVideoId}?autoplay=1&rel=0&modestbranding=1`
                  }
                  title={activeVideoTitle || "YouTube Video Player"}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>

              {/* Bar Kontrol & Info Video Bawah */}
              <div className="mt-3 p-2.5 bg-[#1E293B] border border-slate-700 rounded text-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm text-white truncate">
                    {activeVideoTitle || "Sedang Memutar Video"}
                  </div>
                  <div className="font-mono text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                    <span className="bg-rose-600 text-white px-1 py-0.2 rounded font-black text-[9px]">
                      YOUTUBE
                    </span>
                    <span>ID: {activeVideoId}</span>
                    <span className="text-emerald-400">• Background Play Active</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 select-none">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {isCopied ? (
                      <>
                        <Check className="size-3 text-emerald-400" />
                        <span>Disalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3 text-slate-300" />
                        <span>Salin Link</span>
                      </>
                    )}
                  </button>

                  <a
                    href={activeExternalUrl || `https://www.youtube.com/watch?v=${activeVideoId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-1 bg-[#1E4E8C] hover:bg-[#153A6B] text-white rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <ExternalLink className="size-3" />
                    <span>Buka Tab Asli</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setActiveVideoId(null)}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[11px] font-medium cursor-pointer"
                  >
                    Tutup Player
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar Up Next / Rekomendasi Video Cepat */}
            <div className="w-full lg:w-80 bg-[#E2E8F0] border-t lg:border-t-0 lg:border-l border-[#CBD5E1] p-3 overflow-y-auto flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between font-mono text-[11px] font-bold text-slate-700 pb-1 border-b border-slate-300">
                <span>REKOMENDASI VIDEO</span>
                <span className="text-slate-500">{CURATED_VIDEOS.length} Video</span>
              </div>

              <div className="flex flex-col gap-2">
                {CURATED_VIDEOS.map((vid) => {
                  const isCurrent = vid.id === activeVideoId
                  return (
                    <button
                      key={vid.id}
                      type="button"
                      onClick={() => playVideo(vid.id, vid.title, vid.liveEmbedUrl, vid.externalUrl)}
                      className={cn(
                        "flex gap-2 p-1.5 rounded text-left transition-all cursor-pointer border",
                        isCurrent
                          ? "bg-[#1E4E8C] text-white border-[#102A45] shadow"
                          : "bg-white text-slate-800 hover:bg-slate-100 border-slate-300"
                      )}
                    >
                      <div className="relative w-24 h-14 bg-black rounded overflow-hidden shrink-0">
                        {/* Thumbnail Video */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={vid.thumbnailUrl || `https://img.youtube.com/vi/${vid.id}/mqdefault.jpg`}
                          alt={vid.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {vid.duration && (
                          <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-white font-mono text-[8px] px-1 rounded">
                            {vid.duration}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                        <div className="font-semibold text-[11px] line-clamp-2 leading-snug">
                          {vid.title}
                        </div>
                        <div
                          className={cn(
                            "font-mono text-[9px] truncate",
                            isCurrent ? "text-blue-200" : "text-slate-500"
                          )}
                        >
                          {vid.channel}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* BROWSE MODE: Portal & Katalog Video YouTube                 */
          /* ============================================================ */
          <div className="p-4 flex flex-col gap-4">
            {/* Retro Banner Portal */}
            <div className="p-4 bg-gradient-to-r from-[#1E4E8C] via-[#2A65B2] to-[#1E3A8A] text-white rounded border border-[#102A45] shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded bg-rose-600 text-white flex items-center justify-center shadow-md shrink-0 border-2 border-white/40">
                  <Tv className="size-7" />
                </div>
                <div>
                  <div className="font-mono text-base font-black tracking-wide flex items-center gap-2">
                    <span>YOUTUBE RETRO EXPLORER</span>
                    <span className="bg-yellow-400 text-slate-950 text-[9px] font-mono px-1.5 py-0.5 rounded font-black">
                      V5.0
                    </span>
                  </div>
                  <div className="text-blue-100 text-xs mt-0.5">
                    Tonton video, live stream, lo-fi beats, dan tech talk langsung di desktop kantor.
                  </div>
                </div>
              </div>

              {/* Tips Minimize */}
              <div className="bg-black/30 border border-white/20 rounded p-2 text-[10px] font-mono text-blue-200 max-w-xs shrink-0">
                💡 <b>Tips:</b> Putar video lalu minimize jendela ke taskbar — suara tetap mengalun di background!
              </div>
            </div>

            {/* Kotak Input Cepat Paste Link */}
            <div className="p-3 bg-white border border-slate-300 rounded shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 flex items-center gap-2">
                <Search className="size-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari video atau paste link YouTube apa saja (cth: youtu.be/xxx)..."
                  className="w-full text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const extracted = extractYouTubeId(searchQuery)
                  if (extracted) {
                    playVideo(extracted)
                  }
                }}
                className="px-3 py-1.5 bg-[#1E4E8C] hover:bg-[#153A6B] text-white text-xs font-bold rounded cursor-pointer transition-colors shrink-0 flex items-center justify-center gap-1.5"
              >
                <Play className="size-3.5 fill-current" />
                <span>Putar Sekarang</span>
              </button>
            </div>

            {/* Header Kategori Aktif */}
            <div className="flex items-center justify-between pt-1">
              <div className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <Film className="size-4 text-blue-700" />
                <span>Katalog Video Siap Tonton</span>
                <span className="font-mono text-xs font-normal text-slate-500">
                  ({filteredVideos.length} video ditemukan)
                </span>
              </div>
            </div>

            {/* Grid Katalog Video */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredVideos.map((vid) => (
                <div
                  key={vid.id}
                  onClick={() => playVideo(vid.id, vid.title, vid.liveEmbedUrl, vid.externalUrl)}
                  className="group bg-white rounded border border-slate-300 hover:border-[#1E4E8C] shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col overflow-hidden"
                >
                  {/* Thumbnail Image */}
                  <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={vid.thumbnailUrl || `https://img.youtube.com/vi/${vid.id}/mqdefault.jpg`}
                      alt={vid.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors flex items-center justify-center">
                      <div className="size-10 rounded-full bg-rose-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all shadow-lg">
                        <Play className="size-5 fill-current ml-0.5" />
                      </div>
                    </div>
                    {vid.duration && (
                      <span className="absolute bottom-1.5 right-1.5 bg-black/85 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
                        {vid.duration}
                      </span>
                    )}
                  </div>

                  {/* Info Video Card */}
                  <div className="p-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900 line-clamp-2 leading-snug group-hover:text-[#1E4E8C] transition-colors">
                        {vid.title}
                      </div>
                      {vid.description && (
                        <div className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-normal">
                          {vid.description}
                        </div>
                      )}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between font-mono text-[10px] text-slate-500">
                      <span className="font-semibold text-slate-700 truncate max-w-[140px]">
                        {vid.channel}
                      </span>
                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold">
                        {vid.category}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State jika filter pencarian tidak ada */}
            {filteredVideos.length === 0 && (
              <div className="p-8 text-center bg-white border border-dashed border-slate-300 rounded flex flex-col items-center justify-center">
                <Sparkles className="size-8 text-slate-400 mb-2" />
                <div className="font-bold text-slate-700 text-sm">
                  Tidak ada video yang cocok dengan &quot;{searchQuery}&quot;
                </div>
                <div className="text-slate-500 text-xs mt-1">
                  Coba paste link YouTube langsung di Address bar di atas dan klik <b>Go</b>.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Retro Status Bar di Bagian Bawah */}
      <div className="flex items-center px-2 py-0.5 bg-[#D4DDE6] border-t border-[#7D8E9E] font-mono text-[10px] text-slate-700 gap-3 shrink-0 select-none">
        <div className="flex items-center gap-1.5 flex-1 truncate">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="truncate">
            {isLoading ? "Opening page..." : activeVideoId ? `Playing: ${activeVideoTitle}` : "Done"}
          </span>
        </div>
        <div className="h-3 w-px bg-[#7D8E9E]" />
        <div className="flex items-center gap-1 shrink-0 text-slate-600">
          <Globe className="size-3 text-blue-600" />
          <span>Internet Zone</span>
        </div>
      </div>
    </div>
  )
}
