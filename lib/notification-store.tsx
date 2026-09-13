"use client"

import * as React from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"
import { playRetroNotificationSound } from "@/lib/sound-effects"
import { getUnreadChatCountAction } from "@/app/actions/chat"
import { getDesktopBootstrapAction } from "@/app/actions/bootstrap"
import { hydrateMemo } from "@/lib/memo-store"
import { hydratePics } from "@/lib/pic-store"
import { hydrateLapakItems } from "@/lib/lapak-store"
import {
  fetchNotificationBadgesAction,
  fetchActiveVoteCountAction,
  fetchActivePantryCountAction,
  fetchActiveSplitBillCountAction,
  fetchActivePaintWarCountAction,
} from "@/app/actions/badges"

export interface NotificationToast {
  id: string
  messageId: string
  senderName: string
  senderAvatar?: string | null
  message: string
  isMention: boolean
  createdAt: number
}

interface NotificationContextType {
  isMuted: boolean
  unreadChatCount: number
  activeVoteCount: number
  activePantryCount: number
  activeSplitBillCount: number
  activePaintWarCount: number
  activeToast: NotificationToast | null
  toggleMute: () => void
  dismissToast: () => void
  clearUnreadChat: () => void
  requestNotificationPermission: () => Promise<NotificationPermission | null>
  hasBrowserNotificationSupport: boolean
  browserPermission: NotificationPermission | "unsupported"
}

const NotificationContext = React.createContext<NotificationContextType | undefined>(undefined)

