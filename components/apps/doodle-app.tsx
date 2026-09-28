"use client"

import * as React from "react"
import { RetroActionButton } from "@/components/ui/retro-action-button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Maximize2, Minimize2, RotateCw } from "lucide-react"

export function DoodleApp() {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const [isFullscreen, setIsFullscreen] = React.useState<boolean>(false)
  const [showRestartConfirm, setShowRestartConfirm] = React.useState<boolean>(false)
  const [key, setKey] = React.useState<number>(0)

  const handleRestart = React.useCallback(() => {
    setShowRestartConfirm(false)
    setKey((prev) => prev + 1)
  }, [])

  const handleToggleFullscreen = React.useCallback(() => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }, [])

  return (
    <div ref={containerRef} className="flex flex-col h-full w-full bg-[#c0c0c0] font-sans select-none overflow-hidden text-black">
      {/* Top Toolbar Windows 98 */}
      <div className="flex items-center justify-between px-2 py-1 bg-[#dfdfdf] border-b border-[#808080] text-xs">
        <div className="flex items-center gap-1.5 font-bold">
          <span className="text-blue-800 font-mono tracking-wider font-extrabold">DOODLE.EXE</span>
          <span className="text-[#606060] font-normal">| Doodle District: A Scribbled Survival Shooter</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Restart */}
          <RetroActionButton
            action="refresh"
            visual="icon"
            onClick={() => setShowRestartConfirm(true)}
            tooltip="Restart Game"
            className="p-1"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </RetroActionButton>

          {/* Fullscreen */}
          <RetroActionButton
            action="edit"
            visual="icon"
            onClick={handleToggleFullscreen}
            tooltip={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
            className="p-1"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </RetroActionButton>
        </div>
      </div>

      {/* Doodle District Game Viewport */}
      <div className="relative flex-1 w-full h-full bg-[#f6f3e6] overflow-hidden">
        <iframe
          key={key}
          ref={iframeRef}
          src="/games/doodle/index.html"
          className="w-full h-full border-0 block"
          allow="autoplay; fullscreen; pointer-lock"
          title="Doodle District"
        />
      </div>

      {/* Restart Confirm Dialog (Win98 Standard) */}
      <ConfirmDialog
        isOpen={showRestartConfirm}
        onClose={() => setShowRestartConfirm(false)}
        title="RESTART_DOODLE.EXE"
        message="Apakah kamu yakin ingin mengulang pertempuran Doodle District dari awal?"
        confirmText="RESTART"
        cancelText="BATAL"
        variant="warning"
        onConfirm={handleRestart}
      />
    </div>
  )
}
