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
  Eye,
  Search,
  AlertCircle,
  Key,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { RetroActionButton } from "@/components/ui/retro-action-button"
import { fetchKasSheetDataAction, type KasSheetData } from "@/app/actions/kas"

const SPREADSHEET_URL =
  "https://docs.google.com/spreadsheets/d/1vjrtn0Z1fLbDr4trQpdMbGecKW8WIEf3KJjXt0Sc9v4/edit?gid=0#gid=0"

export function KasApp() {
  const { isAdmin, isGuest } = useAuth()
  const { isKasPic, getPicNames } = usePicStore()
  const { openWindow } = useDesktop()

  const [copied, setCopied] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("Laporan Uang Masuk")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [showAnnouncement, setShowAnnouncement] = React.useState(true)

  // Sheet API Data state
  const [sheetData, setSheetData] = React.useState<KasSheetData | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isConfigured, setIsConfigured] = React.useState(true)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const loadSheetData = React.useCallback(async (tabName: string) => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const result = await fetchKasSheetDataAction(tabName)
      setIsConfigured(result.isConfigured)
      if (result.success && result.data) {
        setSheetData(result.data)
      } else {
        setErrorMessage(result.error || "Gagal memuat data dari spreadsheet")
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Terjadi kesalahan jaringan")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadSheetData(activeTab)
  }, [activeTab, loadSheetData])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(SPREADSHEET_URL)
    setCopied(true)
    playRetroNotificationSound()
    setTimeout(() => setCopied(false), 2500)
  }

  const handleOpenSheet = () => {
    window.open(SPREADSHEET_URL, "_blank", "noopener,noreferrer")
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    playRetroNotificationSound()
  }

  const picDisplayName = getPicNames("kas") || "Belum Ditugaskan"

  // Filter rows by search query
  const filteredRows = React.useMemo(() => {
    if (!sheetData?.rows) return []
    if (!searchQuery.trim()) return sheetData.rows
    const q = searchQuery.toLowerCase()
    return sheetData.rows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.no.includes(q)
    )
  }, [sheetData?.rows, searchQuery])

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
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-normal">
                {isConfigured ? "API Connected" : "Restricted"}
              </span>
            </div>
          </div>
          <div className="size-8 rounded-full bg-white/15 flex items-center justify-center">
            {isConfigured ? (
              <FileSpreadsheet className="size-4 text-emerald-200" />
            ) : (
              <Lock className="size-4 text-white" />
            )}
          </div>
        </div>

        {/* PIC Kas Card */}
        <div className="bg-white border border-[#CBD5E1] p-2.5 rounded-[3px] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="size-3" />
              <span>PENANGGUNG JAWAB (PIC)</span>
            </div>
            <div
              className="text-sm font-extrabold text-[#14253D] mt-0.5 truncate max-w-[170px]"
              title={picDisplayName}
            >
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
      <div className="bg-white border border-[#95A5B5] rounded-[3px] p-3 space-y-3">
        {/* Setup Notification Banner if Google Service Account is not yet configured */}
        {!isConfigured && (
          <div className="bg-[#FFF8E6] border-2 border-[#E2B93B] p-3 rounded-[2px] text-xs font-sans space-y-2 shadow-sm">
            <div className="flex items-center gap-2 text-amber-900 font-mono font-bold text-[11px]">
              <Key className="size-4 text-amber-700 shrink-0" />
              <span>SETUP KREDENSIAL GOOGLE SHEETS API DIPERLUKAN</span>
            </div>
            <p className="text-[#593E00] leading-relaxed text-xs">
              Karena spreadsheet ini berstatus <strong>terkunci (Restricted/View Only)</strong>, sistem IT-Things membutuhkan Service Account Google Cloud agar dapat membaca data tabel secara live.
            </p>
            <div className="bg-white/80 border border-[#E8D49E] p-2.5 rounded text-[11px] font-mono space-y-1 text-slate-800">
              <p className="font-bold text-slate-900">Langkah Cepat Aktifkan:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-[10px] text-slate-700">
                <li>Buat <strong>Service Account</strong> di Google Cloud Console &amp; download JSON key.</li>
                <li>Share spreadsheet ke email Service Account sebagai <strong>Viewer</strong>.</li>
                <li>Tambahkan <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900">GOOGLE_SERVICE_ACCOUNT_EMAIL</code> dan <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900">GOOGLE_PRIVATE_KEY</code> ke <code className="font-bold">.env.local</code>.</li>
              </ol>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <RetroActionButton
                action="refresh"
                label="Cek Ulang Koneksi"
                isLoading={isLoading}
                onClick={() => loadSheetData(activeTab)}
                visual="button"
                size="xs"
              />
              <button
                type="button"
                onClick={handleOpenSheet}
                className="text-[11px] font-mono text-blue-700 hover:underline font-bold inline-flex items-center gap-1"
              >
                <ExternalLink className="size-3" />
                <span>Buka Langsung di Browser ↗</span>
              </button>
            </div>
          </div>
        )}

        {/* Live Sheet Data Section */}
        <div className="border border-[#CBD5E1] rounded-[2px] bg-[#F8FAFC] p-2.5 space-y-2.5">
          {/* Controls Bar: Tabs, Search, & Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-2">
            {/* Sheet Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
              <span className="text-[10px] font-mono font-bold text-gray-500 uppercase flex items-center gap-1 mr-1 shrink-0">
                <Layers className="size-3" /> Sheet:
              </span>
              {(sheetData?.sheetTabs && sheetData.sheetTabs.length > 0
                ? sheetData.sheetTabs
                : ["Laporan Uang Masuk"]
              ).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleTabChange(tab)}
                  className={`px-2 py-1 text-[11px] font-mono rounded-[2px] border transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === tab
                      ? "bg-[#1E4E8C] text-white border-[#102A45] font-bold shadow-sm"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search & Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="relative flex-1 sm:w-48">
                <Search className="size-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-2 py-1 text-xs font-mono bg-white border border-slate-300 rounded-[2px] focus:outline-none focus:border-blue-600 shadow-inner"
                />
              </div>

              <RetroActionButton
                action="refresh"
                tooltip="Segarkan data spreadsheet"
                isLoading={isLoading}
                onClick={() => loadSheetData(activeTab)}
                visual="icon"
                size="sm"
              />

              <button
                type="button"
                onClick={handleOpenSheet}
                title="Buka spreadsheet asli"
                className="retro-button-3d p-1 text-slate-700 hover:text-blue-700"
              >
                <ExternalLink className="size-4" />
              </button>
            </div>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-300 text-red-800 p-2 rounded text-xs flex items-center gap-2">
              <AlertCircle className="size-4 text-red-600 shrink-0" />
              <span className="font-mono text-[11px]">{errorMessage}</span>
            </div>
          )}

          {/* Live Data Table Container (Responsive with overflow-x-auto) */}
          <div className="relative border border-[#96A6B6] rounded-[2px] bg-white overflow-hidden shadow-inner">
            {isLoading && (
              <div className="absolute inset-0 bg-white/75 backdrop-blur-[1px] z-10 flex items-center justify-center gap-2 text-xs font-mono text-slate-700">
                <div className="size-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>Memuat data dari Google Sheets API...</span>
              </div>
            )}

            <div className="overflow-x-auto max-h-[420px] scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-[5] bg-[#E5ECF2] border-b-2 border-[#7D8E9E] font-mono text-[11px] text-[#14253D]">
                  <tr>
                    <th className="p-2 border-r border-[#CBD5E1] text-center w-10 font-bold">
                      No
                    </th>
                    <th className="p-2 border-r border-[#CBD5E1] min-w-[140px] font-bold sticky left-0 bg-[#E5ECF2] z-[6]">
                      Nama Personil
                    </th>
                    {sheetData?.monthColumns && sheetData.monthColumns.length > 0 ? (
                      sheetData.monthColumns.map((col) => (
                        <th
                          key={col}
                          className="p-2 border-r border-[#CBD5E1] text-center min-w-[80px] font-bold"
                        >
                          {col}
                        </th>
                      ))
                    ) : (
                      <>
                        <th className="p-2 border-r border-[#CBD5E1] text-center min-w-[70px]">Feb</th>
                        <th className="p-2 border-r border-[#CBD5E1] text-center min-w-[70px]">Mar</th>
                        <th className="p-2 border-r border-[#CBD5E1] text-center min-w-[70px]">Apr</th>
                        <th className="p-2 border-r border-[#CBD5E1] text-center min-w-[70px]">May</th>
                        <th className="p-2 border-r border-[#CBD5E1] text-center min-w-[70px]">Jun</th>
                        <th className="p-2 border-r border-[#CBD5E1] text-center min-w-[70px]">Jul</th>
                        <th className="p-2 border-r border-[#CBD5E1] text-center min-w-[70px]">Aug</th>
                      </>
                    )}
                    <th className="p-2 text-center min-w-[60px] font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] font-sans">
                  {filteredRows.length > 0 ? (
                    filteredRows.map((row, idx) => (
                      <tr
                        key={`${row.no}-${row.name}-${idx}`}
                        className={`hover:bg-[#F0F5FA] transition-colors ${
                          idx % 2 === 1 ? "bg-[#FAFBFD]" : "bg-white"
                        }`}
                      >
                        <td className="p-2 border-r border-[#E2E8F0] text-center font-mono text-[11px] text-gray-500">
                          {row.no}
                        </td>
                        <td className="p-2 border-r border-[#E2E8F0] font-medium text-slate-900 sticky left-0 bg-inherit z-[1] whitespace-nowrap">
                          {row.name}
                        </td>
                        {sheetData?.monthColumns && sheetData.monthColumns.length > 0 ? (
                          sheetData.monthColumns.map((col) => {
                            const val = row.payments[col] || ""
                            const isPaid = val && val !== "-" && val !== "0"
                            return (
                              <td
                                key={col}
                                className="p-2 border-r border-[#E2E8F0] text-center font-mono text-[11px]"
                              >
                                {isPaid ? (
                                  <span className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold px-1.5 py-0.5 rounded-[2px]">
                                    {val}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 font-bold">-</span>
                                )}
                              </td>
                            )
                          })
                        ) : (
                          <td
                            colSpan={8}
                            className="p-4 text-center text-xs text-gray-400 font-mono"
                          >
                            Hubungkan Google Service Account untuk menampilkan rincian bulan.
                          </td>
                        )}
                        <td className="p-2 text-center font-mono text-[11px]">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              row.totalPaidCount > 0
                                ? "bg-blue-50 text-blue-800 border border-blue-200"
                                : "text-gray-400"
                            }`}
                          >
                            {row.totalPaidCount > 0 ? `${row.totalPaidCount} bln` : "0 bln"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={
                          sheetData?.monthColumns && sheetData.monthColumns.length > 0
                            ? sheetData.monthColumns.length + 3
                            : 9
                        }
                        className="p-6 text-center text-gray-500 text-xs font-mono space-y-2"
                      >
                        {isLoading ? (
                          <span>Sedang memuat data dari spreadsheet...</span>
                        ) : searchQuery ? (
                          <span>Tidak ditemukan personil dengan nama &quot;{searchQuery}&quot;</span>
                        ) : !isConfigured ? (
                          <div className="space-y-1">
                            <p className="font-bold text-slate-700">Kredensial Service Account belum aktif.</p>
                            <p className="text-[11px] text-gray-500">
                              Data akan otomatis tersinkron setelah konfigurasi .env.local diselesaikan.
                            </p>
                          </div>
                        ) : (
                          <span>Belum ada data tersedia pada sheet ini.</span>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Status */}
            <div className="bg-[#EAEFF4] border-t border-[#CBD5E1] px-3 py-1.5 flex flex-wrap items-center justify-between text-[11px] font-mono text-gray-600 gap-2">
              <div className="flex items-center gap-3">
                <span>
                  Total: <strong>{filteredRows.length}</strong> dari{" "}
                  <strong>{sheetData?.totalMembers || 0}</strong> personil
                </span>
                {sheetData?.lastUpdated && (
                  <span className="text-gray-400 hidden sm:inline">
                    Sinkronisasi: {new Date(sheetData.lastUpdated).toLocaleTimeString()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[10px]">
                  <span className="size-2 rounded-full bg-emerald-500 inline-block" /> Lunas
                </span>
                <span className="flex items-center gap-1 text-[10px]">
                  <span className="size-2 rounded-full bg-gray-300 inline-block" /> Belum
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Official Announcement & Mechanism */}
        <div className="bg-[#FFFEEA] border border-[#D4C085] rounded-[2px] shadow-sm font-sans overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAnnouncement((prev) => !prev)}
            className="w-full p-2.5 flex items-center justify-between bg-[#FCF8DD] border-b border-[#E8DAB2] hover:bg-[#F9F3D0] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2">
              <Megaphone className="size-4 text-amber-800 shrink-0" />
              <span className="font-mono text-xs font-bold text-[#543D0A] uppercase tracking-wider">
                Pengumuman Mekanisme Iuran Kas
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-amber-900 font-bold">
              <span>{showAnnouncement ? "Tutup" : "Buka"}</span>
              {showAnnouncement ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </div>
          </button>

          {showAnnouncement && (
            <div className="p-3 space-y-2 text-xs text-[#3E3214] leading-relaxed">
              <p>
                Assalamualaikum gaes, menindaklanjuti yg ini. Mohon dukungan &amp; pengertiannya ya.
                Direncanakan pengumpulan iuran akan dimulai bulan ini, mekanisme pengumpulan iurannya antara lain sebagai berikut:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                {/* Point 1: Schedule */}
                <div className="bg-white/90 border border-[#E2D5B5] p-2.5 rounded-[2px] space-y-1">
                  <div className="font-bold text-[#14253D] flex items-center gap-1.5 font-mono text-[11px]">
                    <CalendarCheck className="size-3.5 text-blue-700" />
                    <span>JADWAL PENGUMPULAN</span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">
                    Pengumpulan iuran tiap tanggal gajian. Jadi ada yg <strong>tgl 8</strong> dan juga <strong>25</strong> tiap bulannya.
                  </p>
                </div>

                {/* Point 2: Rates */}
                <div className="bg-white/90 border border-[#E2D5B5] p-2.5 rounded-[2px] space-y-1">
                  <div className="font-bold text-[#14253D] flex items-center gap-1.5 font-mono text-[11px]">
                    <Coins className="size-3.5 text-emerald-700" />
                    <span>BESARAN IURAN</span>
                  </div>
                  <div className="font-mono space-y-1 pt-0.5">
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
          )}
        </div>

        {/* Quick URL & Spreadsheet Link Footer */}
        <div className="bg-[#FAFBFD] border border-[#CBD5E1] p-2 rounded-[2px] text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] text-gray-500 font-bold uppercase shrink-0">Tautan:</span>
            <span className="text-[11px] text-[#1E4E8C] truncate select-all">{SPREADSHEET_URL}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className="retro-button-3d px-2 py-1 text-[11px] font-mono flex items-center gap-1 cursor-pointer"
              title="Salin tautan spreadsheet"
            >
              {copied ? <Check className="size-3 text-emerald-700" /> : <Copy className="size-3 text-gray-600" />}
              <span>{copied ? "Tersalin!" : "Salin"}</span>
            </button>
            <button
              type="button"
              onClick={handleOpenSheet}
              className="retro-button-3d px-2 py-1 text-[11px] font-mono font-bold flex items-center gap-1 bg-[#000080] text-white hover:bg-[#102A45] cursor-pointer"
            >
              <ExternalLink className="size-3 text-yellow-300" />
              <span>Buka Google Sheet ↗</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

