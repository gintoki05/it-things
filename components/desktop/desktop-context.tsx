"use client"

import * as React from "react"
import { useAuth } from "@/lib/auth"

export type AppId = "vote" | "wheel" | "splitbill" | "kas" | "team" | "chat"

export interface WindowState {
  id: AppId
  title: string
  icon: string // emoji or icon name
  filename: string // e.g. "pantry.exe"
  isOpen: boolean
  isMinimized: boolean
  isMaximized: boolean
  zIndex: number
  position: { x: number; y: number }
  size: { width: number; height: number }
  defaultSize: { width: number; height: number }
  defaultPos: { x: number; y: number }
  isComingSoon?: boolean
  adminOnly?: boolean
}

interface DesktopContextType {
  windows: Record<AppId, WindowState>
  activeWindowId: AppId | null
  comingSoonApp: WindowState | null
  openWindow: (id: AppId) => void
  closeWindow: (id: AppId) => void
  minimizeWindow: (id: AppId) => void
  maximizeWindow: (id: AppId) => void
  bringToFront: (id: AppId) => void
  toggleWindow: (id: AppId) => void
  updatePosition: (id: AppId, pos: { x: number; y: number }) => void
  openComingSoonDialog: (app: WindowState) => void
  closeComingSoonDialog: () => void
  isAboutOpen: boolean
  openAboutDialog: () => void
  closeAboutDialog: () => void
}

const DesktopContext = React.createContext<DesktopContextType | undefined>(undefined)

const INITIAL_WINDOWS: Record<AppId, WindowState> = {
  vote: {
    id: "vote",
    title: "Vote.exe - Poll & Vote Groups",
    icon: "vote",
    filename: "vote.exe",
    isOpen: true,
    isMinimized: false,
    isMaximized: false,
    zIndex: 10,
    position: { x: 110, y: 24 },
    size: { width: 780, height: 560 },
    defaultSize: { width: 780, height: 560 },
    defaultPos: { x: 110, y: 24 },
  },
  wheel: {
    id: "wheel",
    title: "Wheel.exe - Mau Makan Apa?",
    icon: "wheel",
    filename: "wheel.exe",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 11,
    position: { x: 140, y: 44 },
    size: { width: 720, height: 580 },
    defaultSize: { width: 720, height: 580 },
    defaultPos: { x: 140, y: 44 },
    isComingSoon: true,
  },
  splitbill: {
    id: "splitbill",
    title: "SplitBill.exe - Kalkulator & Tracker Patungan",
    icon: "splitbill",
    filename: "splitbill.exe",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 12,
    position: { x: 170, y: 64 },
    size: { width: 760, height: 600 },
    defaultSize: { width: 760, height: 600 },
    defaultPos: { x: 170, y: 64 },
    isComingSoon: true,
  },
  kas: {
    id: "kas",
    title: "Kas.exe - Buku Kas & Iuran Tim",
    icon: "kas",
    filename: "kas.exe",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 13,
    position: { x: 200, y: 84 },
    size: { width: 760, height: 570 },
    defaultSize: { width: 760, height: 570 },
    defaultPos: { x: 200, y: 84 },
    isComingSoon: true,
  },
  team: {
    id: "team",
    title: "Team.exe - Pengaturan Peserta & Role",
    icon: "team",
    filename: "team.exe",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 14,
    position: { x: 230, y: 104 },
    size: { width: 740, height: 560 },
    defaultSize: { width: 740, height: 560 },
    defaultPos: { x: 230, y: 104 },
    adminOnly: true,
  },
  chat: {
    id: "chat",
    title: "Chat.exe - Live Team Messenger",
    icon: "chat",
    filename: "chat.exe",
    isOpen: true,
    isMinimized: false,
    isMaximized: false,
    zIndex: 12,
    position: { x: 880, y: 10 },
    size: { width: 440, height: 720 },
    defaultSize: { width: 440, height: 720 },
    defaultPos: { x: 880, y: 10 },
  },
}

