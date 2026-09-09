"use client"

import * as React from "react"
import { useDesktop, AppId } from "./desktop-context"
import { cn } from "@/lib/utils"

interface DesktopWindowProps {
  id: AppId
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}

export function DesktopWindow({ id, children, className, bodyClassName }: DesktopWindowProps) {
  const {
    windows,
    activeWindowId,
    bringToFront,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    updatePosition,
  } = useDesktop()

  const win = windows[id]
  const [isMobile, setIsMobile] = React.useState(false)

  // Dragging state
  const [isDragging, setIsDragging] = React.useState(false)
  const dragStartRef = React.useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  })

  // Detect mobile
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  if (!win || !win.isOpen || win.isMinimized) {
    return null
  }

  const isActive = activeWindowId === id

  // Handle Dragging
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMobile || win.isMaximized) return
    // Only drag with left mouse button / single touch
    if (e.button !== 0 && e.pointerType === "mouse") return

    bringToFront(id)
    setIsDragging(true)
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: win.position.x,
      startY: win.position.y,
    }

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - dragStartRef.current.mouseX
      const deltaY = moveEvent.clientY - dragStartRef.current.mouseY

      const nextX = Math.max(0, Math.min(window.innerWidth - 100, dragStartRef.current.startX + deltaX))
      const nextY = Math.max(0, Math.min(window.innerHeight - 100, dragStartRef.current.startY + deltaY))

      updatePosition(id, { x: nextX, y: nextY })
    }

    const onPointerUp = () => {
      setIsDragging(false)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
    }

    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
  }

  // Calculate window style based on state
  const windowStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: "44px", // Above taskbar
        zIndex: win.zIndex,
        width: "100%",
        height: "calc(100vh - 44px)",
      }
    : win.isMaximized
    ? {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: "44px",
        zIndex: win.zIndex,
        width: "100%",
        height: "calc(100vh - 44px)",
      }
    : {
        position: "absolute",
        left: `${win.position.x}px`,
        top: `${win.position.y}px`,
        width: `${win.size.width}px`,
        maxWidth: "calc(100vw - 20px)",
        height: `${win.size.height}px`,
        maxHeight: "calc(100vh - 65px)",
        zIndex: win.zIndex,
      }

  return (
    <div
      onPointerDown={() => bringToFront(id)}
      style={windowStyle}
      className={cn(
        "flex flex-col rounded-[4px] border-2 select-none overflow-hidden transition-shadow",
        // Retro bevel border styling
        "border-t-[#E8EEF5] border-l-[#E8EEF5] border-r-[#5E7287] border-b-[#5E7287] bg-[#D4DDE6] shadow-[2px_2px_12px_rgba(0,0,0,0.35)]",
        isActive ? "ring-1 ring-[#1A365D]/40" : "opacity-95",
        className
      )}
    >
      {/* Retro Title Bar */}
      <div
        onPointerDown={handlePointerDown}
        className={cn(
          "h-8 px-2 flex items-center justify-between font-mono text-xs font-bold shrink-0 cursor-move select-none",
          isActive
            ? "bg-gradient-to-r from-[#1E4E8C] via-[#2A65B2] to-[#1E4E8C] text-white shadow-inner"
            : "bg-[#8B9DAE] text-[#2C3E50]"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <span className="text-sm shrink-0">{win.icon}</span>
          <span className="truncate tracking-wide font-sans text-[12px]">{win.title}</span>
        </div>

        {/* Window controls: _ □ × */}
        <div className="flex items-center gap-1 shrink-0 font-mono ml-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              minimizeWindow(id)
            }}
            title="Minimize"
            className="size-5 flex items-center justify-center text-[10px] font-bold bg-[#D4DDE6] text-[#14253D] border border-[#7D8E9E] border-t-white border-l-white active:border-t-[#7D8E9E] active:border-l-[#7D8E9E] active:border-r-white active:border-b-white rounded-[2px]"
          >
            _
          </button>
          {!isMobile && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                maximizeWindow(id)
              }}
              title={win.isMaximized ? "Restore" : "Maximize"}
              className="size-5 flex items-center justify-center text-[10px] font-bold bg-[#D4DDE6] text-[#14253D] border border-[#7D8E9E] border-t-white border-l-white active:border-t-[#7D8E9E] active:border-l-[#7D8E9E] active:border-r-white active:border-b-white rounded-[2px]"
            >
              {win.isMaximized ? "❐" : "□"}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              closeWindow(id)
            }}
            title="Close"
            className="size-5 flex items-center justify-center text-[11px] font-bold bg-[#D4DDE6] hover:bg-[#C53030] hover:text-white text-[#14253D] border border-[#7D8E9E] border-t-white border-l-white active:border-t-[#7D8E9E] active:border-l-[#7D8E9E] rounded-[2px] transition-colors"
          >
            ×
          </button>
        </div>
      </div>

      {/* Window Body */}
      <div className={cn("flex-1 overflow-auto bg-[#F4F6F9] text-[#1A202C] p-3 text-xs select-text", bodyClassName)}>
        {children}
      </div>
    </div>
  )
}
