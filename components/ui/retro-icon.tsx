"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export const RETRO_ICON_NAMES = [
  "add",
  "announcement",
  "archive",
  "calendar",
  "chat",
  "coffee",
  "delete",
  "edit",
  "favorite",
  "game",
  "gift",
  "grid",
  "home",
  "idea",
  "kas",
  "like",
  "list",
  "pantry",
  "poll",
  "search",
  "settings",
  "splitbill",
  "task",
  "team",
  "trophy",
  "wheel",
] as const

export type RetroIconName = typeof RETRO_ICON_NAMES[number]

export const EMOJI_TO_RETRO_ICON: Record<string, RetroIconName> = {
  "📦": "pantry",
  "🎡": "wheel",
  "🧾": "splitbill",
  "💰": "kas",
  "👥": "team",
  "☕": "coffee",
  "🍵": "coffee",
  "🥛": "coffee",
  "🍜": "pantry",
  "🌭": "pantry",
  "🥪": "pantry",
  "🍪": "gift",
  "🍬": "gift",
  "🌶️": "pantry",
  "🥤": "coffee",
  "🎉": "trophy",
  "🛒": "pantry",
  "👑": "trophy",
  "👤": "team",
  "🛡️": "team",
  "💡": "idea",
  "📅": "calendar",
  "🗳️": "poll",
  "🎮": "game",
  "⚙️": "settings",
  "🔍": "search",
}

export function resolveRetroIcon(nameOrEmoji?: string | null): RetroIconName | null {
  if (!nameOrEmoji) return null
  const trimmed = nameOrEmoji.trim().toLowerCase()

  // Exact match with icon name
  if ((RETRO_ICON_NAMES as readonly string[]).includes(trimmed)) {
    return trimmed as RetroIconName
  }

  // Exact match with emoji
  if (EMOJI_TO_RETRO_ICON[nameOrEmoji]) {
    return EMOJI_TO_RETRO_ICON[nameOrEmoji]
  }
  if (EMOJI_TO_RETRO_ICON[trimmed]) {
    return EMOJI_TO_RETRO_ICON[trimmed]
  }

  return null
}

export function getRetroIconSrc(
  nameOrEmoji: string,
  size: 32 | 48 | 64 | 128 | 256 = 32
): string | null {
  const iconName = resolveRetroIcon(nameOrEmoji)
  if (!iconName) return null
  return `/IT-THINGS-icon-pack/it-things-icon-pack/png-${size}/${iconName}.png`
}

export interface RetroIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  name: RetroIconName | string
  iconSize?: 32 | 48 | 64 | 128 | 256
  fallbackText?: string
}

export function RetroIcon({
  name,
  iconSize = 32,
  fallbackText,
  className,
  alt,
  ...props
}: RetroIconProps) {
  const [hasError, setHasError] = React.useState(false)
  const resolved = resolveRetroIcon(name)

  if (!resolved || hasError) {
    return (
      <span className={cn("inline-flex items-center justify-center select-none text-base", className)}>
        {fallbackText ?? name}
      </span>
    )
  }

  const src = `/IT-THINGS-icon-pack/it-things-icon-pack/png-${iconSize}/${resolved}.png`

  return (
    <img
      src={src}
      alt={alt || `${resolved} icon`}
      loading="lazy"
      draggable={false}
      onError={() => setHasError(true)}
      className={cn("inline-block select-none shrink-0 pointer-events-none", className)}
      {...props}
    />
  )
}
