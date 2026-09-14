"use client"

import * as React from "react"
import { useDesktop } from "@/components/desktop/desktop-context"
import { useAuth } from "@/lib/auth"
import { playRetroNotificationSound } from "@/lib/sound-effects"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { RetroIcon } from "@/components/ui/retro-icon"
import {
  usePomodoro,
  type PomodoroMode,
  type PomodoroSessionRecord,
} from "@/lib/pomodoro-store"
import { cn } from "@/lib/utils"
import {
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Flame,
  Volume2,
  VolumeX,
  Bot,
  Activity,
  HeartPulse,
  Info,
  CheckCircle2,
  Sparkles,
  Droplet,
  Eye,
  Plus,
  Minus,
  ArrowRight,
  ShieldAlert,
  BarChart2,
  Calendar,
  Clock,
  Trash2,
  Cloud,
} from "lucide-react"

export type { PomodoroMode, PomodoroSessionRecord }

interface StretchExercise {
  id: string
  title: string
  target: string
  durationSec: number
  icon: string
  instructions: string[]
  benefit: string
}

const STRETCH_EXERCISES: StretchExercise[] = [
  {
    id: "shoulder_chest",
    title: "Bahu & Busung Dada",
    target: "Pundak, Dada & Tulang Punggung Atas",
    durationSec: 30,
    icon: "🧘",
    instructions: [
      "Duduk tegak, tarik kedua tangan ke belakang badan dan saling kaitkan jari.",
      "Busungkan dada ke depan sambil menarik bahu ke belakang dan bawah.",
      "Tahan posisi selama 15-20 detik sambil bernapas perlahan.",
      "Putar bahu ke belakang 5 kali untuk merelaksasi otot trapezius.",
    ],
    benefit: "Mencegah postur udang bungkuk (*hunchback*) akibat ngetik terlalu lama.",
  },
  {
    id: "wrist_fingers",
    title: "Peregangan Pergelangan Tangan",
    target: "Otot Fleksor / Ekstensor Tangan & Jari",
    durationSec: 30,
    icon: "🖐️",
    instructions: [
      "Luruskan tangan kanan ke depan setinggi bahu dengan telapak menghadap depan.",
      "Gunakan tangan kiri untuk menarik lembut jari-jari ke arah tubuh. Tahan 15 detik.",
      "Arahkan telapak tangan ke bawah, tarik lembut punggung tangan ke dalam.",
      "Ulangi gerakan yang sama untuk tangan kiri.",
    ],
    benefit: "Mencegah peradangan saraf Carpal Tunnel Syndrome (CTS) & kram jari keyboard.",
  },
  {
    id: "neck_relief",
    title: "Relaksasi Leher & Tengkuk",
    target: "Otot Leher Servikal",
    durationSec: 30,
    icon: "💆",
    instructions: [
      "Miringkan kepala perlahan ke kanan (telinga mendekati bahu kanan). Tahan 10 detik.",
      "Gunakan tangan kanan untuk memberi tekanan sangat lembut jika diperlukan.",
      "Ulangi ke sisi kiri selama 10 detik.",
      "Tundukkan kepala ke arah dada secara perlahan untuk meregangkan tengkuk.",
    ],
    benefit: "Melepaskan ketegangan leher kaku akibat menatap monitor secara statis.",
  },
  {
    id: "torso_twist",
    title: "Rotasi Pinggang & Punggung",
    target: "Lumbar & Tulang Belakang",
    durationSec: 30,
    icon: "🔄",
    instructions: [
      "Duduk tegak di kursi, letakkan kaki rata di lantai.",
      "Pegang sandaran kursi dengan tangan kanan dan putar badan ke arah kanan.",
      "Tahan selama 10-15 detik dengan napas teratur, jangan dipaksa berlebihan.",
      "Ulangi putar badan ke arah kiri.",
    ],
    benefit: "Mengurangi kekakuan pinggang jompo dan melancarkan sirkulasi cairan sendi spinal.",
  },
  {
    id: "eye_reset",
    title: "Istirahat Mata 20-20-20",
    target: "Otot Siliaris Mata",
    durationSec: 20,
    icon: "👁️",
    instructions: [
      "Alihkan pandangan dari layar monitor sekarang juga.",
      "Fokuskan pandangan ke objek sejauh 6 meter (20 kaki) atau ke arah luar jendela.",
      "Tahan tatapan santai selama 20 detik.",
      "Kedipkan mata secara perlahan 5-10 kali untuk membasahi kornea mata.",
    ],
    benefit: "Mencegah kelelahan mata (*digital eye strain*), mata kering, dan sakit kepala.",
  },
  {
    id: "hydration_boost",
    title: "Hidrasi Tubuh (Minum Air)",
    target: "Sirkulasi Darah & Fokus Otak",
    durationSec: 20,
    icon: "💧",
    instructions: [
      "Berdiri dari kursi Anda sekarang juga.",
      "Ambil segelas air mineral segar.",
      "Minum perlahan dalam beberapa tegukan santai.",
      "Gerak-gerakkan kaki sejenak sebelum duduk kembali.",
    ],
    benefit: "Mencegah dehidrasi, melancarkan aliran oksigen ke otak, dan meregangkan lutut.",
  },
]

