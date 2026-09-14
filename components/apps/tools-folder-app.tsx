"use client"

import * as React from "react"
import { useDesktop, AppId } from "@/components/desktop/desktop-context"
import { RetroIcon } from "@/components/ui/retro-icon"
import { useNotification } from "@/lib/notification-store"
import { cn } from "@/lib/utils"
import { HardDrive, FolderOpen, ArrowLeft, ArrowRight, ArrowUp, Search, Info } from "lucide-react"

interface ToolItem {
  id: AppId
  title: string
  filename: string
  category: string
  description: string
  icon: string
  size: string
}

const TOOLS_LIST: ToolItem[] = [
  {
    id: "swisstools",
    title: "SwissTools IT",
    filename: "SwissTools.exe",
    category: "Utilitas Pengembang",
    description: "Koleksi swiss-army knife devtools: JSON formatter, JWT decoder, Regex tester, UUID generator, Hash, dan Base64.",
    icon: "settings",
    size: "1,420 KB",
  },
  {
    id: "snipper",
    title: "Snipper QA Studio",
    filename: "Snipper.exe",
    category: "Alat Uji & Tangkapan Layar",
    description: "Tool screenshot & anotasi bug retro untuk developer dan QA. Gambar panah, highlight bug, dan ekspor instan.",
    icon: "bug",
    size: "980 KB",
  },
  {
    id: "pomodoro",
    title: "Pomodoro Timer",
    filename: "Pomodoro.exe",
    category: "Produktivitas & Kesehatan",
    description: "Timer siklus fokus kerja 25 menit, jeda santai, dan panduan peregangan otot pinggang/leher anti-pegal.",
    icon: "pomodoro",
    size: "450 KB",
  },
  {
    id: "winamp",
    title: "Winamp 2.91",
    filename: "Winamp.exe",
    category: "Audio & Pemutar Musik",
    description: "Pemutar musik klasik Windows 98 dengan visualizer jadul, playlist lofi kerja, equalizer retro, dan sound track.",
    icon: "📻",
    size: "2,048 KB",
  },
  {
    id: "feedback",
    title: "Kotak Saran & Bug",
    filename: "Feedback.exe",
    category: "Bantuan & Masukan Tim",
    description: "Form aspirasi, permintaan fitur baru, dan pelaporan kendala teknis tim internal IT-Things.",
    icon: "idea",
    size: "320 KB",
  },
]

