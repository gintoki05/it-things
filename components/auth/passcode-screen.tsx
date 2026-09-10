"use client"

import * as React from "react"
import { useAuth } from "@/lib/auth"
import { Lock, ShieldAlert, KeyRound, Check, Delete, RotateCcw } from "lucide-react"

export function PasscodeScreen() {
  const { verifyPasscode } = useAuth()
  const [pin, setPin] = React.useState<string>("")
  const [error, setError] = React.useState<string | null>(null)
  const [isSuccess, setIsSuccess] = React.useState<boolean>(false)
  const [isShaking, setIsShaking] = React.useState<boolean>(false)

  // Handle pin submit
  const handleCheckPin = React.useCallback(
    (pinToTest: string) => {
      if (pinToTest.length !== 4) return

      const isValid = verifyPasscode(pinToTest)
      if (isValid) {
        setError(null)
        setIsSuccess(true)
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
          Notification.requestPermission().catch(() => {})
        }
      } else {
        setError("PASSCODE SALAH — AKSES DITOLAK")
        setIsShaking(true)
        setTimeout(() => {
          setIsShaking(false)
          setPin("")
        }, 600)
      }
    },
    [verifyPasscode]
  )

  // Handle number click
  const handleDigit = (digit: string) => {
    if (isSuccess || pin.length >= 4) return
    setError(null)
    const nextPin = pin + digit
    setPin(nextPin)
    if (nextPin.length === 4) {
      handleCheckPin(nextPin)
    }
  }

  // Handle backspace
  const handleBackspace = () => {
    if (isSuccess) return
    setError(null)
    setPin((prev) => prev.slice(0, -1))
  }

  // Handle clear
  const handleClear = () => {
    if (isSuccess) return
    setError(null)
    setPin("")
  }

  // Keyboard listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSuccess) return

      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault()
        setPin((prev) => {
          if (prev.length >= 4) return prev
          const next = prev + e.key
          if (next.length === 4) {
            // Auto submit
            setTimeout(() => handleCheckPin(next), 0)
          }
          return next
        })
      } else if (e.key === "Backspace") {
        e.preventDefault()
        handleBackspace()
      } else if (e.key === "Escape" || e.key === "Delete") {
        e.preventDefault()
        handleClear()
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (pin.length === 4) {
          handleCheckPin(pin)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [pin, isSuccess, handleCheckPin])

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#1A365D] p-4 select-none">
      {/* Retro Wallpaper Texture */}
      <div
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#FFFFFF 1.5px, transparent 1.5px)`,
          backgroundSize: "20px 20px",
        }}
      />

      {/* Main Window */}
      <div
        className={`relative z-10 w-full max-w-sm rounded-[4px] border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] bg-[#D4DDE6] shadow-[6px_6px_0px_rgba(0,0,0,0.4)] transition-transform ${
          isShaking ? "animate-bounce" : ""
        }`}
      >
        {/* Title bar */}
        <div className="bg-[#1E4E8C] px-3 py-1.5 flex items-center justify-between text-white font-mono text-xs font-bold select-none border-b border-[#0E2849]">
          <div className="flex items-center gap-2">
            <Lock className="size-3.5 text-yellow-300" />
            <span>SECURITY_GATE.EXE</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] bg-[#102D52] px-1.5 py-0.5 rounded text-blue-200 border border-blue-400/40">
              v2.0
            </span>
          </div>
        </div>

        {/* Inner Content */}
        <div className="p-4 sm:p-5 flex flex-col gap-4 font-mono">
          {/* Header Badge */}
          <div className="flex items-center gap-3 p-2.5 bg-[#EEF2F6] border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px]">
            <div className="size-10 bg-[#1E4E8C] text-white flex items-center justify-center rounded-[2px] shadow-inner text-xl shrink-0">
              🔐
            </div>
            <div>
              <div className="text-xs font-bold text-[#14253D] tracking-wide">
                AUTHENTICATION REQUIRED
              </div>
              <div className="text-[11px] text-[#4A5D73]">
                Masukkan 4-digit Passcode Tim TI
              </div>
            </div>
          </div>

          {/* 4-Digit Display Boxes */}
          <div className="flex justify-center items-center gap-3 py-1">
            {[0, 1, 2, 3].map((index) => {
              const isFilled = pin.length > index
              return (
                <div
                  key={index}
                  className={`size-12 rounded-[2px] flex items-center justify-center text-xl font-bold border-2 transition-all ${
                    isFilled
                      ? "bg-[#1E4E8C] text-yellow-300 border-[#0E2849] shadow-[inset_2px_2px_0px_rgba(0,0,0,0.3)]"
                      : "bg-white text-gray-400 border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white shadow-[inset_2px_2px_0px_rgba(0,0,0,0.1)]"
                  }`}
                >
                  {isFilled ? "●" : ""}
                </div>
              )
            })}
          </div>

          {/* Status / Error Message */}
          <div className="h-6 flex items-center justify-center text-center">
            {error ? (
              <div className="flex items-center gap-1.5 text-xs text-red-700 font-bold bg-red-100 border border-red-300 px-2 py-0.5 rounded-[2px]">
                <ShieldAlert className="size-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : isSuccess ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-[2px]">
                <Check className="size-3.5 shrink-0" />
                <span>PASSCODE DITERIMA...</span>
              </div>
            ) : (
              <span className="text-[11px] text-[#607286]">
                Gunakan keyboard atau tombol di bawah
              </span>
            )}
          </div>

          {/* Retro Keypad */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleDigit(num)}
                disabled={isSuccess}
                className="h-11 bg-[#EEF2F6] hover:bg-white active:translate-y-0.5 text-[#14253D] font-bold text-lg rounded-[2px] border-2 border-t-white border-l-white border-r-[#7D8E9E] border-b-[#7D8E9E] shadow-[1px_1px_0px_#404040] transition-colors cursor-pointer disabled:opacity-50"
              >
                {num}
              </button>
            ))}

            {/* Clear Button */}
            <button
              type="button"
              onClick={handleClear}
              disabled={isSuccess || pin.length === 0}
              className="h-11 bg-[#E2E8F0] hover:bg-[#CBD5E1] active:translate-y-0.5 text-gray-700 font-bold text-xs rounded-[2px] border-2 border-t-white border-l-white border-r-[#7D8E9E] border-b-[#7D8E9E] shadow-[1px_1px_0px_#404040] flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
              title="Clear (Esc)"
            >
              <RotateCcw className="size-3.5" />
              <span>CLR</span>
            </button>

            {/* Zero Button */}
            <button
              type="button"
              onClick={() => handleDigit("0")}
              disabled={isSuccess}
              className="h-11 bg-[#EEF2F6] hover:bg-white active:translate-y-0.5 text-[#14253D] font-bold text-lg rounded-[2px] border-2 border-t-white border-l-white border-r-[#7D8E9E] border-b-[#7D8E9E] shadow-[1px_1px_0px_#404040] transition-colors cursor-pointer disabled:opacity-50"
            >
              0
            </button>

            {/* Backspace Button */}
            <button
              type="button"
              onClick={handleBackspace}
              disabled={isSuccess || pin.length === 0}
              className="h-11 bg-[#E2E8F0] hover:bg-[#CBD5E1] active:translate-y-0.5 text-gray-700 font-bold text-xs rounded-[2px] border-2 border-t-white border-l-white border-r-[#7D8E9E] border-b-[#7D8E9E] shadow-[1px_1px_0px_#404040] flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
              title="Backspace"
            >
              <Delete className="size-4" />
              <span>DEL</span>
            </button>
          </div>

          {/* Footer note */}
          <div className="pt-2 border-t border-[#A4B5C6] flex items-center justify-between text-[10px] text-gray-500">
            <span className="flex items-center gap-1">
              <KeyRound className="size-3" /> Hanya anggota internal
            </span>
            <span>SYSTEM ENCRYPTED</span>
          </div>
        </div>
      </div>
    </div>
  )
}
