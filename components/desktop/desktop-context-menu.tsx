"use client"

import * as React from "react"
import { Monitor, RotateCw, Info, Laptop } from "lucide-react"
import { useWallpaper } from "@/lib/wallpaper-store"
import { useDesktop } from "@/components/desktop/desktop-context"

interface DesktopContextMenuProps {
  x: number
  y: number
  onClose: () => void
}

export function DesktopContextMenu({ x, y, onClose }: DesktopContextMenuProps) {
  const { openDialog } = useWallpaper()
  const { openAboutDialog, toggleShowDesktop, isAllMinimized } = useDesktop()
  const menuRef = React.useRef<HTMLDivElement>(null)

  // Bounds checking to stay within viewport
  const [position, setPosition] = React.useState({ x, y })

  React.useEffect(() => {
    if (!menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    const maxX = window.innerWidth - rect.width - 8
    const maxY = window.innerHeight - rect.height - 48 // Taskbar offset

    setPosition({
      x: Math.min(x, Math.max(8, maxX)),
      y: Math.min(y, Math.max(8, maxY)),
    })
  }, [x, y])

  // Close on click outside or escape
  React.useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("mousedown", handleDown)
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("mousedown", handleDown)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  const handleOpenWallpaper = () => {
    onClose()
    openDialog()
  }

  const handleRefresh = () => {
    onClose()
  }

  const handleOpenAbout = () => {
    onClose()
    openAboutDialog()
  }

  return (
    <div
      ref={menuRef}
      style={{ left: position.x, top: position.y }}
      className="fixed z-50 w-56 bg-[#D4DDE6] border-2 border-t-white border-l-white border-r-[#5E7287] border-b-[#5E7287] shadow-[4px_4px_0px_rgba(0,0,0,0.35)] py-1 text-xs select-none rounded-[2px]"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={handleOpenWallpaper}
        className="w-full text-left px-3 py-1.5 hover:bg-[#1E4E8C] hover:text-white flex items-center gap-2 font-semibold text-[#14253D] group transition-colors cursor-pointer"
      >
        <Monitor className="size-3.5 text-[#1E4E8C] group-hover:text-yellow-300" />
        <span>Properti Tampilan (Wallpaper)...</span>
      </button>

      <button
        type="button"
        onClick={handleRefresh}
        className="w-full text-left px-3 py-1.5 hover:bg-[#1E4E8C] hover:text-white flex items-center gap-2 text-[#14253D] group transition-colors cursor-pointer"
      >
        <RotateCw className="size-3.5 text-gray-600 group-hover:text-white" />
        <span>Segarkan Desktop</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onClose()
          toggleShowDesktop()
        }}
        className="w-full text-left px-3 py-1.5 hover:bg-[#1E4E8C] hover:text-white flex items-center gap-2 text-[#14253D] group transition-colors cursor-pointer"
      >
        <Laptop className="size-3.5 text-[#1E4E8C] group-hover:text-white" />
        <span>{isAllMinimized ? "Kembalikan Semua Jendela" : "Tampilkan Desktop"}</span>
      </button>

      <div className="my-1 border-t border-[#A4B5C6]/70 mx-1" />

      <button
        type="button"
        onClick={handleOpenAbout}
        className="w-full text-left px-3 py-1.5 hover:bg-[#1E4E8C] hover:text-white flex items-center gap-2 text-[#14253D] group transition-colors cursor-pointer"
      >
        <Info className="size-3.5 text-[#1E4E8C] group-hover:text-yellow-300" />
        <span>Tentang IT-Things 98...</span>
      </button>
    </div>
  )
}
