"use client"

import * as React from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"
import { playRetroNotificationSound } from "@/lib/sound-effects"
import {
  fetchLapakItemsAction,
  createLapakItemAction,
  updateLapakItemAction,
  deleteLapakItemAction,
} from "@/app/actions/lapak"

export interface LapakItem {
  id: string
  title: string
  tagline: string
  description: string
  category: "Kuliner" | "Jasa & IT" | "Fashion" | "Kebutuhan & Hobi" | "Lainnya" | string
  priceRange: string
  contactName: string
  contactWa: string
  contactLink: string
  badge: "PROMO" | "DISKON" | "BEST SELLER" | "NEW" | "JASTIP" | "OPEN PO" | "" | string
  imageUrl: string
  isActive: boolean
  createdById: string
  createdByName: string
  createdByAvatar?: string | null
  createdAt: string
  updatedAt: string
}

export type LapakCategory = "Semua" | "Kuliner" | "Jasa & IT" | "Fashion" | "Kebutuhan & Hobi" | "Lainnya"

export const LAPAK_CATEGORIES: LapakCategory[] = [
  "Semua",
  "Kuliner",
  "Jasa & IT",
  "Fashion",
  "Kebutuhan & Hobi",
  "Lainnya",
]

export const BADGE_OPTIONS = [
  { value: "PROMO", label: "🔥 PROMO", color: "bg-rose-600 text-white border-rose-700" },
  { value: "DISKON", label: "🏷️ DISKON", color: "bg-amber-500 text-slate-950 border-amber-600" },
  { value: "BEST SELLER", label: "⭐ BEST SELLER", color: "bg-purple-600 text-white border-purple-700" },
  { value: "NEW", label: "✨ NEW", color: "bg-emerald-600 text-white border-emerald-700" },
  { value: "JASTIP", label: "🛵 JASTIP", color: "bg-blue-600 text-white border-blue-700" },
  { value: "OPEN PO", label: "📦 OPEN PO", color: "bg-teal-600 text-white border-teal-700" },
]

const STORAGE_KEY = "it_things_lapak_items_v1"

