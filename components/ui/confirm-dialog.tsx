"use client"

import * as React from "react"
import { AlertTriangle, Trash2, X } from "lucide-react"

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title?: string
  titleIcon?: React.ReactNode
  message: React.ReactNode
  icon?: React.ReactNode
  confirmText?: string
  confirmIcon?: React.ReactNode
  cancelText?: string
  variant?: "destructive" | "warning" | "default"
  isLoading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "KONFIRMASI_HAPUS.EXE",
  titleIcon,
  message,
  icon,
  confirmText = "Hapus",
  confirmIcon,
  cancelText = "Batal",
  variant = "destructive",
  isLoading = false,
}: ConfirmDialogProps) {
  React.useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const isDestructive = variant === "destructive"

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-4 select-none animate-in fade-in-0 duration-150">
      <div
        role="alertdialog"
        aria-modal="true"
        className="retro-window-frame max-w-sm w-full rounded-[4px] overflow-hidden shadow-[6px_6px_0px_rgba(0,0,0,0.35)] bg-white flex flex-col"
      >
        {/* Titlebar */}
        <div
          className={`px-3 py-1.5 flex items-center justify-between font-mono text-xs font-bold ${
            isDestructive
              ? "bg-[#7A1E1E] text-white border-b border-[#4A1010]"
              : "retro-titlebar text-[#14253D]"
          }`}
        >
          <div className="flex items-center gap-1.5">
            {titleIcon ?? (isDestructive ? (
              <Trash2 className="size-3.5 text-red-200" />
            ) : (
              <AlertTriangle className="size-3.5 text-amber-500" />
            ))}
            <span>{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="hover:opacity-75 font-bold px-1 text-sm leading-none cursor-pointer disabled:opacity-50"
            title="Tutup (Esc)"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div
              className={`size-10 rounded-[2px] border flex items-center justify-center shrink-0 text-xl shadow-inner ${
                isDestructive
                  ? "bg-red-50 border-red-200 text-red-600"
                  : "bg-amber-50 border-amber-200 text-amber-600"
              }`}
            >
              {icon ?? (isDestructive ? "🗑️" : "⚠️")}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="text-xs font-mono font-bold text-[#14253D] leading-snug">
                Peringatan Sistem
              </div>
              <div className="text-xs text-gray-600 font-sans mt-1 leading-relaxed">
                {message}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-[#CBD5E1]">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="retro-button-3d px-3.5 py-1 text-xs font-mono font-bold rounded-[2px] cursor-pointer disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={async () => {
                await onConfirm()
              }}
              disabled={isLoading}
              className={`px-3.5 py-1 text-white text-xs font-mono font-bold rounded-[2px] flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-sm ${
                isDestructive
                  ? "bg-red-600 hover:bg-red-700 border border-red-800"
                  : "bg-[#1E4E8C] hover:bg-[#153A6B] border border-[#102A45]"
              }`}
            >
              {confirmIcon ?? (isDestructive && <Trash2 className="size-3" />)}
              {isLoading ? "Memproses..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
