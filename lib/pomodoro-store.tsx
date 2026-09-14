"use client"

import * as React from "react"
import { useAuth } from "@/lib/auth"
import { useClippy } from "@/lib/clippy-store"
import { playPomodoroChime } from "@/lib/sound-effects"
import {
  savePomodoroSessionAction,
  fetchUserPomodoroSessionsAction,
  clearUserPomodoroSessionsAction,
} from "@/app/actions/pomodoro"

export type PomodoroMode = "focus" | "short_break" | "long_break"

export interface PomodoroSessionRecord {
  id: string
  mode: PomodoroMode
  durationMinutes: number
  completedAt: string
}

export interface PomodoroSettings {
  durations: Record<PomodoroMode, number>
  soundEnabled: boolean
  clippyEnabled: boolean
  autoStartBreaks: boolean
}

export interface PomodoroRuntimeState {
  mode: PomodoroMode
  isRunning: boolean
  targetEndTimestamp: number | null
  timeLeftPerMode: Record<PomodoroMode, number>
  durations: Record<PomodoroMode, number>
  activeTab: "timer" | "stretch" | "history" | "about"
  updatedAt: number
}

const DEFAULT_DURATIONS: Record<PomodoroMode, number> = {
  focus: 25,
  short_break: 5,
  long_break: 15,
}

const DEFAULT_TIME_LEFT: Record<PomodoroMode, number> = {
  focus: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
}

const RUNTIME_STORAGE_KEY = "it-things_pomodoro_runtime"
const SETTINGS_STORAGE_KEY = "it-things_pomodoro_settings"
const HISTORY_STORAGE_KEY = "it-things_pomodoro_history"

interface PomodoroContextType {
  mode: PomodoroMode
  switchMode: (newMode: PomodoroMode) => void
  startMode: (newMode: PomodoroMode) => void
  setMode: React.Dispatch<React.SetStateAction<PomodoroMode>>
  durations: Record<PomodoroMode, number>
  timeLeftPerMode: Record<PomodoroMode, number>
  timeLeft: number
  isRunning: boolean
  setIsRunning: (running: boolean) => void
  completedSessions: number
  sessionHistory: PomodoroSessionRecord[]
  isHistoryLoading: boolean
  soundEnabled: boolean
  setSoundEnabled: (v: boolean) => void
  clippyEnabled: boolean
  setClippyEnabled: (v: boolean) => void
  autoStartBreaks: boolean
  setAutoStartBreaks: (v: boolean) => void
  activeTab: "timer" | "stretch" | "history" | "about"
  setActiveTab: (tab: "timer" | "stretch" | "history" | "about") => void
  togglePlayPause: () => void
  handleReset: () => void
  adjustMinutes: (delta: number) => void
  setPresetMinutes: (targetMode: PomodoroMode, mins: number) => void
  handleClearHistory: () => Promise<void>
}

