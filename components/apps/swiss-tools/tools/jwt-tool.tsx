"use client"

import * as React from "react"
import { Copy, Check, ShieldCheck, ShieldAlert, KeyRound, Clock, AlertTriangle } from "lucide-react"
import { playRetroNotificationSound } from "@/lib/sound-effects"

const SAMPLE_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFqaWUgUHJhc2V0eW8iLCJyb2xlIjoiYWRtaW4iLCJlbWFpbCI6ImFqaWVAdGVhbS5pbnRlcm5hbCIsImlhdCI6MTY5MDAwMDAwMCwiZXhwIjoxOTAwMDAwMDAwfQ." +
  "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

interface JwtDecoded {
  header: Record<string, unknown> | null
  payload: Record<string, unknown> | null
  signature: string
  error?: string
}

function base64UrlDecode(str: string): string {
  let output = str.replace(/-/g, "+").replace(/_/g, "/")
  switch (output.length % 4) {
    case 0:
      break
    case 2:
      output += "=="
      break
    case 3:
      output += "="
      break
    default:
      throw new Error("Invalid base64url string")
  }
  try {
    return decodeURIComponent(
      atob(output)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    )
  } catch {
    return atob(output)
  }
}

export function JwtTool() {
  const [token, setToken] = React.useState(SAMPLE_JWT)
  const [copiedSection, setCopiedSection] = React.useState<string | null>(null)
  const [nowMs, setNowMs] = React.useState<number>(() => Date.now())

  React.useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const decoded = React.useMemo<JwtDecoded>(() => {
    if (!token.trim()) {
      return { header: null, payload: null, signature: "" }
    }

    const parts = token.trim().split(".")
    if (parts.length !== 3) {
      return {
        header: null,
        payload: null,
        signature: "",
        error: "Format token tidak valid. JWT wajib memiliki 3 bagian yang dipisahkan tanda titik: Header.Payload.Signature",
      }
    }

    try {
      const headerStr = base64UrlDecode(parts[0])
      const payloadStr = base64UrlDecode(parts[1])
      const header = JSON.parse(headerStr)
      const payload = JSON.parse(payloadStr)
      return {
        header,
        payload,
        signature: parts[2],
      }
    } catch (err: unknown) {
      return {
        header: null,
        payload: null,
        signature: parts[2] || "",
        error: err instanceof Error ? err.message : "Gagal membaca Base64URL atau parsing JSON token",
      }
    }
  }, [token])

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedSection(section)
      playRetroNotificationSound(0.25)
      setTimeout(() => setCopiedSection(null), 2000)
    } catch {
      // ignore
    }
  }

  // Cek Status Expiry
  const expInfo = React.useMemo(() => {
    if (!decoded.payload || typeof decoded.payload.exp !== "number" || !nowMs) {
      return null
    }

    const expTimeMs = decoded.payload.exp * 1000
    const isExpired = nowMs > expTimeMs
    const diffSeconds = Math.floor(Math.abs(expTimeMs - nowMs) / 1000)

    const days = Math.floor(diffSeconds / 86400)
    const hours = Math.floor((diffSeconds % 86400) / 3600)
    const minutes = Math.floor((diffSeconds % 3600) / 60)
    const seconds = diffSeconds % 60

    let diffText = ""
    if (days > 0) diffText += `${days} hari `
    if (hours > 0) diffText += `${hours} jam `
    diffText += `${minutes} m ${seconds} s`

    const formattedDate = new Date(expTimeMs).toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      dateStyle: "full",
      timeStyle: "medium",
    })

    return {
      isExpired,
      diffText,
      formattedDate,
    }
  }, [decoded.payload, nowMs])

  return (
    <div className="flex flex-col h-full bg-[#C0C0C0] text-black font-sans text-xs overflow-y-auto">
      {/* Top Input Area */}
      <div className="p-3 bg-[#D4D0C8] border-b-2 border-b-[#808080] space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <label className="font-bold text-[12px] text-[#000080] flex items-center gap-1.5">
            <KeyRound className="size-4 text-[#000080]" />
            <span>Raw JWT Token String:</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setToken(SAMPLE_JWT)}
              className="h-6 px-2.5 bg-[#C0C0C0] hover:bg-white text-slate-800 text-[11px] font-semibold rounded-[2px] border border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:translate-y-px cursor-pointer"
            >
              Isi Sample
            </button>
            <button
              type="button"
              onClick={() => setToken("")}
              disabled={!token}
              className="h-6 px-2.5 bg-[#C0C0C0] hover:bg-rose-100 text-rose-900 disabled:opacity-40 text-[11px] font-semibold rounded-[2px] border border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:translate-y-px cursor-pointer"
            >
              Kosongkan
            </button>
          </div>
        </div>

        <div className="bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white shadow-inner">
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Tempel (paste) JWT token string di sini (contoh: eyJhbGci...)"
            rows={3}
            spellCheck={false}
            className="w-full p-2.5 font-mono text-[12px] leading-snug resize-none outline-none text-[#0F172A] break-all selection:bg-[#000080] selection:text-white"
          />
        </div>

        {/* Privacy Note */}
        <div className="text-[11px] text-slate-700 flex items-center gap-2 pt-0.5">
          <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-900 border border-emerald-400 rounded-[2px] font-mono font-bold text-[10px]">
            AMAN 100%
          </span>
          <span>Inspeksi dilakukan secara offline di browser. Token tidak pernah dikirim ke server.</span>
        </div>
      </div>

      {/* Error Notice */}
      {decoded.error && (
        <div className="m-3 p-3 bg-rose-50 border-2 border-rose-400 rounded-[2px] text-rose-950 text-[12px] flex items-center gap-2.5 font-medium">
          <AlertTriangle className="size-5 text-rose-600 shrink-0" />
          <span>{decoded.error}</span>
        </div>
      )}

      {/* Decoded Content Grid */}
      {decoded.header && decoded.payload && (
        <div className="p-3 space-y-3.5 flex-1">
          {/* Expiration Status Card */}
          <div
            className={`p-3 rounded-[2px] border-2 shadow-xs flex items-center justify-between flex-wrap gap-2 text-[12px] ${
              expInfo
                ? expInfo.isExpired
                  ? "bg-rose-50 border-rose-400 text-rose-950"
                  : "bg-emerald-50 border-emerald-400 text-emerald-950"
                : "bg-amber-50 border-amber-400 text-amber-950"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {expInfo ? (
                expInfo.isExpired ? (
                  <ShieldAlert className="size-5 text-rose-600 shrink-0" />
                ) : (
                  <ShieldCheck className="size-5 text-emerald-700 shrink-0" />
                )
              ) : (
                <Clock className="size-5 text-amber-700 shrink-0" />
              )}
              <div>
                <div className="font-bold text-[13px]">
                  {expInfo ? (
                    expInfo.isExpired ? (
                      <span className="text-rose-700">TOKEN KADALUARSA (Expired {expInfo.diffText} yang lalu)</span>
                    ) : (
                      <span className="text-emerald-700">TOKEN AKTIF & BERLAKU (Sisa {expInfo.diffText})</span>
                    )
                  ) : (
                    <span className="text-amber-800">Token Tidak Memiliki Klaim Expiration (`exp`)</span>
                  )}
                </div>
                {expInfo && (
                  <div className="text-[11px] opacity-80 mt-0.5">
                    Waktu Kadaluarsa: <strong>{expInfo.formattedDate} WIB</strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Side by Side / Stacked: Header & Signature */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Header Box */}
            <div className="bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white shadow-inner flex flex-col">
              <div className="bg-[#D4D0C8] px-3 py-1.5 border-b border-[#808080] flex items-center justify-between shrink-0">
                <span className="font-bold text-[11px] text-[#991B1B] uppercase tracking-wide flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#DC2626]" />
                  <span>Header: Algoritma & Tipe</span>
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(JSON.stringify(decoded.header, null, 2), "header")}
                  className="h-6 px-2 bg-[#C0C0C0] hover:bg-white text-[10px] font-bold rounded-[2px] border border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:translate-y-px flex items-center gap-1 cursor-pointer"
                >
                  {copiedSection === "header" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                  <span>Salin</span>
                </button>
              </div>
              <pre className="p-3 text-[12px] font-mono leading-relaxed overflow-x-auto text-[#991B1B] select-text bg-[#FEF2F2]">
                {JSON.stringify(decoded.header, null, 2)}
              </pre>
            </div>

            {/* Signature Box */}
            <div className="bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white shadow-inner flex flex-col">
              <div className="bg-[#D4D0C8] px-3 py-1.5 border-b border-[#808080] flex items-center justify-between shrink-0">
                <span className="font-bold text-[11px] text-[#0F766E] uppercase tracking-wide flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#0D9488]" />
                  <span>Signature: Tanda Tangan Kripto</span>
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(decoded.signature, "sig")}
                  className="h-6 px-2 bg-[#C0C0C0] hover:bg-white text-[10px] font-bold rounded-[2px] border border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:translate-y-px flex items-center gap-1 cursor-pointer"
                >
                  {copiedSection === "sig" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                  <span>Salin</span>
                </button>
              </div>
              <div className="p-3 text-[12px] font-mono leading-relaxed text-[#0F766E] break-all select-text bg-[#F0FDFA]">
                {decoded.signature || "(Tidak ada signature)"}
              </div>
            </div>
          </div>

          {/* Payload Box */}
          <div className="bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white shadow-inner flex flex-col">
            <div className="bg-[#D4D0C8] px-3 py-1.5 border-b border-[#808080] flex items-center justify-between shrink-0">
              <span className="font-bold text-[11px] text-[#1E40AF] uppercase tracking-wide flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#2563EB]" />
                <span>Payload: Data Claims (User, Role, Permissions)</span>
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(JSON.stringify(decoded.payload, null, 2), "payload")}
                className="h-6 px-2.5 bg-[#C0C0C0] hover:bg-white text-[10px] font-bold rounded-[2px] border border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:translate-y-px flex items-center gap-1.5 cursor-pointer"
              >
                {copiedSection === "payload" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                <span>Salin Payload JSON</span>
              </button>
            </div>
            <pre className="p-3 text-[12px] font-mono leading-relaxed overflow-x-auto text-[#1E3A8A] select-text bg-[#EFF6FF]">
              {JSON.stringify(decoded.payload, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
