"use client"

import * as React from "react"
import { useDesktop } from "@/components/desktop/desktop-context"
import { Copy, Check, MessageSquare, Vote, Users } from "lucide-react"

const README_CONTENT = `================================================================
IT-THINGS 98 // PANDUAN & PENGENALAN WORKSPACE TIM
================================================================

Halo rekan tim! 👋
Bingung web ini buat apa? Singkatnya: web ini adalah
"Internal Team Hub / Daily Utilities" khusus buat nyelesaiin
printilan harian tim IT kita biar gak ribet & tetap asik.

MODUL-MODUL UTAMA & FUNGSINYA:
----------------------------------------------------------------
1. 🗳️ VOTE.EXE (Polling & Keputusan Tim)
   • Nentuin makan siang di mana tanpa drama "terserah".
   • Voting cepat jadwal mabar, futsal, atau kesepakatan tim.
   • Realtime: Hasil vote langsung terupdate serentak ke semua user.

2. 💬 CHAT.EXE (Live Team Messenger)
   • Ruang ngobrol santai & koordinasi cepat internal tim.
   • Support mention (@nama), reaksi emoji, filter unread,
     serta push notifikasi desktop & audio retro chime.

3. 👥 TEAM.EXE (Direktori Anggota)
   • Direktori kontak, nama panggilan, role, dan akun tim.

4. 🎡 FITUR SEGERA HADIR (COMING SOON):
   • Wheel.exe    : Rolet putar "Mau Makan Apa?" pas bingung milih.
   • SplitBill.exe: Kalkulator patungan makan/ngopi anti-pusing.
   • Kas.exe      : Buku kas & transparansi uang kas tim.

TIPS PAKAI:
----------------------------------------------------------------
• Dobel klik ikon apa saja di wallpaper untuk membuka jendela.
• Bisa buka beberapa jendela sekaligus (multitasking).
• Klik tombol "Start" di pojok kiri bawah untuk navigasi cepat
  atau edit nama/foto profil.
• File README.txt ini bisa kamu buka lagi kapan saja lewat desktop.

Selamat mencoba & have fun bareng tim! 🚀
================================================================`

