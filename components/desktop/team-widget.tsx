"use client"

import * as React from "react"
import { useTeamStore } from "@/lib/team-store"
import { usePicStore } from "@/lib/pic-store"
import { useDesktop } from "./desktop-context"
import { UserAvatar } from "@/components/retro/user-avatar"
import { Users, ChevronDown, ChevronUp, Shield, User, ExternalLink, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

export function TeamWidget() {
  const { members } = useTeamStore()
  const { getUserPicTags } = usePicStore()
  const { openWindow } = useDesktop()
  const [isMinimized, setIsMinimized] = React.useState(false)

  // Baca preferensi minimize dari localStorage
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("it_things_team_widget_minimized")
      if (saved !== null) {
        setIsMinimized(saved === "true")
      } else if (window.innerWidth < 1024) {
        // Layar kecil default minimized agar tidak menutupi desktop
        setIsMinimized(true)
      }
    }
  }, [])

  const toggleMinimize = () => {
    setIsMinimized((prev) => {
      const next = !prev
      if (typeof window !== "undefined") {
        localStorage.setItem("it_things_team_widget_minimized", String(next))
      }
      return next
    })
  }

  const handleOpenTeamApp = () => {
    openWindow("team")
  }

  const handleOpenChat = () => {
    openWindow("chat")
  }

  const handleMemberClick = (name: string) => {
    openWindow("chat")
    if (typeof window !== "undefined") {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("mention-member", { detail: { name } }))
      }, 50)
    }
  }

  // Minimized Bar (Pill retro di pojok kanan bawah desktop)
  if (isMinimized) {
    return (
      <aside aria-label="Widget Tim IT Minimized" className="absolute bottom-14 right-4 z-20 select-none">
        <button
          type="button"
          onClick={toggleMinimize}
          title="Buka Widget Anggota Tim IT"
          className="h-7 px-2.5 bg-[#D4DDE6] hover:bg-[#DEE6EE] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] shadow-lg flex items-center gap-2 text-xs font-mono text-[#14253D] active:translate-y-px cursor-pointer rounded-[2px]"
        >
          <div className="flex items-center -space-x-1.5 overflow-hidden py-0.5">
            {members.slice(0, 3).map((m) => (
              <UserAvatar
                key={m.id}
                src={m.avatar_url}
                name={m.name}
                size="size-4"
                textClass="text-[8px]"
                className="border border-[#14253D]/40 shadow-xs"
              />
            ))}
          </div>
          <span className="font-bold flex items-center gap-1">
            <Users className="size-3 text-[#1E4E8C]" />
            <span>Tim IT ({members.length})</span>
          </span>
          <ChevronUp className="size-3 text-gray-600" />
        </button>
      </aside>
    )
  }

  // Expanded Retro Floating Card
  return (
    <aside aria-label="Widget Tim IT" className="absolute bottom-14 right-4 z-20 w-64 bg-[#D4DDE6] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] shadow-2xl rounded-[3px] select-none overflow-hidden flex flex-col font-sans">
      {/* Title Bar */}
      <div className="h-7 bg-gradient-to-r from-[#102A45] via-[#1E4E8C] to-[#2E6FB5] px-2 flex items-center justify-between text-white select-none">
        <div className="flex items-center gap-1.5 font-mono font-bold text-xs">
          <Users className="size-3.5 text-blue-200" />
          <span className="tracking-wide">Tim IT ({members.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleMinimize}
            title="Kecilkan widget"
            className="size-4.5 bg-[#CBD5E1] hover:bg-white text-[#14253D] border border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] rounded-[2px] flex items-center justify-center text-[10px] font-mono leading-none cursor-pointer"
          >
            <ChevronDown className="size-3" />
          </button>
        </div>
      </div>

      {/* Member List */}
      <div className="max-h-56 overflow-y-auto p-1.5 space-y-1 bg-white/70 border-b border-[#A4B5C6]/60">
        {members.length === 0 ? (
          <div className="p-3 text-center text-[11px] text-gray-500 italic">
            Belum ada anggota terdaftar.
          </div>
        ) : (
          members.map((member) => {
            const isAdminRole = member.role === "admin"

            return (
              <button
                key={member.id}
                type="button"
                onClick={() => handleMemberClick(member.name)}
                title={`Klik untuk mention @${member.name} di obrolan tim`}
                className="w-full flex items-center justify-between gap-2 p-1.5 rounded-[2px] bg-white hover:bg-blue-50 border border-transparent hover:border-[#1E4E8C]/30 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <UserAvatar
                    src={member.avatar_url}
                    name={member.name}
                    size="size-6"
                    textClass="text-[10px]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold text-[#14253D] group-hover:text-[#1E4E8C] truncate leading-tight">
                      {member.name}
                    </div>
                  </div>
                </div>

                {/* Role & PIC Badges */}
                <div className="shrink-0 flex items-center gap-1">
                  {isAdminRole ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                      <Shield className="size-2.5 text-purple-700" />
                      <span>Admin</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-700 border border-slate-300">
                      <User className="size-2.5 text-slate-500" />
                      <span>Member</span>
                    </span>
                  )}

                  {getUserPicTags(member.user_id || member.id).map((tag) => (
                    <span
                      key={tag.module}
                      className={cn(
                        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border shadow-2xs",
                        tag.color
                      )}
                    >
                      <span>{tag.icon}</span>
                      <span>{tag.label}</span>
                    </span>
                  ))}
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Footer / Quick Actions */}
      <div className="p-1.5 bg-[#D4DDE6] flex items-center gap-1">
        <button
          type="button"
          onClick={handleOpenChat}
          className="flex-1 py-1 px-2 bg-[#1E4E8C] hover:bg-[#153A6B] text-white border border-t-[#6BA3E8] border-l-[#6BA3E8] border-r-[#0D2440] border-b-[#0D2440] rounded-[2px] font-mono font-bold text-[10px] flex items-center justify-center gap-1.5 active:translate-y-px cursor-pointer shadow-xs"
        >
          <MessageSquare className="size-3 text-blue-200" />
          <span>Buka Obrolan (chat.exe)</span>
        </button>
        <button
          type="button"
          onClick={handleOpenTeamApp}
          title="Buka Direktori Tim (team.exe)"
          className="p-1 bg-[#CBD5E1] hover:bg-white text-[#14253D] border border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] rounded-[2px] flex items-center justify-center active:translate-y-px cursor-pointer"
        >
          <ExternalLink className="size-3 text-gray-700" />
        </button>
      </div>
    </aside>
  )
}
