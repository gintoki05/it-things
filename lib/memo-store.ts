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

// ─── Shared In-Memory State & Deduplication ───────────────────
let cachedMemo: DesktopMemo = DEFAULT_MEMO
let inFlightMemoPromise: Promise<DesktopMemo> | null = null
const memoListeners = new Set<(memo: DesktopMemo) => void>()

function getInitialCachedMemo(): DesktopMemo {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed) {
          cachedMemo = normalizeMemo(parsed)
          return cachedMemo
        }
      }
    } catch {}
  }
  return cachedMemo
}

async function fetchMemoDeduplicated(): Promise<DesktopMemo> {
  if (inFlightMemoPromise) {
    return inFlightMemoPromise
  }

  inFlightMemoPromise = (async () => {
    if (!isSupabaseConfigured || !supabase) {
      return cachedMemo
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
        cachedMemo = normalized
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
        }
        memoListeners.forEach((listener) => listener(normalized))
      }
    } catch (err) {
      console.warn("fetchMemoDeduplicated error:", err)
    } finally {
      inFlightMemoPromise = null
    }

    return cachedMemo
  })()

  return inFlightMemoPromise
}

export function useMemoStore() {
  const { user, isGuest, isAdmin } = useAuth()
  const { isKasPic, isPantryPic } = usePicStore()
  const [memo, setMemo] = React.useState<DesktopMemo>(() => getInitialCachedMemo())
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  const canManageMemo = Boolean(!isGuest && (isAdmin || isKasPic || isPantryPic))

  const loadMemo = React.useCallback(async () => {
    setIsLoading(true)
    const result = await fetchMemoDeduplicated()
    setMemo(result)
    setIsLoading(false)
  }, [])

  // Realtime subscription & shared listener
  React.useEffect(() => {
    const listener = (newMemo: DesktopMemo) => setMemo(newMemo)
    memoListeners.add(listener)

    loadMemo()

    if (!isSupabaseConfigured || !supabase) {
      return () => {
        memoListeners.delete(listener)
      }
    }

    let channel: RealtimeChannel | null = null

    try {
      const channelName = `desktop-memos-realtime-${Math.random().toString(36).substring(2, 8)}`
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "desktop_memos" },
          () => {
            fetchMemoDeduplicated()
            playRetroNotificationSound()
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
