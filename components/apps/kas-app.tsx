"use client"

import * as React from "react"
import { useAuth } from "@/lib/auth"
import { usePicStore } from "@/lib/pic-store"
import { useDesktop } from "@/components/desktop/desktop-context"
import { playRetroNotificationSound } from "@/lib/sound-effects"
import {
  ShieldCheck,
  Lock,
  ExternalLink,
  Copy,
  Check,
  FileSpreadsheet,
  Megaphone,
  CalendarCheck,
  Coins,
  Eye
} from "lucide-react"

const SPREADSHEET_URL =
  "https://docs.google.com/spreadsheets/d/1vjrtn0Z1fLbDr4trQpdMbGecKW8WIEf3KJjXt0Sc9v4/edit?gid=0#gid=0"

export function KasApp() {
  const { isAdmin, isGuest } = useAuth()
  const { isKasPic, getPicNames } = usePicStore()
  const { openWindow } = useDesktop()

  const [copied, setCopied] = React.useState(false)

  const handleCopyLink = () => {
    navigator.clipboard.writeText(SPREADSHEET_URL)
    setCopied(true)
    playRetroNotificationSound()
    setTimeout(() => setCopied(false), 2500)
  }

  const handleOpenSheet = () => {
    window.open(SPREADSHEET_URL, "_blank", "noopener,noreferrer")
  }

  const picDisplayName = getPicNames("kas") || "Belum Ditugaskan"

  return (
    <div className="flex flex-col gap-3 min-h-full font-sans text-slate-800">
      {/* Top Stat Bar: Document, PIC, & Rates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
        {/* Main Document Status */}
        <div className="bg-gradient-to-br from-[#107C41] to-[#1E4E8C] text-white p-2.5 rounded-[3px] shadow-sm border border-[#0B552C] flex items-center justify-between">
          <div>
            <div className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider flex items-center gap-1">
              <FileSpreadsheet className="size-3" />
              <span>REKAP RESMI TIM</span>
            </div>
            <div className="text-sm font-black mt-0.5 tracking-tight flex items-center gap-1.5">
              <span>Google Sheets</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-normal">Restricted</span>
            </div>
          </div>
          <div className="size-8 rounded-full bg-white/15 flex items-center justify-center">
            <Lock className="size-4 text-white" />
          </div>
        </div>

        {/* PIC Kas Card */}
        <div className="bg-white border border-[#CBD5E1] p-2.5 rounded-[3px] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="size-3" />
              <span>PENANGGUNG JAWAB (PIC)</span>
            </div>
            <div className="text-sm font-extrabold text-[#14253D] mt-0.5 truncate max-w-[170px]" title={picDisplayName}>
              {picDisplayName}
            </div>
          </div>
          <button
            type="button"
            onClick={() => openWindow("team")}
            title="Kelola PIC di team.exe"
            className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer"
          >
            Ubah
          </button>
        </div>

        {/* Rates & Schedule Card */}
        <div className="bg-white border border-[#CBD5E1] p-2.5 rounded-[3px] shadow-sm flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[10px] text-[#2E5AA8] font-bold uppercase tracking-wider flex items-center gap-1">
              <Coins className="size-3 shrink-0" />
              <span>TARIF IURAN KAS</span>
            </div>
            <div className="text-xs font-bold text-[#14253D] mt-1 flex items-center gap-1.5 font-mono whitespace-nowrap">
              <span className="text-emerald-700 font-extrabold">100k</span>
              <span className="text-[10px] font-medium text-gray-500 font-sans">TKO</span>
              <span className="text-gray-300">•</span>
              <span className="text-blue-700 font-extrabold">50k</span>
              <span className="text-[10px] font-medium text-gray-500 font-sans">TKNO</span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#1E4E8C] bg-blue-50 border border-blue-200 px-2 py-1 rounded shrink-0 font-mono text-center whitespace-nowrap ml-2">
            Tgl 8 &amp; 25
          </span>
        </div>
      </div>

      {/* Role Indicator Bar */}
      <div className="bg-[#D8E0E8] border border-[#96A6B6] px-2.5 py-1.5 rounded-[2px] flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1.5 text-[#14253D] font-bold">
          <FileSpreadsheet className="size-3.5 text-emerald-700" />
          <span>Portal Rekap Kas &amp; Iuran Divisi IT</span>
        </div>

        <div className="text-[11px] flex items-center gap-1.5 text-gray-700">
          {isGuest ? (
            <span className="text-amber-800 font-bold flex items-center gap-1 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
              <Eye className="size-3 text-amber-700" /> Mode Tamu (Read-Only)
            </span>
          ) : isKasPic ? (
            <span className="text-emerald-900 font-bold flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
              <ShieldCheck className="size-3.5 text-emerald-700" /> Anda: PIC Kas
            </span>
          ) : isAdmin ? (
            <span className="text-purple-900 font-bold flex items-center gap-1 bg-purple-100 px-2 py-0.5 rounded border border-purple-300">
              <ShieldCheck className="size-3.5 text-purple-700" /> Anda: Admin
            </span>
          ) : (
            <span className="text-gray-600 bg-white/70 px-1.5 py-0.5 rounded border border-[#CBD5E1]">
              PIC: <strong className="text-[#14253D]">{picDisplayName}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-[#95A5B5] rounded-[3px] p-3.5 space-y-3">
        {/* Official Announcement Card */}
        <div className="bg-[#FFFEEA] border-2 border-[#D4C085] p-3 rounded-[2px] shadow-sm font-sans space-y-2">
          <div className="flex items-center gap-2 border-b border-[#E8DAB2] pb-1.5">
            <Megaphone className="size-4 text-amber-800" />
            <span className="font-mono text-xs font-bold text-[#543D0A] uppercase tracking-wider">
              Pengumuman Mekanisme Iuran Kas
            </span>
          </div>

          <p className="text-xs text-[#3E3214] leading-relaxed">
            Assalamualaikum gaes, menindaklanjuti yg ini. Mohon dukungan &amp; pengertiannya ya.
            Direncanakan pengumpulan iuran akan dimulai bulan ini, mekanisme pengumpulan iurannya antara lain sebagai berikut:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
            {/* Point 1: Schedule */}
            <div className="bg-white/90 border border-[#E2D5B5] p-2.5 rounded-[2px] text-xs space-y-1">
              <div className="font-bold text-[#14253D] flex items-center gap-1.5 font-mono text-[11px]">
                <CalendarCheck className="size-3.5 text-blue-700" />
                <span>JADWAL PENGUMPULAN</span>
              </div>
              <p className="text-gray-700 text-xs leading-relaxed">
                Pengumpulan iuran tiap tanggal gajian. Jadi ada yg <strong>tgl 8</strong> dan juga <strong>25</strong> tiap bulannya.
              </p>
            </div>

            {/* Point 2: Rates */}
            <div className="bg-white/90 border border-[#E2D5B5] p-2.5 rounded-[2px] text-xs space-y-1">
              <div className="font-bold text-[#14253D] flex items-center gap-1.5 font-mono text-[11px]">
                <Coins className="size-3.5 text-emerald-700" />
                <span>BESARAN IURAN</span>
              </div>
              <div className="font-mono text-xs space-y-1 pt-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-700">• TKO</span>
                  <span className="font-extrabold text-emerald-800">Rp 100.000</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-700">• TKNO</span>
                  <span className="font-extrabold text-blue-800">Rp 50.000</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Spreadsheet Launcher Hero */}
        <div className="bg-[#F0F4F8] border-2 border-[#7D8E9E] p-4 rounded-[2px] flex flex-col items-center text-center space-y-3 shadow-inner">
          <div className="size-12 rounded bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 shadow-sm">
            <FileSpreadsheet className="size-6" />
          </div>

          <div className="max-w-md">
            <h3 className="text-sm font-bold text-[#14253D] font-mono tracking-tight uppercase">
              Rekap Kas Resmi Tim IT (Google Sheets)
            </h3>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              Seluruh mutasi pemasukan, pengeluaran, nota bukti, dan saldo kas direkap langsung secara transparan pada dokumen Google Spreadsheet resmi.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-1 flex flex-col sm:flex-row items-center gap-2">
            <button
              type="button"
              onClick={handleOpenSheet}
              className="retro-button-3d px-5 py-2.5 text-xs font-mono font-bold flex items-center gap-2 bg-[#000080] text-white hover:bg-[#102A45] active:translate-y-0.5 cursor-pointer shadow-md"
            >
              <ExternalLink className="size-4 text-yellow-300" />
              <span>BUKA GOOGLE SPREADSHEET KAS ↗</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="retro-button-3d px-3 py-2.5 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
              title="Salin tautan spreadsheet ke clipboard"
            >
              {copied ? <Check className="size-3.5 text-emerald-700" /> : <Copy className="size-3.5 text-gray-600" />}
              <span>{copied ? "Tautan Tersalin!" : "Salin Link"}</span>
            </button>
          </div>
        </div>

        {/* URL Display Box */}
        <div className="bg-[#FAFBFD] border border-[#CBD5E1] p-2.5 rounded-[2px] text-xs font-mono">
          <div className="text-[10px] text-gray-500 font-bold uppercase mb-1 flex items-center justify-between">
            <span>Tautan Langsung Dokumen:</span>
            <span className="text-emerald-700 font-normal">gid=0 (Sheet Utama)</span>
          </div>
          <div className="bg-white border border-[#96A6B6] p-2 rounded text-[11px] text-[#1E4E8C] select-all break-all overflow-x-auto">
            {SPREADSHEET_URL}
          </div>
        </div>

        {/* Security & Access Notice */}
        <div className="bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded-[2px] text-xs text-gray-700 space-y-1 font-sans">
          <div className="font-bold flex items-center gap-1.5 font-mono text-[11px] text-[#14253D]">
            <Lock className="size-3.5 text-amber-700" />
            <span>INFORMASI PERIZINAN &amp; AKSES DOKUMEN</span>
          </div>
          <p className="text-[11px] text-gray-600 leading-normal">
            Spreadsheet ini berstatus <strong>Restricted (Akses Khusus Tim IT)</strong>. Jika muncul peringatan <em>&quot;You need access&quot;</em> saat membuka tautan, silakan klik tombol <strong>Request Access</strong> di Google Drive atau hubungi PIC Kas: <strong className="text-[#14253D]">{picDisplayName}</strong> untuk menambahkan akun Anda ke daftar izin.
          </p>
        </div>
      </div>
    </div>
  )
}
