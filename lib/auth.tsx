"use client"

import * as React from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

export type UserRole = "guest" | "member" | "admin"

export interface AuthUser {
  id: string
  email: string
  name: string
  avatarUrl?: string
  googleAvatarUrl?: string
  role?: UserRole
  realRole?: UserRole
  isGuest?: boolean
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isSupabaseConnected: boolean
  isAdmin: boolean
  isTreasurer: boolean
  isGuest: boolean
  isRootAdmin: boolean
  canSwitchRole: boolean
  isPasscodeVerified: boolean
  isPasscodeLoading: boolean
  verifyPasscode: (pin: string) => boolean
  lockApp: () => void
  signInWithGoogle: () => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUpWithPassword: (email: string, password: string, name: string) => Promise<{ needsEmailConfirmation?: boolean }>
  resetPasswordForEmail: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  resetPasswordWithOtp: (email: string, token: string, newPassword: string) => Promise<void>
  isRecoveryMode: boolean
  setIsRecoveryMode: (active: boolean) => void
  signInAsGuest: () => void
  signOut: () => Promise<void>
  setDemoUserRole?: (role: UserRole) => void
  updateProfile: (updates: { name: string; avatarUrl?: string }) => Promise<{ success: boolean; error?: string }>
}

const getSavedGuestName = () => {
  if (typeof window === "undefined") return "Tamu (Read-Only)"
  try {
    return localStorage.getItem("it_things_guest_name") || "Tamu (Read-Only)"
  } catch {
    return "Tamu (Read-Only)"
  }
}

const getSavedGuestAvatar = () => {
  if (typeof window === "undefined") return undefined
  try {
    return localStorage.getItem("it_things_guest_avatar") || undefined
  } catch {
    return undefined
  }
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isPasscodeVerified, setIsPasscodeVerified] = React.useState<boolean>(false)
  const [isPasscodeLoading, setIsPasscodeLoading] = React.useState<boolean>(true)
  const [isRecoveryMode, setIsRecoveryMode] = React.useState<boolean>(false)
  const isUpdatingProfileRef = React.useRef(false)

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
        if (
          typeof window !== "undefined" &&
          (window.location.hash.includes("type=recovery") || window.location.href.includes("type=recovery"))
        ) {
          setIsRecoveryMode(true)
        }

        // Setup realtime auth state listener
        const { data } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!isMounted) return
            if (isUpdatingProfileRef.current) return
            if (event === "PASSWORD_RECOVERY") {
              setIsRecoveryMode(true)
            }
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
                  name: getSavedGuestName(),
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
                name: getSavedGuestName(),
                avatarUrl: getSavedGuestAvatar(),
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
                name: getSavedGuestName(),
                avatarUrl: getSavedGuestAvatar(),
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

