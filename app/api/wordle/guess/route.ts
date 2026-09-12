import { NextResponse } from "next/server"
import {
  getDailyWordlePuzzle,
  getTodayDateString,
  evaluateGuess,
} from "@/lib/server/wordle"
import { createServerSupabase } from "@/lib/server/supabase-server"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")
    const body = await req.json()
    const { guess, userName, userAvatar } = body

    if (!guess || typeof guess !== "string" || guess.trim().length !== 5) {
      return NextResponse.json(
        { error: "Kata tebakan harus terdiri dari 5 huruf!" },
        { status: 400 }
      )
    }

    const cleanGuess = guess.toUpperCase().trim()
    if (!/^[A-Z]{5}$/.test(cleanGuess)) {
      return NextResponse.json(
        { error: "Kata hanya boleh mengandung huruf alfabet (A-Z)!" },
        { status: 400 }
      )
    }

    const todayStr = getTodayDateString()
    const puzzle = getDailyWordlePuzzle(todayStr)
    const evaluated = evaluateGuess(cleanGuess, puzzle.word)
    const isCorrect = cleanGuess === puzzle.word

    const supabase = createServerSupabase(authHeader)

    let userId: string | null = null
    let currentGuesses: string[] = [cleanGuess]
    let isSolved = isCorrect
    let attempts = 1
    let isGameOver = isSolved || attempts >= 6
    let completedAt: string | null = isGameOver ? new Date().toISOString() : null

    if (supabase && authHeader) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        userId = user.id

        // Check existing attempts today
        const { data: existingEntry } = await supabase
          .from("wordle_daily_entries")
          .select("*")
          .eq("user_id", user.id)
          .eq("target_date", todayStr)
          .maybeSingle()

        if (existingEntry) {
          if (existingEntry.is_solved || (existingEntry.guesses && existingEntry.guesses.length >= 6)) {
            return NextResponse.json(
              { error: "Permainan tebak kata hari ini sudah selesai!" },
              { status: 400 }
            )
          }

          currentGuesses = [...(existingEntry.guesses || []), cleanGuess]
          attempts = currentGuesses.length
          isGameOver = isSolved || attempts >= 6
          completedAt = isGameOver ? new Date().toISOString() : null
        }

        const resolvedName =
          userName ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "Anon"

        const resolvedAvatar =
          userAvatar || user.user_metadata?.avatar_url || null

        // Save directly to database
        const { error: upsertError } = await supabase
          .from("wordle_daily_entries")
          .upsert(
            {
              user_id: user.id,
              user_name: resolvedName,
              user_avatar: resolvedAvatar,
              target_date: todayStr,
              guesses: currentGuesses,
              is_solved: isSolved,
              attempts: attempts,
              completed_at: completedAt,
            },
            { onConflict: "user_id,target_date" }
          )

        if (upsertError) {
          console.error("Failed to upsert wordle entry:", upsertError)
        }
      }
    }

    const allEvaluations = currentGuesses.map((g) =>
      evaluateGuess(g, puzzle.word)
    )

    return NextResponse.json({
      success: true,
      guess: cleanGuess,
      evaluation: evaluated,
      allEvaluations,
      guesses: currentGuesses,
      isSolved,
      isGameOver,
      attempts,
      // Target word is STRICTLY only sent if game is over!
      targetWord: isGameOver ? puzzle.word : undefined,
    })
  } catch (error: any) {
    console.error("POST /api/wordle/guess error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
