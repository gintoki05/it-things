"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface UserAvatarProps {
  src?: string | null
  name?: string
  size?: string
  textClass?: string
  className?: string
}

export function UserAvatar({
  src,
  name = "User",
  size = "size-5",
  textClass = "text-[10px]",
  className,
}: UserAvatarProps) {
  const [hasError, setHasError] = React.useState(false)

  React.useEffect(() => {
    setHasError(false)
  }, [src])

  const isSafeSrc = React.useMemo(() => {
    if (!src) return false
    const s = src.trim().toLowerCase()
    return (
      s.startsWith("https://") ||
      s.startsWith("http://") ||
      s.startsWith("/") ||
      s.startsWith("data:image/jpeg;") ||
      s.startsWith("data:image/png;") ||
      s.startsWith("data:image/webp;") ||
      s.startsWith("data:image/gif;") ||
      s.startsWith("data:image/svg+xml")
    )
  }, [src])

  const isEmoji = React.useMemo(() => {
    if (!src) return false
    const s = src.trim()
    return !isSafeSrc && s.length <= 4
  }, [src, isSafeSrc])

  if (src && isSafeSrc && !hasError) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={cn(size, "rounded-full border border-white object-cover shrink-0", className)}
      />
    )
  }

  if (isEmoji && src) {
    return (
      <div
        className={cn(
          size,
          "rounded-full bg-slate-200/80 text-slate-800 flex items-center justify-center border border-white shrink-0 select-none",
          textClass,
          className
        )}
      >
        <span className="leading-none">{src.trim()}</span>
      </div>
    )
  }

  const initial = name ? name.trim().charAt(0).toUpperCase() : "U"

  return (
    <div
      className={cn(
        size,
        "rounded-full bg-[#2E5AA8] text-white flex items-center justify-center font-bold border border-white shrink-0 select-none shadow-sm",
        textClass,
        className
      )}
    >
      {initial}
    </div>
  )
}
