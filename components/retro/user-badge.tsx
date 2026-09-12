"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { UserBadgeItem } from "@/lib/user-badges"

interface UserBadgeProps {
  badge: UserBadgeItem
  size?: "xs" | "sm" | "md"
  className?: string
  showDescriptionTooltip?: boolean
}

export function UserBadge({
  badge,
  size = "xs",
  className,
  showDescriptionTooltip = true,
}: UserBadgeProps) {
  const sizeClasses = {
    xs: "px-1 py-0.2 text-[8px] gap-0.5 leading-none",
    sm: "px-1.5 py-0.5 text-[9px] gap-1 leading-tight",
    md: "px-2 py-0.5 text-[10px] gap-1.5 leading-normal",
  }

  const tooltipText = showDescriptionTooltip
    ? `${badge.label}: ${badge.description}`
    : badge.label

  return (
    <span
      title={tooltipText}
      className={cn(
        "inline-flex items-center rounded-[2px] font-mono select-none border shadow-2xs shrink-0 transition-transform hover:scale-105 cursor-help",
        sizeClasses[size],
        badge.color,
        className
      )}
    >
      <span className="shrink-0">{badge.icon}</span>
      <span className="truncate">{badge.label}</span>
    </span>
  )
}
