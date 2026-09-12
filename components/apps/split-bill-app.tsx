"use client"

import * as React from "react"
import { useAuth } from "@/lib/auth"
import { useTeamStore } from "@/lib/team-store"
import { 
  useSplitBillStore, 
  SplitBill, 
  Participant, 
  ItemizedOrder,
  getUserBankProfile,
  saveUserBankProfile
} from "@/lib/split-bill-store"
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
  AlertCircle,
  Eye,
  RotateCw,
  ArrowLeft,
  Calendar,
  X,
  Sparkles,
  ExternalLink,
  ChevronRight
} from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { RetroActionButton } from "@/components/ui/retro-action-button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { UserAvatar } from "@/components/retro/user-avatar"
import { playRetroNotificationSound } from "@/lib/sound-effects"
import { getShareUrl, maskRupiahInput, unmaskRupiah } from "@/lib/utils"

// ─── Format Helpers ──────────────────────────────────────────
function formatRupiah(num: number) {
  return "Rp " + Math.max(0, Math.round(num || 0)).toLocaleString("id-ID")
}

function formatDateDisplay(dateStr: string) {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return ""
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "baru saja"
  if (mins < 60) return `${mins}m lalu`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}j lalu`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}h lalu`
  return formatDateDisplay(dateStr)
}

