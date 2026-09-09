"use client"

import * as React from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

export type UserRole = "member" | "treasurer" | "admin"

export interface AuthUser {
  id: string
  email: string
  name: string
  avatarUrl?: string
  role?: UserRole
  isGuest?: boolean
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isSupabaseConnected: boolean
  isAdmin: boolean
  isTreasurer: boolean
  isGuest: boolean
  signInWithGoogle: () => Promise<void>
  signInAsGuest: () => void
  signOut: () => Promise<void>
  setDemoUserRole?: (role: UserRole) => void
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      // 1. Check if user previously logged in as Guest
      if (typeof window !== "undefined") {
        try {
          const isGuestSaved = localStorage.getItem("it_things_guest_session")
          if (isGuestSaved === "true") {
            if (isMounted) {
              setUser({
                id: "guest-user",
                name: "Tamu Internal IT",
                email: "tamu@it-internal.local",
                role: "admin",
                isGuest: true,
              })
              setIsLoading(false)
            }
            return
          }
        } catch (e) {
          console.warn("Local storage check error:", e)
        }
      }

      // 2. Check Supabase session
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user && isMounted) {
            await mapAndSetSupabaseUser(session.user)
          } else if (isMounted) {
            setUser(null)
          }
        } catch (err) {
          console.warn("Error checking supabase session:", err)
          if (isMounted) setUser(null)
        } finally {
          if (isMounted) setIsLoading(false)
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            if (!isMounted) return
            if (session?.user) {
              await mapAndSetSupabaseUser(session.user)
            } else {
              const isGuestSaved =
                typeof window !== "undefined"
                  ? localStorage.getItem("it_things_guest_session") === "true"
                  : false
              if (!isGuestSaved) {
                setUser(null)
              }
            }
            setIsLoading(false)
          }
        )

        return () => {
          subscription.unsubscribe()
        }
      } else {
        if (isMounted) {
          setUser(null)
          setIsLoading(false)
        }
      }
    }

    initAuth()

    return () => {
      isMounted = false
    }
  }, [])

  const mapAndSetSupabaseUser = async (sbUser: User) => {
    const meta = sbUser.user_metadata || {}
    let role: UserRole = "member"

    // Check team_members table for role
    try {
      if (supabase) {
        const { data } = await supabase
          .from("team_members")
          .select("role")
          .eq("user_id", sbUser.id)
          .maybeSingle()

        if (data?.role) {
          role = data.role as UserRole
        } else {
          // If first time, insert as member
          await supabase.from("team_members").upsert({
            user_id: sbUser.id,
            email: sbUser.email || "",
            name: meta.full_name || meta.name || sbUser.email?.split("@")[0] || "Anggota Tim",
            avatar_url: meta.avatar_url || meta.picture || "",
            role: "member",
          })
        }
      }
    } catch (e) {
      console.warn("Could not sync team_member role:", e)
    }

    const authUser: AuthUser = {
      id: sbUser.id,
      email: sbUser.email || "",
      name: meta.full_name || meta.name || sbUser.email?.split("@")[0] || "Anggota Tim",
      avatarUrl: meta.avatar_url || meta.picture,
      role,
    }
    setUser(authUser)
  }

  const setDemoUserRole = async (role: UserRole) => {
    setUser((prev) => (prev ? { ...prev, role } : prev))
    if (isSupabaseConfigured && supabase && user && user.id !== "guest-user") {
      try {
        await supabase
          .from("team_members")
          .update({ role })
          .eq("user_id", user.id)
      } catch (e) {
        console.warn("Could not update role in Supabase:", e)
      }
    }
  }

  const isAdmin = user?.role === "admin"
  const isTreasurer = user?.role === "treasurer" || user?.role === "admin"

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Supabase belum dikonfigurasi. Periksa NEXT_PUBLIC_SUPABASE_URL dan key di .env.local.")
    }

    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    })

    if (error) {
      console.error("Supabase Google Auth Error:", error.message)
      throw error
    }
  }

  const isGuest = !!user?.isGuest || user?.id === "guest-user"

  const signInAsGuest = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("it_things_guest_session", "true")
      } catch (e) {
        console.warn("Local storage write error:", e)
      }
    }
    setUser({
      id: "guest-user",
      name: "Tamu Internal IT",
      email: "tamu@it-internal.local",
      role: "admin", // default to admin so they can test everything
      isGuest: true,
    })
  }

  const signOut = async () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("it_things_guest_session")
      } catch (e) {
        console.warn("Local storage remove error:", e)
      }
    }
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut()
    }
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isSupabaseConnected: isSupabaseConfigured,
        isAdmin,
        isTreasurer,
        isGuest,
        signInWithGoogle,
        signInAsGuest,
        signOut,
        setDemoUserRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

