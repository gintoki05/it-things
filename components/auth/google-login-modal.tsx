"use client"

import * as React from "react"
import { useAuth } from "@/lib/auth"
import { Lock, ShieldCheck, UserCheck } from "lucide-react"

export function GoogleLoginModal() {
  const { user, isLoading, signInWithGoogle, signInAsDemo, isSupabaseConnected } = useAuth()
  const [isSigningIn, setIsSigningIn] = React.useState(false)

  if (isLoading || user) return null

  const handleGoogleLogin = async () => {
    try {
      setIsSigningIn(true)
      await signInWithGoogle()
    } catch (err) {
      console.error(err)
      setIsSigningIn(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px] flex items-center justify-center p-4 select-none">
      <div className="retro-window-frame max-w-md w-full rounded-[4px] overflow-hidden shadow-[4px_4px_0px_rgba(0,0,0,0.25)] flex flex-col">
        
        {/* Title Bar */}
        <div className="retro-titlebar px-3 py-1.5 flex items-center justify-between font-mono text-xs font-bold text-[#14253D]">
          <div className="flex items-center gap-2">
            <Lock className="size-3.5 text-[#2E5AA8]" />
            <span>SECURITY_CHECK.EXE — LOGIN TEROTORISASI</span>
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            <span className="opacity-50">_</span>
            <span className="opacity-50">□</span>
            <span className="opacity-50">×</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 bg-white space-y-4">
          
          <div className="flex items-start gap-3 p-3 bg-[#EEF2F6] border border-[#95A5B5] rounded-[3px]">
            <div className="size-9 bg-white border border-[#7D8E9E] rounded-[2px] flex items-center justify-center text-lg shrink-0">
              🖥️
            </div>
            <div className="text-xs font-mono leading-tight">
              <div className="font-bold text-[#14253D]">IT-THINGS.EXE ACCESS GATE</div>
              <div className="text-[#526374] mt-1 text-[11px] leading-relaxed">
                Aplikasi internal khusus tim TI. Masuk dengan akun Google untuk mencatat usulan &amp; suara voting kamu.
              </div>
            </div>
          </div>

          {/* Login Button with Google SVG */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              disabled={isSigningIn}
              onClick={handleGoogleLogin}
              className="w-full py-2.5 px-4 rounded-[2px] border border-[#7D8E9E] bg-[#EEF2F6] hover:bg-[#E2E8F0] active:translate-y-px text-[#14253D] font-mono text-xs font-bold flex items-center justify-center gap-2.5 shadow-[1px_1px_0px_#7D8E9E] transition-all disabled:opacity-60"
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
              <span>{isSigningIn ? "MENGHUBUNGKAN GOOGLE..." : "[ G  Masuk dengan Google ]"}</span>
            </button>
          </div>

          {/* System Terminal Hints */}
          <div className="p-2.5 bg-[#FAFBFD] border border-[#CBD5E1] rounded-[2px] font-mono text-[10px] text-[#526374] space-y-0.5">
            <div>&gt; security: OAuth 2.0 via Supabase</div>
            <div>&gt; 1 person = 1 vote policy enforced</div>
            {!isSupabaseConnected && (
              <div className="text-[#D9A028] font-semibold pt-1">
                &gt; Supabase env belum diisi. Kamu bisa mencoba via mode demo di bawah.
              </div>
            )}
          </div>

          {/* Demo Fallback Buttons (Useful if Supabase keys not set yet) */}
          <div className="pt-2 border-t border-[#DDE3EA] flex items-center justify-between text-xs font-mono">
            <span className="text-[11px] text-[#526374]">Ingin coba langsung?</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => signInAsDemo("Andi")}
                className="px-2 py-1 rounded-[2px] border border-[#7D8E9E] hover:bg-[#EEF2F6] text-[10px] font-bold text-[#14253D]"
              >
                Andi
              </button>
              <button
                type="button"
                onClick={() => signInAsDemo("Ajie")}
                className="px-2 py-1 rounded-[2px] border border-[#2E5AA8] bg-[#EEF3FA] text-[10px] font-bold text-[#2E5AA8]"
              >
                Ajie
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