export function ReadmeApp() {
  const { openWindow, closeWindow, openAboutDialog } = useDesktop()
  const [isCopied, setIsCopied] = React.useState(false)
  const [activeMenu, setActiveMenu] = React.useState<string | null>(null)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(README_CONTENT)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem("it_things_readme_seen", "true")
    } catch {
      // ignore
    }
    closeWindow("readme")
  }

  return (
    <div className="flex flex-col h-full bg-[#D4DDE6] text-[#14253D] font-mono text-xs select-none">
      {/* Retro Notepad Menu Bar */}
      <div className="bg-[#ECE9D8] border-b border-[#9CA3AF] px-1.5 py-0.5 flex items-center gap-2 text-[11px] text-[#222]">
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === "file" ? null : "file")}
            className={`px-1.5 py-0.5 rounded-[2px] cursor-pointer hover:bg-[#1E4E8C] hover:text-white transition-colors ${
              activeMenu === "file" ? "bg-[#1E4E8C] text-white" : ""
            }`}
          >
            <u>F</u>ile
          </button>
          {activeMenu === "file" && (
            <div className="absolute top-full left-0 mt-0.5 w-44 bg-[#D4DDE6] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] shadow-lg py-1 z-50 text-[#14253D]">
              <button
                type="button"
                onClick={() => {
                  openWindow("vote")
                  setActiveMenu(null)
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#1E4E8C] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Buka Vote.exe</span>
                <span className="text-[9px] opacity-75">Poll</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  openWindow("chat")
                  setActiveMenu(null)
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#1E4E8C] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Buka Chat.exe</span>
                <span className="text-[9px] opacity-75">Chat</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  openWindow("team")
                  setActiveMenu(null)
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#1E4E8C] hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Buka Team.exe</span>
                <span className="text-[9px] opacity-75">Tim</span>
              </button>
              <div className="my-1 border-t border-[#A4B5C6]" />
              <button
                type="button"
                onClick={() => {
                  setActiveMenu(null)
                  handleDismiss()
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#1E4E8C] hover:text-white cursor-pointer"
              >
                Keluar (Exit)
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={handleCopy}
            className="px-1.5 py-0.5 rounded-[2px] cursor-pointer hover:bg-[#1E4E8C] hover:text-white transition-colors flex items-center gap-1"
          >
            <u>E</u>dit / Salin
          </button>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              openAboutDialog()
              setActiveMenu(null)
            }}
            className="px-1.5 py-0.5 rounded-[2px] cursor-pointer hover:bg-[#1E4E8C] hover:text-white transition-colors"
          >
            <u>H</u>elp
          </button>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="p-1.5 bg-[#E8EEF5] border-b border-[#A4B5C6] flex items-center justify-between gap-1 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => openWindow("vote")}
            className="h-6 px-2 bg-white hover:bg-slate-100 text-[#102A45] font-bold text-[11px] rounded-[2px] border border-t-white border-l-white border-r-[#7D8E9E] border-b-[#7D8E9E] shadow-[1px_1px_0px_#404040] active:translate-y-px flex items-center gap-1 cursor-pointer"
          >
            <Vote className="size-3 text-blue-700" />
            <span>Buka Vote.exe</span>
          </button>
          <button
            type="button"
            onClick={() => openWindow("chat")}
            className="h-6 px-2 bg-white hover:bg-slate-100 text-[#102A45] font-bold text-[11px] rounded-[2px] border border-t-white border-l-white border-r-[#7D8E9E] border-b-[#7D8E9E] shadow-[1px_1px_0px_#404040] active:translate-y-px flex items-center gap-1 cursor-pointer"
          >
            <MessageSquare className="size-3 text-emerald-700" />
            <span>Buka Chat.exe</span>
          </button>
          <button
            type="button"
            onClick={() => openWindow("team")}
            className="h-6 px-2 bg-white hover:bg-slate-100 text-[#102A45] font-bold text-[11px] rounded-[2px] border border-t-white border-l-white border-r-[#7D8E9E] border-b-[#7D8E9E] shadow-[1px_1px_0px_#404040] active:translate-y-px flex items-center gap-1 cursor-pointer"
          >
            <Users className="size-3 text-indigo-700" />
            <span>Direktori Tim</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            className="h-6 px-2 bg-[#E2E8F0] hover:bg-white text-gray-700 font-semibold text-[11px] rounded-[2px] border border-t-white border-l-white border-r-[#7D8E9E] border-b-[#7D8E9E] shadow-[1px_1px_0px_#404040] active:translate-y-px flex items-center gap-1 cursor-pointer"
            title="Salin isi teks"
          >
            {isCopied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
            <span>{isCopied ? "Tersalin!" : "Salin Teks"}</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="h-6 px-2.5 bg-[#1E4E8C] hover:bg-[#153A6B] text-white font-bold text-[11px] rounded-[2px] border border-[#102A45] shadow-[1px_1px_0px_#102A45] active:translate-y-px flex items-center gap-1 cursor-pointer"
            title="Tutup panduan dan mulai pakai"
          >
            <Check className="size-3" />
            <span>Paham, Mulai!</span>
          </button>
        </div>
      </div>

      {/* Notepad Text Editor Area */}
      <div className="flex-1 p-2 bg-[#C0CCD9] min-h-0">
        <div className="h-full w-full bg-white border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white shadow-inner p-3 sm:p-4 overflow-y-auto select-text font-mono text-[12px] sm:text-[13px] leading-relaxed text-[#111827]">
          <pre className="whitespace-pre-wrap font-mono tracking-tight break-words">
            {README_CONTENT}
          </pre>
        </div>
      </div>

      {/* Notepad Status Bar */}
      <div className="bg-[#D4DDE6] border-t border-t-white border-b border-b-[#5E7287] px-2 py-0.5 flex items-center justify-between text-[10px] text-gray-600">
        <div className="flex items-center gap-2">
          <span>Status: Siap Dibaca</span>
          <span>•</span>
          <span>36 Baris</span>
        </div>
        <div className="flex items-center gap-3">
          <span>UTF-8</span>
          <span>Windows (CRLF)</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  )
}
