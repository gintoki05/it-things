"use server"

import {
  getDailyWordlePuzzle,
  getTodayDateString,
  evaluateGuess,
  type EvaluatedLetter,
} from "@/lib/server/wordle"
import { createServerSupabase } from "@/lib/server/supabase-server"

export interface WordleTodayResult {
  puzzle: {
    dayNumber: number
    targetDate: string
    word?: string
  }
  entry: {
    id: string
    userId: string
    userName: string
    userAvatar: string | null
    targetDate: string
    guesses: string[]
    evaluatedGuesses: EvaluatedLetter[][]
    isSolved: boolean
    attempts: number
    createdAt: string
    completedAt: string | null
  } | null
  leaderboard: any[]
  isGameOver: boolean
  error?: string
}

export async function fetchWordleTodayAction(
  token?: string | null
): Promise<WordleTodayResult> {
  const todayStr = getTodayDateString()
  const puzzle = getDailyWordlePuzzle(todayStr)
  const supabase = createServerSupabase(token)

  let userEntry = null
  let evaluatedGuesses: EvaluatedLetter[][] = []
  let isGameOver = false

  try {
    if (supabase && token) {
      const {
        data: { user },
      } = await supabase.auth.getUser(token)

      if (user) {
        const { data: entry } = await supabase
          .from("wordle_daily_entries")
          .select("*")
          .eq("user_id", user.id)
          .eq("target_date", todayStr)
          .maybeSingle()

        if (entry) {
          const guesses: string[] = entry.guesses || []
          evaluatedGuesses = guesses.map((g) => evaluateGuess(g, puzzle.word))
          isGameOver = Boolean(entry.is_solved || guesses.length >= 6)

          userEntry = {
            id: entry.id,
            userId: entry.user_id,
            userName: entry.user_name,
            userAvatar: entry.user_avatar,
            targetDate: entry.target_date,
            guesses,
            evaluatedGuesses,
            isSolved: entry.is_solved,
            attempts: entry.attempts,
            createdAt: entry.created_at,
            completedAt: entry.completed_at,
          }
        }
      }
    }

    // Fetch leaderboard
    let leaderboard: any[] = []
    if (supabase) {
      const { data: lbData } = await (supabase as any)
        .from("wordle_leaderboard")
        .select("*")
        .eq("target_date", todayStr)
        .order("is_solved", { ascending: false })
        .order("attempts", { ascending: true })
        .order("completed_at", { ascending: true })
        .limit(20)

      if (lbData) {
        leaderboard = lbData.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          userName: row.user_name,
          userAvatar: row.user_avatar,
          targetDate: row.target_date,
          isSolved: row.is_solved,
          attempts: row.attempts,
          completedAt: row.completed_at,
        }))
      }
    }

    return {
      puzzle: {
        dayNumber: puzzle.dayNumber,
        targetDate: puzzle.targetDate,
        word: isGameOver ? puzzle.word : undefined,
      },
      entry: userEntry,
      leaderboard,
      isGameOver,
    }
  } catch (err: unknown) {
    return {
      puzzle: {
        dayNumber: puzzle.dayNumber,
        targetDate: puzzle.targetDate,
        word: undefined,
      },
      entry: null,
      leaderboard: [],
      isGameOver: false,
      error: err instanceof Error ? err.message : "Error fetching wordle",
    }
  }
}

export async function submitWordleGuessAction(params: {
  guess: string
  userName?: string | null
  userAvatar?: string | null
  token?: string | null
}): Promise<{
  success: boolean
  guess?: string
  evaluation?: EvaluatedLetter[]
  allEvaluations?: EvaluatedLetter[][]
  guesses?: string[]
  isSolved?: boolean
  isGameOver?: boolean
  attempts?: number
  targetWord?: string
  error?: string
}> {
  const { guess, userName, userAvatar, token } = params

  if (!guess || typeof guess !== "string" || guess.trim().length !== 5) {
    return { success: false, error: "Kata tebakan harus terdiri dari 5 huruf!" }
  }

  const cleanGuess = guess.toUpperCase().trim()
  if (!/^[A-Z]{5}$/.test(cleanGuess)) {
    return { success: false, error: "Kata hanya boleh mengandung huruf alfabet (A-Z)!" }
  }

  const todayStr = getTodayDateString()
  const puzzle = getDailyWordlePuzzle(todayStr)
  const evaluated = evaluateGuess(cleanGuess, puzzle.word)
  const isCorrect = cleanGuess === puzzle.word

  const supabase = createServerSupabase(token)

  let currentGuesses: string[] = [cleanGuess]
  let isSolved = isCorrect
  let attempts = 1
  let isGameOver = isSolved || attempts >= 6
  let completedAt: string | null = isGameOver ? new Date().toISOString() : null

  if (supabase && token) {
    const {
      data: { user },
    } = await supabase.auth.getUser(token)

    if (user) {
      // Check existing attempts today
      const { data: existingEntry } = await supabase
        .from("wordle_daily_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("target_date", todayStr)
        .maybeSingle()

      if (existingEntry) {
        const existingGuesses: string[] = existingEntry.guesses || []

        if (existingEntry.is_solved || existingGuesses.length >= 6) {
          return {
            success: false,
            error: "Permainan hari ini sudah selesai!",
          }
        }

        currentGuesses = [...existingGuesses, cleanGuess]
        attempts = currentGuesses.length
        isSolved = isCorrect || existingEntry.is_solved
        isGameOver = isSolved || attempts >= 6
        completedAt = isGameOver ? new Date().toISOString() : null

        await supabase
          .from("wordle_daily_entries")
          .update({
            guesses: currentGuesses,
            attempts,
            is_solved: isSolved,
            completed_at: completedAt,
            user_name: userName || existingEntry.user_name,
            user_avatar: userAvatar || existingEntry.user_avatar,
          })
          .eq("id", existingEntry.id)
      } else {
        await supabase.from("wordle_daily_entries").insert({
          user_id: user.id,
          user_name: userName || "Pemain Retro",
          user_avatar: userAvatar || null,
          target_date: todayStr,
          guesses: currentGuesses,
          attempts: 1,
          is_solved: isSolved,
          completed_at: completedAt,
        })
      }
    }
  }

  const allEvaluations = currentGuesses.map((g) => evaluateGuess(g, puzzle.word))

  return {
    success: true,
    guess: cleanGuess,
    evaluation: evaluated,
    allEvaluations,
    guesses: currentGuesses,
    isSolved,
    isGameOver,
    attempts,
    targetWord: isGameOver ? puzzle.word : undefined,
  }
}
