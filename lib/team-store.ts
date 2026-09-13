"use client"

import * as React from "react"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useAuth, UserRole } from "@/lib/auth"

export interface TeamMember {
  id: string
  user_id?: string
  name: string
  email?: string // optional — only visible to admin via server
  avatar_url?: string
  role: UserRole
  created_at?: string
}

const STORAGE_KEY = "it_things_team_members_v1"

const DEFAULT_MEMBERS: TeamMember[] = []

// ─── Helper: get access token for API calls ──────────────────
async function getToken(): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  } catch {
    return null
  }
}

async function teamFetch(path: string, init?: RequestInit) {
  const token = await getToken()
  return fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  })
}

// ─── Shared In-Memory State & Deduplication ───────────────────
let cachedTeamMembers: TeamMember[] = []
let inFlightTeamPromise: Promise<TeamMember[]> | null = null
const teamListeners = new Set<(members: TeamMember[]) => void>()

function getInitialCachedTeamMembers(): TeamMember[] {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Bersihkan legacy dummy members (m1-m5 / tm-1 - tm-5) jika tersisa di localStorage
          const clean = parsed.filter(
            (m: any) =>
              !["m1", "m2", "m3", "m4", "m5"].includes(m.user_id) &&
              !["tm-1", "tm-2", "tm-3", "tm-4", "tm-5"].includes(m.id)
          )
          if (clean.length > 0) {
            cachedTeamMembers = clean
            return clean
          } else {
            localStorage.removeItem(STORAGE_KEY)
          }
        }
      }
    } catch {}
  }
  return DEFAULT_MEMBERS
}

async function fetchTeamMembersDeduplicated(): Promise<TeamMember[]> {
  if (inFlightTeamPromise) {
    return inFlightTeamPromise
  }

  inFlightTeamPromise = (async () => {
    try {
      const res = await teamFetch("/api/team")
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json.members)) {
          const mapped: TeamMember[] = json.members.map((d: any) => ({
            id: d.id,
            user_id: d.user_id,
            name: d.name,
            email: d.email,
            avatar_url: d.avatar_url || "👤",
            role: (d.role as UserRole) || "member",
            created_at: d.created_at,
          }))
          cachedTeamMembers = mapped
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped))
          }
          teamListeners.forEach((listener) => listener(mapped))
        }
      }
    } catch (err) {
      console.warn("fetchTeamMembersDeduplicated error:", err)
    } finally {
      inFlightTeamPromise = null
    }

    return cachedTeamMembers
  })()

  return inFlightTeamPromise
}

export function useTeamStore() {
  const { user, isGuest } = useAuth()
  const [members, setMembers] = React.useState<TeamMember[]>(() => getInitialCachedTeamMembers())
  const [isLoading, setIsLoading] = React.useState(false)

  // ─── Load members via API ─────
  const loadMembers = React.useCallback(async () => {
    if (isGuest || !user || user.id === "guest-user") return
    setIsLoading(true)
    const result = await fetchTeamMembersDeduplicated()
    setMembers(result)
    setIsLoading(false)
  }, [isGuest, user])

  React.useEffect(() => {
    const listener = (newMembers: TeamMember[]) => setMembers(newMembers)
    teamListeners.add(listener)

    loadMembers()

    const handleProfileUpdated = () => {
      fetchTeamMembersDeduplicated()
    }

    let channel: RealtimeChannel | null = null
    if (isSupabaseConfigured && supabase) {
      const channelName = `team-members-realtime-${Math.random().toString(36).substring(2, 8)}`
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "team_members" },
          () => {
            fetchTeamMembersDeduplicated()
          }
        )
        .subscribe()
    }

    if (typeof window !== "undefined") {
      window.addEventListener("profile-updated", handleProfileUpdated)
    }

    return () => {
      teamListeners.delete(listener)
      if (typeof window !== "undefined") {
        window.removeEventListener("profile-updated", handleProfileUpdated)
      }
      if (channel && supabase) supabase.removeChannel(channel)
    }
  }, [loadMembers])

  // ─── Save to localStorage helper ─────────────────────────────
  const saveLocal = (updated: TeamMember[]) => {
    setMembers(updated)
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    }
  }

  // ─── Add member ──────────────────────────────────────────────
  const addMember = async (memberData: {
    name: string
    email: string
    role: UserRole
    avatar_url?: string
  }) => {
    const newId = `tm-${Date.now()}`
    const defaultAvatar = memberData.role === "admin" ? "🛡️" : "👤"
    const optimistic: TeamMember = {
      id: newId,
      user_id: `user-${Date.now()}`,
      name: memberData.name.trim(),
      email: memberData.email.trim(),
      role: memberData.role,
      avatar_url: memberData.avatar_url || defaultAvatar,
      created_at: new Date().toISOString(),
    }

    const updated = [...members, optimistic]
    saveLocal(updated)

    try {
      const res = await teamFetch("/api/team", {
        method: "POST",
        body: JSON.stringify({
          name: memberData.name.trim(),
          email: memberData.email.trim(),
          role: memberData.role,
          avatar_url: memberData.avatar_url || defaultAvatar,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        if (json.member) {
          const inserted: TeamMember = {
            id: json.member.id,
            user_id: json.member.user_id,
            name: json.member.name,
            email: json.member.email,
            role: (json.member.role as UserRole) || "member",
            avatar_url: json.member.avatar_url || defaultAvatar,
            created_at: json.member.created_at,
          }
          const final = updated.map(m => m.id === newId ? inserted : m)
          saveLocal(final)
          return inserted
        }
      } else {
        console.error("Failed to add member:", await res.text())
      }
    } catch (e) {
      console.warn("Could not insert team member:", e)
    }

    return optimistic
  }

  // ─── Update member ───────────────────────────────────────────
  const updateMember = async (id: string, updates: Partial<Omit<TeamMember, "id">>) => {
    const target = members.find(m => m.id === id)
    if (!target) return

    const updated = members.map(m => m.id === id ? { ...m, ...updates } : m)
    saveLocal(updated)

    try {
      const res = await teamFetch(`/api/team/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        console.error("Failed to update member:", await res.text())
        loadMembers() // rollback
      }
    } catch (e) {
      console.warn("Could not update team member:", e)
    }
  }

  // ─── Set role ────────────────────────────────────────────────
  const setMemberRole = async (id: string, role: UserRole) => {
    const avatar = role === "admin" ? "🛡️" : "👤"
    await updateMember(id, { role, avatar_url: avatar })
  }

  // ─── Toggle role ─────────────────────────────────────────────
  const toggleMemberRole = async (id: string) => {
    const target = members.find(m => m.id === id)
    if (!target) return
    const nextRole: UserRole = target.role === "member" ? "admin" : "member"
    await setMemberRole(id, nextRole)
  }

  // ─── Delete member ───────────────────────────────────────────
  const deleteMember = async (id: string) => {
    const updated = members.filter(m => m.id !== id)
    saveLocal(updated)

    try {
      const res = await teamFetch(`/api/team/${id}`, { method: "DELETE" })
      if (!res.ok) {
        console.error("Failed to delete member:", await res.text())
      }
    } catch (e) {
      console.warn("Could not delete team member:", e)
    }
  }

  return {
    members,
    isLoading,
    loadMembers,
    addMember,
    updateMember,
    setMemberRole,
    toggleMemberRole,
    deleteMember,
  }
}