export function ToolsFolderApp() {
  const { openWindow } = useDesktop()
  const { activeFeedbackCount } = useNotification()
  const [selectedId, setSelectedId] = React.useState<AppId>("swisstools")
  const [viewMode, setViewMode] = React.useState<"large" | "list">("large")

  const selectedItem = React.useMemo(() => {
    return TOOLS_LIST.find((t) => t.id === selectedId) || TOOLS_LIST[0]
  }, [selectedId])

  const handleOpen = (id: AppId) => {
    openWindow(id)
  }

  return (
    <div className="flex flex-col h-full bg-[#D4D0C8] font-sans text-xs select-none">
      {/* ── Windows 98 Explorer Menu Bar ── */}
      <div className="flex items-center gap-3 px-2 py-0.5 bg-[#D4D0C8] border-b border-[#808080] text-[11px] text-black">
        <span className="cursor-pointer hover:bg-[#000080] hover:text-white px-1 rounded-xs">File</span>
        <span className="cursor-pointer hover:bg-[#000080] hover:text-white px-1 rounded-xs">Edit</span>
        <span
          onClick={() => setViewMode(viewMode === "large" ? "list" : "large")}
          className="cursor-pointer hover:bg-[#000080] hover:text-white px-1 rounded-xs font-semibold"
          title="Ganti Tampilan Ikon"
        >
          View ({viewMode === "large" ? "Ikon Besar" : "Daftar"})
        </span>
        <span className="cursor-pointer hover:bg-[#000080] hover:text-white px-1 rounded-xs">Favorites</span>
        <span className="cursor-pointer hover:bg-[#000080] hover:text-white px-1 rounded-xs">Help</span>
      </div>

      {/* ── Explorer Toolbar ── */}
      <div className="flex items-center gap-1.5 px-2 py-1 bg-[#D4D0C8] border-b border-[#808080]">
        <div className="flex items-center gap-1 border-r border-[#808080] pr-2">
          <button
            type="button"
            disabled
            className="p-1 rounded text-gray-400 opacity-60 cursor-not-allowed flex items-center gap-0.5 text-[10px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <button
            type="button"
            disabled
            className="p-1 rounded text-gray-400 opacity-60 cursor-not-allowed flex items-center gap-0.5 text-[10px]"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Forward</span>
          </button>
          <button
            type="button"
            disabled
            className="p-1 rounded text-gray-400 opacity-60 cursor-not-allowed flex items-center gap-0.5 text-[10px]"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Up</span>
          </button>
        </div>

        {/* Address Bar */}
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] text-gray-700 shrink-0 font-medium">Address:</span>
          <div className="flex-1 flex items-center gap-1.5 px-2 py-0.5 bg-white border-2 border-[#808080] border-r-white border-b-white text-[11px] font-mono text-black truncate shadow-inner">
            <RetroIcon name="folder" iconSize={32} className="size-3.5 shrink-0 object-contain" />
            <span className="truncate">C:\WINDOWS\Utilitas IT</span>
          </div>
        </div>
      </div>

      {/* ── Explorer Main Content Area ── */}
      <div className="flex-1 flex min-h-0 bg-white border-2 border-[#808080] border-r-white border-b-white m-1 shadow-inner overflow-hidden">
        {/* Left Web View Sidebar (Classic Windows 98) */}
        <div className="w-44 sm:w-52 border-r border-[#808080]/60 bg-gradient-to-b from-[#000080] to-[#1084D0] text-white p-3 flex flex-col justify-between shrink-0 overflow-y-auto select-none">
          <div>
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/20">
              <RetroIcon name="folder" iconSize={48} className="size-8 object-contain drop-shadow" />
              <div>
                <h3 className="font-bold text-xs leading-tight tracking-wide">Utilitas IT</h3>
                <p className="text-[10px] text-blue-200">Aksesoris & Tools</p>
              </div>
            </div>

            {selectedItem && (
              <div className="space-y-2 mt-3 animate-in fade-in duration-150">
                <div className="p-2 bg-white/10 rounded border border-white/20 backdrop-blur-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <RetroIcon name={selectedItem.icon} iconSize={32} className="size-6 object-contain drop-shadow" />
                    <div className="font-bold text-[11px] text-yellow-300 leading-snug truncate">
                      {selectedItem.filename}
                    </div>
                  </div>
                  <div className="text-[10px] text-blue-100 font-medium">
                    {selectedItem.title}
                  </div>
                  <div className="text-[9px] text-blue-200 mt-1 font-mono">
                    Ukuran: {selectedItem.size}
                  </div>
                </div>

                <p className="text-[10.5px] text-blue-50 leading-relaxed font-sans opacity-95">
                  {selectedItem.description}
                </p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-white/20">
            <button
              type="button"
              onClick={() => handleOpen(selectedItem.id)}
              className="w-full py-1.5 px-2 bg-[#D4D0C8] hover:bg-[#E4E0D8] text-black font-bold text-[11px] rounded-[2px] border-2 border-white border-r-[#404040] border-b-[#404040] active:border-[#404040] shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Jalankan Program</span>
              <span className="font-mono text-[10px]">»</span>
            </button>
            <p className="text-[9px] text-blue-200 text-center mt-1">
              Klik ganda ikon untuk membuka
            </p>
          </div>
        </div>

        {/* Right Icons Grid */}
        <div className="flex-1 p-3 overflow-y-auto bg-white">
          {viewMode === "large" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 auto-rows-max">
              {TOOLS_LIST.map((tool) => {
                const isSelected = selectedId === tool.id
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => setSelectedId(tool.id)}
                    onDoubleClick={() => handleOpen(tool.id)}
                    onTouchEnd={() => {
                      if (selectedId === tool.id) {
                        handleOpen(tool.id)
                      } else {
                        setSelectedId(tool.id)
                      }
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded cursor-pointer text-center transition-all group relative border border-transparent",
                      isSelected
                        ? "bg-[#000080]/15 border-dotted border-[#000080]"
                        : "hover:bg-blue-50/80"
                    )}
                  >
                    <div className="relative size-12 flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
                      <RetroIcon name={tool.icon} iconSize={48} className="size-9 object-contain drop-shadow" />
                      {tool.id === "feedback" && activeFeedbackCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-mono text-[9px] font-black min-w-[16px] text-center px-1 py-0.5 rounded border border-amber-600 shadow leading-none">
                          {activeFeedbackCount}
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "mt-1 font-mono text-[11px] tracking-tight leading-snug px-1 rounded truncate max-w-full",
                        isSelected ? "bg-[#000080] text-white font-bold" : "text-black group-hover:text-blue-950"
                      )}
                    >
                      {tool.filename}
                    </span>
                    <span className="text-[9.5px] text-gray-500 truncate max-w-full">
                      {tool.title}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {TOOLS_LIST.map((tool) => {
                const isSelected = selectedId === tool.id
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => setSelectedId(tool.id)}
                    onDoubleClick={() => handleOpen(tool.id)}
                    onTouchEnd={() => {
                      if (selectedId === tool.id) {
                        handleOpen(tool.id)
                      } else {
                        setSelectedId(tool.id)
                      }
                    }}
                    className={cn(
                      "flex items-center justify-between p-2 rounded cursor-pointer transition-all text-left",
                      isSelected ? "bg-[#000080] text-white" : "hover:bg-blue-50 text-black"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <RetroIcon name={tool.icon} iconSize={32} className="size-5 object-contain shrink-0" />
                      <div className="truncate">
                        <span className="font-bold text-[11px]">{tool.filename}</span>
                        <span className={cn("ml-2 text-[10px]", isSelected ? "text-blue-200" : "text-gray-500")}>
                          {tool.title}
                        </span>
                      </div>
                    </div>
                    <span className={cn("font-mono text-[10px] shrink-0", isSelected ? "text-yellow-300" : "text-gray-500")}>
                      {tool.size}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Status Bar ── */}
      <div className="px-2 py-0.5 bg-[#D4D0C8] border-t border-[#808080] flex items-center justify-between text-[11px] text-black font-mono">
        <div className="flex items-center gap-2 truncate">
          <span>{TOOLS_LIST.length} object(s)</span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-600 truncate">{selectedItem ? `${selectedItem.filename} (${selectedItem.size})` : ""}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-gray-700 pl-2">
          <HardDrive className="size-3 text-gray-600" />
          <span className="hidden sm:inline">My Computer</span>
        </div>
      </div>
    </div>
  )
}
