"use client"

import * as React from "react"
import {
  INDONESIA_CITIES,
  DEFAULT_CITY,
  CityLocation,
  PrayerSchedule,
  NextPrayerInfo,
  calculatePrayerTimes,
  getNextPrayer,
} from "./prayer-times"
import {
  AdzanSoundType,
  playAdzanSound,
  stopAdzanAudio,
  playRetroAdzanChime,
  playClippyPopSound,
  playRetroNotificationSound,
} from "./sound-effects"

export type ClippyCharacter = "clippy"

interface ClippyContextType {
  enabled: boolean
  setEnabled: (val: boolean) => void
  character: ClippyCharacter
  selectedCity: CityLocation
  setSelectedCityId: (id: string) => void
  soundEnabled: boolean
  setSoundEnabled: (val: boolean) => void
  adzanSound: AdzanSoundType
  setAdzanSound: (val: AdzanSoundType) => void
  playAdzanTest: (sound?: AdzanSoundType) => void
  stopAdzanTest: () => void
  playingSoundId: string | null
  reminder10Min: boolean
  setReminder10Min: (val: boolean) => void
  minimized: boolean
  setMinimized: (val: boolean) => void
  toggleMinimized: () => void

  // Prayer Info
  schedule: PrayerSchedule
  nextPrayer: NextPrayerInfo

  // Speech Balloon
  speechText: string
  speechVisible: boolean
  setSpeechVisible: (val: boolean) => void
  speak: (text: string, durationMs?: number, playPop?: boolean) => void
  showPrayerCountdown: () => void
  triggerRandomQuote: () => void

  // Dialog window JADWAL_SHOLAT.EXE
  isPrayerDialogOpen: boolean
  openPrayerDialog: () => void
  closePrayerDialog: () => void
}

const STORAGE_KEY_CONFIG = "it_things_clippy_config_v1"

const RANDOM_QUOTES = [
  "Udah minum air putih belum rek? Jaga ginjal biar ngoding tetap gacor! 💧",
  "Punggung tegak dulu! Tarik bahu ke belakang, jangan sampai encok. 🧘",
  "Waktu sholat adalah jeda paling berkah di sela-sela debugging tanpa henti. 🕌",
  "Jangan lupa aturan 20-20-20: Tiap 20 menit, pandang objek sejauh 6 meter selama 20 detik. 👀",
  "Commit yang rapi ya, jangan cuma 'fix bug' atau 'asdfg'. Kasian temen satu tim! 💻",
  "Lagi stuck sama bug? Coba tinggal wudhu dan sholat dulu, biasanya dapet pencerahan. ✨",
  "Jangan lupa cek snack atau kopi di Pantry.exe kalau lagi suntuk! ☕",
  "Kerapihan kode itu sebagian dari iman developer. 🌟",
]

const ClippyContext = React.createContext<ClippyContextType | undefined>(undefined)

