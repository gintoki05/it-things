"use client"

import * as React from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"
import {
  playRetroCorrectSound,
  playRetroBuzzerSound,
  playRetroNotificationSound,
} from "@/lib/sound-effects"

// ─── 1. Word Bank (200+ Valid 5-Letter Words: IT, Office, & General Indonesian) ──
export const WORDLE_WORD_LIST = [
  // IT & Tech
  "KABEL", "ROBOT", "PIXEL", "MODEM", "CLOUD", "REACT", "BUILD", "STACK",
  "CACHE", "QUERY", "LOGIC", "FIBER", "CYBER", "LINUX", "PROXY", "TOKEN",
  "PATCH", "DEBUG", "MOUSE", "DRIVE", "SHIFT", "ENTER", "RESET", "SHELL",
  "CRASH", "ROUTE", "TRACK", "CLONE", "ASYNC", "ARRAY", "DIGIT", "ERROR",
  "FLASH", "INPUT", "MACRO", "PRINT", "QUEUE", "TABLE", "VIRUS", "AUDIO",
  "VIDEO", "RADIO", "BASIC", "BOARD", "CHIPS", "CODES", "PANEL", "CLICK",

  // Kultur Kantor & Pantry
  "PANTRY", "REKAP", "KARTU", "GALON", "GELAS", "MINUM", "SNACK", "SURAT",
  "LAPAK", "KURSI", "RAPAT", "SENIN", "JUMAT", "MAKAN", "LEMBUR", "BONUS",
  "TEMAN", "TIKET", "ABSEN", "HADIR", "SALDO", "BEBAN", "PULSA", "BAYAR",
  "KASIR", "KANTOR", "PESAN", "TUGAS", "ORDER", "PAKET", "MITRA", "SEGER",

  // Kata Umum Bahasa Indonesia
  "ANGIN", "BADAI", "BALON", "BATIK", "BERAS", "BINTI", "BUKAN", "BUNGA",
  "CANDI", "CERAH", "CERIA", "CINTA", "CUACA", "DANAU", "DUNIA", "ELANG",
  "GAJAH", "GELAP", "HUJAN", "HUTAN", "JALAN", "JARUM", "JERUK", "KAPAL",
  "KASIH", "KELAS", "KORAN", "KUNCI", "LAMPU", "LEBAH", "LEMON", "MACAN",
  "MANIS", "MAWAR", "MEDAN", "MELON", "MOTOR", "MUSIK", "NANAS", "OMBAK",
  "PANTAI", "PASAR", "POHON", "PULAU", "PUTIH", "RUMAH", "SABUN", "SAWAH",
  "SENJA", "SIANG", "SINAR", "SINGA", "SURGA", "TAMAN", "TANAH", "TIMUR",
  "TIANG", "UDARA", "WAJAH", "ZEBRA", "GARIS", "HITAM", "MERAH", "HIJAU",
  "BULAN", "BINTI", "SABTU", "SELAS", "RABUA", "KAMIS", "MALAM", "SUBUH",
]
  .map((w) => w.toUpperCase().trim())
  .filter((w) => w.length === 5)

// Set base date: 2026-01-01 as Day #1
const BASE_DATE = new Date("2026-01-01T00:00:00Z")

export function getTodayDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function getDailyWordlePuzzle(dateStr: string = getTodayDateString()) {
  const targetDate = new Date(`${dateStr}T00:00:00Z`)
  const diffTime = targetDate.getTime() - BASE_DATE.getTime()
  const dayIndex = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))

  // Deterministic seed
  const wordIndex = dayIndex % WORDLE_WORD_LIST.length
  return {
    dayNumber: dayIndex + 1,
    targetDate: dateStr,
    word: WORDLE_WORD_LIST[wordIndex],
  }
}

// ─── 2. Letter & Guess Evaluation ───────────────────────────
export type LetterStatus = "correct" | "present" | "absent" | "empty"

export interface EvaluatedLetter {
  char: string
  status: LetterStatus
}

