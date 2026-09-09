"use client"

import * as React from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

export interface Voter {
  id: string
  name: string
  avatarUrl?: string
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

const DEFAULT_MOCK_ITEMS: PantryItem[] = [
  {
    id: "mock-1",
    name: "Pop Mie (combine)",
    detail: "Rasa bebas, nanti di-mix",
    emoji: "🍜",
    month_period: "2026-09",
    proposed_by_id: "u-1",
    proposed_by_name: "Dika",
    voters: [
      { id: "u-1", name: "Dika" },
      { id: "u-2", name: "Andi" },
      { id: "u-3", name: "Bima" },
      { id: "u-4", name: "Dewi" },
      { id: "u-5", name: "Raka" },
      { id: "u-6", name: "Sari" },
      { id: "u-7", name: "Fajar" },
      { id: "u-8", name: "Agus" },
    ],
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "mock-2",
    name: "Sosis 2/3",
    detail: "Untuk stok kulkas",
    emoji: "🌭",
    month_period: "2026-09",
    proposed_by_id: "u-2",
    proposed_by_name: "Andi",
    voters: [
      { id: "u-2", name: "Andi" },
      { id: "u-1", name: "Dika" },
      { id: "u-5", name: "Raka" },
      { id: "u-7", name: "Fajar" },
      { id: "u-8", name: "Agus" },
      { id: "u-3", name: "Bima" },
    ],
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "mock-3",
    name: "Jajan (menyesuaikan di JM)",
    detail: "Lihat situasi dan diskon :D",
    emoji: "🍪",
    month_period: "2026-09",
    proposed_by_id: "u-4",
    proposed_by_name: "Dewi",
    voters: [
      { id: "u-4", name: "Dewi" },
      { id: "u-6", name: "Sari" },
      { id: "u-3", name: "Bima" },
      { id: "u-9", name: "Nina" },
      { id: "u-5", name: "Raka" },
    ],
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "mock-4",
    name: "Saos Pedas 3",
    detail: "Yang biasa, jangan yang terlalu pedas",
    emoji: "🌶️",
    month_period: "2026-09",
    proposed_by_id: "u-5",
    proposed_by_name: "Raka",
    voters: [
      { id: "u-5", name: "Raka" },
      { id: "u-2", name: "Andi" },
      { id: "u-7", name: "Fajar" },
      { id: "u-3", name: "Bima" },
      { id: "u-8", name: "Agus" },
      { id: "u-1", name: "Dika" },
      { id: "u-4", name: "Dewi" },
    ],
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "mock-5",
    name: "Kecap 1",
    detail: "Bango / sesuai stok",
    emoji: "🥢",
    month_period: "2026-09",
    proposed_by_id: "u-3",
    proposed_by_name: "Bima",
    voters: [
      { id: "u-3", name: "Bima" },
      { id: "u-6", name: "Sari" },
      { id: "u-9", name: "Nina" },
      { id: "u-2", name: "Andi" },
    ],
    created_at: new Date(Date.now() - 60000000).toISOString(),
  },
  {
    id: "mock-6",
    name: "Susu UHT 4",
    detail: "Full cream / low fat (bebas)",
    emoji: "🥛",
    month_period: "2026-09",
    proposed_by_id: "u-4",
    proposed_by_name: "Dewi",
    voters: [
      { id: "u-4", name: "Dewi" },
      { id: "u-9", name: "Nina" },
      { id: "u-7", name: "Fajar" },
      { id: "u-2", name: "Andi" },
      { id: "u-6", name: "Sari" },
      { id: "u-5", name: "Raka" },
    ],
    created_at: new Date(Date.now() - 50000000).toISOString(),
  },
  {
    id: "mock-7",
    name: "Teh",
    detail: "Teh celup / teh tubruk",
    emoji: "🍵",
    month_period: "2026-09",
    proposed_by_id: "u-8",
    proposed_by_name: "Agus",
    voters: [
      { id: "u-8", name: "Agus" },
      { id: "u-5", name: "Raka" },
      { id: "u-6", name: "Sari" },
      { id: "u-4", name: "Dewi" },
      { id: "u-3", name: "Bima" },
    ],
    created_at: new Date(Date.now() - 40000000).toISOString(),
  },
  {
    id: "mock-8",
    name: "Kopi Rentengan",
    detail: "Indocafe / Good Day / Bebas",
    emoji: "☕",
    month_period: "2026-09",
    proposed_by_id: "u-7",
    proposed_by_name: "Fajar",
    voters: [
      { id: "u-7", name: "Fajar" },
      { id: "u-2", name: "Andi" },
      { id: "u-5", name: "Raka" },
      { id: "u-3", name: "Bima" },
      { id: "u-8", name: "Agus" },
      { id: "u-1", name: "Dika" },
      { id: "u-4", name: "Dewi" },
    ],
    created_at: new Date(Date.now() - 30000000).toISOString(),
  },
]

export function usePantryStore(currentMonth: string = "2026-09") {
  const [items, setItems] = React.useState<PantryItem[]>(DEFAULT_MOCK_ITEMS)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isUsingSupabase, setIsUsingSupabase] = React.useState(false)

