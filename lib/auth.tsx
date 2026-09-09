"use client"

import * as React from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import type { User, Session } from "@supabase/supabase-js"

interface AuthUser {
  id: string
  email: string
  name: string
  avatarUrl?: string
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isSupabaseConnected: boolean
  signInWithGoogle: () => Promise<void>
  signInAsDemo: (name?: string) => void
  signOut: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

const DEMO_USER_KEY = "it_things_demo_user"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    // 1. If Supabase is configured, listen to real session
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          mapAndSetSupabaseUser(session.user)
        } else {
          checkDemoUser()
        }
        setIsLoading(false)
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (session?.user) {
            mapAndSetSupabaseUser(session.user)
          } else {
            setUser(null)
          }
          setIsLoading(false)
        }
      )

      return () => {
        subscription.unsubscribe()
      }
    } else {
      // 2. Fallback: Check local demo user
      checkDemoUser()
      setIsLoading(false)
    }
  }, [])

  const mapAndSetSupabaseUser = (sbUser: User) => {
    const meta = sbUser.user_metadata || {}
    const authUser: AuthUser = {
      id: sbUser.id,
      email: sbUser.email || "",
      name: meta.full_name || meta.name || sbUser.email?.split("@")[0] || "Anggota Tim",
      avatarUrl: meta.avatar_url || meta.picture,
    }
    setUser(authUser)
    try {
      localStorage.removeItem(DEMO_USER_KEY)
    } catch {}
  }

  const checkDemoUser = () => {
    try {
      const saved = localStorage.getItem(DEMO_USER_KEY)
      if (saved) {
        setUser(JSON.parse(saved))
      }
    } catch {}
  }

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured || !supabase) {
      // Graceful demo fallback if keys not configured yet
      signInAsDemo("Ajie (Lead Dev)")
      return
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

  const signInAsDemo = (name: string = "Ajie") => {
    const demoUser: AuthUser = {
      id: "demo-user-" + name.toLowerCase().replace(/\s+/g, "-"),
      name: name,
      email: `${name.toLowerCase().replace(/\s+/g, "")}@intra.it`,
      avatarUrl: "",
    }
    setUser(demoUser)
    try {
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser))
    } catch {}
  }

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut()
    }
    setUser(null)
    try {
      localStorage.removeItem(DEMO_USER_KEY)
    } catch {}
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isSupabaseConnected: isSupabaseConfigured,
        signInWithGoogle,
        signInAsDemo,
        signOut,
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