export function ClippyProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = React.useState<boolean>(true)
  const character: ClippyCharacter = "clippy"
  const [cityId, setCityIdState] = React.useState<string>(DEFAULT_CITY.id)
  const [soundEnabled, setSoundEnabledState] = React.useState<boolean>(true)
  const [adzanSound, setAdzanSoundState] = React.useState<AdzanSoundType>("makkah")
  const [playingSoundId, setPlayingSoundId] = React.useState<string | null>(null)
  const [reminder10Min, setReminder10MinState] = React.useState<boolean>(true)
  const [minimized, setMinimizedState] = React.useState<boolean>(true)

  const [speechText, setSpeechText] = React.useState<string>("")
  const [speechVisible, setSpeechVisible] = React.useState<boolean>(false)
  const [isPrayerDialogOpen, setIsPrayerDialogOpen] = React.useState<boolean>(false)

  // Tracker alert agar tidak berbunyi berulang di menit yang sama
  const lastAlertKeyRef = React.useRef<string>("")
  const dismissTimerRef = React.useRef<NodeJS.Timeout | null>(null)

  // Load preferences from localStorage on mount
  React.useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed.enabled === "boolean") setEnabledState(parsed.enabled)
        if (parsed.cityId && parsed.cityId !== "jakarta") {
          setCityIdState(parsed.cityId)
        } else {
          setCityIdState("palembang")
        }
        if (typeof parsed.soundEnabled === "boolean") setSoundEnabledState(parsed.soundEnabled)
        if (parsed.adzanSound) setAdzanSoundState(parsed.adzanSound)
        if (typeof parsed.reminder10Min === "boolean") setReminder10MinState(parsed.reminder10Min)
      }
    } catch {
      // ignore
    }
  }, [])

  const saveConfig = React.useCallback(
    (newConfig: Partial<{
      enabled: boolean
      cityId: string
      soundEnabled: boolean
      adzanSound: AdzanSoundType
      reminder10Min: boolean
      minimized: boolean
    }>) => {
      if (typeof window === "undefined") return
      try {
        const current = {
          enabled,
          cityId,
          soundEnabled,
          adzanSound,
          reminder10Min,
          minimized,
          ...newConfig,
        }
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(current))
      } catch {
        // ignore
      }
    },
    [enabled, cityId, soundEnabled, adzanSound, reminder10Min, minimized]
  )

  const setEnabled = (val: boolean) => {
    setEnabledState(val)
    saveConfig({ enabled: val })
  }

  const setSelectedCityId = (id: string) => {
    setCityIdState(id)
    saveConfig({ cityId: id })
  }

  const setSoundEnabled = (val: boolean) => {
    setSoundEnabledState(val)
    saveConfig({ soundEnabled: val })
  }

  const setAdzanSound = (sound: AdzanSoundType) => {
    setAdzanSoundState(sound)
    saveConfig({ adzanSound: sound })
  }

  const stopAdzanTest = React.useCallback(() => {
    stopAdzanAudio()
    setPlayingSoundId(null)
  }, [])

  const playAdzanTest = React.useCallback(
    (sound?: AdzanSoundType) => {
      const target = sound || adzanSound
      if (playingSoundId === target) {
        stopAdzanAudio()
        setPlayingSoundId(null)
        return
      }
      setPlayingSoundId(target)
      playAdzanSound(target, 0.5, () => {
        setPlayingSoundId((curr) => (curr === target ? null : curr))
      })
    },
    [adzanSound, playingSoundId]
  )

  const setReminder10Min = (val: boolean) => {
    setReminder10MinState(val)
    saveConfig({ reminder10Min: val })
  }

  const setMinimized = (val: boolean) => {
    setMinimizedState(val)
    saveConfig({ minimized: val })
  }

  const toggleMinimized = () => {
    setMinimizedState((prev) => {
      const next = !prev
      saveConfig({ minimized: next })
      return next
    })
  }

  const selectedCity = React.useMemo(() => {
    return INDONESIA_CITIES.find((c) => c.id === cityId) || DEFAULT_CITY
  }, [cityId])

  // Hitung jadwal sholat harian
  const [currentTime, setCurrentTime] = React.useState<Date>(new Date())

  // Ticker per 10 detik untuk kalkulasi countdown akurat
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  const schedule = React.useMemo(() => {
    return calculatePrayerTimes(currentTime, selectedCity)
  }, [currentTime, selectedCity])

  const nextPrayer = React.useMemo(() => {
    return getNextPrayer(schedule, currentTime)
  }, [schedule, currentTime])

  const speak = React.useCallback(
    (text: string, durationMs = 8000, playPop = true) => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current)
      }
      setSpeechText(text)
      setSpeechVisible(true)
      if (soundEnabled && playPop) {
        playClippyPopSound(0.12)
      }

      if (durationMs > 0) {
        dismissTimerRef.current = setTimeout(() => {
          setSpeechVisible(false)
        }, durationMs)
      }
    },
    [soundEnabled]
  )

  const showPrayerCountdown = React.useCallback(() => {
    speak(
      `🕌 ${nextPrayer.name} dalam ${nextPrayer.formattedCountdown} (${nextPrayer.time} ${selectedCity.tzLabel}) • ${selectedCity.name}`,
      6000
    )
  }, [nextPrayer, selectedCity, speak])


  const triggerRandomQuote = React.useCallback(() => {
    const random = RANDOM_QUOTES[Math.floor(Math.random() * RANDOM_QUOTES.length)]
    speak(random)
  }, [speak])

  // Otomatis ingatkan saat persiapan (H-5 menit biasa, H-10 menit Jumatan) atau saat Adzan tiba
  React.useEffect(() => {
    if (!enabled) return

    const nowStr = `${currentTime.getFullYear()}-${currentTime.getMonth()}-${currentTime.getDate()}`
    const isFriday = currentTime.getDay() === 5
    const isJumatan = isFriday && nextPrayer.name === "Dzuhur"
    const preMinutes = isJumatan ? 10 : 5
    const alertPreKey = `${nowStr}-${nextPrayer.name}-${preMinutes}min`
    const alertDueKey = `${nowStr}-${nextPrayer.name}-due`

    // Cek pengingat persiapan (H-5 menit biasa, H-10 menit Jumatan) - Hening tanpa suara notifikasi
    if (
      reminder10Min &&
      nextPrayer.remainingMinutes === preMinutes &&
      lastAlertKeyRef.current !== alertPreKey
    ) {
      lastAlertKeyRef.current = alertPreKey
      if (isJumatan) {
        speak(
          `🕌 10 menit menuju Sholat Jumat (${nextPrayer.time} ${selectedCity.tzLabel})! Yuk bersiap-siap sejenak dan jalan ke masjid.`,
          14000,
          false
        )
      } else {
        speak(
          `⏰ 5 menit menuju waktu ${nextPrayer.name} (${nextPrayer.time} ${selectedCity.tzLabel})! Yuk bersiap-siap sejenak.`,
          12000,
          false
        )
      }
      // Suara notif/azan tidak berbunyi 5 menit sebelum, melainkan tepat saat jadwal sholat tiba
    }

    // Cek saat waktu sholat tiba (tepat saat jadwalnya tiba)
    if (nextPrayer.isDueNow && lastAlertKeyRef.current !== alertDueKey) {
      lastAlertKeyRef.current = alertDueKey
      const isFardhu = ["Subuh", "Dzuhur", "Ashar", "Maghrib", "Isya"].includes(nextPrayer.name)
      if (isJumatan) {
        speak(
          `🕌 Waktu Sholat Jumat telah tiba (${nextPrayer.time} ${selectedCity.tzLabel})! Mari tunaikan ibadah sholat Jumat.`,
          16000
        )
      } else if (nextPrayer.name === "Terbit") {
        speak(
          `🌅 Matahari telah terbit (${nextPrayer.time} ${selectedCity.tzLabel}). Waktu Subuh telah berakhir.`,
          12000,
          false
        )
      } else if (nextPrayer.name === "Imsak") {
        speak(
          `⏳ Waktu Imsak telah tiba (${nextPrayer.time} ${selectedCity.tzLabel})! Waktu sahur segera berakhir.`,
          12000
        )
      } else if (nextPrayer.name === "Dhuha") {
        speak(
          `☀️ Waktu Dhuha telah tiba (${nextPrayer.time} ${selectedCity.tzLabel})! Selamat menunaikan sholat sunnah Dhuha.`,
          12000
        )
      } else {
        speak(
          `🕌 Waktu ${nextPrayer.name} telah tiba (${nextPrayer.time} ${selectedCity.tzLabel})! Mari tunaikan sholat.`,
          15000
        )
      }

      // Suara notif/azan dibunyikan tepat saat jadwalnya tiba
      if (soundEnabled && (isFardhu || isJumatan)) {
        playAdzanSound(adzanSound, 0.5)
      } else if (soundEnabled && (nextPrayer.name === "Imsak" || nextPrayer.name === "Dhuha")) {
        playRetroNotificationSound(0.3)
      }
    }
  }, [currentTime, nextPrayer, reminder10Min, soundEnabled, adzanSound, enabled, selectedCity, speak])

  // Notifikasi balon hanya muncul saat H-5/H-10 sholat, waktu sholat tiba, atau saat Clippy diklik manual



  const openPrayerDialog = () => setIsPrayerDialogOpen(true)
  const closePrayerDialog = () => setIsPrayerDialogOpen(false)

  return (
    <ClippyContext.Provider
      value={{
        enabled,
        setEnabled,
        character,
        selectedCity,
        setSelectedCityId,
        soundEnabled,
        setSoundEnabled,
        adzanSound,
        setAdzanSound,
        playAdzanTest,
        stopAdzanTest,
        playingSoundId,
        reminder10Min,
        setReminder10Min,
        minimized,
        setMinimized,
        toggleMinimized,
        schedule,
        nextPrayer,
        speechText,
        speechVisible,
        setSpeechVisible,
        speak,
        showPrayerCountdown,
        triggerRandomQuote,
        isPrayerDialogOpen,
        openPrayerDialog,
        closePrayerDialog,
      }}
    >
      {children}
    </ClippyContext.Provider>
  )
}

export function useClippy() {
  const ctx = React.useContext(ClippyContext)
  if (!ctx) {
    throw new Error("useClippy must be used within a ClippyProvider")
  }
  return ctx
}
