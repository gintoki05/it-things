"use client"

import * as React from "react"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"
import { playRetroNotificationSound } from "@/lib/sound-effects"

export type ModuleKey = "kas" | "pantry"

export interface ModulePic {
  id?: string
  module: ModuleKey | string
  user_id: string
  user_name: string
  user_avatar?: string | null
  assigned_by_id?: string | null
  assigned_by_name?: string | null
  updated_at?: string
}

const STORAGE_KEY = "it_things_module_pics_v1"

export const DEFAULT_PICS: Record<string, ModulePic[]> = {
  kas: [
    {
      id: "cc4b9538-ad44-489d-9ead-f3f7b5b91204",
      module: "kas",
      user_id: "83f8ff6b-3b91-438d-98e7-8c0d221ce0dc",
      user_name: "Ajie Ganteng",
      user_avatar: "🛡️",
      assigned_by_name: "Sistem",
      updated_at: new Date().toISOString(),
    },
  ],
  pantry: [
    {
      id: "18822ae4-17e3-461e-8bf6-37b41514b141",
      module: "pantry",
      user_id: "83f8ff6b-3b91-438d-98e7-8c0d221ce0dc",
      user_name: "Ajie Ganteng",
      user_avatar: "🛡️",
      assigned_by_name: "Sistem",
      updated_at: new Date().toISOString(),
    },
  ],
}

