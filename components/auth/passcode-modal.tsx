"use client"

import * as React from "react"
import { useAuth } from "@/lib/auth-context"
import { RetroWindow } from "@/components/retro/window"
import { RetroButton } from "@/components/retro/button"
import { RetroInput } from "@/components/retro/input"
import { StatusChip } from "@/components/retro/status-chip"
import { Lock, ShieldAlert, KeyRound } from "lucide-react"

export function PasscodeModal() {
  const { isUnlocked, unlockWithPin, currentMember, setMember, teamMembers, addMember } = useAuth()
  const [pin, setPin] = React.useState("")
  const [error, setError] = React.useState("")
  const [newMemberName, setNewMemberName] = React.useState("")
  const [isAddingNew, setIsAddingNew] = React.useState(false)

  // Step 1: Passcode Verification
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin.trim()) {
      setError("Masukkan passcode tim!")
      return
    }
    const success = unlockWithPin(pin)
    if (!success) {
      setError("Passcode salah! Hubungi lead tim atau cek config (default: 1337).")
    } else {
      setError("")
    }
  }

  // Step 2: Member Selection
  const handleSelectMember = (name: string) => {
    setMember(name)
  }

  const handleAddNewMember = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemberName.trim()) return
    addMember(newMemberName.trim())
    setMember(newMemberName.trim())
    setNewMemberName("")
    setIsAddingNew(false)
  }

  if (isUnlocked && currentMember) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
      {!isUnlocked ? (
        <RetroWindow
          title="SECURITY CHECK — AUTHENTICATION REQUIRED"
          icon={<Lock className="size-4 text-[var(--warning)]" />}
          controls={false}
          className="w-full max-w-md shadow-retro-lg"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-2.5 bg-[var(--surface-muted)] rounded-[3px] border border-[var(--border)]">
              <KeyRound className="size-6 text-[var(--primary)] shrink-0" />
              <div className="text-xs">
                <div className="font-mono font-bold text-[var(--foreground)]">TI-THINGS INTERNAL ACCESS</div>
                <div className="text-[var(--foreground-muted)] text-[11px]">
                  Aplikasi khusus tim internal. Masukkan Passcode Tim bersama untuk melanjutkan.
                </div>
              </div>
            </div>

            <form onSubmit={handleUnlock} className="space-y-3">
              <RetroInput
                type="password"
                label="SHARED PASSCODE:"
                placeholder="Default: 1337"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
                error={error}
              />

              <div className="flex items-center justify-between pt-2">
                <div className="font-mono text-[11px] text-[var(--foreground-muted)]">
                  [ HINT: 1337 ]
                </div>
                <RetroButton type="submit" variant="primary" size="default">
                  [ UNLOCK_SYSTEM ]
                </RetroButton>
              </div>
            </form>
          </div>
        </RetroWindow>
      ) : (
        <RetroWindow
          title="IDENTITAS ANGGOTA TIM — SELECT USER"
          icon={<ShieldAlert className="size-4 text-[var(--primary)]" />}
          controls={false}
          className="w-full max-w-md shadow-retro-lg"
        >
          <div className="space-y-4">
            <div className="text-xs text-[var(--foreground-muted)]">
              Pilih nama kamu dari daftar tim di bawah agar usulan dan vote tidak tercatat ganda.
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {teamMembers.map((member) => (
                <button
                  key={member}
                  type="button"
                  onClick={() => handleSelectMember(member)}
                  className="w-full text-left px-3 py-2 rounded-[3px] border border-[var(--border)] bg-white dark:bg-[var(--surface-muted)] hover:bg-[var(--primary-soft)] hover:border-[var(--primary)] flex items-center justify-between group transition-colors"
                >
                  <span className="font-mono text-xs font-semibold text-[var(--foreground)]">
                    ● {member}
                  </span>
                  <StatusChip status="neutral" className="group-hover:border-[var(--primary)] group-hover:text-[var(--primary)] text-[10px]">
                    LOGIN SEBAGAI
                  </StatusChip>
                </button>
              ))}
            </div>

            {isAddingNew ? (
              <form onSubmit={handleAddNewMember} className="space-y-2 pt-2 border-t border-[var(--border)]">
                <RetroInput
                  label="NAMA ANGGOTA BARU:"
                  placeholder="Contoh: Farhan"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <RetroButton type="button" size="sm" variant="outline" onClick={() => setIsAddingNew(false)}>
                    Batal
                  </RetroButton>
                  <RetroButton type="submit" size="sm" variant="primary">
                    [ Simpan & Masuk ]
                  </RetroButton>
                </div>
              </form>
            ) : (
              <div className="pt-2 border-t border-[var(--border)] flex justify-between items-center">
                <span className="font-mono text-[11px] text-[var(--foreground-muted)]">
                  Nama belum ada?
                </span>
                <RetroButton type="button" size="sm" variant="secondary" onClick={() => setIsAddingNew(true)}>
                  + Tambah Nama Saya
                </RetroButton>
              </div>
            )}
          </div>
        </RetroWindow>
      )}
    </div>
  )
}