const DEMO_LAPAK_ITEMS: LapakItem[] = [
  {
    id: "00000000-0000-0000-0000-000000000101",
    title: "Dimsum Mamaku",
    tagline: "Diskon 10% buat anak IT! Dimsum fresh homemade ayam & udang 🥟",
    description: "Sedia Dimsum Ayam Jamur, Udang Keju, dan Nori Mentai. Fresh dikukus tiap pagi. Bisa pesan untuk sarapan/makan siang di kantor.",
    category: "Kuliner",
    priceRange: "Rp 15.000 - Rp 35.000",
    contactName: "Budi (Frontend)",
    contactWa: "081234567890",
    contactLink: "https://instagram.com",
    badge: "PROMO",
    imageUrl: "",
    isActive: true,
    createdById: "demo-user-1",
    createdByName: "Budi Santoso",
    createdByAvatar: null,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "00000000-0000-0000-0000-000000000102",
    title: "Jasa Repaste & Clean Laptop IT",
    tagline: "Laptop lemot / panas? Bersihin fan & ganti thermal paste Honeywell PTM7950 💻",
    description: "Jasa deep clean debu kipas laptop/PC kantor, ganti thermal paste premium (Honeywell PTM7950 / Arctic MX-4), instal ulang OS & optimasi Windows.",
    category: "Jasa & IT",
    priceRange: "Rp 50.000 - Rp 150.000",
    contactName: "Andi (DevOps)",
    contactWa: "081987654321",
    contactLink: "",
    badge: "BEST SELLER",
    imageUrl: "",
    isActive: true,
    createdById: "demo-user-2",
    createdByName: "Andi Wijaya",
    createdByAvatar: null,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "00000000-0000-0000-0000-000000000103",
    title: "Kopi Cold Brew Botolan 250ml",
    tagline: "Stock kopi seduh dingin siap minum di kulkas pantry ☕",
    description: "100% Arabica Gayo & Robusta Dampit. Varian: Americano Manis Tipis, Creamy Latte Gula Aren, dan Hazelnut Milk.",
    category: "Kuliner",
    priceRange: "Rp 18.000 / botol",
    contactName: "Citra (UI/UX)",
    contactWa: "085678901234",
    contactLink: "",
    badge: "NEW",
    imageUrl: "",
    isActive: true,
    createdById: "demo-user-3",
    createdByName: "Citra Lestari",
    createdByAvatar: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

function mapDbToLapakItem(row: Record<string, unknown>): LapakItem {
  return {
    id: String(row.id),
    title: String(row.title || ""),
    tagline: String(row.tagline || ""),
    description: String(row.description || ""),
    category: String(row.category || "Kuliner"),
    priceRange: String(row.price_range || ""),
    contactName: String(row.contact_name || ""),
    contactWa: String(row.contact_wa || ""),
    contactLink: String(row.contact_link || ""),
    badge: String(row.badge || ""),
    imageUrl: String(row.image_url || ""),
    isActive: Boolean(row.is_active ?? true),
    createdById: String(row.created_by_id || ""),
    createdByName: String(row.created_by_name || ""),
    createdByAvatar: (row.created_by_avatar as string | null) || null,
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  }
}

// ─── Shared In-Memory State & Deduplication ───────────────────
let cachedLapakItems: LapakItem[] = []
let inFlightLapakPromise: Promise<LapakItem[]> | null = null
const lapakListeners = new Set<(items: LapakItem[]) => void>()

function getInitialCachedLapakItems(): LapakItem[] {
  if (cachedLapakItems.length > 0) return cachedLapakItems
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const clean = parsed.filter(
            (i: any) => !i.id?.startsWith("00000000-0000-0000-0000-00000000010")
          )
          if (clean.length > 0) {
            cachedLapakItems = clean
            return cachedLapakItems
          }
        }
      }
    } catch {}
  }
  return isSupabaseConfigured ? [] : DEMO_LAPAK_ITEMS
}

export function hydrateLapakItems(rows: any[] | null) {
  if (!rows || !Array.isArray(rows)) return
  const mapped = rows.map((r) => mapDbToLapakItem(r))
  cachedLapakItems = mapped
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped))
  }
  lapakListeners.forEach((listener) => listener(mapped))
}

async function fetchLapakItemsDeduplicated(): Promise<LapakItem[]> {
  if (inFlightLapakPromise) {
    return inFlightLapakPromise
  }

  inFlightLapakPromise = (async () => {
    if (!isSupabaseConfigured) {
      if (cachedLapakItems.length === 0) {
        cachedLapakItems = DEMO_LAPAK_ITEMS
      }
      return cachedLapakItems
    }

    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token || null
      const { data, error } = await fetchLapakItemsAction(token)

      if (!error && data) {
        const mapped = data.map(mapDbToLapakItem)
        cachedLapakItems = mapped
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped))
        }
        lapakListeners.forEach((listener) => listener(mapped))
      }
    } catch (err) {
      console.warn("fetchLapakItemsDeduplicated error:", err)
    } finally {
      inFlightLapakPromise = null
    }

    return cachedLapakItems
  })()

  return inFlightLapakPromise
}