const ROOT_ADMIN_EMAILS = [
  "ajieprastyo@gmail.com",
  ...(process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
]

  const mapAndSetSupabaseUser = async (sbUser: User) => {
    const meta = sbUser.user_metadata || {}
    const isRootAdmin = !!(sbUser.email && ROOT_ADMIN_EMAILS.includes(sbUser.email.toLowerCase()))
    let role: UserRole = isRootAdmin ? "admin" : "member"
    let displayName = meta.full_name || meta.name || sbUser.email?.split("@")[0] || "Anggota Tim"

    // Foto Google asli selalu tersimpan di meta.picture atau identity_data
    const googleIdentity = sbUser.identities?.find(
      (i) => i.provider === "google" || i.provider === "google.com"
    )
    const rawGoogleAvatar =
      meta.picture ||
      googleIdentity?.identity_data?.picture ||
      googleIdentity?.identity_data?.avatar_url ||
      (meta.avatar_url && typeof meta.avatar_url === "string" && meta.avatar_url.startsWith("http") ? meta.avatar_url : undefined)

    const googleAvatarUrl = typeof rawGoogleAvatar === "string" && rawGoogleAvatar.startsWith("http")
      ? rawGoogleAvatar
      : undefined

    let avatarUrl = googleAvatarUrl

    // Check team_members table for role & custom profile name
    try {
      if (supabase) {
        const { data } = await supabase
          .from("team_members")
          .select("role, name, avatar_url")
          .eq("user_id", sbUser.id)
          .maybeSingle()

        if (data) {
          if (isRootAdmin) {
            role = "admin"
            if (data.role !== "admin") {
              supabase.from("team_members").update({ role: "admin" }).eq("user_id", sbUser.id).then(() => {})
            }
          } else if (data.role) {
            role = data.role as UserRole
          }
          if (data.name) displayName = data.name
          if (data.avatar_url !== undefined && data.avatar_url !== null) {
            avatarUrl = data.avatar_url
          }
        } else {
          // If first time, insert as admin if root admin, else member
          const initialRole: UserRole = isRootAdmin ? "admin" : "member"
          role = initialRole
          await supabase.from("team_members").upsert({
            user_id: sbUser.id,
            email: sbUser.email || "",
            name: displayName,
            avatar_url: avatarUrl || "",
            role: initialRole,
          })
        }
      }
    } catch (e) {
      console.warn("Could not sync team_member data:", e)
    }

    const authUser: AuthUser = {
      id: sbUser.id,
      email: sbUser.email || "",
      name: displayName,
      avatarUrl,
      googleAvatarUrl,
      role,
      realRole: role,
      isGuest: false,
    }
    setUser(authUser)
  }

  const isGuest = !!user?.isGuest || user?.id === "guest-user" || user?.role === "guest"
  const isRootAdmin = !!(user?.email && ROOT_ADMIN_EMAILS.includes(user.email.toLowerCase()))
  const realRole: UserRole = user?.realRole || (isRootAdmin ? "admin" : (user?.role || "member"))
  const canSwitchRole = !isGuest && (isRootAdmin || realRole === "admin")
  const isAdmin = !isGuest && (user?.role === "admin" || (!user?.role && isRootAdmin))
  const isTreasurer = isAdmin

  const setDemoUserRole = async (role: UserRole) => {
    if (isGuest || !canSwitchRole) return
    setUser((prev) => (prev ? { ...prev, role } : prev))
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("profile-updated"))
    }
  }

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

  const signInWithPassword = async (email: string, password: string) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Supabase belum dikonfigurasi. Periksa NEXT_PUBLIC_SUPABASE_URL dan key di .env.local.")
    }

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("it_things_guest_session")
      } catch (e) {
        console.warn("Storage remove error:", e)
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      console.error("Supabase Password Login Error:", error.message)
      throw error
    }

    if (data?.user) {
      await mapAndSetSupabaseUser(data.user)
    }
  }

  const signUpWithPassword = async (
    email: string,
    password: string,
    name: string
  ): Promise<{ needsEmailConfirmation?: boolean }> => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Supabase belum dikonfigurasi. Periksa NEXT_PUBLIC_SUPABASE_URL dan key di .env.local.")
    }

    const trimmedEmail = email.trim()
    const trimmedName = name.trim() || trimmedEmail.split("@")[0] || "Anggota Tim"

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("it_things_guest_session")
      } catch (e) {
        console.warn("Storage remove error:", e)
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          name: trimmedName,
          full_name: trimmedName,
        },
      },
    })

    if (error) {
      console.error("Supabase Password Register Error:", error.message)
      throw error
    }

    // Jika user dibuat tapi belum ada session (butuh konfirmasi email)
    if (data?.user && !data.session) {
      return { needsEmailConfirmation: true }
    }

    if (data?.user) {
      await mapAndSetSupabaseUser(data.user)
    }

    return { needsEmailConfirmation: false }
  }

  const resetPasswordForEmail = async (email: string): Promise<void> => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Supabase belum dikonfigurasi. Periksa NEXT_PUBLIC_SUPABASE_URL dan key di .env.local.")
    }
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      throw new Error("Alamat email wajib diisi.")
    }
    const redirectUrl = typeof window !== "undefined" ? `${window.location.origin}` : undefined
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: redirectUrl,
    })
    if (error) {
      console.error("Supabase Reset Password Error:", error.message)
      throw error
    }
  }

  const updatePassword = async (newPassword: string): Promise<void> => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Supabase belum dikonfigurasi.")
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error("Kata sandi minimal 6 karakter.")
    }
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    if (error) {
      console.error("Supabase Update Password Error:", error.message)
      throw error
    }
    if (data.user) {
      await mapAndSetSupabaseUser(data.user)
    }
    setIsRecoveryMode(false)
    if (typeof window !== "undefined" && window.history.replaceState) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search)
    }
  }

  const resetPasswordWithOtp = async (
    email: string,
    token: string,
    newPassword: string
  ): Promise<void> => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Supabase belum dikonfigurasi.")
    }
    const trimmedEmail = email.trim()
    const trimmedToken = token.trim()
    if (!trimmedEmail || !trimmedToken) {
      throw new Error("Email dan kode OTP 6-digit wajib diisi.")
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error("Kata sandi minimal 6 karakter.")
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: trimmedToken,
      type: "recovery",
    })
    if (error) {
      console.error("Supabase Verify OTP Error:", error.message)
      throw error
    }
    if (data?.user) {
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (updateErr) throw updateErr
      await mapAndSetSupabaseUser(data.user)
    }
    setIsRecoveryMode(false)
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
      name: getSavedGuestName(),
      avatarUrl: getSavedGuestAvatar(),
      email: "tamu@it-internal.local",
      role: "guest",
      isGuest: true,
    })
  }

  const updateProfile = async (updates: {
    name: string
    avatarUrl?: string
  }): Promise<{ success: boolean; error?: string }> => {
    const trimmedName = updates.name.trim()
    if (!trimmedName) {
      return { success: false, error: "Nama tidak boleh kosong." }
    }
    if (trimmedName.length < 2) {
      return { success: false, error: "Nama minimal 2 karakter." }
    }

    const prevUser = user
    const updatedUser: AuthUser | null = prevUser
      ? {
          ...prevUser,
          name: trimmedName,
          ...(updates.avatarUrl !== undefined ? { avatarUrl: updates.avatarUrl } : {}),
        }
      : null

    isUpdatingProfileRef.current = true
    setUser(updatedUser)

    // Jika mode Tamu / Guest
    if (isGuest || user?.id === "guest-user") {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("it_things_guest_name", trimmedName)
          if (updates.avatarUrl !== undefined) {
            if (updates.avatarUrl) {
              localStorage.setItem("it_things_guest_avatar", updates.avatarUrl)
            } else {
              localStorage.removeItem("it_things_guest_avatar")
            }
          }
          window.dispatchEvent(
            new CustomEvent("profile-updated", {
              detail: { name: trimmedName, avatarUrl: updates.avatarUrl },
            })
          )
        } catch (e) {
          console.warn("Error saving guest profile:", e)
        }
      }
      isUpdatingProfileRef.current = false
      return { success: true }
    }

    // Jika user Google / Email & Supabase terhubung
    if (isSupabaseConfigured && supabase && user) {
      try {
        const newAvatarParam = updates.avatarUrl !== undefined ? updates.avatarUrl : undefined

        // 1. Eksekusi cascading sync ke database dulu (team_members, vote, chat, dll)
        const { error: rpcError } = await supabase.rpc("sync_user_profile_name", {
          new_name: trimmedName,
          new_avatar: newAvatarParam,
        })

        if (rpcError) {
          console.warn("RPC sync_user_profile_name failed, fallback to direct update:", rpcError.message)
          const updatePayload: { name: string; avatar_url?: string } = {
            name: trimmedName,
          }
          if (updates.avatarUrl !== undefined) {
            updatePayload.avatar_url = updates.avatarUrl
          }

          const { error: memberError } = await supabase
            .from("team_members")
            .update(updatePayload)
            .eq("user_id", user.id)

          if (memberError) {
            await supabase.from("team_members").upsert({
              user_id: user.id,
              email: user.email || "",
              name: trimmedName,
              avatar_url: updates.avatarUrl !== undefined ? updates.avatarUrl : user.avatarUrl || "",
              role: user.role || "member",
            })
          }
        }

        // 2. Update metadata di Supabase Auth
        const { error: authError } = await supabase.auth.updateUser({
          data: {
            full_name: trimmedName,
            name: trimmedName,
            ...(updates.avatarUrl !== undefined ? { avatar_url: updates.avatarUrl } : {}),
          },
        })
        if (authError) {
          console.warn("Auth updateUser error:", authError.message)
        }

        // 3. Pastikan state lokal konsisten & broadcast event ke fitur lain
        setUser(updatedUser)
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("profile-updated", {
              detail: { name: trimmedName, avatarUrl: updates.avatarUrl },
            })
          )
        }

        return { success: true }
      } catch (err: unknown) {
        console.error("Gagal update profil:", err)
        setUser(prevUser)
        const message = err instanceof Error ? err.message : "Gagal menyimpan perubahan profil."
        return { success: false, error: message }
      } finally {
        isUpdatingProfileRef.current = false
      }
    }

    isUpdatingProfileRef.current = false
    return { success: true }
  }

  const signOut = async () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("it_things_guest_session")
        localStorage.removeItem("it_things_guest_name")
        localStorage.removeItem("it_things_guest_avatar")
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
        isRootAdmin,
        canSwitchRole,
        isPasscodeVerified,
        isPasscodeLoading,
        verifyPasscode,
        lockApp,
        signInWithGoogle,
        signInWithPassword,
        signUpWithPassword,
        resetPasswordForEmail,
        updatePassword,
        resetPasswordWithOtp,
        isRecoveryMode,
        setIsRecoveryMode,
        signInAsGuest,
        signOut,
        setDemoUserRole,
        updateProfile,
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

