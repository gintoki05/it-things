"use server"

import {
  getDailyWordlePuzzle,
  getTodayDateString,
  evaluateGuess,
  type EvaluatedLetter,
  type WordleHint,
} from "@/lib/server/wordle"
import { createServerSupabase } from "@/lib/server/supabase-server"

export interface WordleQuizData {
  quizNumber: 1 | 2
  dayNumber: number
  targetDate: string
  hint: WordleHint
  word?: string // Only sent by server after game is finished
  guesses: string[]
  evaluatedGuesses: EvaluatedLetter[][]
  isSolved: boolean
  isGameOver: boolean
  attempts: number
}

export interface WordleTodayResult {
  puzzle: {
    dayNumber: number
    targetDate: string
    quizNumber: 1 | 2
    hint: WordleHint
    word?: string
  }
  quizzes: {
    1: WordleQuizData
    2: WordleQuizData
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

function parseRawGuesses(rawGuesses: string[] = []): {
  q1Guesses: string[]
  q2Guesses: string[]
} {
  const q1Guesses: string[] = []
  const q2Guesses: string[] = []

  for (const item of rawGuesses) {
    if (!item) continue
    if (item.startsWith("Q1:")) {
      q1Guesses.push(item.slice(3).toUpperCase().trim())
    } else if (item.startsWith("Q2:")) {
      q2Guesses.push(item.slice(3).toUpperCase().trim())
    } else {
      // Legacy format (no prefix) belongs to Quiz 1
      q1Guesses.push(item.toUpperCase().trim())
    }
  }

  return { q1Guesses, q2Guesses }
}

function packRawGuesses(q1Guesses: string[], q2Guesses: string[]): string[] {
  return [
    ...q1Guesses.map((g) => `Q1:${g}`),
    ...q2Guesses.map((g) => `Q2:${g}`),
  ]
}

export async function fetchWordleTodayAction(
  token?: string | null
): Promise<WordleTodayResult> {
  const todayStr = getTodayDateString()
  const puzzle1 = getDailyWordlePuzzle(todayStr, 1)
  const puzzle2 = getDailyWordlePuzzle(todayStr, 2)
  const supabase = createServerSupabase(token)

  let rawGuesses: string[] = []
  let userEntry: WordleTodayResult["entry"] = null

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
          rawGuesses = entry.guesses || []
          const { q1Guesses, q2Guesses } = parseRawGuesses(rawGuesses)
          const q1Evals = q1Guesses.map((g) => evaluateGuess(g, puzzle1.word))
          const isQ1Solved = q1Guesses.includes(puzzle1.word)

          userEntry = {
            id: entry.id,
            userId: entry.user_id,
            userName: entry.user_name,
            userAvatar: entry.user_avatar,
            targetDate: entry.target_date,
            guesses: q1Guesses,
            evaluatedGuesses: q1Evals,
            isSolved: isQ1Solved,
            attempts: entry.attempts,
            createdAt: entry.created_at,
            completedAt: entry.completed_at,
          }
        }
      }
    }

    const { q1Guesses, q2Guesses } = parseRawGuesses(rawGuesses)
    const evaluated1 = q1Guesses.map((g) => evaluateGuess(g, puzzle1.word))
    const evaluated2 = q2Guesses.map((g) => evaluateGuess(g, puzzle2.word))

    const isSolved1 = q1Guesses.includes(puzzle1.word)
    const isGameOver1 = isSolved1 || q1Guesses.length >= 6

    const isSolved2 = q2Guesses.includes(puzzle2.word)
    const isGameOver2 = isSolved2 || q2Guesses.length >= 6

    const isAllGameOver = isGameOver1 && isGameOver2

    const quiz1Data: WordleQuizData = {
      quizNumber: 1,
      dayNumber: puzzle1.dayNumber,
      targetDate: puzzle1.targetDate,
      hint: puzzle1.hint,
      word: isGameOver1 ? puzzle1.word : undefined,
      guesses: q1Guesses,
      evaluatedGuesses: evaluated1,
      isSolved: isSolved1,
      isGameOver: isGameOver1,
      attempts: q1Guesses.length,
    }

    const quiz2Data: WordleQuizData = {
      quizNumber: 2,
      dayNumber: puzzle2.dayNumber,
      targetDate: puzzle2.targetDate,
      hint: puzzle2.hint,
      word: isGameOver2 ? puzzle2.word : undefined,
      guesses: q2Guesses,
      evaluatedGuesses: evaluated2,
      isSolved: isSolved2,
      isGameOver: isGameOver2,
      attempts: q2Guesses.length,
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
        dayNumber: puzzle1.dayNumber,
        targetDate: puzzle1.targetDate,
        quizNumber: 1,
        hint: puzzle1.hint,
        word: isGameOver1 ? puzzle1.word : undefined,
      },
      quizzes: {
        1: quiz1Data,
        2: quiz2Data,
      },
      entry: userEntry,
      leaderboard,
      isGameOver: isAllGameOver,
    }
  } catch (err: unknown) {
    const fallbackP1 = getDailyWordlePuzzle(todayStr, 1)
    const fallbackP2 = getDailyWordlePuzzle(todayStr, 2)
    return {
      puzzle: {
        dayNumber: fallbackP1.dayNumber,
        targetDate: fallbackP1.targetDate,
        quizNumber: 1,
        hint: fallbackP1.hint,
        word: undefined,
      },
      quizzes: {
        1: {
          quizNumber: 1,
          dayNumber: fallbackP1.dayNumber,
          targetDate: fallbackP1.targetDate,
          hint: fallbackP1.hint,
          guesses: [],
          evaluatedGuesses: [],
          isSolved: false,
          isGameOver: false,
          attempts: 0,
        },
        2: {
          quizNumber: 2,
          dayNumber: fallbackP2.dayNumber,
          targetDate: fallbackP2.targetDate,
          hint: fallbackP2.hint,
          guesses: [],
          evaluatedGuesses: [],
          isSolved: false,
          isGameOver: false,
          attempts: 0,
        },
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
  quizNumber?: 1 | 2
  userName?: string | null
  userAvatar?: string | null
  token?: string | null
}): Promise<{
  success: boolean
  quizNumber: 1 | 2
  guess?: string
  evaluation?: EvaluatedLetter[]
  allEvaluations?: EvaluatedLetter[][]
  guesses?: string[]
  isSolved?: boolean
  isGameOver?: boolean
  attempts?: number
  targetWord?: string
  quizzes?: {
    1: WordleQuizData
    2: WordleQuizData
  }
  error?: string
}> {
  const { guess, userName, userAvatar, token } = params
  const targetQuiz: 1 | 2 = params.quizNumber === 2 ? 2 : 1

  if (!guess || typeof guess !== "string" || guess.trim().length !== 5) {
    return {
      success: false,
      quizNumber: targetQuiz,
      error: "Kata tebakan harus terdiri dari 5 huruf!",
    }
  }

  const cleanGuess = guess.toUpperCase().trim()
  if (!/^[A-Z]{5}$/.test(cleanGuess)) {
    return {
      success: false,
      quizNumber: targetQuiz,
      error: "Kata hanya boleh mengandung huruf alfabet (A-Z)!",
    }
  }

  const todayStr = getTodayDateString()
  const puzzle1 = getDailyWordlePuzzle(todayStr, 1)
  const puzzle2 = getDailyWordlePuzzle(todayStr, 2)
  const currentPuzzle = targetQuiz === 2 ? puzzle2 : puzzle1

  const evaluated = evaluateGuess(cleanGuess, currentPuzzle.word)
  const isCorrect = cleanGuess === currentPuzzle.word

  const supabase = createServerSupabase(token)

  let q1Guesses: string[] = []
  let q2Guesses: string[] = []

  if (supabase && token) {
    const {
      data: { user },
    } = await supabase.auth.getUser(token)

    if (user) {
      const { data: existingEntry } = await supabase
        .from("wordle_daily_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("target_date", todayStr)
        .maybeSingle()

      if (existingEntry) {
        const parsed = parseRawGuesses(existingEntry.guesses || [])
        q1Guesses = parsed.q1Guesses
        q2Guesses = parsed.q2Guesses

        if (targetQuiz === 1) {
          if (q1Guesses.includes(puzzle1.word) || q1Guesses.length >= 6) {
            return {
              success: false,
              quizNumber: targetQuiz,
              error: "Kuis 1 hari ini sudah selesai!",
            }
          }
          q1Guesses.push(cleanGuess)
        } else {
          if (q2Guesses.includes(puzzle2.word) || q2Guesses.length >= 6) {
            return {
              success: false,
              quizNumber: targetQuiz,
              error: "Kuis 2 hari ini sudah selesai!",
            }
          }
          q2Guesses.push(cleanGuess)
        }

        const isQ1Solved = q1Guesses.includes(puzzle1.word)
        const isQ2Solved = q2Guesses.includes(puzzle2.word)
        const isQ1GameOver = isQ1Solved || q1Guesses.length >= 6
        const isQ2GameOver = isQ2Solved || q2Guesses.length >= 6
        const isAllSolved = isQ1Solved && isQ2Solved
        const isAllGameOver = isQ1GameOver && isQ2GameOver
        const totalAttempts = q1Guesses.length + q2Guesses.length

        await supabase
          .from("wordle_daily_entries")
          .update({
            guesses: packRawGuesses(q1Guesses, q2Guesses),
            attempts: totalAttempts,
            is_solved: isAllSolved,
            completed_at: isAllGameOver ? new Date().toISOString() : null,
            user_name: userName || existingEntry.user_name,
            user_avatar: userAvatar || existingEntry.user_avatar,
          })
          .eq("id", existingEntry.id)
      } else {
        if (targetQuiz === 1) {
          q1Guesses = [cleanGuess]
        } else {
          q2Guesses = [cleanGuess]
        }

        const isQ1Solved = q1Guesses.includes(puzzle1.word)
        const isQ2Solved = q2Guesses.includes(puzzle2.word)
        const isQ1GameOver = isQ1Solved || q1Guesses.length >= 6
        const isQ2GameOver = isQ2Solved || q2Guesses.length >= 6
        const isAllSolved = isQ1Solved && isQ2Solved
        const isAllGameOver = isQ1GameOver && isQ2GameOver

        await supabase.from("wordle_daily_entries").insert({
          user_id: user.id,
          user_name: userName || "Pemain Retro",
          user_avatar: userAvatar || null,
          target_date: todayStr,
          guesses: packRawGuesses(q1Guesses, q2Guesses),
          attempts: 1,
          is_solved: isAllSolved,
          completed_at: isAllGameOver ? new Date().toISOString() : null,
        })
      }
    } else {
      // Unauthenticated offline session
      if (targetQuiz === 1) q1Guesses = [cleanGuess]
      else q2Guesses = [cleanGuess]
    }
  } else {
    // Unauthenticated offline session
    if (targetQuiz === 1) q1Guesses = [cleanGuess]
    else q2Guesses = [cleanGuess]
  }

  const currentGuesses = targetQuiz === 2 ? q2Guesses : q1Guesses
  const allEvaluations = currentGuesses.map((g) => evaluateGuess(g, currentPuzzle.word))
  const isSolved = currentGuesses.includes(currentPuzzle.word)
  const isGameOver = isSolved || currentGuesses.length >= 6

  const isQ1Solved = q1Guesses.includes(puzzle1.word)
  const isQ2Solved = q2Guesses.includes(puzzle2.word)
  const isQ1GameOver = isQ1Solved || q1Guesses.length >= 6
  const isQ2GameOver = isQ2Solved || q2Guesses.length >= 6

  const quiz1Data: WordleQuizData = {
    quizNumber: 1,
    dayNumber: puzzle1.dayNumber,
    targetDate: puzzle1.targetDate,
    hint: puzzle1.hint,
    word: isQ1GameOver ? puzzle1.word : undefined,
    guesses: q1Guesses,
    evaluatedGuesses: q1Guesses.map((g) => evaluateGuess(g, puzzle1.word)),
    isSolved: isQ1Solved,
    isGameOver: isQ1GameOver,
    attempts: q1Guesses.length,
  }

  const quiz2Data: WordleQuizData = {
    quizNumber: 2,
    dayNumber: puzzle2.dayNumber,
    targetDate: puzzle2.targetDate,
    hint: puzzle2.hint,
    word: isQ2GameOver ? puzzle2.word : undefined,
    guesses: q2Guesses,
    evaluatedGuesses: q2Guesses.map((g) => evaluateGuess(g, puzzle2.word)),
    isSolved: isQ2Solved,
    isGameOver: isQ2GameOver,
    attempts: q2Guesses.length,
  }

  return {
    success: true,
    quizNumber: targetQuiz,
    guess: cleanGuess,
    evaluation: evaluated,
    allEvaluations,
    guesses: currentGuesses,
    isSolved,
    isGameOver,
    attempts: currentGuesses.length,
    targetWord: isGameOver ? currentPuzzle.word : undefined,
    quizzes: {
      1: quiz1Data,
      2: quiz2Data,
    },
  }
}