const MUTED_STORAGE_KEY = "it_things_notifications_muted"
const LAST_READ_CHAT_KEY = "it_things_last_read_chat"

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [isMuted, setIsMuted] = React.useState<boolean>(false)
  const [unreadChatCount, setUnreadChatCount] = React.useState<number>(0)
  const [activeVoteCount, setActiveVoteCount] = React.useState<number>(0)
  const [activePantryCount, setActivePantryCount] = React.useState<number>(0)
  const [activeSplitBillCount, setActiveSplitBillCount] = React.useState<number>(0)
  const [activePaintWarCount, setActivePaintWarCount] = React.useState<number>(0)
  const [activeToast, setActiveToast] = React.useState<NotificationToast | null>(null)
  const [browserPermission, setBrowserPermission] = React.useState<NotificationPermission | "unsupported">("default")
  const toastTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // ─── Fetch Active Paint War Player Count ────────────────────
  const fetchActivePaintWarCount = React.useCallback(async () => {
    if (!isSupabaseConfigured) return
    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token || null
      const count = await fetchActivePaintWarCountAction(token)
      setActivePaintWarCount(count)
    } catch (err) {
      console.warn("fetchActivePaintWarCount error:", err)
    }
  }, [])

  // ─── Fetch Active Split Bill Count ──────────────────────────
  const fetchActiveSplitBillCount = React.useCallback(async () => {
    if (!isSupabaseConfigured) return
    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token || null
      const count = await fetchActiveSplitBillCountAction(token)
      setActiveSplitBillCount(count)
    } catch (err) {
      console.warn("fetchActiveSplitBillCount error:", err)
    }
  }, [])

  // ─── Fetch Active Vote Count ────────────────────────────────
  const fetchActiveVoteCount = React.useCallback(async () => {
    if (!isSupabaseConfigured) return
    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token || null
      const count = await fetchActiveVoteCountAction(token)
      setActiveVoteCount(count)
    } catch (err) {
      console.warn("fetchActiveVoteCount error:", err)
    }
  }, [])

  // ─── Fetch Active Pantry Count ──────────────────────────────
  const fetchActivePantryCount = React.useCallback(async () => {
    if (!isSupabaseConfigured) return
    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token || null
      const count = await fetchActivePantryCountAction(token)
      setActivePantryCount(count)
    } catch (err) {
      console.warn("fetchActivePantryCount error:", err)
    }
  }, [])

  // ─── Fetch Initial Unread Chat Count ────────────────────────
  const fetchInitialUnreadChat = React.useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return
    try {
      const lastRead = typeof window !== "undefined" ? localStorage.getItem(LAST_READ_CHAT_KEY) : null
      if (!lastRead) {
        // Initial visit: set checkpoint to current time so historical messages aren't unread
        if (typeof window !== "undefined") {
          localStorage.setItem(LAST_READ_CHAT_KEY, new Date().toISOString())
        }
        setUnreadChatCount(0)
        return
      }

      const token = (await supabase?.auth.getSession())?.data.session?.access_token || null
      const { count, error } = await getUnreadChatCountAction({
        lastRead,
        userId: user?.id,
        token,
      })

      if (!error && typeof count === "number") {
        setUnreadChatCount(count)
      }
    } catch (err) {
      console.warn("fetchInitialUnreadChat error:", err)
    }
  }, [user?.id])

  // Load saved mute state & check browser notification support
  React.useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const saved = localStorage.getItem(MUTED_STORAGE_KEY)
      if (saved !== null) {
        setIsMuted(saved === "true")
      }
    } catch {
      // Ignore localStorage error
    }

    if ("Notification" in window) {
      setBrowserPermission(Notification.permission)
    } else {
      setBrowserPermission("unsupported")
    }
  }, [])

  // Unified master bootstrap on mount: fetches badges, unread chat, memo, pics, and lapak in 1 single call
  React.useEffect(() => {
    const bootstrapDesktop = async () => {
      try {
        let lastRead = typeof window !== "undefined" ? localStorage.getItem(LAST_READ_CHAT_KEY) : null
        if (!lastRead && typeof window !== "undefined") {
          lastRead = new Date().toISOString()
          localStorage.setItem(LAST_READ_CHAT_KEY, lastRead)
          setUnreadChatCount(0)
        }

        const token = (await supabase?.auth.getSession())?.data.session?.access_token || null
        const bootstrap = await getDesktopBootstrapAction({
          lastReadChat: lastRead,
          userId: user?.id,
          token,
        })

        // Hydrate shared caches in memory & localStorage
        hydrateMemo(bootstrap.memo)
        hydratePics(bootstrap.pics)
        hydrateLapakItems(bootstrap.lapak)

        // Set badges
        setActiveVoteCount(bootstrap.badges.votes)
        setActivePantryCount(bootstrap.badges.pantry)
        setActiveSplitBillCount(bootstrap.badges.splitBills)
        setActivePaintWarCount(bootstrap.badges.paintWar)

        if (bootstrap.unreadChatCount !== null) {
          setUnreadChatCount(bootstrap.unreadChatCount)
        }
      } catch (e) {
        console.warn("bootstrapDesktop error:", e)
      }
    }

    bootstrapDesktop()

    const handleVoteChanged = () => fetchActiveVoteCount()
    const handlePantryChanged = () => fetchActivePantryCount()
    const handleSplitBillChanged = () => fetchActiveSplitBillCount()

    if (typeof window !== "undefined") {
      window.addEventListener("vote-changed", handleVoteChanged)
      window.addEventListener("pantry-changed", handlePantryChanged)
      window.addEventListener("splitbill-changed", handleSplitBillChanged)
    }

    if (!isSupabaseConfigured || !supabase) {
      return () => {
        if (typeof window !== "undefined") {
          window.removeEventListener("vote-changed", handleVoteChanged)
          window.removeEventListener("pantry-changed", handlePantryChanged)
          window.removeEventListener("splitbill-changed", handleSplitBillChanged)
        }
      }
    }

    const voteChannel = supabase
      .channel("global-vote-badges")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vote_groups" },
        () => {
          fetchActiveVoteCount()
        }
      )
      .subscribe()

    const pantryChannel = supabase
      .channel("global-pantry-badges")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pantry_items" },
        () => {
          fetchActivePantryCount()
        }
      )
      .subscribe()

    const splitbillChannel = supabase
      .channel("global-splitbill-badges")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "split_bills" },
        () => {
          fetchActiveSplitBillCount()
        }
      )
      .subscribe()

    const paintwarChannel = supabase
      .channel("global-paintwar-badges")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "paint_war_players" },
        () => {
          fetchActivePaintWarCount()
        }
      )
      .subscribe()

    return () => {
      if (supabase) {
        supabase.removeChannel(voteChannel)
        supabase.removeChannel(pantryChannel)
        supabase.removeChannel(splitbillChannel)
        supabase.removeChannel(paintwarChannel)
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("vote-changed", handleVoteChanged)
        window.removeEventListener("pantry-changed", handlePantryChanged)
        window.removeEventListener("splitbill-changed", handleSplitBillChanged)
      }
    }
  }, [fetchActiveVoteCount, fetchActivePantryCount, fetchActiveSplitBillCount, fetchActivePaintWarCount, fetchInitialUnreadChat])

  const isMutedRef = React.useRef(isMuted)
  React.useEffect(() => {
    isMutedRef.current = isMuted
  }, [isMuted])

  const userRef = React.useRef(user)
  React.useEffect(() => {
    userRef.current = user
  }, [user])

  const toggleMute = React.useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev
      isMutedRef.current = next
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(MUTED_STORAGE_KEY, String(next))
        } catch {
          // Ignore error
        }
      }
      return next
    })
  }, [])

  const dismissToast = React.useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
      toastTimeoutRef.current = null
    }
    setActiveToast(null)
  }, [])

  const clearUnreadChat = React.useCallback(() => {
    setUnreadChatCount(0)
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LAST_READ_CHAT_KEY, new Date().toISOString())
      } catch {
        // Ignore localStorage error
      }
    }
  }, [])

  const requestNotificationPermission = React.useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return null
    try {
      const perm = await Notification.requestPermission()
      setBrowserPermission(perm)
      return perm
    } catch {
      return null
    }
  }, [])

  // Otomatis minta izin notifikasi saat interaksi pertama jika permission masih 'default'
  React.useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return
    if (Notification.permission !== "default") return

    const handleFirstInteraction = async () => {
      await requestNotificationPermission()
      window.removeEventListener("click", handleFirstInteraction)
      window.removeEventListener("keydown", handleFirstInteraction)
      window.removeEventListener("touchstart", handleFirstInteraction)
    }

    window.addEventListener("click", handleFirstInteraction, { once: true })
    window.addEventListener("keydown", handleFirstInteraction, { once: true })
    window.addEventListener("touchstart", handleFirstInteraction, { once: true })

    return () => {
      window.removeEventListener("click", handleFirstInteraction)
      window.removeEventListener("keydown", handleFirstInteraction)
      window.removeEventListener("touchstart", handleFirstInteraction)
    }
  }, [requestNotificationPermission])

  // Helper to trigger notification
  const handleIncomingChatMessage = React.useCallback(
    (msg: {
      id: string
      user_id: string
      user_name: string
      user_avatar?: string | null
      message: string
      mentions?: string[] | null
    }) => {
      const currentUser = userRef.current
      // Don't notify self
      if (currentUser && currentUser.id === msg.user_id) return

      // Unread counter tetap di-increment agar badge taskbar terupdate
      setUnreadChatCount((prev) => prev + 1)

      const muted = isMutedRef.current

      // Jika dibisukan (muted): JANGAN bunyikan audio dan JANGAN munculkan notifikasi pop-up apapun
      if (muted) {
        return
      }

      const mentions = Array.isArray(msg.mentions) ? msg.mentions : []
      const isMention =
        Boolean(currentUser) &&
        (mentions.includes("all") ||
          mentions.includes(currentUser?.id || "") ||
          msg.message.toLowerCase().includes(`@${(currentUser?.name || "").toLowerCase()}`) ||
          msg.message.toLowerCase().includes("@all") ||
          msg.message.toLowerCase().includes("@semua"))

      // 1. Play sound chime (hanya saat tidak dibisukan)
      playRetroNotificationSound(0.28)

      // 2. Set active balloon toast
      const newToast: NotificationToast = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        messageId: msg.id,
        senderName: msg.user_name || "Anggota Tim",
        senderAvatar: msg.user_avatar,
        message: msg.message,
        isMention,
        createdAt: Date.now(),
      }

      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
      }

      setActiveToast(newToast)
      toastTimeoutRef.current = setTimeout(() => {
        setActiveToast(null)
        toastTimeoutRef.current = null
      }, 5000)

      // 3. Windows OS / Browser Notification (muncul di Action Center Windows)
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          const title = isMention
            ? `[IT-THINGS] ${msg.user_name} menyebut Anda!`
            : `[IT-THINGS] Pesan dari ${msg.user_name}`

          // silent: true agar tidak membunyikan chime native Windows bawaan OS yang menimpa suara retro
          const notif = new Notification(title, {
            body: msg.message,
            icon: "/IT-THINGS-icon-pack/it-things-icon-pack/png-128/chat.png",
            tag: `it-things-${msg.id}`,
            silent: true,
          })

          notif.onclick = () => {
            window.focus()
            window.dispatchEvent(new CustomEvent("open-app", { detail: { appId: "chat" } }))
            notif.close()
          }
        } catch (e) {
          console.warn("Browser notification error:", e)
        }
      }
    },
    []
  )

  // Subscribe to Supabase Realtime chat messages globally
  React.useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return

    const channel = supabase
      .channel("global-chat-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const raw = payload.new as {
            id: string
            user_id: string
            user_name: string
            user_avatar?: string | null
            message: string
            mentions?: string[] | null
          }
          if (raw) {
            handleIncomingChatMessage(raw)
            // Forward event ke seluruh window agar store chat langsung tersinkron
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("chat-message-received", { detail: payload.new })
              )
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages" },
        (payload) => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("chat-message-updated", { detail: payload.new })
            )
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_messages" },
        (payload) => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("chat-message-deleted", { detail: payload.old })
            )
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_reactions" },
        (payload) => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("chat-reaction-inserted", { detail: payload.new })
            )
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_reactions" },
        (payload) => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("chat-reaction-updated", { detail: payload.new })
            )
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_reactions" },
        (payload) => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("chat-reaction-deleted", { detail: payload.old })
            )
          }
        }
      )
      .subscribe((status) => {
        if (status === "TIMED_OUT" || status === "CHANNEL_ERROR") {
          console.warn(`[notification-store] Realtime channel status: ${status}`)
        }
      })

    return () => {
      if (supabase) {
        supabase.removeChannel(channel)
      }
    }
  }, [handleIncomingChatMessage])

  // Listen to custom event for programmatic open / clear
  React.useEffect(() => {
    const handleChatFocused = () => {
      clearUnreadChat()
    }
    if (typeof window !== "undefined") {
      window.addEventListener("chat-focused", handleChatFocused)
      return () => window.removeEventListener("chat-focused", handleChatFocused)
    }
  }, [clearUnreadChat])

  return (
    <NotificationContext.Provider
      value={{
        isMuted,
        unreadChatCount,
        activeVoteCount,
        activePantryCount,
        activeSplitBillCount,
        activePaintWarCount,
        activeToast,
        toggleMute,
        dismissToast,
        clearUnreadChat,
        requestNotificationPermission,
        hasBrowserNotificationSupport: browserPermission !== "unsupported",
        browserPermission,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = React.useContext(NotificationContext)
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider")
  }
  return context
}
