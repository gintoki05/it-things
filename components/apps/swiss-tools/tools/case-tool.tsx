"use client"

import * as React from "react"
import { Copy, Check, CaseSensitive } from "lucide-react"
import { playRetroNotificationSound } from "@/lib/sound-effects"

function getWords(str: string): string[] {
  return str
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-]+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

function toCamelCase(words: string[]): string {
  if (!words.length) return ""
  return words[0].toLowerCase() + words.slice(1).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("")
}

function toPascalCase(words: string[]): string {
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("")
}

function toSnakeCase(words: string[]): string {
  return words.map((w) => w.toLowerCase()).join("_")
}

function toKebabCase(words: string[]): string {
  return words.map((w) => w.toLowerCase()).join("-")
}

function toConstantCase(words: string[]): string {
  return words.map((w) => w.toUpperCase()).join("_")
}

function toTitleCase(words: string[]): string {
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
}

function toSentenceCase(str: string): string {
  if (!str) return ""
  const lower = str.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

export function CaseTool() {
  const [input, setInput] = React.useState("User Account Profile Settings")
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null)

  const words = React.useMemo(() => getWords(input), [input])

  const stats = React.useMemo(() => {
    const chars = input.length
    const wordCount = words.length
    const lines = input ? input.split("\n").length : 0
    const bytes = new TextEncoder().encode(input).length
    return { chars, wordCount, lines, bytes }
  }, [input, words])

  const conversions = React.useMemo(() => {
    if (!input.trim()) return []

    return [
      { id: "camel", label: "camelCase", desc: "Variabel JavaScript / TypeScript", val: toCamelCase(words) },
      { id: "pascal", label: "PascalCase", desc: "Nama Komponen React / Kelas", val: toPascalCase(words) },
      { id: "snake", label: "snake_case", desc: "Kolom Database PostgreSQL / Python", val: toSnakeCase(words) },
      { id: "kebab", label: "kebab-case", desc: "URL Slug / Nama File / CSS Class", val: toKebabCase(words) },
      { id: "constant", label: "CONSTANT_CASE", desc: "Konstanta / Environment Variable", val: toConstantCase(words) },
      { id: "title", label: "Title Case", desc: "Judul Artikel / Header", val: toTitleCase(words) },
      { id: "sentence", label: "Sentence case", desc: "Awal kalimat kapital", val: toSentenceCase(input) },
      { id: "lower", label: "lowercase", desc: "Huruf kecil semua", val: input.toLowerCase() },
      { id: "upper", label: "UPPERCASE", desc: "Huruf besar semua", val: input.toUpperCase() },
    ]
  }, [input, words])

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

  return (
    <div className="flex flex-col h-full bg-[#C0C0C0] text-black font-sans text-xs overflow-y-auto">
      {/* Top Input Area */}
      <div className="p-3 bg-[#D4D0C8] border-b-2 border-b-[#808080] space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <label className="font-bold text-[12px] text-[#000080] flex items-center gap-1.5">
            <CaseSensitive className="size-4 text-[#000080]" />
            <span>Teks Masukan:</span>
          </label>
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-800 font-semibold">
            <span>{stats.chars} Karakter</span>
            <span>•</span>
            <span>{stats.wordCount} Kata</span>
            <span>•</span>
            <span>{stats.lines} Baris</span>
            <span>•</span>
            <span>{stats.bytes} Bytes</span>
          </div>
        </div>

        <div className="bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white shadow-inner">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ketik string yang ingin Anda ubah format case-nya..."
            rows={2}
            className="w-full p-2.5 font-mono text-[13px] leading-relaxed resize-none outline-none text-[#0F172A] selection:bg-[#000080] selection:text-white font-medium"
          />
        </div>
      </div>

      {/* Conversions List */}
      <div className="p-3 space-y-2.5 flex-1">
        <div className="text-[11px] font-bold text-[#000080] uppercase tracking-wider font-mono">
          Hasil Transformasi Format Teks:
        </div>

        <div className="space-y-2">
          {conversions.map((item) => (
            <div
              key={item.id}
              className="bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white rounded-[2px] p-2.5 flex items-center justify-between gap-3 shadow-xs hover:border-[#000080] transition-colors"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#000080] text-[11px] font-mono uppercase tracking-wider">
                    {item.label}
                  </span>
                  <span className="text-[11px] text-gray-500 font-sans hidden sm:inline">
                    — {item.desc}
                  </span>
                </div>
                <div className="font-mono text-[13px] text-[#0F172A] break-all select-text font-semibold">
                  {item.val || <span className="text-gray-400 italic">(kosong)</span>}
                </div>
              </div>

              <button
                type="button"
                onClick={() => copyVal(item.val, item.id)}
                className="h-7 px-3 bg-[#C0C0C0] hover:bg-white text-[11px] font-bold text-slate-900 rounded-[2px] border border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:translate-y-px flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
              >
                {copiedKey === item.id ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3 text-gray-600" />}
                <span>{copiedKey === item.id ? "Tersalin!" : "Salin"}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
