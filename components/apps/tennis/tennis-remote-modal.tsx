"use client"

import * as React from "react"
import {
  Smartphone,
  X,
  RotateCw,
  Copy,
  Check,
  Vibrate,
  Wifi,
  WifiOff,
  ExternalLink,
  Sparkles,
} from "lucide-react"
import { generateQrCodeSvg, generateTennisRoomCode } from "@/lib/qr/qr-code"
import { isSupabaseConfigured } from "@/lib/supabase"
import { cn } from "@/lib/utils"

export interface TennisRemoteModalProps {
  isOpen: boolean
  onClose: () => void
  roomCode?: string
  onRegenerateRoomCode?: () => void
  isMobileConnected?: boolean
  connectedDevice?: string
  onTestRumble?: () => void
}

export function TennisRemoteModal({
  isOpen,
  onClose,
  roomCode: controlledRoomCode,
  onRegenerateRoomCode,
  isMobileConnected = false,
  connectedDevice = "",
  onTestRumble,
}: TennisRemoteModalProps) {
  const [internalRoomCode, setInternalRoomCode] = React.useState(() =>
    generateTennisRoomCode()
  )
  const roomCode = controlledRoomCode || internalRoomCode

  const [origin, setOrigin] = React.useState("")
  const [copied, setCopied] = React.useState(false)
  const [rumbleFeedback, setRumbleFeedback] = React.useState(false)

  // Detect origin on client mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin)
    }
  }, [])

  // Keyboard navigation: Escape key closes modal
  React.useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const pairingUrl = `${origin || "http://localhost:3000"}/tennis-remote?room=${encodeURIComponent(
    roomCode
  )}`

  // Generate SVG QR code cleanly
  const qrSvg = generateQrCodeSvg(pairingUrl, {
    size: 160,
    margin: 2,
    color: "#102A45",
    bgColor: "#ffffff",
    title: `Scan QR untuk menghubungkan HP ke Room ${roomCode}`,
  })

  const handleCopyLink = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(pairingUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // Ignore clipboard permission errors
    }
  }

  const handleRegenerate = () => {
    if (onRegenerateRoomCode) {
      onRegenerateRoomCode()
    } else {
      setInternalRoomCode(generateTennisRoomCode())
    }
  }

  const handleTestRumble = () => {
    setRumbleFeedback(true)
    if (onTestRumble) {
      onTestRumble()
    }
    setTimeout(() => {
      setRumbleFeedback(false)
    }, 1200)
  }

  const isLocalhost =
    origin.includes("localhost") || origin.includes("127.0.0.1")

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-3 select-none animate-in fade-in-0 duration-150"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="remote-connect-title"
        onClick={(e) => e.stopPropagation()}
        className="retro-window-frame max-w-lg w-full rounded-[4px] overflow-hidden shadow-[6px_6px_0px_rgba(0,0,0,0.35)] bg-[#D4DDE6] flex flex-col border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287]"
      >
        {/* Retro Titlebar */}
        <div className="bg-gradient-to-r from-[#102A45] via-[#1E4E8C] to-[#2E6FB5] px-2.5 py-1.5 flex items-center justify-between font-mono text-xs font-bold text-white shadow-inner">
          <div className="flex items-center gap-1.5">
            <Smartphone className="size-3.5 text-yellow-300" />
            <span id="remote-connect-title">REMOTE_CONNECT.EXE</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hover:bg-red-600 hover:text-white px-1.5 py-0.5 rounded-[2px] transition-colors leading-none cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3 space-y-3">
          {/* Header Banner */}
          <div className="flex items-center gap-2.5 p-2 bg-white/80 rounded-[2px] border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white">
            <div className="size-9 shrink-0 bg-[#102A45] text-yellow-300 rounded-[2px] flex items-center justify-center font-bold text-base shadow-inner">
              📱
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-mono font-bold text-xs text-[#102A45] flex items-center gap-1.5">
                <span>Wireless Joy-Con / Remote Motion Controller</span>
                <span className="text-[10px] bg-blue-100 text-[#1E4E8C] px-1 py-0.2 rounded font-sans">
                  Wii Mode
                </span>
              </div>
              <div className="text-[11px] font-sans text-gray-700 leading-tight mt-0.5">
                Ayunkan smartphone Anda di udara untuk servis, forehand, backhand, dan smash dengan getaran haptik!
              </div>
            </div>
          </div>

          {/* Main Pairing Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Left Column: Code & Controls */}
            <div className="space-y-2.5 flex flex-col justify-between">
              {/* Room Code LCD */}
              <div className="p-2 bg-white rounded-[2px] border-2 border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white space-y-1">
                <div className="text-[10px] font-mono font-bold text-gray-600 uppercase flex items-center justify-between">
                  <span>Kode Ruangan (Room Code)</span>
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    className="hover:text-blue-700 flex items-center gap-1 text-[10px] font-mono cursor-pointer"
                    title="Ganti Kode Baru"
                  >
                    <RotateCw className="size-2.5" />
                    <span>Acak</span>
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 bg-[#0c1926] text-[#33ff66] font-mono font-black text-xl text-center py-1 rounded-[2px] tracking-widest border border-black shadow-inner select-all">
                    {roomCode}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="p-1.5 bg-[#D4DDE6] border border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] active:border-t-[#5E7287] active:border-l-[#5E7287] active:border-r-white active:border-b-white hover:bg-[#E2EAF2] rounded-[2px] cursor-pointer"
                    title="Salin Link Pairing"
                  >
                    {copied ? (
                      <Check className="size-4 text-emerald-600" />
                    ) : (
                      <Copy className="size-4 text-gray-700" />
                    )}
                  </button>
                </div>
              </div>

              {/* Status Indicator Card */}
              <div className="p-2.5 bg-white rounded-[2px] border-2 border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white space-y-1.5">
                <div className="text-[10px] font-mono font-bold text-gray-500 uppercase">
                  Status Koneksi Supabase Presence
                </div>

                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    {isMobileConnected && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    )}
                    <span
                      className={cn(
                        "relative inline-flex rounded-full h-3 w-3",
                        isMobileConnected
                          ? "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                          : "bg-amber-400 animate-pulse shadow-[0_0_6px_#f59e0b]"
                      )}
                    />
                  </span>
                  <span
                    className={cn(
                      "font-mono text-xs font-bold",
                      isMobileConnected ? "text-emerald-700" : "text-amber-800"
                    )}
                  >
                    {isMobileConnected
                      ? "HP Terhubung (Joy-Con Aktif)"
                      : "Menunggu HP terhubung..."}
                  </span>
                </div>

                <div className="text-[11px] font-sans text-gray-600 leading-tight">
                  {isMobileConnected ? (
                    <span className="text-emerald-900 font-semibold flex items-center gap-1">
                      <Wifi className="size-3 text-emerald-600 shrink-0" />
                      <span>{connectedDevice || "Perangkat Smartphone Terdeteksi"}</span>
                    </span>
                  ) : !isSupabaseConfigured ? (
                    <span className="text-amber-700">
                      Mode Demo Offline (Supabase tidak dikonfigurasi).
                    </span>
                  ) : (
                    <span>Arahkan kamera HP ke QR Code di samping untuk pairing instan.</span>
                  )}
                </div>
              </div>

              {/* Test Rumble Button */}
              <button
                type="button"
                onClick={handleTestRumble}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-1.5 px-3 font-mono text-xs font-bold rounded-[2px] cursor-pointer shadow-[1px_1px_0px_#5E7287] transition-all",
                  rumbleFeedback
                    ? "bg-emerald-600 text-white border-2 border-emerald-800"
                    : "bg-[#D4DDE6] text-[#14253D] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] active:border-t-[#5E7287] active:border-l-[#5E7287] active:border-r-white active:border-b-white hover:bg-[#E2EAF2]"
                )}
                title="Kirim sinyal getar haptik ke HP"
              >
                <Vibrate className={cn("size-3.5", rumbleFeedback && "animate-bounce")} />
                <span>
                  {rumbleFeedback ? "📳 Sinyal Getar Terkirim!" : "Uji Getar (Test Rumble)"}
                </span>
              </button>
            </div>

            {/* Right Column: Scannable QR Code */}
            <div className="flex flex-col items-center justify-center p-2.5 bg-white rounded-[2px] border-2 border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white shadow-inner">
              <div
                dangerouslySetInnerHTML={{ __html: qrSvg }}
                className="size-[160px] flex items-center justify-center select-none"
              />
              <div className="text-[10px] font-mono font-bold text-gray-500 mt-1 flex items-center gap-1">
                <span>Scan dengan Kamera HP</span>
              </div>
            </div>
          </div>

          {/* Localhost / LAN Tip Notice */}
          {isLocalhost && (
            <div className="p-1.5 bg-amber-50/90 border border-amber-300 rounded-[2px] text-[10px] font-sans text-amber-900 leading-tight flex items-start gap-1.5">
              <span className="font-bold text-amber-700 shrink-0">💡 TIPS LAN:</span>
              <span>
                Jika HP berada di satu jaringan Wi-Fi lokal, buka{" "}
                <code className="font-mono font-bold text-amber-950 bg-amber-100 px-1 py-0.2 rounded">
                  http://&lt;IP_KOMPUTER&gt;:3000/tennis-remote?room={roomCode}
                </code>
              </span>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-[#CBD5E1]">
            <a
              href={pairingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] font-mono font-bold text-[#1E4E8C] hover:text-[#153A6B] hover:underline"
              title="Buka tab kontroler di browser ini untuk pengujian langsung"
            >
              <span>Buka Remote di Tab Baru</span>
              <ExternalLink className="size-3" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="bg-[#D4DDE6] border border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] active:border-t-[#5E7287] active:border-l-[#5E7287] active:border-r-white active:border-b-white hover:bg-[#E2EAF2] px-6 py-1 text-xs font-mono font-bold text-[#14253D] rounded-[2px] shadow-[1px_1px_0px_#5E7287] cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
