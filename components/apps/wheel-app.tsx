"use client"

import * as React from "react"
import { useAuth } from "@/lib/auth"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { 
  Sparkles, 
  RotateCw, 
  Plus, 
  Trash2, 
  ExternalLink, 
  History, 
  Filter, 
  Utensils, 
  Award,
  MapPin,
  Copy,
  Check,
  RotateCcw,
  X,
  Quote,
  Bike
} from "lucide-react"

export interface PlaceItem {
  id: string
  name: string
  category: string
  budget_level: "hemat" | "sedang" | "sultan"
  service_type: "dine_in" | "delivery" | "both"
  maps_url?: string
  notes?: string
  proposed_by_name?: string
}

export interface SpinHistory {
  id: string
  place_name: string
  category?: string
  spun_by_name: string
  created_at: string
}

const DEFAULT_PLACES: PlaceItem[] = [
  { id: "1", name: "Warteg Bahari", category: "Warteg/Budget", budget_level: "hemat", service_type: "both", notes: "Murah meriah, lauk banyak" },
  { id: "2", name: "Nasi Padang Sederhana", category: "Resto", budget_level: "sedang", service_type: "both", notes: "Rendang & ayam pop juara" },
  { id: "3", name: "Mie Gacoan", category: "Fast Food", budget_level: "hemat", service_type: "delivery", notes: "Pedes nampol + dimsum udang" },
  { id: "4", name: "HokBen", category: "Fast Food", budget_level: "sedang", service_type: "both", notes: "Simple Set Teriyaki & Salad" },
  { id: "5", name: "Ayam Geprek Bensu", category: "Fast Food", budget_level: "hemat", service_type: "delivery", notes: "Level 3 pas mantap" },
  { id: "6", name: "Bakso Solo Pak Kumis", category: "Resto", budget_level: "hemat", service_type: "dine_in", notes: "Kuah kaldu gurih & tetelan" },
  { id: "7", name: "Sate Khas Senayan", category: "Resto", budget_level: "sultan", service_type: "both", notes: "Habis gajian traktiran tim" },
  { id: "8", name: "Kopitiam / Kafe Sebelah", category: "Kafe", budget_level: "sedang", service_type: "dine_in", notes: "Kaya toast + Kopi Tarik" },
]

const WHEEL_COLORS = [
  "#2E5AA8",
  "#E85E55",
  "#449A32",
  "#E5BF3B",
  "#8E44AD",
  "#D35400",
  "#16A085",
  "#2C3E50",
  "#D81B60",
  "#3949AB",
]

