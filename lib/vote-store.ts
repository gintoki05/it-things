"use client"

import * as React from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

// ============================================================
// Types
// ============================================================

export interface Voter {
  id: string
  name: string
  avatarUrl?: string | null
}

export interface VoteRecord {
  id: string
  optionId: string
  groupId: string
  userId: string
  userName: string
  userAvatar?: string | null
}

export interface VoteOption {
  id: string
  groupId: string
  name: string
  emoji: string
  proposedById: string
  proposedByName: string
  proposedByAvatar?: string | null
  createdAt: string
  voters: Voter[] // derived from vote_records
}

export type VoteType = "single" | "multiple"

export interface VoteGroup {
  id: string
  title: string
  description: string
  emoji: string
  voteType: VoteType
  isClosed: boolean
  expiresAt: string // ISO string
  createdById: string
  createdByName: string
  createdByAvatar?: string | null
  createdAt: string
  options: VoteOption[]
}

// A group is "archived" if manually closed OR past expires_at
export function isGroupArchived(group: VoteGroup): boolean {
  return group.isClosed || new Date(group.expiresAt) <= new Date()
}

export function daysRemaining(group: VoteGroup): number {
  if (group.isClosed) return 0
  const diff = new Date(group.expiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

// ============================================================
// useVoteStore hook
// ============================================================

export function useVoteStore() {
  const [groups, setGroups] = React.useState<VoteGroup[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [tableMissing, setTableMissing] = React.useState(false)
  const [isUsingSupabase, setIsUsingSupabase] = React.useState(false)

  const isTableMissingError = (err: { code?: string; message?: string }) =>
    err?.code === "PGRST205" ||
    err?.code === "PGRST204" ||
    err?.code === "42P01" ||
    err?.message?.includes("schema cache") ||
    err?.message?.includes("does not exist")

  // ─── Fetch ──────────────────────────────────────────────
  const fetchData = React.useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setGroups([])
      setIsLoading(false)
      return
    }

    try {
      setIsUsingSupabase(true)

      const { data: dbGroups, error: groupsErr } = await supabase
        .from("vote_groups")
        .select("*")
        .order("created_at", { ascending: false })

      if (groupsErr) {
        if (isTableMissingError(groupsErr)) { setTableMissing(true); setIsLoading(false); return }
        throw groupsErr
      }

      const { data: dbOptions, error: optionsErr } = await supabase
        .from("vote_options")
        .select("*")
        .order("created_at", { ascending: true })

      if (optionsErr) { if (isTableMissingError(optionsErr)) { setTableMissing(true); setIsLoading(false); return }; throw optionsErr }

      const { data: dbRecords, error: recordsErr } = await supabase
        .from("vote_records")
        .select("id, group_id, option_id, user_id, user_name, user_avatar")

      if (recordsErr) { if (isTableMissingError(recordsErr)) { setTableMissing(true); setIsLoading(false); return }; throw recordsErr }

      setTableMissing(false)

      const mapped: VoteGroup[] = (dbGroups || []).map((g) => {
        const groupOptions: VoteOption[] = (dbOptions || [])
          .filter((o) => o.group_id === g.id)
          .map((o) => ({
            id: o.id,
            groupId: o.group_id,
            name: o.name,
            emoji: o.emoji || "📌",
            proposedById: o.proposed_by_id,
            proposedByName: o.proposed_by_name,
            proposedByAvatar: o.proposed_by_avatar,
            createdAt: o.created_at,
            voters: (dbRecords || [])
              .filter((r) => r.option_id === o.id)
              .map((r) => ({ id: r.user_id, name: r.user_name, avatarUrl: r.user_avatar })),
          }))

        return {
          id: g.id,
          title: g.title,
          description: g.description || "",
          emoji: g.emoji || "🗳️",
          voteType: (g.vote_type as VoteType) || "single",
          isClosed: g.is_closed,
          expiresAt: g.expires_at,
          createdById: g.created_by_id,
          createdByName: g.created_by_name,
          createdByAvatar: g.created_by_avatar,
          createdAt: g.created_at,
          options: groupOptions,
        }
      })

      setGroups(mapped)
    } catch (err) {
      if (isTableMissingError(err as { code?: string; message?: string })) {
        setTableMissing(true)
      } else {
        console.warn("vote-store fetchData error:", err)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ─── Realtime ────────────────────────────────────────────
  React.useEffect(() => {
    fetchData()

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel("vote-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "vote_groups" }, () => fetchData())
        .on("postgres_changes", { event: "*", schema: "public", table: "vote_options" }, () => fetchData())
        .on("postgres_changes", { event: "*", schema: "public", table: "vote_records" }, () => fetchData())
        .subscribe()

      return () => { if (supabase) supabase.removeChannel(channel) }
    }
  }, [fetchData])

  // ─── Create Group ────────────────────────────────────────
  const createGroup = async (
    title: string,
    description: string,
    emoji: string,
    voteType: VoteType,
    user: Voter
  ): Promise<{ success: boolean; error?: string }> => {
    if (user.id === "guest-user") {
      return { success: false, error: "Akses Ditolak: Tamu tidak memiliki izin membuat vote group (Read-Only)." }
    }

    const tempId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString()

    const optimistic: VoteGroup = {
      id: tempId,
      title,
      description,
      emoji: emoji || "🗳️",
      voteType,
      isClosed: false,
      expiresAt,
      createdById: user.id,
      createdByName: user.name,
      createdByAvatar: user.avatarUrl,
      createdAt: new Date().toISOString(),
      options: [],
    }

    setGroups((prev) => [optimistic, ...prev])

    if (!isSupabaseConfigured || !supabase) return { success: true }

    try {
      const { data, error } = await supabase
        .from("vote_groups")
        .insert({
          title,
          description: description || null,
          emoji: emoji || "🗳️",
          vote_type: voteType,
          created_by_id: user.id,
          created_by_name: user.name,
          created_by_avatar: user.avatarUrl || null,
        })
        .select()
        .single()

      if (error) {
        setGroups((prev) => prev.filter((g) => g.id !== tempId))
        return { success: false, error: error.message }
      }

      setGroups((prev) => prev.map((g) => (g.id === tempId ? { ...g, id: data.id, expiresAt: data.expires_at } : g)))
      return { success: true }
    } catch (err) {
      setGroups((prev) => prev.filter((g) => g.id !== tempId))
      return { success: false, error: err instanceof Error ? err.message : "Gagal membuat group." }
    }
  }

  // ─── Delete Group ────────────────────────────────────────
  const deleteGroup = async (groupId: string): Promise<{ success: boolean; error?: string }> => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId))

    if (!isSupabaseConfigured || !supabase) return { success: true }

    try {
      const { error } = await supabase.from("vote_groups").delete().eq("id", groupId)
      if (error) { await fetchData(); return { success: false, error: error.message } }
      return { success: true }
    } catch (err) {
      await fetchData()
      return { success: false, error: err instanceof Error ? err.message : "Gagal menghapus group." }
    }
  }

  // ─── Toggle Close Group ──────────────────────────────────
  const toggleCloseGroup = async (groupId: string, isClosed: boolean): Promise<{ success: boolean; error?: string }> => {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, isClosed } : g)))

    if (!isSupabaseConfigured || !supabase) return { success: true }

    try {
      const { error } = await supabase.from("vote_groups").update({ is_closed: isClosed }).eq("id", groupId)
      if (error) { await fetchData(); return { success: false, error: error.message } }
      return { success: true }
    } catch (err) {
      await fetchData()
      return { success: false, error: err instanceof Error ? err.message : "Gagal mengubah status group." }
    }
  }

  // ─── Add Option ──────────────────────────────────────────
  const addOption = async (
    groupId: string,
    name: string,
    emoji: string,
    user: Voter
  ): Promise<{ success: boolean; error?: string }> => {
    if (user.id === "guest-user") {
      return { success: false, error: "Akses Ditolak: Tamu tidak memiliki izin mengusulkan opsi (Read-Only)." }
    }

    const tempId = crypto.randomUUID()

    const optimistic: VoteOption = {
      id: tempId,
      groupId,
      name,
      emoji: emoji || "📌",
      proposedById: user.id,
      proposedByName: user.name,
      proposedByAvatar: user.avatarUrl,
      createdAt: new Date().toISOString(),
      voters: [],
    }

    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, options: [...g.options, optimistic] } : g))
    )

    if (!isSupabaseConfigured || !supabase) return { success: true }

    try {
      const { data, error } = await supabase
        .from("vote_options")
        .insert({
          group_id: groupId,
          name,
          emoji: emoji || "📌",
          proposed_by_id: user.id,
          proposed_by_name: user.name,
          proposed_by_avatar: user.avatarUrl || null,
        })
        .select()
        .single()

      if (error) {
        setGroups((prev) =>
          prev.map((g) => (g.id === groupId ? { ...g, options: g.options.filter((o) => o.id !== tempId) } : g))
        )
        return { success: false, error: error.message }
      }

      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, options: g.options.map((o) => (o.id === tempId ? { ...o, id: data.id } : o)) }
            : g
        )
      )
      return { success: true }
    } catch (err) {
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, options: g.options.filter((o) => o.id !== tempId) } : g))
      )
      return { success: false, error: err instanceof Error ? err.message : "Gagal menambah opsi." }
    }
  }

  // ─── Delete Option ───────────────────────────────────────
  const deleteOption = async (groupId: string, optionId: string): Promise<{ success: boolean; error?: string }> => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, options: g.options.filter((o) => o.id !== optionId) } : g))
    )

    if (!isSupabaseConfigured || !supabase) return { success: true }

    try {
      const { error } = await supabase.from("vote_options").delete().eq("id", optionId)
      if (error) { await fetchData(); return { success: false, error: error.message } }
      return { success: true }
    } catch (err) {
      await fetchData()
      return { success: false, error: err instanceof Error ? err.message : "Gagal menghapus opsi." }
    }
  }

  // ─── Cast Vote ───────────────────────────────────────────
  const castVote = async (
    groupId: string,
    optionId: string,
    user: Voter,
    voteType: VoteType
  ): Promise<{ success: boolean; error?: string }> => {
    if (user.id === "guest-user") {
      return { success: false, error: "Akses Ditolak: Tamu tidak dapat memberikan vote (Read-Only)." }
    }

    const group = groups.find((g) => g.id === groupId)
    if (!group) return { success: false, error: "Group tidak ditemukan." }

    const targetOption = group.options.find((o) => o.id === optionId)
    if (!targetOption) return { success: false, error: "Opsi tidak ditemukan." }

    const alreadyVotedThis = targetOption.voters.some((v) => v.id === user.id)

    // Optimistic update
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g

        if (voteType === "single") {
          // Remove all user votes in this group, then toggle target
          const newOptions = g.options.map((o) => {
            if (o.id === optionId) {
              // Toggle: if already voted this, remove; else add
              const newVoters = alreadyVotedThis
                ? o.voters.filter((v) => v.id !== user.id)
                : [...o.voters.filter((v) => v.id !== user.id), user]
              return { ...o, voters: newVoters }
            }
            // Remove vote from all other options
            return { ...o, voters: o.voters.filter((v) => v.id !== user.id) }
          })
          return { ...g, options: newOptions }
        } else {
          // Multiple: toggle per option
          const newOptions = g.options.map((o) => {
            if (o.id !== optionId) return o
            const newVoters = alreadyVotedThis
              ? o.voters.filter((v) => v.id !== user.id)
              : [...o.voters, user]
            return { ...o, voters: newVoters }
          })
          return { ...g, options: newOptions }
        }
      })
    )

    if (!isSupabaseConfigured || !supabase || user.id === "guest-user") return { success: true }

    try {
      if (voteType === "single") {
        // Delete all existing votes by this user in this group
        await supabase.from("vote_records").delete().match({ group_id: groupId, user_id: user.id })

        // If was already voting this option → just unvote (already deleted above)
        if (!alreadyVotedThis) {
          await supabase.from("vote_records").insert({
            group_id: groupId,
            option_id: optionId,
            user_id: user.id,
            user_name: user.name,
            user_avatar: user.avatarUrl || null,
          })
        }
      } else {
        // Multiple: toggle
        if (alreadyVotedThis) {
          await supabase.from("vote_records").delete().match({ option_id: optionId, user_id: user.id })
        } else {
          await supabase.from("vote_records").insert({
            group_id: groupId,
            option_id: optionId,
            user_id: user.id,
            user_name: user.name,
            user_avatar: user.avatarUrl || null,
          })
        }
      }
      return { success: true }
    } catch (err) {
      await fetchData()
      return { success: false, error: err instanceof Error ? err.message : "Gagal menyimpan vote." }
    }
  }

  return {
    groups,
    isLoading,
    tableMissing,
    isUsingSupabase,
    createGroup,
    deleteGroup,
    toggleCloseGroup,
    addOption,
    deleteOption,
    castVote,
    refresh: fetchData,
  }
}
