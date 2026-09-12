import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/server/supabase-server"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

async function resolveAdminStatus(supabase: ReturnType<typeof createServerSupabase>) {
  if (!supabase) return false
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: self } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle()
  return self?.role === "admin"
}

export async function PATCH(req: Request, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    const authHeader = req.headers.get("authorization")
    const supabase = createServerSupabase(authHeader)

    if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 })

    const isAdmin = await resolveAdminStatus(supabase)
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await req.json()
    // Strip out any attempt to change user_id
    const { user_id: _omit, id: _omitId, ...updates } = body

    const { data, error } = await supabase
      .from("team_members")
      .update(updates)
      .eq("id", id)
      .select("id, user_id, name, email, avatar_url, role, created_at")
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ member: data })
  } catch (err: any) {
    console.error("PATCH /api/team/[id] error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(req: Request, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    const authHeader = req.headers.get("authorization")
    const supabase = createServerSupabase(authHeader)

    if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 })

    const isAdmin = await resolveAdminStatus(supabase)
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { error } = await supabase.from("team_members").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("DELETE /api/team/[id] error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
