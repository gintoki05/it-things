"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { StatusChip } from "@/components/retro/status-chip"
import { useAuth } from "@/lib/auth"
import { 
  Home, 
  UtensilsCrossed, 
  Users, 
  ReceiptText, 
  LogOut, 
  UserCheck, 
  Cpu
} from "lucide-react"

export type NavigationTab = "home" | "pantry" | "members" | "splitbill" | "settings"

interface ToolbarProps {
  activeTab: NavigationTab
  onTabChange: (tab: NavigationTab) => void
  isUsingSupabase?: boolean
}

export function Toolbar({ activeTab, onTabChange, isUsingSupabase }: ToolbarProps) {
  const { user, signOut } = useAuth()
  const [time, setTime] = React.useState<string>("")

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }))
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="border-b border-[var(--border-dark)] bg-[var(--surface)] select-none">
      {/* Upper Retro OS Banner */}
      <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[#E3E8EE] dark:bg-[#18273A]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono font-bold text-sm text-[var(--foreground)]">
            <span className="text-[var(--primary)] text-base">▣</span>
            <span>TI-THINGS.EXE</span>
            <span className="text-[10px] bg-[var(--primary)] text-white px-1 py-0.2 rounded-[2px]">
              v1.0
            </span>
          </div>
          <span className="hidden sm:inline-block text-[var(--border-dark)]">|</span>
          <span className="hidden sm:inline-block font-mono text-[11px] text-[var(--foreground-muted)]">
            INTERNAL TI UTILITY & WORKSPACE
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          {isUsingSupabase ? (
            <StatusChip status="online" label="SYS: SUPABASE SYNCED" />
          ) : (
            <StatusChip status="pending" label="SYS: LOCAL MODE" />
          )}

          <div className="hidden sm:block px-2 py-0.5 rounded-[2px] bg-[var(--surface)] border border-[var(--border)] text-[11px]">
            {time || "00:00:00"}
          </div>

          {user && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-[var(--border)]">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--primary)]">
                <UserCheck className="size-3.5" />
                <span>{user.name}</span>
              </div>
              <button
                type="button"
                onClick={() => signOut()}
                title="Keluar / Ganti Akun"
                className="p-1 hover:text-[var(--danger)] transition-colors"
              >
                <LogOut className="size-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Toolbar Navigation Tabs */}
      <div className="px-2 py-1 flex items-center gap-1 overflow-x-auto text-xs font-mono">
        <button
          type="button"
          onClick={() => onTabChange("pantry")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] border transition-all text-xs",
            activeTab === "pantry"
              ? "bg-[var(--primary-soft)] border-[var(--primary)] text-[var(--primary)] font-bold shadow-sm"
              : "border-transparent hover:border-[var(--border)] hover:bg-[var(--surface-muted)] text-[var(--foreground)]"
          )}
        >
          <UtensilsCrossed className="size-3.5" />
          <span>[☷ Konsumsi (Pantry)]</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("members")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] border transition-all text-xs",
            activeTab === "members"
              ? "bg-[var(--primary-soft)] border-[var(--primary)] text-[var(--primary)] font-bold shadow-sm"
              : "border-transparent hover:border-[var(--border)] hover:bg-[var(--surface-muted)] text-[var(--foreground)]"
          )}
        >
          <Users className="size-3.5" />
          <span>[♟ Anggota Tim]</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("splitbill")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] border transition-all text-xs opacity-70",
            activeTab === "splitbill"
              ? "bg-[var(--primary-soft)] border-[var(--primary)] text-[var(--primary)] font-bold"
              : "border-transparent hover:border-[var(--border)] hover:bg-[var(--surface-muted)] text-[var(--foreground)]"
          )}
        >
          <ReceiptText className="size-3.5" />
          <span>[▣ Split Bill]</span>
          <span className="text-[9px] bg-[var(--surface-muted)] px-1 py-0.5 rounded-[2px] border border-[var(--border)]">
            SOON
          </span>
        </button>

        <div className="ml-auto flex items-center pr-2">
          <span className="text-[11px] text-[var(--foreground-muted)] hidden lg:inline">
            &gt; &quot;Belanja bareng. Perut senang. Server tenang.&quot;
          </span>
        </div>
      </div>
    </header>
  )
}
