import { NextResponse } from "next/server"
import { fetchWordleTodayAction } from "@/app/actions/wordle"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, "").trim() : null
    const result = await fetchWordleTodayAction(token)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("GET /api/wordle/today error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
