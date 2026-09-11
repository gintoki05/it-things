"use client"

import * as React from "react"
import {
  useLapakStore,
  LapakItem,
  LapakCategory,
  LAPAK_CATEGORIES,
  BADGE_OPTIONS,
} from "@/lib/lapak-store"
import { useAuth } from "@/lib/auth"
import { RetroIcon } from "@/components/ui/retro-icon"
import { RetroActionButton } from "@/components/ui/retro-action-button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { GoogleLoginModal } from "@/components/auth/google-login-modal"
import { UserAvatar } from "@/components/retro/user-avatar"
import { cn, maskRupiahInput } from "@/lib/utils"
import {
  Search,
  MessageCircle,
  ExternalLink,
  Store,
  Tag,
  Sparkles,
  Phone,
  Info,
  X,
  Check,
  AlertCircle,
  Layers,
  ShoppingBag,
  LogIn,
  Coins,
} from "lucide-react"

type PriceMode = "fixed" | "start_from" | "range" | "custom"

const PRICE_UNIT_PRESETS = [
  { value: "", label: "(Tanpa satuan)" },
  { value: "/ porsi", label: "/ porsi" },
  { value: "/ botol", label: "/ botol" },
  { value: "/ cup", label: "/ cup" },
  { value: "/ paket", label: "/ paket" },
  { value: "/ pcs", label: "/ pcs" },
  { value: "/ project", label: "/ project" },
  { value: "/ jam", label: "/ jam" },
  { value: "/ hari", label: "/ hari" },
  { value: "/ bulan", label: "/ bulan" },
  { value: "/ sesi", label: "/ sesi" },
]

function buildPriceString(
  mode: PriceMode,
  amount: string,
  min: string,
  max: string,
  unit: string,
  custom: string
): string {
  const u = unit ? ` ${unit}` : ""
  if (mode === "fixed") {
    if (!amount) return ""
    return `Rp ${amount}${u}`
  }
  if (mode === "start_from") {
    if (!amount) return ""
    return `Mulai Rp ${amount}${u}`
  }
  if (mode === "range") {
    if (min && max) return `Rp ${min} - Rp ${max}${u}`
    if (min) return `Rp ${min}${u}`
    if (max) return `Rp ${max}${u}`
    return ""
  }
  if (mode === "custom") {
    return custom.trim()
  }
  return ""
}

function parseExistingPrice(raw: string): {
  mode: PriceMode
  amount: string
  min: string
  max: string
  unit: string
  custom: string
} {
  if (!raw) {
    return { mode: "fixed", amount: "", min: "", max: "", unit: "", custom: "" }
  }

  // Check unit
  let unit = ""
  for (const preset of PRICE_UNIT_PRESETS) {
    if (preset.value && raw.includes(preset.value)) {
      unit = preset.value
      break
    }
  }

  // Check Range: e.g. "Rp 100.0000 / Rp. 3.500.000" or "Rp 15.000 - Rp 35.000"
  if (raw.includes("-") || raw.includes(" - ") || raw.includes(" / Rp") || (raw.includes("/") && /\d/.test(raw.split("/")[1] || ""))) {
    const rawNoUnit = unit ? raw.replace(unit, "") : raw
    const parts = rawNoUnit.split(/[-–—/]/).map((p) => p.replace(/\D/g, "")).filter(Boolean)
    if (parts.length >= 2) {
      return {
        mode: "range",
        amount: "",
        min: maskRupiahInput(parts[0]),
        max: maskRupiahInput(parts[1]),
        unit,
        custom: "",
      }
    }
  }

  // Check "Mulai"
  if (/mulai/i.test(raw)) {
    const digits = raw.replace(/\D/g, "")
    return {
      mode: "start_from",
      amount: maskRupiahInput(digits),
      min: "",
      max: "",
      unit,
      custom: "",
    }
  }

  // Check single amount
  const digits = raw.replace(/\D/g, "")
  if (digits) {
    return {
      mode: "fixed",
      amount: maskRupiahInput(digits),
      min: "",
      max: "",
      unit,
      custom: "",
    }
  }

  return {
    mode: "custom",
    amount: "",
    min: "",
    max: "",
    unit: "",
    custom: raw,
  }
}