export function evaluateGuess(guess: string, targetWord: string): EvaluatedLetter[] {
  const result: EvaluatedLetter[] = Array.from({ length: 5 }, (_, i) => ({
    char: guess[i] || "",
    status: "absent",
  }))

  const targetChars = targetWord.split("")
  const letterCounts: Record<string, number> = {}

  // Hitung frekuensi huruf di target
  for (const c of targetChars) {
    letterCounts[c] = (letterCounts[c] || 0) + 1
  }

  // Pass 1: Tandai 'correct' (posisi pas)
  for (let i = 0; i < 5; i++) {
    if (guess[i] === targetChars[i]) {
      result[i].status = "correct"
      letterCounts[guess[i]] -= 1
    }
  }

  // Pass 2: Tandai 'present' (ada tapi posisi beda)
  for (let i = 0; i < 5; i++) {
    if (result[i].status !== "correct") {
      const char = guess[i]
      if (char && letterCounts[char] && letterCounts[char] > 0) {
        result[i].status = "present"
        letterCounts[char] -= 1
      } else {
        result[i].status = "absent"
      }
    }
  }

  return result
}

// ─── 3. Types ───────────────────────────────────────────────
export interface WordleDailyEntry {
  id: string
  userId: string
  userName: string
  userAvatar: string | null
  targetDate: string
  guesses: string[]
  isSolved: boolean
  attempts: number
  createdAt: string
  completedAt: string | null
}

export type KeyboardStatusMap = Record<string, LetterStatus>

