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

    // supabase-js in browser handles the PKCE code exchange via localStorage
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("Auth callback error:", error)
        setErrorMessage(error.message)
      } else {
        router.replace("/")
      }
    })
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