const MODE_PRESETS: Record<PomodoroMode, { name: string; defaultMinutes: number; badge: string; color: string }> = {
  focus: {
    name: "Fokus / Deep Work",
    defaultMinutes: 25,
    badge: "FOKUS",
    color: "#1E4E8C",
  },
  short_break: {
    name: "Peregangan Singkat",
    defaultMinutes: 5,
    badge: "STRETCH",
    color: "#059669",
  },
  long_break: {
    name: "Istirahat Panjang",
    defaultMinutes: 15,
    badge: "ISTIRAHAT",
    color: "#7C3AED",
  },
}

export function PomodoroApp() {
  const { closeWindow } = useDesktop()
  const { user } = useAuth()
  const {
    mode,
    switchMode,
    startMode,
    durations,
    timeLeftPerMode,
    timeLeft,
    isRunning,
    completedSessions,
    sessionHistory,
    isHistoryLoading,
    soundEnabled,
    setSoundEnabled,
    clippyEnabled,
    setClippyEnabled,
    autoStartBreaks,
    setAutoStartBreaks,
    activeTab,
    setActiveTab,
    togglePlayPause,
    handleReset: resetTimerStore,
    adjustMinutes,
    setPresetMinutes,
    handleClearHistory: clearHistoryStore,
  } = usePomodoro()

  // Dialog & Active Exercise
  const [showResetConfirm, setShowResetConfirm] = React.useState<boolean>(false)
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = React.useState<boolean>(false)
  const [selectedExerciseId, setSelectedExerciseId] = React.useState<string>(STRETCH_EXERCISES[0].id)
  const [exerciseTimer, setExerciseTimer] = React.useState<number | null>(null)

  // Mini Exercise timer
  React.useEffect(() => {
    if (exerciseTimer === null || exerciseTimer <= 0) return

    const timer = setInterval(() => {
      setExerciseTimer((prev) => {
        if (prev === null || prev <= 1) {
          if (soundEnabled) playRetroNotificationSound(0.2)
          return null
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [exerciseTimer, soundEnabled])

  const handleReset = () => {
    resetTimerStore()
    setShowResetConfirm(false)
  }

  const handleClearHistory = async () => {
    await clearHistoryStore()
    setShowClearHistoryConfirm(false)
  }

  // Perhitungan metrik ringkasan & grafik 7 hari terakhir
  const { weeklyDays, maxMinutes, totalFocusMinutes, totalBreakMinutes } = React.useMemo(() => {
    let focusMins = 0
    let breakMins = 0

    const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]
    const today = new Date()
    const days: { dateStr: string; label: string; focusMinutes: number; breakMinutes: number }[] = []

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(today.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const dayLabel = `${dayNames[d.getDay()]} ${d.getDate()}`
      days.push({
        dateStr,
        label: dayLabel,
        focusMinutes: 0,
        breakMinutes: 0,
      })
    }

    sessionHistory.forEach((s) => {
      if (s.mode === "focus") {
        focusMins += s.durationMinutes
      } else {
        breakMins += s.durationMinutes
      }

      const sDate = s.completedAt ? s.completedAt.slice(0, 10) : ""
      const found = days.find((d) => d.dateStr === sDate)
      if (found) {
        if (s.mode === "focus") {
          found.focusMinutes += s.durationMinutes
        } else {
          found.breakMinutes += s.durationMinutes
        }
      }
    })

    const maxMins = Math.max(60, ...days.map((d) => d.focusMinutes + d.breakMinutes))
    return {
      weeklyDays: days,
      maxMinutes: maxMins,
      totalFocusMinutes: focusMins,
      totalBreakMinutes: breakMins,
    }
  }, [sessionHistory])

  const totalSeconds = durations[mode] * 60

  // Format detik ke MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  // Persentase progress
  const progressPercent = totalSeconds > 0 ? Math.max(0, Math.min(100, ((totalSeconds - timeLeft) / totalSeconds) * 100)) : 0

  const selectedExercise = STRETCH_EXERCISES.find((e) => e.id === selectedExerciseId) || STRETCH_EXERCISES[0]

  return (
    <div className="flex-1 flex flex-col bg-[#D4DDE6] text-[#14253D] font-sans select-none overflow-hidden h-full">
      {/* Menu Bar Retro */}
      <div className="flex items-center gap-1 sm:gap-2 px-2 py-0.5 bg-[#C0CCD8] border-b border-[#8090A0] text-xs shrink-0 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("timer")}
          className={cn(
            "px-2 py-0.5 rounded-[2px] transition-colors whitespace-nowrap",
            activeTab === "timer" ? "bg-[#1E4E8C] text-white font-bold" : "hover:bg-white/40"
          )}
        >
          Timer
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("stretch")}
          className={cn(
            "px-2 py-0.5 rounded-[2px] transition-colors flex items-center gap-1 whitespace-nowrap",
            activeTab === "stretch" ? "bg-[#1E4E8C] text-white font-bold" : "hover:bg-white/40"
          )}
        >
          <HeartPulse className="size-3 text-rose-500" />
          Peregangan
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={cn(
            "px-2 py-0.5 rounded-[2px] transition-colors flex items-center gap-1 whitespace-nowrap",
            activeTab === "history" ? "bg-[#1E4E8C] text-white font-bold" : "hover:bg-white/40"
          )}
        >
          <BarChart2 className="size-3 text-cyan-600" />
          Riwayat & Grafik
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("about")}
          className={cn(
            "px-2 py-0.5 rounded-[2px] transition-colors whitespace-nowrap",
            activeTab === "about" ? "bg-[#1E4E8C] text-white font-bold" : "hover:bg-white/40"
          )}
        >
          Bantuan
        </button>

        <div className="ml-auto flex items-center gap-1.5 text-[11px] font-mono">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Audio Chime: Aktif" : "Audio Chime: Bisu"}
            className={cn(
              "p-1 rounded border",
              soundEnabled
                ? "bg-[#D4DDE6] border-[#5E7287] text-[#1E4E8C]"
                : "bg-[#BCC9D6] border-[#7D8E9E] text-gray-500"
            )}
          >
            {soundEnabled ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setClippyEnabled(!clippyEnabled)}
            title={clippyEnabled ? "Clippy Reminders: Aktif" : "Clippy Reminders: Mati"}
            className={cn(
              "p-1 rounded border",
              clippyEnabled
                ? "bg-[#D4DDE6] border-[#5E7287] text-amber-700"
                : "bg-[#BCC9D6] border-[#7D8E9E] text-gray-500"
            )}
          >
            <Bot className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Main Tab Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-3 retro-scrollbar flex flex-col">
        {activeTab === "timer" && (
          <div className="flex-1 flex flex-col justify-between max-w-md mx-auto w-full gap-3">
            {/* Mode Pills Windows 98 Style */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#BDCCD9] border border-[#5E7287] rounded-[3px] shadow-inner">
              {(["focus", "short_break", "long_break"] as PomodoroMode[]).map((m) => {
                const info = MODE_PRESETS[m]
                const isSelected = mode === m
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => switchMode(m)}
                    className={cn(
                      "py-1.5 px-1 flex flex-col items-center justify-center rounded-[2px] text-[11px] font-mono transition-all border",
                      isSelected
                        ? "bg-[#1E4E8C] text-white font-bold border-t-[#102A45] border-l-[#102A45] border-r-white/40 border-b-white/40 shadow-inner"
                        : "bg-[#D4DDE6] text-[#14253D] font-medium border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] hover:bg-[#DEE6EE]"
                    )}
                  >
                    <span className="truncate">{info.badge}</span>
                    <span className="text-[9px] opacity-80">{durations[m]}m</span>
                  </button>
                )
              })}
            </div>

            {/* Retro LED Display Frame */}
            <div className="p-3 sm:p-4 bg-[#0A101D] border-2 border-t-[#000000] border-l-[#000000] border-r-[#FFFFFF] border-b-[#FFFFFF] rounded-[3px] shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
              {/* Scanlines Effect */}
              <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                  backgroundImage: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.4) 50%)",
                  backgroundSize: "100% 4px",
                }}
              />

              {/* Status Header inside Display */}
              <div className="w-full flex items-center justify-between text-[10px] font-mono mb-2 z-10">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      isRunning ? "bg-emerald-400 animate-ping" : "bg-amber-400"
                    )}
                  />
                  <span className="text-emerald-400 tracking-wider font-bold uppercase">
                    {isRunning ? "STATUS: RUNNING" : "STATUS: PAUSED"}
                  </span>
                </div>
                <div className="text-cyan-300 tracking-wider">
                  MODE: {MODE_PRESETS[mode].badge}
                </div>
              </div>

              {/* Giant Digital LED Clock */}
              <div
                className="font-mono text-5xl sm:text-6xl font-black tracking-widest text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.7)] my-2 z-10 select-none"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatTime(timeLeft)}
              </div>

              {/* Windows 98 Segmented Progress Bar */}
              <div className="w-full mt-2 bg-[#02050A] border border-[#1E293B] p-0.5 rounded-[2px] z-10">
                <div
                  className="h-3 bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-300 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Progress percentage label */}
              <div className="w-full flex justify-between text-[9px] font-mono text-gray-400 mt-1 z-10">
                <span>PROGRESS</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
            </div>

            {/* Quick Adjust Buttons (Only when stopped) */}
            <div className="flex items-center justify-between gap-2 px-1 text-xs">
              <div className="flex items-center gap-1 text-[11px] font-mono text-gray-600">
                <span>Atur Menit:</span>
                <button
                  type="button"
                  disabled={isRunning || durations[mode] <= 1}
                  onClick={() => adjustMinutes(-1)}
                  className="size-6 bg-[#D4DDE6] border border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] active:translate-y-px rounded-[2px] flex items-center justify-center font-bold disabled:opacity-40"
                  title="Kurang 1 Menit"
                >
                  <Minus className="size-3" />
                </button>
                <span className="font-bold min-w-[28px] text-center">{durations[mode]}m</span>
                <button
                  type="button"
                  disabled={isRunning || durations[mode] >= 120}
                  onClick={() => adjustMinutes(1)}
                  className="size-6 bg-[#D4DDE6] border border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] active:translate-y-px rounded-[2px] flex items-center justify-center font-bold disabled:opacity-40"
                  title="Tambah 1 Menit"
                >
                  <Plus className="size-3" />
                </button>
              </div>

              {/* Presets Button */}
              <div className="flex items-center gap-1">
                {mode === "focus" && (
                  <>
                    <button
                      type="button"
                      disabled={isRunning}
                      onClick={() => setPresetMinutes("focus", 25)}
                      className={cn(
                        "px-1.5 py-0.5 text-[10px] font-mono border rounded-[2px]",
                        durations.focus === 25 ? "bg-[#1E4E8C] text-white font-bold" : "bg-[#D4DDE6] border-[#5E7287]"
                      )}
                    >
                      25m
                    </button>
                    <button
                      type="button"
                      disabled={isRunning}
                      onClick={() => setPresetMinutes("focus", 50)}
                      className={cn(
                        "px-1.5 py-0.5 text-[10px] font-mono border rounded-[2px]",
                        durations.focus === 50 ? "bg-[#1E4E8C] text-white font-bold" : "bg-[#D4DDE6] border-[#5E7287]"
                      )}
                    >
                      50m
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlayPause}
                className={cn(
                  "flex-1 h-10 px-4 rounded-[2px] font-mono font-bold text-sm flex items-center justify-center gap-2 transition-all border-2 shadow-[1px_1px_0px_#5E7287]",
                  isRunning
                    ? "bg-[#C27803] hover:bg-[#A36402] text-white border-t-[#FDE68A] border-l-[#FDE68A] border-r-[#78350F] border-b-[#78350F]"
                    : "bg-[#1E4E8C] hover:bg-[#153A6B] text-white border-t-[#93C5FD] border-l-[#93C5FD] border-r-[#0F172A] border-b-[#0F172A]"
                )}
              >
                {isRunning ? (
                  <>
                    <Pause className="size-4 fill-current" />
                    <span>JEDA (PAUSE)</span>
                  </>
                ) : (
                  <>
                    <Play className="size-4 fill-current" />
                    <span>MULAI (START)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isRunning || timeLeft !== totalSeconds) {
                    setShowResetConfirm(true)
                  }
                }}
                disabled={!isRunning && timeLeft === totalSeconds}
                title="Reset Timer"
                className="h-10 px-3 bg-[#D4DDE6] hover:bg-[#DEE6EE] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] active:translate-y-px rounded-[2px] flex items-center justify-center gap-1 font-mono text-xs font-bold text-gray-700 disabled:opacity-40"
              >
                <RotateCcw className="size-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>

            {/* Streak & Productivity Summary Card */}
            <div className="p-2.5 bg-white/70 border border-[#A4B5C6] rounded-[3px] flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="size-8 rounded bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0 p-1">
                  <RetroIcon name="pomodoro" iconSize={32} className="size-6 object-contain" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">Siklus Fokus Hari Ini</div>
                  <div className="text-[10px] text-gray-600 truncate">
                    {completedSessions === 0
                      ? "Belum ada sesi selesai, yuk mulai!"
                      : `${completedSessions} sesi selesai (${completedSessions * 25} menit kerja)`}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("stretch")}
                className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-mono text-[10px] font-bold rounded-[2px] border border-emerald-900 shadow-xs active:translate-y-px shrink-0 flex items-center gap-1"
              >
                <HeartPulse className="size-3" />
                Stretching
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Panduan Peregangan Otot (Ergonomics) */}
        {activeTab === "stretch" && (
          <div className="flex-1 flex flex-col gap-2.5">
            {/* Header Banner */}
            <div className="p-2 bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-[3px] border border-emerald-950 flex items-center justify-between gap-2 shadow-xs">
              <div>
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <HeartPulse className="size-4 text-emerald-300" />
                  Peregangan & Ergonomi Programmer
                </div>
                <div className="text-[10px] text-emerald-100">
                  Lakukan gerakan 30 detik untuk melepaskan ketegangan otot sendi.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  startMode("short_break")
                  setActiveTab("timer")
                }}
                className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono text-[10px] font-black rounded-[2px] border border-amber-600 shadow-xs shrink-0 flex items-center gap-1"
              >
                <Play className="size-3 fill-current" />
                Mulai Break 5m
              </button>
            </div>

            {/* Main Exercise Split View */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 flex-1 min-h-0">
              {/* Exercise Selector List */}
              <div className="space-y-1 overflow-y-auto max-h-[160px] md:max-h-none md:col-span-1 retro-scrollbar pr-0.5">
                {STRETCH_EXERCISES.map((ex) => {
                  const isSelected = ex.id === selectedExerciseId
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => {
                        setSelectedExerciseId(ex.id)
                        setExerciseTimer(null)
                      }}
                      className={cn(
                        "w-full p-1.5 rounded-[2px] text-left transition-all border flex items-center gap-2",
                        isSelected
                          ? "bg-[#1E4E8C] text-white border-t-[#102A45] border-l-[#102A45] border-r-white/40 border-b-white/40 font-bold"
                          : "bg-white/80 hover:bg-white text-[#14253D] border-[#A4B5C6]"
                      )}
                    >
                      <span className="text-lg shrink-0">{ex.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] truncate leading-tight">{ex.title}</div>
                        <div className={cn("text-[9px] truncate", isSelected ? "text-blue-200" : "text-gray-500")}>
                          {ex.target}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Exercise Detail Card */}
              <div className="md:col-span-2 bg-white/90 border border-[#8090A0] p-3 rounded-[3px] flex flex-col justify-between gap-2 shadow-inner">
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-gray-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl p-1 bg-emerald-50 rounded border border-emerald-200">
                        {selectedExercise.icon}
                      </span>
                      <div>
                        <h4 className="font-bold text-xs text-[#14253D]">{selectedExercise.title}</h4>
                        <div className="text-[10px] text-emerald-700 font-mono font-semibold">
                          Target: {selectedExercise.target}
                        </div>
                      </div>
                    </div>

                    {/* Quick Mini Timer for Exercise */}
                    <div className="text-right">
                      {exerciseTimer !== null ? (
                        <div className="font-mono font-black text-lg text-rose-600 animate-pulse">
                          {exerciseTimer}s
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setExerciseTimer(selectedExercise.durationSec)}
                          className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white font-mono text-[10px] font-bold rounded-[2px] border border-emerald-900 shadow-xs flex items-center gap-1"
                        >
                          <Play className="size-2.5 fill-current" />
                          Timer {selectedExercise.durationSec}s
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Step by step */}
                  <div className="mt-2 space-y-1.5 text-xs text-gray-800">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono">
                      Cara Melakukan:
                    </div>
                    <ol className="space-y-1 list-decimal list-inside pl-1 text-[11px] leading-relaxed">
                      {selectedExercise.instructions.map((step, idx) => (
                        <li key={idx} className="text-gray-700">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                {/* Benefit Pill */}
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-[2px] text-[10px] text-amber-900 flex items-start gap-1.5">
                  <Sparkles className="size-3 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong className="font-bold">Manfaat Medis:</strong> {selectedExercise.benefit}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Riwayat & Grafik */}
        {activeTab === "history" && (
          <div className="flex-1 flex flex-col gap-2.5">
            {/* Summary KPI Cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-white/90 border border-[#8090A0] rounded-[3px] shadow-2xs">
                <div className="text-[10px] font-mono text-gray-500 flex items-center gap-1">
                  <Flame className="size-3 text-amber-600" />
                  Total Fokus
                </div>
                <div className="text-base sm:text-lg font-mono font-black text-[#1E4E8C] mt-0.5">
                  {totalFocusMinutes} <span className="text-[10px] font-normal text-gray-600">mnt</span>
                </div>
                <div className="text-[9px] text-gray-500 truncate">
                  {(totalFocusMinutes / 60).toFixed(1)} Jam Produktif
                </div>
              </div>

              <div className="p-2 bg-white/90 border border-[#8090A0] rounded-[3px] shadow-2xs">
                <div className="text-[10px] font-mono text-gray-500 flex items-center gap-1">
                  <HeartPulse className="size-3 text-rose-500" />
                  Stretching
                </div>
                <div className="text-base sm:text-lg font-mono font-black text-emerald-700 mt-0.5">
                  {totalBreakMinutes} <span className="text-[10px] font-normal text-gray-600">mnt</span>
                </div>
                <div className="text-[9px] text-gray-500 truncate">
                  Relaksasi Otot
                </div>
              </div>

              <div className="p-2 bg-white/90 border border-[#8090A0] rounded-[3px] shadow-2xs">
                <div className="text-[10px] font-mono text-gray-500 flex items-center gap-1">
                  <CheckCircle2 className="size-3 text-emerald-600" />
                  Sesi Tuntas
                </div>
                <div className="text-base sm:text-lg font-mono font-black text-purple-700 mt-0.5">
                  {sessionHistory.length} <span className="text-[10px] font-normal text-gray-600">sesi</span>
                </div>
                <div className="text-[9px] text-gray-500 flex items-center gap-1 truncate">
                  <Cloud className="size-2.5 text-blue-500" />
                  {user ? "Cloud Sync Aktif" : "Lokal"}
                </div>
              </div>
            </div>

            {/* Retro 7-Day Bar Chart */}
            <div className="p-3 bg-[#0A101D] border-2 border-t-black border-l-black border-r-white border-b-white rounded-[3px] shadow-inner flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <div className="text-cyan-300 font-bold flex items-center gap-1">
                  <BarChart2 className="size-3.5" />
                  GRAFIK AKTIVITAS 7 HARI TERAKHIR
                </div>
                <div className="flex items-center gap-3 text-[9px]">
                  <span className="flex items-center gap-1 text-blue-300">
                    <span className="size-2 bg-blue-500 inline-block rounded-xs" /> Fokus
                  </span>
                  <span className="flex items-center gap-1 text-emerald-300">
                    <span className="size-2 bg-emerald-400 inline-block rounded-xs" /> Stretch
                  </span>
                </div>
              </div>

              {/* Chart Grid & Bars */}
              <div className="h-32 sm:h-36 pt-4 pb-1 px-1 border-b border-[#1E293B] flex items-end justify-between gap-1.5 sm:gap-2">
                {weeklyDays.map((day) => {
                  const focusHeightPct = Math.min(100, Math.round((day.focusMinutes / maxMinutes) * 100))
                  const breakHeightPct = Math.min(100, Math.round((day.breakMinutes / maxMinutes) * 100))
                  const hasData = day.focusMinutes > 0 || day.breakMinutes > 0

                  return (
                    <div
                      key={day.dateStr}
                      title={`${day.label}: ${day.focusMinutes}m fokus, ${day.breakMinutes}m stretch`}
                      className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
                    >
                      {/* Total Minutes label */}
                      <div className="text-[8px] font-mono text-cyan-200 mb-1 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-transform">
                        {hasData ? `${day.focusMinutes + day.breakMinutes}m` : "-"}
                      </div>

                      {/* Stacked Vertical Bar */}
                      <div className="w-full max-w-[28px] bg-[#111827] rounded-t-[2px] overflow-hidden flex flex-col justify-end h-24 border border-white/10 group-hover:border-cyan-400/60 transition-colors">
                        {/* Break bar (top) */}
                        {breakHeightPct > 0 && (
                          <div
                            style={{ height: `${breakHeightPct}%` }}
                            className="w-full bg-emerald-400 hover:bg-emerald-300 transition-all border-b border-black/20"
                          />
                        )}
                        {/* Focus bar (bottom) */}
                        {focusHeightPct > 0 && (
                          <div
                            style={{ height: `${focusHeightPct}%` }}
                            className="w-full bg-gradient-to-t from-blue-700 via-blue-500 to-cyan-400 transition-all"
                          />
                        )}
                      </div>

                      {/* Day Label */}
                      <div className="text-[9px] font-mono text-gray-400 mt-1.5 truncate group-hover:text-white">
                        {day.label}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Table: Session Log Records */}
            <div className="flex-1 min-h-0 bg-white/90 border border-[#8090A0] p-2.5 rounded-[3px] flex flex-col gap-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-[#14253D] flex items-center gap-1.5">
                  <Clock className="size-3.5 text-[#1E4E8C]" />
                  Log Sesi Terselesaikan ({sessionHistory.length})
                </div>
                {sessionHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowClearHistoryConfirm(true)}
                    className="px-2 py-0.5 text-[10px] font-mono text-rose-700 hover:bg-rose-50 border border-rose-300 rounded-[2px] active:translate-y-px flex items-center gap-1"
                  >
                    <Trash2 className="size-3" />
                    Bersihkan Log
                  </button>
                )}
              </div>

              {/* Table List */}
              <div className="flex-1 min-h-[120px] max-h-[220px] overflow-y-auto retro-scrollbar border border-gray-200 rounded-[2px] bg-white">
                {sessionHistory.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-500 flex flex-col items-center justify-center gap-2">
                    <Clock className="size-8 text-gray-300 stroke-1" />
                    <p>Belum ada riwayat sesi tercatat.</p>
                    <p className="text-[10px] text-gray-400">
                      Selesaikan satu sesi timer fokus atau stretching untuk melihat pencatatan otomatis di sini!
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead className="bg-[#E2E8F0] text-[#14253D] font-mono text-[10px] sticky top-0 border-b border-gray-300">
                        <tr>
                          <th className="p-1.5 pl-2">Waktu Selesai</th>
                          <th className="p-1.5">Tipe Sesi</th>
                          <th className="p-1.5">Durasi</th>
                          <th className="p-1.5 text-right pr-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sessionHistory.map((s) => {
                          const dateObj = new Date(s.completedAt)
                          const timeFormatted = isNaN(dateObj.getTime())
                            ? "-"
                            : dateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                          const dateFormatted = isNaN(dateObj.getTime())
                            ? "-"
                            : dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short" })

                          return (
                            <tr key={s.id} className="hover:bg-blue-50/60">
                              <td className="p-1.5 pl-2 font-mono text-gray-700">
                                <span className="font-bold text-[#14253D]">{timeFormatted}</span>
                                <span className="text-[9px] text-gray-400 ml-1.5">({dateFormatted})</span>
                              </td>
                              <td className="p-1.5">
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 font-medium px-1.5 py-0.5 rounded-[2px] text-[10px]",
                                    s.mode === "focus"
                                      ? "bg-blue-100 text-blue-800 border border-blue-200"
                                      : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  )}
                                >
                                  {s.mode === "focus" ? "🍅 Deep Work" : s.mode === "short_break" ? "🧘 Quick Stretch" : "☕ Long Break"}
                                </span>
                              </td>
                              <td className="p-1.5 font-mono font-medium text-gray-700">
                                {s.durationMinutes} Menit
                              </td>
                              <td className="p-1.5 text-right pr-2">
                                <span className="text-[9px] font-mono bg-emerald-100 text-emerald-800 border border-emerald-300 px-1 py-0.2 rounded font-bold">
                                  TUNTAS
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Bantuan & Tips */}
        {activeTab === "about" && (
          <div className="flex-1 flex flex-col gap-2.5 max-w-md mx-auto w-full text-xs">
            <div className="p-3 bg-white/90 border border-[#8090A0] rounded-[3px] shadow-2xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-[#1E4E8C]">
                <RetroIcon name="pomodoro" iconSize={32} className="size-5 object-contain" />
                <span>POMODORO.EXE - Versi 1.0</span>
              </div>
              <p className="text-[11px] text-gray-700 leading-relaxed">
                Aplikasi produktivitas tim IT-THINGS 98 yang dirancang khusus untuk programmer. Menggunakan metode
                Pomodoro klasik (25 menit kerja fokus diikuti 5 menit peregangan otot) untuk menjaga stamina mental dan
                mencegah cedera tulang belakang.
              </p>

              <div className="border-t border-gray-200 pt-2 space-y-1 text-[11px]">
                <div className="font-bold text-gray-800">Aturan Sehat Programmer:</div>
                <div className="flex items-center gap-1 text-gray-600">
                  <span>•</span> 25 Menit: Tulis kode tanpa distraksi (Deep Work).
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <span>•</span> 5 Menit: Regangkan leher, bahu, dan mata 20-20-20.
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <span>•</span> 4 Siklus: Ambil istirahat panjang 15 menit & jalan-jalan.
                </div>
              </div>

              <div className="border-t border-gray-200 pt-2 flex items-center justify-between text-[10px] text-gray-500 font-mono">
                <span>IT-THINGS 98 SUITE</span>
                <button
                  type="button"
                  onClick={() => closeWindow("pomodoro")}
                  className="px-2 py-0.5 bg-[#D4DDE6] border border-[#5E7287] rounded-[2px] hover:bg-[#DEE6EE] text-gray-800"
                >
                  Tutup Jendela
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Status Bar Windows 98 */}
      <div className="px-2 py-1 bg-[#BDCCD9] border-t border-[#8090A0] flex items-center justify-between text-[10px] font-mono text-gray-700 shrink-0">
        <div className="flex items-center gap-2 truncate">
          <span className="font-bold text-[#1E4E8C]">POMODORO98</span>
          <span>|</span>
          <span className="truncate">
            {isRunning
              ? `Berjalan (${MODE_PRESETS[mode].badge})`
              : "Siap (Idle)"}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span>Streak: {completedSessions} 🍅</span>
        </div>
      </div>

      {/* Confirm Dialog Reset */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="RESET_TIMER.EXE"
        message="Apakah Anda yakin ingin menghentikan dan mereset timer saat ini ke awal?"
        confirmText="Ya, Reset"
        cancelText="Batal"
        variant="warning"
        onConfirm={handleReset}
      />

      {/* Confirm Dialog Hapus Riwayat */}
      <ConfirmDialog
        isOpen={showClearHistoryConfirm}
        onClose={() => setShowClearHistoryConfirm(false)}
        title="HAPUS_RIWAYAT.EXE"
        message="Apakah Anda yakin ingin menghapus seluruh log riwayat sesi Pomodoro ini?"
        confirmText="Ya, Hapus Semua"
        cancelText="Batal"
        variant="destructive"
        onConfirm={handleClearHistory}
      />
    </div>
  )
}