  // Fetch Items & Votes from Supabase
  const fetchData = React.useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      // LocalStorage / Mock fallback
      try {
        const local = localStorage.getItem(`ti_pantry_${currentMonth}`)
        if (local) {
          const parsed = JSON.parse(local)
          if (Array.isArray(parsed) && parsed.length > 0) {
            const normalized = parsed.map((item: any) => ({
              ...item,
              voters: Array.isArray(item.voters)
                ? item.voters.map((v: any) => (typeof v === "string" ? { id: v, name: v } : v))
                : Array.isArray(item.votes)
                ? item.votes.map((v: any) => (typeof v === "string" ? { id: v, name: v } : v))
                : [],
            }))
            setItems(normalized)
          } else {
            setItems(DEFAULT_MOCK_ITEMS)
            localStorage.setItem(`ti_pantry_${currentMonth}`, JSON.stringify(DEFAULT_MOCK_ITEMS))
          }
        } else {
          setItems(DEFAULT_MOCK_ITEMS)
          localStorage.setItem(`ti_pantry_${currentMonth}`, JSON.stringify(DEFAULT_MOCK_ITEMS))
        }
      } catch {
        setItems(DEFAULT_MOCK_ITEMS)
      } finally {
        setIsLoading(false)
      }
      return
    }

    try {
      setIsUsingSupabase(true)
      const { data: dbItems, error: itemsErr } = await supabase
        .from("pantry_items")
        .select("*")
        .eq("month_period", currentMonth)
        .order("created_at", { ascending: true })

      if (itemsErr) throw itemsErr

      const { data: dbVotes, error: votesErr } = await supabase
        .from("pantry_votes")
        .select("item_id, user_id, user_name, user_avatar")

      if (votesErr) throw votesErr

      if (dbItems && dbItems.length > 0) {
        const mapped: PantryItem[] = dbItems.map((it) => {
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
      } else {
        // Table exists but empty -> seed with default items or load local
        const local = typeof window !== "undefined" ? localStorage.getItem(`ti_pantry_${currentMonth}`) : null
        setItems(local ? JSON.parse(local) : DEFAULT_MOCK_ITEMS)
      }
    } catch (err) {
      console.warn("Supabase fetch failed or tables not created yet, using local/mock items:", err)
      const local = typeof window !== "undefined" ? localStorage.getItem(`ti_pantry_${currentMonth}`) : null
      setItems(local ? JSON.parse(local) : DEFAULT_MOCK_ITEMS)
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

    // Sync to Supabase if configured
    if (isSupabaseConfigured && supabase) {
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
    const tempId = "item-" + Date.now()
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

    if (isSupabaseConfigured && supabase) {
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

        if (!error && data) {
          await supabase.from("pantry_votes").insert({
            item_id: data.id,
            user_id: user.id,
            user_name: user.name,
            user_avatar: user.avatarUrl || null,
          })
          fetchData()
        }
      } catch (err) {
        console.error("Supabase addItem error:", err)
      }
    }
  }

  return {
    items,
    isLoading,
    isUsingSupabase,
    toggleVote,
    addItem,
    refresh: fetchData,
  }
}
