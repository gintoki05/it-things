"use client"

import * as React from "react"
import { useAuth } from "@/lib/auth"
import { useTeamStore } from "@/lib/team-store"
import { usePicStore } from "@/lib/pic-store"
import {
  usePantryStore,
  PantryItem,
  PantryLog,
  getCurrentPeriodMonth,
  formatPeriodMonthDisplay,
} from "@/lib/pantry-store"
import { playRetroNotificationSound } from "@/lib/sound-effects"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { RetroActionButton } from "@/components/ui/retro-action-button"
import {
  Package,
  Plus,
  Trash2,
  Calendar,
  AlertTriangle,
  RotateCw,
  Clock,
  User,
  Users,
  CheckCircle2,
  Boxes,
  PlusCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Info,
  Undo2,
  ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function PantryApp() {
  const { user, isAdmin, isGuest } = useAuth()
  const { isPantryPic, getPicNames } = usePicStore()
  const canManagePantry = Boolean(!isGuest && (isAdmin || isPantryPic))

  const { members: teamMembers } = useTeamStore()

  const {
    items,
    logs,
    currentMonthLogs,
    currentMonthTotal,
    restocks,
    selectedPeriod,
    setSelectedPeriod,
    isLoading,
    tableMissing,
    takeItem,
    cancelTakeItem,
    getUserItemLogs,
    deleteLog,
    restockItem,
    createItem,
    updateItem,
    deleteItem,
    getUserQuotaInfo,
    getMemberConsumptions,
    refresh,
  } = usePantryStore()

  const [activeTab, setActiveTab] = React.useState<"katalog" | "rekap" | "riwayat" | "admin">("katalog")
  const [selectedItemId, setSelectedItemId] = React.useState<string | "all">("all")

  // Modal States
  const [takeModalItem, setTakeModalItem] = React.useState<PantryItem | null>(null)
  const [takeQty, setTakeQty] = React.useState<number>(1)
  const [takeNotes, setTakeNotes] = React.useState<string>("")
  const [takeTargetUserId, setTakeTargetUserId] = React.useState<string>("")
  const [isSubmittingTake, setIsSubmittingTake] = React.useState(false)

  // Admin Modals
  const [showRestockModal, setShowRestockModal] = React.useState(false)
  const [restockItemId, setRestockItemId] = React.useState<string>("")
  const [restockQty, setRestockQty] = React.useState<number>(12)
  const [restockNotes, setRestockNotes] = React.useState<string>("")
  const [isSubmittingRestock, setIsSubmittingRestock] = React.useState(false)

  const [showAddItemModal, setShowAddItemModal] = React.useState(false)
  const [newItemName, setNewItemName] = React.useState("")
  const [newItemCategory, setNewItemCategory] = React.useState("Mie Instan")
  const [newItemEmoji, setNewItemEmoji] = React.useState("🍜")
  const [newItemQuota, setNewItemQuota] = React.useState(2)
  const [newItemStock, setNewItemStock] = React.useState(24)
  const [newItemUnit, setNewItemUnit] = React.useState("cup")
  const [isSubmittingNewItem, setIsSubmittingNewItem] = React.useState(false)

  // Edit Item / Kuota Modal
  const [editItemModal, setEditItemModal] = React.useState<PantryItem | null>(null)
  const [editItemName, setEditItemName] = React.useState("")
  const [editItemCategory, setEditItemCategory] = React.useState("Mie Instan")
  const [editItemEmoji, setEditItemEmoji] = React.useState("🍜")
  const [editItemQuota, setEditItemQuota] = React.useState(2)
  const [editItemUnit, setEditItemUnit] = React.useState("cup")
  const [isSubmittingEdit, setIsSubmittingEdit] = React.useState(false)

  // Confirm delete dialog
  const [deleteTargetLog, setDeleteTargetLog] = React.useState<PantryLog | null>(null)
  const [isDeletingLog, setIsDeletingLog] = React.useState(false)

  // Confirm delete item dialog
  const [deleteTargetItem, setDeleteTargetItem] = React.useState<PantryItem | null>(null)
  const [isDeletingItem, setIsDeletingItem] = React.useState(false)

  // Confirm cancel take for specific item
  const [cancelTargetItem, setCancelTargetItem] = React.useState<PantryItem | null>(null)
  const [isCancelingTake, setIsCancelingTake] = React.useState(false)

  // Toast / Status Message
  const [statusMessage, setStatusMessage] = React.useState<{
    type: "success" | "error"
    text: string
    undoItemId?: string
  } | null>(null)

  const showStatus = (text: string, type: "success" | "error" = "success", undoItemId?: string) => {
    setStatusMessage({ type, text, undoItemId })
    setTimeout(() => setStatusMessage(null), 4500)
  }

  // Active user details
  const currentUserId = user?.id || ""
  const currentMonth = getCurrentPeriodMonth()
  const isCurrentMonth = selectedPeriod === currentMonth

  // Month navigation (used in Rekap & Riwayat tabs)
  const handlePrevMonth = () => {
    const [y, m] = selectedPeriod.split("-").map(Number)
    const d = new Date(y, m - 2, 1)
    const newPeriod = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    setSelectedPeriod(newPeriod)
  }

  const handleNextMonth = () => {
    const [y, m] = selectedPeriod.split("-").map(Number)
    const d = new Date(y, m, 1)
    const newPeriod = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    setSelectedPeriod(newPeriod)
  }

  // Quick Stats
  const totalStockCount = items.reduce((sum, i) => sum + i.stockQty, 0)
  const memberSummaries = getMemberConsumptions(selectedItemId === "all" ? undefined : selectedItemId)
  const overquotaMembers = memberSummaries.filter((m) => m.isOverquota)

  // Overquota bulan berjalan (untuk banner status global)
  const currentMonthOverquotaCount = React.useMemo(() => {
    const userTakenMap: Record<string, Record<string, number>> = {}
    for (const log of currentMonthLogs) {
      if (!userTakenMap[log.userId]) userTakenMap[log.userId] = {}
      userTakenMap[log.userId][log.itemId] = (userTakenMap[log.userId][log.itemId] || 0) + log.quantity
    }
    let count = 0
    for (const [, itemMap] of Object.entries(userTakenMap)) {
      let isOver = false
      for (const item of items) {
        if ((itemMap[item.id] || 0) > item.monthlyQuota) {
          isOver = true
          break
        }
      }
      if (isOver) count++
    }
    return count
  }, [currentMonthLogs, items])

  // Ambil 1 Cepat (Selalu catat ke bulan berjalan)
  const handleQuickTake = async (item: PantryItem) => {
    if (isGuest) {
      showStatus("Mode Tamu: Silakan login dengan Google untuk mencatat.", "error")
      return
    }

    const quotaInfo = getUserQuotaInfo(item.id, currentUserId)
    const isExceeding = quotaInfo.taken + 1 > item.monthlyQuota

    setIsSubmittingTake(true)
    const res = await takeItem({
      itemId: item.id,
      quantity: 1,
      periodMonth: currentMonth,
      notes: isExceeding ? "Ambil melebihi kuota bulanan" : undefined,
    })
    setIsSubmittingTake(false)

    if (res.success) {
      playRetroNotificationSound()
      showStatus(
        isExceeding
          ? `Tercatat ambil 1 ${item.name}! (Status: Melebihi Kuota Bulanan)`
          : `Berhasil mencatat 1 ${item.name}! Selamat menikmati.`,
        "success",
        item.id
      )
    } else {
      showStatus(res.error || "Gagal mencatat.", "error")
    }
  }

  // Submit modal ambil (Selalu catat ke bulan berjalan)
  const handleConfirmTake = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!takeModalItem) return

    if (isGuest) {
      showStatus("Mode Tamu: Tidak dapat mencatat.", "error")
      return
    }

    let targetId = currentUserId
    let targetName = user?.name || "User"
    let targetAvatar = user?.avatarUrl || null

    if ((isAdmin || canManagePantry) && takeTargetUserId && takeTargetUserId !== currentUserId) {
      const foundMember = teamMembers.find((m) => m.user_id === takeTargetUserId || m.id === takeTargetUserId)
      if (foundMember) {
        targetId = foundMember.user_id || foundMember.id
        targetName = foundMember.name
        targetAvatar = foundMember.avatar_url || null
      }
    }

    setIsSubmittingTake(true)
    const res = await takeItem({
      itemId: takeModalItem.id,
      quantity: takeQty,
      periodMonth: currentMonth,
      notes: takeNotes.trim() || undefined,
      targetUserId: targetId,
      targetUserName: targetName,
      targetUserAvatar: targetAvatar,
    })
    setIsSubmittingTake(false)

    if (res.success) {
      playRetroNotificationSound()
      showStatus(`Tercatat: ${takeQty} ${takeModalItem.name} untuk ${targetName}`)
      setTakeModalItem(null)
      setTakeQty(1)
      setTakeNotes("")
      setTakeTargetUserId("")
    } else {
      showStatus(res.error || "Gagal mencatat.", "error")
    }
  }

  // Submit restock
  const handleConfirmRestock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!restockItemId || restockQty <= 0) return

    setIsSubmittingRestock(true)
    const res = await restockItem({
      itemId: restockItemId,
      quantity: restockQty,
      notes: restockNotes.trim() || undefined,
    })
    setIsSubmittingRestock(false)

    if (res.success) {
      playRetroNotificationSound()
      showStatus(`Berhasil restock +${restockQty} unit ke pantry!`)
      setShowRestockModal(false)
      setRestockNotes("")
      setRestockQty(12)
    } else {
      showStatus(res.error || "Gagal restock.", "error")
    }
  }

  // Submit item baru
  const handleConfirmNewItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim()) return

    setIsSubmittingNewItem(true)
    const res = await createItem({
      name: newItemName,
      category: newItemCategory,
      emoji: newItemEmoji,
      monthlyQuota: newItemQuota,
      stockQty: newItemStock,
      unit: newItemUnit,
    })
    setIsSubmittingNewItem(false)

    if (res.success) {
      playRetroNotificationSound()
      showStatus(`Item "${newItemName}" berhasil ditambahkan!`)
      setShowAddItemModal(false)
      setNewItemName("")
    } else {
      showStatus(res.error || "Gagal menambah item.", "error")
    }
  }

  // Hapus log
  const handleConfirmDeleteLog = async () => {
    if (!deleteTargetLog) return
    setIsDeletingLog(true)
    const res = await deleteLog(deleteTargetLog.id)
    setIsDeletingLog(false)
    setDeleteTargetLog(null)

    if (res.success) {
      showStatus("Catatan berhasil dibatalkan & stok dikembalikan.")
    } else {
      showStatus(res.error || "Gagal menghapus catatan.", "error")
    }
  }

  // Hapus item katalog (Admin Only)
  const handleConfirmDeleteItem = async () => {
    if (!deleteTargetItem) return
    setIsDeletingItem(true)
    const res = await deleteItem(deleteTargetItem.id)
    setIsDeletingItem(false)
    const name = deleteTargetItem.name
    setDeleteTargetItem(null)

    if (res.success) {
      showStatus(`Item "${name}" berhasil dihapus dari katalog pantry.`)
    } else {
      showStatus(res.error || "Gagal menghapus item.", "error")
    }
  }

  // Batal ambil langsung untuk item tertentu
  const handleConfirmCancelTake = async () => {
    if (!cancelTargetItem) return
    setIsCancelingTake(true)
    const res = await cancelTakeItem(cancelTargetItem.id)
    setIsCancelingTake(false)
    const itemName = cancelTargetItem.name
    setCancelTargetItem(null)

    if (res.success) {
      showStatus(`Pengambilan ${itemName} berhasil dibatalkan & stok dikembalikan!`)
    } else {
      showStatus(res.error || "Gagal membatalkan pengambilan.", "error")
    }
  }

  // Submit edit item & kuota
  const handleConfirmEditItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editItemModal || !editItemName.trim()) return

    setIsSubmittingEdit(true)
    const res = await updateItem(editItemModal.id, {
      name: editItemName.trim(),
      category: editItemCategory.trim(),
      emoji: editItemEmoji,
      monthlyQuota: editItemQuota,
      unit: editItemUnit.trim(),
    })
    setIsSubmittingEdit(false)

    if (res.success) {
      playRetroNotificationSound()
      showStatus(`Data item "${editItemName}" berhasil diperbarui!`)
      setEditItemModal(null)
    } else {
      showStatus(res.error || "Gagal mengubah item.", "error")
    }
  }

  return (
    <div className="flex flex-col gap-3 min-h-full font-sans select-none text-[#14253D]">
      {/* Table Missing Alert */}
      {tableMissing && (
        <div className="bg-[#FFF3CD] border border-[#E0A800] text-[#856404] p-3 rounded-[3px] text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-amber-600" />
            <span>Tabel database pantry belum aktif di Supabase. Silakan jalankan migrasi schema.</span>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="px-2 py-1 bg-white border border-[#CBD5E1] rounded text-[11px] font-bold"
          >
            Cek Lagi
          </button>
        </div>
      )}

      {/* Top Banner: Active Period & Quick Stats */}
      <div className="bg-[#EAEFF5] border border-[#B0C0D0] p-2 rounded-[3px] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-[#A0B0C0] rounded-[2px] shadow-inner px-2.5 py-1 text-[#1E4E8C] font-bold">
            <Calendar className="size-3.5 text-[#1E4E8C]" />
            <span>Periode Aktif: {formatPeriodMonthDisplay(currentMonth)}</span>
          </div>
        </div>

        {/* Global Summary */}
        <div className="flex flex-wrap items-center gap-2.5 text-[11px]">
          <div className="flex items-center gap-1 bg-sky-50 px-2 py-1 rounded border border-sky-200 text-sky-900">
            <span className="text-xs">☕</span>
            <span className="text-[10px] font-mono">PIC Pantry:</span>
            <strong>{getPicNames("pantry")}</strong>
            {isPantryPic && (
              <span className="ml-1 text-[9px] font-mono font-bold bg-sky-200 text-sky-900 px-1 py-0.2 rounded">
                Anda
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-[#CBD5E1]">
            <Boxes className="size-3.5 text-blue-600" />
            <span>Sisa Stok:</span>
            <strong className="text-blue-700">{totalStockCount}</strong>
          </div>
          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-[#CBD5E1]">
            <Package className="size-3.5 text-emerald-600" />
            <span>Diambil Bulan Ini:</span>
            <strong className="text-emerald-700">{currentMonthTotal}</strong>
          </div>
          {currentMonthOverquotaCount > 0 && (
            <div className="flex items-center gap-1.5 bg-red-100 px-2 py-1 rounded border border-red-300 text-red-700 animate-pulse">
              <ShieldAlert className="size-3.5" />
              <span>Overquota:</span>
              <strong className="font-black">{currentMonthOverquotaCount} Orang</strong>
            </div>
          )}
          <RetroActionButton
            action="refresh"
            onClick={refresh}
            isLoading={isLoading}
            size="sm"
          />
        </div>
      </div>

      {/* Toast Alert */}
      {statusMessage && (
        <div
          className={cn(
            "p-2 rounded-[3px] text-xs font-mono flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1",
            statusMessage.type === "success"
              ? "bg-emerald-50 border border-emerald-400 text-emerald-800"
              : "bg-red-50 border border-red-400 text-red-800"
          )}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="size-4 shrink-0 text-red-600" />
            )}
            <span>{statusMessage.text}</span>
          </div>

          {statusMessage.undoItemId && (
            <button
              type="button"
              onClick={async () => {
                const targetId = statusMessage.undoItemId!
                setStatusMessage(null)
                const res = await cancelTakeItem(targetId)
                if (res.success) {
                  showStatus("Pengambilan berhasil dibatalkan & stok dikembalikan!")
                } else {
                  showStatus(res.error || "Gagal membatalkan.", "error")
                }
              }}
              className="px-2 py-0.5 bg-white border border-emerald-500 hover:bg-emerald-100 text-emerald-800 font-bold rounded-[2px] shadow-xs active:translate-y-px cursor-pointer shrink-0 text-[11px] flex items-center gap-1"
            >
              <Undo2 className="size-3" />
              <span>Batal Ambil (Undo)</span>
            </button>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-[#D8E0E8] border border-[#96A6B6] p-1 rounded-[2px] flex items-center justify-between gap-1 font-mono text-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("katalog")}
            className={cn(
              "px-3 py-1 rounded-[2px] font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              activeTab === "katalog"
                ? "bg-[#1E4E8C] text-white shadow-inner"
                : "hover:bg-white/40 text-[#2B3E50]"
            )}
          >
            <span>🍜</span>
            <span>Katalog & Ambil</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rekap")}
            className={cn(
              "px-3 py-1 rounded-[2px] font-bold transition-all flex items-center gap-1.5 cursor-pointer relative",
              activeTab === "rekap"
                ? "bg-[#1E4E8C] text-white shadow-inner"
                : "hover:bg-white/40 text-[#2B3E50]"
            )}
          >
            <Users className="size-3.5" />
            <span>Rekap Kuota & Pelanggar</span>
            {overquotaMembers.length > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full ml-0.5">
                {overquotaMembers.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("riwayat")}
            className={cn(
              "px-3 py-1 rounded-[2px] font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              activeTab === "riwayat"
                ? "bg-[#1E4E8C] text-white shadow-inner"
                : "hover:bg-white/40 text-[#2B3E50]"
            )}
          >
            <Clock className="size-3.5" />
            <span>Riwayat Log ({logs.length})</span>
          </button>
        </div>

        {canManagePantry && (
          <button
            type="button"
            onClick={() => setActiveTab("admin")}
            className={cn(
              "px-2.5 py-1 rounded-[2px] font-bold transition-all flex items-center gap-1 cursor-pointer text-[11px]",
              activeTab === "admin"
                ? "bg-amber-600 text-white shadow-inner"
                : "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
            )}
          >
            <Sparkles className="size-3 text-amber-500" />
            <span>Kelola Stok & PIC</span>
          </button>
        )}
      </div>

      {/* ============================================================ */}
      {/* TAB 1: KATALOG & AMBIL */}
      {/* ============================================================ */}
      {activeTab === "katalog" && (
        <div className="flex flex-col gap-3">
          {items.length === 0 ? (
            <div className="p-8 text-center bg-white border border-[#CBD5E1] rounded text-slate-500 font-mono text-xs">
              Belum ada item makanan di pantry. Hubungi Admin untuk menambahkan item.
            </div>
          ) : (
            <div className="bg-white border border-[#CBD5E1] rounded-[3px] shadow-sm overflow-x-auto">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-[#E2E8F0] border-b border-[#CBD5E1] text-[#1E3A5F] text-[11px] font-bold">
                    <th className="p-2.5 text-left">Item / Makanan</th>
                    <th className="p-2.5 text-left">Kategori</th>
                    <th className="p-2.5 text-center">Sisa Stok</th>
                    <th className="p-2.5 text-center">Jatah Kamu ({formatPeriodMonthDisplay(currentMonth)})</th>
                    <th className="p-2.5 text-center">Status Kuota</th>
                    <th className="p-2.5 text-right">Aksi Ambil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const userQuota = getUserQuotaInfo(item.id, currentUserId)
                    const isOver = userQuota.isOverquota
                    const isFull = userQuota.taken >= item.monthlyQuota
                    const isLowStock = item.stockQty <= 3

                    return (
                      <tr
                        key={item.id}
                        className={cn(
                          "hover:bg-slate-50 transition-colors",
                          isOver && "bg-red-50/40"
                        )}
                      >
                        {/* Item / Makanan */}
                        <td className="p-2.5 font-bold">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl select-none shrink-0">{item.emoji}</span>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[#14253D] font-extrabold text-[12px] leading-tight">
                                {item.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                Batas: {item.monthlyQuota} {item.unit} / orang / bln
                              </span>
                            </div>
                            {canManagePantry && (
                              <RetroActionButton
                                action="edit"
                                visual="icon"
                                size="xs"
                                onClick={() => {
                                  setEditItemModal(item)
                                  setEditItemName(item.name)
                                  setEditItemCategory(item.category)
                                  setEditItemEmoji(item.emoji)
                                  setEditItemQuota(item.monthlyQuota)
                                  setEditItemUnit(item.unit)
                                }}
                                tooltip="Edit item / ganti nama"
                              />
                            )}
                          </div>
                        </td>

                        {/* Kategori */}
                        <td className="p-2.5 text-slate-600 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] border border-slate-200">
                            {item.category}
                          </span>
                        </td>

                        {/* Sisa Stok */}
                        <td className="p-2.5 text-center whitespace-nowrap">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-[2px] font-bold text-[11px] border inline-block",
                              item.stockQty === 0
                                ? "bg-slate-100 text-slate-500 border-slate-300"
                                : isLowStock
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            )}
                          >
                            {item.stockQty} {item.unit}
                          </span>
                        </td>

                        {/* Jatah Kamu Bulan Ini */}
                        <td className="p-2.5 text-center whitespace-nowrap">
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={cn(
                                "font-extrabold text-[12px]",
                                isOver
                                  ? "text-red-600"
                                  : isFull
                                  ? "text-amber-700"
                                  : "text-emerald-700"
                              )}
                            >
                              {userQuota.taken} / {item.monthlyQuota} {item.unit}
                            </span>
                            <div className="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  isOver ? "bg-red-600" : isFull ? "bg-amber-500" : "bg-emerald-500"
                                )}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (userQuota.taken / item.monthlyQuota) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Status Kuota */}
                        <td className="p-2.5 text-center whitespace-nowrap">
                          {isOver ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-300 inline-flex items-center gap-1">
                              <AlertTriangle className="size-2.5" />
                              OVERQUOTA (+{userQuota.overquotaAmount})
                            </span>
                          ) : isFull ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              PAS KUOTA
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              SISA {userQuota.remaining}
                            </span>
                          )}
                        </td>

                        {/* Aksi Ambil */}
                        <td className="p-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleQuickTake(item)}
                              disabled={isSubmittingTake}
                              className={cn(
                                "py-1 px-2.5 rounded-[2px] font-mono text-[11px] font-bold text-white transition-all flex items-center gap-1 border shadow-[1px_1px_0px_#102A45] active:translate-y-px cursor-pointer",
                                isOver
                                  ? "bg-red-600 hover:bg-red-700 border-red-900"
                                  : "bg-[#1E4E8C] hover:bg-[#153A6B] border-[#102A45]"
                              )}
                              title={`Ambil 1 ${item.unit}`}
                            >
                              <Plus className="size-3" />
                              <span>Ambil 1 {item.unit}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setTakeModalItem(item)
                                setTakeQty(1)
                                setTakeNotes("")
                                setTakeTargetUserId(currentUserId)
                              }}
                              className="py-1 px-2 bg-white hover:bg-slate-100 border border-[#CBD5E1] rounded-[2px] font-mono text-[11px] font-bold text-slate-700 shadow-[1px_1px_0px_#CBD5E1] active:translate-y-px cursor-pointer"
                              title="Input jumlah atau catatan kustom"
                            >
                              Opsi...
                            </button>

                            {userQuota.taken > 0 && (
                              <RetroActionButton
                                action="undo"
                                visual="button"
                                size="xs"
                                onClick={() => setCancelTargetItem(item)}
                                label="Batal"
                                tooltip={`Batalkan pengambilan ${item.name}`}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: REKAP MEMBER & OVERQUOTA LEADERBOARD */}
      {/* ============================================================ */}
      {activeTab === "rekap" && (
        <div className="flex flex-col gap-3">
          {/* Overquota Alert Header if any */}
          {overquotaMembers.length > 0 ? (
            <div className="bg-red-50 border-2 border-red-400 p-3 rounded-[3px] text-red-900">
              <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-red-700 mb-1">
                <ShieldAlert className="size-4 text-red-600" />
                <span>DAFTAR MEMBER YANG MELEBIHI KUOTA BULAN INI</span>
              </div>
              <p className="text-xs text-red-800">
                Berikut adalah rekan tim yang mengambil lebih dari batas jatah bulanan. Data ini
                dapat digunakan untuk evaluasi stok atau penyesuaian iuran kas bersama.
              </p>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-[3px] text-emerald-800 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>Semua anggota tim masih berada dalam batas kuota aman bulan ini. Mantap!</span>
            </div>
          )}

          {/* Member List Cards */}
          <div className="bg-white border border-[#CBD5E1] rounded-[3px] overflow-hidden shadow-sm">
            <div className="bg-[#EAEFF5] border-b border-[#CBD5E1] px-3 py-2 text-xs font-mono font-bold text-[#1E4E8C] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span>REKAP KONSUMSI MEMBER ({memberSummaries.length} Orang Tercatat)</span>
                {!isCurrentMonth && (
                  <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] px-1.5 py-0.5 rounded font-bold">
                    Mode Arsip
                  </span>
                )}
              </div>

              {/* Month Navigation */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center bg-white border border-[#A0B0C0] rounded-[2px] shadow-inner px-1 py-0.5 text-xs">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    title="Bulan Sebelumnya"
                    className="p-1 hover:bg-[#D8E4F0] rounded text-[#1E4E8C] active:scale-95 cursor-pointer"
                  >
                    <ChevronLeft className="size-3.5" />
                  </button>
                  <span className="px-2 font-bold min-w-[130px] text-center text-[#1E4E8C]">
                    {formatPeriodMonthDisplay(selectedPeriod)}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    title="Bulan Berikutnya"
                    className="p-1 hover:bg-[#D8E4F0] rounded text-[#1E4E8C] active:scale-95 cursor-pointer"
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
                {!isCurrentMonth && (
                  <button
                    type="button"
                    onClick={() => setSelectedPeriod(currentMonth)}
                    className="px-2 py-1 bg-[#1E4E8C] text-white rounded-[2px] text-[10px] font-bold border border-[#102A45] shadow-[1px_1px_0px_#102A45] active:translate-y-px cursor-pointer"
                  >
                    Bulan Ini
                  </button>
                )}
              </div>
            </div>

            {memberSummaries.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs">
                Belum ada anggota yang mengambil snack pada periode {selectedPeriod}.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {memberSummaries.map((m, idx) => {
                  return (
                    <div
                      key={m.userId}
                      className={cn(
                        "p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors",
                        m.isOverquota && "bg-red-50/40"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-slate-400 w-5 text-center">
                          #{idx + 1}
                        </span>

                        {/* Avatar */}
                        <div className="size-8 rounded bg-[#1E4E8C]/10 border border-[#1E4E8C]/20 flex items-center justify-center text-sm font-bold text-[#1E4E8C]">
                          {m.userAvatar ? (
                            m.userAvatar.length <= 4 ? (
                              <span>{m.userAvatar}</span>
                            ) : (
                              <img
                                src={m.userAvatar}
                                alt={m.userName}
                                className="size-full object-cover rounded"
                              />
                            )
                          ) : (
                            <span>{m.userName.charAt(0).toUpperCase()}</span>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[#14253D]">{m.userName}</span>
                            {m.userId === currentUserId && (
                              <span className="bg-blue-100 text-blue-800 text-[9px] font-mono px-1 rounded font-bold">
                                Kamu
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            Total diambil: <strong>{m.totalTaken} unit</strong> ({m.logs.length}x
                            pencatatan)
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {m.isOverquota ? (
                          <div className="flex items-center gap-1.5 bg-red-100 border border-red-400 text-red-800 font-mono text-xs font-extrabold px-2.5 py-1 rounded-[2px] shadow-sm">
                            <AlertTriangle className="size-3.5 text-red-600" />
                            <span>OVERQUOTA (+{m.overquotaAmount})</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-300 text-emerald-700 font-mono text-[11px] font-bold px-2 py-0.5 rounded-[2px]">
                            <CheckCircle2 className="size-3 text-emerald-600" />
                            <span>Dalam Kuota</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: RIWAYAT LOG */}
      {/* ============================================================ */}
      {activeTab === "riwayat" && (
        <div className="bg-white border border-[#CBD5E1] rounded-[3px] overflow-hidden shadow-sm">
          <div className="bg-[#EAEFF5] border-b border-[#CBD5E1] px-3 py-2 text-xs font-mono font-bold text-[#1E4E8C] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span>RIWAYAT PENGAMBILAN ({logs.length} Transaksi)</span>
              {!isCurrentMonth && (
                <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] px-1.5 py-0.5 rounded font-bold">
                  Arsip: {formatPeriodMonthDisplay(selectedPeriod)}
                </span>
              )}
            </div>

            {/* Month Navigation */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center bg-white border border-[#A0B0C0] rounded-[2px] shadow-inner px-1 py-0.5 text-xs">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  title="Bulan Sebelumnya"
                  className="p-1 hover:bg-[#D8E4F0] rounded text-[#1E4E8C] active:scale-95 cursor-pointer"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <span className="px-2 font-bold min-w-[130px] text-center text-[#1E4E8C]">
                  {formatPeriodMonthDisplay(selectedPeriod)}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  title="Bulan Berikutnya"
                  className="p-1 hover:bg-[#D8E4F0] rounded text-[#1E4E8C] active:scale-95 cursor-pointer"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
              {!isCurrentMonth && (
                <button
                  type="button"
                  onClick={() => setSelectedPeriod(currentMonth)}
                  className="px-2 py-1 bg-[#1E4E8C] text-white rounded-[2px] text-[10px] font-bold border border-[#102A45] shadow-[1px_1px_0px_#102A45] active:translate-y-px cursor-pointer"
                >
                  Bulan Ini
                </button>
              )}
            </div>
          </div>

          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono text-xs">
              Belum ada log transaksi di bulan {selectedPeriod}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px]">
                    <th className="p-2.5">Waktu</th>
                    <th className="p-2.5">Member</th>
                    <th className="p-2.5">Item</th>
                    <th className="p-2.5 text-center">Jumlah</th>
                    <th className="p-2.5">Catatan</th>
                    <th className="p-2.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => {
                    const item = items.find((i) => i.id === log.itemId)
                    const canDelete =
                      canManagePantry || log.loggedById === currentUserId || log.userId === currentUserId

                    const dateObj = new Date(log.createdAt)
                    const timeStr = dateObj.toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })

                    return (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 text-slate-500 whitespace-nowrap">{timeStr}</td>
                        <td className="p-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-bold text-[#14253D]">
                            <span>{log.userName}</span>
                            {log.loggedById !== log.userId && (
                              <span className="text-[10px] font-normal text-slate-400">
                                (oleh {log.loggedByName})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{item?.emoji || "🍜"}</span>
                            <span>{item?.name || "Item Pantry"}</span>
                          </div>
                        </td>
                        <td className="p-2.5 text-center font-bold text-blue-700 whitespace-nowrap">
                          {log.quantity} {item?.unit || "pcs"}
                        </td>
                        <td className="p-2.5 text-slate-500 text-[11px] max-w-[200px] truncate">
                          {log.notes || "-"}
                        </td>
                        <td className="p-2.5 text-center whitespace-nowrap">
                          {canDelete && (
                            <RetroActionButton
                              action="delete"
                              visual="icon"
                              size="sm"
                              onClick={() => setDeleteTargetLog(log)}
                              tooltip="Batalkan & Hapus Catatan"
                            />
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: KELOLA STOK & PIC PANTRY */}
      {/* ============================================================ */}
      {activeTab === "admin" && canManagePantry && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Quick Restock Card */}
            <div className="bg-white border border-[#CBD5E1] p-3.5 rounded-[3px] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#1E4E8C] mb-1">
                  <PlusCircle className="size-4" />
                  <span>RESTOCK STOK PANTRY</span>
                </div>
                <p className="text-xs text-slate-600 mb-3">
                  Tambah sisa kuantitas stok fisik setelah belanja atau mengisi ulang snack.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (items.length > 0) {
                    setRestockItemId(items[0].id)
                    setRestockQty(12)
                    setRestockNotes("")
                    setShowRestockModal(true)
                  }
                }}
                className="w-full py-1.5 bg-[#1E4E8C] hover:bg-[#153A6B] text-white text-xs font-bold font-mono rounded-[2px] border border-[#102A45] shadow-[1px_1px_0px_#102A45] active:translate-y-px cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="size-3.5" />
                <span>Buka Form Restock</span>
              </button>
            </div>

            {/* Add New Item Card */}
            <div className="bg-white border border-[#CBD5E1] p-3.5 rounded-[3px] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-800 mb-1">
                  <Sparkles className="size-4 text-amber-600" />
                  <span>TAMBAH JENIS ITEM BARU</span>
                </div>
                <p className="text-xs text-slate-600 mb-3">
                  Daftarkan jenis makanan/minuman baru dengan jatah kuota bulanan tersendiri.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddItemModal(true)}
                className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold font-mono rounded-[2px] border border-amber-900 shadow-[1px_1px_0px_#8A4B00] active:translate-y-px cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="size-3.5" />
                <span>Tambah Item Baru</span>
              </button>
            </div>
          </div>

          {/* Master Item Table */}
          <div className="bg-white border border-[#CBD5E1] rounded-[3px] overflow-hidden shadow-sm">
            <div className="bg-[#EAEFF5] border-b border-[#CBD5E1] px-3 py-2 text-xs font-mono font-bold text-[#1E4E8C] flex items-center justify-between">
              <span>MANAJEMEN KATALOG ITEM ({items.length} Item)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px]">
                    <th className="p-2.5">Item</th>
                    <th className="p-2.5">Kategori</th>
                    <th className="p-2.5 text-center">Sisa Stok</th>
                    <th className="p-2.5 text-center">Kuota/Bln</th>
                    <th className="p-2.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 font-bold">
                        <button
                          type="button"
                          onClick={() => {
                            setEditItemModal(item)
                            setEditItemName(item.name)
                            setEditItemCategory(item.category)
                            setEditItemEmoji(item.emoji)
                            setEditItemQuota(item.monthlyQuota)
                            setEditItemUnit(item.unit)
                          }}
                          className="inline-flex items-center gap-1.5 text-left hover:text-amber-800 hover:underline cursor-pointer group"
                          title="Klik untuk ganti nama atau edit detail item"
                        >
                          <span className="text-base">{item.emoji}</span>
                          <span className="group-hover:underline">{item.name}</span>
                          <span className="text-[10px] text-slate-400 group-hover:text-amber-700 transition-colors">✏️</span>
                        </button>
                      </td>
                      <td className="p-2.5 text-slate-600">{item.category}</td>
                      <td className="p-2.5 text-center font-bold text-blue-700">
                        {item.stockQty} {item.unit}
                      </td>
                      <td className="p-2.5 text-center text-slate-700 font-bold">
                        <button
                          type="button"
                          onClick={() => {
                            setEditItemModal(item)
                            setEditItemName(item.name)
                            setEditItemCategory(item.category)
                            setEditItemEmoji(item.emoji)
                            setEditItemQuota(item.monthlyQuota)
                            setEditItemUnit(item.unit)
                          }}
                          className="hover:underline hover:text-amber-700 cursor-pointer inline-flex items-center gap-1"
                          title="Klik untuk ubah batasan kuota"
                        >
                          <span>{item.monthlyQuota} {item.unit}</span>
                          <span className="text-[10px] text-slate-400">✏️</span>
                        </button>
                      </td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <RetroActionButton
                            action="edit"
                            visual="button"
                            size="xs"
                            label="Edit Item"
                            tooltip="Edit nama, kuota, atau detail item"
                            onClick={() => {
                              setEditItemModal(item)
                              setEditItemName(item.name)
                              setEditItemCategory(item.category)
                              setEditItemEmoji(item.emoji)
                              setEditItemQuota(item.monthlyQuota)
                              setEditItemUnit(item.unit)
                            }}
                          />
                          <RetroActionButton
                            action="restock"
                            visual="button"
                            size="xs"
                            label="Restock"
                            tooltip="Restock stok fisik"
                            onClick={() => {
                              setRestockItemId(item.id)
                              setRestockQty(12)
                              setShowRestockModal(true)
                            }}
                          />
                          <RetroActionButton
                            action="delete"
                            visual="icon"
                            size="sm"
                            tooltip="Hapus Item dari Katalog"
                            onClick={() => setDeleteTargetItem(item)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Riwayat Restock Terakhir */}
          {restocks.length > 0 && (
            <div className="bg-white border border-[#CBD5E1] rounded-[3px] overflow-hidden shadow-sm">
              <div className="bg-[#EAEFF5] border-b border-[#CBD5E1] px-3 py-2 text-xs font-mono font-bold text-[#1E4E8C]">
                LOG RESTOCK TERAKHIR
              </div>
              <div className="divide-y divide-slate-100 text-xs font-mono p-1 max-h-48 overflow-y-auto">
                {restocks.map((r) => {
                  const itm = items.find((i) => i.id === r.itemId)
                  return (
                    <div key={r.id} className="p-2 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-emerald-700">+{r.quantity}</span>{" "}
                        <span>{itm?.name || "Item"}</span>
                        {r.notes && <span className="text-slate-400 ml-2">({r.notes})</span>}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        oleh {r.restockedByName} • {new Date(r.createdAt).toLocaleDateString("id-ID")}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: AMBIL ITEM (OPSI / CUSTOM) */}
      {/* ============================================================ */}
      {takeModalItem && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
          <div className="retro-window-frame max-w-sm w-full rounded-[4px] overflow-hidden shadow-[6px_6px_0px_rgba(0,0,0,0.35)] bg-white flex flex-col">
            {/* Titlebar */}
            <div className="bg-gradient-to-r from-[#1E4E8C] to-[#2E5AA8] text-white px-3 py-1.5 flex items-center justify-between font-mono text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <span>{takeModalItem.emoji}</span>
                <span>AMBIL_SNACK.EXE</span>
              </div>
              <button
                type="button"
                onClick={() => setTakeModalItem(null)}
                className="hover:bg-white/20 px-1.5 py-0.5 rounded text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmTake} className="p-4 flex flex-col gap-3 text-xs font-mono">
              <div>
                <span className="font-bold text-sm text-[#14253D]">{takeModalItem.name}</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Kuota bulanan: {takeModalItem.monthlyQuota} {takeModalItem.unit} • Sisa stok:{" "}
                  {takeModalItem.stockQty} {takeModalItem.unit}
                </p>
              </div>

              {/* Admin target user picker */}
              {canManagePantry && teamMembers.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Ambilkan Untuk:
                  </label>
                  <select
                    value={takeTargetUserId}
                    onChange={(e) => setTakeTargetUserId(e.target.value)}
                    className="w-full border border-[#CBD5E1] p-1.5 rounded-[2px] bg-white text-xs"
                  >
                    <option value={currentUserId}>Diri Sendiri ({user?.name || "Saya"})</option>
                    {teamMembers
                      .filter((m) => (m.user_id || m.id) !== currentUserId)
                      .map((m) => (
                        <option key={m.id} value={m.user_id || m.id}>
                          {m.name} ({m.email})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Jumlah yang Diambil:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={takeQty}
                    onChange={(e) => setTakeQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 border border-[#CBD5E1] p-1.5 rounded-[2px] font-bold text-center text-sm"
                  />
                  <span className="text-slate-500">{takeModalItem.unit}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Catatan (Opsional):
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Lembur malam bareng tim"
                  value={takeNotes}
                  onChange={(e) => setTakeNotes(e.target.value)}
                  className="w-full border border-[#CBD5E1] p-1.5 rounded-[2px] text-xs"
                  maxLength={100}
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTakeModalItem(null)}
                  className="px-3 py-1 bg-white border border-[#CBD5E1] hover:bg-slate-100 rounded-[2px] font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTake}
                  className="px-4 py-1 bg-[#1E4E8C] hover:bg-[#153A6B] text-white rounded-[2px] font-bold border border-[#102A45] shadow-[1px_1px_0px_#102A45] active:translate-y-px cursor-pointer"
                >
                  {isSubmittingTake ? "Menyimpan..." : "Catat Sekarang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: RESTOCK (ADMIN / PIC PANTRY) */}
      {/* ============================================================ */}
      {showRestockModal && canManagePantry && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
          <div className="retro-window-frame max-w-sm w-full rounded-[4px] overflow-hidden shadow-[6px_6px_0px_rgba(0,0,0,0.35)] bg-white flex flex-col">
            <div className="bg-gradient-to-r from-[#1E4E8C] to-[#2E5AA8] text-white px-3 py-1.5 flex items-center justify-between font-mono text-xs font-bold">
              <span>RESTOCK_PANTRY.EXE</span>
              <button
                type="button"
                onClick={() => setShowRestockModal(false)}
                className="hover:bg-white/20 px-1.5 py-0.5 rounded text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmRestock} className="p-4 flex flex-col gap-3 text-xs font-mono">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Pilih Item:
                </label>
                <select
                  value={restockItemId}
                  onChange={(e) => setRestockItemId(e.target.value)}
                  className="w-full border border-[#CBD5E1] p-1.5 rounded-[2px] bg-white text-xs"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.emoji} {i.name} (Sisa stok: {i.stockQty} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Jumlah Tambahan Stok:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={restockQty}
                    onChange={(e) => setRestockQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 border border-[#CBD5E1] p-1.5 rounded-[2px] font-bold text-center text-sm"
                  />
                  <span className="text-slate-500">unit</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Catatan Pengadaan / Sumber:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Belanja di Superindo / Indomaret"
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  className="w-full border border-[#CBD5E1] p-1.5 rounded-[2px] text-xs"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="px-3 py-1 bg-white border border-[#CBD5E1] hover:bg-slate-100 rounded-[2px] font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRestock}
                  className="px-4 py-1 bg-[#1E4E8C] hover:bg-[#153A6B] text-white rounded-[2px] font-bold border border-[#102A45] shadow-[1px_1px_0px_#102A45] active:translate-y-px cursor-pointer"
                >
                  {isSubmittingRestock ? "Menyimpan..." : "Tambah Stok"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: TAMBAH ITEM BARU (ADMIN / PIC PANTRY) */}
      {/* ============================================================ */}
      {showAddItemModal && canManagePantry && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
          <div className="retro-window-frame max-w-sm w-full rounded-[4px] overflow-hidden shadow-[6px_6px_0px_rgba(0,0,0,0.35)] bg-white flex flex-col">
            <div className="bg-gradient-to-r from-amber-700 to-amber-900 text-white px-3 py-1.5 flex items-center justify-between font-mono text-xs font-bold">
              <span>TAMBAH_ITEM_PANTRY.EXE</span>
              <button
                type="button"
                onClick={() => setShowAddItemModal(false)}
                className="hover:bg-white/20 px-1.5 py-0.5 rounded text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmNewItem} className="p-4 flex flex-col gap-3 text-xs font-mono">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Makanan / Minuman:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pop Mie Kari Ayam, Kopi Good Day, dsb"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full border border-[#CBD5E1] p-1.5 rounded-[2px] text-xs font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Emoji:</label>
                  <select
                    value={newItemEmoji}
                    onChange={(e) => setNewItemEmoji(e.target.value)}
                    className="w-full border border-[#CBD5E1] p-1.5 rounded-[2px] bg-white text-base text-center"
                  >
                    <option value="🍜">🍜 Pop Mie / Mie</option>
                    <option value="☕">☕ Kopi</option>
                    <option value="🍵">🍵 Teh</option>
                    <option value="🍪">🍪 Biskuit</option>
                    <option value="🥪">🥪 Roti / Snack</option>
                    <option value="🥤">🥤 Minuman Kaleng</option>
                    <option value="🍬">🍬 Permen</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Kategori:</label>
                  <input
                    type="text"
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full border border-[#CBD5E1] p-1.5 rounded-[2px] text-xs"
                    placeholder="Mie Instan"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Kuota/Bln:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newItemQuota}
                    onChange={(e) => setNewItemQuota(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full border border-[#CBD5E1] p-1.5 rounded-[2px] font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Stok Awal:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newItemStock}
                    onChange={(e) => setNewItemStock(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full border border-[#CBD5E1] p-1.5 rounded-[2px] font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Satuan:</label>
                  <input
                    type="text"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-full border border-[#CBD5E1] p-1.5 rounded-[2px] text-center"
                    placeholder="cup / pcs"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-3 py-1 bg-white border border-[#CBD5E1] hover:bg-slate-100 rounded-[2px] font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewItem}
                  className="px-4 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-[2px] font-bold border border-amber-900 shadow-[1px_1px_0px_#8A4B00] active:translate-y-px cursor-pointer"
                >
                  {isSubmittingNewItem ? "Menyimpan..." : "Simpan Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EDIT ITEM & BATASAN KUOTA (ADMIN / PIC PANTRY) */}
      {/* ============================================================ */}
      {editItemModal && canManagePantry && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
          <div className="retro-window-frame max-w-sm w-full rounded-[4px] overflow-hidden shadow-[6px_6px_0px_rgba(0,0,0,0.35)] bg-white flex flex-col">
            <div className="bg-gradient-to-r from-amber-700 to-amber-900 text-white px-3 py-1.5 flex items-center justify-between font-mono text-xs font-bold">
              <span>EDIT_ITEM_PANTRY.EXE</span>
              <button
                type="button"
                onClick={() => setEditItemModal(null)}
                className="hover:bg-white/20 px-1.5 py-0.5 rounded text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmEditItem} className="p-4 flex flex-col gap-3 text-xs font-mono">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Item / Makanan / Snack:
                </label>
                <input
                  type="text"
                  value={editItemName}
                  onChange={(e) => setEditItemName(e.target.value)}
                  placeholder="Contoh: Pop Mie Ayam Bawang"
                  className="w-full border border-[#CBD5E1] p-1.5 rounded-[2px] text-xs font-bold bg-white focus:outline-none focus:border-amber-600 shadow-inner"
                  required
                  autoFocus
                />
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-[3px]">
                <label className="block text-[11px] font-extrabold text-amber-900 mb-1">
                  🎯 Batasan Kuota Bulanan per Orang:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={editItemQuota}
                    onChange={(e) => setEditItemQuota(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 border border-amber-400 bg-white p-1.5 rounded-[2px] font-black text-center text-sm text-amber-950 shadow-inner"
                    required
                  />
                  <span className="text-amber-800 font-bold">{editItemUnit} / member / bulan</span>
                </div>
                <p className="text-[10px] text-amber-700 mt-1.5 leading-tight">
                  Jika member mengambil lebih dari angka ini dalam sebulan, sistem otomatis menandainya sebagai Overquota.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Emoji:</label>
                  <select
                    value={editItemEmoji}
                    onChange={(e) => setEditItemEmoji(e.target.value)}
                    className="w-full border border-[#CBD5E1] p-1.5 rounded-[2px] bg-white text-base text-center"
                  >
                    <option value="🍜">🍜 Pop Mie / Mie</option>
                    <option value="☕">☕ Kopi</option>
                    <option value="🍵">🍵 Teh</option>
                    <option value="🍪">🍪 Biskuit</option>
                    <option value="🥪">🥪 Roti / Snack</option>
                    <option value="🥤">🥤 Minuman Kaleng</option>
                    <option value="🍬">🍬 Permen</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Satuan:</label>
                  <input
                    type="text"
                    value={editItemUnit}
                    onChange={(e) => setEditItemUnit(e.target.value)}
                    className="w-full border border-[#CBD5E1] p-1.5 rounded-[2px] text-center"
                    placeholder="cup / pcs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Kategori:</label>
                <input
                  type="text"
                  value={editItemCategory}
                  onChange={(e) => setEditItemCategory(e.target.value)}
                  className="w-full border border-[#CBD5E1] p-1.5 rounded-[2px] text-xs"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditItemModal(null)}
                  className="px-3 py-1 bg-white border border-[#CBD5E1] hover:bg-slate-100 rounded-[2px] font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-4 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-[2px] font-bold border border-amber-900 shadow-[1px_1px_0px_#8A4B00] active:translate-y-px cursor-pointer"
                >
                  {isSubmittingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Delete Log */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetLog)}
        onClose={() => setDeleteTargetLog(null)}
        onConfirm={handleConfirmDeleteLog}
        title="BATALKAN_LOG.EXE"
        message={
          deleteTargetLog ? (
            <div className="text-xs font-mono">
              Yakin ingin membatalkan catatan pengambilan{" "}
              <strong>
                {deleteTargetLog.quantity} unit oleh {deleteTargetLog.userName}
              </strong>
              ? Stok akan otomatis dikembalikan ke pantry.
            </div>
          ) : (
            ""
          )
        }
        confirmText="Batalkan & Hapus"
        isLoading={isDeletingLog}
      />

      {/* Confirmation Dialog for Quick Cancel Take */}
      <ConfirmDialog
        isOpen={Boolean(cancelTargetItem)}
        onClose={() => setCancelTargetItem(null)}
        onConfirm={handleConfirmCancelTake}
        title="BATAL_AMBIL.EXE"
        message={
          cancelTargetItem ? (
            <div className="text-xs font-mono">
              Batalkan pencatatan pengambilan terakhir untuk{" "}
              <strong>{cancelTargetItem.name}</strong> di bulan {formatPeriodMonthDisplay(selectedPeriod)}?
              <div className="mt-1 text-slate-500 text-[11px]">
                Sisa stok fisik di pantry akan otomatis bertambah kembali.
              </div>
            </div>
          ) : (
            ""
          )
        }
        confirmText="Ya, Batalkan Ambil"
        cancelText="Kembali"
        variant="warning"
        isLoading={isCancelingTake}
      />

      {/* Confirmation Dialog for Delete Catalog Item (Admin Only) */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetItem)}
        onClose={() => setDeleteTargetItem(null)}
        onConfirm={handleConfirmDeleteItem}
        title="HAPUS_ITEM_KATALOG.EXE"
        message={
          deleteTargetItem ? (
            <div className="text-xs font-mono">
              Yakin ingin menghapus item{" "}
              <strong>{deleteTargetItem.emoji} {deleteTargetItem.name}</strong> dari katalog pantry?
              <div className="mt-2 text-red-600 text-[11px] font-bold">
                ⚠️ Peringatan: Seluruh riwayat pengambilan terkait item ini juga akan ikut terhapus!
              </div>
            </div>
          ) : (
            ""
          )
        }
        confirmText="Ya, Hapus Item"
        cancelText="Batal"
        variant="destructive"
        isLoading={isDeletingItem}
      />
    </div>
  )
}
