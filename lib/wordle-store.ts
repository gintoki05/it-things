"use client"

import * as React from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"
import {
  playRetroCorrectSound,
  playRetroBuzzerSound,
  playRetroNotificationSound,
} from "@/lib/sound-effects"

// ─── 1. Date Helper ─────────────────────────────────────────
export function getTodayDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// ─── 2. Letter & Guess Types ────────────────────────────────
export type LetterStatus = "correct" | "present" | "absent" | "empty"

export interface EvaluatedLetter {
  char: string
  status: LetterStatus
}

// Fallback client evaluator (if needed for preview/offline)
export function evaluateGuess(guess: string, targetWord?: string): EvaluatedLetter[] {
  const cleanGuess = (guess || "").toUpperCase().trim()
  if (!targetWord) {
    return Array.from({ length: 5 }, (_, i) => ({
      char: cleanGuess[i] || "",
      status: "absent",
    }))
  }

  const cleanTarget = targetWord.toUpperCase().trim()
  const result: EvaluatedLetter[] = Array.from({ length: 5 }, (_, i) => ({
    char: cleanGuess[i] || "",
    status: "absent",
  }))

  const targetChars = cleanTarget.split("")
  const letterCounts: Record<string, number> = {}

  for (const c of targetChars) {
    letterCounts[c] = (letterCounts[c] || 0) + 1
  }

  for (let i = 0; i < 5; i++) {
    if (cleanGuess[i] === targetChars[i]) {
      result[i].status = "correct"
      letterCounts[cleanGuess[i]] -= 1
    }
  }

  for (let i = 0; i < 5; i++) {
    if (result[i].status !== "correct") {
      const char = cleanGuess[i]
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
  guesses?: string[]
  evaluatedGuesses?: EvaluatedLetter[][]
  isSolved: boolean
  attempts: number
  createdAt: string
  completedAt: string | null
}

export type KeyboardStatusMap = Record<string, LetterStatus>

export interface WordlePuzzleMeta {
  dayNumber: number
  targetDate: string
  word?: string // Only sent by server after game is finished
}

// ─── Shared In-Memory State & Deduplication ───────────────────
interface WordleSharedState {
  puzzle: WordlePuzzleMeta
  entry: WordleDailyEntry | null
  leaderboard: WordleDailyEntry[]
}

let cachedWordleState: WordleSharedState = {
  puzzle: { dayNumber: 1, targetDate: getTodayDateString() },
  entry: null,
  leaderboard: [],
}
let inFlightWordlePromise: Promise<WordleSharedState> | null = null
const wordleListeners = new Set<(state: WordleSharedState) => void>()

async function fetchWordleDataDeduplicated(): Promise<WordleSharedState> {
  if (inFlightWordlePromise) {
    return inFlightWordlePromise
  }

  inFlightWordlePromise = (async () => {
    try {
      let token: string | null = null
      if (isSupabaseConfigured && supabase) {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        token = session?.access_token || null
      }

      const res = await fetch("/api/wordle/today", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (res.ok) {
        const data = await res.json()
        cachedWordleState = {
          puzzle: data.puzzle || cachedWordleState.puzzle,
          entry: data.entry || null,
          leaderboard: Array.isArray(data.leaderboard) ? data.leaderboard : [],
        }
        wordleListeners.forEach((listener) => listener(cachedWordleState))
      }
    } catch (err) {
      console.warn("fetchWordleDataDeduplicated error:", err)
    } finally {
      inFlightWordlePromise = null
    }

    return cachedWordleState
  })()

  return inFlightWordlePromise
}

// ─── 4. Main Hook: useWordle ────────────────────────────────
export function useWordle() {
  const { user } = useAuth()
  const todayStr = getTodayDateString()

  const [puzzle, setPuzzle] = React.useState<WordlePuzzleMeta>(cachedWordleState.puzzle)
  const [myEntry, setMyEntry] = React.useState<WordleDailyEntry | null>(cachedWordleState.entry)
  const [guesses, setGuesses] = React.useState<string[]>(cachedWordleState.entry?.guesses || [])
  const [evaluatedGuesses, setEvaluatedGuesses] = React.useState<EvaluatedLetter[][]>(
    cachedWordleState.entry?.evaluatedGuesses || []
  )
  const [currentGuess, setCurrentGuess] = React.useState<string>("")
  const [isSolved, setIsSolved] = React.useState<boolean>(Boolean(cachedWordleState.entry?.isSolved))
  const [isGameOver, setIsGameOver] = React.useState<boolean>(
    Boolean(
      cachedWordleState.entry?.isSolved ||
        (cachedWordleState.entry?.guesses && cachedWordleState.entry.guesses.length >= 6)
    )
  )
  const [leaderboard, setLeaderboard] = React.useState<WordleDailyEntry[]>(
    cachedWordleState.leaderboard
  )
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const applyState = React.useCallback((state: WordleSharedState) => {
    if (state.puzzle) setPuzzle(state.puzzle)
    if (state.entry) {
      setMyEntry(state.entry)
      setGuesses(state.entry.guesses || [])
      setEvaluatedGuesses(state.entry.evaluatedGuesses || [])
      setIsSolved(Boolean(state.entry.isSolved))
      setIsGameOver(
        Boolean(state.entry.isSolved || (state.entry.guesses && state.entry.guesses.length >= 6))
      )
    } else {
      setMyEntry(null)
      setGuesses([])
      setEvaluatedGuesses([])
      setIsSolved(false)
      setIsGameOver(false)
    }
    if (Array.isArray(state.leaderboard)) {
      setLeaderboard(state.leaderboard)
    }
  }, [])

  // ─── Fetch Today's Puzzle & Safe Leaderboard via API ────────
  const fetchWordleData = React.useCallback(async () => {
    setIsLoading(true)
    const result = await fetchWordleDataDeduplicated()
    applyState(result)
    setIsLoading(false)
  }, [applyState])

  React.useEffect(() => {
    const listener = (state: WordleSharedState) => applyState(state)
    wordleListeners.add(listener)

    fetchWordleData()

    return () => {
      wordleListeners.delete(listener)
    }
  }, [fetchWordleData, applyState, user?.id])

  // ─── Realtime Leaderboard Subscription ────────────────────
  React.useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return

    const instanceId = Math.random().toString(36).substring(2, 9)
    const channel = supabase
      .channel(`wordle-daily-${todayStr}-${instanceId}`)
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
      if (supabase) {
        supabase.removeChannel(channel)
      }
    }
  }, [todayStr, fetchWordleData])

  // ─── Keyboard Status Aggregator ───────────────────────────
  const keyboardStatuses = React.useMemo<KeyboardStatusMap>(() => {
    const map: KeyboardStatusMap = {}
    for (const row of evaluatedGuesses) {
      for (const { char, status } of row) {
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
  }, [evaluatedGuesses])

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
    if (isGameOver || isSubmitting) return

    if (currentGuess.length < 5) {
      setErrorMessage("Kata harus terdiri dari 5 huruf!")
      playRetroBuzzerSound()
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      let token: string | null = null
      if (isSupabaseConfigured && supabase) {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        token = session?.access_token || null
      }

      const cleanGuess = currentGuess.toUpperCase().trim()

      const res = await fetch("/api/wordle/guess", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          guess: cleanGuess,
          userName: user?.name,
          userAvatar: user?.avatarUrl || user?.googleAvatarUrl,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Gagal memproses tebakan.")
        playRetroBuzzerSound()
        return
      }

      // Update state with server-verified evaluations
      const newGuesses = data.guesses || [...guesses, cleanGuess]
      const newEvaluations = data.allEvaluations || [...evaluatedGuesses, data.evaluation]

      setGuesses(newGuesses)
      setEvaluatedGuesses(newEvaluations)
      setIsSolved(Boolean(data.isSolved))
      setIsGameOver(Boolean(data.isGameOver))
      setCurrentGuess("")

      if (data.targetWord) {
        setPuzzle((prev) => ({ ...prev, word: data.targetWord }))
      }

      if (data.isSolved) {
        playRetroCorrectSound()
      } else if (data.isGameOver) {
        playRetroBuzzerSound()
      } else {
        playRetroNotificationSound(0.15)
      }

      // Refresh leaderboard list
      fetchWordleData()
    } catch (err) {
      console.warn("submitGuess error:", err)
      setErrorMessage("Terjadi kesalahan jaringan.")
      playRetroBuzzerSound()
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Copy / Share Emoji Grid ──────────────────────────────
  const generateShareText = () => {
    const attemptStr = isSolved ? `${guesses.length}/6` : "X/6"
    let text = `WORDLE98.EXE #${puzzle.dayNumber} ${attemptStr}\n\n`

    for (const row of evaluatedGuesses) {
      const rowStr = row
        .map((l) => {
          if (l.status === "correct") return "🟩"
          if (l.status === "present") return "🟨"
          return "⬛"
        })
        .join("")
      text += `${rowStr}\n`
    }

    text += `\nIT-THINGS 98 // ${todayStr}`
    return text
  }

  return {
    puzzle,
    myEntry,
    guesses,
    evaluatedGuesses,
    currentGuess,
    isSolved,
    isGameOver,
    isLoading,
    isSubmitting,
    errorMessage,
    keyboardStatuses,
    leaderboard,
    addLetter,
    removeLetter,
    submitGuess,
    generateShareText,
    refresh: fetchWordleData,
  }
}
