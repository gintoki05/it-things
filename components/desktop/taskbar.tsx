"use client"

import * as React from "react"
import { useDesktop, AppId } from "./desktop-context"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { UserAvatar } from "@/components/retro/user-avatar"
import { 
  LogOut, 
  LogIn, 
  ShieldCheck, 
  Database, 
  Sparkles, 
  Laptop,
  CheckCircle2,
  AlertCircle
} from "lucide-react"

interface TaskbarProps {
  onOpenLoginModal?: () => void
}

export function Taskbar({ onOpenLoginModal }: TaskbarProps) {
  const { windows, activeWindowId, openWindow, toggleWindow } = useDesktop()
  const { user, isTreasurer, isSupabaseConnected, signOut, setDemoUserRole } = useAuth()

  const [isStartOpen, setIsStartOpen] = React.useState(false)
  const [time, setTime] = React.useState("12:00")
  const startMenuRef = React.useRef<HTMLDivElement>(null)

  // Clock
  React.useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })
      )
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  // Close start menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (startMenuRef.current && !startMenuRef.current.contains(e.target as Node)) {
        setIsStartOpen(false)
      }
    }
    if (isStartOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isStartOpen])

  const openWindows = Object.values(windows).filter((w) => w.isOpen)

  return (
    <>
      {/* Start Menu Dropdown */}
      {isStartOpen && (
        <div
          ref={startMenuRef}
          className="fixed bottom-[44px] left-1 z-50 w-72 bg-[#D4DDE6] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] shadow-2xl flex rounded-t-[3px] select-none overflow-hidden"
        >
          {/* Windows 98 Style Vertical Banner */}
          <div className="w-9 bg-gradient-to-t from-[#102A45] via-[#1E4E8C] to-[#2E6FB5] flex items-end justify-center pb-4 text-white font-mono font-black text-sm tracking-widest uppercase select-none">
            <span
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              className="tracking-widest flex items-center gap-2 text-blue-100"
            >
              IT-THINGS <span className="text-[#FFD700]">98</span>
            </span>
          </div>

          {/* Start Menu Content */}
          <div className="flex-1 flex flex-col p-1.5 text-xs text-[#14253D] space-y-1">
            {/* User Profile Header */}
            <div className="p-2 bg-white/60 rounded border border-[#A4B5C6] flex items-center gap-2">
              <UserAvatar
                src={user?.avatarUrl}
                name={user?.name || "IT"}
                size="size-8"
                textClass="text-xs"
              />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-[11px] truncate">{user?.name || "Tamu Internal IT"}</div>
                <div className="flex items-center gap-1 text-[10px] text-gray-600">
                  {isTreasurer ? (
                    <span className="text-amber-700 font-semibold flex items-center gap-0.5">
                      <ShieldCheck className="size-3" /> Bendahara
                    </span>
                  ) : (
                    <span>Anggota Tim</span>
                  )}
                </div>
              </div>
            </div>

            {/* Apps List */}
            <div className="py-1 border-t border-[#A4B5C6]/60">
              <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono">
                Programs (.exe)
              </div>
              {Object.values(windows).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    openWindow(item.id)
                    setIsStartOpen(false)
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-[#1E4E8C] hover:text-white rounded-[2px] transition-colors text-left"
                >
                  <span className="text-base">{item.icon}</span>
                  <div className="min-w-0">
                    <div className="font-bold text-[11px]">{item.filename}</div>
                    <div className="text-[9px] opacity-80 truncate">{item.title.split(" - ")[1]}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Role Switcher (Treasurer Demo) */}
            <div className="p-1.5 bg-[#E8EEF5] border border-[#A4B5C6] rounded text-[10px]">
              <div className="font-bold flex items-center justify-between mb-1">
                <span>Mode Peran:</span>
                <span className={isTreasurer ? "text-amber-700 font-bold" : "text-gray-600"}>
                  {isTreasurer ? "👑 Bendahara" : "👤 Anggota"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (setDemoUserRole) {
                    setDemoUserRole(isTreasurer ? "member" : "treasurer")
                  }
                }}
                className="w-full py-1 px-2 bg-white border border-[#7D8E9E] hover:bg-gray-50 rounded active:translate-y-px text-center font-mono text-[10px] text-[#1E4E8C] font-semibold"
              >
                Ganti ke {isTreasurer ? "Mode Anggota Biasa" : "Mode Bendahara Kas"}
              </button>
            </div>

            {/* Auth Action */}
            <div className="pt-1 border-t border-[#A4B5C6]/60">
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    signOut()
                    setIsStartOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[#C53030] hover:text-white rounded-[2px] transition-colors text-left font-semibold text-[11px]"
                >
                  <LogOut className="size-3.5" />
                  <span>Log Off {user.name.split(" ")[0]}...</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsStartOpen(false)
                    onOpenLoginModal?.()
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 bg-[#1E4E8C] text-white hover:bg-[#153A6B] rounded-[2px] transition-colors text-left font-semibold text-[11px]"
                >
                  <LogIn className="size-3.5" />
                  <span>Masuk dengan Google</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Taskbar */}
      <footer className="fixed bottom-0 left-0 right-0 h-[44px] bg-[#D4DDE6] border-t-2 border-t-white border-b border-b-[#5E7287] shadow-md flex items-center px-1.5 gap-2 select-none z-50">
        {/* Start Button */}
        <button
          type="button"
          onClick={() => setIsStartOpen((prev) => !prev)}
          className={cn(
            "h-8 px-2.5 flex items-center gap-1.5 font-sans font-bold text-xs text-[#14253D] rounded-[2px] transition-all border",
            isStartOpen
              ? "bg-[#BCC9D6] border-t-[#5E7287] border-l-[#5E7287] border-r-white border-b-white translate-y-px"
              : "bg-[#D4DDE6] border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] hover:bg-[#DEE6EE] shadow-[1px_1px_0px_#5E7287]"
          )}
        >
          <div className="size-4 bg-gradient-to-tr from-[#1E4E8C] to-[#4299E1] rounded-[2px] flex items-center justify-center text-[10px] text-white shadow-inner font-mono font-black">
            田
          </div>
          <span className="tracking-wide font-mono text-[11px]">Start</span>
        </button>

        <div className="h-6 w-px bg-[#A4B5C6] mx-0.5" />

        {/* Running Applications in Taskbar */}
        <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {openWindows.map((win) => {
            const isActive = activeWindowId === win.id && !win.isMinimized

            return (
              <button
                key={win.id}
                type="button"
                onClick={() => toggleWindow(win.id)}
                className={cn(
                  "h-7 max-w-[170px] px-2 flex items-center gap-1.5 rounded-[2px] text-xs font-mono font-medium truncate transition-all border",
                  isActive
                    ? "bg-[#BDCCD9] border-t-[#5E7287] border-l-[#5E7287] border-r-white border-b-white text-[#14253D] font-bold shadow-inner"
                    : "bg-[#D4DDE6] border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] text-gray-700 hover:bg-[#DEE6EE]"
                )}
              >
                <span className="text-sm shrink-0">{win.icon}</span>
                <span className="truncate text-[11px] font-sans">{win.filename}</span>
              </button>
            )
          })}
        </div>

        {/* System Tray */}
        <div className="h-7 px-2.5 bg-[#CBD5E1] border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] flex items-center gap-2.5 shrink-0 text-xs font-mono text-[#14253D]">
          {/* Connection Indicator */}
          <div
            title={isSupabaseConnected ? "Supabase Realtime: Terhubung" : "Mode Demo (Local Storage)"}
            className="flex items-center gap-1 cursor-help"
          >
            <span
              className={cn(
                "size-2 rounded-full animate-pulse",
                isSupabaseConnected ? "bg-emerald-500" : "bg-amber-500"
              )}
            />
            <span className="text-[10px] hidden sm:inline font-sans font-semibold text-gray-700">
              {isSupabaseConnected ? "LIVE" : "DEMO"}
            </span>
          </div>

          {/* Clock */}
          <div className="font-bold text-[11px] tracking-wider text-slate-800">{time}</div>
        </div>
      </footer>
    </>
  )
}
