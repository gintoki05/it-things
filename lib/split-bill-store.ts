"use client"

import * as React from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

export interface ItemizedOrder {
  id: string
  name: string
  price: number
  assignedTo: string // Participant name or user_id
}

export interface Participant {
  id: string
  bill_id: string
  user_id: string
  name: string
  avatarUrl?: string | null
  amountDue: number
  isPaid: boolean
  paidAt?: string | null
  isConfirmed: boolean
  items?: string[]
  created_at?: string
}

export interface SplitBill {
  id: string
  title: string
  mode: "equal" | "itemized"
  created_by_id: string
  created_by_name: string
  created_by_avatar?: string | null
  bank_name: string
  account_number: string
  account_holder: string
  qris_url?: string | null
  subtotal: number
  tax: number
  delivery_fee: number
  discount: number
  total_amount: number
  is_settled: boolean
  created_at: string
  items?: ItemizedOrder[]
  participants: Participant[]
}

export interface UserBankProfile {
  bank_name: string
  account_number: string
  account_holder: string
  qris_url?: string | null
}

export async function getUserBankProfile(userId: string): Promise<UserBankProfile | null> {
  if (!userId) return null
  const localKey = `it_things_user_bank_${userId}`

  let cached: UserBankProfile | null = null
  if (typeof window !== "undefined") {
    try {
      const item = localStorage.getItem(localKey)
      if (item) cached = JSON.parse(item)
    } catch {}
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase
        .from("team_members")
        .select("bank_name, account_number, account_holder, qris_url")
        .eq("user_id", userId)
        .maybeSingle()

      if (data && (data.bank_name || data.account_number)) {
        const profile: UserBankProfile = {
          bank_name: data.bank_name || "BCA",
          account_number: data.account_number || "",
          account_holder: data.account_holder || "",
          qris_url: data.qris_url || null,
        }
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(localKey, JSON.stringify(profile))
          } catch {}
        }
        return profile
      }
    } catch (err) {
      console.warn("getUserBankProfile error:", err)
    }
  }

  return cached
}

export async function saveUserBankProfile(
  userId: string,
  profile: UserBankProfile
): Promise<void> {
  if (!userId) return
  const localKey = `it_things_user_bank_${userId}`

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(localKey, JSON.stringify(profile))
    } catch {}
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from("team_members")
        .update({
          bank_name: profile.bank_name,
          account_number: profile.account_number,
          account_holder: profile.account_holder,
          qris_url: profile.qris_url || null,
        })
        .eq("user_id", userId)
    } catch (err) {
      console.warn("saveUserBankProfile error:", err)
    }
  }
}

// ─── Recalculate Totals Helper ─────────────────────────────────
export function recalculateBill(
  mode: "equal" | "itemized",
  subtotal: number,
  tax: number,
  deliveryFee: number,
  discount: number,
  participants: Participant[],
  items: ItemizedOrder[] = []
): { grandTotal: number; updatedParticipants: Participant[] } {
  const grandTotal = Math.max(0, subtotal + tax + deliveryFee - discount)

  if (participants.length === 0) {
    return { grandTotal, updatedParticipants: [] }
  }

  if (mode === "equal") {
    const count = participants.length
    const perPerson = Math.ceil(grandTotal / count)
    const updatedParticipants = participants.map((p) => ({
      ...p,
      amountDue: perPerson,
    }))
    return { grandTotal, updatedParticipants }
  }

  // Itemized mode: distribute net extra costs (tax + delivery - discount) proportionally
  const netExtra = tax + deliveryFee - discount
  const itemSubtotal = items.reduce((acc, it) => acc + (Number(it.price) || 0), 0)

  const updatedParticipants = participants.map((p) => {
    const userItems = items.filter(
      (it) =>
        it.assignedTo.toLowerCase() === p.name.toLowerCase() ||
        (p.user_id && it.assignedTo === p.user_id) ||
        it.assignedTo === p.id
    )
    const userSubtotal = userItems.reduce((acc, it) => acc + (Number(it.price) || 0), 0)
    const propRatio =
      itemSubtotal > 0 ? userSubtotal / itemSubtotal : 1 / participants.length
    const shareOfExtra = netExtra * propRatio
    const userFinal = Math.max(0, Math.ceil(userSubtotal + shareOfExtra))

    return {
      ...p,
      amountDue: userFinal,
      items: userItems.map((ui) => ui.name),
    }
  })

  return { grandTotal, updatedParticipants }
}

