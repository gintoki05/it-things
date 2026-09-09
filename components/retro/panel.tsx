import * as React from "react"
import { cn } from "@/lib/utils"

interface RetroPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  icon?: React.ReactNode
  variant?: "default" | "muted" | "bordered"
}

export function RetroPanel({
  title,
  icon,
  children,
  className,
  variant = "default",
  ...props
}: RetroPanelProps) {
  return (
    <div
      className={cn(
        "rounded-[4px] border border-[var(--border)] relative flex flex-col",
        variant === "default" && "bg-[var(--surface)]",
        variant === "muted" && "bg-[var(--surface-muted)]",
        variant === "bordered" && "bg-transparent border-dashed",
        className
      )}
      {...props}
    >
      {title && (
        <div className="px-3 py-1.5 border-b border-[var(--border)] bg-[var(--surface-muted)]/60 font-mono text-[11px] font-bold tracking-wider uppercase text-[var(--foreground-muted)] flex items-center gap-1.5">
          {icon && <span className="text-xs">{icon}</span>}
          <span>{title}</span>
        </div>
      )}
      <div className="p-3.5 flex-1">{children}</div>
    </div>
  )
}
