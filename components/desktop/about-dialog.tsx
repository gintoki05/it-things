"use client"

import * as React from "react"
import { X, Info, Monitor, History, ShieldCheck, User, Database, Sparkles } from "lucide-react"
import { RetroIcon } from "@/components/ui/retro-icon"
import { APP_VERSION, APP_BUILD, APP_NAME, APP_EDITION, APP_CHANGELOG } from "@/lib/version"
import { useAuth } from "@/lib/auth"
import { usePicStore } from "@/lib/pic-store"
import { useDesktop } from "@/components/desktop/desktop-context"

interface AboutDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  const { user, isAdmin, isGuest, isSupabaseConnected } = useAuth()
  const { isKasPic, isPantryPic } = usePicStore()
  const { openWhatsNewDialog } = useDesktop()
  const [activeTab, setActiveTab] = React.useState<"info" | "changelog">("changelog")
  const okButtonRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (!isOpen) return

    okButtonRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)

      if (isInput) return

      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4 select-none animate-in fade-in-0 duration-150"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="retro-window-frame max-w-md w-full rounded-[4px] overflow-hidden shadow-[6px_6px_0px_rgba(0,0,0,0.35)] bg-[#D4DDE6] flex flex-col border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287]"
      >
        {/* Retro Titlebar */}
        <div className="bg-gradient-to-r from-[#102A45] via-[#1E4E8C] to-[#2E6FB5] px-2.5 py-1.5 flex items-center justify-between font-mono text-xs font-bold text-white shadow-inner">
          <div className="flex items-center gap-1.5">
            <Info className="size-3.5 text-yellow-300" />
            <span>winver.exe - Tentang {APP_NAME}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hover:bg-red-600 hover:text-white px-1.5 py-0.5 rounded-[2px] transition-colors leading-none cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-3 space-y-3">
          {/* Header Banner */}
          <div className="flex items-center gap-3 p-2 bg-white/80 rounded-[2px] border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white">
            <div className="size-12 shrink-0 bg-slate-900 rounded-[2px] p-1 flex items-center justify-center shadow-inner border border-slate-700">
              <RetroIcon name="idea" iconSize={48} className="size-9 object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-black text-sm text-[#102A45] tracking-wide">
                  {APP_NAME}
                </span>
                <span className="text-[10px] font-mono font-bold bg-[#1E4E8C] text-white px-1.5 py-0.2 rounded">
                  {APP_VERSION}
                </span>
              </div>
              <div className="text-[11px] font-sans font-semibold text-gray-700">
                {APP_EDITION}
              </div>
              <div className="text-[10px] font-mono text-gray-500">
                Build {APP_BUILD} • Team Workspace
              </div>
            </div>
          </div>

          {/* Retro Tabs */}
          <div className="flex items-center gap-1 border-b border-[#7D8E9E] px-1 -mb-1">
            <button
              type="button"
              onClick={() => setActiveTab("changelog")}
              className={`px-3 py-1 font-mono text-xs font-bold flex items-center gap-1.5 rounded-t-[3px] border-t border-l border-r transition-colors ${
                activeTab === "changelog"
                  ? "bg-[#D4DDE6] border-[#7D8E9E] border-b-transparent translate-y-px text-[#102A45]"
                  : "bg-[#BCC9D6] border-transparent text-gray-600 hover:bg-[#C8D4E0]"
              }`}
            >
              <History className="size-3.5" />
              <span>Changelog</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("info")}
              className={`px-3 py-1 font-mono text-xs font-bold flex items-center gap-1.5 rounded-t-[3px] border-t border-l border-r transition-colors ${
                activeTab === "info"
                  ? "bg-[#D4DDE6] border-[#7D8E9E] border-b-transparent translate-y-px text-[#102A45]"
                  : "bg-[#BCC9D6] border-transparent text-gray-600 hover:bg-[#C8D4E0]"
              }`}
            >
              <Monitor className="size-3.5" />
              <span>Info Sistem</span>
            </button>
          </div>

          {/* Tab Content Box */}
          <div className="h-56 overflow-y-auto bg-white border-2 border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white p-2.5 rounded-[2px] text-xs font-sans text-gray-800">
            {activeTab === "changelog" ? (
              <div className="space-y-3">
                {APP_CHANGELOG.map((release) => (
                  <div
                    key={release.version}
                    className="border-b border-gray-200 pb-2.5 last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[11px] text-[#1E4E8C] bg-blue-50 border border-blue-200 px-1 rounded">
                          {release.version}
                        </span>
                        {release.codename && (
                          <span className="font-bold text-[11px] text-gray-800">
                            {release.codename}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-gray-500 shrink-0">
                        {release.date}
                      </span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-gray-700 leading-relaxed pl-1">
                      {release.changes.map((change, idx) => (
                        <li key={idx}>{change}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold font-mono text-gray-700 border-b border-gray-200 pb-1">
                  STATUS LINGKUNGAN KERJA
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 bg-gray-50 border border-gray-200 rounded-[2px]">
                    <div className="text-[10px] text-gray-500 font-mono">PENGGUNA AKTIF</div>
                    <div className="font-bold text-gray-900 truncate">
                      {user?.name || "Tamu Internal IT"}
                    </div>
                    <div className="text-[10px] text-gray-600 flex items-center gap-1 mt-0.5">
                      {isAdmin ? (
                        <span className="text-purple-700 font-semibold flex items-center gap-0.5">
                          <ShieldCheck className="size-3" /> Administrator
                        </span>
                      ) : isKasPic ? (
                        <span className="text-amber-700 font-semibold flex items-center gap-0.5">
                          <span>💰</span> PIC Kas
                        </span>
                      ) : isPantryPic ? (
                        <span className="text-sky-700 font-semibold flex items-center gap-0.5">
                          <span>☕</span> PIC Pantry
                        </span>
                      ) : isGuest ? (
                        <span className="text-amber-800 font-semibold">Tamu (Read-Only)</span>
                      ) : (
                        <span className="flex items-center gap-0.5">
                          <User className="size-3" /> Anggota Tim
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-2 bg-gray-50 border border-gray-200 rounded-[2px]">
                    <div className="text-[10px] text-gray-500 font-mono">KONEKSI DATABASE</div>
                    <div className="font-bold text-gray-900 flex items-center gap-1">
                      <span
                        className={`size-2 rounded-full ${
                          isSupabaseConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                        }`}
                      />
                      <span>{isSupabaseConnected ? "Supabase Realtime" : "Mode Demo Lokal"}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5 font-mono">
                      Region: ap-northeast-1
                    </div>
                  </div>
                </div>

                <div className="p-2 bg-blue-50/70 border border-blue-200 rounded-[2px] text-[10px] text-blue-900 font-sans leading-relaxed">
                  Aplikasi ini dirancang khusus untuk koordinasi internal divisi IT dengan arsitektur Retro Desktop UI dan sinkronisasi data instan.
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                onClose()
                openWhatsNewDialog()
              }}
              className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono font-bold text-[#1E4E8C] hover:text-[#153A6B] hover:underline cursor-pointer rounded-[2px]"
            >
              <Sparkles className="size-3 text-amber-500" />
              <span>Lihat Ringkasan Fitur Baru</span>
            </button>
            <button
              ref={okButtonRef}
              type="button"
              onClick={onClose}
              className="bg-[#D4DDE6] border border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] active:border-t-[#5E7287] active:border-l-[#5E7287] active:border-r-white active:border-b-white hover:bg-[#E2EAF2] px-6 py-1 text-xs font-mono font-bold text-[#14253D] rounded-[2px] shadow-[1px_1px_0px_#5E7287] cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
