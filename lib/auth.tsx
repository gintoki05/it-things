"use client"

import * as React from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

export type UserRole = "guest" | "member" | "treasurer" | "admin"

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
  isPasscodeVerified: boolean
  isPasscodeLoading: boolean
  verifyPasscode: (pin: string) => boolean
  lockApp: () => void
  signInWithGoogle: () => Promise<void>
  signInAsGuest: () => void
  signOut: () => Promise<void>
  setDemoUserRole?: (role: UserRole) => void
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isPasscodeVerified, setIsPasscodeVerified] = React.useState<boolean>(false)
  const [isPasscodeLoading, setIsPasscodeLoading] = React.useState<boolean>(true)

  React.useEffect(() => {
    const checkPasscodeStorage = () => {
      if (typeof window === "undefined") return false
      try {
        const verified =
          localStorage.getItem("it_things_passcode_verified") === "true" ||
          sessionStorage.getItem("it_things_passcode_verified") === "true"
        setIsPasscodeVerified(verified)
        return verified
      } catch (e) {
        console.warn("Storage read error:", e)
        return false
      } finally {
        setIsPasscodeLoading(false)
      }
    }

    const isVerifiedInitially = checkPasscodeStorage()

    if (typeof window === "undefined") return

    // Jika belum terverifikasi saat pertama dibuka, beri tag locked pada history
    if (!isVerifiedInitially) {
      window.history.replaceState({ locked: true }, "", window.location.href)
    }

    // 1. Tangani BFCache restore (saat user tekan Back/Forward di browser)
    const handlePageShow = () => {
      const verified = checkPasscodeStorage()
      if (!verified) {
        setIsPasscodeVerified(false)
        window.history.pushState({ locked: true }, "", window.location.href)
      }
      if (isSupabaseConfigured && supabase) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session?.user) {
            const isGuestSaved =
              typeof window !== "undefined" &&
              localStorage.getItem("it_things_guest_session") === "true"
            if (!isGuestSaved) {
              setUser(null)
            }
          }
        })
      }
    }

    // 2. Tangani browser Back/Forward (popstate)
    const handlePopState = () => {
      const verified = checkPasscodeStorage()
      if (!verified) {
        setIsPasscodeVerified(false)
        // Dorong kembali state terkunci agar tidak bisa tembus ke snapshot lama
        window.history.pushState({ locked: true }, "", window.location.href)
      }
      if (isSupabaseConfigured && supabase) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session?.user) {
            const isGuestSaved =
              typeof window !== "undefined" &&
              localStorage.getItem("it_things_guest_session") === "true"
            if (!isGuestSaved) {
              setUser(null)
            }
          }
        })
      }
    }

    // 3. Tangani perubahan storage antar tab atau saat dibersihkan
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "it_things_passcode_verified") {
        checkPasscodeStorage()
      }
    }

    // 4. Tangani saat window kembali fokus / aktif
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkPasscodeStorage()
      }
    }

    window.addEventListener("pageshow", handlePageShow)
    window.addEventListener("popstate", handlePopState)
    window.addEventListener("storage", handleStorageChange)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("pageshow", handlePageShow)
      window.removeEventListener("popstate", handlePopState)
      window.removeEventListener("storage", handleStorageChange)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  React.useEffect(() => {
    let isMounted = true
    let subscription: { unsubscribe: () => void } | null = null

    const initAuth = async () => {
      // 1. Prioritaskan Supabase jika terkonfigurasi
      if (isSupabaseConfigured && supabase) {
        // Setup realtime auth state listener
        const { data } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            if (!isMounted) return
            if (session?.user) {
              if (typeof window !== "undefined") {
                try {
                  localStorage.removeItem("it_things_guest_session")
                } catch (e) {
                  console.warn("Storage remove error:", e)
                }
              }
              await mapAndSetSupabaseUser(session.user)
            } else {
              const isGuestSaved =
                typeof window !== "undefined"
                  ? localStorage.getItem("it_things_guest_session") === "true"
                  : false
              if (isGuestSaved) {
                setUser({
                  id: "guest-user",
                  name: "Tamu (Read-Only)",
                  email: "tamu@it-internal.local",
                  role: "guest",
                  isGuest: true,
                })
              } else {
                setUser(null)
              }
            }
            setIsLoading(false)
          }
        )
        subscription = data.subscription

        // Ambil sesi awal
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user && isMounted) {
            if (typeof window !== "undefined") {
              try {
                localStorage.removeItem("it_things_guest_session")
              } catch (e) {
                console.warn("Storage remove error:", e)
              }
            }
            await mapAndSetSupabaseUser(session.user)
            setIsLoading(false)
            return
          }
        } catch (err) {
          console.warn("Error checking supabase session:", err)
        }

        // Jika tidak ada sesi Google aktif, periksa apakah sesi Tamu tersimpan
        if (typeof window !== "undefined") {
          try {
            const isGuestSaved = localStorage.getItem("it_things_guest_session")
            if (isGuestSaved === "true" && isMounted) {
              setUser({
                id: "guest-user",
                name: "Tamu (Read-Only)",
                email: "tamu@it-internal.local",
                role: "guest",
                isGuest: true,
              })
              setIsLoading(false)
              return
            }
          } catch (e) {
            console.warn("Local storage check error:", e)
          }
        }

        if (isMounted) {
          setUser(null)
          setIsLoading(false)
        }
      } else {
        // Supabase tidak terhubung: cek apakah sesi Tamu aktif
        if (typeof window !== "undefined") {
          try {
            const isGuestSaved = localStorage.getItem("it_things_guest_session")
            if (isGuestSaved === "true" && isMounted) {
              setUser({
                id: "guest-user",
                name: "Tamu (Read-Only)",
                email: "tamu@it-internal.local",
                role: "guest",
                isGuest: true,
              })
              setIsLoading(false)
              return
            }
          } catch (e) {
            console.warn("Storage check error:", e)
          }
        }
        if (isMounted) {
          setUser(null)
          setIsLoading(false)
        }
      }
    }

    initAuth()

    return () => {
      isMounted = false
      if (subscription) {
        subscription.unsubscribe()
      }
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
      isGuest: false,
    }
    setUser(authUser)
  }

  const setDemoUserRole = async (role: UserRole) => {
    if (isGuest) return
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

  const isGuest = !!user?.isGuest || user?.id === "guest-user" || user?.role === "guest"
  const isAdmin = !isGuest && user?.role === "admin"
  const isTreasurer = !isGuest && (user?.role === "treasurer" || user?.role === "admin")

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Supabase belum dikonfigurasi. Periksa NEXT_PUBLIC_SUPABASE_URL dan key di .env.local.")
    }

    // Bersihkan sesi tamu sebelum redirect OAuth
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("it_things_guest_session")
      } catch (e) {
        console.warn("Storage remove error:", e)
      }
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
      name: "Tamu (Read-Only)",
      email: "tamu@it-internal.local",
      role: "guest",
      isGuest: true,
    })
  }

  const signOut = async () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("it_things_guest_session")
        localStorage.removeItem("it_things_passcode_verified")
        sessionStorage.removeItem("it_things_passcode_verified")
        window.history.pushState({ locked: true, loggedOut: true }, "", window.location.href)
      } catch (e) {
        console.warn("Local storage remove error:", e)
      }
    }
    setIsPasscodeVerified(false)
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut()
    }
    setUser(null)
  }

  const verifyPasscode = React.useCallback((pin: string): boolean => {
    const targetPasscode = process.env.NEXT_PUBLIC_TEAM_PASSCODE || "2026"
    if (pin.trim() === targetPasscode.trim()) {
      setIsPasscodeVerified(true)
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("it_things_passcode_verified", "true")
          sessionStorage.setItem("it_things_passcode_verified", "true")
          window.history.replaceState({ locked: false }, "", window.location.href)
        } catch (e) {
          console.warn("Storage write error:", e)
        }
      }
      return true
    }
    return false
  }, [])

  const lockApp = React.useCallback(() => {
    setIsPasscodeVerified(false)
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("it_things_passcode_verified")
        sessionStorage.removeItem("it_things_passcode_verified")
        // Push state terkunci ke history agar tombol browser Back tidak membuka sesi sebelumnya
        window.history.pushState({ locked: true }, "", window.location.href)
      } catch (e) {
        console.warn("Storage remove error:", e)
      }
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isSupabaseConnected: isSupabaseConfigured,
        isAdmin,
        isTreasurer,
        isGuest,
        isPasscodeVerified,
        isPasscodeLoading,
        verifyPasscode,
        lockApp,
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