// ─── Modal Buat Sesi Baru ─────────────────────────────────────
function CreateBillModal({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean
  onClose: () => void
  onCreate: (payload: {
    title: string
    mode: "equal" | "itemized"
    bank_name: string
    account_number: string
    account_holder: string
    qris_url?: string | null
    subtotal: number
    tax: number
    delivery_fee: number
    discount: number
    selectedMembers: Array<{ name: string; userId?: string; avatarUrl?: string | null }>
  }) => Promise<void>
}) {
  const { user } = useAuth()
  const { members: teamMembers } = useTeamStore()

  const [title, setTitle] = React.useState("")
  const [mode, setMode] = React.useState<"equal" | "itemized">("equal")
  const [bankName, setBankName] = React.useState("BCA")
  const [accountNumber, setAccountNumber] = React.useState("")
  const [accountHolder, setAccountHolder] = React.useState(user?.name || "")
  const [qrisUrl, setQrisUrl] = React.useState("")
  const [subtotal, setSubtotal] = React.useState<string>("")
  const [tax, setTax] = React.useState<string>("")
  const [deliveryFee, setDeliveryFee] = React.useState<string>("")
  const [discount, setDiscount] = React.useState<string>("")
  const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>(
    user?.id ? [user.id] : []
  )
  const [customNameInput, setCustomNameInput] = React.useState("")
  const [customParticipants, setCustomParticipants] = React.useState<string[]>([])
  const [saveAsDefaultBank, setSaveAsDefaultBank] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (user?.id) {
      getUserBankProfile(user.id).then((profile) => {
        if (profile) {
          if (profile.bank_name) setBankName(profile.bank_name)
          if (profile.account_number) setAccountNumber(profile.account_number)
          if (profile.account_holder) setAccountHolder(profile.account_holder)
          if (profile.qris_url) setQrisUrl(profile.qris_url)
        } else if (user?.name) {
          setAccountHolder(user.name)
        }
      })
    } else if (user?.name && !accountHolder) {
      setAccountHolder(user.name)
    }
  }, [user?.id, user?.name])

  if (!isOpen) return null

  const toggleTeamMember = (tmId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(tmId) ? prev.filter((id) => id !== tmId) : [...prev, tmId]
    )
  }

  const handleAddCustomName = () => {
    const trimmed = customNameInput.trim()
    if (!trimmed) return
    if (!customParticipants.includes(trimmed)) {
      setCustomParticipants((prev) => [...prev, trimmed])
    }
    setCustomNameInput("")
  }

  const handleRemoveCustomName = (name: string) => {
    setCustomParticipants((prev) => prev.filter((n) => n !== name))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsSubmitting(true)
    try {
      const chosenMembers = teamMembers
        .filter((tm) => selectedUserIds.includes(tm.id) || (user?.id && tm.user_id === user.id && selectedUserIds.includes(tm.id)))
        .map((tm) => ({
          name: tm.name,
          userId: tm.user_id,
          avatarUrl: tm.avatar_url,
        }))

      // Include custom participants
      for (const cName of customParticipants) {
        if (!chosenMembers.some((m) => m.name.toLowerCase() === cName.toLowerCase())) {
          chosenMembers.push({
            name: cName,
            userId: undefined,
            avatarUrl: undefined,
          })
        }
      }

      await onCreate({
        title: title.trim(),
        mode,
        bank_name: bankName.trim() || "BCA",
        account_number: accountNumber.trim(),
        account_holder: accountHolder.trim() || user?.name || "Kasir",
        qris_url: qrisUrl.trim() || null,
        subtotal: unmaskRupiah(subtotal),
        tax: unmaskRupiah(tax),
        delivery_fee: unmaskRupiah(deliveryFee),
        discount: unmaskRupiah(discount),
        selectedMembers: chosenMembers,
      })

      if (saveAsDefaultBank && user?.id) {
        saveUserBankProfile(user.id, {
          bank_name: bankName.trim() || "BCA",
          account_number: accountNumber.trim(),
          account_holder: accountHolder.trim() || user?.name || "Kasir",
          qris_url: qrisUrl.trim() || null,
        }).catch(() => {})
      }

      playRetroNotificationSound()
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-3 select-none">
      <div className="retro-window-frame max-w-lg w-full rounded-[4px] overflow-hidden shadow-[6px_6px_0px_rgba(0,0,0,0.35)] bg-[#D8E0E8] flex flex-col max-h-[90vh]">
        {/* Titlebar */}
        <div className="bg-[#1E4E8C] px-2.5 py-1.5 flex items-center justify-between text-white border-b border-[#14253D]">
          <div className="flex items-center gap-2">
            <Receipt className="size-4" />
            <span className="font-mono text-xs font-bold tracking-wider">BUAT_SESI_BARU.EXE</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="retro-button-3d size-5 flex items-center justify-center text-xs font-bold font-mono text-[#14253D] hover:bg-red-500 hover:text-white"
          >
            ×
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-3 space-y-3 overflow-y-auto font-sans text-xs">
          {/* Judul & Mode */}
          <div className="bg-white border border-[#95A5B5] p-2.5 rounded-[2px] space-y-2">
            <div>
              <label className="block text-[11px] font-mono font-bold text-gray-700 mb-0.5">
                Judul Sesi: *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Cth: Makan Siang HokBen, Kopi Sore..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#FAFBFD] border border-[#7D8E9E] px-2 py-1 rounded text-xs font-mono font-bold text-[#14253D]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold text-gray-700 mb-1">
                Mode Perhitungan:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("equal")}
                  className={`p-2 border rounded-[2px] text-left transition-colors cursor-pointer ${
                    mode === "equal"
                      ? "bg-[#1E4E8C] text-white border-[#102A45]"
                      : "bg-[#F0F4F8] text-[#14253D] border-[#95A5B5] hover:bg-[#E2E8F0]"
                  }`}
                >
                  <div className="text-xs font-mono font-bold">⚖️ Bagi Rata</div>
                  <div className="text-[10px] opacity-80 mt-0.5">Dibagi rata ke semua</div>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("itemized")}
                  className={`p-2 border rounded-[2px] text-left transition-colors cursor-pointer ${
                    mode === "itemized"
                      ? "bg-[#1E4E8C] text-white border-[#102A45]"
                      : "bg-[#F0F4F8] text-[#14253D] border-[#95A5B5] hover:bg-[#E2E8F0]"
                  }`}
                >
                  <div className="text-xs font-mono font-bold">📋 Per Item</div>
                  <div className="text-[10px] opacity-80 mt-0.5">Sesuai pesanan masing-masing</div>
                </button>
              </div>
            </div>
          </div>

          {/* Rincian Awal Tagihan */}
          <div className="bg-white border border-[#95A5B5] p-2.5 rounded-[2px] space-y-2">
            <div className="font-mono text-[11px] font-bold text-[#14253D] pb-1 border-b border-[#CBD5E1]">
              ESTIMASI BIAYA
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5 font-bold">Subtotal</label>
                <div className="relative">
                  <span className="absolute left-1.5 top-1 text-[10px] text-gray-400 select-none">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={subtotal}
                    onChange={(e) => setSubtotal(maskRupiahInput(e.target.value))}
                    className="w-full pl-6 pr-1.5 py-1 bg-[#FAFBFD] border border-[#CBD5E1] rounded text-xs font-mono font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5 font-bold">Pajak</label>
                <div className="relative">
                  <span className="absolute left-1.5 top-1 text-[10px] text-gray-400 select-none">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={tax}
                    onChange={(e) => setTax(maskRupiahInput(e.target.value))}
                    className="w-full pl-6 pr-1.5 py-1 bg-[#FAFBFD] border border-[#CBD5E1] rounded text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5 font-bold">Ongkir</label>
                <div className="relative">
                  <span className="absolute left-1.5 top-1 text-[10px] text-gray-400 select-none">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(maskRupiahInput(e.target.value))}
                    className="w-full pl-6 pr-1.5 py-1 bg-[#FAFBFD] border border-[#CBD5E1] rounded text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5 font-bold">Diskon</label>
                <div className="relative">
                  <span className="absolute left-1.5 top-1 text-[10px] text-red-500 select-none">-Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={discount}
                    onChange={(e) => setDiscount(maskRupiahInput(e.target.value))}
                    className="w-full pl-7 pr-1.5 py-1 bg-[#FAFBFD] border border-[#CBD5E1] rounded text-xs font-mono text-red-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Info Pembayaran */}
          <div className="bg-white border border-[#95A5B5] p-2.5 rounded-[2px] space-y-2">
            <div className="font-mono text-[11px] font-bold text-[#14253D] pb-1 border-b border-[#CBD5E1]">
              TUJUAN TRANSFER
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono">
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5 font-bold">Bank:</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-2 py-1 bg-[#FAFBFD] border border-[#CBD5E1] rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5 font-bold">No. Rekening:</label>
                <input
                  type="text"
                  placeholder="1234567890"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-2 py-1 bg-[#FAFBFD] border border-[#CBD5E1] rounded text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5 font-bold">Atas Nama:</label>
                <input
                  type="text"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="w-full px-2 py-1 bg-[#FAFBFD] border border-[#CBD5E1] rounded text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-gray-600 mb-0.5 font-bold">URL QRIS (Opsional):</label>
              <input
                type="text"
                placeholder="https://... (Link gambar QRIS)"
                value={qrisUrl}
                onChange={(e) => setQrisUrl(e.target.value)}
                className="w-full px-2 py-1 bg-[#FAFBFD] border border-[#CBD5E1] rounded text-xs font-mono"
              />
            </div>

            {user?.id && (
              <div className="pt-1 border-t border-dashed border-[#CBD5E1]">
                <label className="flex items-center gap-1.5 text-[11px] font-mono text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={saveAsDefaultBank}
                    onChange={(e) => setSaveAsDefaultBank(e.target.checked)}
                    className="size-3.5 accent-[#1E4E8C] cursor-pointer"
                  />
                  <span>Simpan sebagai rekening default akun saya</span>
                </label>
              </div>
            )}
          </div>

          {/* Peserta yang Ikut */}
          <div className="bg-white border border-[#95A5B5] p-2.5 rounded-[2px] space-y-2">
            <div className="font-mono text-[11px] font-bold text-[#14253D] flex items-center justify-between pb-1 border-b border-[#CBD5E1]">
              <span>ANGGOTA ({selectedUserIds.length + customParticipants.length})</span>
            </div>

            {/* Team member chip selector */}
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-[#FAFBFD] border border-[#E2E8F0] rounded">
              {teamMembers.map((tm) => {
                const isSelected = selectedUserIds.includes(tm.id)
                return (
                  <button
                    key={tm.id}
                    type="button"
                    onClick={() => toggleTeamMember(tm.id)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? "bg-[#1E4E8C] text-white border-[#102A45]"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    <UserAvatar src={tm.avatar_url} name={tm.name} size="size-3.5" textClass="text-[7px]" />
                    <span>{tm.name.split(" ")[0]}</span>
                    <span>{isSelected ? "✓" : "+"}</span>
                  </button>
                )
              })}
            </div>

            {/* Custom participant input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Tambah nama peserta lain (luar tim)..."
                value={customNameInput}
                onChange={(e) => setCustomNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddCustomName()
                  }
                }}
                className="flex-1 bg-[#FAFBFD] border border-[#CBD5E1] px-2 py-0.5 rounded text-xs font-mono"
              />
              <button
                type="button"
                onClick={handleAddCustomName}
                className="retro-button-3d px-2.5 py-0.5 text-xs font-mono font-bold cursor-pointer"
              >
                + Tambah
              </button>
            </div>

            {customParticipants.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {customParticipants.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[10px] font-mono font-bold"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomName(name)}
                      className="text-red-500 hover:text-red-700 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="text-[10px] font-mono text-gray-500 pt-1">
            ⏱ Sesi tagihan otomatis dibersihkan setelah 7 hari.
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#CBD5E1]">
            <button
              type="button"
              onClick={onClose}
              className="retro-button-3d px-3 py-1 text-xs font-mono font-bold rounded-[2px] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-4 py-1 bg-[#1E4E8C] hover:bg-[#153A6B] disabled:opacity-50 text-white text-xs font-mono font-bold rounded-[2px] border border-[#102A45] flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px"
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="size-3 animate-spin" />
                  <span>Membuat...</span>
                </>
              ) : (
                <>
                  <Plus className="size-3" />
                  <span>Buat Sesi Tagihan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal Lihat QRIS ─────────────────────────────────────────
function QrisModal({
  isOpen,
  onClose,
  qrisUrl,
  bankName,
  accountHolder,
}: {
  isOpen: boolean
  onClose: () => void
  qrisUrl?: string | null
  bankName: string
  accountHolder: string
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-4 select-none">
      <div className="retro-window-frame max-w-xs w-full rounded-[4px] overflow-hidden shadow-[6px_6px_0px_rgba(0,0,0,0.35)] bg-white flex flex-col">
        <div className="bg-[#1E4E8C] px-2.5 py-1.5 flex items-center justify-between text-white border-b border-[#14253D]">
          <div className="flex items-center gap-1.5">
            <QrCode className="size-4" />
            <span className="font-mono text-xs font-bold tracking-wider">SCAN_QRIS.EXE</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="retro-button-3d size-5 flex items-center justify-center text-xs font-bold font-mono text-[#14253D] hover:bg-red-500 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="p-4 flex flex-col items-center text-center space-y-3 font-mono">
          <div className="text-xs font-bold text-[#14253D]">
            {bankName} - A/N {accountHolder}
          </div>

          {qrisUrl ? (
            <div className="border-2 border-[#1E4E8C] p-2 bg-white rounded shadow-inner">
              <img
                src={qrisUrl}
                alt="QRIS Code"
                className="size-56 object-contain"
                onError={(e) => {
                  ;(e.target as HTMLElement).style.display = "none"
                }}
              />
            </div>
          ) : (
            <div className="size-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center p-3 text-gray-500 text-xs">
              <QrCode className="size-12 text-gray-400 mb-2" />
              <span>Gambar QRIS belum dilampirkan oleh pembuat tagihan.</span>
            </div>
          )}

          <div className="text-[11px] text-gray-600">
            Scan via BCA, GoPay, OVO, ShopeePay, atau m-Banking Anda.
          </div>

          <button
            type="button"
            onClick={onClose}
            className="retro-button-3d w-full py-1 text-xs font-bold cursor-pointer"
          >
            Tutup Jendela
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Split Bill App Component ───────────────────────────
export function SplitBillApp() {
  const { user, isGuest, isAdmin } = useAuth()
  const { members: teamMembers } = useTeamStore()
  const {
    bills,
    isLoading,
    tableMissing,
    error,
    fetchBills,
    createBill,
    updateBillDetails,
    deleteBill,
    addParticipant,
    removeParticipant,
    toggleParticipantPaid,
    confirmParticipantPaid,
    addItemOrder,
    removeItemOrder,
  } = useSplitBillStore()

  // Navigation state: selected bill id (detail view) or null (list view)
  const [selectedBillId, setSelectedBillId] = React.useState<string | null>(null)
  const [listFilter, setListFilter] = React.useState<"all" | "active" | "settled">("all")

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false)
  const [isQrisModalOpen, setIsQrisModalOpen] = React.useState(false)
  const [billToDelete, setBillToDelete] = React.useState<SplitBill | null>(null)
  const [participantToDelete, setParticipantToDelete] = React.useState<{
    billId: string
    participant: Participant
  } | null>(null)

  // Local copy notification toast
  const [copyFeedback, setCopyFeedback] = React.useState<string | null>(null)
  const showCopyNotice = (msg: string) => {
    setCopyFeedback(msg)
    playRetroNotificationSound()
    setTimeout(() => setCopyFeedback(null), 2500)
  }

  // Detail view local state & debounce auto-save
  const selectedBill = React.useMemo(() => {
    return bills.find((b) => b.id === selectedBillId) || null
  }, [bills, selectedBillId])

  // Urutan peserta deterministik & stabil: Owner/Creator selalu #1, sisanya urut created_at ASC & id ASC
  const sortedParticipants = React.useMemo(() => {
    if (!selectedBill || !selectedBill.participants) return []
    return [...selectedBill.participants].sort((a, b) => {
      const aIsOwner = a.user_id === selectedBill.created_by_id
      const bIsOwner = b.user_id === selectedBill.created_by_id
      if (aIsOwner && !bIsOwner) return -1
      if (!aIsOwner && bIsOwner) return 1

      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
      if (timeA !== timeB) return timeA - timeB
      return a.id.localeCompare(b.id)
    })
  }, [selectedBill])

  const [localTitle, setLocalTitle] = React.useState("")
  const [localSubtotal, setLocalSubtotal] = React.useState<string>("")
  const [localTax, setLocalTax] = React.useState<string>("")
  const [localDeliveryFee, setLocalDeliveryFee] = React.useState<string>("")
  const [localDiscount, setLocalDiscount] = React.useState<string>("")
  const [localBank, setLocalBank] = React.useState("")
  const [localAccountNum, setLocalAccountNum] = React.useState("")
  const [localAccountHolder, setLocalAccountHolder] = React.useState("")
  const [localQrisUrl, setLocalQrisUrl] = React.useState("")

  const [saveStatus, setSaveStatus] = React.useState<"idle" | "saving" | "saved">("idle")
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null)

  // Detail item input state
  const [newItemName, setNewItemName] = React.useState("")
  const [newItemPrice, setNewItemPrice] = React.useState("")
  const [newItemUser, setNewItemUser] = React.useState("")
  const [newParticipantInput, setNewParticipantInput] = React.useState("")

  // Check URL params for initial deep link
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const appParam = params.get("app")
    const idParam = params.get("id") || params.get("billId") || params.get("bill_id")
    if ((!appParam || appParam === "splitbill") && idParam) {
      setSelectedBillId(idParam)
    }
  }, [])

  // Sync local detail states when selectedBill changes
  React.useEffect(() => {
    if (selectedBill) {
      setLocalTitle(selectedBill.title)
      setLocalSubtotal(selectedBill.subtotal ? maskRupiahInput(String(selectedBill.subtotal)) : "")
      setLocalTax(selectedBill.tax ? maskRupiahInput(String(selectedBill.tax)) : "")
      setLocalDeliveryFee(selectedBill.delivery_fee ? maskRupiahInput(String(selectedBill.delivery_fee)) : "")
      setLocalDiscount(selectedBill.discount ? maskRupiahInput(String(selectedBill.discount)) : "")
      setLocalBank(selectedBill.bank_name)
      setLocalAccountNum(selectedBill.account_number)
      setLocalAccountHolder(selectedBill.account_holder)
      setLocalQrisUrl(selectedBill.qris_url || "")
      if (selectedBill.participants.length > 0 && !newItemUser) {
        setNewItemUser(selectedBill.participants[0].name)
      }
    }
  }, [selectedBill?.id])

  // Debounced auto-save handler for bill header/amounts
  const triggerDebouncedSave = React.useCallback(
    (updates: Partial<SplitBill>) => {
      if (!selectedBillId) return
      setSaveStatus("saving")
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

      debounceTimerRef.current = setTimeout(async () => {
        await updateBillDetails(selectedBillId, updates)
        setSaveStatus("saved")
        setTimeout(() => setSaveStatus("idle"), 2000)
      }, 600)
    },
    [selectedBillId, updateBillDetails]
  )

  // Handlers for inputs in Detail View
  const handleCostFieldChange = (
    field: "subtotal" | "tax" | "delivery_fee" | "discount",
    rawVal: string
  ) => {
    const masked = maskRupiahInput(rawVal)
    const num = unmaskRupiah(masked)

    if (field === "subtotal") setLocalSubtotal(masked)
    if (field === "tax") setLocalTax(masked)
    if (field === "delivery_fee") setLocalDeliveryFee(masked)
    if (field === "discount") setLocalDiscount(masked)

    triggerDebouncedSave({ [field]: num })
  }

  const handleBankInfoChange = (
    field: "bank_name" | "account_number" | "account_holder" | "qris_url",
    val: string
  ) => {
    if (field === "bank_name") setLocalBank(val)
    if (field === "account_number") setLocalAccountNum(val)
    if (field === "account_holder") setLocalAccountHolder(val)
    if (field === "qris_url") setLocalQrisUrl(val)

    triggerDebouncedSave({ [field]: val })
  }

  const handleTitleChange = (val: string) => {
    setLocalTitle(val)
    triggerDebouncedSave({ title: val })
  }

  // Toggle Mode
  const handleToggleMode = () => {
    if (!selectedBill) return
    const nextMode = selectedBill.mode === "equal" ? "itemized" : "equal"
    updateBillDetails(selectedBill.id, { mode: nextMode })
  }

  // Add Item Order Handler
  const handleAddItemOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBill || !newItemName.trim() || !newItemPrice) return
    const priceNum = unmaskRupiah(newItemPrice)
    if (priceNum <= 0) return

    const assigned = newItemUser.trim() || (selectedBill.participants[0]?.name ?? "Umum")
    await addItemOrder(selectedBill.id, {
      name: newItemName.trim(),
      price: priceNum,
      assignedTo: assigned,
    })

    setNewItemName("")
    setNewItemPrice("")
    playRetroNotificationSound()
  }

  // Add Participant Handler
  const handleAddParticipant = async () => {
    if (!selectedBill || !newParticipantInput.trim()) return
    await addParticipant(selectedBill.id, newParticipantInput.trim())
    setNewParticipantInput("")
    playRetroNotificationSound()
  }

  // Copy WhatsApp Formatter
  const handleCopyWhatsApp = () => {
    if (!selectedBill) return
    const shareUrl = getShareUrl({ app: "splitbill", id: selectedBill.id })
    const lines = [
      `🧾 *SPLIT BILL: ${selectedBill.title.toUpperCase()}*`,
      `📅 *Tanggal:* ${formatDateDisplay(selectedBill.created_at || new Date().toISOString())}`,
      `---------------------------------`,
      `💰 *Total Tagihan:* ${formatRupiah(selectedBill.total_amount)}`,
      ...(selectedBill.delivery_fee > 0 ? [`🛵 Ongkir: ${formatRupiah(selectedBill.delivery_fee)}`] : []),
      ...(selectedBill.tax > 0 ? [`🏛️ Pajak: ${formatRupiah(selectedBill.tax)}`] : []),
      ...(selectedBill.discount > 0 ? [`🎉 Diskon: -${formatRupiah(selectedBill.discount)}`] : []),
      `---------------------------------`,
      `👥 *RINCIAN PER ANGGOTA:*`,
      ...sortedParticipants.map((p, idx) => {
        const status = p.isConfirmed
          ? "✅ [Lunas]"
          : p.isPaid
          ? "⏳ [Sudah Bayar]"
          : "❌ [Belum Bayar]"
        const itemInfo = p.items && p.items.length > 0 ? ` (${p.items.join(", ")})` : ""
        return `${idx + 1}. *${p.name}*${itemInfo}: ${formatRupiah(p.amountDue)} ${status}`
      }),
      `---------------------------------`,
      `💳 *PEMBAYARAN TRANSFER:*`,
      `Bank / E-Wallet: *${selectedBill.bank_name}*`,
      `No. Rekening: *${selectedBill.account_number}*`,
      `Atas Nama: *${selectedBill.account_holder}*`,
      ...(selectedBill.qris_url ? [`📷 QRIS: ${selectedBill.qris_url}`] : []),
      `---------------------------------`,
      `🔗 *Link Rincian Online:* ${shareUrl}`,
      `_Tolong konfirmasi transfer ya jika sudah bayar! Terima kasih 🙏_`,
    ]

    const text = lines.join("\n")
    navigator.clipboard.writeText(text)
    showCopyNotice("Format WhatsApp berhasil disalin!")
  }

  // Copy Rekening
  const handleCopyBank = () => {
    if (!selectedBill?.account_number) return
    navigator.clipboard.writeText(selectedBill.account_number)
    showCopyNotice("Nomor rekening disalin ke clipboard!")
  }

  // Copy Share Link
  const handleCopyLink = () => {
    if (!selectedBill) return
    const shareUrl = getShareUrl({ app: "splitbill", id: selectedBill.id })
    navigator.clipboard.writeText(shareUrl)
    showCopyNotice("Link sesi split bill disalin!")
  }

  // Filter bills for list view
  const filteredBills = React.useMemo(() => {
    if (listFilter === "active") return bills.filter((b) => !b.is_settled)
    if (listFilter === "settled") return bills.filter((b) => b.is_settled)
    return bills
  }, [bills, listFilter])

  const activeCount = React.useMemo(() => bills.filter((b) => !b.is_settled).length, [bills])
  const settledCount = React.useMemo(() => bills.filter((b) => b.is_settled).length, [bills])

  // Table missing error alert
  if (tableMissing) {
    return (
      <div className="p-4">
        <Alert variant="destructive" className="bg-red-50 border-red-300">
          <AlertCircle className="size-4" />
          <AlertTitle className="font-mono text-xs font-bold">TABEL_DATABASE_BELUM_SIAP</AlertTitle>
          <AlertDescription className="text-xs font-mono">
            Tabel `split_bills` atau `split_bill_participants` belum ada di database Supabase. Hubungi admin untuk menjalankan migrasi schema.sql.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // ═════════════════════════════════════════════════════════════
  // VIEW: LIST DAFTAR SESI SPLIT BILL
  // ═════════════════════════════════════════════════════════════
  if (!selectedBillId || !selectedBill) {
    return (
      <div className="flex flex-col gap-3 min-h-full font-sans">
        {/* Top Control Bar */}
        <div className="bg-[#D8E0E8] border border-[#96A6B6] p-2 rounded-[2px] flex flex-wrap items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <Receipt className="size-4 text-[#1E4E8C]" />
            <span className="font-mono text-xs font-bold text-[#14253D]">
              SPLIT BILL
            </span>
          </div>

          <div className="flex items-center gap-2">
            <RetroActionButton
              action="refresh"
              size="sm"
              visual="icon"
              isLoading={isLoading}
              onClick={() => fetchBills()}
              tooltip="Segarkan riwayat sesi"
            />
            {!isGuest && (
              <RetroActionButton
                action="add"
                label="Sesi Baru"
                size="sm"
                visual="button"
                onClick={() => setIsCreateModalOpen(true)}
              />
            )}
          </div>
        </div>

        {/* Filter Tabs & Auto-Delete Notice */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-[#CBD5E1] p-1.5 rounded-[2px]">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setListFilter("all")}
              className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-[2px] border transition-colors cursor-pointer ${
                listFilter === "all"
                  ? "bg-[#1E4E8C] text-white border-[#102A45]"
                  : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
              }`}
            >
              Semua ({bills.length})
            </button>
            <button
              type="button"
              onClick={() => setListFilter("active")}
              className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-[2px] border transition-colors cursor-pointer ${
                listFilter === "active"
                  ? "bg-[#1E4E8C] text-white border-[#102A45]"
                  : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
              }`}
            >
              Aktif ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setListFilter("settled")}
              className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-[2px] border transition-colors cursor-pointer ${
                listFilter === "settled"
                  ? "bg-[#1E4E8C] text-white border-[#102A45]"
                  : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
              }`}
            >
              Lunas ({settledCount})
            </button>
          </div>

          <div className="text-[10px] font-mono text-gray-500 flex items-center gap-1">
            <Clock className="size-3 text-gray-400" />
            <span>Auto-delete &gt; 7 hari</span>
          </div>
        </div>

        {/* Copy Feedback Toast */}
        {copyFeedback && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-mono px-3 py-1.5 rounded flex items-center justify-between">
            <span>✓ {copyFeedback}</span>
            <button
              type="button"
              onClick={() => setCopyFeedback(null)}
              className="text-emerald-600 hover:text-emerald-900 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Bills List / Grid */}
        {isLoading && bills.length === 0 ? (
          <div className="py-12 bg-white border border-[#95A5B5] rounded-[3px] text-center font-mono text-xs text-gray-500 flex flex-col items-center justify-center gap-2">
            <RotateCw className="size-5 animate-spin text-[#1E4E8C]" />
            <span>Memuat data sesi split bill...</span>
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="py-12 bg-white border border-[#95A5B5] rounded-[3px] text-center font-mono text-xs text-gray-500 space-y-3 p-4">
            <Receipt className="size-10 text-gray-300 mx-auto" />
            <div className="font-bold text-[#14253D]">
              {listFilter === "all"
                ? "Belum ada sesi split bill aktif dalam 7 hari terakhir."
                : listFilter === "active"
                ? "Tidak ada tagihan yang sedang aktif / belum lunas."
                : "Belum ada tagihan yang lunas."}
            </div>
            {!isGuest && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="retro-button-3d px-3 py-1.5 text-xs font-bold text-[#1E4E8C] cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="size-3.5" />
                <span>Mulai Sesi Patungan Baru</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredBills.map((b) => {
              const confirmedCount = b.participants.filter((p) => p.isConfirmed).length
              const totalParts = Math.max(1, b.participants.length)
              const percentLunas = Math.round((confirmedCount / totalParts) * 100)
              const isCreatorOrAdmin = Boolean(
                isAdmin || user?.role === "admin" || (user?.id && user.id === b.created_by_id)
              )

              return (
                <div
                  key={b.id}
                  className="bg-white border border-[#95A5B5] rounded-[3px] p-3 shadow-sm hover:border-[#1E4E8C] transition-all flex flex-col justify-between space-y-3"
                >
                  {/* Card Header */}
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => setSelectedBillId(b.id)}
                          className="font-mono text-xs font-bold text-[#14253D] hover:text-[#1E4E8C] text-left truncate block cursor-pointer"
                          title={b.title}
                        >
                          {b.title}
                        </button>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono mt-0.5">
                          <UserAvatar
                            src={b.created_by_avatar}
                            name={b.created_by_name}
                            size="size-3"
                            textClass="text-[6px]"
                          />
                          <span className="truncate">{b.created_by_name}</span>
                          <span>•</span>
                          <span>{formatTimeAgo(b.created_at)}</span>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
                            b.mode === "equal"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-purple-50 text-purple-700 border-purple-200"
                          }`}
                        >
                          {b.mode === "equal" ? "⚖️ Rata" : "📋 Item"}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
                            b.is_settled
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : "bg-amber-50 text-amber-700 border-amber-300"
                          }`}
                        >
                          {b.is_settled ? "LUNAS" : "AKTIF"}
                        </span>
                      </div>
                    </div>

                    {/* Nominal & Progress */}
                    <div className="bg-[#FAFBFD] border border-[#E2E8F0] p-2 rounded-[2px] flex items-center justify-between font-mono">
                      <div>
                        <div className="text-[9px] text-gray-500 font-bold uppercase">Total:</div>
                        <div className="text-sm font-bold text-[#14253D]">
                          {formatRupiah(b.total_amount)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] text-gray-500 font-bold uppercase">Lunas:</div>
                        <div className="text-xs font-bold text-[#1E4E8C]">
                          {confirmedCount} / {b.participants.length}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percentLunas}%` }}
                        className={`h-full transition-all duration-300 ${
                          b.is_settled ? "bg-emerald-500" : "bg-[#1E4E8C]"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                    <div className="text-[10px] font-mono text-gray-500">
                      Bank: <span className="font-bold text-gray-700">{b.bank_name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isCreatorOrAdmin && (
                        <RetroActionButton
                          action="delete"
                          visual="icon"
                          size="sm"
                          onClick={() => setBillToDelete(b)}
                          tooltip="Hapus sesi tagihan ini"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedBillId(b.id)}
                        className="retro-button-3d px-2.5 py-1 text-xs font-mono font-bold text-[#14253D] hover:text-[#1E4E8C] flex items-center gap-1 cursor-pointer"
                      >
                        <span>Buka</span>
                        <ChevronRight className="size-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Modal Buat Sesi Baru */}
        <CreateBillModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={async (payload) => {
            const res = await createBill({
              title: payload.title,
              mode: payload.mode,
              bank_name: payload.bank_name,
              account_number: payload.account_number,
              account_holder: payload.account_holder,
              qris_url: payload.qris_url,
              subtotal: payload.subtotal,
              tax: payload.tax,
              delivery_fee: payload.delivery_fee,
              discount: payload.discount,
              creator: {
                id: user?.id || "anonymous-creator",
                name: user?.name || "Anonim",
                avatarUrl: user?.avatarUrl || null,
              },
              initialParticipants: payload.selectedMembers,
            })
            if (res.success && res.billId) {
              setSelectedBillId(res.billId)
            }
          }}
        />

        {/* Confirm Delete Bill Modal */}
        <ConfirmDialog
          isOpen={!!billToDelete}
          onClose={() => setBillToDelete(null)}
          title="HAPUS_TAGIHAN.EXE"
          message={
            <span>
              Apakah Anda yakin ingin menghapus sesi tagihan{" "}
              <strong>"{billToDelete?.title}"</strong>? Seluruh data rincian peserta dan pesanan
              akan terhapus permanen.
            </span>
          }
          variant="destructive"
          onConfirm={async () => {
            if (billToDelete) {
              await deleteBill(billToDelete.id)
              setBillToDelete(null)
              playRetroNotificationSound()
            }
          }}
        />
      </div>
    )
  }

  // ═════════════════════════════════════════════════════════════
  // VIEW: DETAIL KALKULATOR SPLIT BILL
  // ═════════════════════════════════════════════════════════════
  const isCreatorOrAdmin = Boolean(
    isAdmin || user?.role === "admin" || (user?.id && user.id === selectedBill.created_by_id)
  )
  const allPaid =
    selectedBill.participants.length > 0 &&
    selectedBill.participants.every((p) => p.isConfirmed)

  return (
    <div className="flex flex-col gap-3 min-h-full font-sans">
      {/* Top Controls: Back, Title, Save Status, Actions */}
      <div className="bg-[#D8E0E8] border border-[#96A6B6] p-2 rounded-[2px] flex flex-wrap items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setSelectedBillId(null)}
            className="retro-button-3d px-2 py-1 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer shrink-0"
            title="Kembali ke daftar sesi"
          >
            <ArrowLeft className="size-3.5" />
            <span>Kembali</span>
          </button>

          <div className="flex items-center gap-1.5 min-w-0">
            <Receipt className="size-4 text-[#1E4E8C] shrink-0" />
            {isCreatorOrAdmin ? (
              <input
                type="text"
                value={localTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="bg-white border border-[#7D8E9E] px-2 py-0.5 rounded-[2px] text-xs font-bold font-mono text-[#14253D] w-44 sm:w-56"
                title="Klik untuk mengubah judul tagihan"
              />
            ) : (
              <span className="font-mono text-xs font-bold text-[#14253D] truncate">
                {selectedBill.title}
              </span>
            )}
          </div>

          {/* Auto-save status indicator */}
          <div className="text-[10px] font-mono shrink-0">
            {saveStatus === "saving" && (
              <span className="text-blue-700 flex items-center gap-1">
                <RotateCw className="size-2.5 animate-spin" />
                <span>Menyimpan...</span>
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Check className="size-2.5" />
                <span>Tersimpan</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* QRIS Button if available */}
          {selectedBill.qris_url && (
            <button
              type="button"
              onClick={() => setIsQrisModalOpen(true)}
              className="retro-button-3d px-2 py-1 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer text-[#1E4E8C]"
              title="Lihat QRIS"
            >
              <QrCode className="size-3.5" />
              <span>QRIS</span>
            </button>
          )}

          {/* Copy Link Button */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="retro-button-3d px-2 py-1 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
            title="Salin link"
          >
            <Share2 className="size-3.5 text-gray-600" />
            <span>Link</span>
          </button>

          {/* WhatsApp Button */}
          <button
            type="button"
            onClick={handleCopyWhatsApp}
            className="px-2.5 py-1 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-mono text-xs font-bold rounded-[2px] flex items-center gap-1 border border-[#128C7E] shadow-sm active:translate-y-px cursor-pointer"
            title="Salin ringkasan ke WhatsApp"
          >
            <Share2 className="size-3.5" />
            <span>WhatsApp</span>
          </button>

          {isCreatorOrAdmin && (
            <RetroActionButton
              action="delete"
              visual="icon"
              size="sm"
              onClick={() => setBillToDelete(selectedBill)}
              tooltip="Hapus sesi tagihan ini"
            />
          )}
        </div>
      </div>

      {/* Copy Toast Notification */}
      {copyFeedback && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-mono px-3 py-1.5 rounded flex items-center justify-between">
          <span>✓ {copyFeedback}</span>
          <button
            type="button"
            onClick={() => setCopyFeedback(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Split Bill Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_310px] gap-3">
        {/* Left Column: Cost Breakdown, Itemized Orders & Participants */}
        <div className="space-y-3">
          {/* Bill Calculation Matrix */}
          <div className="bg-white border border-[#95A5B5] rounded-[3px] p-3 space-y-2.5">
            <div className="font-mono text-xs font-bold text-[#14253D] flex items-center justify-between pb-1 border-b border-[#CBD5E1]">
              <span>RINCIAN BIAYA</span>
              <div className="flex items-center gap-1 text-[11px]">
                {isCreatorOrAdmin ? (
                  <button
                    type="button"
                    onClick={handleToggleMode}
                    title="Ganti mode perhitungan"
                    className="px-2 py-0.5 text-[10px] font-bold rounded border bg-[#EEF2F6] hover:bg-[#E2E8F0] text-[#1E4E8C] border-[#7D8E9E] transition-colors cursor-pointer"
                  >
                    {selectedBill.mode === "equal" ? "⚖️ Bagi Rata" : "📋 Per Item"}
                  </button>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded border bg-gray-50 text-gray-600 border-gray-300">
                    {selectedBill.mode === "equal" ? "⚖️ Bagi Rata" : "📋 Per Item"}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5 font-bold">Subtotal</label>
                <div className="relative">
                  <span className="absolute left-1.5 top-1 text-[10px] text-gray-400 select-none">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={!isCreatorOrAdmin}
                    value={localSubtotal}
                    onChange={(e) => handleCostFieldChange("subtotal", e.target.value)}
                    className="w-full pl-6 pr-1.5 py-1 bg-[#FAFBFD] border border-[#CBD5E1] rounded text-xs disabled:bg-gray-100 font-bold font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5 font-bold">Pajak</label>
                <div className="relative">
                  <span className="absolute left-1.5 top-1 text-[10px] text-gray-400 select-none">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={!isCreatorOrAdmin}
                    value={localTax}
                    onChange={(e) => handleCostFieldChange("tax", e.target.value)}
                    className="w-full pl-6 pr-1.5 py-1 bg-[#FAFBFD] border border-[#CBD5E1] rounded text-xs disabled:bg-gray-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5 font-bold">Ongkir</label>
                <div className="relative">
                  <span className="absolute left-1.5 top-1 text-[10px] text-gray-400 select-none">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={!isCreatorOrAdmin}
                    value={localDeliveryFee}
                    onChange={(e) => handleCostFieldChange("delivery_fee", e.target.value)}
                    className="w-full pl-6 pr-1.5 py-1 bg-[#FAFBFD] border border-[#CBD5E1] rounded text-xs disabled:bg-gray-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5 font-bold">Diskon</label>
                <div className="relative">
                  <span className="absolute left-1.5 top-1 text-[10px] text-red-500 select-none">-Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={!isCreatorOrAdmin}
                    value={localDiscount}
                    onChange={(e) => handleCostFieldChange("discount", e.target.value)}
                    className="w-full pl-7 pr-1.5 py-1 bg-[#FAFBFD] border border-[#CBD5E1] rounded text-xs text-red-600 disabled:bg-gray-100 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Total Highlight */}
            <div className="pt-2 border-t border-[#CBD5E1] flex items-center justify-between">
              <div className="font-mono text-xs text-gray-600 font-bold">
                Total Tagihan:
              </div>
              <div className="font-mono text-base font-extrabold text-[#14253D]">
                {formatRupiah(selectedBill.total_amount)}
              </div>
            </div>
          </div>

          {/* Mode Per Item: Itemized Order Input & Table */}
          {selectedBill.mode === "itemized" && (
            <div className="bg-white border border-[#95A5B5] rounded-[3px] p-3 space-y-2.5">
              <div className="font-mono text-xs font-bold text-[#14253D] flex items-center justify-between pb-1 border-b border-[#CBD5E1]">
                <div className="flex items-center gap-1.5">
                  <Receipt className="size-3.5 text-purple-700" />
                  <span>PESANAN MENU ({selectedBill.items?.length || 0})</span>
                </div>
              </div>

              {/* Add Item Form */}
              {isCreatorOrAdmin && (
                <form onSubmit={handleAddItemOrder} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_140px_auto] gap-2 font-mono text-xs">
                  <input
                    type="text"
                    placeholder="Nama menu..."
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="bg-[#FAFBFD] border border-[#CBD5E1] px-2 py-1 rounded text-xs"
                  />
                  <div className="relative">
                    <span className="absolute left-1.5 top-1 text-[10px] text-gray-400 select-none">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(maskRupiahInput(e.target.value))}
                      className="w-full pl-6 pr-1 py-1 bg-[#FAFBFD] border border-[#CBD5E1] rounded text-xs font-mono"
                    />
                  </div>
                  <select
                    value={newItemUser}
                    onChange={(e) => setNewItemUser(e.target.value)}
                    className="bg-[#FAFBFD] border border-[#CBD5E1] px-1.5 py-1 rounded text-xs font-mono"
                  >
                    {sortedParticipants.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-[#1E4E8C] hover:bg-[#153A6B] text-white font-bold rounded-[2px] border border-[#102A45] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="size-3" />
                    <span>Tambah</span>
                  </button>
                </form>
              )}

              {/* Items List Table */}
              {(selectedBill.items || []).length === 0 ? (
                <div className="py-3 text-center font-mono text-[11px] text-gray-400 border border-dashed border-gray-200 rounded">
                  Belum ada pesanan menu.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto font-mono text-xs">
                  {(selectedBill.items || []).map((it) => (
                    <div
                      key={it.id}
                      className="py-1.5 px-2 flex items-center justify-between gap-2 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-gray-400 font-bold">•</span>
                        <span className="font-bold text-[#14253D] truncate">{it.name}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          {it.assignedTo}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-[#1E4E8C]">
                          {formatRupiah(it.price)}
                        </span>
                        {isCreatorOrAdmin && (
                          <button
                            type="button"
                            onClick={() => removeItemOrder(selectedBill.id, it.id)}
                            className="text-gray-400 hover:text-red-600 p-0.5 cursor-pointer"
                            title="Hapus menu ini"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Participants Checklist Table */}
          <div className="bg-white border border-[#95A5B5] rounded-[3px] p-3 space-y-2">
            <div className="font-mono text-xs font-bold text-[#14253D] flex items-center justify-between pb-1 border-b border-[#CBD5E1]">
              <div className="flex items-center gap-1.5">
                <Users className="size-3.5 text-[#1E4E8C]" />
                <span>PESERTA ({selectedBill.participants.length})</span>
              </div>
              {selectedBill.mode === "equal" && (
                <span className="text-[11px] text-gray-600">
                  {formatRupiah(
                    Math.ceil(selectedBill.total_amount / Math.max(1, selectedBill.participants.length))
                  )}{" "}
                  / orang
                </span>
              )}
            </div>

            {/* Guest notice */}
            {isGuest && (
              <div className="py-1.5 px-2.5 bg-amber-50 text-amber-900 border border-amber-300 rounded text-[11px] font-mono flex items-center gap-1.5 my-1">
                <Eye className="size-3.5 text-amber-700 shrink-0" />
                <span>Mode Tamu (Read-Only)</span>
              </div>
            )}

            {/* Add Participant Input & Chips (Owner & Admin Only) */}
            {isCreatorOrAdmin && (
              <>
                <div className="flex items-center gap-2 py-1">
                  <input
                    type="text"
                    placeholder="Nama peserta..."
                    value={newParticipantInput}
                    onChange={(e) => setNewParticipantInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddParticipant()}
                    className="flex-1 bg-[#FAFBFD] border border-[#95A5B5] px-2 py-1 rounded-[2px] text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddParticipant}
                    className="px-2.5 py-1 bg-[#1E4E8C] hover:bg-[#153A6B] text-white font-mono text-xs font-bold rounded-[2px] flex items-center gap-1 border border-[#14253D] cursor-pointer"
                  >
                    <Plus className="size-3" />
                    <span>Tambah</span>
                  </button>
                </div>

                {/* Quick-add chips from master team members */}
                {teamMembers && teamMembers.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 py-1 text-[10px] border-t border-dashed border-[#CBD5E1]">
                    <span className="text-gray-500 font-mono">Tim:</span>
                    {teamMembers.map((tm) => {
                      const isAlreadyIn = selectedBill.participants.some(
                        (p) => p.name.toLowerCase() === tm.name.toLowerCase()
                      )
                      return (
                        <button
                          key={tm.id}
                          type="button"
                          disabled={isAlreadyIn}
                          onClick={() => addParticipant(selectedBill.id, tm.name, tm.user_id, tm.avatar_url)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all flex items-center gap-1 cursor-pointer ${
                            isAlreadyIn
                              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                              : "bg-[#EEF2F6] hover:bg-[#DCE4EC] text-[#1E4E8C] border-[#95A5B5] active:translate-y-px"
                          }`}
                          title={isAlreadyIn ? `${tm.name} sudah masuk tagihan` : `Klik untuk menambahkan ${tm.name}`}
                        >
                          <UserAvatar
                            src={tm.avatar_url}
                            name={tm.name}
                            size="size-3.5"
                            textClass="text-[7px]"
                          />
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
            <div className="divide-y divide-[#E2E8F0] max-h-72 overflow-y-auto">
              {sortedParticipants.map((p, idx) => {
                const isCurrentUser = user?.id === p.user_id || (user?.name && user.name.toLowerCase() === p.name.toLowerCase())

                return (
                  <div
                    key={p.id}
                    className="py-2 px-1 flex items-center justify-between gap-2 hover:bg-[#F8FAFC]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs font-bold text-gray-400 w-4 text-center">
                        {idx + 1}
                      </span>
                      <UserAvatar
                        src={p.avatarUrl}
                        name={p.name}
                        size="size-6"
                        textClass="text-[9px]"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-[#14253D] flex items-center gap-1.5">
                          <span className="truncate">{p.name}</span>
                          {isCurrentUser && (
                            <span className="text-[9px] bg-blue-100 text-blue-800 px-1 rounded font-mono">
                              Saya
                            </span>
                          )}
                        </div>
                        {selectedBill.mode === "itemized" && p.items && p.items.length > 0 && (
                          <div className="text-[10px] text-gray-500 truncate max-w-xs font-mono">
                            {p.items.join(", ")}
                          </div>
                        )}
                        <div className="font-mono text-[11px] text-[#1E4E8C] font-bold">
                          {formatRupiah(p.amountDue)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Member "Sudah Bayar" Toggle: allowed if isCurrentUser OR isCreatorOrAdmin */}
                      {!isGuest && (isCurrentUser || isCreatorOrAdmin) ? (
                        <button
                          type="button"
                          onClick={() => toggleParticipantPaid(selectedBill.id, p.id, !p.isPaid)}
                          className={`h-6 px-2 text-[10px] font-mono font-bold rounded-[2px] border transition-colors cursor-pointer ${
                            p.isPaid
                              ? "bg-emerald-50 text-emerald-700 border-emerald-400"
                              : "bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100"
                          }`}
                          title="Klik untuk menandai sudah transfer"
                        >
                          {p.isPaid ? "Sudah Bayar" : "Belum Bayar"}
                        </button>
                      ) : (
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
                      )}

                      {/* Admin/Creator Confirm Checkbox */}
                      {isCreatorOrAdmin && (
                        <button
                          type="button"
                          onClick={() =>
                            confirmParticipantPaid(selectedBill.id, p.id, !p.isConfirmed)
                          }
                          title={
                            p.isConfirmed
                              ? "Batalkan konfirmasi lunas"
                              : "Konfirmasi pembayaran lunas"
                          }
                          className={`size-6 rounded-[2px] border flex items-center justify-center transition-colors cursor-pointer ${
                            p.isConfirmed
                              ? "bg-[#1E4E8C] text-white border-[#102A45]"
                              : "bg-white border-gray-300 hover:border-gray-500 text-transparent"
                          }`}
                        >
                          ✓
                        </button>
                      )}

                      {/* Remove Participant */}
                      {isCreatorOrAdmin && (
                        <RetroActionButton
                          action="delete"
                          visual="icon"
                          size="sm"
                          onClick={() =>
                            setParticipantToDelete({
                              billId: selectedBill.id,
                              participant: p,
                            })
                          }
                          tooltip="Hapus dari daftar patungan"
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Bank Account, QRIS & Settlement Card */}
        <div className="space-y-3">
          {/* Bank / Payment Destination Card */}
          <div className="bg-white border border-[#95A5B5] rounded-[3px] p-3 space-y-2.5">
            <div className="font-mono text-xs font-bold text-[#14253D] flex items-center justify-between pb-1 border-b border-[#CBD5E1]">
              <div className="flex items-center gap-1.5">
                <CreditCard className="size-3.5 text-[#1E4E8C]" />
                <span>TUJUAN TRANSFER</span>
              </div>
              {selectedBill.qris_url && (
                <button
                  type="button"
                  onClick={() => setIsQrisModalOpen(true)}
                  className="text-[10px] text-[#1E4E8C] hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
                >
                  <QrCode className="size-3" />
                  <span>Scan QRIS</span>
                </button>
              )}
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5 font-bold">Bank:</label>
                <input
                  type="text"
                  disabled={!isCreatorOrAdmin}
                  value={localBank}
                  onChange={(e) => handleBankInfoChange("bank_name", e.target.value)}
                  className="w-full bg-[#FAFBFD] border border-[#CBD5E1] p-1 rounded text-xs disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5 font-bold">No. Rekening:</label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    disabled={!isCreatorOrAdmin}
                    value={localAccountNum}
                    onChange={(e) => handleBankInfoChange("account_number", e.target.value)}
                    className="flex-1 bg-[#FAFBFD] border border-[#CBD5E1] p-1 rounded text-xs font-bold tracking-wider disabled:bg-gray-100"
                  />
                  <button
                    type="button"
                    onClick={handleCopyBank}
                    title="Copy nomor rekening"
                    className="p-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded cursor-pointer"
                  >
                    <Copy className="size-3 text-gray-600" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-600 mb-0.5 font-bold">Atas Nama:</label>
                <input
                  type="text"
                  disabled={!isCreatorOrAdmin}
                  value={localAccountHolder}
                  onChange={(e) => handleBankInfoChange("account_holder", e.target.value)}
                  className="w-full bg-[#FAFBFD] border border-[#CBD5E1] p-1 rounded text-xs disabled:bg-gray-100"
                />
              </div>

              {isCreatorOrAdmin && (
                <div>
                  <label className="block text-[10px] text-gray-600 mb-0.5 font-bold">URL QRIS:</label>
                  <input
                    type="text"
                    placeholder="https://... (Link foto QRIS)"
                    value={localQrisUrl}
                    onChange={(e) => handleBankInfoChange("qris_url", e.target.value)}
                    className="w-full bg-[#FAFBFD] border border-[#CBD5E1] p-1 rounded text-[11px]"
                  />
                </div>
              )}

              {user?.id && isCreatorOrAdmin && (
                <div className="pt-2 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={async () => {
                      await saveUserBankProfile(user.id, {
                        bank_name: localBank.trim() || "BCA",
                        account_number: localAccountNum.trim(),
                        account_holder: localAccountHolder.trim() || user.name,
                        qris_url: localQrisUrl.trim() || null,
                      })
                      showCopyNotice("Rekening tersimpan sebagai default akun!")
                    }}
                    className="retro-button-3d w-full py-1 text-[11px] font-mono font-bold text-[#1E4E8C] flex items-center justify-center gap-1 cursor-pointer"
                    title="Simpan nomor rekening ini sebagai default akun"
                  >
                    <span>💾 Jadikan Rekening Default</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Settle Status Card */}
          <div className="bg-[#EAEFF5] border border-[#CBD5E1] rounded-[3px] p-3 text-xs font-mono space-y-2.5">
            <div className="font-bold text-[#14253D] flex items-center justify-between">
              <span>STATUS PELUNASAN</span>
              {allPaid ? (
                <span className="text-emerald-700 font-black flex items-center gap-1">
                  <Sparkles className="size-3.5 text-amber-500" />
                  <span>LUNAS SEMUA 🎉</span>
                </span>
              ) : (
                <span className="text-amber-700 font-bold">BELUM LUNAS</span>
              )}
            </div>

            <div className="w-full bg-gray-200 h-2.5 rounded overflow-hidden">
              <div
                style={{
                  width: `${
                    selectedBill.participants.length > 0
                      ? (selectedBill.participants.filter((p) => p.isConfirmed).length /
                          selectedBill.participants.length) *
                        100
                      : 0
                  }%`,
                }}
                className={`h-full transition-all duration-500 ${
                  allPaid ? "bg-emerald-500" : "bg-[#1E4E8C]"
                }`}
              />
            </div>

            <div className="text-[11px] text-gray-600 flex justify-between font-bold">
              <span>
                {selectedBill.participants.filter((p) => p.isConfirmed).length} /{" "}
                {selectedBill.participants.length} Lunas
              </span>
              <span>
                {Math.round(
                  (selectedBill.participants.filter((p) => p.isConfirmed).length /
                    Math.max(1, selectedBill.participants.length)) *
                    100
                )}
                %
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* QRIS Modal */}
      <QrisModal
        isOpen={isQrisModalOpen}
        onClose={() => setIsQrisModalOpen(false)}
        qrisUrl={selectedBill.qris_url}
        bankName={selectedBill.bank_name}
        accountHolder={selectedBill.account_holder}
      />

      {/* Confirm Delete Participant Modal */}
      <ConfirmDialog
        isOpen={!!participantToDelete}
        onClose={() => setParticipantToDelete(null)}
        title="HAPUS_PESERTA.EXE"
        message={
          <span>
            Hapus <strong>{participantToDelete?.participant.name}</strong> dari daftar patungan?
            Nominal tagihan anggota lain akan dihitung ulang secara otomatis.
          </span>
        }
        variant="destructive"
        onConfirm={async () => {
          if (participantToDelete) {
            await removeParticipant(
              participantToDelete.billId,
              participantToDelete.participant.id
            )
            setParticipantToDelete(null)
            playRetroNotificationSound()
          }
        }}
      />

      {/* Confirm Delete Bill Modal */}
      <ConfirmDialog
        isOpen={!!billToDelete}
        onClose={() => setBillToDelete(null)}
        title="HAPUS_TAGIHAN.EXE"
        message={
          <span>
            Apakah Anda yakin ingin menghapus sesi tagihan{" "}
            <strong>"{billToDelete?.title}"</strong>? Data tidak dapat dikembalikan.
          </span>
        }
        variant="destructive"
        onConfirm={async () => {
          if (billToDelete) {
            await deleteBill(billToDelete.id)
            setBillToDelete(null)
            setSelectedBillId(null)
            playRetroNotificationSound()
          }
        }}
      />
    </div>
  )
}
