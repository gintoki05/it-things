"use client"

import * as React from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"
import { useAuth } from "@/lib/auth"

// ============================================================
// Types
// ============================================================

export type FridgeCategory = "makanan" | "minuman" | "bumbu" | "lainnya"

export type FridgeSlot = "freezer" | "chiller" | "main_upper" | "main_lower" | "crisper" | "door"

export const FRIDGE_SLOTS: { id: FridgeSlot; label: string; sub: string; emoji: string }[] = [
  { id: "freezer", label: "Freezer Box", sub: "Beku / Es / Ice Pack", emoji: "❄️" },
  { id: "chiller", label: "Chiller Tray", sub: "Daging, Susu, Yogurt", emoji: "🥛" },
  { id: "main_upper", label: "Rak Utama 1", sub: "Kue, Makanan Matang", emoji: "🍱" },
  { id: "main_lower", label: "Rak Utama 2", sub: "Kotak Bekal, Tupperware", emoji: "🍲" },
  { id: "crisper", label: "Veggie Box", sub: "Laci Buah & Sayur", emoji: "🥬" },
  { id: "door", label: "Rak Pintu", sub: "Botol Minum & Saus", emoji: "🍶" },
]

export const FRIDGE_CATEGORIES: { value: FridgeCategory; label: string; emoji: string }[] = [
  { value: "makanan", label: "Makanan", emoji: "🍱" },
  { value: "minuman", label: "Minuman", emoji: "🧃" },
  { value: "bumbu", label: "Bumbu / Condiment", emoji: "🧂" },
  { value: "lainnya", label: "Lainnya", emoji: "📦" },
]

export interface FridgeItem {
  id: string
  name: string
  category: FridgeCategory
  slot: FridgeSlot
  notes?: string | null
  expiredAt?: string | null // ISO date string (DATE only)
  ownerId: string
  ownerName: string
  ownerAvatar?: string | null
  createdById: string
  createdAt: string
}

// ─── Helper Functions ────────────────────────────────────────

export function getDefaultSlotForCategory(category: FridgeCategory, name: string): FridgeSlot {
  const n = name.toLowerCase()
  if (n.includes("ice") || n.includes("es ") || n.includes("gel") || n.includes("frozen")) return "freezer"
  if (n.includes("buah") || n.includes("sayur") || n.includes("semangka") || n.includes("salad")) return "crisper"
  if (n.includes("botol") || n.includes("sambal") || n.includes("kecap") || n.includes("saus") || n.includes("mayo")) return "door"
  if (n.includes("susu") || n.includes("yogurt") || n.includes("keju") || n.includes("daging")) return "chiller"
  if (category === "minuman") return "door"
  if (category === "bumbu") return "door"
  return "main_upper"
}

export function isExpired(item: FridgeItem): boolean {
  if (!item.expiredAt) return false
  const expDate = new Date(item.expiredAt)
  expDate.setHours(23, 59, 59, 999)
  return expDate < new Date()
}

export function isExpiringSoon(item: FridgeItem): boolean {
  if (!item.expiredAt || isExpired(item)) return false
  const expDate = new Date(item.expiredAt)
  expDate.setHours(23, 59, 59, 999)
  const diffMs = expDate.getTime() - Date.now()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays <= 3
}

export function getExpiryStatus(item: FridgeItem): "expired" | "soon" | "ok" | "none" {
  if (!item.expiredAt) return "none"
  if (isExpired(item)) return "expired"
  if (isExpiringSoon(item)) return "soon"
  return "ok"
}

export function formatExpiredAt(expiredAt: string | null | undefined): string {
  if (!expiredAt) return "-"
  const date = new Date(expiredAt)
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
}

function mapRow(row: Record<string, unknown>): FridgeItem {
  return {
    id: row.id as string,
    name: row.name as string,
    category: (row.category as FridgeCategory) ?? "lainnya",
    slot: (row.slot as FridgeSlot) ?? "main_upper",
    notes: row.notes as string | null,
    expiredAt: row.expired_at as string | null,
    ownerId: row.owner_id as string,
    ownerName: row.owner_name as string,
    ownerAvatar: row.owner_avatar as string | null,
    createdById: row.created_by_id as string,
    createdAt: row.created_at as string,
  }
}

