"use client"

import * as React from "react"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"

export interface PresenceUser {
  userId: string
  name: string
  avatarUrl?: string
  role?: string
  isGuest?: boolean
  onlineAt: string
}

interface PresenceContextType {
  onlineCount: number
  onlineUsers: PresenceUser[]
  isUserOnline: (userId?: string, name?: string) => boolean
  onlineTeamCount: number
}

const PresenceContext = React.createContext<PresenceContextType | undefined>(undefined)

const GUEST_PRESENCE_KEY = "it_things_guest_presence_id"

function getOrCreateGuestId(): string {
  if (typeof window === "undefined") return "guest-client"
  try {
    let id = sessionStorage.getItem(GUEST_PRESENCE_KEY)
    if (!id) {
      id = `guest-${Math.random().toString(36).substring(2, 9)}`
      sessionStorage.setItem(GUEST_PRESENCE_KEY, id)
    }
    return id
  } catch {
    return "guest-client"
  }
}

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { user, isGuest } = useAuth()
  const [onlineUsers, setOnlineUsers] = React.useState<PresenceUser[]>([])

  const userRef = React.useRef(user)
  React.useEffect(() => {
    userRef.current = user
  }, [user])

  const isGuestRef = React.useRef(isGuest)
  React.useEffect(() => {
    isGuestRef.current = isGuest
  }, [isGuest])

  React.useEffect(() => {
    // Fallback jika Supabase tidak terhubung (demo / offline)
    if (!isSupabaseConfigured || !supabase) {
      const fallbackUser: PresenceUser = {
        userId: user?.id || "local-user",
        name: user?.name || (isGuest ? "Tamu" : "User"),
        avatarUrl: user?.avatarUrl,
        role: user?.role || "member",
        isGuest: Boolean(isGuest || user?.isGuest),
        onlineAt: new Date().toISOString(),
      }
      setOnlineUsers([fallbackUser])
      return
    }

    const currentUserId = user?.id && user.id !== "guest-user" ? user.id : getOrCreateGuestId()
    const channelName = "online-presence"

    const channel: RealtimeChannel = supabase.channel(channelName, {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    })

    const syncPresenceState = () => {
      const state = channel.presenceState<PresenceUser>()
      const userMap = new Map<string, PresenceUser>()

      Object.entries(state).forEach(([key, presences]) => {
        if (Array.isArray(presences) && presences.length > 0) {
          // Ambil entry presensi terbaru untuk key/user ini
          const latest = presences[presences.length - 1]
          userMap.set(key, {
            userId: latest.userId || key,
            name: latest.name || "User",
            avatarUrl: latest.avatarUrl,
            role: latest.role || "member",
            isGuest: Boolean(latest.isGuest),
            onlineAt: latest.onlineAt || new Date().toISOString(),
          })
        }
      })

      setOnlineUsers(Array.from(userMap.values()))
    }

    channel
      .on("presence", { event: "sync" }, () => {
        syncPresenceState()
      })
      .on("presence", { event: "join" }, () => {
        syncPresenceState()
      })
      .on("presence", { event: "leave" }, () => {
        syncPresenceState()
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const currentUser = userRef.current
          const isGuestNow = isGuestRef.current
          const payload: PresenceUser = {
            userId: currentUserId,
            name: currentUser?.name || (isGuestNow ? "Tamu" : "User"),
            avatarUrl: currentUser?.avatarUrl,
            role: currentUser?.role || (isGuestNow ? "guest" : "member"),
            isGuest: Boolean(isGuestNow || currentUser?.isGuest),
            onlineAt: new Date().toISOString(),
          }

          try {
            await channel.track(payload)
          } catch (err) {
            console.warn("[Presence] Failed to track user presence:", err)
          }
        }
      })

    // Re-track saat tab aktif kembali
    const handleVisibility = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        const currentUser = userRef.current
        const isGuestNow = isGuestRef.current
        const payload: PresenceUser = {
          userId: currentUserId,
          name: currentUser?.name || (isGuestNow ? "Tamu" : "User"),
          avatarUrl: currentUser?.avatarUrl,
          role: currentUser?.role || (isGuestNow ? "guest" : "member"),
          isGuest: Boolean(isGuestNow || currentUser?.isGuest),
          onlineAt: new Date().toISOString(),
        }
        try {
          await channel.track(payload)
        } catch {
          // Ignore
        }
      }
    }

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibility)
    }

    return () => {
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility)
      }
      channel.untrack().catch(() => {})
      supabase?.removeChannel(channel)
    }
  }, [user?.id, user?.name, user?.avatarUrl, isGuest])

  // Helper untuk cek apakah member sedang online
  const isUserOnline = React.useCallback(
    (userId?: string, name?: string): boolean => {
      if (!userId && !name) return false
      const cleanName = name?.trim().toLowerCase()

      return onlineUsers.some((u) => {
        if (userId && (u.userId === userId || u.userId.toLowerCase() === userId.toLowerCase())) {
          return true
        }
        if (cleanName && u.name && u.name.trim().toLowerCase() === cleanName) {
          return true
        }
        return false
      })
    },
    [onlineUsers]
  )

  const onlineTeamCount = React.useMemo(() => {
    return onlineUsers.filter((u) => !u.isGuest).length
  }, [onlineUsers])

  return (
    <PresenceContext.Provider
      value={{
        onlineCount: onlineUsers.length,
        onlineUsers,
        isUserOnline,
        onlineTeamCount,
      }}
    >
      {children}
    </PresenceContext.Provider>
  )
}

export function usePresence() {
  const context = React.useContext(PresenceContext)
  if (!context) {
    throw new Error("usePresence must be used within a PresenceProvider")
  }
  return context
}
