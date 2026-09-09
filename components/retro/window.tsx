"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface RetroWindowProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  icon?: React.ReactNode
  controls?: boolean
  onClose?: () => void
  onMinimize?: () => void
  onMaximize?: () => void
  headerClassName?: string
  bodyClassName?: string
}

export function RetroWindow({
  title,
  icon,
  controls = true,
  onClose,
  onMinimize,
  onMaximize,
  children,
  className,
  headerClassName,
  bodyClassName,
  ...props
}: RetroWindowProps) {
  return (
    <div
      className={cn(
        "rounded-[4px] border border-[var(--border-dark)] bg-[var(--surface)] shadow-retro-md overflow-hidden flex flex-col",
        className
      )}
      {...props}
    >
      {/* Window Title Bar */}
      <div
        className={cn(
          "h-8 px-2.5 flex items-center justify-between retro-titlebar select-none shrink-0 font-mono text-xs font-semibold tracking-wide text-[var(--foreground)]",
          headerClassName
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {icon && <span className="text-sm shrink-0 flex items-center">{icon}</span>}
          <span className="truncate">{title}</span>
        </div>

        {controls && (
          <div className="flex items-center gap-1 shrink-0 font-mono ml-2">
            <button
              type="button"
              onClick={onMinimize}
              aria-label="Minimize"
              className="size-5 flex items-center justify-center text-[10px] font-bold border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] active:translate-y-px rounded-[2px] transition-colors"
            >
              _
            </button>
            <button
              type="button"
              onClick={onMaximize}
              aria-label="Maximize"
              className="size-5 flex items-center justify-center text-[10px] font-bold border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] active:translate-y-px rounded-[2px] transition-colors"
            >
              □
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="size-5 flex items-center justify-center text-[11px] font-bold border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] active:translate-y-px rounded-[2px] transition-colors"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Window Content */}
      <div className={cn("p-4 flex-1 overflow-auto", bodyClassName)}>
        {children}
      </div>
    </div>
  )
}
