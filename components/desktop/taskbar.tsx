"use client"

import * as React from "react"
import { useDesktop, AppId } from "./desktop-context"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { UserAvatar } from "@/components/retro/user-avatar"
import { RetroIcon } from "@/components/ui/retro-icon"
import { 
  LogOut, 
  LogIn, 
  ShieldCheck, 
  Database, 
  Sparkles, 
  Laptop,
  CheckCircle2,
  AlertCircle,
  Crown,
  User,
  Lock,
  Eye,
  ShieldAlert,
  Edit3,
  Info,
  Volume2,
  VolumeX,
  Monitor
} from "lucide-react"
import { EditProfileModal } from "@/components/auth/edit-profile-modal"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { APP_VERSION, APP_BUILD } from "@/lib/version"
import { useNotification } from "@/lib/notification-store"
import { RetroNotificationToast } from "@/components/desktop/retro-notification-toast"
import { TaskbarTicker } from "@/components/desktop/taskbar-ticker"
import { usePicStore } from "@/lib/pic-store"
import { useWallpaper } from "@/lib/wallpaper-store"

interface TaskbarProps {
  onOpenLoginModal?: () => void
}

export function Taskbar({ onOpenLoginModal }: TaskbarProps) {
  const { windows, activeWindowId, openWindow, toggleWindow, openAboutDialog, toggleShowDesktop, isAllMinimized } = useDesktop()
  const { openDialog: openWallpaperDialog } = useWallpaper()
  const { user, isAdmin, isTreasurer, isGuest, isSupabaseConnected, signOut, setDemoUserRole, lockApp, canSwitchRole } = useAuth()
  const { isKasPic, isPantryPic } = usePicStore()
  const {
    isMuted,
    unreadChatCount,
    toggleMute,
    clearUnreadChat,
    requestNotificationPermission,
    hasBrowserNotificationSupport,
    browserPermission,
  } = useNotification()

  const [isStartOpen, setIsStartOpen] = React.useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false)
  const [time, setTime] = React.useState("12:00")
  const [isKeyboardOpen, setIsKeyboardOpen] = React.useState(false)
  const startMenuRef = React.useRef<HTMLDivElement>(null)
  const startBtnRef = React.useRef<HTMLButtonElement>(null)

  // Track virtual keyboard on mobile to prevent taskbar from overlaying chat
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return
    const handleVV = () => {
      if (window.innerWidth >= 768) {
        setIsKeyboardOpen(false)
        return
      }
      const kbActive = (window.innerHeight - window.visualViewport.height) > 100
      setIsKeyboardOpen(kbActive)
    }
    window.visualViewport.addEventListener("resize", handleVV)
    return () => window.visualViewport?.removeEventListener("resize", handleVV)
  }, [])

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
      if (
        startMenuRef.current &&
        !startMenuRef.current.contains(e.target as Node) &&
        startBtnRef.current &&
        !startBtnRef.current.contains(e.target as Node)
      ) {
        setIsStartOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsStartOpen(false)
      }
    }
    if (isStartOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isStartOpen])

  const openWindows = Object.values(windows).filter((w) => w.isOpen && !w.isHidden && (!w.adminOnly || isAdmin))
  const programItems = Object.values(windows).filter((item) => !item.isHidden && (!item.adminOnly || isAdmin))

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
            <div className="p-2 bg-white/60 rounded border border-[#A4B5C6] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <UserAvatar
                  src={user?.avatarUrl}
                  name={user?.name || "IT"}
                  size="size-8"
                  textClass="text-xs"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[11px] truncate">{user?.name || "Tamu Internal IT"}</div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-600">
                    {isGuest ? (
                      <span className="text-amber-800 font-bold flex items-center gap-1 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                        <Eye className="size-3" /> Mode Tamu (Read-Only)
                      </span>
                    ) : isAdmin ? (
                      <span className="text-purple-700 font-semibold flex items-center gap-0.5">
                        <ShieldCheck className="size-3" /> Administrator
                      </span>
                    ) : (
                      <span>Anggota Tim</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsStartOpen(false)
                  setIsProfileModalOpen(true)
                }}
                title="Edit Profil & Nama"
                className="p-1 hover:bg-[#A4B5C6]/40 rounded text-gray-600 hover:text-[#1E4E8C] transition-colors shrink-0"
              >
                <Edit3 className="size-3.5" />
              </button>
            </div>

            {/* Apps List */}
            <div className="py-1 border-t border-[#A4B5C6]/60">
              <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono">
                Programs (.exe)
              </div>
              {programItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    openWindow(item.id)
                    setIsStartOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[2px] transition-colors text-left",
                    item.isComingSoon
                      ? "hover:bg-[#1E4E8C]/20 text-[#14253D]"
                      : "hover:bg-[#1E4E8C] hover:text-white"
                  )}
                >
                  <RetroIcon name={item.icon || item.id} iconSize={32} className="size-5 object-contain shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[11px] flex items-center justify-between gap-1">
                      <span className="truncate">{item.filename}</span>
                      {item.isComingSoon && (
                        <span className="text-[8px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300 px-1 py-0.2 rounded shrink-0">
                          Soon
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] opacity-80 truncate">{item.title.split(" - ")[1]}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Role Switcher or Guest Notice */}
            {isGuest ? (
              <div className="p-2 bg-amber-50 border border-amber-300 rounded text-[10px] space-y-1">
                <div className="font-bold text-amber-900 flex items-center gap-1">
                  <ShieldAlert className="size-3.5 text-amber-700" /> Mode Akses Tamu
                </div>
                <p className="text-amber-800 text-[9px] leading-tight">
                  Status Anda hanya dapat melihat data (Read-Only). Masuk dengan Google untuk berpartisipasi.
                </p>
              </div>
            ) : canSwitchRole ? (
              <div className="p-1.5 bg-[#E8EEF5] border border-[#A4B5C6] rounded text-[10px]">
                <div className="font-bold flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <span>Mode Peran:</span>
                    {user?.role !== (user?.realRole || "admin") && (
                      <span className="text-[8px] bg-amber-100 text-amber-800 border border-amber-300 px-1 rounded font-mono font-normal">
                        Simulasi
                      </span>
                    )}
                  </div>
                  <span
                    className={
                      isAdmin
                        ? "text-purple-700 font-bold flex items-center gap-1"
                        : "text-gray-600 font-bold flex items-center gap-1"
                    }
                  >
                    {isAdmin ? (
                      <>
                        <ShieldCheck className="size-3 text-purple-700" /> Admin
                      </>
                    ) : (
                      <>
                        <User className="size-3 text-gray-600" /> Anggota
                      </>
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setDemoUserRole && setDemoUserRole("member")}
                    className={`py-0.5 px-1 border rounded text-[9px] font-mono text-center transition-colors ${
                      user?.role === "member"
                        ? "bg-[#1E4E8C] text-white font-bold border-[#102A45]"
                        : "bg-white text-gray-700 hover:bg-gray-100 border-[#7D8E9E]"
                    }`}
                  >
                    Member
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemoUserRole && setDemoUserRole("admin")}
                    className={`py-0.5 px-1 border rounded text-[9px] font-mono text-center transition-colors ${
                      user?.role === "admin"
                        ? "bg-purple-700 text-white font-bold border-purple-900"
                        : "bg-white text-gray-700 hover:bg-gray-100 border-[#7D8E9E]"
                    }`}
                  >
                    Admin
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-1.5 bg-[#E8EEF5] border border-[#A4B5C6] rounded text-[10px] flex items-center justify-between">
                <span className="font-semibold text-gray-700">Peran Akun:</span>
                <span
                  className={
                    isAdmin
                      ? "text-purple-700 font-bold flex items-center gap-1"
                      : "text-[#1E4E8C] font-bold flex items-center gap-1"
                  }
                >
                  {isAdmin ? (
                    <>
                      <ShieldCheck className="size-3 text-purple-700" /> Admin
                    </>
                  ) : (
                    <>
                      <User className="size-3 text-[#1E4E8C]" /> Anggota Tim
                    </>
                  )}
                </span>
              </div>
            )}

            {/* Auth Action */}
            <div className="pt-1 border-t border-[#A4B5C6]/60 space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setIsStartOpen(false)
                  openAboutDialog()
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[#A4B5C6]/30 text-[#14253D] rounded-[2px] transition-colors text-left font-semibold text-[11px]"
              >
                <Info className="size-3.5 text-[#1E4E8C]" />
                <span>Tentang IT-Things ({APP_VERSION})...</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsStartOpen(false)
                  lockApp()
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[#A4B5C6]/30 text-[#14253D] rounded-[2px] transition-colors text-left font-semibold text-[11px]"
              >
                <Lock className="size-3.5 text-[#1E4E8C]" />
                <span>Kunci Layar (Lock PIN)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsStartOpen(false)
                  setIsProfileModalOpen(true)
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[#A4B5C6]/30 text-[#14253D] rounded-[2px] transition-colors text-left font-semibold text-[11px]"
              >
                <Edit3 className="size-3.5 text-[#1E4E8C]" />
                <span>Edit Profil & Nama...</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsStartOpen(false)
                  openWallpaperDialog()
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[#A4B5C6]/30 text-[#14253D] rounded-[2px] transition-colors text-left font-semibold text-[11px]"
              >
                <Monitor className="size-3.5 text-[#1E4E8C]" />
                <span>Pengaturan Tampilan (Wallpaper)...</span>
              </button>

              {isGuest ? (
                <>
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
                  <button
                    type="button"
                    onClick={() => {
                      setIsStartOpen(false)
                      setShowLogoutConfirm(true)
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[#C53030] hover:text-white rounded-[2px] transition-colors text-left font-semibold text-[11px]"
                  >
                    <LogOut className="size-3.5" />
                    <span>Keluar Mode Tamu</span>
                  </button>
                </>
              ) : user ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsStartOpen(false)
                    setShowLogoutConfirm(true)
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
      <footer className={cn(
        "fixed bottom-0 left-0 right-0 h-[44px] bg-[#D4DDE6] border-t-2 border-t-white border-b border-b-[#5E7287] shadow-md flex items-center px-1.5 gap-2 select-none z-50 transition-opacity",
        isKeyboardOpen && "hidden"
      )}>
        {/* Start Button */}
        <button
          ref={startBtnRef}
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

        {/* Quick Launch Toolbar Windows 98 */}
        <div className="flex items-center gap-1 pl-1 pr-1.5 border-l-2 border-l-white border-r border-r-[#7D8E9E]/80 h-7 select-none shrink-0">
          {/* Quick Launch Embossed Gripper */}
          <div className="flex flex-col gap-0.5 px-0.5 opacity-60">
            <div className="w-0.5 h-3.5 bg-[#5E7287] shadow-[1px_1px_0px_white]" />
          </div>

          {/* Show Desktop Quick Launch Button */}
          <button
            type="button"
            onClick={toggleShowDesktop}
            title={
              isAllMinimized
                ? "Kembalikan Semua Jendela (Restore Windows - Alt+D)"
                : "Tampilkan Desktop (Minimize Semua Jendela - Alt+D)"
            }
            className={cn(
              "size-7 rounded-[2px] flex items-center justify-center transition-all cursor-pointer border",
              isAllMinimized
                ? "bg-[#BDCCD9] border-t-[#5E7287] border-l-[#5E7287] border-r-white border-b-white translate-y-px shadow-inner"
                : "bg-[#D4DDE6] border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] hover:bg-[#DEE6EE] shadow-[1px_1px_0px_#5E7287] active:translate-y-px"
            )}
          >
            {/* Authentic Windows 98 Show Desktop Icon */}
            <svg className="size-4 drop-shadow-[0.5px_0.5px_0px_rgba(0,0,0,0.3)]" viewBox="0 0 16 16" fill="none">
              {/* Desktop Screen base */}
              <rect x="1.5" y="2.5" width="13" height="9" rx="1" fill="#1A365D" stroke="#102A45" strokeWidth="1" />
              {/* Blue Desktop Wallpaper */}
              <rect x="2" y="3" width="12" height="8" fill="#1E4E8C" />
              {/* Window Pad */}
              <rect x="3.5" y="4.5" width="7" height="5" rx="0.5" fill="#D4DDE6" stroke="#5E7287" strokeWidth="0.8" />
              <rect x="4" y="5" width="6" height="1" fill="#1E4E8C" />
              {/* Pen / Pencil / Restore Pointer */}
              <path d="M12 5.5L8.5 9M8.5 9L7 11.5L9.5 10L12 5.5Z" fill="#FBBF24" stroke="#B45309" strokeWidth="0.6" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Running Applications in Taskbar */}
        <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {openWindows.map((win) => {
            const isActive = activeWindowId === win.id && !win.isMinimized
            const isUnreadChat = win.id === "chat" && unreadChatCount > 0 && !isActive

            return (
              <button
                key={win.id}
                type="button"
                onClick={() => {
                  if (win.id === "chat") clearUnreadChat()
                  toggleWindow(win.id)
                }}
                className={cn(
                  "h-7 max-w-[170px] px-2 flex items-center gap-1.5 rounded-[2px] text-xs font-mono font-medium truncate transition-all border relative",
                  isActive
                    ? "bg-[#BDCCD9] border-t-[#5E7287] border-l-[#5E7287] border-r-white border-b-white text-[#14253D] font-bold shadow-inner"
                    : "bg-[#D4DDE6] border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] text-gray-700 hover:bg-[#DEE6EE]",
                  isUnreadChat && "animate-pulse border-amber-500 bg-amber-100 text-[#1E4E8C] font-bold shadow-xs"
                )}
              >
                <RetroIcon name={win.icon || win.id} iconSize={32} className="size-4 shrink-0 object-contain" />
                <span className="truncate text-[11px] font-sans">{win.filename}</span>
                {isUnreadChat && (
                  <span className="ml-auto px-1 rounded-full bg-red-600 text-white font-mono font-black text-[9px] leading-tight shadow-xs shrink-0">
                    {unreadChatCount > 99 ? "99+" : unreadChatCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Running Ticker Marquee for Lapak Teman / Promosi */}
        <TaskbarTicker />

        {/* System Tray */}
        <div className="h-7 px-2 bg-[#CBD5E1] border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] flex items-center gap-1.5 shrink-0 text-xs font-mono text-[#14253D]">
          {/* Notification Mute / Sound Toggle in Tray */}
          <button
            type="button"
            onClick={async () => {
              toggleMute()
              if (hasBrowserNotificationSupport && browserPermission === "default") {
                await requestNotificationPermission()
              }
            }}
            title={
              isMuted
                ? "Notifikasi Suara: DIBISUKAN (Klik untuk mengaktifkan suara)"
                : "Notifikasi Suara: AKTIF (Klik untuk membisukan)"
            }
            className={cn(
              "size-5.5 rounded-[2px] border transition-colors cursor-pointer flex items-center justify-center active:translate-y-px",
              isMuted
                ? "bg-red-100 border-red-400 text-red-700 hover:bg-red-200"
                : "bg-[#BDCCD9] border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white text-[#14253D] hover:bg-[#A8BCCC]"
            )}
          >
            {isMuted ? <VolumeX className="size-3" /> : <Volume2 className="size-3" />}
          </button>

          {/* User Profile & Role Pill in Tray */}
          <button
            type="button"
            onClick={() => {
              if (isGuest && onOpenLoginModal) {
                onOpenLoginModal()
              } else {
                setIsProfileModalOpen(true)
              }
            }}
            title={
              isGuest
                ? "Mode Tamu (Read-Only) - Klik untuk Masuk dengan Google"
                : `Login sebagai: ${user?.name || "User"} (${isAdmin ? "Administrator" : isKasPic ? "PIC Kas" : isPantryPic ? "PIC Pantry" : "Anggota Tim"}) - Klik untuk edit profil`
            }
            className={cn(
              "h-5.5 px-1.5 rounded-[2px] border transition-colors cursor-pointer flex items-center gap-1.5 active:translate-y-px text-[11px] font-sans select-none",
              isGuest
                ? "bg-amber-100 hover:bg-amber-200 border-amber-400 text-amber-900"
                : "bg-[#BDCCD9] hover:bg-[#A8BCCC] border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white text-[#14253D]"
            )}
          >
            <UserAvatar
              src={user?.avatarUrl}
              name={user?.name || (isGuest ? "Tamu" : "User")}
              size="size-3.5"
              textClass="text-[8px]"
            />
            <span className="font-bold text-[10px] max-w-[70px] sm:max-w-[100px] truncate leading-none">
              {isGuest ? "Tamu" : (user?.name?.split(" ")[0] || "User")}
            </span>
            <span className="h-3 w-px bg-[#7D8E9E]/50" />
            {isGuest ? (
              <span className="flex items-center gap-0.5 text-amber-800 text-[9px] font-bold">
                <Eye className="size-2.5 shrink-0" />
                <span className="hidden sm:inline">Tamu</span>
              </span>
            ) : isAdmin ? (
              <span className="flex items-center gap-0.5 text-purple-700 text-[9px] font-bold">
                <ShieldCheck className="size-2.5 shrink-0 text-purple-700" />
                <span className="hidden sm:inline">Admin</span>
              </span>
            ) : isKasPic ? (
              <span className="flex items-center gap-0.5 text-amber-800 text-[9px] font-bold">
                <span>💰</span>
                <span className="hidden sm:inline">PIC Kas</span>
              </span>
            ) : isPantryPic ? (
              <span className="flex items-center gap-0.5 text-sky-800 text-[9px] font-bold">
                <span>☕</span>
                <span className="hidden sm:inline">PIC Pantry</span>
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-slate-600 text-[9px] font-semibold">
                <User className="size-2.5 shrink-0 text-slate-500" />
                <span className="hidden sm:inline">Anggota</span>
              </span>
            )}
          </button>

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

          {/* Version Badge */}
          <button
            type="button"
            onClick={openAboutDialog}
            title={`IT-THINGS ${APP_VERSION} (Build ${APP_BUILD}) - Klik untuk lihat changelog`}
            className="px-1.5 py-0.5 rounded-[2px] bg-[#BDCCD9] hover:bg-[#A8BCCC] active:translate-y-px border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white text-[10px] font-mono font-bold text-[#14253D] cursor-pointer transition-colors shadow-none"
          >
            {APP_VERSION}
          </button>

          {/* Clock */}
          <div className="font-bold text-[11px] tracking-wider text-slate-800">{time}</div>
        </div>
      </footer>

      {/* Retro In-App Notification Toast */}
      <RetroNotificationToast />

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Log Off Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={async () => {
          await signOut()
          setShowLogoutConfirm(false)
        }}
        title="LOG_OFF.EXE"
        titleIcon={<LogOut className="size-3.5 text-[#14253D]" />}
        message={
          isGuest
            ? "Apakah kamu yakin ingin keluar dari Mode Tamu?"
            : `Apakah kamu yakin ingin keluar (log off) dari akun ${user?.name || "kamu"}?`
        }
        icon={<LogOut className="size-5 text-amber-600" />}
        confirmText={isGuest ? "Keluar" : "Log Off"}
        confirmIcon={<LogOut className="size-3" />}
        cancelText="Batal"
        variant="warning"
      />
    </>
  )
}
