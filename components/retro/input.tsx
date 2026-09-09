import * as React from "react"
import { cn } from "@/lib/utils"

export interface RetroInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const RetroInput = React.forwardRef<HTMLInputElement, RetroInputProps>(
  ({ className, type = "text", label, error, id, ...props }, ref) => {
    const inputId = id || React.useId()

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={inputId} className="block font-mono text-xs font-semibold text-[var(--foreground)]">
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            "w-full h-9 px-3 rounded-[3px] bg-white dark:bg-[var(--surface)] text-[var(--foreground)]",
            "border border-[var(--border)] font-sans text-sm placeholder:text-[var(--foreground-muted)]/60",
            "focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent",
            "disabled:opacity-50 disabled:cursor-not-allowed transition-all",
            error && "border-[var(--danger)] focus:ring-[var(--danger)]",
            className
          )}
          {...props}
        />
        {error && <p className="font-mono text-[11px] text-[var(--danger)]">{error}</p>}
      </div>
    )
  }
)
RetroInput.displayName = "RetroInput"