export function useLapakStore() {
  const { user, isGuest, isAdmin } = useAuth()
  const [items, setItems] = React.useState<LapakItem[]>(() => getInitialCachedLapakItems())
  const [isLoading, setIsLoading] = React.useState(false)
  const [tableMissing, setTableMissing] = React.useState(false)
  const [isUsingSupabase, setIsUsingSupabase] = React.useState(true)

  const isTableMissingError = (err: { code?: string; message?: string } | null | undefined) =>
    err?.code === "PGRST205" ||
    err?.code === "PGRST204" ||
    err?.code === "42P01" ||
    err?.message?.includes("schema cache") ||
    err?.message?.includes("does not exist")

  const fetchItems = React.useCallback(async () => {
    setIsLoading(true)
    const result = await fetchLapakItemsDeduplicated()
    setItems(result)
    setIsLoading(false)
  }, [])

  // Realtime subscription & shared listener
  React.useEffect(() => {
    const listener = (newItems: LapakItem[]) => setItems(newItems)
    lapakListeners.add(listener)

    fetchItems()

    if (!isSupabaseConfigured || !supabase) {
      return () => {
        lapakListeners.delete(listener)
      }
    }

    const channelName = `lapak-realtime-${Math.random().toString(36).substring(2, 8)}`
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lapak_items" },
        () => {
          fetchLapakItemsDeduplicated()
        }
      )
      .subscribe()

    return () => {
      lapakListeners.delete(listener)
      if (supabase) {
        supabase.removeChannel(channel)
      }
    }
  }, [fetchItems])

  // Save to local cache helper
  const updateLocalState = React.useCallback((newItems: LapakItem[]) => {
    setItems(newItems)
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems))
      } catch (e) {
        console.warn("Gagal menyimpan lapak ke localStorage:", e)
      }
    }
  }, [])

  // 1. Create Lapak Item
  const createItem = React.useCallback(
    async (itemData: {
      title: string
      tagline: string
      description: string
      category: string
      priceRange: string
      contactName: string
      contactWa: string
      contactLink: string
      badge: string
      imageUrl?: string
    }) => {
      if (isGuest) {
        return { success: false, message: "Mode tamu tidak dapat menambah iklan." }
      }

      const newItem: LapakItem = {
        id: crypto.randomUUID(),
        title: itemData.title.trim(),
        tagline: itemData.tagline.trim(),
        description: itemData.description.trim(),
        category: itemData.category || "Kuliner",
        priceRange: itemData.priceRange.trim(),
        contactName: itemData.contactName.trim() || user?.name || "Anggota Tim",
        contactWa: itemData.contactWa.trim(),
        contactLink: itemData.contactLink.trim(),
        badge: itemData.badge || "",
        imageUrl: itemData.imageUrl?.trim() || "",
        isActive: true,
        createdById: user?.id || "demo-user",
        createdByName: user?.name || "Anggota Tim",
        createdByAvatar: user?.avatarUrl || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Optimistic update
      const previousItems = [...items]
      updateLocalState([newItem, ...previousItems])
      playRetroNotificationSound()

      if (!isSupabaseConfigured) {
        return { success: true, item: newItem }
      }

      try {
        const token = (await supabase?.auth.getSession())?.data.session?.access_token || null
        const res = await createLapakItemAction(
          {
            id: newItem.id,
            title: newItem.title,
            tagline: newItem.tagline,
            description: newItem.description,
            category: newItem.category,
            price_range: newItem.priceRange,
            contact_name: newItem.contactName,
            contact_wa: newItem.contactWa,
            contact_link: newItem.contactLink,
            badge: newItem.badge,
            image_url: newItem.imageUrl,
            is_active: newItem.isActive,
            created_by_id: newItem.createdById,
            created_by_name: newItem.createdByName,
            created_by_avatar: newItem.createdByAvatar,
          },
          token
        )

        if (!res.success) {
          console.error("Gagal menyimpan lapak ke Supabase:", res.error)
          // Rollback on error
          updateLocalState(previousItems)
          return { success: false, message: res.error || "Gagal menyimpan iklan." }
        }

        return { success: true, item: newItem }
      } catch (err: any) {
        updateLocalState(previousItems)
        return { success: false, message: err?.message || "Terjadi kesalahan jaringan." }
      }
    },
    [isGuest, items, updateLocalState, user]
  )

  // 2. Update Lapak Item
  const updateItem = React.useCallback(
    async (id: string, itemData: Partial<LapakItem>) => {
      if (isGuest) {
        return { success: false, message: "Mode tamu tidak dapat mengedit iklan." }
      }

      const previousItems = [...items]
      const existing = items.find((i) => i.id === id)
      if (!existing) {
        return { success: false, message: "Iklan tidak ditemukan." }
      }

      // Pastikan hanya pemilik atau Admin yang boleh edit
      const isOwner = existing.createdById === user?.id
      if (!isOwner && !isAdmin) {
        return { success: false, message: "Hanya pemilik iklan atau Admin yang dapat mengedit." }
      }

      // Optimistic update
      const updatedList = items.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            ...itemData,
            updatedAt: new Date().toISOString(),
          }
        }
        return item
      })

      updateLocalState(updatedList)
      playRetroNotificationSound()

      if (!isSupabaseConfigured) {
        return { success: true }
      }

      try {
        const payload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        }

        if (itemData.title !== undefined) payload.title = itemData.title.trim()
        if (itemData.tagline !== undefined) payload.tagline = itemData.tagline.trim()
        if (itemData.description !== undefined) payload.description = itemData.description.trim()
        if (itemData.category !== undefined) payload.category = itemData.category
        if (itemData.priceRange !== undefined) payload.price_range = itemData.priceRange.trim()
        if (itemData.contactName !== undefined) payload.contact_name = itemData.contactName.trim()
        if (itemData.contactWa !== undefined) payload.contact_wa = itemData.contactWa.trim()
        if (itemData.contactLink !== undefined) payload.contact_link = itemData.contactLink.trim()
        if (itemData.badge !== undefined) payload.badge = itemData.badge
        if (itemData.imageUrl !== undefined) payload.image_url = itemData.imageUrl.trim()
        if (itemData.isActive !== undefined) payload.is_active = itemData.isActive

        const token = (await supabase?.auth.getSession())?.data.session?.access_token || null
        const res = await updateLapakItemAction(id, payload, token)

        if (!res.success) {
          console.error("Gagal update lapak di Supabase:", res.error)
          updateLocalState(previousItems)
          return { success: false, message: res.error || "Gagal update iklan." }
        }

        return { success: true }
      } catch (err: any) {
        updateLocalState(previousItems)
        return { success: false, message: err?.message || "Terjadi kesalahan koneksi." }
      }
    },
    [isAdmin, isGuest, items, updateLocalState, user]
  )

  // 3. Delete Lapak Item
  const deleteItem = React.useCallback(
    async (id: string) => {
      if (isGuest) {
        return { success: false, message: "Mode tamu tidak dapat menghapus iklan." }
      }

      const target = items.find((i) => i.id === id)
      if (!target) return { success: false, message: "Iklan tidak ditemukan." }

      const isOwner = target.createdById === user?.id
      if (!isOwner && !isAdmin) {
        return { success: false, message: "Hanya pemilik iklan atau Admin yang dapat menghapus." }
      }

      const previousItems = [...items]
      const filtered = items.filter((i) => i.id !== id)

      // Optimistic delete
      updateLocalState(filtered)

      if (!isSupabaseConfigured) {
        return { success: true }
      }

      try {
        const token = (await supabase?.auth.getSession())?.data.session?.access_token || null
        const res = await deleteLapakItemAction(id, token)

        if (!res.success) {
          console.error("Gagal menghapus lapak dari Supabase:", res.error)
          updateLocalState(previousItems)
          return { success: false, message: res.error || "Gagal menghapus iklan." }
        }

        return { success: true }
      } catch (err: any) {
        updateLocalState(previousItems)
        return { success: false, message: err?.message || "Gagal menghapus iklan." }
      }
    },
    [isAdmin, isGuest, items, updateLocalState, user]
  )

  // Active items for ticker marquee
  const activeItems = React.useMemo(() => items.filter((i) => i.isActive), [items])

  return {
    items,
    activeItems,
    isLoading,
    tableMissing,
    isUsingSupabase,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
  }
}
