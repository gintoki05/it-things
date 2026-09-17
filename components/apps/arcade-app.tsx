"use client"

import * as React from "react"
import {
  Gamepad2,
  Tv,
  FolderOpen,
  RotateCw,
  HelpCircle,
  Maximize2,
  Play,
  Upload,
  Link as LinkIcon,
  Download,
  HardDrive,
  Info,
  Layers,
  ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

export interface ArcadeGame {
  id: string
  title: string
  subtitle: string
  genre: string
  year: string
  core: string
  romUrl: string
  fileSize: string
  icon: string
  badgeColor?: string
  description: string
}

const CURATED_GAMES: ArcadeGame[] = [
  {
    id: "metalslug",
    title: "Metal Slug Advance",
    subtitle: "SNK Playmore (2004)",
    genre: "Run & Gun / Action",
    year: "2004",
    core: "gba",
    romUrl: "/api/emulator/rom?id=metalslug&file=metalslug.zip",
    fileSize: "3.8 MB",
    icon: "💥",
    badgeColor: "bg-red-700",
    description:
      "Aksi tembak-tembakan brutal legendaris tank Metal Slug, granat, dan animasi pixel art spektakuler.",
  },
  {
    id: "castlevania",
    title: "Castlevania: Aria of Sorrow",
    subtitle: "Konami (2003)",
    genre: "Metroidvania / Action RPG",
    year: "2003",
    core: "gba",
    romUrl: "/api/emulator/rom?id=castlevania&file=castlevania.zip",
    fileSize: "4.3 MB",
    icon: "🗡️",
    badgeColor: "bg-purple-800",
    description:
      "Petualangan Soma Cruz di istana Drakula. Kumpulkan jiwa monster, pedang legendaris, dan sihir gelap.",
  },
  {
    id: "zelda",
    title: "Zelda: The Minish Cap",
    subtitle: "Nintendo / Capcom (2004)",
    genre: "Action Adventure",
    year: "2004",
    core: "gba",
    romUrl: "/api/emulator/rom?id=zelda&file=zelda.zip",
    fileSize: "7.5 MB",
    icon: "🛡️",
    badgeColor: "bg-emerald-700",
    description:
      "Mahakarya pixel art 2D paling memukau di handheld. Berpetualang bareng Link dan topi ajaib Ezlo.",
  },
  {
    id: "pokemon",
    title: "Pokemon Emerald",
    subtitle: "Game Freak / Nintendo (2004)",
    genre: "Classic RPG",
    year: "2004",
    core: "gba",
    romUrl: "/api/emulator/rom?id=pokemon&file=pokemon.zip",
    fileSize: "6.9 MB",
    icon: "⚡",
    badgeColor: "bg-emerald-600",
    description:
      "Jelajahi region Hoenn, taklukkan gym leader, dan hentikan pertempuran Kyogre vs Groudon.",
  },
  {
    id: "sonic",
    title: "Sonic Advance",
    subtitle: "SEGA / Sonic Team (2001)",
    genre: "High-Speed Platformer",
    year: "2001",
    core: "gba",
    romUrl: "/api/emulator/rom?id=sonic&file=sonic.zip",
    fileSize: "2.7 MB",
    icon: "👟",
    badgeColor: "bg-blue-600",
    description:
      "Adu kecepatan bareng landak biru Sonic, Tails, Knuckles, dan Amy di 60 FPS super fluid.",
  },
  {
    id: "anguna",
    title: "Anguna: Warriors of Virtue",
    subtitle: "Nathan Tolbert (2008)",
    genre: "Homebrew Action RPG",
    year: "2008",
    core: "gba",
    romUrl: "/api/emulator/rom?id=anguna&file=anguna.gba",
    fileSize: "1.8 MB",
    icon: "🏹",
    badgeColor: "bg-amber-600",
    description:
      "Game petualangan dungeon action-RPG full-length dengan grafis pixel retro memukau.",
  },
]

export function ArcadeApp() {
  const [selectedGame, setSelectedGame] = React.useState<ArcadeGame>(CURATED_GAMES[0])
  const [runningGame, setRunningGame] = React.useState<ArcadeGame | null>(null)
  const [activeRomTitle, setActiveRomTitle] = React.useState<string | null>(null)
  const [isCrtEnabled, setIsCrtEnabled] = React.useState<boolean>(false)
  const [showControlsModal, setShowControlsModal] = React.useState<boolean>(false)
  const [showUrlModal, setShowUrlModal] = React.useState<boolean>(false)
  const [customUrlInput, setCustomUrlInput] = React.useState<string>("")
  const [showResetConfirm, setShowResetConfirm] = React.useState<boolean>(false)
  const [pendingSwitchGame, setPendingSwitchGame] = React.useState<ArcadeGame | null>(null)

  const iframeRef = React.useRef<HTMLIFrameElement | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  // Listen to messages from emulator iframe
  React.useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data) return
      if (e.data.type === "CUSTOM_ROM_LOADED") {
        setActiveRomTitle(e.data.fileName || "Custom ROM")
        setRunningGame(null)
      }
    }
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  const toggleCrt = () => {
    const next = !isCrtEnabled
    setIsCrtEnabled(next)
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: "TOGGLE_CRT", enabled: next },
        "*"
      )
    }
  }

  // User explicitly clicks "Unduh & Mainkan"
  const handleStartGame = (game: ArcadeGame) => {
    setRunningGame(game)
    setActiveRomTitle(game.title)
    if (iframeRef.current && game.romUrl) {
      iframeRef.current.src = `/emulator/player.html?rom=${encodeURIComponent(game.romUrl)}&core=${encodeURIComponent(game.core)}`
    }
  }

  // User clicks a game card on the shelf
  const handleSelectGame = (game: ArcadeGame) => {
    if (runningGame && runningGame.id !== game.id) {
      setPendingSwitchGame(game)
    } else {
      setSelectedGame(game)
    }
  }

  const handleConfirmSwitch = () => {
    if (pendingSwitchGame) {
      setSelectedGame(pendingSwitchGame)
      setRunningGame(null)
      setActiveRomTitle(null)
      if (iframeRef.current) {
        iframeRef.current.src = "/emulator/player.html"
      }
      setPendingSwitchGame(null)
    }
  }

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split(".").pop()?.toLowerCase() || ""
    let core = "gba"
    if (ext === "nes") core = "nes"
    else if (ext === "sfc" || ext === "smc") core = "snes"
    else if (ext === "md" || ext === "gen") core = "segaMD"
    else if (ext === "gb") core = "gb"
    else if (ext === "gbc") core = "gbc"

    const blobUrl = URL.createObjectURL(file)
    setActiveRomTitle(file.name)
    setRunningGame(null)

    if (iframeRef.current) {
      iframeRef.current.src = `/emulator/player.html?rom=${encodeURIComponent(blobUrl)}&core=${encodeURIComponent(core)}`
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleCustomUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customUrlInput.trim()) return

    const proxiedUrl = `/api/emulator/rom?url=${encodeURIComponent(customUrlInput.trim())}`
    setActiveRomTitle("Remote ROM URL")
    setRunningGame(null)
    setShowUrlModal(false)

    if (iframeRef.current) {
      iframeRef.current.src = `/emulator/player.html?rom=${encodeURIComponent(proxiedUrl)}&core=gba`
    }
    setCustomUrlInput("")
  }

  const handleResetEmulator = () => {
    if (iframeRef.current) {
      iframeRef.current.src = "/emulator/player.html"
      setRunningGame(null)
      setActiveRomTitle(null)
    }
    setShowResetConfirm(false)
  }

  const handleToggleFullscreen = () => {
    if (iframeRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen?.()
      } else {
        iframeRef.current.requestFullscreen?.()
      }
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#C0C0C0] font-sans text-xs select-none">
      {/* ── Hidden File Input ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".gba,.zip,.7z,.nes,.smc,.sfc,.bin"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* ── Windows 98 Menu Bar ── */}
      <div className="flex items-center gap-2 px-2 py-0.5 border-b border-[#808080] bg-[#C0C0C0] text-[11px]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="hover:bg-[#000080] hover:text-white px-1.5 py-0.5 rounded-[1px] cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <u>F</u>ile (Buka ROM Lokal)
          </button>
          <button
            type="button"
            className="hover:bg-[#000080] hover:text-white px-1.5 py-0.5 rounded-[1px] cursor-pointer"
            onClick={() => setShowUrlModal(true)}
          >
            <u>U</u>RL ROM
          </button>
          <button
            type="button"
            className="hover:bg-[#000080] hover:text-white px-1.5 py-0.5 rounded-[1px] cursor-pointer"
            onClick={toggleCrt}
          >
            <u>C</u>RT ({isCrtEnabled ? "ON" : "OFF"})
          </button>
          <button
            type="button"
            className="hover:bg-[#000080] hover:text-white px-1.5 py-0.5 rounded-[1px] cursor-pointer"
            onClick={() => setShowControlsModal(true)}
          >
            <u>H</u>elp (Kontrol)
          </button>
        </div>
        <div className="ml-auto text-[10px] text-gray-600 font-mono hidden sm:inline">
          GBA & RETRO ARCADE
        </div>
      </div>

      {/* ── Retro Toolbar ── */}
      <div className="flex items-center justify-between p-1.5 bg-[#D4D0C8] border-b-2 border-[#808080] shadow-sm gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2 py-1 bg-[#C0C0C0] border-2 border-white border-b-[#808080] border-r-[#808080] active:border-[#808080] active:border-b-white active:border-r-white text-black text-[11px] font-bold shadow-xs hover:bg-[#D4D0C8]"
            title="Pilih file ROM tanpa download internet"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-700" />
            <span>Kaset Lokal (.gba)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowUrlModal(true)}
            className="flex items-center gap-1.5 px-2 py-1 bg-[#C0C0C0] border-2 border-white border-b-[#808080] border-r-[#808080] active:border-[#808080] active:border-b-white active:border-r-white text-black text-[11px] font-bold shadow-xs hover:bg-[#D4D0C8]"
            title="Load ROM dari direct URL link"
          >
            <LinkIcon className="w-3.5 h-3.5 text-blue-700" />
            <span>Link URL</span>
          </button>

          <div className="w-[1px] h-5 bg-[#808080] mx-0.5" />

          <button
            type="button"
            onClick={toggleCrt}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 border-2 text-[11px] font-bold shadow-xs",
              isCrtEnabled
                ? "bg-[#000080] text-white border-[#404040] border-b-white border-r-white"
                : "bg-[#C0C0C0] text-black border-white border-b-[#808080] border-r-[#808080] hover:bg-[#D4D0C8]"
            )}
            title="Toggle efek garis tabung CRT TV retro"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>CRT {isCrtEnabled ? "ON" : "OFF"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowControlsModal(true)}
            className="flex items-center gap-1.5 px-2 py-1 bg-[#C0C0C0] border-2 border-white border-b-[#808080] border-r-[#808080] active:border-[#808080] active:border-b-white active:border-r-white text-black text-[11px] font-bold shadow-xs hover:bg-[#D4D0C8]"
            title="Petunjuk tombol keyboard & gamepad"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-indigo-700" />
            <span>Kontrol</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="p-1 bg-[#C0C0C0] border-2 border-white border-b-[#808080] border-r-[#808080] active:border-[#808080] active:border-b-white active:border-r-white hover:bg-[#D4D0C8]"
            title="Layar Penuh (Fullscreen)"
          >
            <Maximize2 className="w-3.5 h-3.5 text-gray-800" />
          </button>
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="p-1 bg-[#C0C0C0] border-2 border-white border-b-[#808080] border-r-[#808080] active:border-[#808080] active:border-b-white active:border-r-white hover:bg-[#D4D0C8]"
            title="Keluarkan Kaset / Kembali ke Menu"
          >
            <RotateCw className="w-3.5 h-3.5 text-red-700" />
          </button>
        </div>
      </div>

      {/* ── Main Emulator Screen & Cartridge Shelf ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#101014] relative">
        {/* Main Stage: Either Preview Deck or Live Emulator */}
        <div className="flex-1 h-full relative bg-[#101014] flex items-center justify-center overflow-hidden">
          {/* Emulator Iframe (Always mounted so state can run when game started) */}
          <iframe
            ref={iframeRef}
            src="/emulator/player.html"
            className={cn(
              "w-full h-full border-none transition-opacity duration-200",
              runningGame || activeRomTitle ? "opacity-100 z-10" : "hidden pointer-events-none"
            )}
            allow="autoplay; gamepad; fullscreen"
            title="Retro Emulator Screen"
          />

          {/* Standby Game Preview Deck (Shown when NO game is running - ZERO AUTO DOWNLOAD) */}
          {!runningGame && !activeRomTitle && (
            <div className="w-full h-full bg-[#C0C0C0] flex flex-col p-3 overflow-y-auto">
              <div className="bg-[#D4D0C8] border-2 border-white border-b-[#808080] border-r-[#808080] p-4 flex flex-col gap-3 shadow-md max-w-xl mx-auto my-auto w-full">
                {/* Deck Titlebar */}
                <div className="bg-[#000080] text-white px-2.5 py-1 font-bold text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span>🕹️</span>
                    <span>PROPERTI GAME: {selectedGame.title.toUpperCase()}</span>
                  </div>
                  <span className="font-mono text-[10px] text-yellow-300">
                    {selectedGame.year}
                  </span>
                </div>

                {/* Hero Info */}
                <div className="flex items-start gap-3 bg-white p-3 border border-[#808080]">
                  <div className="text-4xl p-2 bg-gray-100 rounded border border-gray-300 shrink-0 select-none">
                    {selectedGame.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base text-black leading-tight truncate">
                      {selectedGame.title}
                    </h3>
                    <div className="text-xs text-gray-600">
                      {selectedGame.subtitle}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="px-1.5 py-0.5 bg-blue-900 text-white font-mono text-[9px] font-bold rounded uppercase">
                        {selectedGame.genre}
                      </span>
                      <span className="px-1.5 py-0.5 bg-emerald-800 text-white font-mono text-[9px] font-bold rounded flex items-center gap-1">
                        <Download className="w-2.5 h-2.5" />
                        <span>Ukuran: {selectedGame.fileSize}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-[#ECE9D8] p-3 border border-[#808080] text-xs text-gray-800 leading-relaxed">
                  <div className="font-bold text-[11px] text-black mb-1 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-blue-800" />
                    <span>Sinopsis & Info Kaset:</span>
                  </div>
                  <p>{selectedGame.description}</p>
                </div>

                {/* Quick Controls Info */}
                <div className="grid grid-cols-2 gap-2 text-[10px] bg-white p-2 border border-[#808080]">
                  <div>
                    <span className="text-gray-500">Gerak:</span>{" "}
                    <strong className="text-black font-mono">Panah / WASD</strong>
                  </div>
                  <div>
                    <span className="text-gray-500">A / B:</span>{" "}
                    <strong className="text-blue-900 font-mono">Z / X</strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Start:</span>{" "}
                    <strong className="text-emerald-800 font-mono">Enter</strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Gamepad:</span>{" "}
                    <strong className="text-purple-800 font-mono">Auto-detect</strong>
                  </div>
                </div>

                {/* Info Lokasi Penyimpanan Data */}
                <div className="bg-[#FFFFE1] p-2 border border-[#B0B080] text-[11px] text-gray-800 flex items-start gap-2">
                  <span className="text-sm shrink-0">💾</span>
                  <div className="leading-tight">
                    <span className="font-bold text-black">Lokasi Penyimpanan:</span> Data kaset hanya disimpan di <strong>RAM & Cache Browser</strong> (tidak mengunduh file asing ke folder <em>Downloads</em> komputer). Save state / progres game otomatis tersimpan di <em>IndexedDB</em> lokal browser.
                  </div>
                </div>

                {/* Confirmation Action Buttons (Explicit User Action) */}
                <div className="pt-2 border-t border-[#808080] flex flex-col sm:flex-row items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full sm:w-auto px-3 py-1.5 bg-[#D4D0C8] border-2 border-white border-b-[#808080] border-r-[#808080] active:border-[#808080] text-[11px] font-bold text-gray-800 flex items-center justify-center gap-1.5 hover:bg-white cursor-pointer"
                  >
                    <HardDrive className="w-3.5 h-3.5 text-gray-700" />
                    <span>Pakai ROM Lokal (.gba)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStartGame(selectedGame)}
                    className="w-full sm:w-auto px-4 py-1.5 bg-[#000080] text-white border-2 border-white border-b-black border-r-black active:border-black text-xs font-bold flex items-center justify-center gap-2 shadow hover:bg-blue-900 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-yellow-300 text-yellow-300" />
                    <span>Unduh & Mainkan ({selectedGame.fileSize})</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cartridge Selection Drawer / Side Shelf */}
        <div className="w-full md:w-80 bg-[#ECE9D8] border-t-2 md:border-t-0 md:border-l-2 border-[#808080] flex flex-col h-64 md:h-full shrink-0">
          <div className="p-2 bg-[#D4D0C8] border-b border-[#808080] flex items-center justify-between">
            <div className="font-bold text-[11px] text-black flex items-center gap-1.5">
              <span>🕹️</span>
              <span>RAK KASET GAME</span>
            </div>
            <span className="text-[10px] text-gray-600 font-mono">Pilih Kaset</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {CURATED_GAMES.map((game) => {
              const isSelected = selectedGame.id === game.id
              const isCurrentlyRunning = runningGame?.id === game.id

              return (
                <div
                  key={game.id}
                  className={cn(
                    "p-2 bg-[#D4D0C8] border-2 transition-all cursor-pointer shadow-xs",
                    isCurrentlyRunning
                      ? "border-emerald-700 bg-emerald-50 ring-1 ring-emerald-600"
                      : isSelected
                      ? "border-[#000080] bg-blue-50 ring-1 ring-[#000080]"
                      : "border-white border-b-[#808080] border-r-[#808080] hover:bg-[#E4E0D8]"
                  )}
                  onClick={() => handleSelectGame(game)}
                >
                  <div className="flex items-start gap-2">
                    <div className="text-2xl p-1 bg-white/70 rounded border border-gray-400 shrink-0">
                      {game.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-bold text-black text-[11px] truncate">
                          {game.title}
                        </h4>
                        {isCurrentlyRunning ? (
                          <span className="px-1 py-0.2 bg-emerald-700 text-white font-mono text-[8px] font-bold rounded animate-pulse">
                            AKTIF
                          </span>
                        ) : (
                          <span className="px-1 py-0.2 bg-gray-700 text-white font-mono text-[8px] font-bold rounded">
                            {game.fileSize}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-600 truncate">
                        {game.subtitle}
                      </div>
                      <p className="text-[10px] text-gray-700 line-clamp-2 mt-1 leading-snug">
                        {game.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-gray-300">
                    <span className="font-mono text-[9px] text-gray-600">
                      {game.genre}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (runningGame && runningGame.id !== game.id) {
                          setPendingSwitchGame(game)
                        } else {
                          setSelectedGame(game)
                          handleStartGame(game)
                        }
                      }}
                      className={cn(
                        "px-2 py-0.5 border text-[10px] font-bold flex items-center gap-1 cursor-pointer",
                        isCurrentlyRunning
                          ? "bg-emerald-700 text-white border-emerald-900"
                          : "bg-[#C0C0C0] text-black border-white border-b-[#404040] border-r-[#404040] active:border-[#404040] hover:bg-[#D0D0D0]"
                      )}
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>{isCurrentlyRunning ? "Sedang Main" : "Main"}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick Custom ROM Button in Drawer */}
          <div className="p-2 bg-[#D4D0C8] border-t border-[#808080] flex items-center justify-between gap-2">
            <div className="text-[10px] text-gray-700 leading-tight">
              Punya kaset sendiri?
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 bg-white border border-[#808080] font-bold text-[10px] text-blue-900 hover:bg-blue-50 shrink-0 cursor-pointer"
            >
              + Buka File (.gba)
            </button>
          </div>
        </div>
      </div>

      {/* ── Win98 Status Bar ── */}
      <div className="px-2 py-0.5 bg-[#C0C0C0] border-t border-[#808080] flex items-center justify-between text-[11px] text-gray-700">
        <div className="flex items-center gap-2 truncate">
          <span
            className={cn(
              "inline-block w-2 h-2 rounded-full",
              runningGame || activeRomTitle ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
            )}
          />
          <span className="font-medium truncate">
            {activeRomTitle
              ? `Kaset Berjalan: ${activeRomTitle}`
              : `Pilihan: ${selectedGame.title} (Siap diunduh saat diklik)`}
          </span>
        </div>
        <div className="font-mono text-[10px] text-gray-600 hidden sm:inline">
          {runningGame ? "Emulator Aktif • Save/Load didukung" : "Standby Mode • 0 MB terpakai"}
        </div>
      </div>

      {/* ── Confirm Dialog: Ganti Kaset yang Sedang Berjalan ── */}
      <ConfirmDialog
        isOpen={!!pendingSwitchGame}
        onClose={() => setPendingSwitchGame(null)}
        onConfirm={handleConfirmSwitch}
        title="GANTI_KASET.EXE"
        variant="warning"
        confirmText="Ganti Kaset"
        message={`Game "${runningGame?.title || activeRomTitle}" sedang berjalan. Apakah Anda ingin keluar dan beralih ke "${pendingSwitchGame?.title}"? Progress yang belum disimpan akan hilang.`}
      />

      {/* ── Confirm Dialog: Reset / Keluarkan Kaset ── */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetEmulator}
        title="RESET_EMULATOR.EXE"
        variant="warning"
        confirmText="Keluarkan Kaset"
        message="Apakah Anda yakin ingin mengeluarkan kaset game yang sedang berjalan dan kembali ke menu awal? Progress yang belum disimpan akan hilang."
      />

      {/* ── Modal: Kontrol Keyboard & Gamepad ── */}
      {showControlsModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="retro-window-frame max-w-sm w-full bg-[#C0C0C0] border-2 border-white border-b-black border-r-black shadow-2xl p-0.5 flex flex-col">
            <div className="bg-[#000080] text-white px-2 py-1 flex items-center justify-between font-bold text-xs">
              <div className="flex items-center gap-1.5">
                <span>🕹️</span>
                <span>PETUNJUK KONTROL (KEYBOARD & GAMEPAD)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowControlsModal(false)}
                className="size-4 bg-[#C0C0C0] text-black font-bold flex items-center justify-center border border-white border-b-black border-r-black hover:bg-red-600 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-[#ECE9D8] space-y-3 text-xs">
              <div className="bg-white p-2 border border-[#808080]">
                <h5 className="font-bold text-black border-b border-gray-300 pb-1 mb-2">
                  TOMBOL KEYBOARD BAWAAN
                </h5>
                <div className="grid grid-cols-2 gap-y-1.5 text-[11px]">
                  <div className="text-gray-600">Arah Gerak (D-Pad):</div>
                  <div className="font-mono font-bold text-black">Arrow Keys / WASD</div>

                  <div className="text-gray-600">Tombol A (Tembak/Lompat):</div>
                  <div className="font-mono font-bold text-blue-900">Z atau K</div>

                  <div className="text-gray-600">Tombol B (Serang/Aksi):</div>
                  <div className="font-mono font-bold text-blue-900">X atau J</div>

                  <div className="text-gray-600">Tombol L (Shoulder Left):</div>
                  <div className="font-mono font-bold text-black">A atau Q</div>

                  <div className="text-gray-600">Tombol R (Shoulder Right):</div>
                  <div className="font-mono font-bold text-black">S atau E</div>

                  <div className="text-gray-600">START:</div>
                  <div className="font-mono font-bold text-emerald-800">Enter</div>

                  <div className="text-gray-600">SELECT:</div>
                  <div className="font-mono font-bold text-emerald-800">Shift / Space</div>
                </div>
              </div>

              <div className="p-2 bg-amber-50 border border-amber-300 text-[11px] text-amber-900 space-y-1">
                <div className="font-bold">🎮 Gamepad USB / Bluetooth</div>
                <p>
                  Colok gamepad apa saja (PS, Xbox, atau stick retro USB), browser akan mendeteksinya secara otomatis tanpa perlu install driver!
                </p>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowControlsModal(false)}
                  className="px-4 py-1 bg-[#C0C0C0] border-2 border-white border-b-black border-r-black font-bold active:border-black cursor-pointer"
                >
                  OK (Mengerti)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: URL Input ── */}
      {showUrlModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="retro-window-frame max-w-sm w-full bg-[#C0C0C0] border-2 border-white border-b-black border-r-black shadow-2xl p-0.5 flex flex-col">
            <div className="bg-[#000080] text-white px-2 py-1 flex items-center justify-between font-bold text-xs">
              <div className="flex items-center gap-1.5">
                <span>🔗</span>
                <span>BUKA DIRECT LINK ROM</span>
              </div>
              <button
                type="button"
                onClick={() => setShowUrlModal(false)}
                className="size-4 bg-[#C0C0C0] text-black font-bold flex items-center justify-center border border-white border-b-black border-r-black hover:bg-red-600 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCustomUrlSubmit} className="p-3 bg-[#ECE9D8] space-y-3 text-xs">
              <div>
                <label className="block font-bold text-black mb-1">Masukkan URL Langsung ROM:</label>
                <input
                  type="url"
                  required
                  placeholder="https://contoh-domain.com/game.gba"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-[#808080] text-black text-xs font-mono outline-none focus:border-blue-900"
                />
                <p className="text-[10px] text-gray-600 mt-1">
                  Mendukung direct URL link file .gba atau .zip.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-1 border-t border-[#808080]">
                <button
                  type="button"
                  onClick={() => setShowUrlModal(false)}
                  className="px-3 py-1 bg-[#C0C0C0] border-2 border-white border-b-black border-r-black font-bold active:border-black cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-[#000080] text-white border-2 border-white border-b-black border-r-black font-bold active:border-black cursor-pointer"
                >
                  Muat Game
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
