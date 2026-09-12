import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/server/supabase-server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")
    const supabase = createServerSupabase(authHeader)

    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 })
    }

    // Resolve caller identity
    let isAdmin = false
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: self } = await supabase
          .from("team_members")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle()
        isAdmin = self?.role === "admin"
      }
    }

    const { data, error } = await supabase
      .from("team_members")
      .select(
        isAdmin
          ? "id, user_id, name, email, avatar_url, role, created_at"
          : "id, user_id, name, avatar_url, role, created_at"
      )
      .order("created_at", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ members: data || [] })
  } catch (err: any) {
    console.error("GET /api/team error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")
    const supabase = createServerSupabase(authHeader)

    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 })
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admin can add members
    const { data: self } = await supabase
      .from("team_members")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle()

    if (self?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { name, email, role, avatar_url } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("team_members")
      .insert({
        user_id: `user-${Date.now()}`,
        name: name.trim(),
        email: email?.trim() || "",
        role: role || "member",
        avatar_url: avatar_url || "👤",
      })
      .select("id, user_id, name, email, avatar_url, role, created_at")
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ member: data })
  } catch (err: any) {
    console.error("POST /api/team error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
