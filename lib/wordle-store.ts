"use client"

import * as React from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"
import {
  playRetroCorrectSound,
  playRetroBuzzerSound,
  playRetroNotificationSound,
} from "@/lib/sound-effects"
import {
  fetchWordleTodayAction,
  submitWordleGuessAction,
  type WordleQuizData,
  type WordleTodayResult,
} from "@/app/actions/wordle"
import type { WordleHint } from "@/lib/server/wordle"

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

export { type WordleHint, type WordleQuizData, type WordleTodayResult }

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
  quizNumber: 1 | 2
  hint: WordleHint
  word?: string // Only sent by server after game is finished
}

// ─── Shared In-Memory State & Deduplication ───────────────────
interface WordleSharedState {
  targetDate: string
  quizzes: {
    1: WordleQuizData
    2: WordleQuizData
  }
  entry: WordleDailyEntry | null
  leaderboard: WordleDailyEntry[]
}

const defaultHint: WordleHint = {
  category: "Kata Harian",
  clue: "Tebak kata 5 huruf rahasia hari ini",
  firstLetter: "",
}

const defaultQuiz1: WordleQuizData = {
  quizNumber: 1,
  dayNumber: 1,
  targetDate: getTodayDateString(),
  hint: defaultHint,
  guesses: [],
  evaluatedGuesses: [],
  isSolved: false,
  isGameOver: false,
  attempts: 0,
}

const defaultQuiz2: WordleQuizData = {
  quizNumber: 2,
  dayNumber: 1,
  targetDate: getTodayDateString(),
  hint: defaultHint,
  guesses: [],
  evaluatedGuesses: [],
  isSolved: false,
  isGameOver: false,
  attempts: 0,
}

let cachedWordleState: WordleSharedState = {
  targetDate: getTodayDateString(),
  quizzes: {
    1: defaultQuiz1,
    2: defaultQuiz2,
  },
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

      const data = await fetchWordleTodayAction(token)
      if (!data.error && data.quizzes) {
        cachedWordleState = {
          targetDate: data.quizzes[1]?.targetDate || cachedWordleState.targetDate,
          quizzes: data.quizzes,
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

  const [activeQuiz, setActiveQuiz] = React.useState<1 | 2>(1)
  const [quizzes, setQuizzes] = React.useState<{ 1: WordleQuizData; 2: WordleQuizData }>(
    cachedWordleState.quizzes
  )
  const [currentGuess, setCurrentGuess] = React.useState<string>("")
  const [showHint, setShowHint] = React.useState<boolean>(false)
  const [leaderboard, setLeaderboard] = React.useState<WordleDailyEntry[]>(
    cachedWordleState.leaderboard
  )
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const activeQuizData = quizzes[activeQuiz] || defaultQuiz1

  const applyState = React.useCallback((state: WordleSharedState) => {
    if (state.quizzes) {
      setQuizzes(state.quizzes)
    }
    if (Array.isArray(state.leaderboard)) {
      setLeaderboard(state.leaderboard)
    }
  }, [])

  // ─── Fetch Today's Puzzle & Safe Leaderboard via Server Action ──
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

  // ─── Keyboard Status Aggregator per Active Quiz ────────────
  const keyboardStatuses = React.useMemo<KeyboardStatusMap>(() => {
    const map: KeyboardStatusMap = {}
    for (const row of activeQuizData.evaluatedGuesses || []) {
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
  }, [activeQuizData.evaluatedGuesses])

  // ─── Switch Active Quiz ────────────────────────────────────
  const switchQuiz = (quizNumber: 1 | 2) => {
    if (activeQuiz === quizNumber) return
    setActiveQuiz(quizNumber)
    setCurrentGuess("")
    setErrorMessage(null)
  }

  // ─── Actions ──────────────────────────────────────────────
  const addLetter = (letter: string) => {
    if (activeQuizData.isGameOver || currentGuess.length >= 5) return
    setCurrentGuess((prev) => (prev + letter).slice(0, 5).toUpperCase())
    setErrorMessage(null)
  }

  const removeLetter = () => {
    if (activeQuizData.isGameOver || currentGuess.length === 0) return
    setCurrentGuess((prev) => prev.slice(0, -1))
    setErrorMessage(null)
  }

  const submitGuess = async () => {
    if (activeQuizData.isGameOver || isSubmitting) return

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

      const data = await submitWordleGuessAction({
        guess: cleanGuess,
        quizNumber: activeQuiz,
        userName: user?.name,
        userAvatar: user?.avatarUrl || user?.googleAvatarUrl,
        token,
      })

      if (!data.success) {
        setErrorMessage(data.error || "Gagal memproses tebakan.")
        playRetroBuzzerSound()
        return
      }

      if (data.quizzes) {
        setQuizzes(data.quizzes)
        cachedWordleState.quizzes = data.quizzes
      }

      setCurrentGuess("")

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

  // ─── Copy / Share Emoji Grid for Both Quizzes ──────────────
  const generateShareText = () => {
    const q1 = quizzes[1]
    const q2 = quizzes[2]
    const attemptStr1 = q1.isSolved ? `${q1.guesses.length}/6` : q1.isGameOver ? "X/6" : "-/6"
    const attemptStr2 = q2.isSolved ? `${q2.guesses.length}/6` : q2.isGameOver ? "X/6" : "-/6"

    let text = `WORDLE98.EXE #${q1.dayNumber}\n\n`
    text += `[KUIS 1] (${attemptStr1})\n`
    if (q1.evaluatedGuesses && q1.evaluatedGuesses.length > 0) {
      for (const row of q1.evaluatedGuesses) {
        text +=
          row
            .map((l) => (l.status === "correct" ? "🟩" : l.status === "present" ? "🟨" : "⬛"))
            .join("") + "\n"
      }
    } else {
      text += "Belum dimainkan\n"
    }

    text += `\n[KUIS 2] (${attemptStr2})\n`
    if (q2.evaluatedGuesses && q2.evaluatedGuesses.length > 0) {
      for (const row of q2.evaluatedGuesses) {
        text +=
          row
            .map((l) => (l.status === "correct" ? "🟩" : l.status === "present" ? "🟨" : "⬛"))
            .join("") + "\n"
      }
    } else {
      text += "Belum dimainkan\n"
    }

    text += `\nIT-THINGS 98 // ${todayStr}`
    return text
  }

  const isAllGameOver = Boolean(quizzes[1]?.isGameOver && quizzes[2]?.isGameOver)
  const isAllSolved = Boolean(quizzes[1]?.isSolved && quizzes[2]?.isSolved)

  return {
    activeQuiz,
    quizzes,
    activeQuizData,
    puzzle: {
      dayNumber: activeQuizData.dayNumber,
      targetDate: activeQuizData.targetDate,
      quizNumber: activeQuiz,
      hint: activeQuizData.hint,
      word: activeQuizData.word,
    },
    guesses: activeQuizData.guesses || [],
    evaluatedGuesses: activeQuizData.evaluatedGuesses || [],
    currentGuess,
    isSolved: activeQuizData.isSolved,
    isGameOver: activeQuizData.isGameOver,
    isAllGameOver,
    isAllSolved,
    isLoading,
    isSubmitting,
    errorMessage,
    keyboardStatuses,
    leaderboard,
    showHint,
    setShowHint,
    toggleHint: () => setShowHint((prev) => !prev),
    switchQuiz,
    addLetter,
    removeLetter,
    submitGuess,
    generateShareText,
    refresh: fetchWordleData,
  }
}
