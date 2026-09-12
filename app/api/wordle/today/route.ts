import { NextResponse } from "next/server"
import {
  getDailyWordlePuzzle,
  getTodayDateString,
  evaluateGuess,
  type EvaluatedLetter,
} from "@/lib/server/wordle"
import { createServerSupabase } from "@/lib/server/supabase-server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const todayStr = getTodayDateString()
    const puzzle = getDailyWordlePuzzle(todayStr)
    const authHeader = req.headers.get("authorization")

    const supabase = createServerSupabase(authHeader)

    let userEntry = null
    let evaluatedGuesses: EvaluatedLetter[][] = []
    let isGameOver = false

    if (supabase && authHeader) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

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

    // Fetch leaderboard with STRICT public columns only (via wordle_leaderboard view)
    let leaderboard: any[] = []
    if (supabase) {
      const { data: boardData, error: boardError } = await (supabase as any)
        .from("wordle_leaderboard")
        .select("*")
        .eq("target_date", todayStr)
        .order("is_solved", { ascending: false })
        .order("attempts", { ascending: true })
        .order("completed_at", { ascending: true })

      if (!boardError && boardData) {
        leaderboard = boardData.map((b: any) => ({
          id: b.id,
          userId: b.user_id,
          userName: b.user_name,
          userAvatar: b.user_avatar,
          targetDate: b.target_date,
          isSolved: b.is_solved,
          attempts: b.attempts,
          createdAt: b.created_at,
          completedAt: b.completed_at,
        }))
      }
    }

    return NextResponse.json({
      puzzle: {
        dayNumber: puzzle.dayNumber,
        targetDate: puzzle.targetDate,
        // SECRET LEAK SHIELD: only return the actual word if user already completed the game!
        word: isGameOver ? puzzle.word : undefined,
      },
      entry: userEntry,
      leaderboard,
    })
  } catch (error: any) {
    console.error("GET /api/wordle/today error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
