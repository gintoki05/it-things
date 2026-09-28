"use client"

import * as React from "react"
import { RetroActionButton } from "@/components/ui/retro-action-button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { announceGameRoomAction } from "@/app/actions/chat"
import { playRetroNotificationSound } from "@/lib/sound-effects"
import { Maximize2, Minimize2, RotateCw, Share2, Copy, Check, Gamepad2, Palette } from "lucide-react"

const INK_OPTIONS = [
  { id: 0, name: "Pulpen Biru", hex: "#1a31c2" },
  { id: 1, name: "Pulpen Merah", hex: "#dc1f33" },
  { id: 2, name: "Spidol Hitam", hex: "#2e3342" },
  { id: 3, name: "Stabilo Oranye", hex: "#eb8c14" },
  { id: 4, name: "Stabilo Hijau", hex: "#1f994d" },
  { id: 5, name: "Stabilo Pink", hex: "#e666a8" },
]

export function DoodleApp() {
  const { user } = useAuth()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  const [isFullscreen, setIsFullscreen] = React.useState<boolean>(false)
  const [showRestartConfirm, setShowRestartConfirm] = React.useState<boolean>(false)
  const [key, setKey] = React.useState<number>(0)
  const [selectedInk, setSelectedInk] = React.useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("doodle_ink")
      if (saved != null && !isNaN(Number(saved))) {
        return Math.max(0, Math.min(5, Number(saved)))
      }
    }
    return 0
  })

  // Multiplayer room state
  const [currentLobbyCode, setCurrentLobbyCode] = React.useState<string | null>(null)
  const [joinRoomCode, setJoinRoomCode] = React.useState<string | null>(null)
  const [isSharing, setIsSharing] = React.useState<boolean>(false)
  const [notificationMsg, setNotificationMsg] = React.useState<string | null>(null)
  const [isCopied, setIsCopied] = React.useState<boolean>(false)

  const nickname = React.useMemo(() => {
    return (user?.name || "Player").trim().slice(0, 14)
  }, [user?.name])

  const iframeSrc = React.useMemo(() => {
    const params = new URLSearchParams()
    if (nickname) {
      params.set("name", nickname)
    }
    if (joinRoomCode) {
      params.set("room", joinRoomCode)
    }
    params.set("ink", String(selectedInk))
    const q = params.toString()
    return `/games/doodle/index.html${q ? `?${q}` : ""}`
  }, [nickname, joinRoomCode, selectedInk])

  const handleSelectInk = React.useCallback((inkId: number) => {
    setSelectedInk(inkId)
    if (typeof window !== "undefined") {
      localStorage.setItem("doodle_ink", String(inkId))
    }
    iframeRef.current?.contentWindow?.postMessage({ type: "SET_INK", ink: inkId }, "*")
  }, [])

  const handleRestart = React.useCallback(() => {
    setShowRestartConfirm(false)
    setKey((prev) => prev + 1)
  }, [])

  const handleToggleFullscreen = React.useCallback(() => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }, [])

  const handleShareToChat = React.useCallback(
    async (codeToShare: string) => {
      if (isSharing || !codeToShare) return
      setIsSharing(true)
      try {
        const token = (await supabase?.auth.getSession())?.data.session?.access_token ?? null
        await announceGameRoomAction({
          game: "doodle",
          roomCode: codeToShare,
          userName: nickname,
          userId: user?.id,
          token,
        })
        playRetroNotificationSound()
        setNotificationMsg(`Lobby [${codeToShare}] berhasil diumumkan ke Chat.exe!`)
        setTimeout(() => setNotificationMsg(null), 4000)
      } catch {
        setNotificationMsg("Gagal mengirim ajakan mabar ke Chat")
        setTimeout(() => setNotificationMsg(null), 3000)
      } finally {
        setIsSharing(false)
      }
    },
    [isSharing, nickname, user?.id]
  )

  const handleCopyCode = React.useCallback((codeToCopy: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(codeToCopy)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    }
  }, [])

  // Listen to messages from iframe game
  React.useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "DOODLE_LOBBY_STATE") {
        setCurrentLobbyCode(e.data.roomCode || null)
      } else if (e.data?.type === "DOODLE_SHARE_ROOM") {
        if (e.data.roomCode) {
          void handleShareToChat(e.data.roomCode)
        }
      }
    }
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [handleShareToChat])

  // Listen to custom global event: join doodle room from chat
  React.useEffect(() => {
    const handleJoinEvent = (e: Event) => {
      const custom = e as CustomEvent<{ roomCode: string }>
      const code = custom.detail?.roomCode?.trim().toUpperCase()
      if (code) {
        setJoinRoomCode(code)
        // If iframe is already running, send postMessage immediately
        iframeRef.current?.contentWindow?.postMessage(
          { type: "JOIN_ROOM", roomCode: code },
          "*"
        )
      }
    }
    window.addEventListener("join-doodle-room", handleJoinEvent)
    return () => window.removeEventListener("join-doodle-room", handleJoinEvent)
  }, [])

  return (
    <div ref={containerRef} className="flex flex-col h-full w-full bg-[#c0c0c0] font-sans select-none overflow-hidden text-black">
      {/* Top Toolbar Windows 98 */}
      <div className="flex flex-wrap items-center justify-between px-2 py-1 bg-[#dfdfdf] border-b border-[#808080] text-xs gap-1">
        <div className="flex items-center gap-1.5 font-bold">
          <span className="text-blue-800 font-mono tracking-wider font-extrabold">DOODLE.EXE</span>
          <span className="text-[#606060] font-normal hidden sm:inline">| Doodle War 98</span>
          {nickname && (
            <span className="text-[11px] font-mono px-1.5 py-0.5 bg-[#f0f0f0] border border-[#a0a0a0] rounded-[2px] text-[#1a30c0]">
              👤 {nickname}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Ink Selector */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[#f0f0f0] border border-[#a0a0a0] rounded-[2px]" title="Pilihan Warna Tinta Bolpoin & Stabilo">
            <Palette className="w-3 h-3 text-[#505050]" />
            <div className="flex items-center gap-1">
              {INK_OPTIONS.map((ink) => (
                <button
                  key={ink.id}
                  type="button"
                  onClick={() => handleSelectInk(ink.id)}
                  className={`w-3.5 h-3.5 rounded-full border cursor-pointer transition-transform ${
                    selectedInk === ink.id
                      ? "scale-125 border-black ring-1 ring-white shadow"
                      : "border-black/30 hover:scale-110 opacity-70 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: ink.hex }}
                  title={ink.name}
                />
              ))}
            </div>
          </div>

          {/* Lobby info & Quick Share Button */}
          {currentLobbyCode && (
            <div className="flex items-center gap-1 bg-[#fff8e7] px-1.5 py-0.5 border border-[#c49000] rounded-[2px]">
              <span className="font-mono font-bold text-[#d02030] text-[11px]">
                ROOM: {currentLobbyCode}
              </span>
              <button
                type="button"
                onClick={() => handleCopyCode(currentLobbyCode)}
                className="p-0.5 hover:bg-black/10 rounded cursor-pointer"
                title="Salin Kode Room"
              >
                {isCopied ? <Check className="w-3 h-3 text-green-700" /> : <Copy className="w-3 h-3 text-gray-700" />}
              </button>
              <button
                type="button"
                onClick={() => void handleShareToChat(currentLobbyCode)}
                disabled={isSharing}
                className="flex items-center gap-1 px-1.5 py-0.5 bg-[#d02030] hover:bg-[#b01828] text-white font-mono text-[10px] font-bold rounded-[2px] border border-white/50 shadow active:translate-y-px cursor-pointer disabled:opacity-50"
                title="Bagikan Room ke Chat Umum IT-Things"
              >
                <Share2 className="w-2.5 h-2.5" />
                <span>{isSharing ? "MENGIRIM..." : "AJAK CHAT"}</span>
              </button>
            </div>
          )}

          {/* Restart */}
          <RetroActionButton
            action="refresh"
            visual="icon"
            onClick={() => setShowRestartConfirm(true)}
            tooltip="Restart Game"
            className="p-1"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </RetroActionButton>

          {/* Fullscreen */}
          <RetroActionButton
            action="edit"
            visual="icon"
            onClick={handleToggleFullscreen}
            tooltip={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
            className="p-1"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </RetroActionButton>
        </div>
      </div>

      {/* Notification Banner */}
      {notificationMsg && (
        <div className="bg-[#1E4E8C] text-white text-[11px] font-mono px-3 py-1 flex items-center justify-between border-b border-white/20 animate-in fade-in duration-200">
          <span className="flex items-center gap-1.5">
            <Gamepad2 className="w-3.5 h-3.5 text-yellow-300" />
            {notificationMsg}
          </span>
          <button
            type="button"
            onClick={() => setNotificationMsg(null)}
            className="text-white/70 hover:text-white text-xs cursor-pointer font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Doodle War Game Viewport */}
      <div className="relative flex-1 w-full h-full bg-[#f6f3e6] overflow-hidden">
        <iframe
          key={`${key}-${iframeSrc}`}
          ref={iframeRef}
          src={iframeSrc}
          className="w-full h-full border-0 block"
          allow="autoplay; fullscreen; pointer-lock"
          title="Doodle War 98"
        />
      </div>

      {/* Restart Confirm Dialog (Win98 Standard) */}
      <ConfirmDialog
        isOpen={showRestartConfirm}
        onClose={() => setShowRestartConfirm(false)}
        title="RESTART_DOODLE.EXE"
        message="Apakah kamu yakin ingin mengulang pertempuran Doodle War 98 dari awal?"
        confirmText="RESTART"
        cancelText="BATAL"
        variant="warning"
        onConfirm={handleRestart}
      />
    </div>
  )
}
