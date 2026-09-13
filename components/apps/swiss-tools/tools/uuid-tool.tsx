"use client"

import * as React from "react"
import { Copy, Check, RotateCw, ListOrdered, Sparkles } from "lucide-react"
import { generateUuids, generateNanoIds } from "../crypto-utils"
import { playRetroNotificationSound } from "@/lib/sound-effects"

type GeneratorType = "uuid" | "nanoid" | "alphanumeric"

export function UuidTool() {
  const [type, setType] = React.useState<GeneratorType>("uuid")
  const [count, setCount] = React.useState(5)
  const [uppercase, setUppercase] = React.useState(false)
  const [noHyphens, setNoHyphens] = React.useState(false)
  const [length, setLength] = React.useState(21)
  const [results, setResults] = React.useState<string[]>(() => generateUuids(5))
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null)
  const [isCopiedAll, setIsCopiedAll] = React.useState(false)

  const handleGenerate = React.useCallback(() => {
    let list: string[] = []
    if (type === "uuid") {
      list = generateUuids(count, { uppercase, noHyphens })
    } else if (type === "nanoid") {
      list = generateNanoIds(count, length)
      if (uppercase) list = list.map((s) => s.toUpperCase())
    } else {
      list = generateNanoIds(count, length).map((s) => s.replace(/[^a-zA-Z0-9]/g, "x"))
      if (uppercase) list = list.map((s) => s.toUpperCase())
    }
    setResults(list)
    playRetroNotificationSound(0.15)
  }, [type, count, uppercase, noHyphens, length])

  const handleCopyOne = async (val: string, index: number) => {
    try {
      await navigator.clipboard.writeText(val)
      setCopiedIndex(index)
      playRetroNotificationSound(0.2)
      setTimeout(() => setCopiedIndex(null), 1500)
    } catch {
      // ignore
    }
  }

  const handleCopyAll = async (asJson = false) => {
    if (!results.length) return
    try {
      const text = asJson ? JSON.stringify(results, null, 2) : results.join("\n")
      await navigator.clipboard.writeText(text)
      setIsCopiedAll(true)
      playRetroNotificationSound(0.25)
      setTimeout(() => setIsCopiedAll(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#C0C0C0] text-black font-sans text-xs overflow-y-auto">
      {/* Settings Toolbar */}
      <div className="p-3 bg-[#D4D0C8] border-b-2 border-b-[#808080] space-y-2.5 shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[11px] text-[#000080]">Format ID:</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as GeneratorType)}
              className="h-7 px-2 bg-white border border-t-[#808080] border-l-[#808080] border-r-white border-b-white rounded-[2px] text-[11px] font-sans cursor-pointer text-slate-900"
            >
              <option value="uuid">UUID v4 (RFC 4122 Standard)</option>
              <option value="nanoid">NanoID (Compact & URL Safe)</option>
              <option value="alphanumeric">Alphanumeric Token</option>
            </select>

            <span className="font-bold text-[11px] text-[#000080] ml-2">Jumlah:</span>
            <select
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value, 10))}
              className="h-7 px-2 bg-white border border-t-[#808080] border-l-[#808080] border-r-white border-b-white rounded-[2px] text-[11px] font-sans cursor-pointer text-slate-900"
            >
              <option value={1}>1 ID</option>
              <option value={5}>5 ID</option>
              <option value={10}>10 ID</option>
              <option value={25}>25 ID</option>
              <option value={50}>50 ID</option>
            </select>

            {type !== "uuid" && (
              <div className="flex items-center gap-1.5 ml-2">
                <span className="font-bold text-[11px] text-[#000080]">Panjang:</span>
                <input
                  type="number"
                  min={6}
                  max={64}
                  value={length}
                  onChange={(e) => setLength(parseInt(e.target.value, 10) || 16)}
                  className="w-16 h-7 px-2 bg-white border border-t-[#808080] border-l-[#808080] border-r-white border-b-white rounded-[2px] text-[11px] font-mono text-slate-900"
                />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            className="h-7 px-3 bg-[#000080] hover:bg-[#102A45] text-white font-bold text-[11px] rounded-[2px] border border-white/40 shadow flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw className="size-3.5 text-[#FFD700]" />
            <span>Generate Baru</span>
          </button>
        </div>

        {/* Checkbox Options */}
        <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-800 pt-0.5 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={uppercase}
              onChange={(e) => setUppercase(e.target.checked)}
              className="cursor-pointer"
            />
            <span>Huruf Kapital (UPPERCASE)</span>
          </label>

          {type === "uuid" && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={noHyphens}
                onChange={(e) => setNoHyphens(e.target.checked)}
                className="cursor-pointer"
              />
              <span>Tanpa Hyphen / Strip (32 Karakter Hex Murni)</span>
            </label>
          )}
        </div>
      </div>

      {/* Results Header */}
      <div className="px-3 py-1.5 bg-[#ECE9D8] border-b border-[#808080] flex items-center justify-between text-[11px] shrink-0 font-sans">
        <div className="flex items-center gap-1.5 font-bold text-[#000080]">
          <Sparkles className="size-3.5 text-[#000080]" />
          <span>Hasil Generator ({results.length} ID):</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleCopyAll(false)}
            className="h-6 px-2.5 bg-[#C0C0C0] hover:bg-white text-slate-900 text-[11px] font-bold rounded-[2px] border border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:translate-y-px flex items-center gap-1.5 cursor-pointer"
          >
            {isCopiedAll ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3 text-gray-700" />}
            <span>Salin Semua (List)</span>
          </button>
          <button
            type="button"
            onClick={() => handleCopyAll(true)}
            className="h-6 px-2.5 bg-[#C0C0C0] hover:bg-white text-slate-900 text-[11px] font-bold rounded-[2px] border border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:translate-y-px flex items-center gap-1.5 cursor-pointer"
          >
            <ListOrdered className="size-3 text-gray-700" />
            <span>Format JSON Array</span>
          </button>
        </div>
      </div>

      {/* Results List */}
      <div className="p-3 space-y-1.5 flex-1">
        {results.map((id, index) => (
          <div
            key={index}
            className="bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white rounded-[2px] px-3 py-2 flex items-center justify-between gap-3 shadow-xs hover:border-[#000080] transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="text-[11px] font-mono font-bold text-gray-500 w-6 shrink-0 text-right">
                {index + 1}.
              </span>
              <span className="font-mono text-[13px] text-[#0F172A] break-all select-text font-semibold tracking-wide">
                {id}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleCopyOne(id, index)}
              className="h-6 px-2.5 bg-[#C0C0C0] hover:bg-white text-[11px] font-bold rounded-[2px] border border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:translate-y-px flex items-center gap-1 shrink-0 cursor-pointer text-slate-900 shadow-2xs"
            >
              {copiedIndex === index ? (
                <Check className="size-3 text-emerald-600" />
              ) : (
                <Copy className="size-3 text-gray-600" />
              )}
              <span>{copiedIndex === index ? "Tersalin!" : "Salin"}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
