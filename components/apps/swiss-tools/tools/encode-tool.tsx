"use client"

import * as React from "react"
import { Copy, Check, ArrowDownUp, Binary, Globe, Code2 } from "lucide-react"
import { playRetroNotificationSound } from "@/lib/sound-effects"

type Mode = "base64" | "url" | "html"
type Direction = "encode" | "decode"

function utf8ToBase64(str: string, urlSafe = false): string {
  try {
    const bytes = new TextEncoder().encode(str)
    let binary = ""
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    let b64 = btoa(binary)
    if (urlSafe) {
      b64 = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
    }
    return b64
  } catch {
    return ""
  }
}

function base64ToUtf8(str: string): string {
  try {
    let b64 = str.replace(/-/g, "+").replace(/_/g, "/")
    while (b64.length % 4) {
      b64 += "="
    }
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new TextDecoder().decode(bytes)
  } catch {
    return "Error: String input bukan format Base64 yang valid"
  }
}

export function EncodeTool() {
  const [mode, setMode] = React.useState<Mode>("base64")
  const [direction, setDirection] = React.useState<Direction>("encode")
  const [input, setInput] = React.useState("IT-Things: Portal Utilitas Tim 🚀")
  const [urlSafe, setUrlSafe] = React.useState(false)
  const [isCopied, setIsCopied] = React.useState(false)

  const output = React.useMemo(() => {
    if (!input) return ""

    if (mode === "base64") {
      return direction === "encode" ? utf8ToBase64(input, urlSafe) : base64ToUtf8(input)
    }

    if (mode === "url") {
      try {
        return direction === "encode" ? encodeURIComponent(input) : decodeURIComponent(input)
      } catch {
        return "Error: Format URI encoded tidak valid"
      }
    }

    if (mode === "html") {
      if (direction === "encode") {
        return input
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;")
      } else {
        const doc = new DOMParser().parseFromString(input, "text/html")
        return doc.documentElement.textContent || ""
      }
    }

    return ""
  }, [input, mode, direction, urlSafe])

  const handleSwap = () => {
    if (!output || output.startsWith("Error:")) return
    setInput(output)
    setDirection(direction === "encode" ? "decode" : "encode")
    playRetroNotificationSound(0.2)
  }

  const handleCopy = async () => {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setIsCopied(true)
      playRetroNotificationSound(0.25)
      setTimeout(() => setIsCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#C0C0C0] text-black font-sans text-xs overflow-y-auto">
      {/* Sub Mode Tabs */}
      <div className="p-2 bg-[#D4D0C8] border-b-2 border-b-[#808080] flex items-center justify-between gap-2 flex-wrap shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMode("base64")}
            className={`h-7 px-3 rounded-[2px] font-bold text-[11px] border-2 flex items-center gap-1.5 cursor-pointer ${
              mode === "base64"
                ? "bg-[#000080] text-white border-white/40 shadow-xs"
                : "bg-[#C0C0C0] text-slate-900 border-t-white border-l-white border-r-[#808080] border-b-[#808080] hover:bg-white"
            }`}
          >
            <Binary className="size-3.5" />
            <span>Base64</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`h-7 px-3 rounded-[2px] font-bold text-[11px] border-2 flex items-center gap-1.5 cursor-pointer ${
              mode === "url"
                ? "bg-[#000080] text-white border-white/40 shadow-xs"
                : "bg-[#C0C0C0] text-slate-900 border-t-white border-l-white border-r-[#808080] border-b-[#808080] hover:bg-white"
            }`}
          >
            <Globe className="size-3.5" />
            <span>URL Encode</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("html")}
            className={`h-7 px-3 rounded-[2px] font-bold text-[11px] border-2 flex items-center gap-1.5 cursor-pointer ${
              mode === "html"
                ? "bg-[#000080] text-white border-white/40 shadow-xs"
                : "bg-[#C0C0C0] text-slate-900 border-t-white border-l-white border-r-[#808080] border-b-[#808080] hover:bg-white"
            }`}
          >
            <Code2 className="size-3.5" />
            <span>HTML Entities</span>
          </button>
        </div>

        {/* Direction Switcher */}
        <div className="flex items-center gap-1 bg-[#808080] p-1 rounded-[2px] border border-black shadow-inner">
          <button
            type="button"
            onClick={() => setDirection("encode")}
            className={`h-5 px-2.5 text-[11px] font-mono font-bold rounded-[2px] cursor-pointer ${
              direction === "encode"
                ? "bg-[#000080] text-white shadow border border-white/50"
                : "text-slate-200 hover:text-white"
            }`}
          >
            ENCODE
          </button>
          <button
            type="button"
            onClick={() => setDirection("decode")}
            className={`h-5 px-2.5 text-[11px] font-mono font-bold rounded-[2px] cursor-pointer ${
              direction === "decode"
                ? "bg-[#000080] text-white shadow border border-white/50"
                : "text-slate-200 hover:text-white"
            }`}
          >
            DECODE
          </button>
        </div>
      </div>

      {/* Options Row */}
      {mode === "base64" && (
        <div className="px-3 py-1.5 bg-[#ECE9D8] border-b border-[#808080] flex items-center gap-3 text-[11px]">
          <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-900">
            <input
              type="checkbox"
              checked={urlSafe}
              onChange={(e) => setUrlSafe(e.target.checked)}
              className="cursor-pointer"
            />
            <span>Mode URL-Safe Base64 (ubah &apos;+&apos; jadi &apos;-&apos;, &apos;/&apos; jadi &apos;_&apos;, tanpa padding &apos;=&apos;)</span>
          </label>
        </div>
      )}

      {/* Input & Output Stack */}
      <div className="p-3 space-y-3 flex-1 flex flex-col">
        {/* Input Box */}
        <div className="space-y-1 flex-1 flex flex-col min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[12px] text-[#000080]">
              Teks Masukan ({direction === "encode" ? "String Asli" : "String Ter-encode"}):
            </span>
            <button
              type="button"
              onClick={() => setInput("")}
              disabled={!input}
              className="h-6 px-2.5 bg-[#C0C0C0] hover:bg-rose-100 text-rose-900 text-[10px] font-semibold disabled:opacity-40 border border-t-white border-l-white border-r-[#808080] border-b-[#808080] rounded-[2px] cursor-pointer"
            >
              Hapus
            </button>
          </div>
          <div className="bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white shadow-inner flex-1 flex flex-col">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ketik atau tempel teks di sini..."
              className="w-full h-full p-2.5 font-mono text-[13px] leading-relaxed resize-none outline-none text-[#0F172A] selection:bg-[#000080] selection:text-white"
            />
          </div>
        </div>

        {/* Middle Swap Button */}
        <div className="flex items-center justify-center shrink-0">
          <button
            type="button"
            onClick={handleSwap}
            disabled={!output || output.startsWith("Error:")}
            className="h-7 px-4 bg-[#C0C0C0] hover:bg-white disabled:opacity-40 text-slate-950 font-bold text-[11px] rounded-[2px] border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] active:border-t-[#404040] active:border-l-[#404040] active:border-r-white active:border-b-white shadow flex items-center gap-2 cursor-pointer"
          >
            <ArrowDownUp className="size-3.5 text-[#000080]" />
            <span>Tukar Input & Output</span>
          </button>
        </div>

        {/* Output Box */}
        <div className="space-y-1 flex-1 flex flex-col min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[12px] text-[#000080]">
              Hasil ({direction === "encode" ? "Encoded" : "Decoded"}):
            </span>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!output}
              className="h-6 px-3 bg-[#000080] hover:bg-[#102A45] disabled:opacity-40 text-white font-bold text-[11px] rounded-[2px] border border-white/40 shadow flex items-center gap-1.5 cursor-pointer"
            >
              {isCopied ? <Check className="size-3 text-[#FFD700]" /> : <Copy className="size-3" />}
              <span>{isCopied ? "Tersalin!" : "Salin Hasil"}</span>
            </button>
          </div>
          <div className="bg-[#F8FAFC] border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white shadow-inner flex-1 flex flex-col p-3 overflow-y-auto">
            <div className="font-mono text-[13px] leading-relaxed text-[#0F172A] break-all select-text whitespace-pre-wrap font-medium">
              {output || <span className="text-gray-400 italic">(Hasil konversi akan muncul di sini)</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
