"use client"

import * as React from "react"
import { useAuth } from "@/lib/auth"
import { useTeamStore } from "@/lib/team-store"
import { useDesktop } from "@/components/desktop/desktop-context"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  RotateCw,
  Users,
  Eye
} from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

export interface KasTransaction {
  id: string
  type: "in" | "out"
  amount: number
  category: string
  description: string
  receipt_url?: string | null
  created_by_name: string
  created_at: string
}

export interface KasDueMember {
  userId: string
  name: string
  avatarUrl?: string
  amount: number
  isPaid: boolean
  paidAt?: string
}

const INITIAL_TRANSACTIONS: KasTransaction[] = [
  {
    id: "tx-1",
    type: "in",
    amount: 100000,
    category: "iuran",
    description: "Iuran kas awal bulan September (5 orang)",
    created_by_name: "Bendahara",
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "tx-2",
    type: "in",
    amount: 8250,
    category: "split_bill_sisa",
    description: "Sisa pembulatan patungan makan siang",
    created_by_name: "Ajie",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "tx-3",
    type: "out",
    amount: 35000,
    category: "konsumsi",
    description: "Beli gorengan & es teh sore tim IT",
    created_by_name: "Bendahara",
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
]

const DEFAULT_MEMBERS: KasDueMember[] = [
  { userId: "m1", name: "Ajie Saputra", amount: 20000, isPaid: true, paidAt: "2026-09-02" },
  { userId: "m2", name: "Budi Santoso", amount: 20000, isPaid: true, paidAt: "2026-09-03" },
  { userId: "m3", name: "Citra Lestari", amount: 20000, isPaid: false },
  { userId: "m4", name: "Dimas Pratama", amount: 20000, isPaid: true, paidAt: "2026-09-04" },
  { userId: "m5", name: "Eko Prasetyo", amount: 20000, isPaid: false },
]

export function KasApp() {
  const { user, isTreasurer, isGuest } = useAuth()
  const { members: teamMembers } = useTeamStore()
  const { openWindow } = useDesktop()

  const [activeTab, setActiveTab] = React.useState<"ledger" | "dues">("ledger")
  const [transactions, setTransactions] = React.useState<KasTransaction[]>(INITIAL_TRANSACTIONS)
  const [duesMembers, setDuesMembers] = React.useState<KasDueMember[]>(DEFAULT_MEMBERS)

  // Sync dues checklist with master team members
  React.useEffect(() => {
    if (teamMembers && teamMembers.length > 0) {
      setDuesMembers((prev) => {
        return teamMembers.map((tm) => {
          const existing = prev.find(
            (p) =>
              p.userId === tm.id ||
              p.userId === tm.user_id ||
              p.name.toLowerCase() === tm.name.toLowerCase()
          )
          return {
            userId: tm.id,
            name: tm.name,
            avatarUrl: tm.avatar_url,
            amount: existing ? existing.amount : 20000,
            isPaid: existing ? existing.isPaid : false,
            paidAt: existing?.paidAt,
          }
        })
      })
    }
  }, [teamMembers])

  // Transaction form
  const [showTxForm, setShowTxForm] = React.useState(false)
  const [txType, setTxType] = React.useState<"in" | "out">("in")
  const [txAmount, setTxAmount] = React.useState("")
  const [txCategory, setTxCategory] = React.useState("iuran")
  const [txDesc, setTxDesc] = React.useState("")
  const [txReceipt, setTxReceipt] = React.useState("")
  const [permError, setPermError] = React.useState<string | null>(null)

  // Load from Supabase
  const loadData = React.useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: dbTx } = await supabase
          .from("kas_transactions")
          .select("*")
          .order("created_at", { ascending: false })

        if (dbTx && dbTx.length > 0) {
          setTransactions(
            dbTx.map((t) => ({
              id: t.id,
              type: t.type as any,
              amount: Number(t.amount),
              category: t.category,
              description: t.description,
              receipt_url: t.receipt_url,
              created_by_name: t.created_by_name,
              created_at: t.created_at,
            }))
          )
        }
      } catch (err) {
        console.warn("Could not load kas transactions:", err)
      }
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  // Calculated Balances
  const totalIn = transactions.filter((t) => t.type === "in").reduce((acc, t) => acc + t.amount, 0)
  const totalOut = transactions.filter((t) => t.type === "out").reduce((acc, t) => acc + t.amount, 0)
  const currentBalance = totalIn - totalOut

  // Handle Submit Transaction
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    setPermError(null)

    const amountNum = parseFloat(txAmount.replace(/\D/g, ""))
    if (!amountNum || amountNum <= 0 || !txDesc.trim()) return

    // Role check: Only Treasurer can record OUT transactions
    if (txType === "out" && !isTreasurer) {
      setPermError("Perhatian: Hanya anggota dengan peran 'Bendahara' yang dapat mencatat pengeluaran resmi kas.")
      return
    }

    const newTx: KasTransaction = {
      id: String(Date.now()),
      type: txType,
      amount: amountNum,
      category: txCategory,
      description: txDesc.trim(),
      receipt_url: txReceipt.trim() || undefined,
      created_by_name: user?.name || "Anggota Tim",
      created_at: new Date().toISOString(),
    }

    setTransactions((prev) => [newTx, ...prev])
    setTxAmount("")
    setTxDesc("")
    setTxReceipt("")
    setShowTxForm(false)

    if (isSupabaseConfigured && supabase && user && !isGuest && user.id !== "guest-user") {
      try {
        await supabase.from("kas_transactions").insert({
          type: newTx.type,
          amount: newTx.amount,
          category: newTx.category,
          description: newTx.description,
          receipt_url: newTx.receipt_url,
          created_by_id: user.id,
          created_by_name: user.name || "Anggota Tim",
        })
      } catch (err) {
        console.warn("Could not save transaction to Supabase:", err)
      }
    }
  }

  // Toggle Due Paid (Only Treasurer)
  const handleToggleDue = async (userId: string) => {
    if (isGuest) {
      setPermError("Akses Ditolak: Tamu hanya memiliki izin melihat data (Read-Only).")
      setTimeout(() => setPermError(null), 3000)
      return
    }
    if (!isTreasurer) {
      setPermError("Konfirmasi pembayaran iuran hanya dapat dilakukan oleh Bendahara.")
      setTimeout(() => setPermError(null), 3000)
      return
    }

    setDuesMembers((prev) =>
      prev.map((m) =>
        m.userId === userId
          ? { ...m, isPaid: !m.isPaid, paidAt: !m.isPaid ? new Date().toISOString().split("T")[0] : undefined }
          : m
      )
    )
  }

  // Delete Transaction (Only Treasurer)
  const handleDeleteTransaction = async (id: string) => {
    if (!isTreasurer) return
    setTransactions((prev) => prev.filter((t) => t.id !== id))
    if (isSupabaseConfigured && supabase && user && !isGuest && user.id !== "guest-user") {
      try {
        await supabase.from("kas_transactions").delete().eq("id", id)
      } catch (err) {
        console.warn("Could not delete transaction:", err)
      }
    }
  }

  return (
    <div className="flex flex-col gap-3 min-h-full font-sans">
      {/* Top Stat Bar: Balance Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
        {/* Main Balance */}
        <div className="bg-gradient-to-br from-[#1E4E8C] to-[#2E5AA8] text-white p-3 rounded-[3px] shadow-sm border border-[#102A45] flex items-center justify-between">
          <div>
            <div className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">
              SALDO KAS BERSAMA
            </div>
            <div className="text-lg font-black mt-0.5 tracking-tight">
              Rp {currentBalance.toLocaleString("id-ID")}
            </div>
          </div>
          <div className="size-8 rounded-full bg-white/10 flex items-center justify-center">
            <Wallet className="size-4 text-white" />
          </div>
        </div>

        {/* Total In */}
        <div className="bg-white border border-[#CBD5E1] p-3 rounded-[3px] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider flex items-center gap-1">
              <ArrowDownLeft className="size-3" />
              <span>TOTAL MASUK</span>
            </div>
            <div className="text-sm font-extrabold text-[#14253D] mt-0.5">
              Rp {totalIn.toLocaleString("id-ID")}
            </div>
          </div>
          <span className="text-xs text-emerald-600 font-bold">IN</span>
        </div>

        {/* Total Out */}
        <div className="bg-white border border-[#CBD5E1] p-3 rounded-[3px] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] text-red-600 font-bold uppercase tracking-wider flex items-center gap-1">
              <ArrowUpRight className="size-3" />
              <span>TOTAL KELUAR</span>
            </div>
            <div className="text-sm font-extrabold text-[#14253D] mt-0.5">
              Rp {totalOut.toLocaleString("id-ID")}
            </div>
          </div>
          <span className="text-xs text-red-500 font-bold">OUT</span>
        </div>
      </div>

      {/* Role & Tab Bar */}
      <div className="bg-[#D8E0E8] border border-[#96A6B6] p-1.5 rounded-[2px] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab("ledger")}
            className={`px-3 py-1 rounded-[2px] font-bold border transition-all ${
              activeTab === "ledger"
                ? "bg-[#E5E9EE] border-[#7D8E9E] text-[#14253D] shadow-sm"
                : "border-transparent text-[#526374] hover:bg-[#CAD4DE]"
            }`}
          >
            Buku Kas Transaksi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dues")}
            className={`px-3 py-1 rounded-[2px] font-bold border transition-all ${
              activeTab === "dues"
                ? "bg-[#E5E9EE] border-[#7D8E9E] text-[#14253D] shadow-sm"
                : "border-transparent text-[#526374] hover:bg-[#CAD4DE]"
            }`}
          >
            Checklist Iuran Bulanan
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-[11px] font-mono flex items-center gap-1 text-gray-700">
            {isGuest ? (
              <span className="text-amber-800 font-bold flex items-center gap-1 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                <Eye className="size-3 text-amber-700" /> Mode Tamu (Read-Only)
              </span>
            ) : isTreasurer ? (
              <span className="text-amber-800 font-bold flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-amber-600" /> Anda: Bendahara
              </span>
            ) : (
              <span className="text-gray-500">Peran: Anggota</span>
            )}
          </div>

          {!isGuest && (
            <button
              type="button"
              onClick={() => {
                setPermError(null)
                setShowTxForm((prev) => !prev)
              }}
              className="px-2.5 py-1 bg-[#2E5AA8] hover:bg-[#1E4E8C] text-white font-mono text-xs font-bold rounded-[2px] flex items-center gap-1 border border-[#14253D] cursor-pointer"
            >
              <Plus className="size-3" />
              <span>{showTxForm ? "Tutup Form" : "Catat Transaksi"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Permission Error Alert */}
      {permError && (
        <Alert variant="warning">
          <AlertDescription>{permError}</AlertDescription>
        </Alert>
      )}

      {/* Transaction Form Drawer */}
      {showTxForm && (
        <form
          onSubmit={handleAddTransaction}
          className="bg-[#EEF2F6] border-2 border-dashed border-[#7D8E9E] p-3 rounded-[3px] text-xs font-mono space-y-2.5"
        >
          <div className="font-bold text-[#14253D] flex items-center justify-between">
            <span>FORM PENCATATAN TRANSAKSI KAS</span>
            {txType === "out" && !isTreasurer && (
              <span className="text-red-600 text-[10px] flex items-center gap-1">
                <Lock className="size-3" /> Memerlukan peran Bendahara
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className="block text-[10px] text-gray-600 mb-0.5">Jenis Transaksi:</label>
              <select
                value={txType}
                onChange={(e) => setTxType(e.target.value as any)}
                className="w-full bg-white border border-[#7D8E9E] p-1.5 rounded-[2px] text-xs font-sans font-bold"
              >
                <option value="in">(+) Uang Masuk</option>
                <option value="out">(-) Uang Keluar</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-gray-600 mb-0.5">Nominal (Rp):</label>
              <input
                type="number"
                required
                placeholder="cth: 50000"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                className="w-full bg-white border border-[#7D8E9E] p-1.5 rounded-[2px] text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] text-gray-600 mb-0.5">Kategori:</label>
              <select
                value={txCategory}
                onChange={(e) => setTxCategory(e.target.value)}
                className="w-full bg-white border border-[#7D8E9E] p-1.5 rounded-[2px] text-xs font-sans"
              >
                {txType === "in" ? (
                  <>
                    <option value="iuran">Iuran Rutin Tim</option>
                    <option value="split_bill_sisa">Sisa Split Bill</option>
                    <option value="donasi">Donasi / Sumbangan</option>
                    <option value="lainnya">Lain-lain</option>
                  </>
                ) : (
                  <>
                    <option value="konsumsi">Konsumsi / Cemilan Tim</option>
                    <option value="keperluan_it">Keperluan IT & Kantor</option>
                    <option value="operasional">Operasional Tim</option>
                    <option value="lainnya">Lain-lain</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-gray-600 mb-0.5">Keterangan Singkat:</label>
              <input
                type="text"
                required
                placeholder="cth: Beli gorengan sore"
                value={txDesc}
                onChange={(e) => setTxDesc(e.target.value)}
                className="w-full bg-white border border-[#7D8E9E] p-1.5 rounded-[2px] text-xs font-sans"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowTxForm(false)}
              className="retro-button-3d px-3 py-1 rounded-[2px]"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-[#2E5AA8] hover:bg-[#1E4E8C] text-white font-bold rounded-[2px] border border-[#14253D]"
            >
              Simpan Transaksi
            </button>
          </div>
        </form>
      )}

      {/* Main Tab View */}
      {activeTab === "ledger" ? (
        <div className="bg-white border border-[#95A5B5] rounded-[3px] p-3 space-y-2">
          <div className="font-mono text-xs font-bold text-[#14253D] flex items-center justify-between pb-1.5 border-b border-[#CBD5E1]">
            <span>RIWAYAT TRANSAKSI KAS</span>
            <span className="text-[11px] text-gray-500 font-normal">
              {transactions.length} transaksi tercatat
            </span>
          </div>

          <div className="divide-y divide-[#E2E8F0] max-h-72 overflow-y-auto no-scrollbar">
            {transactions.map((t) => (
              <div
                key={t.id}
                className="py-2 px-1 flex items-center justify-between gap-2 hover:bg-[#F8FAFC]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`size-7 rounded-[2px] flex items-center justify-center font-bold text-xs shrink-0 ${
                      t.type === "in"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-red-100 text-red-800 border border-red-300"
                    }`}
                  >
                    {t.type === "in" ? "+" : "-"}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-[#14253D] truncate">
                      {t.description}
                    </div>
                    <div className="text-[10px] text-gray-500 flex items-center gap-1.5">
                      <span className="capitalize">{t.category.replace("_", " ")}</span>
                      <span>•</span>
                      <span>Oleh {t.created_by_name}</span>
                      <span>•</span>
                      <span>{new Date(t.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="font-mono text-xs font-extrabold text-right">
                    <span className={t.type === "in" ? "text-emerald-700" : "text-red-600"}>
                      {t.type === "in" ? "+" : "-"} Rp {t.amount.toLocaleString("id-ID")}
                    </span>
                  </div>
                  {isTreasurer && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTransaction(t.id)}
                      title="Hapus transaksi kas"
                      className="text-gray-400 hover:text-red-600 p-1 transition-colors rounded"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Monthly Dues Checklist Tab */
        <div className="bg-white border border-[#95A5B5] rounded-[3px] p-3 space-y-2">
          <div className="font-mono text-xs font-bold text-[#14253D] flex items-center justify-between pb-1.5 border-b border-[#CBD5E1]">
            <div className="flex items-center gap-1.5">
              <Users className="size-3.5 text-[#2E5AA8]" />
              <span>IURAN RUTIN BULAN INI (Rp 20.000 / orang)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openWindow("team")}
                title="Buka aplikasi team.exe untuk mengatur daftar peserta & role"
                className="px-2 py-0.5 text-[10px] bg-[#C0C0C0] text-black border border-t-white border-l-white border-b-[#404040] border-r-[#404040] hover:bg-[#D4D4D4] flex items-center gap-1 font-sans"
              >
                👥 Kelola di team.exe
              </button>
              <span className="text-[11px] text-gray-600">
                {duesMembers.filter((m) => m.isPaid).length} / {duesMembers.length} Lunas
              </span>
            </div>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {duesMembers.map((m, idx) => (
              <div
                key={m.userId}
                className="py-2 px-1 flex items-center justify-between gap-2 hover:bg-[#F8FAFC]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-xs font-bold text-gray-400 w-4 text-center">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-bold text-xs text-[#14253D]">{m.name}</div>
                    <div className="text-[10px] text-gray-500 font-mono">
                      Wajib: Rp {m.amount.toLocaleString("id-ID")}
                      {m.isPaid && m.paidAt && <span className="text-emerald-700 ml-1.5">• Lunas ({m.paidAt})</span>}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleDue(m.userId)}
                  title={isTreasurer ? "Klik untuk ubah status lunas" : "Perhatian: Hanya Bendahara yang dapat mengubah status iuran"}
                  className={`h-7 px-3 text-xs font-mono font-bold rounded-[2px] border transition-colors flex items-center gap-1.5 ${
                    m.isPaid
                      ? "bg-emerald-100 text-emerald-800 border-emerald-400 hover:bg-emerald-200"
                      : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200"
                  }`}
                >
                  {m.isPaid ? <CheckCircle2 className="size-3.5 text-emerald-700" /> : <Clock className="size-3.5 text-gray-400" />}
                  <span>{m.isPaid ? "Lunas" : "Belum Lunas"}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
