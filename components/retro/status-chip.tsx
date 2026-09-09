import * as React from "react"
import { cn } from "@/lib/utils"

export interface StatusChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: "online" | "open" | "closed" | "voting" | "pending" | "critical" | "neutral"
  indicator?: "dot" | "brackets" | "both"
  label?: string
}

export function StatusChip({
  status = "neutral",
  indicator = "both",
  label,
  children,
  className,
  ...props
}: StatusChipProps) {
  const displayText = label || children

  const styles = {
    online: "border-[var(--success)] text-[var(--success)] bg-[var(--success-soft)]",
    open: "border-[var(--success)] text-[var(--success)] bg-[var(--success-soft)]",
    voting: "border-[var(--primary)] text-[var(--primary)] bg-[var(--primary-soft)]",
    pending: "border-[var(--warning)] text-[var(--warning)] bg-[var(--warning-soft)]",
    closed: "border-[var(--border)] text-[var(--foreground-muted)] bg-[var(--surface-muted)]",
    critical: "border-[var(--danger)] text-[var(--danger)] bg-[var(--danger-soft)]",
    neutral: "border-[var(--border)] text-[var(--foreground)] bg-[var(--surface-muted)]",
  }

  const dotColors = {
    online: "bg-[var(--success)]",
    open: "bg-[var(--success)]",
    voting: "bg-[var(--primary)]",
    pending: "bg-[var(--warning)]",
    closed: "bg-[var(--foreground-muted)]",
    critical: "bg-[var(--danger)]",
    neutral: "bg-[var(--foreground-muted)]",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase px-1.5 py-0.5 rounded-[2px] border select-none tracking-wider",
        styles[status],
        className
      )}
      {...props}
    >
      {(indicator === "dot" || indicator === "both") && (
        <span className={cn("size-1.5 rounded-full inline-block shrink-0", dotColors[status])} />
      )}
      <span>{displayText}</span>
    </span>
  )
}
