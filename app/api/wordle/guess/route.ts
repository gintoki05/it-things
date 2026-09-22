import { NextResponse } from "next/server"
import { submitWordleGuessAction } from "@/app/actions/wordle"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, "").trim() : null
    const body = await req.json()
    const { guess, quizNumber, userName, userAvatar } = body

    const result = await submitWordleGuessAction({
      guess,
      quizNumber,
      userName,
      userAvatar,
      token,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("POST /api/wordle/guess error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
