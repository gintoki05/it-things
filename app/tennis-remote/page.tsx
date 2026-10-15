"use client"

import * as React from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Smartphone, Zap, Play, AlertCircle } from "lucide-react"
import {
  TennisRemoteController,
  normalizeRoomCode,
} from "@/components/apps/tennis/tennis-remote-controller"
import { cn } from "@/lib/utils"

function TennisRemoteContent() {
  const searchParams = useSearchParams()
  const urlRoom = searchParams.get("room")

  // Controlled manual room input when accessing /tennis-remote without query param
  const [manualRoom, setManualRoom] = React.useState<string | null>(null)
  const [inputCode, setInputCode] = React.useState("")
  const [errorMessage, setErrorMessage] = React.useState("")

  const activeRoom = React.useMemo(() => {
    return normalizeRoomCode(manualRoom ?? urlRoom)
  }, [manualRoom, urlRoom])

  // Handle manual room submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage("")

    const normalized = normalizeRoomCode(inputCode)
    if (!normalized) {
      setErrorMessage("Kode ruangan tidak valid. Gunakan 3-10 karakter (contoh: T98-7B2X).")
      return
    }

    setManualRoom(normalized)

    // Update browser URL query param cleanly without reloading
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.set("room", normalized)
      window.history.replaceState({}, "", url.toString())
    }
  }

  // Handle exit or change room
  const handleExitRoom = () => {
    setManualRoom(null)
    setInputCode("")
    setErrorMessage("")

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.delete("room")
      window.history.replaceState({}, "", url.pathname)
    }
  }

  // If a valid room code is available, render the full Joy-Con controller
  if (activeRoom) {
    return <TennisRemoteController roomCode={activeRoom} onExit={handleExitRoom} />
  }

  // Fallback: Retro Windows 98 / Nintendo Room Pairing Form
  return (
    <div className="min-h-[100dvh] w-full bg-[#101927] flex items-center justify-center p-3 sm:p-4 select-none touch-manipulation font-sans">
      <div className="w-full max-w-sm rounded-[6px] overflow-hidden shadow-[8px_8px_0px_rgba(0,0,0,0.5)] bg-[#D4DDE6] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287]">
        {/* Retro Titlebar */}
        <div className="bg-gradient-to-r from-[#102A45] via-[#1E4E8C] to-[#2E6FB5] px-3 py-1.5 flex items-center justify-between font-mono text-xs font-bold text-white shadow-inner">
          <div className="flex items-center gap-1.5">
            <Smartphone className="size-3.5 text-yellow-300" />
            <span>REMOTE_PAIR.EXE</span>
          </div>
          <span className="text-[10px] bg-white/20 px-1 rounded">T98</span>
        </div>

        {/* Form Body */}
        <div className="p-4 space-y-3.5">
          {/* Header Banner */}
          <div className="flex items-center gap-2.5 p-2 bg-white/80 rounded-[3px] border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white">
            <div className="size-10 shrink-0 bg-[#102A45] text-yellow-300 rounded-[3px] flex items-center justify-center font-bold text-lg shadow-inner">
              🎾
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-mono font-bold text-xs text-[#102A45]">
                TENNIS 98 MOTION CONTROLLER
              </div>
              <div className="text-[11px] font-sans text-gray-700 leading-tight mt-0.5">
                Sambungkan smartphone Anda ke Desktop Tennis 98 sebagai stik Wii Remote!
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label
                htmlFor="room-code-input"
                className="block text-xs font-mono font-bold text-slate-700 uppercase"
              >
                Kode Ruangan (Room Code)
              </label>
              <input
                id="room-code-input"
                type="text"
                value={inputCode}
                onChange={(e) => {
                  setInputCode(e.target.value.toUpperCase())
                  if (errorMessage) setErrorMessage("")
                }}
                placeholder="CONTOH: T98-7B2X"
                maxLength={10}
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                className="w-full bg-[#0C1926] text-[#33FF66] font-mono font-black text-xl text-center py-2.5 px-3 rounded-[3px] border-2 border-t-black border-l-black border-r-white border-b-white shadow-inner tracking-widest placeholder:text-emerald-900/60 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {errorMessage && (
              <div className="p-2 bg-rose-50 border border-rose-300 rounded text-[11px] font-sans text-rose-800 leading-tight flex items-start gap-1.5 animate-in fade-in-0">
                <AlertCircle className="size-3.5 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-[#D4DDE6] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] active:border-t-[#5E7287] active:border-l-[#5E7287] active:border-r-white active:border-b-white hover:bg-[#E2EAF2] font-mono font-bold text-xs text-[#14253D] rounded-[3px] shadow-[1px_1px_0px_#5E7287] cursor-pointer"
            >
              <Play className="size-3.5 text-blue-700 fill-blue-700" />
              <span>SAMBUNGKAN CONTROLLER</span>
            </button>
          </form>

          {/* Help Tips */}
          <div className="p-2 bg-white/70 rounded-[3px] border border-slate-300 text-[10px] font-sans text-slate-600 leading-tight space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1 font-mono">
              <Zap className="size-3 text-amber-600" />
              <span>CARA MENGHUBUNGKAN:</span>
            </div>
            <p>
              1. Di game Tennis 98 pada komputer, klik tombol <strong>[📱 SAMBUNGKAN HP]</strong> di menu atas.
            </p>
            <p>
              2. Scan QR Code dengan kamera HP Anda, atau ketik kode ruangan yang tampil di atas.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TennisRemotePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] w-full bg-[#101927] flex flex-col items-center justify-center p-4 text-center select-none font-mono text-xs text-yellow-300">
          <Smartphone className="size-8 text-yellow-300 animate-bounce mb-2" />
          <span>MEMUAT TENNIS 98 REMOTE...</span>
        </div>
      }
    >
      <TennisRemoteContent />
    </Suspense>
  )
}
