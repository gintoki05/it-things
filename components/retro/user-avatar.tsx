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

  if (src && !hasError) {
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
