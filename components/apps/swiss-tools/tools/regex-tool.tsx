"use client"

import * as React from "react"
import { Copy, Check, Regex, AlertCircle } from "lucide-react"
import { playRetroNotificationSound } from "@/lib/sound-effects"

interface MatchItem {
  index: number
  text: string
  groups?: string[]
}

const PRESETS = [
  { label: "Pilih Preset Pola Standar...", pattern: "", flags: "g" },
  { label: "Alamat Email", pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}", flags: "g" },
  { label: "URL Web (HTTP / HTTPS)", pattern: "https?:\\/\\/[\\w\\-\\.]+(?::\\d+)?(?:\\/[\\w\\/\\.\\#\\?\\=\\&\\%]*)?", flags: "gi" },
  { label: "Alamat IPv4", pattern: "\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b", flags: "g" },
  { label: "UUID v4 String", pattern: "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}", flags: "gi" },
  { label: "Nomor HP Indonesia (+62/08)", pattern: "(?:\\+62|62|0)8[1-9][0-9]{6,10}", flags: "g" },
]

export function RegexTool() {
  const [pattern, setPattern] = React.useState("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}")
  const [flagG, setFlagG] = React.useState(true)
  const [flagI, setFlagI] = React.useState(true)
  const [flagM, setFlagM] = React.useState(false)
  const [flagS, setFlagS] = React.useState(false)
  const [testText, setTestText] = React.useState(
    "Hubungi tim admin di admin@it-things.local atau ajie@team.internal untuk bantuan rilis. Alternatif: devops@company.com"
  )
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null)

  const flags = React.useMemo(() => {
    let f = ""
    if (flagG) f += "g"
    if (flagI) f += "i"
    if (flagM) f += "m"
    if (flagS) f += "s"
    return f
  }, [flagG, flagI, flagM, flagS])

  const result = React.useMemo(() => {
    if (!pattern || !testText) {
      return { matches: [], error: null }
    }

    try {
      const regex = new RegExp(pattern, flags)
      const matches: MatchItem[] = []

      if (flags.includes("g")) {
        let m: RegExpExecArray | null
        let safetyCount = 0
        while ((m = regex.exec(testText)) !== null && safetyCount < 1000) {
          safetyCount++
          matches.push({
            index: m.index,
            text: m[0],
            groups: m.length > 1 ? Array.from(m).slice(1) : undefined,
          })
          if (m.index === regex.lastIndex) {
            regex.lastIndex++
          }
        }
      } else {
        const m = regex.exec(testText)
        if (m) {
          matches.push({
            index: m.index,
            text: m[0],
            groups: m.length > 1 ? Array.from(m).slice(1) : undefined,
          })
        }
      }

      return { matches, error: null }
    } catch (err: unknown) {
      return {
        matches: [],
        error: err instanceof Error ? err.message : "Regex syntax error",
      }
    }
  }, [pattern, flags, testText])

  const copyVal = async (val: string, key: string) => {
    try {
      await navigator.clipboard.writeText(val)
      setCopiedKey(key)
      playRetroNotificationSound(0.2)
      setTimeout(() => setCopiedKey(null), 1500)
    } catch {
      // ignore
    }
  }

  const handleApplyPreset = (index: number) => {
    const p = PRESETS[index]
    if (!p.pattern) return
    setPattern(p.pattern)
    setFlagG(p.flags.includes("g"))
    setFlagI(p.flags.includes("i"))
    setFlagM(p.flags.includes("m"))
    setFlagS(p.flags.includes("s"))
    playRetroNotificationSound(0.15)
  }

  return (
    <div className="flex flex-col h-full bg-[#C0C0C0] text-black font-sans text-xs overflow-y-auto">
      {/* Pattern Input Toolbar */}
      <div className="p-3 bg-[#D4D0C8] border-b-2 border-b-[#808080] space-y-2.5 shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 font-bold text-[12px] text-[#000080]">
            <Regex className="size-4 text-[#000080]" />
            <span>Pola Regular Expression:</span>
          </div>

          <select
            onChange={(e) => handleApplyPreset(parseInt(e.target.value, 10))}
            className="h-7 px-2 bg-white border border-t-[#808080] border-l-[#808080] border-r-white border-b-white rounded-[2px] text-[11px] font-sans cursor-pointer text-slate-900"
          >
            {PRESETS.map((p, idx) => (
              <option key={idx} value={idx}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Pattern & Flags Field */}
        <div className="flex items-center gap-2">
          <span className="text-slate-800 font-bold text-base font-mono">/</span>
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="Ketik pola regex (contoh: [a-z0-9]+)..."
            className="flex-1 h-8 px-2.5 bg-white border border-t-[#808080] border-l-[#808080] border-r-white border-b-white rounded-[2px] font-mono text-[13px] outline-none text-[#0F172A] shadow-inner font-semibold"
          />
          <span className="text-slate-800 font-bold text-base font-mono">/</span>
          <span className="bg-[#ECE9D8] px-2.5 py-1.5 rounded-[2px] border border-[#808080] font-bold text-[12px] text-[#000080] font-mono shadow-xs">
            {flags || "-"}
          </span>
        </div>

        {/* Flags Checkbox */}
        <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-800 pt-0.5 flex-wrap">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={flagG}
              onChange={(e) => setFlagG(e.target.checked)}
              className="cursor-pointer"
            />
            <span>Global (g)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={flagI}
              onChange={(e) => setFlagI(e.target.checked)}
              className="cursor-pointer"
            />
            <span>Case Insensitive (i)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={flagM}
              onChange={(e) => setFlagM(e.target.checked)}
              className="cursor-pointer"
            />
            <span>Multiline (m)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={flagS}
              onChange={(e) => setFlagS(e.target.checked)}
              className="cursor-pointer"
            />
            <span>DotAll (s)</span>
          </label>
        </div>
      </div>

      {/* Error Notice */}
      {result.error && (
        <div className="m-3 p-3 bg-rose-50 border-2 border-rose-400 rounded-[2px] text-rose-950 text-[12px] flex items-center gap-2.5 shrink-0 font-medium">
          <AlertCircle className="size-5 text-rose-600 shrink-0" />
          <span>{result.error}</span>
        </div>
      )}

      {/* Test String Input */}
      <div className="p-3 space-y-1.5 shrink-0">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-[#000080]">Teks Target Pengujian:</span>
          <span className="text-gray-600 font-mono font-semibold">{testText.length} karakter</span>
        </div>
        <div className="bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white shadow-inner">
          <textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            rows={3}
            className="w-full p-2.5 font-mono text-[13px] leading-relaxed resize-none outline-none text-[#0F172A] selection:bg-[#000080] selection:text-white"
          />
        </div>
      </div>

      {/* Match Results */}
      <div className="p-3 space-y-2.5 flex-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-[#000080] uppercase tracking-wider font-mono">
            Hasil Kecocokan ({result.matches.length} Ditemukan):
          </span>
        </div>

        {result.matches.length === 0 ? (
          <div className="p-4 bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white rounded-[2px] text-gray-500 italic text-[12px] text-center shadow-inner">
            Tidak ada kecocokan ditemukan untuk pola regex di atas pada teks target.
          </div>
        ) : (
          <div className="space-y-2">
            {result.matches.map((item, idx) => (
              <div
                key={idx}
                className="bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white rounded-[2px] p-2.5 flex items-center justify-between gap-3 shadow-xs hover:border-[#000080] transition-colors"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2.5 text-[11px]">
                    <span className="font-bold text-[#000080] font-mono">Match #{idx + 1}</span>
                    <span className="text-gray-500 font-mono text-[10px]">Index Posisi: {item.index}</span>
                  </div>
                  <div className="font-mono text-[13px] text-emerald-900 font-bold break-all select-text bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {item.text}
                  </div>
                  {item.groups && item.groups.length > 0 && (
                    <div className="pt-1 text-[11px] text-gray-700 flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-gray-500">Capture Groups:</span>
                      {item.groups.map((g, gi) => (
                        <span key={gi} className="bg-slate-100 px-1.5 py-0.2 border border-slate-300 rounded text-[11px] font-mono font-medium">
                          ${gi + 1}: {g}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => copyVal(item.text, `match-${idx}`)}
                  className="h-7 px-3 bg-[#C0C0C0] hover:bg-white text-[11px] font-bold text-slate-900 rounded-[2px] border border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:translate-y-px flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                >
                  {copiedKey === `match-${idx}` ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3 text-gray-600" />}
                  <span>{copiedKey === `match-${idx}` ? "Tersalin!" : "Salin"}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
