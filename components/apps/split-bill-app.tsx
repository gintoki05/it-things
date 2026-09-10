"use client"

import * as React from "react"
import { useAuth } from "@/lib/auth"
import { useTeamStore } from "@/lib/team-store"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { 
  Receipt, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  CheckCircle2, 
  Clock, 
  Users, 
  QrCode, 
  CreditCard, 
  Share2, 
  DollarSign,
  AlertCircle,
  Eye
} from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

export interface ItemizedOrder {
  id: string
  name: string
  price: number
  assignedTo: string // Participant user id or name
}

export interface Participant {
  id: string
  name: string
  amountDue: number
  isPaid: boolean
  isConfirmed: boolean
  items?: string[]
}

export interface SplitBillData {
  id: string
  title: string
  mode: "equal" | "itemized"
  created_by_name: string
  created_by_id: string
  bank_name: string
  account_number: string
  account_holder: string
  subtotal: number
  tax: number
  delivery_fee: number
  discount: number
  total_amount: number
  is_settled: boolean
  participants: Participant[]
  itemizedOrders?: ItemizedOrder[]
}

const INITIAL_BILL: SplitBillData = {
  id: "demo-bill-1",
  title: "Makan Siang Bareng Tim TI",
  mode: "equal",
  created_by_name: "Ajie",
  created_by_id: "demo-ajie",
  bank_name: "BCA",
  account_number: "8830123456",
  account_holder: "Ajie Saputra",
  subtotal: 120000,
  tax: 12000,
  delivery_fee: 10000,
  discount: 15000,
  total_amount: 127000,
  is_settled: false,
  participants: [
    { id: "p1", name: "Ajie", amountDue: 31750, isPaid: true, isConfirmed: true },
    { id: "p2", name: "Budi", amountDue: 31750, isPaid: true, isConfirmed: false },
    { id: "p3", name: "Citra", amountDue: 31750, isPaid: false, isConfirmed: false },
    { id: "p4", name: "Dimas", amountDue: 31750, isPaid: false, isConfirmed: false },
  ],
}

