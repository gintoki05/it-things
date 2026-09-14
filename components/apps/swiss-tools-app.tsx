"use client"

import * as React from "react"
import { useDesktop } from "@/components/desktop/desktop-context"
import { SWISS_TOOLS, SwissToolId, SwissToolCategory } from "./swiss-tools/types"
import { JsonTool } from "./swiss-tools/tools/json-tool"
import { JwtTool } from "./swiss-tools/tools/jwt-tool"
import { HashTool } from "./swiss-tools/tools/hash-tool"
import { EncodeTool } from "./swiss-tools/tools/encode-tool"
import { UuidTool } from "./swiss-tools/tools/uuid-tool"
import { TimestampTool } from "./swiss-tools/tools/timestamp-tool"
import { CaseTool } from "./swiss-tools/tools/case-tool"
import { RegexTool } from "./swiss-tools/tools/regex-tool"
import { PdfMergeTool } from "./swiss-tools/tools/pdf-merge-tool"
import { PdfSplitTool } from "./swiss-tools/tools/pdf-split-tool"
import { PdfConvertTool } from "./swiss-tools/tools/pdf-convert-tool"
import { PdfCompressTool } from "./swiss-tools/tools/pdf-compress-tool"
import { MediaDownloadTool } from "./swiss-tools/tools/media-download-tool"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  FileCode,
  KeyRound,
  Hash,
  Binary,
  Cpu,
  Clock,
  CaseSensitive,
  Regex,
  Search,
  Wrench,
  ShieldCheck,
  Folder,
  Files,
  Scissors,
  FileImage,
  Minimize2,
  Download,
} from "lucide-react"

const TOOL_ICONS: Record<SwissToolId, React.ComponentType<{ className?: string }>> = {
  json: FileCode,
  "pdf-merge": Files,
  "pdf-split": Scissors,
  "pdf-convert": FileImage,
  "pdf-compress": Minimize2,
  jwt: KeyRound,
  hash: Hash,
  encode: Binary,
  uuid: Cpu,
  timestamp: Clock,
  case: CaseSensitive,
  regex: Regex,
  "media-download": Download,
}

const CATEGORY_NAMES: Record<SwissToolCategory, string> = {
  media: "Media & Downloader",
  format: "Format & Dokumen",
  crypto: "Keamanan & Kripto",
  generator: "Waktu & Generator",
  text: "Teks & Pemrosesan",
}

