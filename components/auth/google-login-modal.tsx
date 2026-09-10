"use client"

import * as React from "react"
import { useAuth } from "@/lib/auth"
import { Lock, AlertTriangle, AlertCircle } from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

interface GoogleLoginModalProps {
  isOpen?: boolean
  onClose?: () => void
}

export function GoogleLoginModal({ isOpen, onClose }: GoogleLoginModalProps) {
  const { user, isLoading, signInWithGoogle, signInAsGuest, isSupabaseConnected } = useAuth()
  const [isSigningIn, setIsSigningIn] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  // Show if explicitly opened via isOpen, OR if user is not logged in and not loading
  const shouldShow = Boolean(isOpen || (!user && !isLoading))
  if (!shouldShow || isLoading) return null

  const handleGoogleLogin = async () => {
    try {
      setErrorMessage(null)
      setIsSigningIn(true)
      await signInWithGoogle()
      onClose?.()
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : "Gagal menghubungkan ke Google OAuth."
      setErrorMessage(msg)
      setIsSigningIn(false)
    }
  }

  const handleGuestLogin = () => {
    signInAsGuest()
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px] flex items-center justify-center p-4 select-none">
      <div className="retro-window-frame max-w-md w-full rounded-[4px] overflow-hidden shadow-[5px_5px_0px_rgba(0,0,0,0.3)] flex flex-col">
        
        {/* Title Bar */}
        <div className="retro-titlebar px-3 py-1.5 flex items-center justify-between font-mono text-xs font-bold text-[#14253D]">
          <div className="flex items-center gap-2">
            <Lock className="size-3.5 text-[#2E5AA8]" />
            <span>SECURITY_GATE.EXE — LOGIN INTERNAL IT</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 bg-white space-y-4">
          
          <div className="flex items-center gap-3 p-3 bg-[#EEF2F6] border border-[#95A5B5] rounded-[3px]">
            <div className="size-9 bg-white border border-[#7D8E9E] rounded-[2px] flex items-center justify-center text-lg shrink-0">
              🖥️
            </div>
            <div className="text-xs font-mono font-bold text-[#14253D]">
              IT-THINGS.EXE ACCESS GATE
            </div>
          </div>

          {/* Login Button with Google SVG */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              disabled={isSigningIn || !isSupabaseConnected}
              onClick={handleGoogleLogin}
              className="w-full py-2.5 px-4 rounded-[2px] border border-[#7D8E9E] bg-[#EEF2F6] hover:bg-[#E2E8F0] active:translate-y-px text-[#14253D] font-mono text-xs font-bold flex items-center justify-center gap-2.5 shadow-[1px_1px_0px_#7D8E9E] transition-all disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
            >
              <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{isSigningIn ? "MENGHUBUNGKAN GOOGLE..." : "Masuk dengan Google"}</span>
            </button>

            {/* Guest / Demo Option */}
            <button
              type="button"
              onClick={handleGuestLogin}
              className="w-full py-1.5 px-3 rounded-[2px] border border-dashed border-[#7D8E9E] hover:bg-gray-50 text-gray-600 font-mono text-[11px] text-center active:translate-y-px"
            >
              Mode Peninjauan / Tamu Internal (Tanpa Login)
            </button>
          </div>

          {!isSupabaseConnected && (
            <Alert variant="warning">
              <AlertTriangle className="size-4" />
              <div>
                <AlertTitle>[CONFIG WAJIB]: SUPABASE BELUM TERHUBUNG</AlertTitle>
                <AlertDescription>
                  Kredensial Supabase belum terisi di <code className="font-bold">.env.local</code>. Harap hubungkan database agar login Google dapat berfungsi.
                </AlertDescription>
              </div>
            </Alert>
          )}

          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <div>
                <AlertTitle>[AUTH ERROR]: GAGAL LOGIN</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </div>
            </Alert>
          )}

        </div>
      </div>
    </div>
  )
}

