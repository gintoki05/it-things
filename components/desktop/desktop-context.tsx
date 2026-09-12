"use client"

import * as React from "react"
import { useAuth } from "@/lib/auth"

export type AppId = "vote" | "wheel" | "splitbill" | "kas" | "team" | "chat" | "readme" | "pantry" | "lapak" | "iexplore" | "paintwar" | "game" | "wordle" | "winamp"

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
  isHidden?: boolean
  hideFromDesktop?: boolean
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
  isWhatsNewOpen: boolean
  openWhatsNewDialog: () => void
  closeWhatsNewDialog: () => void
  toggleShowDesktop: () => void
  isAllMinimized: boolean
}

const DesktopContext = React.createContext<DesktopContextType | undefined>(undefined)

const INITIAL_WINDOWS: Record<AppId, WindowState> = {
  readme: {
    id: "readme",
    title: "Notepad - README.txt",
    icon: "task",
    filename: "README.txt",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 15,
    position: { x: 200, y: 35 },
    size: { width: 580, height: 490 },
    defaultSize: { width: 580, height: 490 },
    defaultPos: { x: 200, y: 35 },
  },
  vote: {
    id: "vote",
    title: "Vote.exe - Poll & Vote Groups",
    icon: "vote",
    filename: "vote.exe",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 10,
    position: { x: 195, y: 24 },
    size: { width: 780, height: 560 },
    defaultSize: { width: 780, height: 560 },
    defaultPos: { x: 195, y: 24 },
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
    position: { x: 220, y: 44 },
    size: { width: 720, height: 580 },
    defaultSize: { width: 720, height: 580 },
    defaultPos: { x: 220, y: 44 },
    isComingSoon: true,
    isHidden: true,
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
    position: { x: 245, y: 64 },
    size: { width: 760, height: 600 },
    defaultSize: { width: 760, height: 600 },
    defaultPos: { x: 245, y: 64 },
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
    position: { x: 270, y: 84 },
    size: { width: 760, height: 570 },
    defaultSize: { width: 760, height: 570 },
    defaultPos: { x: 270, y: 84 },
  },
  pantry: {
    id: "pantry",
    title: "Pantry.exe - Snack Bar & Kuota Makanan",
    icon: "pantry",
    filename: "pantry.exe",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 14,
    position: { x: 215, y: 40 },
    size: { width: 780, height: 580 },
    defaultSize: { width: 780, height: 580 },
    defaultPos: { x: 215, y: 40 },
  },
  lapak: {
    id: "lapak",
    title: "Lapak_Teman.exe - Etalase & Iklan Usaha Teman",
    icon: "gift",
    filename: "lapak.exe",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 16,
    position: { x: 235, y: 55 },
    size: { width: 780, height: 580 },
    defaultSize: { width: 780, height: 580 },
    defaultPos: { x: 235, y: 55 },
  },
  team: {
    id: "team",
    title: "Team.exe - Direktori & Pengaturan Anggota",
    icon: "team",
    filename: "team.exe",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 15,
    position: { x: 295, y: 104 },
    size: { width: 740, height: 560 },
    defaultSize: { width: 740, height: 560 },
    defaultPos: { x: 295, y: 104 },
    hideFromDesktop: false,
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
  iexplore: {
    id: "iexplore",
    title: "Internet Explorer - YouTube",
    icon: "search",
    filename: "iexplore.exe",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 11,
    position: { x: 210, y: 30 },
    size: { width: 840, height: 600 },
    defaultSize: { width: 840, height: 600 },
    defaultPos: { x: 210, y: 30 },
    isHidden: true,
  },
  paintwar: {
    id: "paintwar",
    title: "PAINT_WAR.EXE - Retro Gartic 98",
    icon: "game",
    filename: "paintwar.exe",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 14,
    position: { x: 180, y: 30 },
    size: { width: 880, height: 600 },
    defaultSize: { width: 880, height: 600 },
    defaultPos: { x: 180, y: 30 },
    hideFromDesktop: true,
  },
  game: {
    id: "game",
    title: "Game.exe - Koleksi Game IT-Things",
    icon: "game",
    filename: "game.exe",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 14,
    position: { x: 230, y: 60 },
    size: { width: 560, height: 420 },
    defaultSize: { width: 560, height: 420 },
    defaultPos: { x: 230, y: 60 },
  },
  wordle: {
    id: "wordle",
    title: "Wordle98.exe - Tebak Kata Harian 98",
    icon: "edit",
    filename: "wordle.exe",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 14,
    position: { x: 260, y: 50 },
    size: { width: 440, height: 620 },
    defaultSize: { width: 440, height: 620 },
    defaultPos: { x: 260, y: 50 },
    hideFromDesktop: true,
  },
  winamp: {
    id: "winamp",
    title: "WINAMP.EXE - Winamp 2.91 Media Player",
    icon: "📻",
    filename: "winamp.exe",
    isOpen: false,
    isMinimized: false,
    isMaximized: false,
    zIndex: 14,
    position: { x: 260, y: 30 },
    size: { width: 540, height: 680 },
    defaultSize: { width: 540, height: 680 },
    defaultPos: { x: 260, y: 30 },
  },
}

export function DesktopProvider({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth()
  const [windows, setWindows] = React.useState<Record<AppId, WindowState>>(INITIAL_WINDOWS)
  const [activeWindowId, setActiveWindowId] = React.useState<AppId | null>(null)
  const [topZIndex, setTopZIndex] = React.useState(20)
  const [comingSoonApp, setComingSoonApp] = React.useState<WindowState | null>(null)
  const [isAboutOpen, setIsAboutOpen] = React.useState(false)
  const [isWhatsNewOpen, setIsWhatsNewOpen] = React.useState(false)

  // Otomatis buka app dari URL query params atau load default desktop layout
  React.useEffect(() => {
    if (typeof window === "undefined") return

    const isLargeScreen = window.innerWidth >= 1024
    const isMobile = window.innerWidth < 768
    const hasSeenReadme = localStorage.getItem("it_things_readme_seen") === "true"

    const urlParams = new URLSearchParams(window.location.search)
    let requestedApp = urlParams.get("app") as AppId | null
    if (!requestedApp && (urlParams.get("id") || urlParams.get("voteId") || urlParams.get("vote_id"))) {
      requestedApp = "vote"
    } else if (!requestedApp && (urlParams.get("billId") || urlParams.get("bill_id"))) {
      requestedApp = "splitbill"
    }

    const validApps: AppId[] = [
      "vote",
      "splitbill",
      "kas",
      "team",
      "chat",
      "readme",
      "pantry",
      "lapak",
      "paintwar",
      "game",
      "wordle",
      "winamp",
    ]
    const targetApp = requestedApp && validApps.includes(requestedApp) ? requestedApp : null

    if (targetApp) {
      setActiveWindowId(targetApp)
      setTopZIndex(25)
    } else if (!isMobile) {
      setActiveWindowId("chat")
    }

    setWindows((curr) => {
      const chatWin = curr.chat
      const readmeWin = curr.readme
      if (!chatWin) return curr

      let nextChat = chatWin
      let nextReadme = readmeWin

      if ((hasSeenReadme || (targetApp && targetApp !== "readme")) && readmeWin) {
        nextReadme = {
          ...readmeWin,
          isOpen: false,
        }
      }

      if (isMobile) {
        // Pada mobile, jangan auto-open chat agar tidak langsung menumpuk full-screen
        nextChat = {
          ...chatWin,
          isOpen: false,
        }
      } else if (isLargeScreen) {
        const targetX = Math.max(720, window.innerWidth - 460)
        const targetHeight = Math.max(620, window.innerHeight - 56)
        nextChat = {
          ...chatWin,
          isOpen: true,
          position: { x: targetX, y: 10 },
          size: { width: 440, height: targetHeight },
          defaultPos: { x: targetX, y: 10 },
          defaultSize: { width: 440, height: targetHeight },
        }
      }

      const updated = {
        ...curr,
        chat: nextChat,
        readme: nextReadme || curr.readme,
      }

      if (targetApp && updated[targetApp]) {
        updated[targetApp] = {
          ...updated[targetApp],
          isOpen: true,
          isMinimized: false,
          zIndex: 25,
        }
      }

      return updated
    })
  }, [])

  const activeWindowIdRef = React.useRef(activeWindowId)
  activeWindowIdRef.current = activeWindowId

  const bringToFront = React.useCallback(
    (id: AppId) => {
      if (id === "chat" && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("chat-focused"))
      }
      if (activeWindowIdRef.current === id) {
        // Window sudah aktif di depan, jangan trigger re-render state
        setWindows((curr) => {
          if (curr[id]?.isMinimized) {
            return {
              ...curr,
              [id]: { ...curr[id], isMinimized: false },
            }
          }
          return curr
        })
        return
      }

      setTopZIndex((prev) => {
        const nextZ = prev + 1
        setWindows((curr) => {
          const win = curr[id] || INITIAL_WINDOWS[id]
          if (!win) return curr
          return {
            ...curr,
            [id]: {
              ...win,
              zIndex: nextZ,
              isMinimized: false,
            },
          }
        })
        return nextZ
      })
      setActiveWindowId(id)
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

  const openWhatsNewDialog = React.useCallback(() => {
    setIsWhatsNewOpen(true)
  }, [])

  const closeWhatsNewDialog = React.useCallback(() => {
    setIsWhatsNewOpen(false)
  }, [])

  const openWindow = React.useCallback(
    (id: AppId) => {
      const target = windows[id] || INITIAL_WINDOWS[id]
      if (!target || target.isHidden) return
      if (target.adminOnly && !isAdmin) return
      if (target.isComingSoon) {
        setComingSoonApp(target)
        return
      }

      setWindows((curr) => {
        const win = curr[id] || INITIAL_WINDOWS[id]
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

  const [minimizedSnapshot, setMinimizedSnapshot] = React.useState<AppId[]>([])
  const [lastFocusedId, setLastFocusedId] = React.useState<AppId | null>(null)

  // Jendela yang sedang terbuka dan tidak dalam kondisi minimized
  const visibleWindows = React.useMemo(() => {
    return Object.values(windows).filter((w) => w.isOpen && !w.isMinimized && !w.isHidden)
  }, [windows])

  const isAllMinimized = visibleWindows.length === 0

  const toggleShowDesktop = React.useCallback(() => {
    if (visibleWindows.length > 0) {
      // CASE 1: Ada jendela yang sedang terlihat -> snapshot lalu minimize semua
      const currentVisibleIds = visibleWindows.map((w) => w.id)
      setMinimizedSnapshot(currentVisibleIds)
      setLastFocusedId(activeWindowId)

      setWindows((curr) => {
        const next = { ...curr }
        currentVisibleIds.forEach((id) => {
          if (next[id]) {
            next[id] = { ...next[id], isMinimized: true }
          }
        })
        return next
      })
      setActiveWindowId(null)
    } else {
      // CASE 2: Semua jendela sedang minimize -> restore snapshot atau semua window yang isOpen
      const targets = minimizedSnapshot.length > 0
        ? minimizedSnapshot
        : Object.values(windows).filter((w) => w.isOpen && !w.isHidden).map((w) => w.id)

      if (targets.length === 0) return

      setWindows((curr) => {
        const next = { ...curr }
        targets.forEach((id) => {
          if (next[id]) {
            next[id] = { ...next[id], isMinimized: false }
          }
        })
        return next
      })

      const targetToFocus = lastFocusedId && targets.includes(lastFocusedId)
        ? lastFocusedId
        : targets[targets.length - 1]

      if (targetToFocus) {
        bringToFront(targetToFocus)
      }
      setMinimizedSnapshot([])
      setLastFocusedId(null)
    }
  }, [visibleWindows, activeWindowId, minimizedSnapshot, lastFocusedId, windows, bringToFront])

  // Shortcut keyboard: Alt + D untuk Show Desktop
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "d" || e.key === "D")) {
        e.preventDefault()
        toggleShowDesktop()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleShowDesktop])

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

  const contextValue = React.useMemo(
    () => ({
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
      isWhatsNewOpen,
      openWhatsNewDialog,
      closeWhatsNewDialog,
      toggleShowDesktop,
      isAllMinimized,
    }),
    [
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
      isWhatsNewOpen,
      openWhatsNewDialog,
      closeWhatsNewDialog,
      toggleShowDesktop,
      isAllMinimized,
    ]
  )

  return (
    <DesktopContext.Provider value={contextValue}>
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
