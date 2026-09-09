"use client"

import * as React from "react"

interface AuthContextType {
  isUnlocked: boolean
  currentMember: string | null
  teamMembers: string[]
  unlockWithPin: (pin: string) => boolean
  setMember: (name: string) => void
  addMember: (name: string) => void
  lockSystem: () => void
}

const DEFAULT_MEMBERS = ["Ajie", "Andi", "Dika", "Raka", "Dewi", "Budi", "Siti"]
const TEAM_PIN = process.env.NEXT_PUBLIC_TEAM_PASSCODE || "1337"

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isUnlocked, setIsUnlocked] = React.useState<boolean>(false)
  const [currentMember, setCurrentMember] = React.useState<string | null>(null)
  const [teamMembers, setTeamMembers] = React.useState<string[]>(DEFAULT_MEMBERS)
  const [isInitialized, setIsInitialized] = React.useState<boolean>(false)

  React.useEffect(() => {
    // Load from local storage on client mount
    try {
      const savedUnlocked = localStorage.getItem("ti_things_unlocked") === "true"
      const savedMember = localStorage.getItem("ti_things_member")
      const savedMembers = localStorage.getItem("ti_things_member_list")

      if (savedUnlocked) setIsUnlocked(true)
      if (savedMember) setCurrentMember(savedMember)
      if (savedMembers) {
        const parsed = JSON.parse(savedMembers)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTeamMembers(parsed)
        }
      }
    } catch {
      // ignore localStorage errors
    } finally {
      setIsInitialized(true)
    }
  }, [])

  const unlockWithPin = (pin: string): boolean => {
    if (pin.trim() === TEAM_PIN.trim()) {
      setIsUnlocked(true)
      try {
        localStorage.setItem("ti_things_unlocked", "true")
      } catch {}
      return true
    }
    return false
  }

  const setMember = (name: string) => {
    setCurrentMember(name)
    try {
      localStorage.setItem("ti_things_member", name)
    } catch {}
  }

  const addMember = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || teamMembers.includes(trimmed)) return
    const updated = [...teamMembers, trimmed]
    setTeamMembers(updated)
    try {
      localStorage.setItem("ti_things_member_list", JSON.stringify(updated))
    } catch {}
  }

  const lockSystem = () => {
    setIsUnlocked(false)
    try {
      localStorage.removeItem("ti_things_unlocked")
    } catch {}
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#F3F1EA] flex items-center justify-center font-mono text-sm text-[#14253D]">
        INITIALIZING TI-THINGS.EXE...
      </div>
    )
  }

  return (
    <AuthContext.Provider
      value={{
        isUnlocked,
        currentMember,
        teamMembers,
        unlockWithPin,
        setMember,
        addMember,
        lockSystem,
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
