"use server"

import { createServerSupabase } from "@/lib/server/supabase-server"
import type { Database } from "@/lib/database.types"

export type DbTeamMember = Database["public"]["Tables"]["team_members"]["Row"]

export async function fetchTeamMemberProfileAction(params: {
  userId: string
  email?: string | null
  defaultName: string
  defaultAvatarUrl?: string | null
  isRootAdmin: boolean
  token?: string | null
}): Promise<{
  role: "admin" | "member" | "guest"
  name: string
  avatarUrl?: string | null
  error?: string
}> {
  const supabase = createServerSupabase(params.token)
  const defaultRole = params.isRootAdmin ? "admin" : "member"

  if (!supabase) {
    return {
      role: defaultRole,
      name: params.defaultName,
      avatarUrl: params.defaultAvatarUrl,
    }
  }

  try {
    const { data, error } = await supabase
      .from("team_members")
      .select("role, name, avatar_url")
      .eq("user_id", params.userId)
      .maybeSingle()

    if (error) {
      return {
        role: defaultRole,
        name: params.defaultName,
        avatarUrl: params.defaultAvatarUrl,
        error: error.message,
      }
    }

    if (data) {
      const resolvedRole = (data.role as "admin" | "member" | "guest") || defaultRole
      return {
        role: params.isRootAdmin ? "admin" : resolvedRole,
        name: data.name || params.defaultName,
        avatarUrl: data.avatar_url ?? params.defaultAvatarUrl,
      }
    } else {
      // First time insert
      await supabase.from("team_members").upsert({
        user_id: params.userId,
        email: params.email || "",
        name: params.defaultName,
        avatar_url: params.defaultAvatarUrl || "",
        role: defaultRole,
      })

      return {
        role: defaultRole,
        name: params.defaultName,
        avatarUrl: params.defaultAvatarUrl,
      }
    }
  } catch (err: unknown) {
    return {
      role: defaultRole,
      name: params.defaultName,
      avatarUrl: params.defaultAvatarUrl,
      error: err instanceof Error ? err.message : "Error fetching profile",
    }
  }
}

export async function updateTeamMemberRoleAction(params: {
  userId: string
  role: "admin" | "member" | "guest"
  token?: string | null
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabase(params.token)
  if (!supabase) return { success: false, error: "Supabase not configured" }

  try {
    const { error } = await supabase
      .from("team_members")
      .update({ role: params.role })
      .eq("user_id", params.userId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error updating role" }
  }
}

export async function updateTeamMemberProfileAction(params: {
  userId: string
  name: string
  avatarUrl?: string | null
  token?: string | null
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabase(params.token)
  if (!supabase) return { success: false, error: "Supabase not configured" }

  try {
    const updatePayload: { name: string; avatar_url?: string } = {
      name: params.name,
    }
    if (params.avatarUrl !== undefined && params.avatarUrl !== null) {
      updatePayload.avatar_url = params.avatarUrl
    }

    const { error } = await supabase
      .from("team_members")
      .update(updatePayload)
      .eq("user_id", params.userId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error updating profile" }
  }
}

export async function fetchTeamMembersAction(
  token?: string | null
): Promise<{ members: DbTeamMember[]; error?: string }> {
  const supabase = createServerSupabase(token)
  if (!supabase) return { members: [], error: "Supabase not configured" }

  try {
    let isAdmin = false
    if (token) {
      const {
        data: { user },
      } = await supabase.auth.getUser(token)
      if (user) {
        const { data: self } = await supabase
          .from("team_members")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle()
        isAdmin = self?.role === "admin"
      }
    }

    const selectFields = isAdmin
      ? "id, user_id, name, email, avatar_url, role, created_at"
      : "id, user_id, name, avatar_url, role, created_at"

    const { data, error } = await (supabase as any)
      .from("team_members")
      .select(selectFields)
      .order("created_at", { ascending: true })

    if (error) return { members: [], error: error.message }
    return { members: ((data as unknown) as DbTeamMember[]) || [] }
  } catch (err: unknown) {
    return {
      members: [],
      error: err instanceof Error ? err.message : "Error fetching team members",
    }
  }
}

export async function createTeamMemberAction(
  payload: {
    user_id?: string
    name: string
    email?: string | null
    role?: string
    avatar_url?: string | null
  },
  token?: string | null
): Promise<{ success: boolean; member?: DbTeamMember; error?: string }> {
  const supabase = createServerSupabase(token)
  if (!supabase) return { success: false, error: "Supabase not configured" }

  try {
    const insertPayload: Database["public"]["Tables"]["team_members"]["Insert"] = {
      user_id: payload.user_id || `user-${Date.now()}`,
      name: payload.name,
      email: payload.email || "",
      role: payload.role || "member",
      avatar_url: payload.avatar_url || null,
    }

    const { data, error } = await supabase
      .from("team_members")
      .insert(insertPayload)
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, member: data }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error creating team member",
    }
  }
}

export async function updateTeamMemberAction(
  id: string,
  payload: Database["public"]["Tables"]["team_members"]["Update"],
  token?: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabase(token)
  if (!supabase) return { success: false, error: "Supabase not configured" }

  try {
    const { error } = await supabase
      .from("team_members")
      .update(payload)
      .eq("id", id)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error updating team member",
    }
  }
}

export async function deleteTeamMemberAction(
  id: string,
  token?: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabase(token)
  if (!supabase) return { success: false, error: "Supabase not configured" }

  try {
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", id)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error deleting team member",
    }
  }
}

export async function uploadProfilePhotoAction(formData: FormData): Promise<{
  success: boolean
  avatarUrl?: string
  error?: string
}> {
  const token = formData.get("token") as string | null
  const file = formData.get("file") as File | null

  if (!file) {
    return { success: false, error: "File foto tidak ditemukan." }
  }

  const supabase = createServerSupabase(token)
  if (!supabase) {
    return { success: false, error: "Supabase tidak terkonfigurasi." }
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: "Sesi tidak valid atau belum login." }
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ]
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: "Format file harus berupa JPG, PNG, WebP, atau GIF.",
      }
    }

    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: "Ukuran file maksimal 5MB." }
    }

    const extMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    }
    const ext = extMap[file.type] || "webp"
    const filePath = `${user.id}/${Date.now()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      return { success: false, error: uploadError.message }
    }

    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath)

    return { success: true, avatarUrl: publicUrlData.publicUrl }
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Gagal mengunggah foto profil.",
    }
  }
}