export function usePicStore() {
  const { user, isAdmin, isGuest } = useAuth()
  const [pics, setPics] = React.useState<Record<string, ModulePic[]>>(DEFAULT_PICS)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isUpdating, setIsUpdating] = React.useState(false)

  // 1. Load PIC assignments from Supabase or localStorage
  const loadPics = React.useCallback(async () => {
    setIsLoading(true)

    // Check localStorage cache
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const cached = JSON.parse(raw)
          if (cached && typeof cached === "object") {
            setPics((prev) => ({ ...prev, ...cached }))
          }
        }
      } catch (err) {
        console.warn("Gagal membaca module_pics dari localStorage:", err)
      }
    }

    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from("module_pics")
        .select("*")
        .order("updated_at", { ascending: true })

      if (!error && data) {
        const grouped: Record<string, ModulePic[]> = {
          kas: [],
          pantry: [],
        }

        data.forEach((row) => {
          const mod = row.module
          if (!grouped[mod]) grouped[mod] = []
          grouped[mod].push({
            id: row.id,
            module: row.module,
            user_id: row.user_id,
            user_name: row.user_name,
            user_avatar: row.user_avatar,
            assigned_by_id: row.assigned_by_id,
            assigned_by_name: row.assigned_by_name,
            updated_at: row.updated_at,
          })
        })

        setPics(grouped)
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(grouped))
        }
      }
    } catch (err) {
      console.warn("Gagal mengambil data module_pics dari Supabase:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 2. Realtime listener
  React.useEffect(() => {
    loadPics()

    if (!isSupabaseConfigured || !supabase) return

    let channel: RealtimeChannel | null = null
    try {
      const channelName = `module-pics-realtime-${Math.random().toString(36).substring(2, 9)}`
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "module_pics",
          },
          () => {
            loadPics()
            playRetroNotificationSound()
          }
        )
        .subscribe()
    } catch (err) {
      console.warn("Gagal subscribe realtime module_pics:", err)
    }

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel)
      }
    }
  }, [loadPics])

  // 3. Add PIC to a module
  const addPic = React.useCallback(
    async (
      module: ModuleKey | string,
      targetUser: {
        id?: string
        user_id?: string
        name: string
        avatar_url?: string | null
      }
    ) => {
      const targetUserId = targetUser.user_id || targetUser.id
      if (!targetUserId) {
        return { success: false, error: "User ID target tidak valid." }
      }

      if (isGuest) {
        return { success: false, error: "Akun Tamu tidak dapat mengubah PIC modul." }
      }

      const existingList = pics[module] || []
      if (existingList.some((p) => p.user_id === targetUserId)) {
        return { success: true, error: "Anggota sudah menjadi PIC modul ini." }
      }

      const prevPics = { ...pics }
      const newPicItem: ModulePic = {
        module,
        user_id: targetUserId,
        user_name: targetUser.name,
        user_avatar: targetUser.avatar_url || "👤",
        assigned_by_id: user?.id || "system",
        assigned_by_name: user?.name || "Admin",
        updated_at: new Date().toISOString(),
      }

      // Optimistic UI update
      setPics((prev) => {
        const currentModList = prev[module] || []
        const updated = {
          ...prev,
          [module]: [...currentModList, newPicItem],
        }
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
          } catch {}
        }
        return updated
      })

      if (!isSupabaseConfigured || !supabase || !user) {
        return { success: true }
      }

      setIsUpdating(true)
      try {
        const { error } = await supabase.from("module_pics").upsert(
          {
            module,
            user_id: targetUserId,
            user_name: targetUser.name,
            user_avatar: targetUser.avatar_url || "👤",
            assigned_by_id: user.id,
            assigned_by_name: user.name,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "module,user_id" }
        )

        if (error) {
          console.error("Gagal tambah module_pics di Supabase:", error)
          setPics(prevPics)
          return { success: false, error: error.message }
        }

        return { success: true }
      } catch (err: any) {
        console.error("Error upsert module_pics:", err)
        setPics(prevPics)
        return { success: false, error: err?.message || "Terjadi kesalahan jaringan." }
      } finally {
        setIsUpdating(false)
      }
    },
    [pics, user, isGuest]
  )

  // 4. Remove PIC from a module
  const removePic = React.useCallback(
    async (module: ModuleKey | string, targetUserId: string) => {
      if (!targetUserId) return { success: false, error: "User ID tidak valid." }
      if (isGuest) return { success: false, error: "Akun Tamu tidak dapat mengubah PIC." }

      const prevPics = { ...pics }

      // Optimistic UI update
      setPics((prev) => {
        const currentModList = prev[module] || []
        const updated = {
          ...prev,
          [module]: currentModList.filter((p) => p.user_id !== targetUserId),
        }
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
          } catch {}
        }
        return updated
      })

      if (!isSupabaseConfigured || !supabase || !user) {
        return { success: true }
      }

      setIsUpdating(true)
      try {
        const { error } = await supabase
          .from("module_pics")
          .delete()
          .match({ module, user_id: targetUserId })

        if (error) {
          console.error("Gagal hapus module_pics di Supabase:", error)
          setPics(prevPics)
          return { success: false, error: error.message }
        }

        return { success: true }
      } catch (err: any) {
        console.error("Error delete module_pics:", err)
        setPics(prevPics)
        return { success: false, error: err?.message || "Terjadi kesalahan jaringan." }
      } finally {
        setIsUpdating(false)
      }
    },
    [pics, user, isGuest]
  )

  // 5. Role & PIC helpers
  const isKasPic = Boolean(
    !isGuest &&
      (isAdmin ||
        (user?.id &&
          (pics.kas || []).some(
            (p) => p.user_id === user.id || p.user_id === user.email || p.user_id === `tm-${user.id}`
          )))
  )

  const isPantryPic = Boolean(
    !isGuest &&
      (isAdmin ||
        (user?.id &&
          (pics.pantry || []).some(
            (p) => p.user_id === user.id || p.user_id === user.email || p.user_id === `tm-${user.id}`
          )))
  )

  // Can assign PIC if user is admin or current PIC of that module
  const canAssignModulePic = React.useCallback(
    (module: ModuleKey | string) => {
      if (isGuest || !user) return false
      if (isAdmin) return true
      const modList = pics[module] || []
      return modList.some(
        (p) => p.user_id === user.id || p.user_id === user.email || p.user_id === `tm-${user.id}`
      )
    },
    [isAdmin, isGuest, user, pics]
  )

  const getPics = React.useCallback(
    (module: ModuleKey | string): ModulePic[] => {
      return pics[module] || []
    },
    [pics]
  )

  const getPicNames = React.useCallback(
    (module: ModuleKey | string): string => {
      const list = pics[module] || []
      if (list.length === 0) return "Belum ditentukan"
      return list.map((p) => p.user_name).join(", ")
    },
    [pics]
  )

  // Get badges for a specific user ID
  const getUserPicTags = React.useCallback(
    (userId?: string): Array<{ module: string; label: string; color: string; icon: string }> => {
      if (!userId) return []
      const tags: Array<{ module: string; label: string; color: string; icon: string }> = []
      const kasList = pics.kas || []
      const pantryList = pics.pantry || []

      if (kasList.some((p) => p.user_id === userId || p.user_id === `tm-${userId}`)) {
        tags.push({
          module: "kas",
          label: "PIC KAS",
          color: "bg-[#FEF3C7] text-[#92400E] border-[#F59E0B]",
          icon: "💰",
        })
      }
      if (pantryList.some((p) => p.user_id === userId || p.user_id === `tm-${userId}`)) {
        tags.push({
          module: "pantry",
          label: "PIC PANTRY",
          color: "bg-[#E0F2FE] text-[#0369A1] border-[#38BDF8]",
          icon: "☕",
        })
      }
      return tags
    },
    [pics]
  )

  return {
    pics,
    isLoading,
    isUpdating,
    loadPics,
    addPic,
    removePic,
    isKasPic,
    isPantryPic,
    canAssignModulePic,
    getPics,
    getPicNames,
    getUserPicTags,
  }
}
