"use client"

import * as React from "react"
import { useAuth, UserRole } from "@/lib/auth"
import { useTeamStore, TeamMember } from "@/lib/team-store"
import { usePicStore } from "@/lib/pic-store"
import { UserAvatar } from "@/components/retro/user-avatar"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { RetroActionButton } from "@/components/ui/retro-action-button"
import {
  Users,
  UserPlus,
  Crown,
  ShieldCheck,
  Shield,
  Trash2,
  Edit2,
  RefreshCw,
  CheckCircle2,
  X,
  User,
  Eye,
  Search,
  Check,
  Coffee,
  Coins,
  ArrowRightLeft,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function TeamApp() {
  const { user, isAdmin, isTreasurer, isGuest } = useAuth()
  const {
    members,
    isLoading: isTeamLoading,
    loadMembers,
    addMember,
    updateMember,
    setMemberRole,
    deleteMember,
  } = useTeamStore()

  const {
    pics,
    isLoading: isPicsLoading,
    addPic,
    removePic,
    canAssignModulePic,
    getUserPicTags,
  } = usePicStore()

  const isLoading = isTeamLoading || isPicsLoading

  // Filter & Search states
  const [searchQuery, setSearchQuery] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState<"all" | UserRole>("all")

  // Multi-PIC local states
  const [selectedKasUser, setSelectedKasUser] = React.useState("")
  const [selectedPantryUser, setSelectedPantryUser] = React.useState("")

  // Modal form states
  const [showModal, setShowModal] = React.useState(false)
  const [editingMember, setEditingMember] = React.useState<TeamMember | null>(null)
  const [formName, setFormName] = React.useState("")
  const [formEmail, setFormEmail] = React.useState("")
  const [formRole, setFormRole] = React.useState<UserRole>("member")
  const [formEmoji, setFormEmoji] = React.useState("👤")
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null)

  // Delete confirm dialog state
  const [memberToDelete, setMemberToDelete] = React.useState<TeamMember | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const adminCount = members.filter((m) => m.role === "admin").length
  const memberCount = members.filter((m) => m.role === "member").length

  // Filtered members list
  const filteredMembers = React.useMemo(() => {
    return members.filter((m) => {
      const matchesRole = roleFilter === "all" || m.role === roleFilter
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        (isAdmin && m.email && m.email.toLowerCase().includes(q))
      return matchesRole && matchesSearch
    })
  }, [members, roleFilter, searchQuery, isAdmin])

  const openAddModal = () => {
    setEditingMember(null)
    setFormName("")
    setFormEmail("")
    setFormRole("member")
    setFormEmoji("👤")
    setShowModal(true)
  }

  const openEditModal = (member: TeamMember) => {
    setEditingMember(member)
    setFormName(member.name)
    setFormEmail(member.email)
    setFormRole(member.role)
    setFormEmoji(
      member.avatar_url || (member.role === "admin" ? "🛡️" : "👤")
    )
    setShowModal(true)
  }

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) return

    const defaultAvatar = formEmoji || (formRole === "admin" ? "🛡️" : "👤")

    if (editingMember) {
      await updateMember(editingMember.id, {
        name: formName.trim(),
        email: formEmail.trim(),
        role: formRole,
        avatar_url: defaultAvatar,
      })
      setStatusMessage(`Anggota "${formName}" berhasil diperbarui.`)
    } else {
      await addMember({
        name: formName.trim(),
        email:
          formEmail.trim() ||
          `${formName.toLowerCase().replace(/\s+/g, ".")}@office.internal`,
        role: formRole,
        avatar_url: defaultAvatar,
      })
      setStatusMessage(`Anggota "${formName}" berhasil ditambahkan.`)
    }

    setShowModal(false)
    setTimeout(() => setStatusMessage(null), 3500)
  }

  const handleConfirmDelete = async () => {
    if (!memberToDelete) return
    setIsDeleting(true)
    await deleteMember(memberToDelete.id)
    setStatusMessage(`Anggota "${memberToDelete.name}" telah dihapus.`)
    setIsDeleting(false)
    setMemberToDelete(null)
    setTimeout(() => setStatusMessage(null), 3500)
  }

  const handleSetRole = async (memberId: string, role: UserRole) => {
    await setMemberRole(memberId, role)
    const roleLabels: Record<UserRole, string> = {
      admin: "Administrator",
      member: "Anggota",
      guest: "Tamu",
    }
    setStatusMessage(`Peran berhasil diubah ke: ${roleLabels[role]}`)
    setTimeout(() => setStatusMessage(null), 3000)
  }

  const handleAddPic = async (module: "kas" | "pantry", targetMemberId: string) => {
    if (!targetMemberId) return
    const targetMember = members.find((m) => m.id === targetMemberId || m.user_id === targetMemberId)
    if (!targetMember) return
    const res = await addPic(module, {
      id: targetMember.id,
      user_id: targetMember.user_id || targetMember.id,
      name: targetMember.name,
      avatar_url: targetMember.avatar_url,
    })
    if (res.success) {
      const moduleName = module === "kas" ? "Buku Kas" : "Pantry"
      setStatusMessage(`"${targetMember.name}" berhasil ditambahkan sebagai PIC ${moduleName}.`)
      if (module === "kas") setSelectedKasUser("")
      if (module === "pantry") setSelectedPantryUser("")
      setTimeout(() => setStatusMessage(null), 3500)
    } else {
      setStatusMessage(`Gagal menambah PIC: ${res.error}`)
      setTimeout(() => setStatusMessage(null), 4000)
    }
  }

  const handleRemovePic = async (module: "kas" | "pantry", targetUserId: string, targetName: string) => {
    const res = await removePic(module, targetUserId)
    if (res.success) {
      const moduleName = module === "kas" ? "Buku Kas" : "Pantry"
      setStatusMessage(`"${targetName}" dicopot dari PIC ${moduleName}.`)
      setTimeout(() => setStatusMessage(null), 3500)
    } else {
      setStatusMessage(`Gagal mencopot PIC: ${res.error}`)
      setTimeout(() => setStatusMessage(null), 4000)
    }
  }

  const kasPics = pics.kas || []
  const pantryPics = pics.pantry || []

  // Filter members who are not yet PICs for the dropdowns
  const availableKasMembers = members.filter(
    (m) => !kasPics.some((p) => p.user_id === m.id || p.user_id === m.user_id)
  )
  const availablePantryMembers = members.filter(
    (m) => !pantryPics.some((p) => p.user_id === m.id || p.user_id === m.user_id)
  )

  return (
    <div className="flex flex-col gap-3 min-h-full font-sans select-none text-[#14253D]">
      {/* 1. TOP HEADER & STATS BAR */}
      <div className="bg-white border border-[#CBD5E1] rounded-[3px] p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-8 rounded-[2px] bg-[#1E4E8C] text-white flex items-center justify-center shadow-inner shrink-0">
            <Users className="size-4" />
          </div>
          <div>
            <div className="font-bold text-xs leading-none flex items-center gap-1.5">
              <span>Direktori Tim IT</span>
              <span className="font-mono text-[10px] bg-blue-50 text-[#1E4E8C] px-1.5 py-0.2 rounded border border-blue-200">
                {members.length} Orang
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px] text-gray-500">
              <span className="text-purple-700 font-semibold">{adminCount} Admin</span>
              <span>·</span>
              <span className="text-slate-600 font-semibold">{memberCount} Member</span>
            </div>
          </div>
        </div>

        {/* Current User Status Pill */}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-[#F1F5F9] border border-[#CBD5E1] rounded-[2px] text-[11px]">
          <span className="text-gray-500 text-[10px]">Akun Anda:</span>
          <UserAvatar
            src={user?.avatarUrl}
            name={user?.name || "Tamu"}
            size="size-4"
            textClass="text-[8px]"
          />
          <strong className="text-gray-800 text-[10px] truncate max-w-[90px]">
            {user?.name || "Tamu"}
          </strong>
          <span className="h-3 w-px bg-gray-300" />
          {isGuest ? (
            <span className="inline-flex items-center gap-0.5 text-amber-800 font-bold text-[9px]">
              <Eye className="size-2.5" /> Tamu
            </span>
          ) : isAdmin ? (
            <span className="inline-flex items-center gap-0.5 text-purple-700 font-bold text-[9px]">
              <ShieldCheck className="size-2.5" /> Admin
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 text-slate-600 font-medium text-[9px]">
              <User className="size-2.5" /> Member
            </span>
          )}
        </div>
      </div>

      {/* 2. PIC ASSIGNMENT PANEL (PENUNJUKAN MULTI-PIC MODUL) */}
      <div className="bg-[#EBF2FA] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] rounded-[3px] p-2.5 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2 pb-1 border-b border-[#CBD5E1]">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-amber-600" />
            <h3 className="font-mono font-bold text-xs text-[#102A45] tracking-tight">
              PENUNJUKAN PIC MODUL (MULTI-PIC ACCESS CONTROL)
            </h3>
          </div>
          <span className="font-mono text-[10px] text-gray-500">
            {isAdmin ? "Mode Kelola PIC (Admin)" : "PIC Modul Aktif"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {/* PIC KAS */}
          <div className="bg-white border border-[#CBD5E1] rounded-[2px] p-2.5 flex flex-col justify-between shadow-2xs gap-2 min-w-0 overflow-hidden">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="p-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-[2px] text-xs shrink-0">
                    💰
                  </span>
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-gray-500 block leading-tight truncate">
                      MODUL KAS & IURAN
                    </span>
                    <span className="text-[10px] font-bold text-amber-800 truncate block">
                      PIC Kas ({kasPics.length} orang)
                    </span>
                  </div>
                </div>
                <span className="px-1.5 py-0.5 bg-[#FEF3C7] text-[#92400E] border border-[#F59E0B] rounded-[2px] text-[9px] font-mono font-bold shrink-0">
                  PIC KAS
                </span>
              </div>

              {/* List of PIC Kas Badges */}
              <div className="flex flex-wrap gap-1 min-h-[28px] p-1 bg-gray-50 border border-dashed border-gray-200 rounded items-center">
                {kasPics.length === 0 ? (
                  <span className="text-[10px] font-mono text-gray-400 italic">
                    Belum ada PIC ditunjuk
                  </span>
                ) : (
                  kasPics.map((p) => (
                    <span
                      key={p.user_id}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#FEF3C7] text-[#92400E] border border-[#F59E0B] rounded-[2px] text-[10px] font-mono font-bold"
                    >
                      <span className="text-xs">{p.user_avatar || "👤"}</span>
                      <span className="truncate max-w-[100px]">{p.user_name}</span>
                      {canAssignModulePic("kas") && (
                        <button
                          type="button"
                          onClick={() => handleRemovePic("kas", p.user_id, p.user_name)}
                          className="text-[#92400E] hover:text-red-700 hover:bg-amber-200 rounded px-1 text-xs font-bold leading-none cursor-pointer transition-colors"
                          title={`Hapus ${p.user_name} dari PIC Kas`}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Add PIC Kas selector */}
            {canAssignModulePic("kas") && (
              <div className="flex items-center gap-1.5 pt-1.5 border-t border-gray-100 min-w-0 w-full">
                <select
                  title="Pilih anggota untuk ditambahkan sebagai PIC Kas"
                  value={selectedKasUser}
                  onChange={(e) => setSelectedKasUser(e.target.value)}
                  className="bg-white border border-[#CBD5E1] rounded px-1.5 py-1 text-[10px] font-mono font-semibold text-gray-800 outline-none focus:border-[#1E4E8C] min-w-0 flex-1 truncate cursor-pointer"
                >
                  <option value="">+ Pilih Member PIC Kas...</option>
                  {availableKasMembers.map((m) => (
                    <option key={m.id} value={m.user_id || m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedKasUser}
                  onClick={() => handleAddPic("kas", selectedKasUser)}
                  className="px-2 py-1 bg-[#1E4E8C] text-white text-[10px] font-mono font-bold rounded border border-[#102A45] hover:bg-[#153A6B] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 whitespace-nowrap"
                >
                  + Tambah
                </button>
              </div>
            )}
          </div>

          {/* PIC PANTRY */}
          <div className="bg-white border border-[#CBD5E1] rounded-[2px] p-2.5 flex flex-col justify-between shadow-2xs gap-2 min-w-0 overflow-hidden">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="p-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-[2px] text-xs shrink-0">
                    ☕
                  </span>
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-gray-500 block leading-tight truncate">
                      MODUL PANTRY & SNACK
                    </span>
                    <span className="text-[10px] font-bold text-sky-800 truncate block">
                      PIC Pantry ({pantryPics.length} orang)
                    </span>
                  </div>
                </div>
                <span className="px-1.5 py-0.5 bg-[#E0F2FE] text-[#0369A1] border border-[#38BDF8] rounded-[2px] text-[9px] font-mono font-bold shrink-0">
                  PIC PANTRY
                </span>
              </div>

              {/* List of PIC Pantry Badges */}
              <div className="flex flex-wrap gap-1 min-h-[28px] p-1 bg-gray-50 border border-dashed border-gray-200 rounded items-center">
                {pantryPics.length === 0 ? (
                  <span className="text-[10px] font-mono text-gray-400 italic">
                    Belum ada PIC ditunjuk
                  </span>
                ) : (
                  pantryPics.map((p) => (
                    <span
                      key={p.user_id}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#E0F2FE] text-[#0369A1] border border-[#38BDF8] rounded-[2px] text-[10px] font-mono font-bold"
                    >
                      <span className="text-xs">{p.user_avatar || "👤"}</span>
                      <span className="truncate max-w-[100px]">{p.user_name}</span>
                      {canAssignModulePic("pantry") && (
                        <button
                          type="button"
                          onClick={() => handleRemovePic("pantry", p.user_id, p.user_name)}
                          className="text-[#0369A1] hover:text-red-700 hover:bg-sky-200 rounded px-1 text-xs font-bold leading-none cursor-pointer transition-colors"
                          title={`Hapus ${p.user_name} dari PIC Pantry`}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Add PIC Pantry selector */}
            {canAssignModulePic("pantry") && (
              <div className="flex items-center gap-1.5 pt-1.5 border-t border-gray-100 min-w-0 w-full">
                <select
                  title="Pilih anggota untuk ditambahkan sebagai PIC Pantry"
                  value={selectedPantryUser}
                  onChange={(e) => setSelectedPantryUser(e.target.value)}
                  className="bg-white border border-[#CBD5E1] rounded px-1.5 py-1 text-[10px] font-mono font-semibold text-gray-800 outline-none focus:border-[#1E4E8C] min-w-0 flex-1 truncate cursor-pointer"
                >
                  <option value="">+ Pilih Member PIC Pantry...</option>
                  {availablePantryMembers.map((m) => (
                    <option key={m.id} value={m.user_id || m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedPantryUser}
                  onClick={() => handleAddPic("pantry", selectedPantryUser)}
                  className="px-2 py-1 bg-[#1E4E8C] text-white text-[10px] font-mono font-bold rounded border border-[#102A45] hover:bg-[#153A6B] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 whitespace-nowrap"
                >
                  + Tambah
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Notification Banner */}
      {statusMessage && (
        <div className="p-2 bg-[#D4EDDA] border border-[#C3E6CB] text-[#155724] text-xs flex items-center gap-2 rounded-[2px] shadow-inner animate-in fade-in duration-200">
          <CheckCircle2 className="size-3.5 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* 2. TOOLBAR: SEARCH, FILTERS & ACTIONS */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Search Input & Role Filters */}
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="size-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAdmin ? "Cari nama atau email..." : "Cari nama anggota..."}
              className="w-full pl-7 pr-6 py-1 bg-white border border-[#CBD5E1] rounded-[2px] text-xs focus:outline-none focus:border-[#1E4E8C] shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Quick Role Filters */}
          <div className="flex items-center bg-[#CBD5E1]/60 p-0.5 rounded-[2px] border border-[#CBD5E1] text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setRoleFilter("all")}
              className={cn(
                "px-2 py-0.5 rounded-[2px] font-semibold transition-colors cursor-pointer",
                roleFilter === "all"
                  ? "bg-white text-[#14253D] shadow-xs font-bold"
                  : "text-gray-600 hover:text-[#14253D]"
              )}
            >
              Semua ({members.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("admin")}
              className={cn(
                "px-2 py-0.5 rounded-[2px] font-semibold transition-colors cursor-pointer",
                roleFilter === "admin"
                  ? "bg-purple-100 text-purple-900 border border-purple-300 shadow-xs font-bold"
                  : "text-gray-600 hover:text-purple-700"
              )}
            >
              Admin ({adminCount})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("member")}
              className={cn(
                "px-2 py-0.5 rounded-[2px] font-semibold transition-colors cursor-pointer",
                roleFilter === "member"
                  ? "bg-white text-slate-800 shadow-xs font-bold"
                  : "text-gray-600 hover:text-slate-800"
              )}
            >
              Member ({memberCount})
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isAdmin && (
            <button
              type="button"
              onClick={openAddModal}
              className="h-7 px-2.5 bg-[#1E4E8C] hover:bg-[#153A6B] text-white border border-[#102A45] rounded-[2px] font-mono font-bold text-[11px] flex items-center gap-1.5 shadow-xs active:translate-y-px cursor-pointer"
            >
              <UserPlus className="size-3.5" />
              <span>+ Tambah Anggota</span>
            </button>
          )}

          <button
            type="button"
            onClick={loadMembers}
            title="Muat ulang data anggota"
            className="h-7 px-2 bg-white hover:bg-gray-50 text-[#14253D] border border-[#CBD5E1] rounded-[2px] font-mono text-[11px] flex items-center gap-1 shadow-xs active:translate-y-px cursor-pointer"
          >
            <RefreshCw className={cn("size-3 text-blue-700", isLoading && "animate-spin")} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>
        </div>
      </div>

      {/* 3. RETRO TABLE DIRECTORY */}
      <div className="flex-1 bg-white border border-[#CBD5E1] rounded-[3px] shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto flex-1 max-h-[calc(100vh-280px)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#CBD5E1] text-[11px] text-gray-600 font-mono sticky top-0 z-10 select-none">
                <th className="p-2 border-r border-[#CBD5E1] w-10 text-center font-bold">#</th>
                <th className="p-2 border-r border-[#CBD5E1] font-bold">Nama Anggota</th>
                {isAdmin && (
                  <th className="p-2 border-r border-[#CBD5E1] font-bold">Email</th>
                )}
                <th className="p-2 border-r border-[#CBD5E1] font-bold w-44">Peran</th>
                <th className="p-2 font-bold text-center w-48">
                  {isAdmin ? "Pengaturan Peran" : "Status Izin"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="p-8 text-center text-gray-400 font-mono italic">
                    Memuat data direktori tim...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="p-8 text-center text-gray-400 font-mono italic">
                    {searchQuery
                      ? "Tidak ada anggota yang cocok dengan kata kunci."
                      : "Belum ada anggota tim terdaftar."}
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member, idx) => {
                  const isItemAdmin = member.role === "admin"
                  const isMe = user?.id === member.user_id || user?.email === member.email
                  const picTags = getUserPicTags(member.user_id || member.id)

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-blue-50/50 transition-colors"
                    >
                      {/* Index */}
                      <td className="p-2 border-r border-gray-100 text-center font-mono text-[11px] text-gray-400">
                        {idx + 1}
                      </td>

                      {/* Name & Avatar */}
                      <td className="p-2 border-r border-gray-100">
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            src={member.avatar_url}
                            name={member.name}
                            size="size-6"
                            textClass="text-[10px]"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-gray-900 leading-tight truncate">
                                {member.name}
                              </span>
                              {isMe && (
                                <span className="text-[9px] font-mono font-bold bg-blue-50 text-blue-700 px-1 py-0.2 rounded border border-blue-200">
                                  Anda
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email (Khusus Admin) */}
                      {isAdmin && (
                        <td className="p-2 border-r border-gray-100 font-mono text-[11px] text-gray-600 truncate max-w-[200px]">
                          {member.email || "-"}
                        </td>
                      )}

                      {/* Role & PIC Badges */}
                      <td className="p-2 border-r border-gray-100">
                        <div className="flex flex-wrap items-center gap-1">
                          {isItemAdmin ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                              <Shield className="size-2.5 text-purple-700" />
                              <span>Admin</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-300">
                              <User className="size-2.5 text-slate-500" />
                              <span>Member</span>
                            </span>
                          )}

                          {picTags.map((tag) => (
                            <span
                              key={tag.module}
                              className={cn(
                                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border shadow-2xs",
                                tag.color
                              )}
                            >
                              <span>{tag.icon}</span>
                              <span>{tag.label}</span>
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-2 text-center">
                        {!isAdmin ? (
                          <span className="text-[10px] text-gray-400 font-mono italic">
                            {isGuest ? "Mode Tamu" : "Hanya Lihat"}
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            {/* Role Dropdown */}
                            <select
                              value={member.role}
                              onChange={(e) =>
                                handleSetRole(member.id, e.target.value as UserRole)
                              }
                              title="Pilih peran anggota ini"
                              className="px-1.5 py-0.5 bg-white text-gray-800 border border-[#CBD5E1] rounded text-[10px] font-mono outline-none cursor-pointer focus:border-[#1E4E8C]"
                            >
                              <option value="admin">🛡️ Admin</option>
                              <option value="member">👤 Member</option>
                            </select>

                            <RetroActionButton
                              action="edit"
                              visual="icon"
                              size="sm"
                              onClick={() => openEditModal(member)}
                              tooltip="Edit anggota"
                            />
                            <RetroActionButton
                              action="delete"
                              visual="icon"
                              size="sm"
                              onClick={() => setMemberToDelete(member)}
                              tooltip="Hapus anggota"
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Status Bar footer */}
        <div className="px-3 py-1.5 bg-[#F8FAFC] border-t border-[#CBD5E1] flex items-center justify-between text-[11px] text-gray-500 font-mono">
          <span>{filteredMembers.length} anggota ditampilkan</span>
          <span className="text-[10px]">team.exe v2.1 // DIRECTORY</span>
        </div>
      </div>

      {/* 4. MODAL TAMBAH / EDIT ANGGOTA */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[1px] p-4 select-none animate-in fade-in-0 duration-150">
          <div className="w-full max-w-md bg-white border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] rounded-[4px] shadow-2xl overflow-hidden">
            {/* Modal Title Bar */}
            <div className="h-8 bg-gradient-to-r from-[#102A45] via-[#1E4E8C] to-[#2E6FB5] text-white px-3 flex items-center justify-between font-mono font-bold text-xs">
              <span className="flex items-center gap-1.5">
                <Users className="size-3.5 text-blue-200" />
                <span>{editingMember ? "Edit Anggota Tim" : "Tambah Anggota Baru"}</span>
              </span>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="size-5 hover:bg-white/20 rounded flex items-center justify-center text-sm leading-none cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveMember} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-800 font-bold mb-1">
                  Nama Lengkap:
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={formEmoji}
                    onChange={(e) => setFormEmoji(e.target.value)}
                    className="p-1.5 border border-[#CBD5E1] rounded-[2px] bg-white text-base outline-none cursor-pointer"
                    title="Pilih Avatar Emoji"
                  >
                    <option value="👤">👤 Netral</option>
                    <option value="🛡️">🛡️ Administrator</option>
                    <option value="👑">👑 Bendahara</option>
                    <option value="👨‍💻">👨‍💻 Dev Pria</option>
                    <option value="👩‍💼">👩‍💼 Dev Wanita</option>
                    <option value="🧑‍🔬">🧑‍🔬 QA / Analyst</option>
                    <option value="☕">☕ Kopi Lover</option>
                    <option value="🍕">🍕 Foodie</option>
                  </select>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: Rian Hidayat"
                    className="flex-1 p-1.5 border border-[#CBD5E1] rounded-[2px] bg-white text-xs outline-none focus:border-[#1E4E8C] focus:ring-1 focus:ring-[#1E4E8C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-800 font-bold mb-1">
                  Email Kantor / Kontak:
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="Contoh: rian@office.internal"
                  className="w-full p-1.5 border border-[#CBD5E1] rounded-[2px] bg-white text-xs outline-none focus:border-[#1E4E8C] focus:ring-1 focus:ring-[#1E4E8C] font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-800 font-bold mb-1.5">
                  Peran & Hak Akses:
                </label>
                <div className="space-y-1.5">
                  <label
                    className={cn(
                      "flex items-start gap-2.5 p-2 rounded border cursor-pointer transition-colors",
                      formRole === "admin"
                        ? "bg-purple-50 border-purple-300 ring-1 ring-purple-400"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100/70"
                    )}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="admin"
                      checked={formRole === "admin"}
                      onChange={() => setFormRole("admin")}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <strong className="text-purple-900 flex items-center gap-1 text-xs">
                        <Shield className="size-3 text-purple-700" />
                        Administrator (Superuser)
                      </strong>
                      <p className="text-[10px] text-gray-500 leading-tight mt-0.5">
                        Akses penuh: kelola anggota tim, pengeluaran kas, serta tagihan.
                      </p>
                    </div>
                  </label>

                  <label
                    className={cn(
                      "flex items-start gap-2.5 p-2 rounded border cursor-pointer transition-colors",
                      formRole === "member"
                        ? "bg-blue-50 border-blue-300 ring-1 ring-blue-400"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100/70"
                    )}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="member"
                      checked={formRole === "member"}
                      onChange={() => setFormRole("member")}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <strong className="text-gray-900 flex items-center gap-1 text-xs">
                        <User className="size-3 text-gray-600" />
                        Anggota Tim (Member)
                      </strong>
                      <p className="text-[10px] text-gray-500 leading-tight mt-0.5">
                        Partisipasi standar: voting, live chat, patungan, dan setor kas.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex justify-end gap-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-[#CBD5E1] rounded-[2px] font-mono font-bold text-xs cursor-pointer shadow-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 bg-[#1E4E8C] hover:bg-[#153A6B] text-white border border-[#102A45] rounded-[2px] font-mono font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs active:translate-y-px"
                >
                  <Check className="size-3.5" />
                  <span>{editingMember ? "Simpan Perubahan" : "Tambahkan Anggota"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(memberToDelete)}
        onClose={() => setMemberToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="HAPUS_ANGGOTA.EXE"
        message={
          <div>
            <p className="mb-1">
              Apakah Anda yakin ingin menghapus{" "}
              <strong>&quot;{memberToDelete?.name}&quot;</strong> dari tim?
            </p>
            <p className="text-[11px] text-gray-500 font-mono">
              Akses akun ini akan dihapus dari daftar anggota tim.
            </p>
          </div>
        }
        confirmText={isDeleting ? "Menghapus..." : "Hapus Anggota"}
        cancelText="Batal"
        isLoading={isDeleting}
      />
    </div>
  )
}