// ─── 4. Main Hook: useWordle ────────────────────────────────
export function useWordle() {
  const { user } = useAuth()
  const todayStr = getTodayDateString()
  const puzzle = React.useMemo(() => getDailyWordlePuzzle(todayStr), [todayStr])

  const [myEntry, setMyEntry] = React.useState<WordleDailyEntry | null>(null)
  const [currentGuess, setCurrentGuess] = React.useState<string>("")
  const [leaderboard, setLeaderboard] = React.useState<WordleDailyEntry[]>([])
  const [isLoading, setIsLoading] = React.useState<boolean>(true)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const guesses = myEntry?.guesses || []
  const isSolved = Boolean(myEntry?.isSolved)
  const isGameOver = isSolved || guesses.length >= 6

  // ─── Load User's Entry & Leaderboard ───────────────────────
  const fetchWordleData = React.useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !user) {
      setIsLoading(false)
      return
    }

    try {
      // 1. Fetch User Entry today
      const { data: userEntry, error: userError } = await supabase
        .from("wordle_daily_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("target_date", todayStr)
        .maybeSingle()

      if (!userError && userEntry) {
        setMyEntry({
          id: userEntry.id,
          userId: userEntry.user_id,
          userName: userEntry.user_name,
          userAvatar: userEntry.user_avatar,
          targetDate: userEntry.target_date,
          guesses: userEntry.guesses || [],
          isSolved: userEntry.is_solved,
          attempts: userEntry.attempts,
          createdAt: userEntry.created_at,
          completedAt: userEntry.completed_at,
        })
      }

      // 2. Fetch Today's Leaderboard
      const { data: boardData } = await supabase
        .from("wordle_daily_entries")
        .select("*")
        .eq("target_date", todayStr)
        .order("is_solved", { ascending: false })
        .order("attempts", { ascending: true })
        .order("completed_at", { ascending: true })

      if (boardData) {
        setLeaderboard(
          boardData.map((b) => ({
            id: b.id,
            userId: b.user_id,
            userName: b.user_name,
            userAvatar: b.user_avatar,
            targetDate: b.target_date,
            guesses: b.guesses || [],
            isSolved: b.is_solved,
            attempts: b.attempts,
            createdAt: b.created_at,
            completedAt: b.completed_at,
          }))
        )
      }
    } catch (err) {
      console.warn("fetchWordleData error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [user, todayStr])

  React.useEffect(() => {
    fetchWordleData()
  }, [fetchWordleData])

  // ─── Realtime Leaderboard Subscription ────────────────────
  React.useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return

    const channel = supabase
      .channel(`wordle-daily-${todayStr}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wordle_daily_entries",
        },
        () => {
          fetchWordleData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [todayStr, fetchWordleData])

  // ─── Keyboard Status Aggregator ───────────────────────────
  const keyboardStatuses = React.useMemo<KeyboardStatusMap>(() => {
    const map: KeyboardStatusMap = {}
    for (const guess of guesses) {
      const evaluated = evaluateGuess(guess, puzzle.word)
      for (const { char, status } of evaluated) {
        const current = map[char]
        if (status === "correct") {
          map[char] = "correct"
        } else if (status === "present" && current !== "correct") {
          map[char] = "present"
        } else if (status === "absent" && !current) {
          map[char] = "absent"
        }
      }
    }
    return map
  }, [guesses, puzzle.word])

  // ─── Actions ──────────────────────────────────────────────
  const addLetter = (letter: string) => {
    if (isGameOver || currentGuess.length >= 5) return
    setCurrentGuess((prev) => (prev + letter).slice(0, 5).toUpperCase())
    setErrorMessage(null)
  }

  const removeLetter = () => {
    if (isGameOver || currentGuess.length === 0) return
    setCurrentGuess((prev) => prev.slice(0, -1))
    setErrorMessage(null)
  }

  const submitGuess = async () => {
    if (isGameOver) return

    if (currentGuess.length < 5) {
      setErrorMessage("Kata harus terdiri dari 5 huruf!")
      playRetroBuzzerSound()
      return
    }

    const cleanGuess = currentGuess.toUpperCase().trim()
    const newGuesses = [...guesses, cleanGuess]
    const solved = cleanGuess === puzzle.word
    const gameOverNow = solved || newGuesses.length >= 6
    const attemptsCount = newGuesses.length

    // Optimistic Update
    const optimisticEntry: WordleDailyEntry = {
      id: myEntry?.id || "temp-id",
      userId: user?.id || "anon",
      userName: user?.name || "Anon",
      userAvatar: user?.avatar || null,
      targetDate: todayStr,
      guesses: newGuesses,
      isSolved: solved,
      attempts: attemptsCount,
      createdAt: myEntry?.createdAt || new Date().toISOString(),
      completedAt: gameOverNow ? new Date().toISOString() : null,
    }
    setMyEntry(optimisticEntry)
    setCurrentGuess("")

    if (solved) {
      playRetroCorrectSound()
    } else if (gameOverNow) {
      playRetroBuzzerSound()
    } else {
      playRetroNotificationSound(0.15)
    }

    // Persist to Supabase
    if (isSupabaseConfigured && supabase && user) {
      try {
        await supabase.from("wordle_daily_entries").upsert(
          {
            user_id: user.id,
            user_name: user.name || "Anon",
            user_avatar: user.avatar || null,
            target_date: todayStr,
            guesses: newGuesses,
            is_solved: solved,
            attempts: attemptsCount,
            completed_at: gameOverNow ? new Date().toISOString() : null,
          },
          { onConflict: "user_id,target_date" }
        )
      } catch (err) {
        console.warn("submitGuess error:", err)
      }
    }
  }

  // ─── Copy / Share Emoji Grid ──────────────────────────────
  const generateShareText = () => {
    const attemptStr = isSolved ? `${guesses.length}/6` : "X/6"
    let text = `WORDLE98.EXE #${puzzle.dayNumber} ${attemptStr}\n\n`

    for (const guess of guesses) {
      const evaluated = evaluateGuess(guess, puzzle.word)
      const row = evaluated
        .map((l) => {
          if (l.status === "correct") return "🟩"
          if (l.status === "present") return "🟨"
          return "⬛"
        })
        .join("")
      text += `${row}\n`
    }

    text += `\nIT-THINGS 98 // ${todayStr}`
    return text
  }

  return {
    puzzle,
    myEntry,
    guesses,
    currentGuess,
    isSolved,
    isGameOver,
    isLoading,
    errorMessage,
    keyboardStatuses,
    leaderboard,
    addLetter,
    removeLetter,
    submitGuess,
    generateShareText,
  }
}