export function DesktopProvider({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth()
  const [windows, setWindows] = React.useState<Record<AppId, WindowState>>(INITIAL_WINDOWS)
  const [activeWindowId, setActiveWindowId] = React.useState<AppId | null>("vote")
  const [topZIndex, setTopZIndex] = React.useState(20)
  const [comingSoonApp, setComingSoonApp] = React.useState<WindowState | null>(null)
  const [isAboutOpen, setIsAboutOpen] = React.useState(false)

  // Tempatkan Chat.exe secara responsif di panel kanan desktop pada layar lebar
  React.useEffect(() => {
    if (typeof window === "undefined") return

    const isLargeScreen = window.innerWidth >= 1024
    const isMobile = window.innerWidth < 768

    setWindows((curr) => {
      const chatWin = curr.chat
      if (!chatWin) return curr

      if (isMobile) {
        // Pada mobile, jangan auto-open agar tidak langsung menumpuk full-screen
        return {
          ...curr,
          chat: {
            ...chatWin,
            isOpen: false,
          },
        }
      }

      if (isLargeScreen) {
        const targetX = Math.max(720, window.innerWidth - 460)
        const targetHeight = Math.max(620, window.innerHeight - 56)
        return {
          ...curr,
          chat: {
            ...chatWin,
            isOpen: true,
            position: { x: targetX, y: 10 },
            size: { width: 440, height: targetHeight },
            defaultPos: { x: targetX, y: 10 },
            defaultSize: { width: 440, height: targetHeight },
          },
        }
      }

      return curr
    })
  }, [])

  // Otomatis tutup jendela team jika user kehilangan status admin
  React.useEffect(() => {
    if (!isAdmin) {
      setWindows((curr) => {
        if (curr.team?.isOpen) {
          return {
            ...curr,
            team: {
              ...curr.team,
              isOpen: false,
            },
          }
        }
        return curr
      })
      setActiveWindowId((curr) => (curr === "team" ? null : curr))
    }
  }, [isAdmin])

  const bringToFront = React.useCallback(
    (id: AppId) => {
      setTopZIndex((prev) => {
        const nextZ = prev + 1
        setWindows((curr) => {
          if (!curr[id]) return curr
          return {
            ...curr,
            [id]: {
              ...curr[id],
              zIndex: nextZ,
              isMinimized: false,
            },
          }
        })
        setActiveWindowId(id)
        return nextZ
      })
    },
    []
  )

  const openComingSoonDialog = React.useCallback((app: WindowState) => {
    setComingSoonApp(app)
  }, [])

  const closeComingSoonDialog = React.useCallback(() => {
    setComingSoonApp(null)
  }, [])

  const openAboutDialog = React.useCallback(() => {
    setIsAboutOpen(true)
  }, [])

  const closeAboutDialog = React.useCallback(() => {
    setIsAboutOpen(false)
  }, [])

  const openWindow = React.useCallback(
    (id: AppId) => {
      const target = windows[id]
      if (!target) return
      if (target.adminOnly && !isAdmin) return
      if (target.isComingSoon) {
        setComingSoonApp(target)
        return
      }

      setWindows((curr) => {
        const win = curr[id]
        if (!win) return curr
        return {
          ...curr,
          [id]: {
            ...win,
            isOpen: true,
            isMinimized: false,
          },
        }
      })
      bringToFront(id)
    },
    [windows, isAdmin, bringToFront]
  )

  const closeWindow = React.useCallback((id: AppId) => {
    setWindows((curr) => {
      const win = curr[id]
      if (!win) return curr
      return {
        ...curr,
        [id]: {
          ...win,
          isOpen: false,
        },
      }
    })
    setActiveWindowId((current) => (current === id ? null : current))
  }, [])

  const minimizeWindow = React.useCallback((id: AppId) => {
    setWindows((curr) => {
      const win = curr[id]
      if (!win) return curr
      return {
        ...curr,
        [id]: {
          ...win,
          isMinimized: true,
        },
      }
    })
    setActiveWindowId((current) => (current === id ? null : current))
  }, [])

  const maximizeWindow = React.useCallback((id: AppId) => {
    setWindows((curr) => {
      const win = curr[id]
      if (!win) return curr
      return {
        ...curr,
        [id]: {
          ...win,
          isMaximized: !win.isMaximized,
          isMinimized: false,
        },
      }
    })
    bringToFront(id)
  }, [bringToFront])

  const toggleWindow = React.useCallback(
    (id: AppId) => {
      const target = windows[id]
      if (!target) return
      if (target.adminOnly && !isAdmin) return
      if (target.isComingSoon) {
        setComingSoonApp(target)
        return
      }

      setWindows((curr) => {
        const win = curr[id]
        if (!win) return curr
        if (!win.isOpen) {
          return {
            ...curr,
            [id]: { ...win, isOpen: true, isMinimized: false },
          }
        }
        if (win.isMinimized) {
          return {
            ...curr,
            [id]: { ...win, isMinimized: false },
          }
        }
        if (activeWindowId === id) {
          return {
            ...curr,
            [id]: { ...win, isMinimized: true },
          }
        }
        return curr
      })

      if (activeWindowId === id && windows[id]?.isOpen && !windows[id]?.isMinimized) {
        setActiveWindowId(null)
      } else {
        bringToFront(id)
      }
    },
    [activeWindowId, windows, isAdmin, bringToFront]
  )

  const updatePosition = React.useCallback((id: AppId, pos: { x: number; y: number }) => {
    setWindows((curr) => {
      const win = curr[id]
      if (!win) return curr
      return {
        ...curr,
        [id]: {
          ...win,
          position: pos,
        },
      }
    })
  }, [])

  React.useEffect(() => {
    const handleOpenApp = (e: Event) => {
      const customEvent = e as CustomEvent<{ appId: AppId }>
      const targetId = customEvent.detail?.appId
      if (targetId) {
        openWindow(targetId)
        bringToFront(targetId)
      }
    }
    window.addEventListener("open-app", handleOpenApp)
    return () => window.removeEventListener("open-app", handleOpenApp)
  }, [openWindow, bringToFront])

  return (
    <DesktopContext.Provider
      value={{
        windows,
        activeWindowId,
        comingSoonApp,
        openWindow,
        closeWindow,
        minimizeWindow,
        maximizeWindow,
        bringToFront,
        toggleWindow,
        updatePosition,
        openComingSoonDialog,
        closeComingSoonDialog,
        isAboutOpen,
        openAboutDialog,
        closeAboutDialog,
      }}
    >
      {children}
    </DesktopContext.Provider>
  )
}

export function useDesktop() {
  const context = React.useContext(DesktopContext)
  if (!context) {
    throw new Error("useDesktop must be used within a DesktopProvider")
  }
  return context
}