export function SplitBillApp() {
  const { user, isGuest } = useAuth()
  const { members: teamMembers } = useTeamStore()
  const [bill, setBill] = React.useState<SplitBillData>(INITIAL_BILL)
  const [copiedWA, setCopiedWA] = React.useState(false)
  const [copiedBank, setCopiedBank] = React.useState(false)

  // Form states
  const [newParticipantName, setNewParticipantName] = React.useState("")
  const [orderItemName, setOrderItemName] = React.useState("")
  const [orderItemPrice, setOrderItemPrice] = React.useState("")
  const [orderItemUser, setOrderItemUser] = React.useState("")

  // Load latest bill from Supabase if available
  const loadBill = React.useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: dbBills } = await supabase
          .from("split_bills")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)

        if (dbBills && dbBills.length > 0) {
          const currentB = dbBills[0]
          const { data: dbParts } = await supabase
            .from("split_bill_participants")
            .select("*")
            .eq("bill_id", currentB.id)

          const parts: Participant[] = (dbParts || []).map((p) => ({
            id: p.id,
            name: p.user_name,
            amountDue: Number(p.amount_due),
            isPaid: p.is_paid,
            isConfirmed: p.is_confirmed,
          }))

          setBill({
            id: currentB.id,
            title: currentB.title,
            mode: currentB.mode as any,
            created_by_name: currentB.created_by_name,
            created_by_id: currentB.created_by_id,
            bank_name: currentB.bank_name || "BCA",
            account_number: currentB.account_number || "",
            account_holder: currentB.account_holder || "",
            subtotal: Number(currentB.subtotal),
            tax: Number(currentB.tax),
            delivery_fee: Number(currentB.delivery_fee),
            discount: Number(currentB.discount),
            total_amount: Number(currentB.total_amount),
            is_settled: currentB.is_settled,
            participants: parts,
          })
        }
      } catch (err) {
        console.warn("Could not load split bill from Supabase:", err)
      }
    }
  }, [])

  React.useEffect(() => {
    loadBill()
  }, [loadBill])

  // Recalculate totals
  const recalculate = React.useCallback(
    (
      currentMode: "equal" | "itemized",
      sub: number,
      taxVal: number,
      deliv: number,
      disc: number,
      parts: Participant[],
      items: ItemizedOrder[] = []
    ) => {
      const grandTotal = Math.max(0, sub + taxVal + deliv - disc)
      let updatedParts: Participant[] = []

      if (currentMode === "equal") {
        const count = Math.max(1, parts.length)
        const perPerson = Math.ceil(grandTotal / count)
        updatedParts = parts.map((p) => ({
          ...p,
          amountDue: perPerson,
        }))
      } else {
        // Itemized mode: distribute extra costs (tax + delivery - disc) proportionally
        const netExtra = taxVal + deliv - disc
        const itemSubtotal = items.reduce((acc, it) => acc + it.price, 0)

        updatedParts = parts.map((p) => {
          const userItems = items.filter((it) => it.assignedTo === p.name || it.assignedTo === p.id)
          const userSubtotal = userItems.reduce((acc, it) => acc + it.price, 0)
          const propRatio = itemSubtotal > 0 ? userSubtotal / itemSubtotal : 1 / Math.max(1, parts.length)
          const shareOfExtra = netExtra * propRatio
          const userFinal = Math.max(0, Math.ceil(userSubtotal + shareOfExtra))

          return {
            ...p,
            amountDue: userFinal,
            items: userItems.map((ui) => ui.name),
          }
        })
      }

      return { grandTotal, updatedParts }
    },
    []
  )

  // Handlers for adjustments
  const handleUpdateCost = (
    field: "subtotal" | "tax" | "delivery_fee" | "discount",
    value: number
  ) => {
    setBill((prev) => {
      const nextSub = field === "subtotal" ? value : prev.subtotal
      const nextTax = field === "tax" ? value : prev.tax
      const nextDeliv = field === "delivery_fee" ? value : prev.delivery_fee
      const nextDisc = field === "discount" ? value : prev.discount

      const { grandTotal, updatedParts } = recalculate(
        prev.mode,
        nextSub,
        nextTax,
        nextDeliv,
        nextDisc,
        prev.participants,
        prev.itemizedOrders
      )

      return {
        ...prev,
        [field]: value,
        total_amount: grandTotal,
        participants: updatedParts,
      }
    })
  }

  // Add Participant
  const addParticipantByName = (rawName: string) => {
    if (!rawName.trim()) return
    const name = rawName.trim()

    setBill((prev) => {
      const exists = prev.participants.some((p) => p.name.toLowerCase() === name.toLowerCase())
      if (exists) return prev

      const newP: Participant = {
        id: String(Date.now()),
        name,
        amountDue: 0,
        isPaid: false,
        isConfirmed: false,
      }
      const nextParts = [...prev.participants, newP]
      const { grandTotal, updatedParts } = recalculate(
        prev.mode,
        prev.subtotal,
        prev.tax,
        prev.delivery_fee,
        prev.discount,
        nextParts,
        prev.itemizedOrders
      )

      return {
        ...prev,
        participants: updatedParts,
        total_amount: grandTotal,
      }
    })
  }

  const handleAddParticipant = () => {
    addParticipantByName(newParticipantName)
    setNewParticipantName("")
  }

  // Remove Participant
  const handleRemoveParticipant = (id: string) => {
    setBill((prev) => {
      const nextParts = prev.participants.filter((p) => p.id !== id)
      const { grandTotal, updatedParts } = recalculate(
        prev.mode,
        prev.subtotal,
        prev.tax,
        prev.delivery_fee,
        prev.discount,
        nextParts,
        prev.itemizedOrders
      )
      return {
        ...prev,
        participants: updatedParts,
        total_amount: grandTotal,
      }
    })
  }

  // Toggle Paid status
  const handleTogglePaid = (pId: string) => {
    setBill((prev) => ({
      ...prev,
      participants: prev.participants.map((p) =>
        p.id === pId ? { ...p, isPaid: !p.isPaid } : p
      ),
    }))
  }

  // Toggle Confirm status (By Creator/Admin)
  const handleToggleConfirm = (pId: string) => {
    setBill((prev) => ({
      ...prev,
      participants: prev.participants.map((p) =>
        p.id === pId ? { ...p, isConfirmed: !p.isConfirmed, isPaid: true } : p
      ),
    }))
  }

  // Copy WhatsApp Formatter
  const handleCopyWhatsApp = () => {
    const lines = [
      `🧾 *SPLIT BILL: ${bill.title.toUpperCase()}*`,
      `📅 *Tanggal:* ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`,
      `---------------------------------`,
      `💰 *Total Tagihan:* Rp ${bill.total_amount.toLocaleString("id-ID")}`,
      ...(bill.delivery_fee > 0 ? [`🛵 Ongkir: Rp ${bill.delivery_fee.toLocaleString("id-ID")}`] : []),
      ...(bill.tax > 0 ? [`🏛️ Pajak: Rp ${bill.tax.toLocaleString("id-ID")}`] : []),
      ...(bill.discount > 0 ? [`🎉 Diskon: -Rp ${bill.discount.toLocaleString("id-ID")}`] : []),
      `---------------------------------`,
      `👥 *RINCIAN PER ANGGOTA:*`,
      ...bill.participants.map((p, idx) => {
        const status = p.isConfirmed ? "✅ [Lunas]" : p.isPaid ? "⏳ [Menunggu Konfirmasi]" : "❌ [Belum Bayar]"
        return `${idx + 1}. *${p.name}*: Rp ${p.amountDue.toLocaleString("id-ID")} ${status}`
      }),
      `---------------------------------`,
      `💳 *PEMBAYARAN TRANSFER:*`,
      `Bank / E-Wallet: *${bill.bank_name}*`,
      `No. Rekening: *${bill.account_number}*`,
      `Atas Nama: *${bill.account_holder}*`,
      `---------------------------------`,
      `_Tolong konfirmasi bukti transfer jika sudah ya! Terima kasih 🙏_`,
    ]

    const text = lines.join("\n")
    navigator.clipboard.writeText(text)
    setCopiedWA(true)
    setTimeout(() => setCopiedWA(false), 2500)
  }

  // Copy Bank Account
  const handleCopyBank = () => {
    navigator.clipboard.writeText(bill.account_number)
    setCopiedBank(true)
    setTimeout(() => setCopiedBank(false), 2000)
  }

  const allPaid = bill.participants.length > 0 && bill.participants.every((p) => p.isConfirmed)

  return (
    <div className="flex flex-col gap-3 min-h-full font-sans">
      {/* Top Controls: Title & Mode */}
      <div className="bg-[#D8E0E8] border border-[#96A6B6] p-2 rounded-[2px] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Receipt className="size-4 text-[#2E5AA8]" />
          <input
            type="text"
            value={bill.title}
            onChange={(e) => setBill((prev) => ({ ...prev, title: e.target.value }))}
            className="bg-white border border-[#7D8E9E] px-2 py-0.5 rounded-[2px] text-xs font-bold font-mono text-[#14253D] w-56 sm:w-72"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyWhatsApp}
            className="px-3 py-1 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-mono text-xs font-bold rounded-[2px] flex items-center gap-1.5 border border-[#128C7E] shadow-sm active:translate-y-px"
          >
            {copiedWA ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
            <span>{copiedWA ? "Disalin ke Clipboard!" : "Copy ke WhatsApp"}</span>
          </button>
        </div>
      </div>

      {/* Main Split Bill Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3">
        {/* Left Column: Cost Breakdown & Participants */}
        <div className="space-y-3">
          {/* Bill Calculation Matrix */}
          <div className="bg-white border border-[#95A5B5] rounded-[3px] p-3 space-y-2.5">
            <div className="font-mono text-xs font-bold text-[#14253D] flex items-center justify-between pb-1 border-b border-[#CBD5E1]">
              <span>RINCIAN BIAYA TAGIHAN</span>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-gray-500 font-normal">Mode:</span>
                <button
                  type="button"
                  onClick={() => {
                    const newMode = bill.mode === "equal" ? "itemized" : "equal"
                    const { grandTotal, updatedParts } = recalculate(
                      newMode,
                      bill.subtotal,
                      bill.tax,
                      bill.delivery_fee,
                      bill.discount,
                      bill.participants,
                      bill.itemizedOrders
                    )
                    setBill((prev) => ({
                      ...prev,
                      mode: newMode,
                      total_amount: grandTotal,
                      participants: updatedParts,
                    }))
                  }}
                  title="Klik untuk beralih mode Bagi Rata / Per Item"
                  className="px-2 py-0.5 text-[10px] font-bold rounded border bg-[#EEF2F6] hover:bg-[#E2E8F0] text-[#1E4E8C] border-[#7D8E9E] transition-colors"
                >
                  {bill.mode === "equal" ? "⚖️ Bagi Rata (Equal)" : "📋 Per Item (Itemized)"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Subtotal Makanan:</label>
                <div className="relative">
                  <span className="absolute left-1.5 top-1 text-[10px] text-gray-400">Rp</span>
                  <input
                    type="number"
                    value={bill.subtotal || ""}
                    onChange={(e) => handleUpdateCost("subtotal", Number(e.target.value))}
                    className="w-full pl-6 pr-1 py-1 bg-[#FAFBFD] border border-[#CBD5E1] rounded text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Pajak / PB1:</label>
                <div className="relative">
                  <span className="absolute left-1.5 top-1 text-[10px] text-gray-400">Rp</span>
                  <input
                    type="number"
                    value={bill.tax || ""}
                    onChange={(e) => handleUpdateCost("tax", Number(e.target.value))}
                    className="w-full pl-6 pr-1 py-1 bg-[#FAFBFD] border border-[#CBD5E1] rounded text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Ongkir / Antar:</label>
                <div className="relative">
                  <span className="absolute left-1.5 top-1 text-[10px] text-gray-400">Rp</span>
                  <input
                    type="number"
                    value={bill.delivery_fee || ""}
                    onChange={(e) => handleUpdateCost("delivery_fee", Number(e.target.value))}
                    className="w-full pl-6 pr-1 py-1 bg-[#FAFBFD] border border-[#CBD5E1] rounded text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Diskon / Promo:</label>
                <div className="relative">
                  <span className="absolute left-1.5 top-1 text-[10px] text-red-500">-Rp</span>
                  <input
                    type="number"
                    value={bill.discount || ""}
                    onChange={(e) => handleUpdateCost("discount", Number(e.target.value))}
                    className="w-full pl-7 pr-1 py-1 bg-[#FAFBFD] border border-[#CBD5E1] rounded text-xs text-red-600"
                  />
                </div>
              </div>
            </div>

            {/* Total Highlight */}
            <div className="pt-2 border-t border-[#CBD5E1] flex items-center justify-between">
              <div className="font-mono text-xs text-gray-600">
                Total Bersih Tagihan:
              </div>
              <div className="font-mono text-base font-extrabold text-[#14253D]">
                Rp {bill.total_amount.toLocaleString("id-ID")}
              </div>
            </div>
          </div>

          {/* Participants Checklist Table */}
          <div className="bg-white border border-[#95A5B5] rounded-[3px] p-3 space-y-2">
            <div className="font-mono text-xs font-bold text-[#14253D] flex items-center justify-between pb-1 border-b border-[#CBD5E1]">
              <div className="flex items-center gap-1.5">
                <Users className="size-3.5 text-[#2E5AA8]" />
                <span>DAFTAR PESERTA ({bill.participants.length} Orang)</span>
              </div>
              <span className="text-[11px] text-gray-600">
                Rp {Math.ceil(bill.total_amount / Math.max(1, bill.participants.length)).toLocaleString("id-ID")} / orang
              </span>
            </div>

            {/* Add Participant Input or Guest Notice */}
            {isGuest ? (
              <div className="py-1.5 px-2.5 bg-amber-50 text-amber-900 border border-amber-300 rounded text-[11px] font-mono flex items-center gap-1.5 my-1">
                <Eye className="size-3.5 text-amber-700 shrink-0" />
                <span>Mode Tamu: Anda hanya dapat melihat dan menyalin rincian patungan (Read-Only).</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 py-1">
                  <input
                    type="text"
                    placeholder="Nama teman yang ikut makan (cth: Rian, Siska)..."
                    value={newParticipantName}
                    onChange={(e) => setNewParticipantName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddParticipant()}
                    className="flex-1 bg-[#FAFBFD] border border-[#95A5B5] p-1 rounded-[2px] text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddParticipant}
                    className="px-2.5 py-1 bg-[#2E5AA8] hover:bg-[#1E4E8C] text-white font-mono text-xs font-bold rounded-[2px] flex items-center gap-1 border border-[#14253D] cursor-pointer"
                  >
                    <Plus className="size-3" />
                    <span>Tambah</span>
                  </button>
                </div>

                {/* Quick-add chips from master team members */}
                {teamMembers && teamMembers.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 py-1 text-[10px] border-t border-dashed border-[#CBD5E1]">
                    <span className="text-gray-500 font-mono">Pilih cepat:</span>
                    {teamMembers.map((tm) => {
                      const isAlreadyIn = bill.participants.some(
                        (p) => p.name.toLowerCase() === tm.name.toLowerCase()
                      )
                      return (
                        <button
                          key={tm.id}
                          type="button"
                          disabled={isAlreadyIn}
                          onClick={() => addParticipantByName(tm.name)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all flex items-center gap-1 cursor-pointer ${
                            isAlreadyIn
                              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                              : "bg-[#EEF2F6] hover:bg-[#DCE4EC] text-[#1E4E8C] border-[#95A5B5] active:translate-y-px"
                          }`}
                          title={isAlreadyIn ? `${tm.name} sudah masuk tagihan` : `Klik untuk menambahkan ${tm.name}`}
                        >
                          <span>{tm.avatar_url || "👤"}</span>
                          <span>{tm.name.split(" ")[0]}</span>
                          {!isAlreadyIn && <span className="text-emerald-700 font-bold">+</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* Participants Rows */}
            <div className="divide-y divide-[#E2E8F0] max-h-64 overflow-y-auto no-scrollbar">
              {bill.participants.map((p, idx) => (
                <div
                  key={p.id}
                  className="py-2 px-1 flex items-center justify-between gap-2 hover:bg-[#F8FAFC]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs font-bold text-gray-400 w-4 text-center">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-[#14253D] truncate">{p.name}</div>
                      <div className="font-mono text-[11px] text-[#2E5AA8] font-bold">
                        Rp {p.amountDue.toLocaleString("id-ID")}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isGuest ? (
                      <span
                        className={`h-6 px-2 text-[10px] font-mono font-bold rounded-[2px] border flex items-center ${
                          p.isConfirmed
                            ? "bg-blue-50 text-blue-900 border-blue-300"
                            : p.isPaid
                            ? "bg-emerald-50 text-emerald-700 border-emerald-400"
                            : "bg-gray-50 text-gray-500 border-gray-300"
                        }`}
                      >
                        {p.isConfirmed ? "✓ Lunas" : p.isPaid ? "Sudah Bayar" : "Belum Bayar"}
                      </span>
                    ) : (
                      <>
                        {/* Member "Sudah Transfer" Toggle */}
                        <button
                          type="button"
                          onClick={() => handleTogglePaid(p.id)}
                          className={`h-6 px-2 text-[10px] font-mono font-bold rounded-[2px] border transition-colors cursor-pointer ${
                            p.isPaid
                              ? "bg-emerald-50 text-emerald-700 border-emerald-400"
                              : "bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100"
                          }`}
                        >
                          {p.isPaid ? "Sudah Bayar" : "Belum Bayar"}
                        </button>

                        {/* Admin/Creator Confirm Checkbox */}
                        <button
                          type="button"
                          onClick={() => handleToggleConfirm(p.id)}
                          title="Konfirmasi pembayaran lunas"
                          className={`size-6 rounded-[2px] border flex items-center justify-center transition-colors cursor-pointer ${
                            p.isConfirmed
                              ? "bg-[#1E4E8C] text-white border-[#102A45]"
                              : "bg-white border-gray-300 hover:border-gray-500 text-transparent"
                          }`}
                        >
                          ✓
                        </button>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(p.id)}
                          title="Hapus dari daftar patungan"
                          className="p-1 text-gray-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Bank Account & Payment Destination */}
        <div className="space-y-3">
          {/* Bank / QRIS Card */}
          <div className="bg-white border border-[#95A5B5] rounded-[3px] p-3 space-y-2.5">
            <div className="font-mono text-xs font-bold text-[#14253D] flex items-center gap-1.5 pb-1 border-b border-[#CBD5E1]">
              <CreditCard className="size-3.5 text-[#2E5AA8]" />
              <span>TUJUAN TRANSFER</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Nama Bank / E-Wallet:</label>
                <input
                  type="text"
                  value={bill.bank_name}
                  onChange={(e) => setBill((prev) => ({ ...prev, bank_name: e.target.value }))}
                  className="w-full bg-[#FAFBFD] border border-[#CBD5E1] p-1 rounded text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Nomor Rekening / No HP:</label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={bill.account_number}
                    onChange={(e) => setBill((prev) => ({ ...prev, account_number: e.target.value }))}
                    className="flex-1 bg-[#FAFBFD] border border-[#CBD5E1] p-1 rounded text-xs font-bold tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={handleCopyBank}
                    title="Copy nomor rekening"
                    className="p-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded"
                  >
                    {copiedBank ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3 text-gray-600" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5">Atas Nama (A/N):</label>
                <input
                  type="text"
                  value={bill.account_holder}
                  onChange={(e) => setBill((prev) => ({ ...prev, account_holder: e.target.value }))}
                  className="w-full bg-[#FAFBFD] border border-[#CBD5E1] p-1 rounded text-xs"
                />
              </div>
            </div>
          </div>

          {/* Settle Status Card */}
          <div className="bg-[#EAEFF5] border border-[#CBD5E1] rounded-[3px] p-3 text-xs font-mono space-y-2">
            <div className="font-bold text-[#14253D] flex items-center justify-between">
              <span>STATUS PELUNASAN</span>
              {allPaid ? (
                <span className="text-emerald-700 font-black">LUNAS SEMUA 🎉</span>
              ) : (
                <span className="text-amber-700">BELUM LUNAS</span>
              )}
            </div>
            <div className="w-full bg-gray-200 h-2 rounded overflow-hidden">
              <div
                style={{
                  width: `${
                    bill.participants.length > 0
                      ? (bill.participants.filter((p) => p.isConfirmed).length / bill.participants.length) * 100
                      : 0
                  }%`,
                }}
                className="bg-[#2E5AA8] h-full transition-all duration-500"
              />
            </div>
            <div className="text-[10px] text-gray-600 flex justify-between">
              <span>
                {bill.participants.filter((p) => p.isConfirmed).length} dari {bill.participants.length} lunas
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
