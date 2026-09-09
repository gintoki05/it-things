"use client"

import * as React from "react"
import { AuthProvider, useAuth } from "@/lib/auth"
import { DesktopProvider, useDesktop } from "@/components/desktop/desktop-context"
import { DesktopIcons } from "@/components/desktop/desktop-icons"
import { DesktopWindow } from "@/components/desktop/desktop-window"
import { Taskbar } from "@/components/desktop/taskbar"
import { GoogleLoginModal } from "@/components/auth/google-login-modal"

// Apps
import { PantryApp } from "@/components/apps/pantry-app"
import { WheelApp } from "@/components/apps/wheel-app"
import { SplitBillApp } from "@/components/apps/split-bill-app"
import { KasApp } from "@/components/apps/kas-app"
import { TeamApp } from "@/components/apps/team-app"

function DesktopWorkspace() {
  const [showLoginModal, setShowLoginModal] = React.useState(false)

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

      {/* Decorative Retro Desktop Branding in Center/Bottom-Right */}
      <div className="absolute right-6 bottom-16 pointer-events-none select-none text-right opacity-25 hidden sm:block">
        <div className="font-mono text-4xl sm:text-6xl font-black text-white tracking-widest">
          IT-THINGS
        </div>
        <div className="font-mono text-xs text-blue-200 tracking-wider">
          INTERNAL TEAM SUITE 98 // v2.0.0
        </div>
      </div>

      {/* Desktop Icons on Wallpaper */}
      <DesktopIcons />

      {/* Retro Window: Pantry.exe */}
      <DesktopWindow id="pantry">
        <PantryApp />
      </DesktopWindow>

      {/* Retro Window: Wheel.exe */}
      <DesktopWindow id="wheel">
        <WheelApp />
      </DesktopWindow>

      {/* Retro Window: SplitBill.exe */}
      <DesktopWindow id="splitbill">
        <SplitBillApp />
      </DesktopWindow>

      {/* Retro Window: Kas.exe */}
      <DesktopWindow id="kas">
        <KasApp />
      </DesktopWindow>

      {/* Retro Window: Team.exe */}
      <DesktopWindow id="team">
        <TeamApp />
      </DesktopWindow>

      {/* Bottom Retro Taskbar */}
      <Taskbar onOpenLoginModal={() => setShowLoginModal(true)} />

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
      <DesktopProvider>
        <DesktopWorkspace />
      </DesktopProvider>
    </AuthProvider>
  )
}