function isTableMissingError(err: { code?: string; message?: string }) {
  return (
    err?.code === "PGRST205" ||
    err?.code === "PGRST204" ||
    err?.code === "42P01" ||
    err?.message?.includes("schema cache") ||
    err?.message?.includes("does not exist")
  )
}

// ============================================================
// useFridgeStore hook
// ============================================================

export function useFridgeStore() {
  const { user, isAdmin, isGuest } = useAuth()
  const [items, setItems] = React.useState<FridgeItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [tableMissing, setTableMissing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // ─── Fetch ─────────────────────────────────────────────────
  const fetchItems = React.useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setItems([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from("fridge_items")
        .select("*")
        .order("created_at", { ascending: false })

      if (fetchError) {
        if (isTableMissingError(fetchError)) {
          setTableMissing(true)
          setItems([])
        } else {
          setError(fetchError.message)
        }
        return
      }

      setTableMissing(false)
      setItems((data ?? []).map(mapRow))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data kulkas")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ─── Initial fetch + Realtime ───────────────────────────────
  React.useEffect(() => {
    fetchItems()

    if (!isSupabaseConfigured || !supabase) return

    const channel = supabase
      .channel("fridge-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fridge_items" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newItem = mapRow(payload.new as Record<string, unknown>)
            setItems((prev) => {
              // Jika item ID sudah ada di list, skip agar tidak terjadi duplikasi key
              if (prev.some((item) => item.id === newItem.id)) {
                return prev
              }
              return [newItem, ...prev]
            })
          } else if (payload.eventType === "UPDATE") {
            const updated = mapRow(payload.new as Record<string, unknown>)
            setItems((prev) =>
              prev.map((item) => (item.id === updated.id ? updated : item))
            )
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as Record<string, unknown>).id
            setItems((prev) => prev.filter((item) => item.id !== deletedId))
          }

          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("fridge-changed"))
          }
        }
      )
      .subscribe()

    return () => {
      if (supabase) {
        supabase.removeChannel(channel)
      }
    }
  }, [fetchItems])

  // ─── Add Item ───────────────────────────────────────────────
  const addItem = React.useCallback(
    async (input: {
      name: string
      category: FridgeCategory
      slot?: FridgeSlot
      notes?: string
      expiredAt?: string
    }): Promise<{ success: boolean; error?: string }> => {
      if (!isSupabaseConfigured || !supabase || !user || isGuest) {
        return { success: false, error: "Tidak dapat menambah item" }
      }

      const assignedSlot = input.slot || getDefaultSlotForCategory(input.category, input.name)

      // Optimistic insert
      const tempItem: FridgeItem = {
        id: `temp-${Date.now()}`,
        name: input.name.trim(),
        category: input.category,
        slot: assignedSlot,
        notes: input.notes?.trim() || null,
        expiredAt: input.expiredAt || null,
        ownerId: user.id,
        ownerName: user.name,
        ownerAvatar: user.avatarUrl ?? null,
        createdById: user.id,
        createdAt: new Date().toISOString(),
      }
      setItems((prev) => [tempItem, ...prev])

      const { data, error: insertError } = await supabase
        .from("fridge_items")
        .insert({
          name: input.name.trim(),
          category: input.category,
          slot: assignedSlot,
          notes: input.notes?.trim() || null,
          expired_at: input.expiredAt || null,
          owner_id: user.id,
          owner_name: user.name,
          owner_avatar: user.avatarUrl ?? null,
          created_by_id: user.id,
        })
        .select()
        .single()

      if (insertError) {
        // Rollback
        setItems((prev) => prev.filter((i) => i.id !== tempItem.id))
        return { success: false, error: insertError.message }
      }

      // Replace temp with real (or clean up temp if realtime already inserted it)
      const realItem = mapRow(data as Record<string, unknown>)
      setItems((prev) => {
        const alreadyHasReal = prev.some((i) => i.id === realItem.id)
        if (alreadyHasReal) {
          return prev.filter((i) => i.id !== tempItem.id)
        }
        return prev.map((i) => (i.id === tempItem.id ? realItem : i))
      })
      return { success: true }
    },
    [user, isGuest]
  )

  // ─── Delete Item ────────────────────────────────────────────
  const deleteItem = React.useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      if (!isSupabaseConfigured || !supabase || !user || isGuest) {
        return { success: false, error: "Tidak dapat menghapus item" }
      }

      // Optimistic delete
      const snapshot = items.find((i) => i.id === id)
      setItems((prev) => prev.filter((i) => i.id !== id))

      const { error: deleteError } = await supabase
        .from("fridge_items")
        .delete()
        .eq("id", id)

      if (deleteError) {
        // Rollback
        if (snapshot) setItems((prev) => [snapshot, ...prev])
        return { success: false, error: deleteError.message }
      }

      return { success: true }
    },
    [user, isGuest, items]
  )

  // ─── Update Item ────────────────────────────────────────────
  const updateItem = React.useCallback(
    async (
      id: string,
      patch: Partial<Pick<FridgeItem, "name" | "category" | "slot" | "notes" | "expiredAt">>
    ): Promise<{ success: boolean; error?: string }> => {
      if (!isSupabaseConfigured || !supabase || !user || isGuest) {
        return { success: false, error: "Tidak dapat mengubah item" }
      }

      // Optimistic update
      const snapshot = items.find((i) => i.id === id)
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...patch } : i))
      )

      type FridgeItemUpdate = Database["public"]["Tables"]["fridge_items"]["Update"]
      const updatePayload: FridgeItemUpdate = {}
      if (patch.name !== undefined) updatePayload.name = patch.name.trim()
      if (patch.category !== undefined) updatePayload.category = patch.category
      if (patch.slot !== undefined) updatePayload.slot = patch.slot
      if (patch.notes !== undefined) updatePayload.notes = patch.notes?.trim() || null
      if (patch.expiredAt !== undefined) updatePayload.expired_at = patch.expiredAt || null

      const { error: updateError } = await supabase
        .from("fridge_items")
        .update(updatePayload)
        .eq("id", id)

      if (updateError) {
        // Rollback
        if (snapshot) setItems((prev) => prev.map((i) => (i.id === id ? snapshot : i)))
        return { success: false, error: updateError.message }
      }

      return { success: true }
    },
    [user, isGuest, items]
  )

  // ─── Move Item Slot (Drag & Drop) ──────────────────────────
  const moveItemSlot = React.useCallback(
    async (id: string, targetSlot: FridgeSlot): Promise<{ success: boolean; error?: string }> => {
      if (!isSupabaseConfigured || !supabase || !user || isGuest) {
        return { success: false, error: "Tidak dapat memindahkan item" }
      }

      const item = items.find((i) => i.id === id)
      if (!item || item.slot === targetSlot) return { success: true }

      // Optimistic update
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, slot: targetSlot } : i))
      )

      const { error: updateError } = await supabase
        .from("fridge_items")
        .update({ slot: targetSlot })
        .eq("id", id)

      if (updateError) {
        // Rollback
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, slot: item.slot } : i))
        )
        return { success: false, error: updateError.message }
      }

      return { success: true }
    },
    [user, isGuest, items]
  )

  // ─── Derived ────────────────────────────────────────────────
  const expiredCount = React.useMemo(
    () => items.filter((i) => isExpired(i)).length,
    [items]
  )

  const expiringSoonCount = React.useMemo(
    () => items.filter((i) => isExpiringSoon(i)).length,
    [items]
  )

  const canEdit = (item: FridgeItem) =>
    !isGuest && (isAdmin || (user?.id === item.ownerId))

  return {
    items,
    isLoading,
    tableMissing,
    error,
    expiredCount,
    expiringSoonCount,
    addItem,
    deleteItem,
    updateItem,
    moveItemSlot,
    refresh: fetchItems,
    canEdit,
  }
}
