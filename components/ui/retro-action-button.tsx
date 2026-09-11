"use client"

import * as React from "react"
import { Edit3, Trash2, Undo2, Plus, RotateCw, PlusCircle, LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type ActionType = "edit" | "delete" | "undo" | "add" | "refresh" | "restock" | "custom"
export type ActionSize = "xs" | "sm" | "md"

export interface RetroActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  action: ActionType
  label?: string // Optional text beside icon
  icon?: LucideIcon // Custom icon override
  size?: ActionSize
  isLoading?: boolean
  tooltip?: string
  // Appearance: "icon" for compact table icon, "button" for beveled button with label
  visual?: "icon" | "button"
}

const ACTION_CONFIG: Record<
  ActionType,
  {
    icon: LucideIcon
    defaultTooltip: string
    defaultLabel?: string
    iconColor: string
    hoverBg: string
    hoverBorder: string
    buttonBg: string
    buttonBorder: string
    buttonTextColor: string
  }
> = {
  edit: {
    icon: Edit3,
    defaultTooltip: "Ubah / Edit data",
    defaultLabel: "Edit",
    iconColor: "text-amber-700",
    hoverBg: "hover:bg-amber-50",
    hoverBorder: "hover:border-amber-300",
    buttonBg: "bg-amber-50 hover:bg-amber-100",
    buttonBorder: "border-amber-300",
    buttonTextColor: "text-amber-900",
  },
  delete: {
    icon: Trash2,
    defaultTooltip: "Hapus data",
    defaultLabel: "Hapus",
    iconColor: "text-slate-400 hover:text-red-600",
    hoverBg: "hover:bg-red-50",
    hoverBorder: "hover:border-red-300",
    buttonBg: "bg-red-50 hover:bg-red-100",
    buttonBorder: "border-red-300",
    buttonTextColor: "text-red-800",
  },
  undo: {
    icon: Undo2,
    defaultTooltip: "Batalkan aksi",
    defaultLabel: "Batal",
    iconColor: "text-slate-500",
    hoverBg: "hover:bg-amber-50",
    hoverBorder: "hover:border-amber-300",
    buttonBg: "bg-slate-50 hover:bg-amber-50",
    buttonBorder: "border-slate-300",
    buttonTextColor: "text-slate-700",
  },
  add: {
    icon: Plus,
    defaultTooltip: "Tambah item baru",
    defaultLabel: "Tambah",
    iconColor: "text-white",
    hoverBg: "hover:bg-[#153A6B]",
    hoverBorder: "hover:border-[#0E243A]",
    buttonBg: "bg-[#1E4E8C] hover:bg-[#153A6B]",
    buttonBorder: "border-[#102A45]",
    buttonTextColor: "text-white",
  },
  refresh: {
    icon: RotateCw,
    defaultTooltip: "Segarkan data",
    defaultLabel: "Refresh",
    iconColor: "text-slate-600",
    hoverBg: "hover:bg-slate-100",
    hoverBorder: "hover:border-slate-300",
    buttonBg: "bg-white hover:bg-slate-100",
    buttonBorder: "border-[#CBD5E1]",
    buttonTextColor: "text-slate-700",
  },
  restock: {
    icon: PlusCircle,
    defaultTooltip: "Restock stok fisik",
    defaultLabel: "Restock",
    iconColor: "text-blue-700",
    hoverBg: "hover:bg-blue-100",
    hoverBorder: "hover:border-blue-300",
    buttonBg: "bg-blue-50 hover:bg-blue-100",
    buttonBorder: "border-blue-200",
    buttonTextColor: "text-blue-800",
  },
  custom: {
    icon: Edit3,
    defaultTooltip: "Aksi",
    iconColor: "text-slate-600",
    hoverBg: "hover:bg-slate-100",
    hoverBorder: "hover:border-slate-300",
    buttonBg: "bg-white hover:bg-slate-100",
    buttonBorder: "border-[#CBD5E1]",
    buttonTextColor: "text-slate-700",
  },
}

export function RetroActionButton({
  action,
  label,
  icon: CustomIcon,
  size = "sm",
  isLoading = false,
  tooltip,
  visual = "icon",
  className,
  disabled,
  ...props
}: RetroActionButtonProps) {
  const config = ACTION_CONFIG[action] || ACTION_CONFIG.custom
  const IconComponent = CustomIcon || config.icon
  const resolvedTooltip = tooltip || config.defaultTooltip

  // Icon size mapping
  const iconSizeClass =
    size === "xs" ? "size-3" : size === "md" ? "size-4" : "size-3.5"

  if (visual === "button") {
    const displayText = label || config.defaultLabel || ""
    return (
      <button
        type="button"
        title={resolvedTooltip}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 font-mono font-bold rounded-[2px] border transition-all cursor-pointer select-none active:translate-y-px disabled:opacity-50 disabled:pointer-events-none",
          config.buttonBg,
          config.buttonBorder,
          config.buttonTextColor,
          size === "xs" && "h-6 px-1.5 text-[10px]",
          size === "sm" && "h-7 px-2 text-[11px] shadow-[1px_1px_0px_#CBD5E1]",
          size === "md" && "h-8 px-2.5 text-xs shadow-[1px_1px_0px_#102A45]",
          className
        )}
        {...props}
      >
        <IconComponent
          className={cn(
            iconSizeClass,
            "shrink-0",
            action === "refresh" && isLoading && "animate-spin"
          )}
        />
        {displayText && <span>{displayText}</span>}
      </button>
    )
  }

  // Visual === "icon" (compact table action)
  return (
    <button
      type="button"
      title={resolvedTooltip}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center rounded-[2px] border border-transparent transition-all cursor-pointer select-none active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
        config.hoverBg,
        config.hoverBorder,
        config.iconColor,
        size === "xs" && "size-5 p-0.5",
        size === "sm" && "size-6 p-1",
        size === "md" && "size-7 p-1.5",
        className
      )}
      {...props}
    >
      <IconComponent
        className={cn(
          iconSizeClass,
          "shrink-0",
          action === "refresh" && isLoading && "animate-spin"
        )}
      />
    </button>
  )
}
