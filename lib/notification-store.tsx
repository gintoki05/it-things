"use client"

import * as React from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"
import { playRetroNotificationSound } from "@/lib/sound-effects"

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

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [isMuted, setIsMuted] = React.useState<boolean>(false)
  const [unreadChatCount, setUnreadChatCount] = React.useState<number>(0)
  const [activeToast, setActiveToast] = React.useState<NotificationToast | null>(null)
  const [browserPermission, setBrowserPermission] = React.useState<NotificationPermission | "unsupported">("default")
  const toastTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

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

  const toggleMute = React.useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev
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
      // Don't notify self
      if (user && user.id === msg.user_id) return

      const mentions = Array.isArray(msg.mentions) ? msg.mentions : []
      const isMention =
        Boolean(user) &&
        (mentions.includes("all") ||
          mentions.includes(user?.id || "") ||
          msg.message.toLowerCase().includes(`@${(user?.name || "").toLowerCase()}`) ||
          msg.message.toLowerCase().includes("@all") ||
          msg.message.toLowerCase().includes("@semua"))

      // 1. Play sound chime if not muted
      if (!isMuted) {
        playRetroNotificationSound(0.28)
      }

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

      // 3. Increment unread counter
      setUnreadChatCount((prev) => prev + 1)

      // 4. Browser Notification if tab is hidden or minimized
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted" &&
        document.hidden
      ) {
        try {
          const title = isMention
            ? `[IT-THINGS] ${msg.user_name} menyebut Anda!`
            : `[IT-THINGS] Pesan dari ${msg.user_name}`

          const notif = new Notification(title, {
            body: msg.message,
            icon: "/IT-THINGS-icon-pack/it-things-icon-pack/png-128/chat.png",
            tag: "it-things-chat",
          })

          notif.onclick = () => {
            window.focus()
            window.dispatchEvent(new CustomEvent("open-app", { detail: { appId: "chat" } }))
            notif.close()
          }
        } catch {
          // Ignore notification error
        }
      }
    },
    [isMuted, user]
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
          }
        }
      )
      .subscribe()

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