export function SwissToolsApp() {
  const { closeWindow, openAboutDialog } = useDesktop()
  const [activeToolId, setActiveToolId] = React.useState<SwissToolId>("media-download")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeMenu, setActiveMenu] = React.useState<string | null>(null)

  // Unsaved Changes Guard States
  const [isToolDirty, setIsToolDirty] = React.useState(false)
  const [pendingToolId, setPendingToolId] = React.useState<SwissToolId | null>(null)
  const [isSwitchConfirmOpen, setIsSwitchConfirmOpen] = React.useState(false)
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = React.useState(false)

  // Helper untuk switch tool dengan validasi dirty
  const requestSwitchTool = (targetId: SwissToolId) => {
    if (targetId === activeToolId) return
    if (isToolDirty) {
      setPendingToolId(targetId)
      setIsSwitchConfirmOpen(true)
    } else {
      setActiveToolId(targetId)
    }
  }

  // Helper untuk close window dengan validasi dirty
  const requestCloseWindow = React.useCallback(() => {
    if (isToolDirty) {
      setIsCloseConfirmOpen(true)
    } else {
      closeWindow("swisstools")
    }
  }, [isToolDirty, closeWindow])

  // Listener untuk close request dari tombol [X] DesktopWindow
  React.useEffect(() => {
    const handler = () => requestCloseWindow()
    window.addEventListener("swisstools:close-request", handler)
    return () => window.removeEventListener("swisstools:close-request", handler)
  }, [requestCloseWindow])

  const activeTool = React.useMemo(() => {
    return SWISS_TOOLS.find((t) => t.id === activeToolId) || SWISS_TOOLS[0]
  }, [activeToolId])

  const filteredTools = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return SWISS_TOOLS
    return SWISS_TOOLS.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.command.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    )
  }, [searchQuery])

  // Kelompokkan tools berdasarkan kategori
  const categorizedTools = React.useMemo(() => {
    const groups: { category: SwissToolCategory; items: typeof SWISS_TOOLS }[] = [
      { category: "media", items: [] },
      { category: "format", items: [] },
      { category: "crypto", items: [] },
      { category: "generator", items: [] },
      { category: "text", items: [] },
    ]

    filteredTools.forEach((tool) => {
      const g = groups.find((grp) => grp.category === tool.category)
      if (g) g.items.push(tool)
    })

    return groups.filter((g) => g.items.length > 0)
  }, [filteredTools])

  const renderActiveTool = () => {
    switch (activeToolId) {
      case "json":
        return <JsonTool />
      case "pdf-merge":
        return <PdfMergeTool onDirtyChange={setIsToolDirty} />
      case "pdf-split":
        return <PdfSplitTool onDirtyChange={setIsToolDirty} />
      case "pdf-convert":
        return <PdfConvertTool onDirtyChange={setIsToolDirty} />
      case "pdf-compress":
        return <PdfCompressTool onDirtyChange={setIsToolDirty} />
      case "jwt":
        return <JwtTool />
      case "hash":
        return <HashTool />
      case "encode":
        return <EncodeTool />
      case "uuid":
        return <UuidTool />
      case "timestamp":
        return <TimestampTool />
      case "case":
        return <CaseTool />
      case "regex":
        return <RegexTool />
      case "media-download":
        return <MediaDownloadTool />
      default:
        return <JsonTool />
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#C0C0C0] text-[#000000] font-sans text-xs select-none overflow-hidden">
      {/* ── Retro Menu Bar ── */}
      <div className="bg-[#D4D0C8] border-b border-[#808080] px-2 py-0.5 flex items-center gap-3 text-[11px] text-[#000000] shrink-0 font-sans">
        {/* Menu: File */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === "file" ? null : "file")}
            className={`px-1.5 py-0.5 rounded-[2px] cursor-pointer hover:bg-[#000080] hover:text-white transition-colors ${
              activeMenu === "file" ? "bg-[#000080] text-white" : ""
            }`}
          >
            <u>F</u>ile
          </button>
          {activeMenu === "file" && (
            <div className="absolute top-full left-0 mt-0.5 w-48 bg-[#D4D0C8] border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] shadow-xl py-1 z-50 text-[#000000]">
              <div className="px-3 py-1 text-[10px] text-gray-600 font-bold uppercase font-mono">Aksi</div>
              <button
                type="button"
                onClick={() => {
                  setActiveMenu(null)
                  requestCloseWindow()
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white cursor-pointer font-sans"
              >
                Keluar (Exit)
              </button>
            </div>
          )}
        </div>

        {/* Menu: Tools */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === "tools" ? null : "tools")}
            className={`px-1.5 py-0.5 rounded-[2px] cursor-pointer hover:bg-[#000080] hover:text-white transition-colors ${
              activeMenu === "tools" ? "bg-[#000080] text-white" : ""
            }`}
          >
            <u>T</u>ools
          </button>
          {activeMenu === "tools" && (
            <div className="absolute top-full left-0 mt-0.5 w-60 bg-[#D4D0C8] border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] shadow-xl py-1 z-50 text-[#000000]">
              <div className="px-3 py-1 text-[10px] text-gray-600 font-bold uppercase font-mono">Pilih Utilitas</div>
              {SWISS_TOOLS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    requestSwitchTool(t.id)
                    setActiveMenu(null)
                  }}
                  className={`w-full text-left px-3 py-1 hover:bg-[#000080] hover:text-white flex items-center justify-between cursor-pointer font-sans ${
                    activeToolId === t.id ? "bg-[#000080] text-white font-bold" : ""
                  }`}
                >
                  <span>{t.name}</span>
                  <span className="font-mono text-[9px] opacity-80">[{t.command}]</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Menu: Help */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setActiveMenu(null)
              openAboutDialog()
            }}
            className="px-1.5 py-0.5 rounded-[2px] cursor-pointer hover:bg-[#000080] hover:text-white transition-colors"
          >
            <u>H</u>elp
          </button>
        </div>
      </div>

      {/* ── Mobile Tool Switcher Bar (< 768px) ── */}
      <div className="md:hidden bg-[#ECE9D8] border-b border-[#808080] p-2 flex items-center gap-2 shrink-0">
        <label htmlFor="mobile-tool-select" className="sr-only">
          Pilih Alat
        </label>
        <div className="flex items-center gap-1.5 font-bold text-[11px] text-[#000080] shrink-0">
          <Wrench className="size-3.5 text-[#000080]" />
          <span>Utilitas:</span>
        </div>
        <select
          id="mobile-tool-select"
          aria-label="Pilih Alat SwissTools"
          value={activeToolId}
          onChange={(e) => requestSwitchTool(e.target.value as SwissToolId)}
          className="flex-1 h-7 px-2 bg-white border border-t-[#808080] border-l-[#808080] border-r-white border-b-white text-[12px] font-sans outline-none cursor-pointer text-black"
        >
          {SWISS_TOOLS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.command})
            </option>
          ))}
        </select>
      </div>

      {/* ── Main MMC Explorer Layout (Desktop Sidebar + Content Panel) ── */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar (Desktop Only) */}
        <div className="hidden md:flex flex-col w-64 bg-[#D4D0C8] border-r-2 border-r-[#808080] shrink-0 select-none">
          {/* Sidebar Search Bar */}
          <div className="p-2 border-b border-[#808080] bg-[#ECE9D8]">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama atau perintah (.exe)..."
                className="w-full h-7 pl-6 pr-2 bg-white border border-t-[#808080] border-l-[#808080] border-r-white border-b-white text-[11px] font-sans outline-none text-slate-950 placeholder:text-gray-400 shadow-inner"
              />
              <Search className="absolute left-1.5 size-3.5 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Tools Tree List */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-2 retro-scrollbar">
            {categorizedTools.map((grp) => (
              <div key={grp.category} className="space-y-0.5">
                <div className="px-2 py-0.5 text-[10px] font-bold text-[#000080] uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Folder className="size-3 text-[#E0A800]" />
                  <span>{CATEGORY_NAMES[grp.category]}</span>
                </div>

                <div className="space-y-0.5 pl-1">
                  {grp.items.map((t) => {
                    const Icon = TOOL_ICONS[t.id]
                    const isSelected = activeToolId === t.id

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => requestSwitchTool(t.id)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-[2px] text-left transition-colors cursor-pointer group ${
                          isSelected
                            ? "bg-[#000080] text-white font-semibold shadow-xs"
                            : "hover:bg-white/60 text-slate-900"
                        }`}
                      >
                        <Icon
                          className={`size-4 shrink-0 ${
                            isSelected ? "text-[#FFD700]" : "text-[#000080]"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] leading-tight truncate flex items-center justify-between gap-1">
                            <span className="truncate">{t.name}</span>
                            {t.badge && (
                              <span
                                className={`text-[8px] px-1 py-0.2 rounded font-mono font-bold leading-none shrink-0 ${
                                  isSelected
                                    ? "bg-[#FFD700] text-slate-950"
                                    : "bg-blue-100 text-blue-900 border border-blue-300"
                                }`}
                              >
                                {t.badge}
                              </span>
                            )}
                          </div>
                          <div
                            className={`text-[9px] font-mono truncate mt-0.5 ${
                              isSelected ? "text-blue-200" : "text-gray-500"
                            }`}
                          >
                            {t.command}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer: Privacy Badge */}
          <div className="p-2 border-t border-[#808080] bg-[#ECE9D8] text-[10px] text-slate-700 flex items-center gap-1.5 shrink-0 font-sans">
            <ShieldCheck className="size-4 text-emerald-700 shrink-0" />
            <span className="leading-tight font-medium">100% Client-Side • Data Aman</span>
          </div>
        </div>

        {/* Right Work Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#C0C0C0]">
          {/* Active Tool Header Banner */}
          <div className="px-3 py-2 bg-[#D4D0C8] border-b-2 border-b-[#808080] flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 bg-[#000080] text-white rounded-[2px] shadow border border-white/40 shrink-0">
                {React.createElement(TOOL_ICONS[activeTool.id], { className: "size-4 text-[#FFD700]" })}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-[13px] text-black flex items-center gap-2 truncate">
                  <span>{activeTool.name}</span>
                  <span className="text-[11px] font-mono text-[#000080] font-bold">
                    [{activeTool.command}]
                  </span>
                </div>
                <div className="text-[11px] text-gray-700 truncate hidden sm:block font-sans">
                  {activeTool.description}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="px-2 py-0.5 bg-emerald-100 border border-emerald-400 text-emerald-900 font-bold text-[10px] rounded-[2px] uppercase font-mono shadow-2xs">
                ● Sandbox Aktif
              </span>
            </div>
          </div>

          {/* Active Tool Content */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-[#C0C0C0]">
            {renderActiveTool()}
          </div>
        </div>
      </div>

      {/* ── Retro Status Bar ── */}
      <div className="bg-[#D4D0C8] border-t-2 border-t-[#808080] px-3 py-1 flex items-center justify-between text-[11px] text-gray-700 shrink-0 font-sans">
        <div className="flex items-center gap-2 truncate">
          <span className="font-bold text-[#000080] font-mono">SWISSTOOLS.EXE</span>
          <span>•</span>
          <span className="truncate font-semibold text-slate-800">{activeTool.command} siap digunakan</span>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-[10px] font-mono">
          <span className="text-emerald-800 font-bold">● Offline & Aman</span>
        </div>
      </div>

      {/* Dialog Konfirmasi Pindah Tool saat ada berkas di antrean */}
      <ConfirmDialog
        isOpen={isSwitchConfirmOpen}
        title="PINDAH_TOOL.EXE"
        message="Ada dokumen atau data di antrean yang belum disimpan atau diekspor. Yakin ingin berpindah menu? Data antrean saat ini akan dibatalkan."
        variant="warning"
        confirmText="Ya, Pindah Menu"
        cancelText="Tetap di Sini"
        onConfirm={() => {
          if (pendingToolId) {
            setIsToolDirty(false)
            setActiveToolId(pendingToolId)
            setPendingToolId(null)
          }
          setIsSwitchConfirmOpen(false)
        }}
        onClose={() => {
          setPendingToolId(null)
          setIsSwitchConfirmOpen(false)
        }}
      />

      {/* Dialog Konfirmasi Tutup Window saat ada berkas di antrean */}
      <ConfirmDialog
        isOpen={isCloseConfirmOpen}
        title="TUTUP_SWISSTOOLS.EXE"
        message="Ada dokumen PDF di antrean yang belum selesai diproses. Yakin ingin menutup Swiss Army Tools?"
        variant="destructive"
        confirmText="Ya, Tutup Aplikasi"
        cancelText="Batal"
        onConfirm={() => {
          setIsToolDirty(false)
          setIsCloseConfirmOpen(false)
          closeWindow("swisstools")
        }}
        onClose={() => setIsCloseConfirmOpen(false)}
      />
    </div>
  )
}