export function LapakApp() {
  const { user, isAdmin, isGuest } = useAuth()
  const {
    items,
    isLoading,
    tableMissing,
    isUsingSupabase,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
  } = useLapakStore()

  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState<LapakCategory>("Semua")
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [showLoginModal, setShowLoginModal] = React.useState(false)
  const [editingItem, setEditingItem] = React.useState<LapakItem | null>(null)
  const [itemToDelete, setItemToDelete] = React.useState<LapakItem | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)

  // Form State
  const [formTitle, setFormTitle] = React.useState("")
  const [formTagline, setFormTagline] = React.useState("")
  const [formDescription, setFormDescription] = React.useState("")
  const [formCategory, setFormCategory] = React.useState("Kuliner")
  const [formContactName, setFormContactName] = React.useState("")
  const [formContactWa, setFormContactWa] = React.useState("")
  const [formContactLink, setFormContactLink] = React.useState("")
  const [formBadge, setFormBadge] = React.useState("PROMO")
  const [formImageUrl, setFormImageUrl] = React.useState("")

  // Form Price Masking State
  const [priceMode, setPriceMode] = React.useState<PriceMode>("fixed")
  const [priceAmount, setPriceAmount] = React.useState("")
  const [priceMin, setPriceMin] = React.useState("")
  const [priceMax, setPriceMax] = React.useState("")
  const [priceUnit, setPriceUnit] = React.useState("")
  const [priceCustom, setPriceCustom] = React.useState("")

  // Computed formatted price
  const formattedPricePreview = React.useMemo(() => {
    return buildPriceString(priceMode, priceAmount, priceMin, priceMax, priceUnit, priceCustom)
  }, [priceMode, priceAmount, priceMin, priceMax, priceUnit, priceCustom])

  // Open modal for Create
  const handleOpenCreateModal = () => {
    if (isGuest) {
      setShowLoginModal(true)
      return
    }
    setEditingItem(null)
    setFormTitle("")
    setFormTagline("")
    setFormDescription("")
    setFormCategory("Kuliner")
    setFormContactName(user?.name || "")
    setFormContactWa("")
    setFormContactLink("")
    setFormBadge("PROMO")
    setFormImageUrl("")
    setPriceMode("fixed")
    setPriceAmount("")
    setPriceMin("")
    setPriceMax("")
    setPriceUnit("")
    setPriceCustom("")
    setFormError(null)
    setIsModalOpen(true)
  }

  // Open modal for Edit
  const handleOpenEditModal = (item: LapakItem) => {
    setEditingItem(item)
    setFormTitle(item.title)
    setFormTagline(item.tagline)
    setFormDescription(item.description)
    setFormCategory(item.category)
    setFormContactName(item.contactName)
    setFormContactWa(item.contactWa)
    setFormContactLink(item.contactLink)
    setFormBadge(item.badge)
    setFormImageUrl(item.imageUrl)

    // Parse existing price
    const parsed = parseExistingPrice(item.priceRange)
    setPriceMode(parsed.mode)
    setPriceAmount(parsed.amount)
    setPriceMin(parsed.min)
    setPriceMax(parsed.max)
    setPriceUnit(parsed.unit)
    setPriceCustom(parsed.custom)

    setFormError(null)
    setIsModalOpen(true)
  }

  // Handle Submit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      setFormError("Nama usaha/produk wajib diisi.")
      return
    }
    if (!formContactName.trim()) {
      setFormError("Nama kontak wajib diisi.")
      return
    }

    const finalPrice = buildPriceString(
      priceMode,
      priceAmount,
      priceMin,
      priceMax,
      priceUnit,
      priceCustom
    )

    setIsSubmitting(true)
    setFormError(null)

    if (editingItem) {
      const res = await updateItem(editingItem.id, {
        title: formTitle,
        tagline: formTagline,
        description: formDescription,
        category: formCategory,
        priceRange: finalPrice,
        contactName: formContactName,
        contactWa: formContactWa,
        contactLink: formContactLink,
        badge: formBadge,
        imageUrl: formImageUrl,
      })

      setIsSubmitting(false)
      if (!res.success) {
        setFormError(res.message || "Gagal memperbarui iklan.")
        return
      }
    } else {
      const res = await createItem({
        title: formTitle,
        tagline: formTagline,
        description: formDescription,
        category: formCategory,
        priceRange: finalPrice,
        contactName: formContactName,
        contactWa: formContactWa,
        contactLink: formContactLink,
        badge: formBadge,
        imageUrl: formImageUrl,
      })

      setIsSubmitting(false)
      if (!res.success) {
        setFormError(res.message || "Gagal menambah iklan.")
        return
      }
    }

    setIsModalOpen(false)
  }

  // Filter items
  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      const matchCategory =
        selectedCategory === "Semua" || item.category.toLowerCase() === selectedCategory.toLowerCase()
      const q = searchQuery.toLowerCase().trim()
      const matchSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.tagline.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.contactName.toLowerCase().includes(q) ||
        item.createdByName.toLowerCase().includes(q)
      return matchCategory && matchSearch
    })
  }, [items, selectedCategory, searchQuery])

  // Clean WA link helper
  const getWhatsAppUrl = (phone: string, title: string) => {
    const cleaned = phone.replace(/[^0-9]/g, "")
    const normalizedPhone = cleaned.startsWith("0") ? `62${cleaned.slice(1)}` : cleaned
    const text = encodeURIComponent(
      `Halo kak, mau tanya seputar promo/jualan "${title}" di IT-THINGS 98.`
    )
    return `https://wa.me/${normalizedPhone}?text=${text}`
  }

  return (
    <div className="flex flex-col h-full bg-[#CBD5E1] text-[#14253D] font-sans select-none overflow-hidden">
      {/* Top Retro Header Bar */}
      <div className="p-2 sm:p-2.5 bg-[#D4DDE6] border-b-2 border-b-[#7D8E9E] flex flex-col gap-2 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Title & Info */}
          <div className="flex items-center gap-2">
            <div className="size-7 bg-[#1E4E8C] text-white flex items-center justify-center rounded-[2px] shadow-inner">
              <ShoppingBag className="size-4 text-blue-200" />
            </div>
            <div>
              <div className="font-mono text-xs font-bold tracking-wide flex items-center gap-1.5">
                <span>LAPAK_TEMAN.EXE</span>
                <span className="text-[10px] text-gray-500 font-normal">
                  ({filteredItems.length} Terdaftar)
                </span>
              </div>
              <div className="text-[11px] text-gray-600 font-mono">
                Etalase & Dukung Usaha Teman Satu Tim
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 ml-auto">
            <RetroActionButton
              action="refresh"
              size="sm"
              visual="button"
              label="Refresh"
              isLoading={isLoading}
              onClick={() => fetchItems()}
            />
            <RetroActionButton
              action="add"
              size="sm"
              visual="button"
              label="Pasang Iklan"
              onClick={handleOpenCreateModal}
            />
          </div>
        </div>

        {/* Search and Category Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-white/60">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama usaha, jastip, menu, kontak..."
              className="w-full pl-7 pr-7 py-1 text-xs font-mono bg-white border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] focus:outline-none focus:ring-1 focus:ring-[#1E4E8C] text-[#14253D]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none">
            {LAPAK_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-2 py-0.5 text-[11px] font-mono font-bold whitespace-nowrap rounded-[2px] transition-colors cursor-pointer border",
                    isSelected
                      ? "bg-[#1E4E8C] text-white border-[#102A45] shadow-[inset_1px_1px_0px_rgba(0,0,0,0.4)]"
                      : "bg-[#E2E8F0] hover:bg-white text-gray-700 border-t-white border-l-white border-r-[#7D8E9E] border-b-[#7D8E9E] active:translate-y-px"
                  )}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Guest Mode Notice */}
      {isGuest && (
        <div className="bg-[#FFF3CD] border-b border-[#E0A800] text-[#856404] px-3 py-1 text-[11px] font-mono flex items-center justify-between shadow-xs">
          <span>Mode Tamu (Read-Only) — Masuk akun untuk memasang & mengelola iklan usaha.</span>
          <button
            type="button"
            onClick={() => setShowLoginModal(true)}
            className="bg-[#1E4E8C] hover:bg-[#153A6B] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-[2px] border border-[#102A45] cursor-pointer shrink-0 ml-2"
          >
            Masuk dengan Google
          </button>
        </div>
      )}

      {/* Catalog Grid Area */}
      <div className="flex-1 overflow-y-auto p-3 bg-[#BDCCD9]/30">
        {filteredItems.length === 0 ? (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 bg-white/70 border border-dashed border-[#7D8E9E] rounded-[3px]">
            <div className="size-12 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center text-2xl mb-2 text-[#1E4E8C]">
              🛍️
            </div>
            <div className="font-mono text-xs font-bold text-gray-800">
              {searchQuery ? "Iklan tidak ditemukan" : "Belum ada iklan usaha di kategori ini"}
            </div>
            <div className="text-[11px] text-gray-500 max-w-sm mt-1">
              {searchQuery
                ? `Tidak ada hasil untuk kata kunci "${searchQuery}". Coba kata kunci lain.`
                : "Ayo jadi yang pertama daftarin usaha, menu jastip, atau jasa IT kamu di sini!"}
            </div>
            {!searchQuery && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="mt-3 px-3 py-1 bg-[#1E4E8C] hover:bg-[#153A6B] text-white font-mono text-xs font-bold rounded-[2px] border border-[#102A45] shadow-sm cursor-pointer"
              >
                + Pasang Iklan Sekarang
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredItems.map((item) => {
              const isOwner = item.createdById === user?.id
              const canEdit = isOwner || isAdmin
              const badgeCfg = BADGE_OPTIONS.find((b) => b.value === item.badge)

              return (
                <div
                  key={item.id}
                  className={cn(
                    "bg-white border-2 rounded-[3px] p-3 flex flex-col justify-between shadow-[2px_2px_0px_rgba(0,0,0,0.15)] transition-shadow relative",
                    item.isActive
                      ? "border-t-white border-l-white border-r-[#7D8E9E] border-b-[#7D8E9E]"
                      : "border-gray-300 opacity-60 bg-gray-50"
                  )}
                >
                  {/* Top Bar inside Card: Category, Badge, & Admin Actions */}
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Category Tag */}
                        <span className="bg-slate-100 border border-slate-300 text-slate-700 text-[10px] font-mono px-1.5 py-0.5 rounded-[2px]">
                          {item.category}
                        </span>

                        {/* Badge */}
                        {item.badge && (
                          <span
                            className={cn(
                              "text-[9px] font-mono font-black px-1.5 py-0.5 rounded-[2px] border shadow-xs tracking-wider uppercase",
                              badgeCfg?.color || "bg-amber-500 text-slate-950 border-amber-600"
                            )}
                          >
                            {badgeCfg?.label || item.badge}
                          </span>
                        )}

                        {!item.isActive && (
                          <span className="bg-gray-200 text-gray-700 border border-gray-400 text-[9px] font-mono px-1 py-0.5 rounded-[2px]">
                            NONAKTIF
                          </span>
                        )}
                      </div>

                      {/* Owner / Admin Edit & Delete Actions */}
                      {canEdit && !isGuest && (
                        <div className="flex items-center gap-1">
                          <RetroActionButton
                            action="edit"
                            size="xs"
                            visual="icon"
                            tooltip="Edit iklan usaha"
                            onClick={() => handleOpenEditModal(item)}
                          />
                          <RetroActionButton
                            action="delete"
                            size="xs"
                            visual="icon"
                            tooltip="Hapus iklan usaha"
                            onClick={() => setItemToDelete(item)}
                          />
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <div className="font-mono text-sm font-bold text-[#14253D] leading-snug flex items-center justify-between gap-1">
                      <span>{item.title}</span>
                    </div>

                    {/* Tagline / Promo Singkat Highlight Box */}
                    {item.tagline && (
                      <div className="mt-1.5 p-1.5 bg-[#FFF9E6] border border-[#E6D799] rounded-[2px] text-xs font-sans text-[#735A00] font-medium leading-tight flex items-start gap-1">
                        <Sparkles className="size-3.5 shrink-0 text-amber-600 mt-0.5" />
                        <span>{item.tagline}</span>
                      </div>
                    )}

                    {/* Description */}
                    {item.description && (
                      <div className="mt-2 text-xs text-gray-600 font-sans leading-relaxed line-clamp-3">
                        {item.description}
                      </div>
                    )}

                    {/* Price Range */}
                    {item.priceRange && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-700">
                        <Tag className="size-3 text-emerald-600 shrink-0" />
                        <span>{item.priceRange}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Owner Info & Direct Contact Links */}
                  <div className="mt-3 pt-2.5 border-t border-[#E2E8F0] flex flex-col gap-2">
                    {/* Owner detail */}
                    <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono">
                      <div className="flex items-center gap-1.5 truncate">
                        <UserAvatar
                          src={item.createdByAvatar}
                          name={item.contactName}
                          size="size-4"
                          textClass="text-[8px]"
                        />
                        <span className="truncate text-gray-700 font-semibold">
                          {item.contactName}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {new Date(item.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>

                    {/* Contact Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      {item.contactWa && (
                        <a
                          href={getWhatsAppUrl(item.contactWa, item.title)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-[#25D366] hover:bg-[#1EBE5D] active:translate-y-px text-white text-[11px] font-mono font-bold py-1 px-2 rounded-[2px] border border-[#1BA850] shadow-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <MessageCircle className="size-3.5 shrink-0 fill-current" />
                          <span>Hubungi via WA</span>
                        </a>
                      )}

                      {item.contactLink && (
                        <a
                          href={
                            item.contactLink.startsWith("http")
                              ? item.contactLink
                              : `https://${item.contactLink}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-[#1E4E8C] hover:bg-[#153A6B] active:translate-y-px text-white text-[11px] font-mono font-bold py-1 px-2.5 rounded-[2px] border border-[#102A45] shadow-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                          title="Buka Website / Toko Online"
                        >
                          <ExternalLink className="size-3.5 shrink-0" />
                          <span>Link</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal: Form Tambah / Edit Iklan Usaha */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-3 select-none">
          <div className="retro-window-frame max-w-lg w-full rounded-[4px] overflow-hidden shadow-2xl bg-[#CBD5E1] flex flex-col max-h-[90vh]">
            {/* Titlebar */}
            <div className="retro-titlebar px-3 py-1.5 flex items-center justify-between font-mono text-xs font-bold text-[#14253D]">
              <div className="flex items-center gap-1.5">
                <Store className="size-3.5 text-blue-900" />
                <span>{editingItem ? "EDIT_IKLAN.EXE" : "PASANG_IKLAN.EXE"}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="hover:opacity-75 font-bold px-1 text-sm leading-none cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmitForm} className="p-3.5 flex-1 overflow-y-auto space-y-3">
              {formError && (
                <div className="p-2 bg-red-100 border border-red-300 text-red-700 text-xs font-mono rounded-[2px] flex items-center gap-1.5">
                  <AlertCircle className="size-3.5 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Row 1: Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono font-bold text-gray-800 mb-0.5">
                    Nama Usaha / Produk / Jasa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Contoh: Dimsum Mamaku / Service Laptop IT"
                    className="w-full px-2 py-1 text-xs font-mono bg-white border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-gray-800 mb-0.5">
                    Kategori
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-2 py-1 text-xs font-mono bg-white border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] focus:outline-none"
                  >
                    {LAPAK_CATEGORIES.filter((c) => c !== "Semua").map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Tagline / Promo Singkat (Muncul di Marquee Taskbar) */}
              <div>
                <label className="block text-xs font-mono font-bold text-gray-800 mb-0.5 flex items-center justify-between">
                  <span>Slogan / Promo Singkat (Running Text Taskbar)</span>
                  <span className="text-[10px] text-gray-500 font-normal">Tampil di Marquee</span>
                </label>
                <input
                  type="text"
                  value={formTagline}
                  onChange={(e) => setFormTagline(e.target.value)}
                  placeholder="Contoh: Diskon 10% buat anak IT! Dimsum ayam & udang fresh 🥟"
                  className="w-full px-2 py-1 text-xs font-mono bg-white border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
                />
              </div>

              {/* Row 3: Badge Highlight */}
              <div>
                <label className="block text-xs font-mono font-bold text-gray-800 mb-0.5">
                  Badge Highlight
                </label>
                <select
                  value={formBadge}
                  onChange={(e) => setFormBadge(e.target.value)}
                  className="w-full px-2 py-1 text-xs font-mono bg-white border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] focus:outline-none"
                >
                  <option value="">(Tanpa Badge)</option>
                  {BADGE_OPTIONS.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 4: Pengaturan Harga & Masking Rupiah */}
              <div className="p-2.5 bg-[#E2E8F0] border border-[#94A3B8] rounded-[3px] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-gray-800 flex items-center gap-1">
                    <Tag className="size-3 text-emerald-700 shrink-0" />
                    <span>Format & Nominal Harga (Rupiah)</span>
                  </label>
                  {formattedPricePreview && (
                    <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded-xs">
                      🏷️ {formattedPricePreview}
                    </span>
                  )}
                </div>

                {/* Mode Selector Radio Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 select-none">
                  {[
                    { id: "fixed", label: "Harga Pas" },
                    { id: "start_from", label: "Mulai Dari" },
                    { id: "range", label: "Rentang (Min - Max)" },
                    { id: "custom", label: "Nego / Custom" },
                  ].map((modeOption) => {
                    const isSelected = priceMode === modeOption.id
                    return (
                      <button
                        key={modeOption.id}
                        type="button"
                        onClick={() => setPriceMode(modeOption.id as PriceMode)}
                        className={cn(
                          "px-2 py-1 text-[10px] font-mono font-bold rounded-[2px] border transition-colors cursor-pointer text-center",
                          isSelected
                            ? "bg-[#1E4E8C] text-white border-[#102A45] shadow-xs"
                            : "bg-white hover:bg-slate-100 text-gray-700 border-[#CBD5E1]"
                        )}
                      >
                        {modeOption.label}
                      </button>
                    )
                  })}
                </div>

                {/* Inputs based on Mode */}
                {priceMode === "fixed" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2 relative">
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-gray-600 pointer-events-none">
                        Rp
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={priceAmount}
                        onChange={(e) => setPriceAmount(maskRupiahInput(e.target.value))}
                        placeholder="Contoh: 25.000"
                        className="w-full pl-8 pr-2 py-1 text-xs font-mono font-bold text-[#14253D] bg-white border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
                      />
                    </div>
                    <div>
                      <select
                        value={priceUnit}
                        onChange={(e) => setPriceUnit(e.target.value)}
                        className="w-full px-2 py-1 text-xs font-mono bg-white border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] focus:outline-none"
                      >
                        {PRICE_UNIT_PRESETS.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label || "Satuan"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {priceMode === "start_from" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2 relative">
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-mono font-bold text-gray-600 pointer-events-none">
                        Mulai Rp
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={priceAmount}
                        onChange={(e) => setPriceAmount(maskRupiahInput(e.target.value))}
                        placeholder="Contoh: 15.000"
                        className="w-full pl-18 pr-2 py-1 text-xs font-mono font-bold text-[#14253D] bg-white border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
                      />
                    </div>
                    <div>
                      <select
                        value={priceUnit}
                        onChange={(e) => setPriceUnit(e.target.value)}
                        className="w-full px-2 py-1 text-xs font-mono bg-white border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] focus:outline-none"
                      >
                        {PRICE_UNIT_PRESETS.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label || "Satuan"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {priceMode === "range" && (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 items-center">
                      <div className="sm:col-span-2 relative">
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-gray-600 pointer-events-none">
                          Min: Rp
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={priceMin}
                          onChange={(e) => setPriceMin(maskRupiahInput(e.target.value))}
                          placeholder="100.000"
                          className="w-full pl-15 pr-2 py-1 text-xs font-mono font-bold text-[#14253D] bg-white border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
                        />
                      </div>
                      <div className="text-center font-mono text-xs font-bold text-gray-500 hidden sm:block">
                        s/d
                      </div>
                      <div className="sm:col-span-2 relative">
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-gray-600 pointer-events-none">
                          Max: Rp
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={priceMax}
                          onChange={(e) => setPriceMax(maskRupiahInput(e.target.value))}
                          placeholder="3.500.000"
                          className="w-full pl-15 pr-2 py-1 text-xs font-mono font-bold text-[#14253D] bg-white border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-gray-600 shrink-0">Satuan (Opsional):</span>
                      <select
                        value={priceUnit}
                        onChange={(e) => setPriceUnit(e.target.value)}
                        className="flex-1 px-2 py-0.5 text-xs font-mono bg-white border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] focus:outline-none"
                      >
                        {PRICE_UNIT_PRESETS.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label || "Pilih satuan"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {priceMode === "custom" && (
                  <div>
                    <input
                      type="text"
                      value={priceCustom}
                      onChange={(e) => setPriceCustom(e.target.value)}
                      placeholder="Contoh: Nego / Sesuai Kesepakatan / Gratis Konsultasi"
                      className="w-full px-2 py-1 text-xs font-mono bg-white border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
                    />
                  </div>
                )}
              </div>

              {/* Row 4: Contact Name & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-mono font-bold text-gray-800 mb-0.5">
                    Nama Kontak / Owner <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formContactName}
                    onChange={(e) => setFormContactName(e.target.value)}
                    placeholder="Contoh: Budi (Frontend)"
                    className="w-full px-2 py-1 text-xs font-mono bg-white border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-gray-800 mb-0.5">
                    Nomor WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formContactWa}
                    onChange={(e) => setFormContactWa(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full px-2 py-1 text-xs font-mono bg-white border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
                  />
                </div>
              </div>

              {/* Row 5: Link Medsos / Toko Online (Opsional) */}
              <div>
                <label className="block text-xs font-mono font-bold text-gray-800 mb-0.5">
                  Link Website / Instagram / Shopee (Opsional)
                </label>
                <input
                  type="text"
                  value={formContactLink}
                  onChange={(e) => setFormContactLink(e.target.value)}
                  placeholder="Contoh: https://instagram.com/dimsummamaku"
                  className="w-full px-2 py-1 text-xs font-mono bg-white border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
                />
              </div>

              {/* Row 6: Description */}
              <div>
                <label className="block text-xs font-mono font-bold text-gray-800 mb-0.5">
                  Deskripsi Lengkap / Varian Menu / Info Pemesanan
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Jelaskan produk, varian rasa, estimasi PO, atau cara pengiriman..."
                  className="w-full px-2 py-1 text-xs font-mono bg-white border border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
                />
              </div>

              {/* Dialog Action Buttons */}
              <div className="pt-2 border-t border-[#7D8E9E] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="retro-button-3d px-3 py-1 text-xs font-mono font-bold rounded-[2px] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1 bg-[#1E4E8C] hover:bg-[#153A6B] active:translate-y-px text-white text-xs font-mono font-bold rounded-[2px] border border-[#102A45] shadow-sm flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Check className="size-3" />
                  <span>{isSubmitting ? "Menyimpan..." : editingItem ? "Simpan Perubahan" : "Pasang Iklan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Retro Confirm Dialog for Delete */}
      <ConfirmDialog
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={async () => {
          if (itemToDelete) {
            await deleteItem(itemToDelete.id)
            setItemToDelete(null)
          }
        }}
        title="HAPUS_IKLAN.EXE"
        message={
          <span>
            Apakah Anda yakin ingin menghapus iklan usaha{" "}
            <strong>&quot;{itemToDelete?.title}&quot;</strong>? Tindakan ini tidak dapat dibatalkan.
          </span>
        }
        confirmText="Hapus Iklan"
        variant="destructive"
      />

      {/* Google Login Gate Modal */}
      <GoogleLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  )
}
