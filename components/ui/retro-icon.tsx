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
  "paint",
  "pantry",
  "poll",
  "search",
  "settings",
  "splitbill",
  "task",
  "team",
  "tower",
  "trophy",
  "vote",
  "wheel",
  "pomodoro",
  "tomato",
  "bug",
  "folder",
] as const

export type RetroIconName = typeof RETRO_ICON_NAMES[number]

export const EMOJI_TO_RETRO_ICON: Record<string, RetroIconName> = {
  "📁": "folder",
  "📂": "folder",
  "🍅": "pomodoro",
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
  "🗳️": "vote",
  "🗳": "vote",
  "🎮": "game",
  "⚙️": "settings",
  "🔍": "search",
  "🎨": "paint",
  "🖌️": "paint",
  "🖌": "paint",
  "🏗️": "tower",
  "🏗": "tower",
  "🏢": "tower",
  "🐛": "bug",
  "🐞": "bug",
}

export function resolveRetroIcon(nameOrEmoji?: string | null): RetroIconName | null {
  if (!nameOrEmoji) return null
  const trimmed = nameOrEmoji.trim().toLowerCase()

  // Exact match with icon name
  if ((RETRO_ICON_NAMES as readonly string[]).includes(trimmed)) {
    return trimmed as RetroIconName
  }

  // Alias matches
  if (trimmed === "paintwar") return "paint"
  if (trimmed === "feedback") return "idea"
  if (trimmed === "snipper") return "bug"

  // Exact match with emoji
  if (EMOJI_TO_RETRO_ICON[nameOrEmoji]) {
    return EMOJI_TO_RETRO_ICON[nameOrEmoji]
  }
  if (EMOJI_TO_RETRO_ICON[trimmed]) {
    return EMOJI_TO_RETRO_ICON[trimmed]
  }

  return null
}

export const VALID_ICON_SIZES = [32, 48, 64, 128, 256] as const

export function getClosestIconSize(size: number): 32 | 48 | 64 | 128 | 256 {
  if (size <= 36) return 32
  if (size <= 56) return 48
  if (size <= 96) return 64
  if (size <= 192) return 128
  return 256
}

export function getRetroIconSrc(
  nameOrEmoji: string,
  size: 32 | 48 | 64 | 128 | 256 | number = 32
): string | null {
  const iconName = resolveRetroIcon(nameOrEmoji)
  if (!iconName) return null

  // Custom vector icons for games / apps
  if (iconName === "tower") {
    return "/icons/tower.svg"
  }
  if (iconName === "paint") {
    return "/icons/paint.svg"
  }
  if (iconName === "pomodoro" || iconName === "tomato") {
    return "/icons/tomato.svg"
  }
  if (iconName === "bug") {
    return "/icons/bug.svg"
  }
  if (iconName === "folder") {
    return "/icons/folder.svg"
  }

  const normalizedSize = getClosestIconSize(size)
  return `/IT-THINGS-icon-pack/it-things-icon-pack/png-${normalizedSize}/${iconName}.png`
}

export interface RetroIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  name: RetroIconName | string
  iconSize?: 32 | 48 | 64 | 128 | 256 | number
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

  const src = getRetroIconSrc(resolved, iconSize)
  if (!src) return null

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
