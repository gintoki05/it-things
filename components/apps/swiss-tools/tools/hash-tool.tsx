"use client"

import * as React from "react"
import { Copy, Check, Hash, CheckCircle2, XCircle } from "lucide-react"
import { computeMd5, computeSubtleHash } from "../crypto-utils"
import { playRetroNotificationSound } from "@/lib/sound-effects"

interface HashResult {
  algo: string
  value: string
  bits: number
  desc: string
}

export function HashTool() {
  const [input, setInput] = React.useState("IT-Things 98")
  const [isUpper, setIsUpper] = React.useState(false)
  const [copiedAlgo, setCopiedAlgo] = React.useState<string | null>(null)
  const [verifyHash, setVerifyHash] = React.useState("")
  const [hashes, setHashes] = React.useState<HashResult[]>([])

  React.useEffect(() => {
    let isMounted = true

    async function calculate() {
      if (!input) {
        setHashes([])
        return
      }

      const md5Val = computeMd5(input)
      const sha1Val = await computeSubtleHash("SHA-1", input)
      const sha256Val = await computeSubtleHash("SHA-256", input)
      const sha512Val = await computeSubtleHash("SHA-512", input)

      if (!isMounted) return

      const format = (v: string) => (isUpper ? v.toUpperCase() : v.toLowerCase())

      setHashes([
        { algo: "MD5", value: format(md5Val), bits: 128, desc: "Legacy / Checksum cepat (32 karakter)" },
        { algo: "SHA-1", value: format(sha1Val), bits: 160, desc: "Git commit hash standard (40 karakter)" },
        { algo: "SHA-256", value: format(sha256Val), bits: 256, desc: "Standar industri modern & aman (64 karakter)" },
        { algo: "SHA-512", value: format(sha512Val), bits: 512, desc: "Enkripsi kekuatan tinggi (128 karakter)" },
      ])
    }

    calculate()

    return () => {
      isMounted = false
    }
  }, [input, isUpper])

  const copyHash = async (algo: string, val: string) => {
    try {
      await navigator.clipboard.writeText(val)
      setCopiedAlgo(algo)
      playRetroNotificationSound(0.25)
      setTimeout(() => setCopiedAlgo(null), 2000)
    } catch {
      // ignore
    }
  }

  // Cek apakah hash yang di-input cocok dengan salah satu hasil kalkulasi
  const matchResult = React.useMemo(() => {
    const trimmed = verifyHash.trim().toLowerCase()
    if (!trimmed) return null
    const matched = hashes.find((h) => h.value.toLowerCase() === trimmed)
    return matched ? matched.algo : false
  }, [verifyHash, hashes])

  return (
    <div className="flex flex-col h-full bg-[#C0C0C0] text-black font-sans text-xs overflow-y-auto">
      {/* Top Input Area */}
      <div className="p-3 bg-[#D4D0C8] border-b-2 border-b-[#808080] space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <label className="font-bold text-[12px] text-[#000080] flex items-center gap-1.5">
            <Hash className="size-4 text-[#000080]" />
            <span>Teks Sumber Hashing:</span>
          </label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-[11px] text-slate-800 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={isUpper}
                onChange={(e) => setIsUpper(e.target.checked)}
                className="cursor-pointer"
              />
              <span>Huruf Besar (UPPERCASE)</span>
            </label>
            <button
              type="button"
              onClick={() => setInput("")}
              disabled={!input}
              className="h-6 px-2.5 bg-[#C0C0C0] hover:bg-rose-100 text-rose-900 font-semibold disabled:opacity-40 text-[11px] rounded-[2px] border border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:translate-y-px cursor-pointer"
            >
              Kosongkan
            </button>
          </div>
        </div>

        <div className="bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white shadow-inner">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ketik string yang ingin di-hash secara realtime..."
            rows={2}
            className="w-full p-2.5 font-mono text-[13px] leading-relaxed resize-none outline-none text-[#0F172A] selection:bg-[#000080] selection:text-white"
          />
        </div>
      </div>

      {/* Hash Results List */}
      <div className="p-3 space-y-3 flex-1">
        <div className="text-[11px] font-bold text-[#000080] uppercase tracking-wider font-mono">
          Hasil Algoritma Kriptografi (Realtime):
        </div>

        <div className="space-y-2.5">
          {hashes.map((h) => (
            <div
              key={h.algo}
              className="bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white shadow-xs p-2.5 rounded-[2px] space-y-1.5"
            >
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#000080] font-mono text-[12px]">{h.algo}</span>
                  <span className="px-1.5 py-0.2 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono font-bold text-gray-700">
                    {h.bits} bits
                  </span>
                  <span className="text-[11px] text-gray-600 hidden sm:inline">— {h.desc}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyHash(h.algo, h.value)}
                  className="h-6 px-2.5 bg-[#C0C0C0] hover:bg-white text-slate-900 text-[11px] font-bold rounded-[2px] border border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:translate-y-px flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {copiedAlgo === h.algo ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3 text-gray-700" />}
                  <span>{copiedAlgo === h.algo ? "Tersalin!" : "Salin Hash"}</span>
                </button>
              </div>

              <div className="p-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[2px] font-mono text-[12px] leading-relaxed text-[#0F172A] break-all select-text font-medium">
                {h.value || <span className="text-gray-400 italic">(string input kosong)</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Checksum Verifier */}
        <div className="mt-4 p-3 bg-[#D4D0C8] border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] rounded-[2px] space-y-2">
          <div className="font-bold text-[12px] text-[#000080]">Verifikasi / Bandingkan Checksum Hash:</div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={verifyHash}
              onChange={(e) => setVerifyHash(e.target.value)}
              placeholder="Tempel hash yang ingin Anda verifikasi di sini..."
              className="flex-1 h-8 px-2.5 bg-white border border-t-[#808080] border-l-[#808080] border-r-white border-b-white text-[12px] font-mono outline-none text-slate-950 shadow-inner"
            />
            {verifyHash && (
              <button
                type="button"
                onClick={() => setVerifyHash("")}
                className="h-8 px-2.5 bg-[#C0C0C0] text-gray-800 text-[11px] font-semibold border border-t-white border-l-white border-r-[#808080] border-b-[#808080] cursor-pointer"
              >
                Hapus
              </button>
            )}
          </div>

          {verifyHash.trim() && (
            <div className="pt-1">
              {matchResult ? (
                <div className="p-2 bg-emerald-100 border border-emerald-400 rounded-[2px] flex items-center gap-2 text-emerald-950 font-bold text-[12px]">
                  <CheckCircle2 className="size-5 text-emerald-700 shrink-0" />
                  <span>IDENTIK! Hash ini cocok persis dengan kalkulasi {matchResult}.</span>
                </div>
              ) : (
                <div className="p-2 bg-rose-100 border border-rose-400 rounded-[2px] flex items-center gap-2 text-rose-950 font-bold text-[12px]">
                  <XCircle className="size-5 text-rose-700 shrink-0" />
                  <span>TIDAK COCOK dengan hasil kalkulasi teks input di atas.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