const PomodoroContext = React.createContext<PomodoroContextType | undefined>(undefined)

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { speak } = useClippy()

  const [activeTab, setActiveTab] = React.useState<"timer" | "stretch" | "history" | "about">("timer")
  const [mode, setMode] = React.useState<PomodoroMode>("focus")
  const [durations, setDurations] = React.useState<Record<PomodoroMode, number>>(DEFAULT_DURATIONS)
  const [timeLeftPerMode, setTimeLeftPerMode] = React.useState<Record<PomodoroMode, number>>(DEFAULT_TIME_LEFT)
  const [isRunning, setIsRunning] = React.useState<boolean>(false)
  const [targetEndTimestamp, setTargetEndTimestamp] = React.useState<number | null>(null)

  const [completedSessions, setCompletedSessions] = React.useState<number>(0)
  const [sessionHistory, setSessionHistory] = React.useState<PomodoroSessionRecord[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = React.useState<boolean>(false)

  const [soundEnabled, setSoundEnabled] = React.useState<boolean>(true)
  const [clippyEnabled, setClippyEnabled] = React.useState<boolean>(true)
  const [autoStartBreaks, setAutoStartBreaks] = React.useState<boolean>(false)

  // Ref untuk menghindari stale closure di event handler & timer loop
  const stateRef = React.useRef({
    mode,
    durations,
    timeLeftPerMode,
    isRunning,
    targetEndTimestamp,
    completedSessions,
    soundEnabled,
    clippyEnabled,
    autoStartBreaks,
    activeTab,
  })

  React.useEffect(() => {
    stateRef.current = {
      mode,
      durations,
      timeLeftPerMode,
      isRunning,
      targetEndTimestamp,
      completedSessions,
      soundEnabled,
      clippyEnabled,
      autoStartBreaks,
      activeTab,
    }
  })

  // Simpan runtime state ke localStorage
  const persistRuntime = React.useCallback(
    (override?: Partial<PomodoroRuntimeState>) => {
      try {
        const current = stateRef.current
        const payload: PomodoroRuntimeState = {
          mode: override?.mode ?? current.mode,
          isRunning: override?.isRunning ?? current.isRunning,
          targetEndTimestamp: override?.targetEndTimestamp !== undefined ? override.targetEndTimestamp : current.targetEndTimestamp,
          timeLeftPerMode: override?.timeLeftPerMode ?? current.timeLeftPerMode,
          durations: override?.durations ?? current.durations,
          activeTab: override?.activeTab ?? current.activeTab,
          updatedAt: Date.now(),
        }
        localStorage.setItem(RUNTIME_STORAGE_KEY, JSON.stringify(payload))
      } catch {
        // Ignore localStorage error
      }
    },
    []
  )

  // Simpan settings ke localStorage
  const saveSettings = React.useCallback(
    (
      newDurations = durations,
      newSound = soundEnabled,
      newClippy = clippyEnabled,
      newAuto = autoStartBreaks
    ) => {
      try {
        const payload: PomodoroSettings = {
          durations: newDurations,
          soundEnabled: newSound,
          clippyEnabled: newClippy,
          autoStartBreaks: newAuto,
        }
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload))
      } catch {
        // Ignore
      }
    },
    [durations, soundEnabled, clippyEnabled, autoStartBreaks]
  )

  // Inisialisasi dari localStorage saat mount (rehidrasi state setelah refresh browser)
  React.useEffect(() => {
    try {
      // 1. Settings
      let loadedDurations = DEFAULT_DURATIONS
      const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (savedSettings) {
        const parsed: Partial<PomodoroSettings> = JSON.parse(savedSettings)
        if (parsed.durations) {
          loadedDurations = {
            focus: parsed.durations.focus || DEFAULT_DURATIONS.focus,
            short_break: parsed.durations.short_break || DEFAULT_DURATIONS.short_break,
            long_break: parsed.durations.long_break || DEFAULT_DURATIONS.long_break,
          }
          setDurations(loadedDurations)
        }
        if (typeof parsed.soundEnabled === "boolean") setSoundEnabled(parsed.soundEnabled)
        if (typeof parsed.clippyEnabled === "boolean") setClippyEnabled(parsed.clippyEnabled)
        if (typeof parsed.autoStartBreaks === "boolean") setAutoStartBreaks(parsed.autoStartBreaks)
      }

      // 2. Streak
      const todayKey = `it-things_pomodoro_streak_${new Date().toISOString().slice(0, 10)}`
      const savedStreak = localStorage.getItem(todayKey)
      if (savedStreak) {
        setCompletedSessions(parseInt(savedStreak, 10) || 0)
      }

      // 3. History
      const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY)
      if (savedHistory) {
        setSessionHistory(JSON.parse(savedHistory))
      }

      // 4. Runtime state (penentu kelanjutan timer saat refresh)
      const savedRuntime = localStorage.getItem(RUNTIME_STORAGE_KEY)
      if (savedRuntime) {
        const parsed: PomodoroRuntimeState = JSON.parse(savedRuntime)
        const activeMode = parsed.mode || "focus"
        setMode(activeMode)
        if (parsed.activeTab) setActiveTab(parsed.activeTab)

        const restoredTimeLeft = parsed.timeLeftPerMode || {
          focus: (loadedDurations.focus || 25) * 60,
          short_break: (loadedDurations.short_break || 5) * 60,
          long_break: (loadedDurations.long_break || 15) * 60,
        }

        if (parsed.isRunning && parsed.targetEndTimestamp) {
          const now = Date.now()
          const remainingSec = Math.ceil((parsed.targetEndTimestamp - now) / 1000)

          if (remainingSec > 0) {
            // Timer masih berjalan! Lanjutkan dari detik sekarang
            const updatedTimeLeft = {
              ...restoredTimeLeft,
              [activeMode]: remainingSec,
            }
            setTimeLeftPerMode(updatedTimeLeft)
            setIsRunning(true)
            setTargetEndTimestamp(parsed.targetEndTimestamp)
          } else {
            // Timer habis saat browser sedang ditutup / di-refresh
            const updatedTimeLeft = {
              ...restoredTimeLeft,
              [activeMode]: 0,
            }
            setTimeLeftPerMode(updatedTimeLeft)
            setIsRunning(false)
            setTargetEndTimestamp(null)
          }
        } else {
          // Timer sedang pause atau idle saat refresh, pertahankan sisa waktu yang ada
          setTimeLeftPerMode(restoredTimeLeft)
          setIsRunning(false)
          setTargetEndTimestamp(null)
        }
      } else {
        // Belum pernah ada runtime tersimpan, inisialisasi awal
        setTimeLeftPerMode({
          focus: loadedDurations.focus * 60,
          short_break: loadedDurations.short_break * 60,
          long_break: loadedDurations.long_break * 60,
        })
      }
    } catch (err) {
      console.warn("Failed to rehydrate pomodoro state:", err)
    }
  }, [])

  // Sync riwayat sesi dari Supabase jika user sedang login
  React.useEffect(() => {
    if (!user?.id) return
    let isMounted = true
    setIsHistoryLoading(true)

    fetchUserPomodoroSessionsAction({ userId: user.id, limit: 60 })
      .then((res) => {
        if (!isMounted || !res.data || res.data.length === 0) return
        const dbRecords: PomodoroSessionRecord[] = res.data.map((row) => ({
          id: row.id,
          mode: row.mode as PomodoroMode,
          durationMinutes: row.duration_minutes,
          completedAt: row.completed_at,
        }))

        setSessionHistory((prev) => {
          const existingIds = new Set(prev.map((p) => p.id))
          const newUnique = dbRecords.filter((d) => !existingIds.has(d.id))
          const merged = [...prev, ...newUnique].sort(
            (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
          )
          try {
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(merged.slice(0, 100)))
          } catch {}
          return merged.slice(0, 100)
        })
      })
      .catch((err) => console.warn("Failed to fetch sessions from Supabase:", err))
      .finally(() => {
        if (isMounted) setIsHistoryLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [user?.id])

  // Handler saat timer mode aktif selesai
  const handleTimerComplete = React.useCallback(() => {
    const {
      mode: currentMode,
      durations: currentDurations,
      completedSessions: currentStreak,
      soundEnabled: isSound,
      clippyEnabled: isClippy,
      autoStartBreaks: isAuto,
    } = stateRef.current

    setIsRunning(false)
    setTargetEndTimestamp(null)

    // Kembalikan sisa waktu mode yang baru selesai ke durasi penuhnya
    const nextTimeLeft: Record<PomodoroMode, number> = {
      ...stateRef.current.timeLeftPerMode,
      [currentMode]: currentDurations[currentMode] * 60,
    }
    setTimeLeftPerMode(nextTimeLeft)

    const nowIso = new Date().toISOString()
    const record: PomodoroSessionRecord = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `sess_${Date.now()}`,
      mode: currentMode,
      durationMinutes: currentDurations[currentMode],
      completedAt: nowIso,
    }

    // Catat ke state lokal & localStorage
    setSessionHistory((prev) => {
      const updated = [record, ...prev].slice(0, 100)
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated))
      } catch {}
      return updated
    })

    // Simpan ke Supabase di background
    if (user?.id) {
      savePomodoroSessionAction({
        userId: user.id,
        userName: user.name || "Programmer",
        userAvatar: user.avatarUrl || null,
        mode: currentMode,
        durationMinutes: currentDurations[currentMode],
        completedAt: nowIso,
      }).catch((e) => console.warn("Supabase pomodoro save error:", e))
    }

    if (currentMode === "focus") {
      // Selesai fokus
      const newCompleted = currentStreak + 1
      setCompletedSessions(newCompleted)

      try {
        const todayKey = `it-things_pomodoro_streak_${new Date().toISOString().slice(0, 10)}`
        localStorage.setItem(todayKey, newCompleted.toString())
      } catch {}

      if (isSound) {
        playPomodoroChime("focus_done", 0.35)
      }

      if (isClippy) {
        const clippyMessages = [
          "Mantap sesi fokus kelar! Buruan stretching badan dulu bro biar gak jompo!",
          "Time's up! Ayo lurusin punggung, putar bahu, jangan kayak udang!",
          "Sesi deep work selesai! Minum air putih dulu yuk biar otak seger lagi!",
        ]
        const randomMsg = clippyMessages[Math.floor(Math.random() * clippyMessages.length)]
        speak(randomMsg, 7000)
      }

      // Pilih long break setiap kelipatan 4 sesi
      const nextMode: PomodoroMode = newCompleted % 4 === 0 ? "long_break" : "short_break"
      setMode(nextMode)
      setActiveTab("stretch")

      if (isAuto) {
        const autoSeconds = currentDurations[nextMode] * 60
        const autoEnd = Date.now() + autoSeconds * 1000
        setIsRunning(true)
        setTargetEndTimestamp(autoEnd)
        persistRuntime({
          mode: nextMode,
          isRunning: true,
          targetEndTimestamp: autoEnd,
          timeLeftPerMode: nextTimeLeft,
          activeTab: "stretch",
        })
      } else {
        persistRuntime({
          mode: nextMode,
          isRunning: false,
          targetEndTimestamp: null,
          timeLeftPerMode: nextTimeLeft,
          activeTab: "stretch",
        })
      }
    } else {
      // Selesai break
      if (isSound) {
        playPomodoroChime("break_done", 0.3)
      }

      if (isClippy) {
        speak("Istirahat & stretching beres! Yuk gaskeun coding lagi dengan postur tegak!", 6000)
      }

      setMode("focus")
      setActiveTab("timer")

      persistRuntime({
        mode: "focus",
        isRunning: false,
        targetEndTimestamp: null,
        timeLeftPerMode: nextTimeLeft,
        activeTab: "timer",
      })
    }
  }, [user, speak, persistRuntime])

  // Timer loop berbasis targetEndTimestamp (Anti-drift, background-aware, dan immune to reload)
  React.useEffect(() => {
    if (!isRunning || !targetEndTimestamp) return

    const tick = () => {
      const now = Date.now()
      const diffSec = Math.ceil((targetEndTimestamp - now) / 1000)

      if (diffSec <= 0) {
        setTimeLeftPerMode((prev) => ({ ...prev, [mode]: 0 }))
        handleTimerComplete()
      } else {
        setTimeLeftPerMode((prev) => {
          if (prev[mode] === diffSec) return prev
          return { ...prev, [mode]: diffSec }
        })
      }
    }

    // Tick pertama langsung
    tick()

    const interval = setInterval(tick, 500)

    // Re-check saat tab browser kembali aktif setelah di-background
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        tick()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", tick)

    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", tick)
    }
  }, [isRunning, targetEndTimestamp, mode, handleTimerComplete])

  // Ganti mode
  const switchMode = React.useCallback(
    (newMode: PomodoroMode) => {
      setIsRunning(false)
      setTargetEndTimestamp(null)
      setMode(newMode)

      persistRuntime({
        mode: newMode,
        isRunning: false,
        targetEndTimestamp: null,
      })
    },
    [persistRuntime]
  )

  // Start Mode langsung (berganti mode dan langsung mulai timer)
  const startMode = React.useCallback(
    (newMode: PomodoroMode) => {
      const current = stateRef.current
      const secs = current.durations[newMode] * 60
      const endTimestamp = Date.now() + secs * 1000
      const updatedTimeLeft = {
        ...current.timeLeftPerMode,
        [newMode]: secs,
      }
      setMode(newMode)
      setTimeLeftPerMode(updatedTimeLeft)
      setTargetEndTimestamp(endTimestamp)
      setIsRunning(true)

      persistRuntime({
        mode: newMode,
        isRunning: true,
        targetEndTimestamp: endTimestamp,
        timeLeftPerMode: updatedTimeLeft,
      })
    },
    [persistRuntime]
  )

  // Set isRunning secara eksplisit
  const handleSetIsRunning = React.useCallback(
    (running: boolean) => {
      if (running) {
        const current = stateRef.current
        let secs = current.timeLeftPerMode[current.mode]
        if (secs <= 0) {
          secs = current.durations[current.mode] * 60
        }
        const endTimestamp = Date.now() + secs * 1000
        setTargetEndTimestamp(endTimestamp)
        setIsRunning(true)
        persistRuntime({
          isRunning: true,
          targetEndTimestamp: endTimestamp,
        })
      } else {
        const current = stateRef.current
        let remaining = current.timeLeftPerMode[current.mode]
        if (current.targetEndTimestamp) {
          remaining = Math.max(0, Math.ceil((current.targetEndTimestamp - Date.now()) / 1000))
        }
        const updatedTimeLeft = {
          ...current.timeLeftPerMode,
          [current.mode]: remaining,
        }
        setIsRunning(false)
        setTargetEndTimestamp(null)
        setTimeLeftPerMode(updatedTimeLeft)
        persistRuntime({
          isRunning: false,
          targetEndTimestamp: null,
          timeLeftPerMode: updatedTimeLeft,
        })
      }
    },
    [persistRuntime]
  )

  // Toggle Start / Pause
  const togglePlayPause = React.useCallback(() => {
    const current = stateRef.current
    if (current.isRunning) {
      // Pause: hitung sisa detik saat tombol pause ditekan
      let remaining = current.timeLeftPerMode[current.mode]
      if (current.targetEndTimestamp) {
        remaining = Math.max(0, Math.ceil((current.targetEndTimestamp - Date.now()) / 1000))
      }
      const updatedTimeLeft = {
        ...current.timeLeftPerMode,
        [current.mode]: remaining,
      }
      setIsRunning(false)
      setTargetEndTimestamp(null)
      setTimeLeftPerMode(updatedTimeLeft)

      persistRuntime({
        isRunning: false,
        targetEndTimestamp: null,
        timeLeftPerMode: updatedTimeLeft,
      })
    } else {
      // Play: jika waktu sudah 0, isi ulang dengan durasi penuh mode tersebut
      let secs = current.timeLeftPerMode[current.mode]
      if (secs <= 0) {
        secs = current.durations[current.mode] * 60
      }
      const endTimestamp = Date.now() + secs * 1000
      const updatedTimeLeft = {
        ...current.timeLeftPerMode,
        [current.mode]: secs,
      }
      setTimeLeftPerMode(updatedTimeLeft)
      setTargetEndTimestamp(endTimestamp)
      setIsRunning(true)

      persistRuntime({
        isRunning: true,
        targetEndTimestamp: endTimestamp,
        timeLeftPerMode: updatedTimeLeft,
      })
    }
  }, [persistRuntime])

  // Reset timer
  const handleReset = React.useCallback(() => {
    const current = stateRef.current
    const defaultSecs = current.durations[current.mode] * 60
    const updatedTimeLeft = {
      ...current.timeLeftPerMode,
      [current.mode]: defaultSecs,
    }

    setIsRunning(false)
    setTargetEndTimestamp(null)
    setTimeLeftPerMode(updatedTimeLeft)

    persistRuntime({
      isRunning: false,
      targetEndTimestamp: null,
      timeLeftPerMode: updatedTimeLeft,
    })
  }, [persistRuntime])

  // Ubah durasi mode aktif
  const adjustMinutes = React.useCallback(
    (delta: number) => {
      const current = stateRef.current
      if (current.isRunning) return

      const currentMins = current.durations[current.mode]
      const nextMins = Math.max(1, Math.min(120, currentMins + delta))
      const updatedDurations = { ...current.durations, [current.mode]: nextMins }
      const updatedTimeLeft = { ...current.timeLeftPerMode, [current.mode]: nextMins * 60 }

      setDurations(updatedDurations)
      setTimeLeftPerMode(updatedTimeLeft)
      saveSettings(updatedDurations)

      persistRuntime({
        durations: updatedDurations,
        timeLeftPerMode: updatedTimeLeft,
      })
    },
    [saveSettings, persistRuntime]
  )

  // Preset durasi
  const setPresetMinutes = React.useCallback(
    (targetMode: PomodoroMode, mins: number) => {
      const current = stateRef.current
      if (current.isRunning) return

      const updatedDurations = { ...current.durations, [targetMode]: mins }
      const updatedTimeLeft = { ...current.timeLeftPerMode, [targetMode]: mins * 60 }

      setDurations(updatedDurations)
      setTimeLeftPerMode(updatedTimeLeft)
      saveSettings(updatedDurations)

      persistRuntime({
        durations: updatedDurations,
        timeLeftPerMode: updatedTimeLeft,
      })
    },
    [saveSettings, persistRuntime]
  )

  // Hapus riwayat
  const handleClearHistory = React.useCallback(async () => {
    setSessionHistory([])
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY)
    } catch {}

    if (user?.id) {
      await clearUserPomodoroSessionsAction({ userId: user.id }).catch(() => {})
    }
  }, [user?.id])

  // Update setter untuk sound & clippy & autoStart
  const handleSetSound = React.useCallback(
    (val: boolean) => {
      setSoundEnabled(val)
      saveSettings(durations, val, clippyEnabled, autoStartBreaks)
    },
    [durations, clippyEnabled, autoStartBreaks, saveSettings]
  )

  const handleSetClippy = React.useCallback(
    (val: boolean) => {
      setClippyEnabled(val)
      saveSettings(durations, soundEnabled, val, autoStartBreaks)
    },
    [durations, soundEnabled, autoStartBreaks, saveSettings]
  )

  const handleSetAutoStart = React.useCallback(
    (val: boolean) => {
      setAutoStartBreaks(val)
      saveSettings(durations, soundEnabled, clippyEnabled, val)
    },
    [durations, soundEnabled, clippyEnabled, saveSettings]
  )

  const handleSetActiveTab = React.useCallback(
    (tab: "timer" | "stretch" | "history" | "about") => {
      setActiveTab(tab)
      persistRuntime({ activeTab: tab })
    },
    [persistRuntime]
  )

  const contextValue = React.useMemo<PomodoroContextType>(
    () => ({
      mode,
      switchMode,
      startMode,
      setMode,
      durations,
      timeLeftPerMode,
      timeLeft: timeLeftPerMode[mode],
      isRunning,
      setIsRunning: handleSetIsRunning,
      completedSessions,
      sessionHistory,
      isHistoryLoading,
      soundEnabled,
      setSoundEnabled: handleSetSound,
      clippyEnabled,
      setClippyEnabled: handleSetClippy,
      autoStartBreaks,
      setAutoStartBreaks: handleSetAutoStart,
      activeTab,
      setActiveTab: handleSetActiveTab,
      togglePlayPause,
      handleReset,
      adjustMinutes,
      setPresetMinutes,
      handleClearHistory,
    }),
    [
      mode,
      switchMode,
      startMode,
      durations,
      timeLeftPerMode,
      isRunning,
      handleSetIsRunning,
      completedSessions,
      sessionHistory,
      isHistoryLoading,
      soundEnabled,
      handleSetSound,
      clippyEnabled,
      handleSetClippy,
      autoStartBreaks,
      handleSetAutoStart,
      activeTab,
      handleSetActiveTab,
      togglePlayPause,
      handleReset,
      adjustMinutes,
      setPresetMinutes,
      handleClearHistory,
    ]
  )

  return <PomodoroContext.Provider value={contextValue}>{children}</PomodoroContext.Provider>
}

export function usePomodoro() {
  const context = React.useContext(PomodoroContext)
  if (!context) {
    throw new Error("usePomodoro must be used within a PomodoroProvider")
  }
  return context
}
