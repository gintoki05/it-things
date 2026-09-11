"use client"

import * as React from "react"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"
import { usePicStore } from "@/lib/pic-store"
import { playRetroNotificationSound } from "@/lib/sound-effects"

export interface DesktopMemo {
  id: string
  title: string
  content: string
  updated_by_id: string
  updated_by_name: string
  updated_by_avatar?: string | null
  created_at?: string
  updated_at?: string
}

const STORAGE_KEY = "it_things_desktop_memo_v1"

export function normalizeMemo(m: DesktopMemo): DesktopMemo {
  return {
    ...m,
    content: (m.content || "").replace(/\\n/g, "\n"),
  }
}

const DEFAULT_MEMO: DesktopMemo = normalizeMemo({
  id: "00000000-0000-0000-0000-000000000001",
  title: "MEMO_PENGUMUMAN.TXT",
  content: "• Selamat datang di IT-THINGS 98!\n• Jangan lupa bayar uang kas bulanan rek.\n• Kopi & snack di pantry silakan dinikmati bersama.",
  updated_by_id: "system",
  updated_by_name: "Admin IT",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

export function useMemoStore() {
  const { user, isGuest, isAdmin } = useAuth()
  const { isKasPic, isPantryPic } = usePicStore()
  const [memo, setMemo] = React.useState<DesktopMemo>(DEFAULT_MEMO)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)

  const canManageMemo = Boolean(!isGuest && (isAdmin || isKasPic || isPantryPic))

  // 1. Fetch memo from Supabase or localStorage
  const loadMemo = React.useCallback(async () => {
    setIsLoading(true)

    // Check localStorage first
    let cached: DesktopMemo | null = null
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          cached = JSON.parse(raw)
          if (cached) setMemo(normalizeMemo(cached))
        }
      } catch (err) {
        console.warn("Gagal membaca memo dari localStorage:", err)
      }
    }

    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from("desktop_memos")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!error && data) {
        const normalized = normalizeMemo(data)
        setMemo(normalized)
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
        }
      } else if (!data && !cached) {
        setMemo(DEFAULT_MEMO)
      }
    } catch (err) {
      console.warn("Gagal mengambil data desktop_memos dari Supabase:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 2. Realtime subscription
  React.useEffect(() => {
    loadMemo()

    if (!isSupabaseConfigured || !supabase) return

    let channel: RealtimeChannel | null = null

    try {
      channel = supabase
        .channel("desktop-memos-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "desktop_memos" },
          (payload) => {
            if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
              const updated = normalizeMemo(payload.new as DesktopMemo)
              setMemo(updated)
              if (typeof window !== "undefined") {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
              }
              // Play subtle sound on external update
              playRetroNotificationSound(0.2)
            }
          }
        )
        .subscribe()
    } catch (err) {
      console.warn("Gagal inisialisasi Realtime desktop_memos:", err)
    }

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel)
      }
    }
  }, [loadMemo])

  // 3. Update Memo
  const updateMemo = React.useCallback(
    async (newTitle: string, newContent: string) => {
      if (!canManageMemo) {
        return { success: false, error: "Hanya Admin dan Bendahara yang dapat mengubah pengumuman." }
      }

      setIsSaving(true)
      const prevMemo = { ...memo }

      const updatedRow: DesktopMemo = {
        id: memo.id || "00000000-0000-0000-0000-000000000001",
        title: newTitle.trim() || "MEMO_PENGUMUMAN.TXT",
        content: newContent.trim(),
        updated_by_id: user?.id || "guest",
        updated_by_name: user?.name || "Anggota Tim",
        updated_by_avatar: user?.avatarUrl || null,
        updated_at: new Date().toISOString(),
      }

      // Optimistic update
      setMemo(updatedRow)
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRow))
      }

      if (!isSupabaseConfigured || !supabase) {
        setIsSaving(false)
        playRetroNotificationSound(0.25)
        return { success: true }
      }

      try {
        const { error } = await supabase
          .from("desktop_memos")
          .upsert(updatedRow)

        if (error) {
          console.error("Gagal menyimpan memo ke Supabase:", error)
          // Rollback on error
          setMemo(prevMemo)
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(prevMemo))
          }
          setIsSaving(false)
          return { success: false, error: error.message }
        }

        playRetroNotificationSound(0.28)
        setIsSaving(false)
        return { success: true }
      } catch (err) {
        console.error("Exception saat menyimpan memo:", err)
        setMemo(prevMemo)
        setIsSaving(false)
        return { success: false, error: "Terjadi kesalahan jaringan." }
      }
    },
    [memo, user, canManageMemo]
  )

  return {
    memo,
    isLoading,
    isSaving,
    canManageMemo,
    updateMemo,
    reloadMemo: loadMemo,
  }
}
