"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface RetroButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "vote"
  voted?: boolean
  size?: "sm" | "default" | "lg"
}

export const RetroButton = React.forwardRef<HTMLButtonElement, RetroButtonProps>(
  ({ className, variant = "secondary", voted = false, size = "default", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center font-mono font-medium rounded-[3px] select-none retro-btn-press transition-all",
          "disabled:opacity-50 disabled:pointer-events-none disabled:transform-none",
          // Sizes
          size === "sm" && "h-7 px-2.5 text-xs gap-1.5",
          size === "default" && "h-9 px-3.5 text-xs tracking-wide gap-2",
          size === "lg" && "h-10 px-5 text-sm gap-2.5",
          // Variants
          variant === "primary" && [
            "bg-[var(--primary)] text-white border border-[#203B76] shadow-retro-sm",
            "hover:bg-[var(--primary-hover)]",
          ],
          variant === "secondary" && [
            "bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow-retro-sm",
            "hover:bg-[var(--surface-muted)]",
          ],
          variant === "outline" && [
            "bg-transparent text-[var(--foreground)] border border-[var(--border)]",
            "hover:bg-[var(--surface-muted)]/50",
          ],
          variant === "danger" && [
            "bg-[var(--danger)] text-white border border-[#8C3434] shadow-retro-sm",
            "hover:bg-[#9B3B3B]",
          ],
          variant === "vote" && [
            voted
              ? "bg-[var(--primary-soft)] text-[var(--primary)] border border-[var(--primary)] font-bold shadow-none"
              : "bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow-retro-sm hover:bg-[var(--primary-soft)]/50 hover:border-[var(--primary)]",
          ],
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
RetroButton.displayName = "RetroButton"
