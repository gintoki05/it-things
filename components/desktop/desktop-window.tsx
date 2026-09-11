"use client"

import * as React from "react"
import { useDesktop, AppId } from "./desktop-context"
import { cn } from "@/lib/utils"
import { RetroIcon } from "@/components/ui/retro-icon"

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
  const windowRef = React.useRef<HTMLDivElement>(null)

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
    // Don't drag if clicking buttons
    if ((e.target as HTMLElement).closest("button")) return

    if (activeWindowId !== id) {
      bringToFront(id)
    }

    const titleBarEl = e.currentTarget
    const windowEl = windowRef.current
    if (!windowEl) return

    const pointerId = e.pointerId
    try {
      titleBarEl.setPointerCapture(pointerId)
    } catch {
      // ignore
    }

    setIsDragging(true)

    const startMouseX = e.clientX
    const startMouseY = e.clientY
    const startX = win.position.x
    const startY = win.position.y

    let currentX = startX
    let currentY = startY
    let hasMoved = false
    let rafId: number | null = null

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startMouseX
      const deltaY = moveEvent.clientY - startMouseY

      if (!hasMoved && Math.abs(deltaX) < 2 && Math.abs(deltaY) < 2) {
        return
      }
      hasMoved = true

      currentX = Math.max(0, Math.min(window.innerWidth - 100, startX + deltaX))
      currentY = Math.max(0, Math.min(window.innerHeight - 100, startY + deltaY))

      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          if (windowEl) {
            windowEl.style.transform = `translate3d(${currentX - startX}px, ${currentY - startY}px, 0)`
          }
          rafId = null
        })
      }
    }

    const onPointerUp = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      try {
        titleBarEl.releasePointerCapture(pointerId)
      } catch {
        // ignore
      }

      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerUp)

      if (windowEl) {
        if (hasMoved) {
          windowEl.style.left = `${currentX}px`
          windowEl.style.top = `${currentY}px`
        }
        windowEl.style.transform = ""
      }

      setIsDragging(false)

      if (hasMoved && (currentX !== startX || currentY !== startY)) {
        updatePosition(id, { x: currentX, y: currentY })
      }
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true })
    window.addEventListener("pointerup", onPointerUp)
    window.addEventListener("pointercancel", onPointerUp)
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
      ref={windowRef}
      data-window="true"
      onPointerDown={() => {
        if (activeWindowId !== id) {
          bringToFront(id)
        }
      }}
      style={{
        ...windowStyle,
        willChange: isDragging ? "transform" : "auto",
      }}
      className={cn(
        "retro-window-frame flex flex-col rounded-[4px] border-2 select-none overflow-hidden",
        // Retro bevel border styling
        "border-t-[#E8EEF5] border-l-[#E8EEF5] border-r-[#5E7287] border-b-[#5E7287] bg-[#D4DDE6] shadow-[2px_2px_12px_rgba(0,0,0,0.35)]",
        isActive ? "ring-1 ring-[#1A365D]/40" : "opacity-95",
        isDragging && "shadow-[4px_8px_24px_rgba(0,0,0,0.45)] cursor-move",
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
          <RetroIcon name={win.icon || win.id} iconSize={32} className="size-4 shrink-0 object-contain" />
          <span className="truncate tracking-wide font-sans text-[12px]">{win.title}</span>
        </div>

        {/* Window controls: _ □ × */}
        <div 
          className="flex items-center gap-1 shrink-0 font-mono ml-2"
          onPointerDown={(e) => e.stopPropagation()}
        >
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
      <div 
        className={cn(
          "flex-1 overflow-auto bg-[#F4F6F9] text-[#1A202C] p-3 text-xs select-text",
          isDragging && "pointer-events-none select-none",
          bodyClassName
        )}
      >
        {children}
      </div>
    </div>
  )
}
