import * as React from "react"
import { cn } from "@/lib/utils"

interface SystemMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  lines: string[]
  footerSign?: string
}

export function SystemMessage({ lines, footerSign = "(^_^)\u2615", className, ...props }: SystemMessageProps) {
  return (
    <div
      className={cn(
        "font-mono text-xs p-3 rounded-[3px] bg-[var(--surface-muted)]/80 border border-[var(--border)] leading-relaxed space-y-1 text-[var(--foreground)]",
        className
      )}
      {...props}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] mb-2 pb-1 border-b border-[var(--border-light)]">
        PESAN SISTEM
      </div>
      {lines.map((line, idx) => (
        <div key={idx} className="flex items-start gap-1.5 text-[11px]">
          <span className="text-[var(--primary)] select-none font-bold">&gt;</span>
          <span className="break-words">{line}</span>
        </div>
      ))}
      {footerSign && (
        <div className="pt-2 text-[11px] text-[var(--foreground-muted)] font-bold">
          {footerSign}
        </div>
      )}
    </div>
  )
}
