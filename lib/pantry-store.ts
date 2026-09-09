"use client"

import * as React from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

export interface Voter {
  id: string
  name: string
  avatarUrl?: string | null
}

export interface PantryItem {
  id: string
  name: string
  detail: string
  emoji: string
  month_period: string
  proposed_by_id: string
  proposed_by_name: string
  voters: Voter[]
  created_at: string
}

export function usePantryStore(currentMonth: string = "2026-09") {
  const [items, setItems] = React.useState<PantryItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isUsingSupabase, setIsUsingSupabase] = React.useState(false)
  const [tableMissing, setTableMissing] = React.useState(false)

  // One-time cleanup of all legacy mock/test localStorage items on initial load
  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i)
          if (key && key.startsWith("ti_pantry_")) {
            localStorage.removeItem(key)
          }
        }
      }
    } catch {}
  }, [])

  // Fetch Items & Votes from Supabase
  const fetchData = React.useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setItems([])
      setIsLoading(false)
      return
    }

    try {
      setIsUsingSupabase(true)
      const { data: dbItems, error: itemsErr } = await supabase
        .from("pantry_items")
        .select("*")
        .eq("month_period", currentMonth)
        .order("created_at", { ascending: true })

      if (itemsErr) {
        // Check if table does not exist in schema cache
        if (
          itemsErr.code === "PGRST205" ||
          itemsErr.code === "PGRST204" ||
          itemsErr.code === "42P01" ||
          itemsErr.message?.includes("schema cache") ||
          itemsErr.message?.includes("does not exist") ||
          itemsErr.message?.includes("404")
        ) {
          setTableMissing(true)
          try {
            const local = localStorage.getItem(`ti_pantry_${currentMonth}`)
            if (local) {
              setItems(JSON.parse(local))
            }
          } catch {}
          return
        }
        throw itemsErr
      }

      setTableMissing(false)

      const { data: dbVotes, error: votesErr } = await supabase
        .from("pantry_votes")
        .select("item_id, user_id, user_name, user_avatar")

      if (votesErr) throw votesErr

      const mapped: PantryItem[] = (dbItems || []).map((it) => {
        const itemVoters: Voter[] = (dbVotes || [])
          .filter((v) => v.item_id === it.id)
          .map((v) => ({
            id: v.user_id,
            name: v.user_name,
            avatarUrl: v.user_avatar,
          }))

        return {
          id: it.id,
          name: it.name,
          detail: it.detail || "",
          emoji: it.emoji || "📦",
          month_period: it.month_period,
          proposed_by_id: it.proposed_by_id,
          proposed_by_name: it.proposed_by_name,
          voters: itemVoters,
          created_at: it.created_at,
        }
      })

      setItems(mapped)
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string }
      if (
        errorObj?.code === "PGRST205" ||
        errorObj?.code === "PGRST204" ||
        errorObj?.code === "42P01" ||
        errorObj?.message?.includes("schema cache") ||
        errorObj?.message?.includes("does not exist")
      ) {
        setTableMissing(true)
        try {
          const local = localStorage.getItem(`ti_pantry_${currentMonth}`)
          if (local) {
            setItems(JSON.parse(local))
          }
        } catch {}
      } else {
        console.warn("Supabase fetch failed or tables not ready:", err)
        setItems([])
      }
    } finally {
      setIsLoading(false)
    }
  }, [currentMonth])

  // Setup initial fetch and Supabase Realtime Subscription
  React.useEffect(() => {
    fetchData()

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel("pantry-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "pantry_items" },
          () => {
            fetchData()
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "pantry_votes" },
          () => {
            fetchData()
          }
        )
        .subscribe()

      return () => {
        if (supabase) {
          supabase.removeChannel(channel)
        }
      }
    }
  }, [fetchData])

  // Toggle Vote (1 person 1 vote policy)
  const toggleVote = async (itemId: string, voter: Voter) => {
    // Optimistic UI update
    setItems((prev) => {
      const updated = prev.map((item) => {
        if (item.id !== itemId) return item
        const hasVoted = item.voters.some((v) => v.id === voter.id)
        const nextVoters = hasVoted
          ? item.voters.filter((v) => v.id !== voter.id)
          : [...item.voters, voter]

        return { ...item, voters: nextVoters }
      })

      try {
        localStorage.setItem(`ti_pantry_${currentMonth}`, JSON.stringify(updated))
      } catch {}

      return updated
    })

    // Sync to Supabase if configured and authenticated
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId)
    if (isSupabaseConfigured && supabase && isUUID && voter.id !== "guest-user") {
      const target = items.find((i) => i.id === itemId)
      const hasVoted = target?.voters.some((v) => v.id === voter.id)

      try {
        if (hasVoted) {
          await supabase
            .from("pantry_votes")
            .delete()
            .match({ item_id: itemId, user_id: voter.id })
        } else {
          await supabase.from("pantry_votes").insert({
            item_id: itemId,
            user_id: voter.id,
            user_name: voter.name,
            user_avatar: voter.avatarUrl || null,
          })
        }
      } catch (err) {
        console.error("Supabase toggleVote error:", err)
      }
    }
  }

  // Add Item
  const addItem = async (
    name: string,
    detail: string,
    emoji: string,
    user: Voter
  ) => {
    const tempId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "00000000-0000-4000-8000-" + String(Date.now()).slice(-12).padStart(12, "0")

    const newItem: PantryItem = {
      id: tempId,
      name,
      detail: detail || "Usulan baru bulan ini",
      emoji: emoji || "📦",
      month_period: currentMonth,
      proposed_by_id: user.id,
      proposed_by_name: user.name,
      voters: [user], // Otomatis vote usulannya sendiri
      created_at: new Date().toISOString(),
    }

    // Optimistic UI
    setItems((prev) => {
      const updated = [...prev, newItem]
      try {
        localStorage.setItem(`ti_pantry_${currentMonth}`, JSON.stringify(updated))
      } catch {}
      return updated
    })

    if (isSupabaseConfigured && supabase && user.id !== "guest-user") {
      try {
        const { data, error } = await supabase
          .from("pantry_items")
          .insert({
            name,
            detail: detail || "Usulan baru bulan ini",
            emoji: emoji || "📦",
            month_period: currentMonth,
            proposed_by_id: user.id,
            proposed_by_name: user.name,
            proposed_by_avatar: user.avatarUrl || null,
          })
          .select()
          .single()

        if (error) {
          if (
            error.code === "PGRST205" ||
            error.code === "PGRST204" ||
            error.code === "42P01" ||
            error.message?.includes("schema cache") ||
            error.message?.includes("does not exist")
          ) {
            setTableMissing(true)
          } else {
            console.error(
              "Supabase addItem error:",
              error.message || error.details || error.hint || error.code || JSON.stringify(error)
            )
          }
        } else if (data) {
          // Replace tempId with actual UUID from database in state
          setItems((prev) =>
            prev.map((it) => (it.id === tempId ? { ...it, id: data.id } : it))
          )

          await supabase.from("pantry_votes").insert({
            item_id: data.id,
            user_id: user.id,
            user_name: user.name,
            user_avatar: user.avatarUrl || null,
          })
          fetchData()
        }
      } catch (err: unknown) {
        const errorObj = err as { code?: string; message?: string }
        if (
          errorObj?.code === "PGRST205" ||
          errorObj?.code === "PGRST204" ||
          errorObj?.code === "42P01"
        ) {
          setTableMissing(true)
        } else {
          console.error("Supabase addItem exception:", err)
        }
      }
    }
  }

  // Delete Item
  const deleteItem = async (
    itemId: string
  ): Promise<{ success: boolean; error?: string }> => {
    // Check if UUID format
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId)

    // Optimistic UI update
    setItems((prev) => {
      const updated = prev.filter((i) => i.id !== itemId)
      try {
        localStorage.setItem(`ti_pantry_${currentMonth}`, JSON.stringify(updated))
      } catch {}
      return updated
    })

    if (isSupabaseConfigured && supabase) {
      if (!isUUID) {
        // In local buffer or non-UUID temp ID
        return { success: true }
      }

      try {
        // Step 1: Clean up votes first to prevent foreign key constraint violation
        const { error: votesError } = await supabase
          .from("pantry_votes")
          .delete()
          .eq("item_id", itemId)

        if (votesError) {
          console.warn("Supabase delete votes warning:", votesError)
        }

        // Step 2: Delete the pantry item itself
        const { error } = await supabase
          .from("pantry_items")
          .delete()
          .eq("id", itemId)

        if (error) {
          if (
            error.code === "PGRST205" ||
            error.code === "PGRST204" ||
            error.code === "42P01" ||
            error.message?.includes("schema cache") ||
            error.message?.includes("does not exist")
          ) {
            setTableMissing(true)
            // Table doesn't exist in Supabase database, item already deleted locally!
            return { success: true }
          }
          console.error("Supabase deleteItem error:", error)
          await fetchData()
          return {
            success: false,
            error: error.message || "Gagal menghapus item dari Supabase.",
          }
        }
      } catch (err: unknown) {
        const errorObj = err as { code?: string; message?: string }
        const msg =
          err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus data."
        if (
          errorObj?.code === "PGRST205" ||
          errorObj?.code === "PGRST204" ||
          errorObj?.code === "42P01" ||
          msg.includes("schema cache") ||
          msg.includes("does not exist")
        ) {
          setTableMissing(true)
          return { success: true }
        }
        console.error("Supabase deleteItem exception:", err)
        await fetchData()
        return { success: false, error: msg }
      }
    }

    return { success: true }
  }

  return {
    items,
    isLoading,
    isUsingSupabase,
    tableMissing,
    toggleVote,
    addItem,
    deleteItem,
    refresh: fetchData,
  }
}
