"use client"

import * as React from "react"
import { useClippy } from "@/lib/clippy-store"
import { INDONESIA_CITIES, CityLocation } from "@/lib/prayer-times"
import { ADZAN_SOUND_OPTIONS } from "@/lib/sound-effects"
import {
  X,
  Clock,
  MapPin,
  Settings,
  Volume2,
  VolumeX,
  Check,
  Search,
  Sparkles,
  Info,
  Play,
  Square,
  Sun,
  Sunset,
  Sunrise,
  Moon,
} from "lucide-react"

export function SholatDialog() {
  const {
    isPrayerDialogOpen,
    closePrayerDialog,
    schedule,
    nextPrayer,
    selectedCity,
    setSelectedCityId,
    enabled,
    setEnabled,
    soundEnabled,
    setSoundEnabled,
    adzanSound,
    setAdzanSound,
    playAdzanTest,
    stopAdzanTest,
    playingSoundId,
    reminder10Min,
    setReminder10Min,
  } = useClippy()

  const [activeTab, setActiveTab] = React.useState<"jadwal" | "kota" | "settings">("jadwal")
  const [searchQuery, setSearchQuery] = React.useState<string>("")
  const [digitalTime, setDigitalTime] = React.useState<string>("")

  // Realtime clock ticker
  React.useEffect(() => {
    const update = () => {
      const now = new Date()
      const h = String(now.getHours()).padStart(2, "0")
      const m = String(now.getMinutes()).padStart(2, "0")
      const s = String(now.getSeconds()).padStart(2, "0")
      setDigitalTime(`${h}:${m}:${s}`)
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  // Filter kota
  const filteredCities = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return INDONESIA_CITIES
    return INDONESIA_CITIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.province.toLowerCase().includes(q)
    )
  }, [searchQuery])

  if (!isPrayerDialogOpen) return null

  const prayerItems: {
    key: string
    label: string
    time: string
    icon: React.ReactNode
    isNext: boolean
    badge?: string
  }[] = [
    { key: "imsak", label: "Imsak", time: schedule.imsak, icon: <Moon className="size-3.5 text-indigo-700" />, isNext: nextPrayer.name === "Imsak" },
    { key: "subuh", label: "Subuh", time: schedule.subuh, icon: <Sunrise className="size-3.5 text-blue-700" />, isNext: nextPrayer.name === "Subuh", badge: "Fardhu" },
    { key: "terbit", label: "Terbit", time: schedule.terbit, icon: <Sun className="size-3.5 text-amber-600" />, isNext: nextPrayer.name === "Terbit", badge: "Syuruq" },
    { key: "dhuha", label: "Dhuha", time: schedule.dhuha, icon: <Sun className="size-3.5 text-amber-500" />, isNext: nextPrayer.name === "Dhuha", badge: "Sunnah" },
    { key: "dzuhur", label: "Dzuhur", time: schedule.dzuhur, icon: <Sun className="size-3.5 text-yellow-600" />, isNext: nextPrayer.name === "Dzuhur", badge: "Fardhu" },
    { key: "ashar", label: "Ashar", time: schedule.ashar, icon: <Sun className="size-3.5 text-orange-600" />, isNext: nextPrayer.name === "Ashar", badge: "Fardhu" },
    { key: "maghrib", label: "Maghrib", time: schedule.maghrib, icon: <Sunset className="size-3.5 text-rose-600" />, isNext: nextPrayer.name === "Maghrib", badge: "Fardhu" },
    { key: "isya", label: "Isya", time: schedule.isya, icon: <Moon className="size-3.5 text-purple-700" />, isNext: nextPrayer.name === "Isya", badge: "Fardhu" },
  ]

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-3 select-none animate-in fade-in duration-150"
      onClick={closePrayerDialog}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sholat-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="retro-window-frame w-[95vw] sm:w-[540px] max-w-[95vw] max-h-[92dvh] rounded-[3px] overflow-hidden shadow-[6px_6px_0px_rgba(0,0,0,0.4)] bg-[#D4D0C8] flex flex-col border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040]"
      >
        {/* Title Bar */}
        <div className="bg-gradient-to-r from-[#102A45] via-[#1E4E8C] to-[#2E6FB5] px-2.5 py-1.5 flex items-center justify-between font-mono text-xs font-bold text-white shadow-inner shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <span>🕌</span>
            <span id="sholat-dialog-title" className="truncate">
              JADWAL_SHOLAT.EXE — Kemenag RI Hisab 98
            </span>
          </div>
          <button
            type="button"
            onClick={closePrayerDialog}
            className="hover:bg-red-600 hover:text-white px-1.5 py-0.5 rounded-[2px] transition-colors leading-none cursor-pointer shrink-0 ml-2"
            title="Tutup (Esc)"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-2 pt-2 bg-[#D4D0C8] border-b-2 border-[#808080] flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("jadwal")}
            className={`px-3 py-1 text-xs font-bold font-sans rounded-t-[2px] border-t-2 border-l-2 border-r-2 cursor-pointer transition-colors ${
              activeTab === "jadwal"
                ? "bg-[#D4D0C8] border-t-white border-l-white border-r-[#404040] translate-y-px text-[#102A45] pb-1.5"
                : "bg-[#C0C0C0] border-t-white/80 border-l-white/80 border-r-[#808080] text-gray-700 hover:bg-[#D4D0C8]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              <span>Jadwal Hari Ini</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("kota")}
            className={`px-3 py-1 text-xs font-bold font-sans rounded-t-[2px] border-t-2 border-l-2 border-r-2 cursor-pointer transition-colors ${
              activeTab === "kota"
                ? "bg-[#D4D0C8] border-t-white border-l-white border-r-[#404040] translate-y-px text-[#102A45] pb-1.5"
                : "bg-[#C0C0C0] border-t-white/80 border-l-white/80 border-r-[#808080] text-gray-700 hover:bg-[#D4D0C8]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              <span>Pilih Kota ({selectedCity.name})</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`px-3 py-1 text-xs font-bold font-sans rounded-t-[2px] border-t-2 border-l-2 border-r-2 cursor-pointer transition-colors ${
              activeTab === "settings"
                ? "bg-[#D4D0C8] border-t-white border-l-white border-r-[#404040] translate-y-px text-[#102A45] pb-1.5"
                : "bg-[#C0C0C0] border-t-white/80 border-l-white/80 border-r-[#808080] text-gray-700 hover:bg-[#D4D0C8]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Settings className="size-3.5" />
              <span>Pengaturan Asisten</span>
            </span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-3 sm:p-3.5 overflow-y-auto flex-1 text-black font-sans text-xs bg-[#D4D0C8]">
          {/* TAB 1: JADWAL HARI INI */}
          {activeTab === "jadwal" && (
            <div className="space-y-3">
              {/* Digital Clock & Next Prayer Banner */}
              <div className="p-3 bg-gradient-to-r from-[#102A45] to-[#1E4E8C] text-white rounded-[2px] border-2 border-t-[#4A6F9E] border-l-[#4A6F9E] border-r-[#0A1A2C] border-b-[#0A1A2C] shadow-inner flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-[10px] font-mono text-blue-200 uppercase tracking-wide">
                    {selectedCity.name} • {schedule.date}
                  </div>
                  <div className="font-mono text-2xl sm:text-3xl font-black text-yellow-300 tracking-wider flex items-center gap-2 drop-shadow">
                    <span>{digitalTime}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-[#0A1A2C] rounded border border-blue-400/40 text-blue-100 font-bold">
                      {selectedCity.tzLabel}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-mono text-yellow-200">MENUJU WAKTU BERIKUTNYA</div>
                  <div className="font-mono text-sm sm:text-base font-bold text-white flex items-center justify-end gap-1.5 mt-0.5">
                    <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-black text-yellow-300">{nextPrayer.name}</span>
                    <span>{nextPrayer.time}</span>
                  </div>
                  <div className="text-[11px] font-mono text-emerald-300 font-semibold">
                    {nextPrayer.formattedCountdown}
                  </div>
                </div>
              </div>

              {/* Prayer Times Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {prayerItems.map((item) => (
                  <div
                    key={item.key}
                    className={`p-2.5 rounded-[2px] border-2 flex flex-col justify-between transition-all ${
                      item.isNext
                        ? "bg-[#FFFDE7] border-t-amber-300 border-l-amber-300 border-r-amber-700 border-b-amber-700 shadow-sm scale-[1.02]"
                        : "bg-white border-t-white border-l-white border-r-[#808080] border-b-[#808080]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 font-bold text-[11px] text-slate-800">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                      {item.isNext ? (
                        <span className="text-[8px] font-mono font-black bg-amber-500 text-black px-1 py-0.2 rounded border border-amber-600 animate-pulse">
                          NEXT
                        </span>
                      ) : item.badge ? (
                        <span className="text-[8px] font-mono text-gray-500">
                          {item.badge}
                        </span>
                      ) : null}
                    </div>

                    <div className="font-mono text-lg font-black text-[#102A45] tracking-wide mt-1">
                      {item.time}
                    </div>
                  </div>
                ))}
              </div>

              {/* Accuracy Info Footnote */}
              <div className="p-2.5 bg-blue-50 border border-blue-300 rounded-[2px] flex items-start gap-2 text-[11px] text-blue-950 leading-relaxed">
                <Info className="size-4 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <strong>Akurasi Tinggi & 100% Offline:</strong> Dihitung memakai hisab astronomis Ephemeris matahari standar Kementerian Agama RI dengan faktor kehati-hatian (+2 menit ihtiyath). Selisih dengan tabel resmi Bimas Islam Kemenag hanya berkisar 0 s.d. 1 menit karena pembulatan detik.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PILIH KOTA */}
          {activeTab === "kota" && (
            <div className="space-y-2.5">
              {/* Search Bar */}
              <div className="relative">
                <Search className="size-4 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ketik nama kota atau provinsi (contoh: Surabaya, Bandung, Medan)..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border-2 border-t-black border-l-black border-r-white border-b-white rounded-[2px] text-xs outline-none text-black placeholder:text-gray-400"
                />
              </div>

              {/* City List */}
              <div className="max-h-[280px] overflow-y-auto bg-white border-2 border-t-black border-l-black border-r-white border-b-white rounded-[2px] divide-y divide-gray-200">
                {filteredCities.map((city) => {
                  const isSelected = city.id === selectedCity.id
                  return (
                    <div
                      key={city.id}
                      onClick={() => setSelectedCityId(city.id)}
                      className={`p-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-[#1E4E8C] text-white"
                          : "hover:bg-blue-50 text-slate-800"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs flex items-center gap-1.5">
                          <span>{city.name}</span>
                          <span
                            className={`text-[9px] font-mono px-1 py-0.2 rounded border ${
                              isSelected
                                ? "bg-white/20 text-yellow-300 border-white/30"
                                : "bg-gray-100 text-gray-600 border-gray-300"
                            }`}
                          >
                            {city.tzLabel}
                          </span>
                        </div>
                        <div className={`text-[10.5px] truncate ${isSelected ? "text-blue-100" : "text-gray-500"}`}>
                          {city.province} • Lat: {city.lat}, Lng: {city.lng}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="size-5 rounded-full bg-yellow-400 text-black flex items-center justify-center shrink-0">
                          <Check className="size-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 3: PENGATURAN ASISTEN */}
          {activeTab === "settings" && (
            <div className="space-y-3">
              {/* Asisten Toggle */}
              <div className="p-3 bg-white border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] rounded-[2px] flex items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-xs text-slate-900">
                    Tampilkan Asisten Clippy di Desktop
                  </div>
                  <div className="text-[11px] text-gray-600">
                    Karakter melayang di desktop yang mengingatkan waktu sholat dan tips santai.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="size-4 cursor-pointer accent-[#1E4E8C]"
                />
              </div>

              {/* Sound & Notification Options */}
              <div className="p-3 bg-white border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] rounded-[2px] space-y-2.5">
                <div className="font-bold text-xs text-slate-900">Suara & Notifikasi</div>

                <label className="flex items-center justify-between gap-2 cursor-pointer">
                  <div className="text-[11px] text-gray-700">
                    Bunyikan Suara saat waktu sholat tiba
                  </div>
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="size-4 cursor-pointer accent-[#1E4E8C]"
                  />
                </label>

                <label className="flex items-center justify-between gap-2 cursor-pointer pt-1 border-t border-gray-200">
                  <div>
                    <div className="text-[11px] font-bold text-gray-800">
                      Pengingat persiapan H-5 menit
                    </div>
                    <div className="text-[10px] text-gray-500">
                      Pesan balon teks Clippy di desktop (suara berbunyi saat jadwal sholat tiba).
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={reminder10Min}
                    onChange={(e) => setReminder10Min(e.target.checked)}
                    className="size-4 cursor-pointer accent-[#1E4E8C] shrink-0"
                  />
                </label>
              </div>

              {/* Pilihan Nada Pengingat Azan */}
              <div className="p-3 bg-white border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] rounded-[2px] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-slate-900">Pilihan Suara Pengingat Azan</div>
                  <span className="text-[10px] font-mono text-gray-500">Klik ▶ untuk tes suara</span>
                </div>

                <div className="space-y-1.5">
                  {ADZAN_SOUND_OPTIONS.map((opt) => {
                    const isSelected = adzanSound === opt.id
                    const isPlayingThis = playingSoundId === opt.id
                    return (
                      <div
                        key={opt.id}
                        onClick={() => {
                          setAdzanSound(opt.id)
                          playAdzanTest(opt.id)
                        }}
                        className={`p-2 rounded-[2px] border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                          isSelected
                            ? "bg-[#000080] text-white border-[#000080]"
                            : "bg-[#F4F4F4] hover:bg-white text-slate-800 border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">{opt.icon}</span>
                          <div className="min-w-0">
                            <div className="font-bold text-xs truncate flex items-center gap-1.5">
                              <span>{opt.name}</span>
                              {isSelected && (
                                <span className="text-[9px] font-mono px-1 py-0.2 bg-white text-[#000080] rounded font-bold">
                                  AKTIF
                                </span>
                              )}
                            </div>
                            <div className={`text-[10.5px] truncate ${isSelected ? "text-blue-100" : "text-gray-600"}`}>
                              {opt.desc}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            playAdzanTest(opt.id)
                          }}
                          title={isPlayingThis ? "Hentikan suara" : `Putar sampel suara ${opt.name}`}
                          className={`px-2 py-1 shrink-0 font-mono text-[10px] font-bold rounded-[2px] border border-t-white border-l-white border-r-[#404040] border-b-[#404040] flex items-center gap-1 shadow-sm active:translate-y-px ${
                            isPlayingThis
                              ? "bg-amber-200 text-amber-900 border-amber-500 animate-pulse"
                              : "bg-[#D4D0C8] text-slate-900 hover:bg-white"
                          }`}
                        >
                          {isPlayingThis ? (
                            <>
                              <Square className="size-2 text-red-700 fill-red-700" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Play className="size-2.5 text-[#000080] fill-[#000080]" />
                              <span>Tes</span>
                            </>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-[#C0C0C0] border-t-2 border-t-white flex items-center justify-between gap-2 shrink-0">
          <span className="text-[10px] font-mono text-gray-600 hidden sm:inline">
            JADWAL_SHOLAT.EXE • IT-THINGS 98
          </span>

          <button
            type="button"
            onClick={closePrayerDialog}
            className="w-full sm:w-auto ml-auto px-6 py-1 bg-[#D4D0C8] hover:bg-white text-black font-bold font-mono text-xs rounded-[2px] border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] active:border-t-[#404040] active:border-l-[#404040] active:border-r-white active:border-b-white shadow cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
