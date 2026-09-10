"use client"

import * as React from "react"
import { useAuth } from "@/lib/auth"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { UserAvatar } from "@/components/retro/user-avatar"
import { RETRO_AVATAR_PRESETS, isRetroAvatarPreset, findRetroAvatarPreset } from "@/lib/avatar-presets"
import { User, X, Check, AlertCircle, ShieldCheck, Crown, ShieldAlert, Sparkles, Image as ImageIcon } from "lucide-react"

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const { user, isGuest, isAdmin, isTreasurer, updateProfile } = useAuth()

  const [name, setName] = React.useState("")
  const [selectedAvatar, setSelectedAvatar] = React.useState<string>("")
  const [isSaving, setIsSaving] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  const [googlePhoto, setGooglePhoto] = React.useState<string | undefined>(user?.googleAvatarUrl)

  // Sync initial state when opened or user changes
  React.useEffect(() => {
    if (isOpen && user) {
      setName(user.name || "")
      setSelectedAvatar(user.avatarUrl || "")
      setErrorMessage(null)
      setSuccessMessage(null)
    }
  }, [isOpen, user])

  // Pastikan URL foto Google selalu terdeteksi bahkan jika state context belum reload
  React.useEffect(() => {
    if (user?.googleAvatarUrl) {
      setGooglePhoto(user.googleAvatarUrl)
      return
    }

    if (!isGuest && isSupabaseConfigured && supabase) {
      supabase.auth.getUser().then(({ data }) => {
        const meta = data?.user?.user_metadata || {}
        const identity = data?.user?.identities?.find((i) => i.provider === "google")
        const pic = (
          meta.picture ||
          identity?.identity_data?.picture ||
          identity?.identity_data?.avatar_url ||
          (meta.avatar_url && typeof meta.avatar_url === "string" && meta.avatar_url.startsWith("http") ? meta.avatar_url : undefined)
        ) as string | undefined

        if (pic && typeof pic === "string" && pic.startsWith("http")) {
          setGooglePhoto(pic)
        }
      })
    }
  }, [user, isGuest])

  if (!isOpen || !user) return null

  const hasChanges =
    name.trim() !== user.name ||
    selectedAvatar !== (user.avatarUrl || "")

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

    if (!hasChanges) {
      onClose()
      return
    }

    setIsSaving(true)
    const res = await updateProfile({
      name: trimmed,
      avatarUrl: selectedAvatar,
    })
    setIsSaving(false)

    if (res.success) {
      setSuccessMessage("Profil & avatar berhasil diperbarui!")
      setTimeout(() => {
        onClose()
      }, 700)
    } else {
      setErrorMessage(res.error || "Gagal memperbarui profil.")
    }
  }

  const activePreset = findRetroAvatarPreset(selectedAvatar)
  const isUsingGoogle = !!(googlePhoto && selectedAvatar === googlePhoto)
  const isUsingInitials = selectedAvatar === ""

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 select-none">
      <div className="retro-window-frame max-w-md w-full rounded-[3px] overflow-hidden shadow-[5px_5px_0px_rgba(0,0,0,0.35)] flex flex-col bg-[#D4DDE6] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] animate-in fade-in zoom-in-95 duration-150">
        {/* Title Bar */}
        <div className="retro-titlebar px-2.5 py-1.5 flex items-center justify-between font-mono text-xs font-bold text-white bg-gradient-to-r from-[#102A45] via-[#1E4E8C] to-[#2E6FB5]">
          <div className="flex items-center gap-2">
            <User className="size-3.5 text-blue-200" />
            <span>PROFILE.EXE — EDIT PROFIL & AVATAR</span>
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
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs font-sans text-[#14253D]">
          {/* Avatar Preview & Identitas Header */}
          <div className="flex items-center gap-3 p-3 bg-white/80 border border-[#A4B5C6] rounded-[2px] shadow-inner">
            <div className="relative shrink-0">
              <UserAvatar
                src={selectedAvatar}
                name={name || user.name}
                size="size-13"
                textClass="text-base font-bold"
              />
              <span className="absolute -bottom-1 -right-1 size-4 bg-[#1E4E8C] text-white rounded-full flex items-center justify-center text-[9px] shadow border border-white">
                <Sparkles className="size-2.5" />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm truncate">{name || user.name}</div>
              <div className="text-[11px] text-gray-500 truncate font-mono">{user.email}</div>
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
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
                <span className="text-[9px] font-mono text-gray-600 bg-gray-100 border border-gray-300 px-1.5 py-0.2 rounded">
                  {activePreset
                    ? `Avatar: ${activePreset.name}`
                    : isUsingGoogle
                    ? "Avatar: Akun Google"
                    : isUsingInitials
                    ? "Avatar: Inisial Huruf"
                    : "Avatar: Kustom"}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Pilih Avatar Retro */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold font-mono text-[11px] block text-[#102A45]">
                PILIH PRESET AVATAR RETRO:
              </label>
              <span className="text-[10px] text-gray-500 font-mono">10 Pilihan Pixel Art</span>
            </div>

            {/* Grid Preset */}
            <div className="grid grid-cols-5 gap-2 p-2.5 bg-[#B8C7D4] border-2 border-t-[#7D8E9E] border-l-[#7D8E9E] border-r-white border-b-white rounded-[2px]">
              {RETRO_AVATAR_PRESETS.map((preset) => {
                const isSelected = selectedAvatar === preset.url
                return (
                  <button
                    key={preset.id}
                    type="button"
                    title={preset.name}
                    onClick={() => setSelectedAvatar(preset.url)}
                    className={`group relative p-1.5 rounded-[2px] flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#1E4E8C] text-white shadow-inner border border-[#102A45]"
                        : "bg-[#D4DDE6] hover:bg-white text-[#14253D] border border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] active:translate-y-px"
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="size-8 object-contain pointer-events-none drop-shadow-sm group-hover:scale-105 transition-transform"
                    />
                    <span
                      className={`text-[9px] font-mono mt-1 text-center truncate w-full leading-none ${
                        isSelected ? "text-white font-bold" : "text-gray-700"
                      }`}
                    >
                      {preset.name}
                    </span>
                    {isSelected && (
                      <span className="absolute top-0.5 right-0.5 size-3.5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[8px] shadow">
                        <Check className="size-2.5 stroke-[3]" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Sumber Avatar Lainnya (Google & Inisial) */}
            <div className="space-y-1 pt-1.5">
              <span className="text-[10px] font-mono font-bold text-[#102A45] block">
                SUMBER AVATAR LAINNYA:
              </span>
              <div className="flex items-center gap-2">
                {googlePhoto ? (
                  <button
                    type="button"
                    onClick={() => setSelectedAvatar(googlePhoto)}
                    className={`flex-1 py-1.5 px-2.5 text-[11px] font-mono flex items-center justify-center gap-2 rounded-[2px] border transition-all cursor-pointer ${
                      isUsingGoogle
                        ? "bg-[#1E4E8C] text-white border-[#102A45] shadow-inner font-bold"
                        : "bg-white hover:bg-[#EEF3F8] text-[#14253D] border border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] shadow-sm active:translate-y-px"
                    }`}
                  >
                    <img
                      src={googlePhoto}
                      alt="Google"
                      className="size-4 rounded-full object-cover shrink-0 border border-gray-300"
                    />
                    <span className="truncate">
                      {isUsingGoogle ? "✓ Foto Akun Google (Aktif)" : "Kembalikan ke Foto Akun Google"}
                    </span>
                  </button>
                ) : !isGuest ? (
                  <div className="flex-1 py-1 px-2 text-[10px] font-mono text-gray-400 bg-gray-100 rounded border border-dashed border-gray-300 text-center">
                    Foto Google tidak terdeteksi
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => setSelectedAvatar("")}
                  className={`py-1.5 px-3 text-[11px] font-mono flex items-center justify-center gap-1.5 rounded-[2px] border transition-all cursor-pointer ${
                    isUsingInitials
                      ? "bg-[#1E4E8C] text-white border-[#102A45] shadow-inner font-bold"
                      : "bg-[#D4DDE6] hover:bg-white text-[#14253D] border border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] active:translate-y-px"
                  }`}
                >
                  <div className="size-3.5 rounded-full bg-[#2E5AA8] text-white text-[8px] font-bold flex items-center justify-center shrink-0">
                    {name ? name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <span>{isUsingInitials ? "✓ Inisial (Aktif)" : "Gunakan Inisial"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Input Nama Display / Username */}
          <div className="space-y-1">
            <label htmlFor="display-name" className="font-bold font-mono text-[11px] block text-[#102A45]">
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
              Nama dan avatar ini akan muncul di seluruh fitur (Chat, Vote, Wheel, Team).
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
              className="px-3.5 py-1 bg-[#D4DDE6] hover:bg-[#C2CEDC] text-[#14253D] font-mono text-xs border border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] rounded-[2px] active:translate-y-px cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim() || !hasChanges}
              className="px-4 py-1 bg-[#1E4E8C] hover:bg-[#153A6B] text-white font-mono text-xs font-bold border border-[#102A45] shadow-[1px_1px_0px_#102A45] rounded-[2px] active:translate-y-px cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
