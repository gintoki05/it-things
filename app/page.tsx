"use client"

import * as React from "react"
import { AuthProvider, useAuth } from "@/lib/auth"
import { NotificationProvider } from "@/lib/notification-store"
import { DesktopProvider, useDesktop } from "@/components/desktop/desktop-context"
import { DesktopIcons } from "@/components/desktop/desktop-icons"
import { DesktopWindow } from "@/components/desktop/desktop-window"
import { Taskbar } from "@/components/desktop/taskbar"
import { GoogleLoginModal } from "@/components/auth/google-login-modal"
import { PasscodeScreen } from "@/components/auth/passcode-screen"
import { ComingSoonDialog } from "@/components/desktop/coming-soon-dialog"
import { AboutDialog } from "@/components/desktop/about-dialog"
import { TeamWidget } from "@/components/desktop/team-widget"
import { APP_VERSION } from "@/lib/version"

// Apps
import { VoteApp } from "@/components/apps/vote-app"
import { WheelApp } from "@/components/apps/wheel-app"
import { SplitBillApp } from "@/components/apps/split-bill-app"
import { KasApp } from "@/components/apps/kas-app"
import { TeamApp } from "@/components/apps/team-app"
import { ChatApp } from "@/components/apps/chat-app"
import { ReadmeApp } from "@/components/apps/readme-app"

const MemoizedReadmeApp = React.memo(ReadmeApp)
const MemoizedVoteApp = React.memo(VoteApp)
const MemoizedWheelApp = React.memo(WheelApp)
const MemoizedSplitBillApp = React.memo(SplitBillApp)
const MemoizedKasApp = React.memo(KasApp)
const MemoizedTeamApp = React.memo(TeamApp)
const MemoizedChatApp = React.memo(ChatApp)
const MemoizedDesktopIcons = React.memo(DesktopIcons)
const MemoizedTeamWidget = React.memo(TeamWidget)

function DesktopWorkspace() {
  const { isPasscodeVerified, isPasscodeLoading, isGuest, isAdmin, isRecoveryMode } = useAuth()
  const { comingSoonApp, closeComingSoonDialog, isAboutOpen, closeAboutDialog } = useDesktop()
  const [showLoginModal, setShowLoginModal] = React.useState(false)

  // Saat pertama kali memuat / reload, tunggu pengecekan storage selesai
  if (isPasscodeLoading) {
    return (
      <div className="w-screen h-screen bg-[#1A365D] flex items-center justify-center select-none">
        <div className="font-mono text-xs text-blue-200 tracking-widest animate-pulse">
          IT-THINGS.EXE // INITIALIZING...
        </div>
      </div>
    )
  }

  if (!isPasscodeVerified && !isRecoveryMode) {
    return <PasscodeScreen />
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-[#1A365D]">
      {/* Retro Wallpaper Texture */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#FFFFFF 1px, transparent 1px)`,
          backgroundSize: "24px 24px"
        }}
      />

      {/* Guest Mode Warning Banner Bar */}
      {isGuest && (
        <div className="absolute top-0 left-0 right-0 z-40 bg-[#FFF3CD] border-b-2 border-b-[#E0A800] text-[#856404] px-3 py-1 font-mono text-xs flex items-center justify-between shadow-sm select-none">
          <div className="flex items-center gap-2">
            <span className="font-bold bg-[#856404] text-[#FFF3CD] px-1.5 py-0.5 rounded-[2px] text-[10px] tracking-wider uppercase">
              Mode Tamu
            </span>
            <span className="font-semibold hidden sm:inline text-[11px]">
              Akses Hanya Baca (Read-Only) — Anda tidak dapat menambah atau mengubah data.
            </span>
            <span className="font-semibold sm:hidden text-[11px]">
              Hanya Baca (Read-Only)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowLoginModal(true)}
            className="bg-[#1E4E8C] hover:bg-[#153A6B] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-[2px] border border-[#102A45] shadow-[1px_1px_0px_#102A45] active:translate-y-px cursor-pointer"
          >
            Masuk dengan Google
          </button>
        </div>
      )}

      {/* Decorative Retro Desktop Branding in Center/Bottom-Right */}
      <div className="absolute right-6 bottom-16 pointer-events-none select-none text-right opacity-25 hidden sm:block">
        <div className="font-mono text-4xl sm:text-6xl font-black text-white tracking-widest">
          IT-THINGS
        </div>
        <div className="font-mono text-xs text-blue-200 tracking-wider">
          {isGuest ? "GUEST MODE // READ-ONLY ACCESS" : `INTERNAL TEAM SUITE 98 • DAILY UTILITIES // ${APP_VERSION}`}
        </div>
        <div className="font-mono text-[10px] text-blue-300 tracking-wide mt-0.5">
          Portal Santai & Utilitas Harian Tim IT
        </div>
      </div>

      {/* Desktop Icons on Wallpaper */}
      <MemoizedDesktopIcons />

      {/* Retro Window: README.txt (Panduan Web) */}
      <DesktopWindow id="readme">
        <MemoizedReadmeApp />
      </DesktopWindow>

      {/* Retro Window: Vote.exe */}
      <DesktopWindow id="vote">
        <MemoizedVoteApp />
      </DesktopWindow>

      {/* Retro Window: Wheel.exe */}
      <DesktopWindow id="wheel">
        <MemoizedWheelApp />
      </DesktopWindow>

      {/* Retro Window: SplitBill.exe */}
      <DesktopWindow id="splitbill">
        <MemoizedSplitBillApp />
      </DesktopWindow>

      {/* Retro Window: Kas.exe */}
      <DesktopWindow id="kas">
        <MemoizedKasApp />
      </DesktopWindow>

      {/* Retro Window: Team.exe (Direktori Tim) */}
      <DesktopWindow id="team">
        <MemoizedTeamApp />
      </DesktopWindow>

      {/* Retro Window: Chat.exe */}
      <DesktopWindow id="chat">
        <MemoizedChatApp />
      </DesktopWindow>

      {/* Floating Retro Team Widget */}
      <MemoizedTeamWidget />

      {/* Bottom Retro Taskbar */}
      <Taskbar onOpenLoginModal={() => setShowLoginModal(true)} />

      {/* Retro Coming Soon Dialog */}
      <ComingSoonDialog
        app={comingSoonApp}
        onClose={closeComingSoonDialog}
      />

      {/* Retro About / winver.exe Dialog */}
      <AboutDialog
        isOpen={isAboutOpen}
        onClose={closeAboutDialog}
      />

      {/* Google Login / Access Gate Modal */}
      <GoogleLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  )
}

export default function Page() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <DesktopProvider>
          <DesktopWorkspace />
        </DesktopProvider>
      </NotificationProvider>
    </AuthProvider>
  )
}
