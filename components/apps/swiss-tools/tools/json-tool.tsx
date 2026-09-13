"use client"

import * as React from "react"
import { Copy, Check, Trash2, Sparkles, CheckCircle2, AlertCircle, FileCode, Wand2 } from "lucide-react"
import { playRetroNotificationSound } from "@/lib/sound-effects"

const SAMPLE_JSON = `{
  "app": "IT-Things 98",
  "version": "2.4.0",
  "status": "online",
  "features": [
    "SwissTools",
    "Tower98",
    "PaintWar",
    "SplitBill"
  ],
  "team": {
    "name": "Internal IT",
    "membersCount": 12,
    "active": true
  }
}`

export function JsonTool() {
  const [input, setInput] = React.useState(SAMPLE_JSON)
  const [indentSize, setIndentSize] = React.useState<"2" | "4" | "tab">("2")
  const [isCopied, setIsCopied] = React.useState(false)

  // Validasi otomatis saat input berubah
  const status = React.useMemo<{ valid: boolean; message: string; line?: number } | null>(() => {
    if (!input.trim()) {
      return null
    }

    try {
      JSON.parse(input)
      return { valid: true, message: "Struktur JSON Valid & Terverifikasi" }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      let line: number | undefined
      const lineMatch = errorMsg.match(/line (\d+)/i)
      if (lineMatch) {
        line = parseInt(lineMatch[1], 10)
      } else {
        const posMatch = errorMsg.match(/position (\d+)/i)
        if (posMatch) {
          const pos = parseInt(posMatch[1], 10)
          line = input.slice(0, pos).split("\n").length
        }
      }
      return { valid: false, message: errorMsg, line }
    }
  }, [input])

  const handleFormat = () => {
    if (!input.trim()) return
    try {
      const parsed = JSON.parse(input)
      const space = indentSize === "tab" ? "\t" : parseInt(indentSize, 10)
      setInput(JSON.stringify(parsed, null, space))
      playRetroNotificationSound(0.2)
    } catch {
      // ignore
    }
  }

  const handleMinify = () => {
    if (!input.trim()) return
    try {
      const parsed = JSON.parse(input)
      setInput(JSON.stringify(parsed))
      playRetroNotificationSound(0.2)
    } catch {
      // ignore
    }
  }

  const handleFixCommon = () => {
    if (!input.trim()) return
    try {
      const fixed = input
        .replace(/'/g, '"')
        .replace(/,\s*([}\]])/g, "$1")
      const parsed = JSON.parse(fixed)
      const space = indentSize === "tab" ? "\t" : parseInt(indentSize, 10)
      setInput(JSON.stringify(parsed, null, space))
      playRetroNotificationSound(0.2)
    } catch {
      // ignore
    }
  }

  const handleCopy = async () => {
    if (!input) return
    try {
      await navigator.clipboard.writeText(input)
      setIsCopied(true)
      playRetroNotificationSound(0.25)
      setTimeout(() => setIsCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const handleClear = () => {
    setInput("")
  }

  const handleLoadSample = () => {
    setInput(SAMPLE_JSON)
    playRetroNotificationSound(0.15)
  }

  return (
    <div className="flex flex-col h-full bg-[#C0C0C0] text-black font-sans text-xs">
      {/* Action Toolbar */}
      <div className="p-2 bg-[#D4D0C8] border-b-2 border-b-[#808080] flex items-center justify-between gap-2 flex-wrap shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleFormat}
            disabled={!input.trim()}
            className="h-7 px-3 bg-[#C0C0C0] hover:bg-[#D4D0C8] disabled:opacity-40 text-black font-bold text-[11px] rounded-[2px] border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] active:border-t-[#404040] active:border-l-[#404040] active:border-r-white active:border-b-white flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="size-3.5 text-[#000080]" />
            <span>Format (Prettify)</span>
          </button>

          <button
            type="button"
            onClick={handleMinify}
            disabled={!input.trim()}
            className="h-7 px-2.5 bg-[#C0C0C0] hover:bg-[#D4D0C8] disabled:opacity-40 text-black font-semibold text-[11px] rounded-[2px] border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] active:border-t-[#404040] active:border-l-[#404040] active:border-r-white active:border-b-white flex items-center gap-1 cursor-pointer"
          >
            <span>Minify</span>
          </button>

          <button
            type="button"
            onClick={handleFixCommon}
            disabled={!input.trim()}
            title={'Otomatis ubah single-quotes (\') menjadi double-quotes (") dan hapus trailing comma'}
            className="h-7 px-2.5 bg-[#C0C0C0] hover:bg-[#D4D0C8] disabled:opacity-40 text-black font-semibold text-[11px] rounded-[2px] border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] active:border-t-[#404040] active:border-l-[#404040] active:border-r-white active:border-b-white flex items-center gap-1 cursor-pointer"
          >
            <Wand2 className="size-3 text-amber-700" />
            <span>Auto-Fix Quotes</span>
          </button>

          <div className="flex items-center gap-1.5 ml-2 text-[11px] text-slate-800 font-semibold">
            <span>Tab:</span>
            <select
              value={indentSize}
              onChange={(e) => setIndentSize(e.target.value as "2" | "4" | "tab")}
              className="h-7 px-1.5 bg-white border border-t-[#808080] border-l-[#808080] border-r-white border-b-white rounded-[2px] text-[11px] font-mono cursor-pointer text-black"
            >
              <option value="2">2 Spasi</option>
              <option value="4">4 Spasi</option>
              <option value="tab">Tab Character</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleLoadSample}
            className="h-7 px-2.5 bg-[#C0C0C0] hover:bg-white text-slate-800 text-[11px] font-semibold rounded-[2px] border border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:translate-y-px cursor-pointer"
          >
            Sample
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!input.trim()}
            className="h-7 px-3 bg-[#000080] hover:bg-[#102A45] disabled:opacity-40 text-white font-bold text-[11px] rounded-[2px] border border-white/40 shadow flex items-center gap-1.5 cursor-pointer"
          >
            {isCopied ? <Check className="size-3.5 text-[#FFD700]" /> : <Copy className="size-3.5" />}
            <span>{isCopied ? "Tersalin!" : "Salin JSON"}</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={!input.trim()}
            className="h-7 px-2.5 bg-[#C0C0C0] hover:bg-rose-100 disabled:opacity-40 text-rose-900 font-semibold text-[11px] rounded-[2px] border border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:translate-y-px flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="size-3.5 text-rose-700" />
            <span>Bersihkan</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 p-2 bg-[#808080] min-h-0 flex flex-col">
        <div className="relative flex-1 bg-white border-2 border-t-black border-l-black border-r-white border-b-white shadow-inner overflow-hidden flex flex-col">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ketik atau tempel (paste) kode JSON di sini..."
            spellCheck={false}
            className="w-full h-full p-3 font-mono text-[13px] leading-relaxed resize-none outline-none text-[#0F172A] selection:bg-[#000080] selection:text-white"
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-[#D4D0C8] border-t-2 border-t-[#808080] px-3 py-1.5 flex items-center justify-between text-[11px] shrink-0 font-sans">
        <div className="flex items-center gap-2 truncate">
          {status ? (
            status.valid ? (
              <span className="flex items-center gap-1.5 text-emerald-900 font-bold">
                <CheckCircle2 className="size-4 text-emerald-700 shrink-0" />
                <span>{status.message}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-rose-950 font-bold truncate">
                <AlertCircle className="size-4 text-rose-700 shrink-0" />
                <span className="truncate">
                  {status.line ? `[Baris ${status.line}] ` : ""}
                  {status.message}
                </span>
              </span>
            )
          ) : (
            <span className="text-gray-600 flex items-center gap-1.5 font-medium">
              <FileCode className="size-4 text-gray-500" />
              <span>Editor Kosong — Tempel string JSON untuk memulai validasi</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-slate-700 shrink-0 text-[11px] font-mono pl-3 font-semibold">
          <span>{input.length.toLocaleString("id-ID")} Karakter</span>
          <span>•</span>
          <span>{input ? input.split("\n").length : 0} Baris</span>
        </div>
      </div>
    </div>
  )
}