export function WheelApp() {
  const { user, isGuest } = useAuth()
  const [places, setPlaces] = React.useState<PlaceItem[]>(DEFAULT_PLACES)
  const [history, setHistory] = React.useState<SpinHistory[]>([])
  const [filterBudget, setFilterBudget] = React.useState<string>("all")
  const [filterType, setFilterType] = React.useState<string>("all")

  // Wheel state
  const [isSpinning, setIsSpinning] = React.useState(false)
  const [rotation, setRotation] = React.useState(0)
  const [selectedWinner, setSelectedWinner] = React.useState<PlaceItem | null>(null)
  const [copied, setCopied] = React.useState(false)

  const handleCopyWinner = React.useCallback(() => {
    if (!selectedWinner) return
    const budgetText = selectedWinner.budget_level.toUpperCase()
    const notesText = selectedWinner.notes ? `\n💡 Catatan: "${selectedWinner.notes}"` : ""
    const text = `🎯 KEPUTUSAN MAKAN SIANG:\n🍽️ ${selectedWinner.name} (${selectedWinner.category})\n💰 Budget: ${budgetText}${notesText}`

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [selectedWinner])

  const getBudgetBadge = (level: "hemat" | "sedang" | "sultan") => {
    switch (level) {
      case "hemat":
        return {
          label: "HEMAT",
          symbols: "Rp",
          className: "bg-emerald-50 text-emerald-700 border-emerald-300",
        }
      case "sedang":
        return {
          label: "SEDANG",
          symbols: "Rp Rp",
          className: "bg-amber-50 text-amber-800 border-amber-300",
        }
      case "sultan":
        return {
          label: "SULTAN",
          symbols: "Rp Rp Rp",
          className: "bg-purple-50 text-purple-700 border-purple-300",
        }
    }
  }

  const getServiceLabel = (type: "dine_in" | "delivery" | "both") => {
    switch (type) {
      case "dine_in":
        return "Dine In"
      case "delivery":
        return "Pesan Antar"
      case "both":
        return "Dine In & Antar"
    }
  }

  // Add place form
  const [showAddForm, setShowAddForm] = React.useState(false)
  const [newName, setNewName] = React.useState("")
  const [newCategory, setNewCategory] = React.useState("Warteg/Budget")
  const [newBudget, setNewBudget] = React.useState<"hemat" | "sedang" | "sultan">("hemat")
  const [newService, setNewService] = React.useState<"dine_in" | "delivery" | "both">("both")
  const [newNotes, setNewNotes] = React.useState("")

  // Fetch from Supabase
  const loadData = React.useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: dbPlaces } = await supabase
          .from("wheel_places")
          .select("*")
          .order("created_at", { ascending: false })

        if (dbPlaces && dbPlaces.length > 0) {
          setPlaces(dbPlaces)
        }

        const { data: dbHistory } = await supabase
          .from("wheel_spins")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(8)

        if (dbHistory) {
          setHistory(dbHistory)
        }
      } catch (e) {
        console.warn("Could not fetch wheel data from Supabase:", e)
      }
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  // Filtered places for the wheel
  const activePlaces = React.useMemo(() => {
    return places.filter((p) => {
      if (filterBudget !== "all" && p.budget_level !== filterBudget) return false
      if (filterType !== "all" && p.service_type !== "both" && p.service_type !== filterType)
        return false
      return true
    })
  }, [places, filterBudget, filterType])

  // Spin Logic
  const handleSpin = () => {
    if (isSpinning || activePlaces.length === 0) return

    setSelectedWinner(null)
    setIsSpinning(true)

    // Random winner index
    const count = activePlaces.length
    const winnerIndex = Math.floor(Math.random() * count)
    const sliceAngle = 360 / count

    // Calculate rotation: multiple full rounds (5 to 8 rounds) + landing angle
    // Arrow is at the top (270 deg or 90 deg depending on coordinate)
    // Here we let arrow point at the top (0 deg)
    const extraRounds = 360 * (5 + Math.floor(Math.random() * 3))
    // Slice angle center
    const targetSliceCenter = (winnerIndex + 0.5) * sliceAngle
    const finalRotation = rotation + extraRounds + (360 - (targetSliceCenter % 360))

    setRotation(finalRotation)

    setTimeout(async () => {
      setIsSpinning(false)
      const winner = activePlaces[winnerIndex]
      setSelectedWinner(winner)

      // Record to history
      const newSpinRecord: SpinHistory = {
        id: String(Date.now()),
        place_name: winner.name,
        category: winner.category,
        spun_by_name: user?.name || "Anggota Tim",
        created_at: new Date().toISOString(),
      }

      setHistory((prev) => [newSpinRecord, ...prev.slice(0, 7)])

      if (isSupabaseConfigured && supabase && user && !isGuest && user.id !== "guest-user") {
        try {
          await supabase.from("wheel_spins").insert({
            place_id: winner.id.length > 20 ? winner.id : null,
            place_name: winner.name,
            category: winner.category,
            spun_by_id: user.id,
            spun_by_name: user.name || "Anggota Tim",
          })
        } catch (err) {
          console.warn("Could not save spin record:", err)
        }
      }
    }, 4000)
  }

  // Add Place
  const handleAddPlace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    const newItem: PlaceItem = {
      id: String(Date.now()),
      name: newName.trim(),
      category: newCategory,
      budget_level: newBudget,
      service_type: newService,
      notes: newNotes.trim() || undefined,
      proposed_by_name: user?.name || "Anggota Tim",
    }

    setPlaces((prev) => [newItem, ...prev])
    setNewName("")
    setNewNotes("")
    setShowAddForm(false)

    if (isSupabaseConfigured && supabase && user && !isGuest && user.id !== "guest-user") {
      try {
        await supabase.from("wheel_places").insert({
          name: newItem.name,
          category: newItem.category,
          budget_level: newItem.budget_level,
          service_type: newItem.service_type,
          notes: newItem.notes,
          proposed_by_id: user.id,
          proposed_by_name: user.name || "Anggota Tim",
        })
        loadData()
      } catch (err) {
        console.warn("Could not insert place:", err)
      }
    }
  }

  // Delete Place
  const handleDeletePlace = async (id: string) => {
    setPlaces((prev) => prev.filter((p) => p.id !== id))
    if (isSupabaseConfigured && supabase && id.length > 20 && user && !isGuest && user.id !== "guest-user") {
      try {
        await supabase.from("wheel_places").delete().eq("id", id)
      } catch (err) {
        console.warn("Could not delete place:", err)
      }
    }
  }

  return (
    <div className="flex flex-col gap-3 min-h-full font-sans">
      {/* Top Filter Bar */}
      <div className="bg-[#D8E0E8] border border-[#96A6B6] p-2 rounded-[2px] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1 text-[#14253D] font-bold">
            <Filter className="size-3.5 text-[#2E5AA8]" />
            <span>FILTER:</span>
          </div>

          <select
            value={filterBudget}
            onChange={(e) => setFilterBudget(e.target.value)}
            className="bg-white border border-[#7D8E9E] rounded-[2px] px-1.5 py-0.5 text-xs text-[#14253D]"
          >
            <option value="all">Semua Budget</option>
            <option value="hemat">Hemat (Warung/Kaki Lima)</option>
            <option value="sedang">Sedang (Kafe/Resto Standard)</option>
            <option value="sultan">Sultan (Traktiran/Gajian)</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white border border-[#7D8E9E] rounded-[2px] px-1.5 py-0.5 text-xs text-[#14253D]"
          >
            <option value="all">Semua Tipe</option>
            <option value="dine_in">Dine-in (Makan di Tempat)</option>
            <option value="delivery">Delivery (GoFood/GrabFood)</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
          className="px-2.5 py-1 bg-[#2E5AA8] hover:bg-[#1E4E8C] text-white font-mono text-xs font-bold rounded-[2px] flex items-center gap-1 border border-[#14253D]"
        >
          <Plus className="size-3" />
          <span>{showAddForm ? "Tutup Form" : "Tambah Tempat"}</span>
        </button>
      </div>

      {/* Add Place Drawer / Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddPlace}
          className="bg-[#EEF2F6] border-2 border-dashed border-[#7D8E9E] p-3 rounded-[3px] text-xs font-mono space-y-2"
        >
          <div className="font-bold text-[#14253D] flex items-center gap-1">
            <span>INPUT TEMPAT MAKAN BARU</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className="block text-[10px] text-gray-600 mb-0.5">Nama Resto/Warung:</label>
              <input
                type="text"
                required
                placeholder="cth: Bebek Sinjay"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-white border border-[#7D8E9E] p-1.5 rounded-[2px] text-xs font-sans"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-600 mb-0.5">Kategori:</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-white border border-[#7D8E9E] p-1.5 rounded-[2px] text-xs font-sans"
              >
                <option value="Warteg/Budget">Warteg / Budget</option>
                <option value="Fast Food">Fast Food</option>
                <option value="Kafe">Kafe / Kopi</option>
                <option value="Resto">Resto / Rumah Makan</option>
                <option value="Snack/Minuman">Snack / Minuman</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gray-600 mb-0.5">Budget Level:</label>
              <select
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value as any)}
                className="w-full bg-white border border-[#7D8E9E] p-1.5 rounded-[2px] text-xs font-sans"
              >
                <option value="hemat">Hemat (💵)</option>
                <option value="sedang">Sedang (💵💵)</option>
                <option value="sultan">Sultan (💵💵💵)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gray-600 mb-0.5">Layanan:</label>
              <select
                value={newService}
                onChange={(e) => setNewService(e.target.value as any)}
                className="w-full bg-white border border-[#7D8E9E] p-1.5 rounded-[2px] text-xs font-sans"
              >
                <option value="both">Dine-in & Delivery</option>
                <option value="dine_in">Hanya Dine-in</option>
                <option value="delivery">Hanya Delivery</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-600 mb-0.5">Catatan / Rekomendasi Menu (opsional):</label>
            <input
              type="text"
              placeholder="cth: Sambal korek pedes nampol, es teh manis jumbo"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="w-full bg-white border border-[#7D8E9E] p-1.5 rounded-[2px] text-xs font-sans"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="retro-button-3d px-3 py-1 rounded-[2px]"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-[#2E5AA8] hover:bg-[#1E4E8C] text-white font-bold rounded-[2px] border border-[#14253D]"
            >
              Simpan Tempat
            </button>
          </div>
        </form>
      )}

      {/* Main Wheel Area + History Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-3">
        {/* Wheel & Spin Stage */}
        <div className="bg-white border border-[#95A5B5] rounded-[3px] p-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[360px]">
          {/* Winner Announcement Banner */}
          {selectedWinner && (
            <div className="relative w-full max-w-md mb-3 rounded-lg border-2 border-amber-300/90 bg-gradient-to-b from-amber-50/95 via-yellow-50/90 to-amber-100/75 p-3.5 shadow-sm text-center animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
              {/* Decorative background blurs */}
              <div className="absolute -right-8 -top-8 size-20 bg-amber-300/30 rounded-full blur-xl pointer-events-none" />
              <div className="absolute -left-8 -bottom-8 size-20 bg-yellow-400/20 rounded-full blur-xl pointer-events-none" />

              {/* Header with Title Badge & Close Button */}
              <div className="relative flex items-center justify-between">
                <div className="w-6" /> {/* Spacer for centering */}
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-200/80 border border-amber-300 text-amber-900 font-mono text-[10px] sm:text-[11px] font-bold tracking-wider uppercase shadow-xs">
                  <Award className="size-3.5 text-amber-700" />
                  <span>KEPUTUSAN RODA HARI INI</span>
                  <Sparkles className="size-3 text-amber-600 animate-pulse" />
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedWinner(null)}
                  title="Tutup banner"
                  className="p-1 text-amber-700/60 hover:text-amber-900 hover:bg-amber-200/50 rounded-full transition-colors shrink-0"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              {/* Winner Name */}
              <div className="mt-2 text-center">
                <div className="font-black text-xl sm:text-2xl text-[#14253D] tracking-tight flex items-center justify-center gap-2 leading-snug">
                  <span className="text-lg select-none">🎉</span>
                  <span>{selectedWinner.name}</span>
                  <span className="text-lg select-none">🎉</span>
                </div>
              </div>

              {/* Tags / Metadata Chips */}
              <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/90 border border-amber-200/90 text-gray-700 font-medium text-[11px] shadow-2xs">
                  <Utensils className="size-3 text-amber-600" />
                  <span>{selectedWinner.category}</span>
                </span>

                {(() => {
                  const b = getBudgetBadge(selectedWinner.budget_level)
                  return (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold shadow-2xs ${b.className}`}
                    >
                      <span>{b.symbols}</span>
                      <span>•</span>
                      <span>{b.label}</span>
                    </span>
                  )
                })()}

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/90 border border-amber-200/90 text-gray-700 font-medium text-[11px] shadow-2xs">
                  <Bike className="size-3 text-amber-600" />
                  <span>{getServiceLabel(selectedWinner.service_type)}</span>
                </span>
              </div>

              {/* Notes / Quote */}
              {selectedWinner.notes && (
                <div className="mt-2.5 mx-auto max-w-sm px-3 py-1.5 rounded-md bg-white/80 border border-amber-200/80 text-[11px] text-amber-950 font-medium italic shadow-2xs flex items-center justify-center gap-1.5">
                  <Quote className="size-3 text-amber-500 shrink-0 not-italic opacity-70" />
                  <span>&ldquo;{selectedWinner.notes}&rdquo;</span>
                </div>
              )}

              {/* Quick Actions Bar */}
              <div className="mt-3 pt-2.5 border-t border-amber-200/70 flex flex-wrap items-center justify-center gap-2">
                <a
                  href={
                    selectedWinner.maps_url ||
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedWinner.name)}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] bg-white border border-[#95A5B5] hover:bg-gray-50 text-[#14253D] font-mono text-[11px] font-bold shadow-xs active:translate-y-0.5 transition-all"
                >
                  <MapPin className="size-3 text-red-600" />
                  <span>Cari Lokasi</span>
                  <ExternalLink className="size-2.5 text-gray-400" />
                </a>

                <button
                  type="button"
                  onClick={handleCopyWinner}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] bg-white border border-[#95A5B5] hover:bg-gray-50 text-[#14253D] font-mono text-[11px] font-bold shadow-xs active:translate-y-0.5 transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="size-3 text-emerald-600" />
                      <span className="text-emerald-700">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3 text-[#2E5AA8]" />
                      <span>Salin Info</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isSpinning}
                  onClick={handleSpin}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] bg-[#E85E55] hover:bg-[#D54F46] disabled:opacity-50 border border-[#8C241E] text-white font-mono text-[11px] font-bold shadow-xs active:translate-y-0.5 transition-all"
                >
                  <RotateCcw className={`size-3 ${isSpinning ? "animate-spin" : ""}`} />
                  <span>Putar Lagi</span>
                </button>
              </div>
            </div>
          )}

          {/* Interactive Wheel Graphic */}
          <div className="relative size-64 sm:size-72 flex items-center justify-center my-2">
            {/* Pointer / Arrow */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center drop-shadow-md">
              <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-red-600" />
              <div className="size-2 rounded-full bg-red-800 -mt-1" />
            </div>

            {/* Slices SVG */}
            {activePlaces.length === 0 ? (
              <div className="size-full rounded-full bg-gray-100 border-4 border-dashed border-gray-300 flex items-center justify-center text-center p-4 text-xs font-mono text-gray-500">
                Tidak ada tempat makan yang sesuai filter.
              </div>
            ) : (
              <div
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning ? "transform 4s cubic-bezier(0.15, 0.9, 0.2, 1)" : "none",
                }}
                className="size-full rounded-full border-4 border-[#14253D] shadow-xl overflow-hidden relative"
              >
                <svg viewBox="0 0 100 100" className="size-full">
                  {activePlaces.map((place, idx) => {
                    const count = activePlaces.length
                    const angle = 360 / count
                    const startAngle = idx * angle
                    const endAngle = (idx + 1) * angle

                    // Convert polar to cartesian coordinates
                    const startRad = ((startAngle - 90) * Math.PI) / 180
                    const endRad = ((endAngle - 90) * Math.PI) / 180

                    const x1 = 50 + 50 * Math.cos(startRad)
                    const y1 = 50 + 50 * Math.sin(startRad)
                    const x2 = 50 + 50 * Math.cos(endRad)
                    const y2 = 50 + 50 * Math.sin(endRad)

                    const largeArcFlag = angle > 180 ? 1 : 0
                    const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`

                    const textAngle = startAngle + angle / 2
                    const textRad = ((textAngle - 90) * Math.PI) / 180
                    const tx = 50 + 32 * Math.cos(textRad)
                    const ty = 50 + 32 * Math.sin(textRad)

                    return (
                      <g key={place.id || idx}>
                        <path
                          d={pathData}
                          fill={WHEEL_COLORS[idx % WHEEL_COLORS.length]}
                          stroke="#FFFFFF"
                          strokeWidth="0.75"
                        />
                        <text
                          x={tx}
                          y={ty}
                          fill="#FFFFFF"
                          fontSize={count > 8 ? "3.2" : "3.8"}
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="central"
                          transform={`rotate(${textAngle}, ${tx}, ${ty})`}
                          className="font-sans select-none pointer-events-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]"
                        >
                          {place.name.length > 10 ? place.name.slice(0, 9) + "…" : place.name}
                        </text>
                      </g>
                    )
                  })}
                  {/* Wheel Center Cap */}
                  <circle cx="50" cy="50" r="8" fill="#14253D" stroke="#FFFFFF" strokeWidth="1.5" />
                  <circle cx="50" cy="50" r="3" fill="#E5BF3B" />
                </svg>
              </div>
            )}
          </div>

          {/* Spin Action Button */}
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              disabled={isSpinning || activePlaces.length === 0}
              onClick={handleSpin}
              className="h-10 px-8 bg-gradient-to-b from-[#E85E55] to-[#C54139] hover:from-[#F06E65] hover:to-[#B3352E] text-white font-mono font-black text-sm uppercase tracking-wider rounded-[3px] border-2 border-[#8C241E] shadow-[2px_2px_0px_#14253D] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
            >
              <Sparkles className="size-4" />
              <span>{isSpinning ? "MEMUTAR..." : "PUTAR SEKARANG!"}</span>
            </button>
          </div>
          <div className="font-mono text-[10px] text-gray-500 mt-1">
            {activePlaces.length} opsi tempat makan siap diundi
          </div>
        </div>

        {/* Right Column: History & Place List */}
        <div className="space-y-3">
          {/* History Panel */}
          <div className="bg-white border border-[#95A5B5] rounded-[3px] p-3 space-y-2">
            <div className="font-mono text-xs font-bold text-[#14253D] flex items-center gap-1.5 pb-1 border-b border-[#CBD5E1]">
              <History className="size-3.5 text-[#2E5AA8]" />
              <span>RIWAYAT KEPUTUSAN</span>
            </div>
            {history.length === 0 ? (
              <div className="text-[11px] text-gray-500 font-mono py-2">
                Belum ada riwayat spin hari ini.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                {history.map((h, i) => (
                  <div key={h.id || i} className="p-1.5 bg-[#F4F6F9] border border-[#CBD5E1] rounded text-[11px]">
                    <div className="font-bold text-[#14253D] truncate">{h.place_name}</div>
                    <div className="text-[10px] text-gray-500 flex items-center justify-between mt-0.5">
                      <span>Oleh: {h.spun_by_name}</span>
                      <span>{new Date(h.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Place List Manager */}
          <div className="bg-white border border-[#95A5B5] rounded-[3px] p-3 space-y-2">
            <div className="font-mono text-xs font-bold text-[#14253D] flex items-center justify-between pb-1 border-b border-[#CBD5E1]">
              <div className="flex items-center gap-1.5">
                <Utensils className="size-3.5 text-[#2E5AA8]" />
                <span>DAFTAR TEMPAT ({places.length})</span>
              </div>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar">
              {places.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-1 p-1 hover:bg-[#F4F6F9] rounded text-xs border border-transparent hover:border-[#CBD5E1]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[11px] text-[#14253D] truncate">{p.name}</div>
                    <div className="text-[9px] text-gray-500">{p.category}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeletePlace(p.id)}
                    title="Hapus tempat ini"
                    className="text-gray-400 hover:text-red-600 p-0.5"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
