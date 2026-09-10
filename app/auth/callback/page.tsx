"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthCallbackPage() {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!supabase) {
      router.replace("/")
      return
    }
    const client = supabase

    const processAuth = async () => {
      try {
        // 1. Ambil code PKCE dari query param (?code=...) jika ada
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href)
          const code = url.searchParams.get("code")
          if (code) {
            const { error: exchangeError } = await client.auth.exchangeCodeForSession(code)
            if (exchangeError) {
              console.error("Code exchange error:", exchangeError)
              throw exchangeError
            }
          }
        }

        // 2. Ambil sesi supabase aktif
        const { data: { session }, error: sessionError } = await client.auth.getSession()
        if (sessionError) {
          console.error("Session fetch error:", sessionError)
          throw sessionError
        }

        // 3. Bersihkan sesi tamu jika sesi login aktif
        if (session?.user && typeof window !== "undefined") {
          try {
            localStorage.removeItem("it_things_guest_session")
            localStorage.setItem("it_things_passcode_verified", "true")
            sessionStorage.setItem("it_things_passcode_verified", "true")
          } catch (e) {
            console.warn("Storage cleanup error:", e)
          }
        }

        router.replace("/")
      } catch (err: unknown) {
        console.error("Auth callback error:", err)
        const msg = err instanceof Error ? err.message : "Gagal memvalidasi sesi autentikasi."
        setErrorMessage(msg)
      }
    }

    processAuth()
  }, [router])

  return (
    <div className="min-h-screen bg-[#BDC6CE] flex items-center justify-center p-4 font-mono select-none">
      <div className="retro-window-frame max-w-sm w-full rounded-[4px] overflow-hidden shadow-[4px_4px_0px_rgba(0,0,0,0.25)] bg-white">
        <div className="retro-titlebar px-3 py-1.5 flex items-center justify-between font-mono text-xs font-bold text-[#14253D]">
          <span>AUTH_CALLBACK.EXE</span>
          <span className="text-[10px] opacity-50">×</span>
        </div>

        <div className="p-4 text-center space-y-3">
          {errorMessage ? (
            <div className="space-y-2">
              <div className="text-xs text-[#DC2626] font-bold">[LOGIN GAGAL]</div>
              <p className="text-[11px] text-[#526374]">{errorMessage}</p>
              <button
                type="button"
                onClick={() => router.replace("/")}
                className="mt-2 px-3 py-1 bg-[#EEF2F6] border border-[#7D8E9E] rounded text-xs font-bold hover:bg-[#E2E8F0]"
              >
                Kembali ke Aplikasi
              </button>
            </div>
          ) : (
            <div className="space-y-2 text-xs text-[#14253D]">
              <div className="animate-pulse font-bold">MENGHUBUNGKAN SESI GOOGLE...</div>
              <p className="text-[10px] text-[#526374]">&gt; Memvalidasi token OAuth 2.0...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
