"use client"

import * as React from "react"
import { useAuth, UserRole } from "@/lib/auth"
import { useTeamStore, TeamMember } from "@/lib/team-store"
import {
  Users,
  UserPlus,
  Crown,
  UserCheck,
  Shield,
  Trash2,
  Edit2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Mail,
  User,
  Eye
} from "lucide-react"

export function TeamApp() {
  const { user, isAdmin, isTreasurer, isGuest, setDemoUserRole } = useAuth()
  const {
    members,
    isLoading,
    loadMembers,
    addMember,
    updateMember,
    setMemberRole,
    toggleMemberRole,
    deleteMember,
  } = useTeamStore()

  // Modal form states
  const [showModal, setShowModal] = React.useState(false)
  const [editingMember, setEditingMember] = React.useState<TeamMember | null>(null)
  const [formName, setFormName] = React.useState("")
  const [formEmail, setFormEmail] = React.useState("")
  const [formRole, setFormRole] = React.useState<UserRole>("member")
  const [formEmoji, setFormEmoji] = React.useState("👤")
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null)

  const adminCount = members.filter((m) => m.role === "admin").length
  const treasurerCount = members.filter((m) => m.role === "treasurer").length
  const memberCount = members.filter((m) => m.role === "member").length

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
      member.avatar_url ||
        (member.role === "admin" ? "🛡️" : member.role === "treasurer" ? "👑" : "👤")
    )
    setShowModal(true)
  }

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) return

    const defaultAvatar =
      formEmoji || (formRole === "admin" ? "🛡️" : formRole === "treasurer" ? "👑" : "👤")

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
    setTimeout(() => setStatusMessage(null), 4000)
  }

  const handleDelete = async (member: TeamMember) => {
    if (confirm(`Apakah Anda yakin ingin menghapus "${member.name}" dari tim?`)) {
      await deleteMember(member.id)
      setStatusMessage(`Anggota "${member.name}" telah dihapus.`)
      setTimeout(() => setStatusMessage(null), 4000)
    }
  }

  const handleSetRole = async (memberId: string, role: UserRole) => {
    await setMemberRole(memberId, role)
    const roleLabels: Record<UserRole, string> = { admin: "Administrator", treasurer: "Bendahara", member: "Anggota", guest: "Tamu" }
    setStatusMessage(`Peran anggota berhasil diubah ke: ${roleLabels[role]}`)
    setTimeout(() => setStatusMessage(null), 4000)
  }

  const handleSetMyRole = (role: UserRole) => {
    if (!setDemoUserRole || !user) return
    setDemoUserRole(role)
    const roleLabels: Record<UserRole, string> = { admin: "Administrator", treasurer: "Bendahara", member: "Anggota Tim", guest: "Tamu" }
    setStatusMessage(`Peran akun aktif Anda dialihkan ke: ${roleLabels[role]}`)
    setTimeout(() => setStatusMessage(null), 4000)
  }

  return (
    <div className="h-full flex flex-col bg-[#C0C0C0] text-black font-sans text-xs select-none">
      {/* 1. RETRO TOP MENU & STATUS NOTIFICATION */}
      <div className="px-2 py-1.5 bg-[#EFEFEF] border-b border-[#808080] flex items-center justify-between shadow-inner">
        <div className="flex items-center gap-2">
          <span className="font-bold flex items-center gap-1.5 text-xs">
            <Users className="w-4 h-4 text-blue-700" />
            Pengaturan Peserta & Manajemen Peran (Roles)
          </span>
        </div>
        <div className="text-[11px] text-gray-700">
          Total: <strong>{members.length}</strong> anggota (
          <span className="text-purple-700 font-bold">{adminCount} Admin</span>,{" "}
          <span className="text-amber-700 font-bold">{treasurerCount} Bendahara</span>,{" "}
          <span className="text-slate-600">{memberCount} Member</span>)
        </div>
      </div>

      {/* 2. ACTIVE USER ROLE SIMULATOR BANNER */}
      <div className="m-2 p-2 bg-[#FFFFE1] border border-[#808080] shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-700 shrink-0" />
          <div>
            <span className="text-gray-700">Akun Anda: </span>
            <strong className="text-gray-900">{user?.name || "Tamu"}</strong>
            {" — "}
            <span className="text-gray-700">Peran Aktif: </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                isAdmin
                  ? "bg-purple-100 text-purple-900 border border-purple-400"
                  : isTreasurer
                  ? "bg-amber-100 text-amber-900 border border-amber-400"
                  : "bg-blue-100 text-blue-900 border border-blue-400"
              }`}
            >
              {isAdmin
                ? "🛡️ Administrator (Superuser)"
                : isTreasurer
                ? "👑 Bendahara (Treasurer)"
                : "👤 Anggota Tim (Member)"}
            </span>
          </div>
        </div>

        {/* Quick Role Switcher for active session or Guest Notice */}
        {isGuest ? (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[11px] font-bold">
            <Eye className="w-3.5 h-3.5 text-amber-700" />
            <span>Mode Tamu (Read-Only)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-600 font-bold">Ubah Mode Cepat:</span>
            <button
              type="button"
              onClick={() => handleSetMyRole("admin")}
              title="Set akun Anda sebagai Administrator"
              className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                user?.role === "admin"
                  ? "bg-purple-800 text-white border-purple-900"
                  : "bg-[#C0C0C0] text-black border-t-white border-l-white border-b-[#404040] border-r-[#404040] hover:bg-[#D4D4D4]"
              }`}
            >
              🛡️ Admin
            </button>
            <button
              type="button"
              onClick={() => handleSetMyRole("treasurer")}
              title="Set akun Anda sebagai Bendahara"
              className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                user?.role === "treasurer"
                  ? "bg-amber-600 text-white border-amber-800"
                  : "bg-[#C0C0C0] text-black border-t-white border-l-white border-b-[#404040] border-r-[#404040] hover:bg-[#D4D4D4]"
              }`}
            >
              👑 Bendahara
            </button>
            <button
              type="button"
              onClick={() => handleSetMyRole("member")}
              title="Set akun Anda sebagai Anggota biasa"
              className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                user?.role === "member"
                  ? "bg-slate-700 text-white border-slate-900"
                  : "bg-[#C0C0C0] text-black border-t-white border-l-white border-b-[#404040] border-r-[#404040] hover:bg-[#D4D4D4]"
              }`}
            >
              👤 Member
            </button>
          </div>
        )}
      </div>

      {statusMessage && (
        <div className="mx-2 mb-2 p-1.5 bg-[#D4EDDA] border border-[#C3E6CB] text-[#155724] text-[11px] flex items-center gap-2 shadow-inner">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* 3. TOOLBAR */}
      <div className="px-2 pb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {!isGuest && (
            <button
              type="button"
              onClick={openAddModal}
              className="px-3 py-1 font-bold bg-[#C0C0C0] border-2 border-t-white border-l-white border-b-[#404040] border-r-[#404040] active:border-t-[#404040] active:border-l-[#404040] active:border-b-white active:border-r-white hover:bg-[#D4D4D4] flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-700" />
              + Tambah Anggota Baru
            </button>
          )}
          <button
            type="button"
            onClick={loadMembers}
            className="px-2.5 py-1 bg-[#C0C0C0] border-2 border-t-white border-l-white border-b-[#404040] border-r-[#404040] active:border-t-[#404040] active:border-l-[#404040] active:border-b-white active:border-r-white hover:bg-[#D4D4D4] flex items-center gap-1 shadow-sm"
          >
            <RefreshCw className="w-3 h-3 text-blue-800" />
            Segarkan
          </button>
        </div>

        <div className="text-[11px] text-gray-600 italic">
          * Admin & Bendahara memegang otorisasi penuh transaksi dan iuran Kas
        </div>
      </div>

      {/* 4. RETRO LISTVIEW / TABLE */}
      <div className="flex-1 mx-2 mb-2 bg-white border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#DFDFDF] border-b border-[#808080] sticky top-0 z-10 text-[11px]">
              <th className="p-1.5 border-r border-[#808080] w-8 text-center font-bold">#</th>
              <th className="p-1.5 border-r border-[#808080] font-bold">Nama Anggota</th>
              <th className="p-1.5 border-r border-[#808080] font-bold">Email</th>
              <th className="p-1.5 border-r border-[#808080] font-bold w-48">Peran / Hak Akses</th>
              <th className="p-1.5 font-bold text-center w-56">Aksi & Pengaturan Peran</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-500 italic">
                  Memuat data anggota...
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-500 italic">
                  Belum ada data anggota tim terdaftar.
                </td>
              </tr>
            ) : (
              members.map((member, idx) => {
                const isItemAdmin = member.role === "admin"
                const isItemTreasurer = member.role === "treasurer"

                return (
                  <tr
                    key={member.id}
                    className="border-b border-gray-200 hover:bg-blue-50 transition-colors"
                  >
                    <td className="p-1.5 border-r border-gray-200 text-center font-mono text-gray-500">
                      {idx + 1}
                    </td>
                    <td className="p-1.5 border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{member.avatar_url || "👤"}</span>
                        <div>
                          <strong className="text-gray-900">{member.name}</strong>
                          {(user?.id === member.user_id || user?.email === member.email) && (
                            <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-700 px-1 py-0.2 rounded font-bold">
                              (Anda)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-1.5 border-r border-gray-200 text-gray-600 font-mono text-[11px]">
                      {member.email || "-"}
                    </td>
                    <td className="p-1.5 border-r border-gray-200">
                      {isItemAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                          <Shield className="w-3 h-3 text-purple-700" />
                          Administrator (Superuser)
                        </span>
                      ) : isItemTreasurer ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <Crown className="w-3 h-3 text-amber-600" />
                          Bendahara (Treasurer)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-300">
                          <UserCheck className="w-3 h-3 text-slate-500" />
                          Anggota Tim (Member)
                        </span>
                      )}
                    </td>
                    <td className="p-1.5 text-center">
                      {isGuest ? (
                        <span className="text-[10px] text-gray-500 font-mono italic">
                          Read-Only
                        </span>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          {/* Quick Role Dropdown */}
                          <select
                            value={member.role}
                            onChange={(e) =>
                              handleSetRole(member.id, e.target.value as UserRole)
                            }
                            title="Pilih peran anggota ini"
                            className="px-1 py-0.5 bg-[#C0C0C0] text-black border border-t-white border-l-white border-b-[#404040] border-r-[#404040] text-[10px] font-mono outline-none cursor-pointer"
                          >
                            <option value="admin">🛡️ Admin</option>
                            <option value="treasurer">👑 Bendahara</option>
                            <option value="member">👤 Member</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => openEditModal(member)}
                            title="Edit nama/email/avatar"
                            className="p-1 bg-[#C0C0C0] text-black border border-t-white border-l-white border-b-[#404040] border-r-[#404040] active:border-t-[#404040] active:border-l-[#404040] active:border-b-white active:border-r-white hover:bg-[#D4D4D4] cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3 text-blue-700" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(member)}
                            title="Hapus anggota dari tim"
                            className="p-1 bg-[#C0C0C0] text-black border border-t-white border-l-white border-b-[#404040] border-r-[#404040] active:border-t-[#404040] active:border-l-[#404040] active:border-b-white active:border-r-white hover:bg-[#D4D4D4] cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </button>
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

      {/* 5. RETRO STATUS BAR */}
      <div className="px-2 py-1 bg-[#C0C0C0] border-t border-[#808080] flex items-center justify-between text-[11px] text-gray-700">
        <div className="flex items-center gap-3">
          <span className="border-r border-[#808080] pr-3">
            {members.length} peserta terdata
          </span>
          <span className="border-r border-[#808080] pr-3">
            {adminCount} Administrator, {treasurerCount} Bendahara
          </span>
          <span>Status: Siap</span>
        </div>
        <div className="font-mono text-[10px] text-gray-500">team.exe v2.0 // RBAC</div>
      </div>

      {/* 6. MODAL TAMBAH / EDIT ANGGOTA */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-[#C0C0C0] border-2 border-t-white border-l-white border-b-black border-r-black shadow-2xl">
            {/* Modal Title Bar */}
            <div className="bg-[#000080] text-white px-2 py-1 flex items-center justify-between font-bold text-xs select-none">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {editingMember ? "Edit Anggota Tim" : "Tambah Anggota Baru"}
              </span>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-4 h-4 bg-[#C0C0C0] text-black font-bold flex items-center justify-center border border-t-white border-l-white border-b-black border-r-black text-[10px] leading-none hover:bg-red-200"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveMember} className="p-3 space-y-3">
              <div>
                <label className="block text-gray-800 font-bold mb-1">
                  Nama Lengkap Peserta:
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={formEmoji}
                    onChange={(e) => setFormEmoji(e.target.value)}
                    className="p-1 border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white text-base"
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
                    className="flex-1 p-1.5 border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white text-xs outline-none focus:bg-yellow-50"
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
                  className="w-full p-1.5 border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-white text-xs outline-none focus:bg-yellow-50 font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-800 font-bold mb-1">
                  Peran & Hak Akses (Role):
                </label>
                <div className="p-2 border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-[#EFEFEF] space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="admin"
                      checked={formRole === "admin"}
                      onChange={() => setFormRole("admin")}
                      className="mt-0.5"
                    />
                    <div>
                      <strong className="text-purple-900 flex items-center gap-1">
                        <Shield className="w-3 h-3 text-purple-700" />
                        Administrator (Superuser)
                      </strong>
                      <p className="text-[10px] text-gray-600">
                        Hak akses tertinggi: mengelola seluruh peran anggota, pengeluaran kas, serta tagihan.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="treasurer"
                      checked={formRole === "treasurer"}
                      onChange={() => setFormRole("treasurer")}
                      className="mt-0.5"
                    />
                    <div>
                      <strong className="text-amber-800 flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-600" />
                        Bendahara (Treasurer)
                      </strong>
                      <p className="text-[10px] text-gray-600">
                        Otorisasi keuangan: input & hapus pengeluaran kas, serta konfirmasi checklist iuran anggota.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="member"
                      checked={formRole === "member"}
                      onChange={() => setFormRole("member")}
                      className="mt-0.5"
                    />
                    <div>
                      <strong className="text-gray-900">Anggota Tim (Member)</strong>
                      <p className="text-[10px] text-gray-600">
                        Bisa mengajukan/vote usulan pantry, ikut putaran makan siang, patungan split bill, dan menyetor kas.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex justify-end gap-2 border-t border-[#808080]">
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold bg-[#C0C0C0] text-black border-2 border-t-white border-l-white border-b-[#404040] border-r-[#404040] active:border-t-[#404040] active:border-l-[#404040] active:border-b-white active:border-r-white hover:bg-[#D4D4D4]"
                >
                  {editingMember ? "Simpan Perubahan" : "Tambahkan Anggota"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 bg-[#C0C0C0] text-black border-2 border-t-white border-l-white border-b-[#404040] border-r-[#404040] active:border-t-[#404040] active:border-l-[#404040] active:border-b-white active:border-r-white hover:bg-[#D4D4D4]"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