// ─── useSplitBillStore Hook ────────────────────────────────────
export function useSplitBillStore() {
  const [bills, setBills] = React.useState<SplitBill[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [tableMissing, setTableMissing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const isTableMissingError = (err: { code?: string; message?: string }) =>
    err?.code === "PGRST205" ||
    err?.code === "PGRST204" ||
    err?.code === "42P01" ||
    err?.message?.includes("schema cache") ||
    err?.message?.includes("does not exist")

  // Fetch all bills with 7 days filter and background cleanup
  const fetchBills = React.useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setBills([])
      setIsLoading(false)
      return
    }

    try {
      // Trigger background 7-day auto-purge
      Promise.resolve(supabase.rpc("cleanup_expired_split_bills")).catch(() => {})

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const { data: dbBills, error: billsErr } = await supabase
        .from("split_bills")
        .select("*")
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })

      if (billsErr) {
        if (isTableMissingError(billsErr)) {
          setTableMissing(true)
          setIsLoading(false)
          return
        }
        throw billsErr
      }

      const { data: dbParts, error: partsErr } = await supabase
        .from("split_bill_participants")
        .select("*")
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })

      if (partsErr) {
        if (isTableMissingError(partsErr)) {
          setTableMissing(true)
          setIsLoading(false)
          return
        }
        throw partsErr
      }

      setTableMissing(false)

      const mapped: SplitBill[] = (dbBills || []).map((b) => {
        const partsForBill: Participant[] = (dbParts || [])
          .filter((p) => p.bill_id === b.id)
          .map((p) => ({
            id: p.id,
            bill_id: p.bill_id,
            user_id: p.user_id,
            name: p.user_name,
            avatarUrl: p.user_avatar,
            amountDue: Number(p.amount_due) || 0,
            isPaid: Boolean(p.is_paid),
            paidAt: p.paid_at,
            isConfirmed: Boolean(p.is_confirmed),
            items: Array.isArray(p.items) ? p.items : [],
            created_at: p.created_at,
          }))
          .sort((a, bPart) => {
            // Owner / Creator selalu urutan #1
            const aIsOwner = a.user_id === b.created_by_id
            const bIsOwner = bPart.user_id === b.created_by_id
            if (aIsOwner && !bIsOwner) return -1
            if (!aIsOwner && bIsOwner) return 1

            // Sisanya urut stabil berdasarkan created_at, tie-breaker id
            const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
            const timeB = bPart.created_at ? new Date(bPart.created_at).getTime() : 0
            if (timeA !== timeB) return timeA - timeB
            return a.id.localeCompare(bPart.id)
          })

        const items: ItemizedOrder[] = Array.isArray(b.items) ? b.items : []

        return {
          id: b.id,
          title: b.title,
          mode: (b.mode as "equal" | "itemized") || "equal",
          created_by_id: b.created_by_id,
          created_by_name: b.created_by_name,
          created_by_avatar: b.created_by_avatar,
          bank_name: b.bank_name || "BCA",
          account_number: b.account_number || "",
          account_holder: b.account_holder || "",
          qris_url: b.qris_url || null,
          subtotal: Number(b.subtotal) || 0,
          tax: Number(b.tax) || 0,
          delivery_fee: Number(b.delivery_fee) || 0,
          discount: Number(b.discount) || 0,
          total_amount: Number(b.total_amount) || 0,
          is_settled: Boolean(b.is_settled),
          created_at: b.created_at,
          items,
          participants: partsForBill,
        }
      })

      setBills(mapped)
      setError(null)
    } catch (err: any) {
      console.warn("fetchBills error:", err)
      setError(err?.message || "Gagal memuat daftar split bill.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial load & Realtime subscription
  React.useEffect(() => {
    fetchBills()

    if (!isSupabaseConfigured || !supabase) return

    const channel = supabase
      .channel("split-bill-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "split_bills" },
        () => fetchBills()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "split_bill_participants" },
        () => fetchBills()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchBills])

  // ─── Create Bill ──────────────────────────────────────────────
  const createBill = async (
    payload: {
      title: string
      mode?: "equal" | "itemized"
      bank_name?: string
      account_number?: string
      account_holder?: string
      qris_url?: string | null
      subtotal?: number
      tax?: number
      delivery_fee?: number
      discount?: number
      creator: { id: string; name: string; avatarUrl?: string | null }
      initialParticipants?: Array<{ name: string; userId?: string; avatarUrl?: string | null }>
    }
  ): Promise<{ success: boolean; billId?: string; error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: "Database Supabase belum terhubung." }
    }

    try {
      const mode = payload.mode || "equal"
      const sub = Number(payload.subtotal) || 0
      const taxVal = Number(payload.tax) || 0
      const deliv = Number(payload.delivery_fee) || 0
      const disc = Number(payload.discount) || 0
      const grandTotal = Math.max(0, sub + taxVal + deliv - disc)

      const { data: newBill, error: billErr } = await supabase
        .from("split_bills")
        .insert({
          title: payload.title,
          mode,
          created_by_id: payload.creator.id,
          created_by_name: payload.creator.name,
          created_by_avatar: payload.creator.avatarUrl || null,
          bank_name: payload.bank_name || "BCA",
          account_number: payload.account_number || "",
          account_holder: payload.account_holder || payload.creator.name,
          qris_url: payload.qris_url || null,
          subtotal: sub,
          tax: taxVal,
          delivery_fee: deliv,
          discount: disc,
          total_amount: grandTotal,
          is_settled: false,
          items: [],
        })
        .select()
        .single()

      if (billErr) throw billErr

      // Add initial participants if provided (or default to creator)
      const participantsToAdd =
        payload.initialParticipants && payload.initialParticipants.length > 0
          ? payload.initialParticipants
          : [{ name: payload.creator.name, userId: payload.creator.id, avatarUrl: payload.creator.avatarUrl }]

      const perPerson = Math.ceil(grandTotal / Math.max(1, participantsToAdd.length))
      const baseTime = Date.now()

      const partRows = participantsToAdd.map((p, idx) => ({
        bill_id: newBill.id,
        user_id: p.userId || `offline-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        user_name: p.name,
        user_avatar: p.avatarUrl || null,
        amount_due: perPerson,
        is_paid: false,
        is_confirmed: false,
        items: [],
        created_at: new Date(baseTime + idx * 1000).toISOString(),
      }))

      const { error: partsErr } = await supabase
        .from("split_bill_participants")
        .insert(partRows)

      if (partsErr) {
        console.warn("Warning inserting initial participants:", partsErr)
      }

      await fetchBills()
      return { success: true, billId: newBill.id }
    } catch (err: any) {
      console.error("createBill error:", err)
      return { success: false, error: err?.message || "Gagal membuat sesi split bill." }
    }
  }

  // ─── Update Bill Details (Debounced / Direct) ─────────────────
  const updateBillDetails = async (
    billId: string,
    updates: Partial<SplitBill>
  ) => {
    // Optimistic local state update
    setBills((prev) =>
      prev.map((b) => {
        if (b.id !== billId) return b
        const merged = { ...b, ...updates }
        const { grandTotal, updatedParticipants } = recalculateBill(
          merged.mode,
          merged.subtotal,
          merged.tax,
          merged.delivery_fee,
          merged.discount,
          merged.participants,
          merged.items || []
        )
        return {
          ...merged,
          total_amount: grandTotal,
          participants: updatedParticipants,
        }
      })
    )

    if (!isSupabaseConfigured || !supabase) return

    try {
      const currentBill = bills.find((b) => b.id === billId)
      if (!currentBill) return

      const nextSubtotal = updates.subtotal !== undefined ? updates.subtotal : currentBill.subtotal
      const nextTax = updates.tax !== undefined ? updates.tax : currentBill.tax
      const nextDeliv = updates.delivery_fee !== undefined ? updates.delivery_fee : currentBill.delivery_fee
      const nextDisc = updates.discount !== undefined ? updates.discount : currentBill.discount
      const nextMode = updates.mode !== undefined ? updates.mode : currentBill.mode
      const nextItems = updates.items !== undefined ? updates.items : currentBill.items || []

      const { grandTotal, updatedParticipants } = recalculateBill(
        nextMode,
        nextSubtotal,
        nextTax,
        nextDeliv,
        nextDisc,
        currentBill.participants,
        nextItems
      )

      // 1. Update split_bills row
      const payload: any = {
        total_amount: grandTotal,
      }
      if (updates.title !== undefined) payload.title = updates.title
      if (updates.mode !== undefined) payload.mode = updates.mode
      if (updates.bank_name !== undefined) payload.bank_name = updates.bank_name
      if (updates.account_number !== undefined) payload.account_number = updates.account_number
      if (updates.account_holder !== undefined) payload.account_holder = updates.account_holder
      if (updates.qris_url !== undefined) payload.qris_url = updates.qris_url
      if (updates.subtotal !== undefined) payload.subtotal = nextSubtotal
      if (updates.tax !== undefined) payload.tax = nextTax
      if (updates.delivery_fee !== undefined) payload.delivery_fee = nextDeliv
      if (updates.discount !== undefined) payload.discount = nextDisc
      if (updates.items !== undefined) payload.items = nextItems
      if (updates.is_settled !== undefined) payload.is_settled = updates.is_settled

      const { error: billErr } = await supabase
        .from("split_bills")
        .update(payload)
        .eq("id", billId)

      if (billErr) throw billErr

      // 2. Sync participants amount_due & items in parallel
      for (const p of updatedParticipants) {
        await supabase
          .from("split_bill_participants")
          .update({
            amount_due: p.amountDue,
            items: p.items || [],
          })
          .eq("id", p.id)
      }
    } catch (err: any) {
      console.error("updateBillDetails error:", err)
      // Rollback on error
      fetchBills()
    }
  }

  // ─── Delete Bill ──────────────────────────────────────────────
  const deleteBill = async (billId: string) => {
    // Optimistic delete
    setBills((prev) => prev.filter((b) => b.id !== billId))

    if (!isSupabaseConfigured || !supabase) return

    try {
      const { error: delErr } = await supabase
        .from("split_bills")
        .delete()
        .eq("id", billId)

      if (delErr) throw delErr
    } catch (err: any) {
      console.error("deleteBill error:", err)
      fetchBills()
    }
  }

  // ─── Add Participant ──────────────────────────────────────────
  const addParticipant = async (
    billId: string,
    name: string,
    userId?: string,
    avatarUrl?: string | null
  ) => {
    const currentBill = bills.find((b) => b.id === billId)
    if (!currentBill) return

    const tempId = `temp-${Date.now()}`
    const finalUserId = userId || `offline-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const nowIso = new Date().toISOString()

    const newPart: Participant = {
      id: tempId,
      bill_id: billId,
      user_id: finalUserId,
      name: name.trim(),
      avatarUrl: avatarUrl || null,
      amountDue: 0,
      isPaid: false,
      isConfirmed: false,
      items: [],
      created_at: nowIso,
    }

    const nextParticipants = [...currentBill.participants, newPart]
    const { grandTotal, updatedParticipants } = recalculateBill(
      currentBill.mode,
      currentBill.subtotal,
      currentBill.tax,
      currentBill.delivery_fee,
      currentBill.discount,
      nextParticipants,
      currentBill.items || []
    )

    // Optimistic update
    setBills((prev) =>
      prev.map((b) =>
        b.id === billId
          ? {
              ...b,
              total_amount: grandTotal,
              participants: updatedParticipants,
            }
          : b
      )
    )

    if (!isSupabaseConfigured || !supabase) return

    try {
      const { data: insertedPart, error: insErr } = await supabase
        .from("split_bill_participants")
        .insert({
          bill_id: billId,
          user_id: finalUserId,
          user_name: name.trim(),
          user_avatar: avatarUrl || null,
          amount_due: 0,
          is_paid: false,
          is_confirmed: false,
          items: [],
          created_at: nowIso,
        })
        .select()
        .single()

      if (insErr) throw insErr

      // Update amount_due for all participants in DB
      for (const p of updatedParticipants) {
        const targetId = p.id === tempId ? insertedPart.id : p.id
        await supabase
          .from("split_bill_participants")
          .update({
            amount_due: p.amountDue,
            items: p.items || [],
          })
          .eq("id", targetId)
      }

      await supabase
        .from("split_bills")
        .update({ total_amount: grandTotal, is_settled: false })
        .eq("id", billId)

      fetchBills()
    } catch (err: any) {
      console.error("addParticipant error:", err)
      fetchBills()
    }
  }

  // ─── Remove Participant ───────────────────────────────────────
  const removeParticipant = async (billId: string, participantId: string) => {
    const currentBill = bills.find((b) => b.id === billId)
    if (!currentBill) return

    const nextParticipants = currentBill.participants.filter((p) => p.id !== participantId)
    // Also remove items assigned to this participant
    const removedPart = currentBill.participants.find((p) => p.id === participantId)
    const nextItems = (currentBill.items || []).filter(
      (it) =>
        it.assignedTo !== participantId &&
        (!removedPart || it.assignedTo.toLowerCase() !== removedPart.name.toLowerCase())
    )

    const { grandTotal, updatedParticipants } = recalculateBill(
      currentBill.mode,
      currentBill.subtotal,
      currentBill.tax,
      currentBill.delivery_fee,
      currentBill.discount,
      nextParticipants,
      nextItems
    )

    // Check if remaining are all confirmed
    const allRemainingConfirmed =
      updatedParticipants.length > 0 && updatedParticipants.every((p) => p.isConfirmed)

    // Optimistic update
    setBills((prev) =>
      prev.map((b) =>
        b.id === billId
          ? {
              ...b,
              total_amount: grandTotal,
              items: nextItems,
              is_settled: allRemainingConfirmed,
              participants: updatedParticipants,
            }
          : b
      )
    )

    if (!isSupabaseConfigured || !supabase) return

    try {
      await supabase
        .from("split_bill_participants")
        .delete()
        .eq("id", participantId)

      await supabase
        .from("split_bills")
        .update({
          total_amount: grandTotal,
          items: nextItems,
          is_settled: allRemainingConfirmed,
        })
        .eq("id", billId)

      for (const p of updatedParticipants) {
        await supabase
          .from("split_bill_participants")
          .update({
            amount_due: p.amountDue,
            items: p.items || [],
          })
          .eq("id", p.id)
      }
    } catch (err: any) {
      console.error("removeParticipant error:", err)
      fetchBills()
    }
  }

  // ─── Toggle Participant Paid ──────────────────────────────────
  const toggleParticipantPaid = async (
    billId: string,
    participantId: string,
    isPaid: boolean
  ) => {
    // Optimistic update
    setBills((prev) =>
      prev.map((b) => {
        if (b.id !== billId) return b
        return {
          ...b,
          participants: b.participants.map((p) =>
            p.id === participantId ? { ...p, isPaid } : p
          ),
        }
      })
    )

    if (!isSupabaseConfigured || !supabase) return

    try {
      const { error: updErr } = await supabase
        .from("split_bill_participants")
        .update({
          is_paid: isPaid,
          paid_at: isPaid ? new Date().toISOString() : null,
        })
        .eq("id", participantId)

      if (updErr) throw updErr
    } catch (err: any) {
      console.error("toggleParticipantPaid error:", err)
      fetchBills()
    }
  }

  // ─── Confirm Participant Paid (Admin/Creator) ─────────────────
  const confirmParticipantPaid = async (
    billId: string,
    participantId: string,
    isConfirmed: boolean
  ) => {
    let nextIsSettled = false

    // Optimistic update
    setBills((prev) =>
      prev.map((b) => {
        if (b.id !== billId) return b
        const updatedParts = b.participants.map((p) =>
          p.id === participantId
            ? { ...p, isConfirmed, isPaid: isConfirmed ? true : p.isPaid }
            : p
        )
        nextIsSettled = updatedParts.length > 0 && updatedParts.every((p) => p.isConfirmed)
        return {
          ...b,
          is_settled: nextIsSettled,
          participants: updatedParts,
        }
      })
    )

    if (!isSupabaseConfigured || !supabase) return

    try {
      const { error: updErr } = await supabase
        .from("split_bill_participants")
        .update({
          is_confirmed: isConfirmed,
          is_paid: isConfirmed ? true : undefined,
          paid_at: isConfirmed ? new Date().toISOString() : undefined,
        })
        .eq("id", participantId)

      if (updErr) throw updErr

      // Auto settle bill if all are confirmed
      await supabase
        .from("split_bills")
        .update({ is_settled: nextIsSettled })
        .eq("id", billId)
    } catch (err: any) {
      console.error("confirmParticipantPaid error:", err)
      fetchBills()
    }
  }

  // ─── Add Item Order (Itemized Mode) ───────────────────────────
  const addItemOrder = async (
    billId: string,
    item: { name: string; price: number; assignedTo: string }
  ) => {
    const currentBill = bills.find((b) => b.id === billId)
    if (!currentBill) return

    const newItem: ItemizedOrder = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: item.name.trim(),
      price: Number(item.price) || 0,
      assignedTo: item.assignedTo.trim(),
    }

    const nextItems = [...(currentBill.items || []), newItem]
    const itemSubtotal = nextItems.reduce((acc, it) => acc + it.price, 0)
    // Auto-sync subtotal if greater
    const nextSubtotal = Math.max(currentBill.subtotal, itemSubtotal)

    await updateBillDetails(billId, {
      subtotal: nextSubtotal,
      items: nextItems,
    })
  }

  // ─── Remove Item Order (Itemized Mode) ────────────────────────
  const removeItemOrder = async (billId: string, itemId: string) => {
    const currentBill = bills.find((b) => b.id === billId)
    if (!currentBill) return

    const nextItems = (currentBill.items || []).filter((it) => it.id !== itemId)
    const itemSubtotal = nextItems.reduce((acc, it) => acc + it.price, 0)

    await updateBillDetails(billId, {
      subtotal: itemSubtotal,
      items: nextItems,
    })
  }

  return {
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
  }
}
