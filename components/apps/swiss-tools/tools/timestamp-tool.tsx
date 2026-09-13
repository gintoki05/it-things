"use client"

import * as React from "react"
import { Copy, Check, Clock, Calendar, Globe2, Hourglass, ArrowRight } from "lucide-react"
import { playRetroNotificationSound } from "@/lib/sound-effects"

type TimeSubTab = "epoch" | "timezone" | "duration"

interface TimezoneItem {
  id: string
  label: string
  city: string
  tz: string
  offsetStr: string
}

const TIMEZONES: TimezoneItem[] = [
  { id: "wib", label: "WIB (Indonesia Barat)", city: "Jakarta", tz: "Asia/Jakarta", offsetStr: "UTC+7" },
  { id: "wita", label: "WITA (Indonesia Tengah)", city: "Makassar / Bali", tz: "Asia/Makassar", offsetStr: "UTC+8" },
  { id: "wit", label: "WIT (Indonesia Timur)", city: "Jayapura", tz: "Asia/Jayapura", offsetStr: "UTC+9" },
  { id: "utc", label: "UTC / GMT (Server Standard)", city: "Greenwich", tz: "UTC", offsetStr: "UTC+0" },
  { id: "sgt", label: "SGT / MYT (Singapura & Malaysia)", city: "Singapore", tz: "Asia/Singapore", offsetStr: "UTC+8" },
  { id: "jst", label: "JST (Jepang)", city: "Tokyo (AWS ap-northeast-1)", tz: "Asia/Tokyo", offsetStr: "UTC+9" },
  { id: "cet", label: "CET / CEST (Eropa Tengah)", city: "Frankfurt / Paris", tz: "Europe/Paris", offsetStr: "UTC+1 / +2" },
  { id: "gmt", label: "GMT / BST (Inggris)", city: "London", tz: "Europe/London", offsetStr: "UTC+0 / +1" },
  { id: "est", label: "EST / EDT (US East Coast)", city: "New York", tz: "America/New_York", offsetStr: "UTC-5 / -4" },
  { id: "pst", label: "PST / PDT (US West Coast)", city: "Silicon Valley / San Francisco", tz: "America/Los_Angeles", offsetStr: "UTC-8 / -7" },
]

