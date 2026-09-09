"use client"

import * as React from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useAuth, UserRole } from "@/lib/auth"

export interface TeamMember {
  id: string
  user_id?: string
  name: string
  email: string
  avatar_url?: string
  role: UserRole
  created_at?: string
}

const STORAGE_KEY = "it_things_team_members_v1"

const DEFAULT_MEMBERS: TeamMember[] = [
  {
    id: "tm-1",
    user_id: "m1",
    name: "Ajie Saputra",
    email: "ajie@office.internal",
    avatar_url: "🛡️",
    role: "admin",
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: "tm-2",
    user_id: "m2",
    name: "Budi Santoso",
    email: "budi@office.internal",
    avatar_url: "👨‍💻",
    role: "member",
    created_at: new Date(Date.now() - 86400000 * 25).toISOString(),
  },
  {
    id: "tm-3",
    user_id: "m3",
    name: "Citra Lestari",
    email: "citra@office.internal",
    avatar_url: "👩‍💼",
    role: "member",
    created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
  },
  {
    id: "tm-4",
    user_id: "m4",
    name: "Dimas Pratama",
    email: "dimas@office.internal",
    avatar_url: "👨‍🔬",
    role: "member",
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
  {
    id: "tm-5",
    user_id: "m5",
    name: "Eko Prasetyo",
    email: "eko@office.internal",
    avatar_url: "🧑‍💻",
    role: "member",
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
]

export function useTeamStore() {
  const { user, isGuest } = useAuth()
  const [members, setMembers] = React.useState<TeamMember[]>(DEFAULT_MEMBERS)
  const [isLoading, setIsLoading] = React.useState(true)

  // Load members from Supabase or localStorage
  const loadMembers = React.useCallback(async () => {
    setIsLoading(true)

    // First check localStorage for offline / guest mode edits
    let localData: TeamMember[] | null = null
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          localData = JSON.parse(raw)
        }
      } catch (e) {
        console.warn("Failed to parse local team members:", e)
      }
    }

    if (isSupabaseConfigured && supabase && !isGuest && user && user.id !== "guest-user") {
      try {
        const { data, error } = await supabase
          .from("team_members")
          .select("*")
          .order("created_at", { ascending: true })

        if (!error && data && data.length > 0) {
          const mapped: TeamMember[] = data.map((d) => ({
            id: d.id,
            user_id: d.user_id,
            name: d.name,
            email: d.email || "",
            avatar_url: d.avatar_url || "👤",
            role: (d.role as "member" | "treasurer") || "member",
            created_at: d.created_at,
          }))
          setMembers(mapped)
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped))
          }
          setIsLoading(false)
          return
        }
      } catch (e) {
        console.warn("Could not fetch team_members from Supabase:", e)
      }
    }

    // Fallback to local data or default
    if (localData && localData.length > 0) {
      setMembers(localData)
    } else {
      setMembers(DEFAULT_MEMBERS)
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_MEMBERS))
      }
    }
    setIsLoading(false)
  }, [isGuest, user])

  React.useEffect(() => {
    loadMembers()
  }, [loadMembers])

  // Save changes to localStorage helper
  const saveLocal = (updated: TeamMember[]) => {
    setMembers(updated)
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    }
  }

  // Add new member
  const addMember = async (memberData: {
    name: string
    email: string
    role: UserRole
    avatar_url?: string
  }) => {
    const newId = `tm-${Date.now()}`
    const defaultAvatar =
      memberData.role === "admin" ? "🛡️" : memberData.role === "treasurer" ? "👑" : "👤"
    const newMember: TeamMember = {
      id: newId,
      user_id: `user-${Date.now()}`,
      name: memberData.name.trim(),
      email: memberData.email.trim(),
      role: memberData.role,
      avatar_url: memberData.avatar_url || defaultAvatar,
      created_at: new Date().toISOString(),
    }

    const updated = [...members, newMember]
    saveLocal(updated)

    if (isSupabaseConfigured && supabase && !isGuest && user && user.id !== "guest-user") {
      try {
        await supabase.from("team_members").insert({
          user_id: newMember.user_id!,
          name: newMember.name,
          email: newMember.email,
          role: newMember.role,
          avatar_url: newMember.avatar_url,
        })
      } catch (e) {
        console.warn("Could not insert team member to Supabase:", e)
      }
    }

    return newMember
  }

  // Update member
  const updateMember = async (id: string, updates: Partial<Omit<TeamMember, "id">>) => {
    const target = members.find((m) => m.id === id)
    if (!target) return

    const updated = members.map((m) => (m.id === id ? { ...m, ...updates } : m))
    saveLocal(updated)

    if (isSupabaseConfigured && supabase && !isGuest && user && user.id !== "guest-user") {
      try {
        await supabase
          .from("team_members")
          .update(updates)
          .eq("id", id)
      } catch (e) {
        console.warn("Could not update team member in Supabase:", e)
      }
    }
  }

  // Set member role explicitly
  const setMemberRole = async (id: string, role: UserRole) => {
    const avatar = role === "admin" ? "🛡️" : role === "treasurer" ? "👑" : "👤"
    await updateMember(id, { role, avatar_url: avatar })
  }

  // Toggle role between 'member', 'treasurer', and 'admin'
  const toggleMemberRole = async (id: string) => {
    const target = members.find((m) => m.id === id)
    if (!target) return
    const nextRole: UserRole =
      target.role === "member" ? "treasurer" : target.role === "treasurer" ? "admin" : "member"
    await setMemberRole(id, nextRole)
  }

  // Delete member
  const deleteMember = async (id: string) => {
    const updated = members.filter((m) => m.id !== id)
    saveLocal(updated)

    if (isSupabaseConfigured && supabase && !isGuest && user && user.id !== "guest-user") {
      try {
        await supabase.from("team_members").delete().eq("id", id)
      } catch (e) {
        console.warn("Could not delete team member in Supabase:", e)
      }
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
