"use client"

import * as React from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"
import { useAuth } from "@/lib/auth"
import { usePicStore } from "@/lib/pic-store"

export interface PantryItem {
  id: string
  name: string
  category: string
  emoji: string
  monthlyQuota: number
  stockQty: number
  unit: string
  isActive: boolean
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface PantryLog {
  id: string
  itemId: string
  userId: string
  userName: string
  userAvatar?: string | null
  quantity: number
  periodMonth: string // Format: YYYY-MM
  notes?: string | null
  loggedById: string
  loggedByName: string
  createdAt: string
}

export interface PantryRestock {
  id: string
  itemId: string
  quantity: number
  notes?: string | null
  restockedById: string
  restockedByName: string
  createdAt: string
}

export interface MemberConsumption {
  userId: string
  userName: string
  userAvatar?: string | null
  totalTaken: number
  isOverquota: boolean
  overquotaAmount: number
  quota: number
  logs: PantryLog[]
}

export function getCurrentPeriodMonth(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

export function formatPeriodMonthDisplay(period: string): string {
  if (!period) return ""
  const [year, month] = period.split("-")
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1)
  return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
}

export function usePantryStore() {
  const { user, isAdmin, isGuest } = useAuth()
  const { isPantryPic } = usePicStore()
  const canManagePantry = Boolean(!isGuest && (isAdmin || isPantryPic))

  const [items, setItems] = React.useState<PantryItem[]>([])
  const [logs, setLogs] = React.useState<PantryLog[]>([])
  const [restocks, setRestocks] = React.useState<PantryRestock[]>([])
  const [selectedPeriod, setSelectedPeriod] = React.useState<string>(getCurrentPeriodMonth())
  const [isLoading, setIsLoading] = React.useState(true)
  const [tableMissing, setTableMissing] = React.useState(false)
  const [isUsingSupabase, setIsUsingSupabase] = React.useState(false)

  const isTableMissingError = (err: { code?: string; message?: string }) =>
    err?.code === "PGRST205" ||
    err?.code === "PGRST204" ||
    err?.code === "42P01" ||
    err?.message?.includes("schema cache") ||
    err?.message?.includes("does not exist")

  const fetchItems = React.useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from("pantry_items")
        .select("*")
        .order("created_at", { ascending: true })

      if (error) {
        if (isTableMissingError(error)) {
          setTableMissing(true)
        } else {
          console.error("Error fetching pantry items:", error)
        }
        return
      }

      setIsUsingSupabase(true)
      setTableMissing(false)
      if (data) {
        const mapped: PantryItem[] = data.map((d: Record<string, unknown>) => ({
          id: String(d.id),
          name: String(d.name || ""),
          category: String(d.category || "Snack"),
          emoji: String(d.emoji || "🍜"),
          monthlyQuota: Number(d.monthly_quota ?? 2),
          stockQty: Number(d.stock_qty ?? 0),
          unit: String(d.unit || "pcs"),
          isActive: Boolean(d.is_active ?? true),
          createdById: String(d.created_by_id || ""),
          createdAt: String(d.created_at || ""),
          updatedAt: String(d.updated_at || ""),
        }))
        setItems(mapped)
      }
    } catch (err) {
      console.error("Unexpected error fetching pantry items:", err)
    }
  }, [])

  const fetchLogs = React.useCallback(async (period: string) => {
    if (!isSupabaseConfigured || !supabase) return

    try {
      const { data, error } = await supabase
        .from("pantry_logs")
        .select("*")
        .eq("period_month", period)
        .order("created_at", { ascending: false })

      if (error) {
        if (isTableMissingError(error)) {
          setTableMissing(true)
        } else {
          console.error("Error fetching pantry logs:", error)
        }
        return
      }

      if (data) {
        const mapped: PantryLog[] = data.map((d: Record<string, unknown>) => ({
          id: String(d.id),
          itemId: String(d.item_id),
          userId: String(d.user_id),
          userName: String(d.user_name || "Anonymous"),
          userAvatar: d.user_avatar ? String(d.user_avatar) : null,
          quantity: Number(d.quantity || 1),
          periodMonth: String(d.period_month),
          notes: d.notes ? String(d.notes) : null,
          loggedById: String(d.logged_by_id),
          loggedByName: String(d.logged_by_name || ""),
          createdAt: String(d.created_at || ""),
        }))
        setLogs(mapped)
      }
    } catch (err) {
      console.error("Unexpected error fetching pantry logs:", err)
    }
  }, [])

  const fetchRestocks = React.useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return

    try {
      const { data, error } = await supabase
        .from("pantry_restocks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30)

      if (error) {
        if (!isTableMissingError(error)) {
          console.error("Error fetching pantry restocks:", error)
        }
        return
      }

      if (data) {
        const mapped: PantryRestock[] = data.map((d: Record<string, unknown>) => ({
          id: String(d.id),
          itemId: String(d.item_id),
          quantity: Number(d.quantity || 0),
          notes: d.notes ? String(d.notes) : null,
          restockedById: String(d.restocked_by_id),
          restockedByName: String(d.restocked_by_name || ""),
          createdAt: String(d.created_at || ""),
        }))
        setRestocks(mapped)
      }
    } catch (err) {
      console.error("Unexpected error fetching pantry restocks:", err)
    }
  }, [])

  // Initial fetch
  React.useEffect(() => {
    let mounted = true
    const init = async () => {
      setIsLoading(true)
      await Promise.all([fetchItems(), fetchLogs(selectedPeriod), fetchRestocks()])
      if (mounted) setIsLoading(false)
    }
    init()
    return () => {
      mounted = false
    }
  }, [fetchItems, fetchLogs, fetchRestocks, selectedPeriod])

  // Realtime subscription
  React.useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return

    const channelName = `pantry-realtime-${Math.random().toString(36).substring(2, 8)}`
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pantry_items" },
        () => {
          fetchItems()
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("pantry-changed"))
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pantry_logs" },
        () => {
          fetchLogs(selectedPeriod)
          fetchItems()
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pantry_restocks" },
        () => {
          fetchRestocks()
          fetchItems()
        }
      )
      .subscribe()

    return () => {
      if (supabase) {
        supabase.removeChannel(channel)
      }
    }
  }, [fetchItems, fetchLogs, fetchRestocks, selectedPeriod])

  // Ambil Item (Catat Pengambilan)
  const takeItem = async ({
    itemId,
    quantity = 1,
    notes,
    targetUserId,
    targetUserName,
    targetUserAvatar,
  }: {
    itemId: string
    quantity?: number
    notes?: string
    targetUserId?: string
    targetUserName?: string
    targetUserAvatar?: string | null
  }) => {
    if (!user || !supabase) {
      return { success: false, error: "Silakan login terlebih dahulu." }
    }

    const item = items.find((i) => i.id === itemId)
    if (!item) {
      return { success: false, error: "Item tidak ditemukan." }
    }

    const currentUserId = user.id
    const currentUserName = user.name || user.email?.split("@")[0] || "User"
    const currentUserAvatar = user.avatarUrl || null

    const finalUserId = targetUserId || currentUserId
    const finalUserName = targetUserName || currentUserName
    const finalUserAvatar = targetUserAvatar !== undefined ? targetUserAvatar : currentUserAvatar

    const tempId = crypto.randomUUID()
    const newLog: PantryLog = {
      id: tempId,
      itemId,
      userId: finalUserId,
      userName: finalUserName,
      userAvatar: finalUserAvatar,
      quantity,
      periodMonth: selectedPeriod,
      notes: notes || null,
      loggedById: currentUserId,
      loggedByName: currentUserName,
      createdAt: new Date().toISOString(),
    }

    // Optimistic UI updates
    setLogs((prev) => [newLog, ...prev])
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, stockQty: Math.max(0, i.stockQty - quantity) } : i
      )
    )

    try {
      const { data, error } = await supabase
        .from("pantry_logs")
        .insert({
          item_id: itemId,
          user_id: finalUserId,
          user_name: finalUserName,
          user_avatar: finalUserAvatar,
          quantity,
          period_month: selectedPeriod,
          notes: notes || null,
          logged_by_id: currentUserId,
          logged_by_name: currentUserName,
        })
        .select()
        .single()

      if (error) {
        // Rollback
        setLogs((prev) => prev.filter((l) => l.id !== tempId))
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId ? { ...i, stockQty: i.stockQty + quantity } : i
          )
        )
        return { success: false, error: error.message }
      }

      if (data) {
        setLogs((prev) =>
          prev.map((l) =>
            l.id === tempId
              ? {
                  ...l,
                  id: String(data.id),
                  createdAt: String(data.created_at),
                }
              : l
          )
        )
      }

      return { success: true }
    } catch (err) {
      // Rollback
      setLogs((prev) => prev.filter((l) => l.id !== tempId))
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, stockQty: i.stockQty + quantity } : i
        )
      )
      return { success: false, error: (err as Error).message }
    }
  }

  // Hapus Log
  const deleteLog = async (logId: string) => {
    if (!supabase) return { success: false, error: "Database tidak terhubung." }
    const targetLog = logs.find((l) => l.id === logId)
    if (!targetLog) return { success: false, error: "Catatan tidak ditemukan." }

    // Optimistic remove
    setLogs((prev) => prev.filter((l) => l.id !== logId))
    setItems((prev) =>
      prev.map((i) =>
        i.id === targetLog.itemId
          ? { ...i, stockQty: i.stockQty + targetLog.quantity }
          : i
      )
    )

    try {
      const { error } = await supabase.from("pantry_logs").delete().eq("id", logId)
      if (error) {
        // Rollback
        setLogs((prev) => [targetLog, ...prev])
        setItems((prev) =>
          prev.map((i) =>
            i.id === targetLog.itemId
              ? { ...i, stockQty: Math.max(0, i.stockQty - targetLog.quantity) }
              : i
          )
        )
        return { success: false, error: error.message }
      }
      return { success: true }
    } catch (err) {
      // Rollback
      setLogs((prev) => [targetLog, ...prev])
      setItems((prev) =>
        prev.map((i) =>
          i.id === targetLog.itemId
            ? { ...i, stockQty: Math.max(0, i.stockQty - targetLog.quantity) }
            : i
        )
      )
      return { success: false, error: (err as Error).message }
    }
  }

  // Restock Stok Fisik (Admin / PIC Pantry Only)
  const restockItem = async ({
    itemId,
    quantity,
    notes,
  }: {
    itemId: string
    quantity: number
    notes?: string
  }) => {
    if (!user || !canManagePantry || !supabase) {
      return { success: false, error: "Hanya Admin atau PIC Pantry yang dapat menambah stok." }
    }

    const currentUserId = user.id
    const currentUserName = user.name || "Admin/PIC"

    // Optimistic
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, stockQty: i.stockQty + quantity } : i
      )
    )

    try {
      const { error } = await supabase.from("pantry_restocks").insert({
        item_id: itemId,
        quantity,
        notes: notes || null,
        restocked_by_id: currentUserId,
        restocked_by_name: currentUserName,
      })

      if (error) {
        // Rollback
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId ? { ...i, stockQty: Math.max(0, i.stockQty - quantity) } : i
          )
        )
        return { success: false, error: error.message }
      }

      await fetchRestocks()
      return { success: true }
    } catch (err) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, stockQty: Math.max(0, i.stockQty - quantity) } : i
        )
      )
      return { success: false, error: (err as Error).message }
    }
  }

  // Tambah Item Baru (Admin / PIC Pantry Only)
  const createItem = async (newItem: {
    name: string
    category: string
    emoji: string
    monthlyQuota: number
    stockQty: number
    unit: string
  }) => {
    if (!user || !canManagePantry || !supabase) {
      return { success: false, error: "Hanya Admin atau PIC Pantry yang dapat menambah item." }
    }

    try {
      const { data, error } = await supabase
        .from("pantry_items")
        .insert({
          name: newItem.name.trim(),
          category: newItem.category.trim() || "Snack",
          emoji: newItem.emoji || "🍜",
          monthly_quota: newItem.monthlyQuota,
          stock_qty: newItem.stockQty,
          unit: newItem.unit.trim() || "pcs",
          created_by_id: user.id,
        })
        .select()
        .single()

      if (error) return { success: false, error: error.message }

      if (data) {
        setItems((prev) => [
          ...prev,
          {
            id: String(data.id),
            name: String(data.name),
            category: String(data.category),
            emoji: String(data.emoji),
            monthlyQuota: Number(data.monthly_quota),
            stockQty: Number(data.stock_qty),
            unit: String(data.unit),
            isActive: Boolean(data.is_active),
            createdById: String(data.created_by_id),
            createdAt: String(data.created_at),
            updatedAt: String(data.updated_at),
          },
        ])
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("pantry-changed"))
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  // Update Item (Admin / PIC Pantry Only)
  const updateItem = async (
    itemId: string,
    updates: Partial<{
      name: string
      category: string
      emoji: string
      monthlyQuota: number
      stockQty: number
      unit: string
      isActive: boolean
    }>
  ) => {
    if (!user || !canManagePantry || !supabase) {
      return { success: false, error: "Hanya Admin atau PIC Pantry yang dapat mengubah item." }
    }

    const payload: Database["public"]["Tables"]["pantry_items"]["Update"] = {
      updated_at: new Date().toISOString(),
    }
    if (updates.name !== undefined) payload.name = updates.name.trim()
    if (updates.category !== undefined) payload.category = updates.category.trim()
    if (updates.emoji !== undefined) payload.emoji = updates.emoji
    if (updates.monthlyQuota !== undefined) payload.monthly_quota = updates.monthlyQuota
    if (updates.stockQty !== undefined) payload.stock_qty = updates.stockQty
    if (updates.unit !== undefined) payload.unit = updates.unit.trim()
    if (updates.isActive !== undefined) payload.is_active = updates.isActive

    try {
      const { error } = await supabase
        .from("pantry_items")
        .update(payload)
        .eq("id", itemId)

      if (error) return { success: false, error: error.message }

      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? {
                ...i,
                ...(updates.name !== undefined && { name: updates.name.trim() }),
                ...(updates.category !== undefined && { category: updates.category.trim() }),
                ...(updates.emoji !== undefined && { emoji: updates.emoji }),
                ...(updates.monthlyQuota !== undefined && { monthlyQuota: updates.monthlyQuota }),
                ...(updates.stockQty !== undefined && { stockQty: updates.stockQty }),
                ...(updates.unit !== undefined && { unit: updates.unit.trim() }),
                ...(updates.isActive !== undefined && { isActive: updates.isActive }),
              }
            : i
        )
      )
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("pantry-changed"))
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  // Hapus Item (Admin / PIC Pantry Only)
  const deleteItem = async (itemId: string) => {
    if (!user || !canManagePantry || !supabase) {
      return { success: false, error: "Hanya Admin atau PIC Pantry yang dapat menghapus item." }
    }

    try {
      const { error } = await supabase.from("pantry_items").delete().eq("id", itemId)
      if (error) return { success: false, error: error.message }

      setItems((prev) => prev.filter((i) => i.id !== itemId))
      setLogs((prev) => prev.filter((l) => l.itemId !== itemId))
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("pantry-changed"))
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  // Helpers untuk kalkulasi kuota & overquota
  const getUserQuotaInfo = React.useCallback(
    (itemId: string, targetUserId: string) => {
      const item = items.find((i) => i.id === itemId)
      const quota = item ? item.monthlyQuota : 2
      const userLogs = logs.filter(
        (l) => l.itemId === itemId && l.userId === targetUserId
      )
      const taken = userLogs.reduce((sum, l) => sum + l.quantity, 0)
      const remaining = Math.max(0, quota - taken)
      const isOverquota = taken > quota
      const overquotaAmount = isOverquota ? taken - quota : 0

      return {
        taken,
        quota,
        remaining,
        isOverquota,
        overquotaAmount,
      }
    },
    [items, logs]
  )

  const getMemberConsumptions = React.useCallback(
    (itemId?: string): MemberConsumption[] => {
      const filteredLogs = itemId ? logs.filter((l) => l.itemId === itemId) : logs
      const map: Record<string, MemberConsumption> = {}

      for (const log of filteredLogs) {
        const item = items.find((i) => i.id === log.itemId)
        const itemQuota = item?.monthlyQuota ?? 2

        if (!map[log.userId]) {
          map[log.userId] = {
            userId: log.userId,
            userName: log.userName,
            userAvatar: log.userAvatar,
            totalTaken: 0,
            isOverquota: false,
            overquotaAmount: 0,
            quota: itemQuota,
            logs: [],
          }
        }
        map[log.userId].totalTaken += log.quantity
        map[log.userId].logs.push(log)
      }

      // Hitung status overquota
      const list = Object.values(map)
      for (const member of list) {
        if (itemId) {
          const item = items.find((i) => i.id === itemId)
          const quota = item?.monthlyQuota ?? 2
          member.quota = quota
          member.isOverquota = member.totalTaken > quota
          member.overquotaAmount = member.isOverquota ? member.totalTaken - quota : 0
        } else {
          // General overquota check across items
          let hasOver = false
          let totalExcess = 0
          for (const item of items) {
            const takenForItem = member.logs
              .filter((l) => l.itemId === item.id)
              .reduce((sum, l) => sum + l.quantity, 0)
            if (takenForItem > item.monthlyQuota) {
              hasOver = true
              totalExcess += takenForItem - item.monthlyQuota
            }
          }
          member.isOverquota = hasOver
          member.overquotaAmount = totalExcess
        }
      }

      // Sort by totalTaken descending, lalu overquota descending
      return list.sort((a, b) => b.totalTaken - a.totalTaken)
    },
    [items, logs]
  )

  const getUserItemLogs = React.useCallback(
    (itemId: string, targetUserId?: string) => {
      const uid = targetUserId || user?.id
      if (!uid) return []
      return logs.filter((l) => l.itemId === itemId && (l.userId === uid || l.loggedById === uid))
    },
    [logs, user?.id]
  )

  const cancelTakeItem = async (itemId: string, targetUserId?: string) => {
    const userItemLogs = getUserItemLogs(itemId, targetUserId)
    if (userItemLogs.length === 0) {
      return { success: false, error: "Belum ada catatan pengambilan untuk item ini." }
    }
    const latest = userItemLogs[0]
    return await deleteLog(latest.id)
  }

  return {
    items,
    logs,
    restocks,
    selectedPeriod,
    setSelectedPeriod,
    isLoading,
    tableMissing,
    isUsingSupabase,
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
    canManagePantry,
    refresh: async () => {
      await Promise.all([fetchItems(), fetchLogs(selectedPeriod), fetchRestocks()])
    },
  }
}
