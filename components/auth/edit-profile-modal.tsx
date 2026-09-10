"use client"

import * as React from "react"
import { useAuth } from "@/lib/auth"
import { UserAvatar } from "@/components/retro/user-avatar"
import { User, X, Check, AlertCircle, ShieldCheck, Crown, ShieldAlert } from "lucide-react"

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const { user, isGuest, isAdmin, isTreasurer, updateProfile } = useAuth()

  const [name, setName] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  // Sync initial name when opened or user changes
  React.useEffect(() => {
    if (isOpen && user) {
      setName(user.name || "")
      setErrorMessage(null)
      setSuccessMessage(null)
    }
  }, [isOpen, user])

  if (!isOpen || !user) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const trimmed = name.trim()
    if (!trimmed) {
      setErrorMessage("Nama tidak boleh kosong.")
      return
    }
    if (trimmed.length < 2) {
      setErrorMessage("Nama minimal 2 karakter.")
      return
    }
    if (trimmed === user.name) {
      onClose()
      return
    }

    setIsSaving(true)
    const res = await updateProfile({ name: trimmed })
    setIsSaving(false)

    if (res.success) {
      setSuccessMessage("Profil berhasil diperbarui!")
      setTimeout(() => {
        onClose()
      }, 700)
    } else {
      setErrorMessage(res.error || "Gagal memperbarui profil.")
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 select-none">
      <div className="retro-window-frame max-w-sm w-full rounded-[3px] overflow-hidden shadow-[5px_5px_0px_rgba(0,0,0,0.35)] flex flex-col bg-[#D4DDE6] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287]">
        {/* Title Bar */}
        <div className="retro-titlebar px-2.5 py-1.5 flex items-center justify-between font-mono text-xs font-bold text-white bg-gradient-to-r from-[#102A45] via-[#1E4E8C] to-[#2E6FB5]">
          <div className="flex items-center gap-2">
            <User className="size-3.5 text-blue-200" />
            <span>PROFILE.EXE — EDIT PROFIL</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-4 bg-[#D4DDE6] text-[#14253D] hover:bg-[#C53030] hover:text-white flex items-center justify-center border border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] font-mono text-[10px] font-bold active:translate-y-px"
          >
            <X className="size-3" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs font-sans text-[#14253D]">
          {/* Avatar & Identitas Header */}
          <div className="flex items-center gap-3 p-2.5 bg-white/70 border border-[#A4B5C6] rounded-[2px]">
            <UserAvatar
              src={user.avatarUrl}
              name={name || user.name}
              size="size-11"
              textClass="text-sm font-bold"
            />
            <div className="min-w-0 flex-1">
              <div className="font-bold text-xs truncate">{name || user.name}</div>
              <div className="text-[10px] text-gray-500 truncate font-mono">{user.email}</div>
              <div className="mt-1 flex items-center gap-1">
                {isGuest ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1 py-0.2 rounded">
                    <ShieldAlert className="size-2.5" /> Mode Tamu
                  </span>
                ) : isAdmin ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold bg-purple-100 text-purple-800 border border-purple-300 px-1 py-0.2 rounded">
                    <ShieldCheck className="size-2.5" /> Administrator
                  </span>
                ) : isTreasurer ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300 px-1 py-0.2 rounded">
                    <Crown className="size-2.5" /> Bendahara
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200 px-1 py-0.2 rounded">
                    <User className="size-2.5" /> Anggota Tim
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Input Nama Display / Username */}
          <div className="space-y-1.5">
            <label htmlFor="display-name" className="font-bold font-mono text-[11px] block">
              Nama Pengguna / Username:
            </label>
            <input
              id="display-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masukkan nama tampilan..."
              maxLength={40}
              autoFocus
              className="w-full px-2.5 py-1.5 text-xs bg-white text-[#14253D] font-mono border-2 border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px] focus:outline-none focus:ring-1 focus:ring-[#1E4E8C]"
            />
            <span className="text-[10px] text-gray-500 font-mono block">
              Nama ini akan muncul di Chat, Vote, dan seluruh suite.
            </span>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-2 bg-red-50 border border-red-300 text-red-700 font-mono text-[10px] rounded flex items-center gap-1.5">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-2 bg-emerald-50 border border-emerald-300 text-emerald-700 font-mono text-[10px] rounded flex items-center gap-1.5">
              <Check className="size-3.5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#A4B5C6]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3 py-1 bg-[#D4DDE6] hover:bg-[#C2CEDC] text-[#14253D] font-mono text-xs border border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] rounded-[2px] active:translate-y-px cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="px-4 py-1 bg-[#1E4E8C] hover:bg-[#153A6B] text-white font-mono text-xs font-bold border border-[#102A45] shadow-[1px_1px_0px_#102A45] rounded-[2px] active:translate-y-px cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