export function TimestampTool() {
  const [activeTab, setActiveTab] = React.useState<TimeSubTab>("epoch")
  const [currentSec, setCurrentSec] = React.useState<number>(() => Math.floor(Date.now() / 1000))
  const [currentMs, setCurrentMs] = React.useState<number>(() => Date.now())
  const [epochInput, setEpochInput] = React.useState<string>(() => Math.floor(Date.now() / 1000).toString())

  // Date picker state
  const [dateInput, setDateInput] = React.useState<string>(() => {
    const d = new Date()
    const pad = (n: number) => n.toString().padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })

  // Timezone converter reference date
  const [tzRefDate, setTzRefDate] = React.useState<string>(() => {
    const d = new Date()
    const pad = (n: number) => n.toString().padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })

  // Duration Calculator state
  const [durStart, setDurStart] = React.useState<string>(() => {
    const d = new Date()
    const pad = (n: number) => n.toString().padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })
  const [durEnd, setDurEnd] = React.useState<string>(() => {
    const d = new Date(Date.now() + 86400000 * 3 + 3600000 * 5)
    const pad = (n: number) => n.toString().padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })

  // Unit converter state
  const [unitValue, setUnitValue] = React.useState<number>(3600)
  const [unitType, setUnitType] = React.useState<"ms" | "sec" | "min" | "hour" | "day">("sec")

  const [copiedKey, setCopiedKey] = React.useState<string | null>(null)

  // Realtime clock ticker
  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setCurrentMs(now)
      setCurrentSec(Math.floor(now / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const copyVal = async (val: string, key: string) => {
    try {
      await navigator.clipboard.writeText(val)
      setCopiedKey(key)
      playRetroNotificationSound(0.25)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      // ignore
    }
  }

  // Parse Epoch Input -> Dates
  const epochConverted = React.useMemo(() => {
    const raw = epochInput.trim()
    if (!raw || isNaN(Number(raw))) {
      return null
    }

    const num = Number(raw)
    const isSeconds = raw.length <= 11
    const ms = isSeconds ? num * 1000 : num

    const date = new Date(ms)
    if (isNaN(date.getTime())) {
      return null
    }

    const nowMs = currentMs
    const diffSec = Math.floor((ms - nowMs) / 1000)
    let relativeStr = ""
    const rtf = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" })
    if (Math.abs(diffSec) < 60) {
      relativeStr = rtf.format(diffSec, "second")
    } else if (Math.abs(diffSec) < 3600) {
      relativeStr = rtf.format(Math.floor(diffSec / 60), "minute")
    } else if (Math.abs(diffSec) < 86400) {
      relativeStr = rtf.format(Math.floor(diffSec / 3600), "hour")
    } else {
      relativeStr = rtf.format(Math.floor(diffSec / 86400), "day")
    }

    const wib = date.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      dateStyle: "full",
      timeStyle: "medium",
    })

    const utc = date.toUTCString()
    const iso = date.toISOString()

    return {
      wib,
      utc,
      iso,
      relativeStr,
      isSeconds,
      secVal: Math.floor(ms / 1000).toString(),
      msVal: ms.toString(),
    }
  }, [epochInput, currentMs])

  // Parse Date Input -> Epoch
  const dateConverted = React.useMemo(() => {
    if (!dateInput) return null
    const date = new Date(dateInput)
    if (isNaN(date.getTime())) return null

    const ms = date.getTime()
    const sec = Math.floor(ms / 1000)
    return {
      sec: sec.toString(),
      ms: ms.toString(),
    }
  }, [dateInput])

  // Timezone Conversions based on tzRefDate
  const tzResults = React.useMemo(() => {
    if (!tzRefDate) return []
    const d = new Date(tzRefDate)
    if (isNaN(d.getTime())) return []

    return TIMEZONES.map((item) => {
      try {
        const timeStr = d.toLocaleTimeString("id-ID", {
          timeZone: item.tz,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
        const dateStr = d.toLocaleDateString("id-ID", {
          timeZone: item.tz,
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
        return {
          ...item,
          timeStr,
          dateStr,
          fullStr: `${dateStr} ${timeStr} (${item.offsetStr})`,
        }
      } catch {
        return {
          ...item,
          timeStr: "-",
          dateStr: "-",
          fullStr: "-",
        }
      }
    })
  }, [tzRefDate])

  // Duration Difference calculation
  const durationDiff = React.useMemo(() => {
    if (!durStart || !durEnd) return null
    const start = new Date(durStart).getTime()
    const end = new Date(durEnd).getTime()
    if (isNaN(start) || isNaN(end)) return null

    const diffMs = Math.abs(end - start)
    const isPast = end < start

    const totalSeconds = Math.floor(diffMs / 1000)
    const totalMinutes = Math.floor(totalSeconds / 60)
    const totalHours = (totalMinutes / 60).toFixed(1)
    const totalDays = (totalMinutes / 1440).toFixed(2)

    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    return {
      isPast,
      readable: `${days} hari, ${hours} jam, ${minutes} menit, ${seconds} detik`,
      days,
      hours,
      minutes,
      seconds,
      totalSeconds,
      totalMinutes,
      totalHours,
      totalDays,
    }
  }, [durStart, durEnd])

  // Unit Conversion
  const convertedUnits = React.useMemo(() => {
    let baseMs = 0
    switch (unitType) {
      case "ms":
        baseMs = unitValue
        break
      case "sec":
        baseMs = unitValue * 1000
        break
      case "min":
        baseMs = unitValue * 60000
        break
      case "hour":
        baseMs = unitValue * 3600000
        break
      case "day":
        baseMs = unitValue * 86400000
        break
    }

    return {
      ms: baseMs,
      sec: baseMs / 1000,
      min: (baseMs / 60000).toFixed(2),
      hour: (baseMs / 3600000).toFixed(3),
      day: (baseMs / 86400000).toFixed(4),
    }
  }, [unitValue, unitType])

  return (
    <div className="flex flex-col h-full bg-[#C0C0C0] text-black font-sans text-xs overflow-y-auto">
      {/* Top Realtime Clock Bar */}
      <div className="p-3 bg-[#D4D0C8] border-b-2 border-b-[#808080] flex items-center justify-between flex-wrap gap-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <Clock className="size-4 text-[#000080] animate-pulse" />
          <span className="font-bold text-[12px] text-[#000080]">Waktu Epoch Live:</span>
          <span className="bg-white px-2.5 py-0.5 border border-t-[#808080] border-l-[#808080] border-r-white border-b-white rounded-[2px] font-mono font-bold text-[13px] text-[#0F172A] shadow-inner">
            {currentSec}
          </span>
          <span className="text-[11px] text-gray-600 font-mono">({currentMs} ms)</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => copyVal(currentSec.toString(), "currentSec")}
            className="h-6 px-2.5 bg-[#C0C0C0] hover:bg-white text-[11px] font-semibold text-slate-900 rounded-[2px] border border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:translate-y-px flex items-center gap-1 cursor-pointer"
          >
            {copiedKey === "currentSec" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3 text-gray-700" />}
            <span>Salin Detik</span>
          </button>
          <button
            type="button"
            onClick={() => copyVal(currentMs.toString(), "currentMs")}
            className="h-6 px-2.5 bg-[#C0C0C0] hover:bg-white text-[11px] font-semibold text-slate-900 rounded-[2px] border border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:translate-y-px flex items-center gap-1 cursor-pointer"
          >
            {copiedKey === "currentMs" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3 text-gray-700" />}
            <span>Salin Ms</span>
          </button>
        </div>
      </div>

      {/* Retro Property Sheet Tabs */}
      <div className="px-3 pt-2 bg-[#D4D0C8] border-b-2 border-b-[#808080] flex items-end gap-1 shrink-0 font-sans">
        <button
          type="button"
          onClick={() => setActiveTab("epoch")}
          className={`px-3 py-1.5 rounded-t-[3px] font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-all border-t-2 border-l-2 border-r-2 ${
            activeTab === "epoch"
              ? "bg-[#C0C0C0] text-black border-t-white border-l-white border-r-[#404040] shadow -mb-[2px] z-10"
              : "bg-[#D4D0C8] text-gray-600 border-t-white/60 border-l-white/60 border-r-[#808080] hover:bg-[#ECE9D8]"
          }`}
        >
          <Clock className="size-3.5" />
          <span>Epoch & Tanggal</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("timezone")}
          className={`px-3 py-1.5 rounded-t-[3px] font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-all border-t-2 border-l-2 border-r-2 ${
            activeTab === "timezone"
              ? "bg-[#C0C0C0] text-black border-t-white border-l-white border-r-[#404040] shadow -mb-[2px] z-10"
              : "bg-[#D4D0C8] text-gray-600 border-t-white/60 border-l-white/60 border-r-[#808080] hover:bg-[#ECE9D8]"
          }`}
        >
          <Globe2 className="size-3.5" />
          <span>Zona Waktu Dunia (World Clock)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("duration")}
          className={`px-3 py-1.5 rounded-t-[3px] font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-all border-t-2 border-l-2 border-r-2 ${
            activeTab === "duration"
              ? "bg-[#C0C0C0] text-black border-t-white border-l-white border-r-[#404040] shadow -mb-[2px] z-10"
              : "bg-[#D4D0C8] text-gray-600 border-t-white/60 border-l-white/60 border-r-[#808080] hover:bg-[#ECE9D8]"
          }`}
        >
          <Hourglass className="size-3.5" />
          <span>Kalkulator Durasi</span>
        </button>
      </div>

      {/* Tab 1: Epoch & Timestamp */}
      {activeTab === "epoch" && (
        <div className="p-3 space-y-4 flex-1">
          {/* Section 1: Epoch -> Date */}
          <div className="bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white shadow-xs p-3.5 space-y-3 rounded-[2px]">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-[12px] text-[#000080] flex items-center gap-1.5">
                <Calendar className="size-4" />
                <span>1. Konversi Unix Timestamp &rarr; Tanggal Terbaca</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEpochInput(currentSec.toString())}
                  className="h-6 px-2.5 bg-[#C0C0C0] hover:bg-white text-[11px] font-semibold text-slate-900 rounded-[2px] border border-t-white border-l-white border-r-[#808080] border-b-[#808080] cursor-pointer"
                >
                  Pakai Sekarang
                </button>
                <button
                  type="button"
                  onClick={() => setEpochInput((currentSec + 3600).toString())}
                  className="h-6 px-2 bg-[#C0C0C0] hover:bg-white text-[11px] font-semibold text-slate-900 rounded-[2px] border border-t-white border-l-white border-r-[#808080] border-b-[#808080] cursor-pointer"
                >
                  +1 Jam
                </button>
                <button
                  type="button"
                  onClick={() => setEpochInput((currentSec + 86400).toString())}
                  className="h-6 px-2 bg-[#C0C0C0] hover:bg-white text-[11px] font-semibold text-slate-900 rounded-[2px] border border-t-white border-l-white border-r-[#808080] border-b-[#808080] cursor-pointer"
                >
                  +1 Hari
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={epochInput}
                onChange={(e) => setEpochInput(e.target.value)}
                placeholder="Masukkan angka timestamp detik (contoh: 1773418700)..."
                className="flex-1 h-8 px-2.5 bg-[#F8FAFC] border border-t-[#808080] border-l-[#808080] border-r-white border-b-white rounded-[2px] font-mono text-[13px] outline-none text-[#0F172A] shadow-inner font-semibold"
              />
            </div>

            {epochConverted && (
              <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[2px] space-y-2 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-semibold">Waktu Lokal (WIB / GMT+7):</span>
                  <span className="font-bold text-[#0F172A] select-text text-[13px]">{epochConverted.wib}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-semibold">UTC (GMT):</span>
                  <span className="font-mono text-[#000080] font-bold select-text">{epochConverted.utc}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-semibold">ISO 8601:</span>
                  <span className="font-mono text-emerald-800 font-bold select-text">{epochConverted.iso}</span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-200">
                  <span className="text-gray-600 font-semibold">Status Relatif:</span>
                  <span className="font-bold text-indigo-700">{epochConverted.relativeStr}</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Date -> Epoch */}
          <div className="bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white shadow-xs p-3.5 space-y-3 rounded-[2px]">
            <div className="font-bold text-[12px] text-[#000080] flex items-center gap-1.5">
              <Clock className="size-4" />
              <span>2. Konversi Tanggal &rarr; Unix Timestamp (Epoch)</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="h-8 px-2.5 bg-[#F8FAFC] border border-t-[#808080] border-l-[#808080] border-r-white border-b-white rounded-[2px] font-mono text-[13px] outline-none cursor-pointer text-[#0F172A] shadow-inner font-semibold"
              />
            </div>

            {dateConverted && (
              <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[2px] space-y-2 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-semibold">Unix Detik (Seconds):</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#000080] text-[13px] select-text">{dateConverted.sec}</span>
                    <button
                      type="button"
                      onClick={() => copyVal(dateConverted.sec, "dateSec")}
                      className="h-6 px-2 bg-[#C0C0C0] hover:bg-white text-[10px] font-bold rounded-[2px] border border-t-white border-l-white border-r-[#808080] border-b-[#808080] cursor-pointer"
                    >
                      {copiedKey === "dateSec" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3 text-gray-700" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-semibold">Unix Milidetik (Milliseconds):</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#000080] text-[13px] select-text">{dateConverted.ms}</span>
                    <button
                      type="button"
                      onClick={() => copyVal(dateConverted.ms, "dateMs")}
                      className="h-6 px-2 bg-[#C0C0C0] hover:bg-white text-[10px] font-bold rounded-[2px] border border-t-white border-l-white border-r-[#808080] border-b-[#808080] cursor-pointer"
                    >
                      {copiedKey === "dateMs" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3 text-gray-700" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Timezone Converter */}
      {activeTab === "timezone" && (
        <div className="p-3 space-y-3 flex-1">
          {/* Reference Time Picker */}
          <div className="p-3 bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white rounded-[2px] flex items-center justify-between flex-wrap gap-2.5 shadow-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-bold text-[12px] text-[#000080]">Waktu Acuan yang Dikonversi:</span>
              <input
                type="datetime-local"
                value={tzRefDate}
                onChange={(e) => setTzRefDate(e.target.value)}
                className="h-8 px-2.5 bg-[#F8FAFC] border border-t-[#808080] border-l-[#808080] border-r-white border-b-white rounded-[2px] font-mono text-[13px] outline-none cursor-pointer text-[#0F172A] shadow-inner font-semibold"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const d = new Date()
                const pad = (n: number) => n.toString().padStart(2, "0")
                setTzRefDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`)
                playRetroNotificationSound(0.15)
              }}
              className="h-7 px-3 bg-[#000080] hover:bg-[#102A45] text-white font-bold text-[11px] rounded-[2px] border border-white/40 shadow flex items-center gap-1.5 cursor-pointer"
            >
              <Clock className="size-3.5 text-[#FFD700]" />
              <span>Reset ke Jam Sekarang</span>
            </button>
          </div>

          {/* Timezone Comparison ListView Table */}
          <div className="bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white rounded-[2px] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans text-[12px]">
                <thead>
                  <tr className="bg-[#D4D0C8] border-b-2 border-b-[#808080] text-black select-none">
                    <th className="p-2 border-r border-[#808080] font-bold text-[11px]">ZONA WAKTU</th>
                    <th className="p-2 border-r border-[#808080] font-bold text-[11px]">KOTA / WILAYAH</th>
                    <th className="p-2 border-r border-[#808080] font-bold text-[11px]">JAM & TANGGAL KONVERSI</th>
                    <th className="p-2 border-r border-[#808080] font-bold text-[11px]">OFFSET</th>
                    <th className="p-2 font-bold text-[11px] text-center w-24">AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {tzResults.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`border-b border-slate-200 hover:bg-blue-50/80 transition-colors ${
                        idx % 2 === 1 ? "bg-[#F8FAFC]" : "bg-white"
                      }`}
                    >
                      <td className="p-2 border-r border-slate-200 font-bold text-[#000080] text-[12px]">
                        {item.label}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-gray-700 text-[11px]">
                        {item.city}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-mono text-[13px] font-bold text-[#0F172A] select-text">
                        <span>{item.timeStr}</span>
                        <span className="text-gray-600 font-normal text-[11px] ml-2">({item.dateStr})</span>
                      </td>
                      <td className="p-2 border-r border-slate-200 font-mono font-bold text-[11px] text-slate-800">
                        <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded-[2px]">
                          {item.offsetStr}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => copyVal(item.fullStr, item.id)}
                          className="h-6 px-2.5 bg-[#C0C0C0] hover:bg-white text-slate-900 text-[10px] font-bold rounded-[2px] border border-t-white border-l-white border-r-[#808080] border-b-[#808080] active:translate-y-px inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          {copiedKey === item.id ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3 text-gray-600" />}
                          <span>{copiedKey === item.id ? "Tersalin!" : "Salin"}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Duration & Time Difference Calculator */}
      {activeTab === "duration" && (
        <div className="p-3 space-y-4 flex-1">
          {/* Difference between 2 dates */}
          <div className="bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white shadow-xs p-3.5 space-y-3 rounded-[2px]">
            <div className="font-bold text-[12px] text-[#000080] flex items-center gap-1.5">
              <Hourglass className="size-4" />
              <span>Hitung Selisih Dua Waktu (Tanggal A &rarr; Tanggal B):</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-700">Waktu Awal (Start):</span>
                <input
                  type="datetime-local"
                  value={durStart}
                  onChange={(e) => setDurStart(e.target.value)}
                  className="w-full h-8 px-2.5 bg-[#F8FAFC] border border-t-[#808080] border-l-[#808080] border-r-white border-b-white rounded-[2px] font-mono text-[13px] outline-none cursor-pointer text-[#0F172A] shadow-inner font-semibold"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-700">Waktu Akhir (End):</span>
                <input
                  type="datetime-local"
                  value={durEnd}
                  onChange={(e) => setDurEnd(e.target.value)}
                  className="w-full h-8 px-2.5 bg-[#F8FAFC] border border-t-[#808080] border-l-[#808080] border-r-white border-b-white rounded-[2px] font-mono text-[13px] outline-none cursor-pointer text-[#0F172A] shadow-inner font-semibold"
                />
              </div>
            </div>

            {durationDiff && (
              <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[2px] space-y-2.5 text-[12px]">
                <div className="font-bold text-[14px] text-[#000080] select-text flex items-center gap-2 font-mono">
                  <ArrowRight className="size-5 text-[#000080] shrink-0" />
                  <span>{durationDiff.readable}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200 text-[11px]">
                  <div className="p-2 bg-white border border-slate-200 rounded-[2px]">
                    <span className="text-gray-500 font-semibold">Total Hari:</span>
                    <div className="font-bold font-mono text-slate-900 text-[13px]">{durationDiff.totalDays} hari</div>
                  </div>
                  <div className="p-2 bg-white border border-slate-200 rounded-[2px]">
                    <span className="text-gray-500 font-semibold">Total Jam:</span>
                    <div className="font-bold font-mono text-slate-900 text-[13px]">{durationDiff.totalHours} jam</div>
                  </div>
                  <div className="p-2 bg-white border border-slate-200 rounded-[2px]">
                    <span className="text-gray-500 font-semibold">Total Menit:</span>
                    <div className="font-bold font-mono text-slate-900 text-[13px]">{durationDiff.totalMinutes.toLocaleString("id-ID")} m</div>
                  </div>
                  <div className="p-2 bg-white border border-slate-200 rounded-[2px]">
                    <span className="text-gray-500 font-semibold">Total Detik:</span>
                    <div className="font-bold font-mono text-slate-900 text-[13px]">{durationDiff.totalSeconds.toLocaleString("id-ID")} s</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Unit Converter */}
          <div className="bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white shadow-xs p-3.5 space-y-3 rounded-[2px]">
            <div className="font-bold text-[12px] text-[#000080] flex items-center gap-1.5">
              <Clock className="size-4" />
              <span>Konversi Satuan Durasi Waktu:</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={unitValue}
                onChange={(e) => setUnitValue(parseFloat(e.target.value) || 0)}
                className="w-36 h-8 px-2.5 bg-[#F8FAFC] border border-t-[#808080] border-l-[#808080] border-r-white border-b-white rounded-[2px] font-mono text-[13px] outline-none text-[#0F172A] shadow-inner font-semibold"
              />
              <select
                value={unitType}
                onChange={(e) => setUnitType(e.target.value as "ms" | "sec" | "min" | "hour" | "day")}
                className="h-8 px-2.5 bg-white border border-[#808080] rounded-[2px] font-sans text-[12px] cursor-pointer text-slate-900 font-semibold"
              >
                <option value="ms">Milidetik (ms)</option>
                <option value="sec">Detik (s)</option>
                <option value="min">Menit (m)</option>
                <option value="hour">Jam (h)</option>
                <option value="day">Hari (d)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1 text-[12px]">
              <div className="p-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[2px]">
                <div className="text-[10px] text-gray-500 font-bold uppercase">Milidetik:</div>
                <div className="font-bold font-mono text-slate-900 text-[13px] select-text">{convertedUnits.ms.toLocaleString("id-ID")} ms</div>
              </div>
              <div className="p-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[2px]">
                <div className="text-[10px] text-gray-500 font-bold uppercase">Detik:</div>
                <div className="font-bold font-mono text-slate-900 text-[13px] select-text">{convertedUnits.sec.toLocaleString("id-ID")} s</div>
              </div>
              <div className="p-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[2px]">
                <div className="text-[10px] text-gray-500 font-bold uppercase">Menit:</div>
                <div className="font-bold font-mono text-slate-900 text-[13px] select-text">{convertedUnits.min} m</div>
              </div>
              <div className="p-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[2px]">
                <div className="text-[10px] text-gray-500 font-bold uppercase">Jam:</div>
                <div className="font-bold font-mono text-slate-900 text-[13px] select-text">{convertedUnits.hour} h</div>
              </div>
              <div className="p-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[2px]">
                <div className="text-[10px] text-gray-500 font-bold uppercase">Hari:</div>
                <div className="font-bold font-mono text-slate-900 text-[13px] select-text">{convertedUnits.day} d</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
