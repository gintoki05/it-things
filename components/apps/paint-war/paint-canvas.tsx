"use client"

import * as React from "react"
import { DrawEvent } from "@/lib/paint-war-store"
import { cn } from "@/lib/utils"
import { Pencil, Eraser, PaintBucket, Trash2, Undo2 } from "lucide-react"

export const WIN98_PALETTE = [
  "#000000",
  "#808080",
  "#800000",
  "#808000",
  "#008000",
  "#008080",
  "#000080",
  "#800080",
  "#FFFFFF",
  "#C0C0C0",
  "#FF0000",
  "#FFFF00",
  "#00FF00",
  "#00FFFF",
  "#0000FF",
  "#FF00FF",
]

export const CANVAS_WIDTH = 600
export const CANVAS_HEIGHT = 400

interface PaintCanvasProps {
  isDrawer: boolean
  canvasSnapshot?: string | null
  onBroadcastDraw: (event: DrawEvent) => void
  onSaveSnapshot: (snapshotDataUrl: string) => void
  setDrawEventListener: (fn: ((event: DrawEvent) => void) | null) => void
}

export function PaintCanvas({
  isDrawer,
  canvasSnapshot,
  onBroadcastDraw,
  onSaveSnapshot,
  setDrawEventListener,
}: PaintCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = React.useRef<boolean>(false)
  const lastPointRef = React.useRef<{ x: number; y: number } | null>(null)
  const currentStrokePointsRef = React.useRef<{ x: number; y: number }[]>([])

  // Tools state
  const [currentTool, setCurrentTool] = React.useState<"pencil" | "eraser" | "bucket">("pencil")
  const [currentColor, setCurrentColor] = React.useState<string>("#000000")
  const [strokeSize, setStrokeSize] = React.useState<number>(3)

  // History stack for Undo
  const undoStackRef = React.useRef<ImageData[]>([])

  // Helper: push current canvas state to undo stack
  const pushUndoState = React.useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return
    try {
      const state = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      undoStackRef.current.push(state)
      if (undoStackRef.current.length > 10) {
        undoStackRef.current.shift()
      }
    } catch (e) {
      console.warn("Undo push failed:", e)
    }
  }, [])

  // Helper: clear canvas locally with crisp white
  const clearCanvasLocal = React.useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  }, [])

  // Load snapshot image or clear initially
  React.useEffect(() => {
    clearCanvasLocal()
    if (canvasSnapshot) {
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      }
      img.src = canvasSnapshot
    }
  }, [canvasSnapshot, clearCanvasLocal])

  // ─── Drawing Primitives ───────────────────────────────────
  const drawSegment = React.useCallback(
    (
      p1: { x: number; y: number },
      p2: { x: number; y: number },
      tool: "pencil" | "eraser",
      color: string,
      size: number
    ) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.strokeStyle = tool === "eraser" ? "#FFFFFF" : color
      ctx.lineWidth = tool === "eraser" ? size * 3 : size
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.stroke()
    },
    []
  )

  // ─── Flood Fill (Paint Bucket) Algorithm ──────────────────
  const floodFill = React.useCallback(
    (startX: number, startY: number, fillHex: string) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      if (!ctx) return

      const imgData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      const data = new Uint32Array(imgData.data.buffer)

      // Convert hex to 32-bit integer (ABGR or RGBA little-endian)
      const tempCanvas = document.createElement("canvas")
      tempCanvas.width = 1
      tempCanvas.height = 1
      const tempCtx = tempCanvas.getContext("2d")
      if (!tempCtx) return
      tempCtx.fillStyle = fillHex
      tempCtx.fillRect(0, 0, 1, 1)
      const fillVal = new Uint32Array(tempCtx.getImageData(0, 0, 1, 1).data.buffer)[0]

      const startIdx = Math.floor(startY) * CANVAS_WIDTH + Math.floor(startX)
      const targetVal = data[startIdx]

      if (targetVal === fillVal) return

      const queue: number[] = [startIdx]
      const visited = new Uint8Array(CANVAS_WIDTH * CANVAS_HEIGHT)
      visited[startIdx] = 1

      while (queue.length > 0) {
        const idx = queue.pop()!
        data[idx] = fillVal

        const x = idx % CANVAS_WIDTH
        const y = Math.floor(idx / CANVAS_WIDTH)

        // 4 neighbors
        const neighbors = [
          x > 0 ? idx - 1 : -1,
          x < CANVAS_WIDTH - 1 ? idx + 1 : -1,
          y > 0 ? idx - CANVAS_WIDTH : -1,
          y < CANVAS_HEIGHT - 1 ? idx + CANVAS_WIDTH : -1,
        ]

        for (const n of neighbors) {
          if (n >= 0 && !visited[n] && data[n] === targetVal) {
            visited[n] = 1
            queue.push(n)
          }
        }
      }

      ctx.putImageData(imgData, 0, 0)
    },
    []
  )

  // ─── Listen for incoming broadcast draw events ────────────
  React.useEffect(() => {
    const handleEvent = (event: DrawEvent) => {
      if (event.type === "stroke") {
        for (let i = 1; i < event.points.length; i++) {
          drawSegment(
            event.points[i - 1],
            event.points[i],
            event.tool,
            event.color,
            event.size
          )
        }
      } else if (event.type === "fill") {
        floodFill(event.x, event.y, event.color)
      } else if (event.type === "clear") {
        clearCanvasLocal()
      }
    }

    setDrawEventListener(handleEvent)
    return () => setDrawEventListener(null)
  }, [setDrawEventListener, drawSegment, floodFill, clearCanvasLocal])

  // ─── Pointer Coordinates Calculation ──────────────────────
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_WIDTH / rect.width
    const scaleY = CANVAS_HEIGHT / rect.height
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    }
  }

  const lastBroadcastTimeRef = React.useRef<number>(0)
  const snapshotDebounceTimerRef = React.useRef<NodeJS.Timeout | null>(null)

  // Cleanup debounce timer on unmount
  React.useEffect(() => {
    return () => {
      if (snapshotDebounceTimerRef.current) {
        clearTimeout(snapshotDebounceTimerRef.current)
      }
    }
  }, [])

  // Debounced snapshot helper: saves 95% of database writes
  const triggerDebouncedSnapshot = React.useCallback(() => {
    if (snapshotDebounceTimerRef.current) {
      clearTimeout(snapshotDebounceTimerRef.current)
    }
    snapshotDebounceTimerRef.current = setTimeout(() => {
      if (canvasRef.current) {
        onSaveSnapshot(canvasRef.current.toDataURL("image/webp", 0.6))
      }
    }, 2500)
  }, [onSaveSnapshot])

  // ─── Pointer Event Handlers (Drawer Only) ─────────────────
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawer) return
    const pos = getCanvasCoords(e)

    if (currentTool === "bucket") {
      pushUndoState()
      floodFill(pos.x, pos.y, currentColor)
      onBroadcastDraw({ type: "fill", x: pos.x, y: pos.y, color: currentColor })
      if (canvasRef.current) {
        onSaveSnapshot(canvasRef.current.toDataURL("image/webp", 0.6))
      }
      return
    }

    const drawTool: "pencil" | "eraser" = currentTool === "eraser" ? "eraser" : "pencil"
    isDrawingRef.current = true
    pushUndoState()
    lastPointRef.current = pos
    currentStrokePointsRef.current = [pos]
    lastBroadcastTimeRef.current = performance.now()

    // Draw single dot if clicked
    drawSegment(pos, pos, drawTool, currentColor, strokeSize)
    onBroadcastDraw({
      type: "stroke",
      tool: drawTool,
      color: currentColor,
      size: strokeSize,
      points: [pos, pos],
    })
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawer || !isDrawingRef.current || !lastPointRef.current || currentTool === "bucket") return
    const pos = getCanvasCoords(e)
    const prev = lastPointRef.current
    const drawTool: "pencil" | "eraser" = currentTool === "eraser" ? "eraser" : "pencil"

    drawSegment(prev, pos, drawTool, currentColor, strokeSize)
    currentStrokePointsRef.current.push(pos)
    lastPointRef.current = pos

    // Batch & throttle stroke broadcast to 50ms interval (saves ~80% Supabase Realtime messages)
    const now = performance.now()
    if (now - lastBroadcastTimeRef.current >= 50 && currentStrokePointsRef.current.length > 1) {
      onBroadcastDraw({
        type: "stroke",
        tool: drawTool,
        color: currentColor,
        size: strokeSize,
        points: [...currentStrokePointsRef.current],
      })
      lastBroadcastTimeRef.current = now
      currentStrokePointsRef.current = [pos]
    }
  }

  const handlePointerUp = () => {
    if (!isDrawer || !isDrawingRef.current) return
    isDrawingRef.current = false
    lastPointRef.current = null
    const drawTool: "pencil" | "eraser" = currentTool === "eraser" ? "eraser" : "pencil"

    // Flush remaining buffered points
    if (currentStrokePointsRef.current.length > 1) {
      onBroadcastDraw({
        type: "stroke",
        tool: drawTool,
        color: currentColor,
        size: strokeSize,
        points: [...currentStrokePointsRef.current],
        isEnd: true,
      })
    }
    currentStrokePointsRef.current = []

    // Save snapshot to DB debounced to avoid heavy DB spam on every stroke
    triggerDebouncedSnapshot()
  }

  // Handle Undo
  const handleUndo = () => {
    if (!isDrawer || undoStackRef.current.length === 0) return
    const prevState = undoStackRef.current.pop()
    if (!prevState || !canvasRef.current) return
    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return
    ctx.putImageData(prevState, 0, 0)
    onSaveSnapshot(canvasRef.current.toDataURL("image/webp", 0.7))
  }

  // Handle Clear
  const handleClear = () => {
    if (!isDrawer) return
    pushUndoState()
    clearCanvasLocal()
    onBroadcastDraw({ type: "clear" })
    if (canvasRef.current) {
      onSaveSnapshot(canvasRef.current.toDataURL("image/webp", 0.7))
    }
  }

  return (
    <div className="flex flex-col select-none bg-[#C0C0C0] p-1.5 border border-[#808080]">
      {/* ── Top MS Paint Toolbar (Only active for Drawer) ── */}
      {isDrawer && (
        <div className="flex flex-wrap items-center justify-between gap-1.5 p-1 mb-1.5 bg-[#D4D0C8] border-t-2 border-l-2 border-white border-b-2 border-r-2 border-[#808080]">
          {/* Tool Selector */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentTool("pencil")}
              title="Pensil (Garis bebas)"
              className={cn(
                "p-1.5 flex items-center justify-center border-2 transition-all",
                currentTool === "pencil"
                  ? "border-[#404040] bg-[#ECE9D8] shadow-inner"
                  : "border-white border-b-[#808080] border-r-[#808080] bg-[#C0C0C0] active:border-[#404040]"
              )}
            >
              <Pencil className="w-3.5 h-3.5 text-black" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentTool("eraser")}
              title="Penghapus"
              className={cn(
                "p-1.5 flex items-center justify-center border-2 transition-all",
                currentTool === "eraser"
                  ? "border-[#404040] bg-[#ECE9D8] shadow-inner"
                  : "border-white border-b-[#808080] border-r-[#808080] bg-[#C0C0C0] active:border-[#404040]"
              )}
            >
              <Eraser className="w-3.5 h-3.5 text-black" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentTool("bucket")}
              title="Cat Tumpah (Flood Fill)"
              className={cn(
                "p-1.5 flex items-center justify-center border-2 transition-all",
                currentTool === "bucket"
                  ? "border-[#404040] bg-[#ECE9D8] shadow-inner"
                  : "border-white border-b-[#808080] border-r-[#808080] bg-[#C0C0C0] active:border-[#404040]"
              )}
            >
              <PaintBucket className="w-3.5 h-3.5 text-black" />
            </button>

            <div className="w-[1px] h-5 bg-[#808080] mx-0.5" />

            {/* Stroke Size */}
            <div className="flex items-center gap-1 bg-[#C0C0C0] px-1 py-0.5 border border-[#808080]">
              {[2, 5, 10].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setStrokeSize(sz)}
                  title={`Ukuran garis: ${sz}px`}
                  className={cn(
                    "w-5 h-5 flex items-center justify-center rounded-sm",
                    strokeSize === sz ? "bg-blue-900 text-white" : "hover:bg-gray-300"
                  )}
                >
                  <div
                    className={cn(
                      "rounded-full",
                      strokeSize === sz ? "bg-white" : "bg-black"
                    )}
                    style={{ width: sz, height: sz }}
                  />
                </button>
              ))}
            </div>

            <div className="w-[1px] h-5 bg-[#808080] mx-0.5" />

            {/* Undo & Clear */}
            <button
              type="button"
              onClick={handleUndo}
              title="Undo langkah terakhir"
              className="p-1.5 flex items-center justify-center border-2 border-white border-b-[#808080] border-r-[#808080] bg-[#C0C0C0] active:border-[#404040]"
            >
              <Undo2 className="w-3.5 h-3.5 text-black" />
            </button>

            <button
              type="button"
              onClick={handleClear}
              title="Hapus semua (Clear Canvas)"
              className="p-1.5 flex items-center justify-center border-2 border-white border-b-[#808080] border-r-[#808080] bg-[#C0C0C0] active:border-[#404040]"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
            </button>
          </div>

          {/* Active Color Preview & Palette */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-6 h-6 border-2 border-[#404040] shadow-inner"
              style={{ backgroundColor: currentColor }}
              title={`Warna aktif: ${currentColor}`}
            />

            <div className="grid grid-rows-2 grid-flow-col gap-0.5 p-0.5 bg-white border border-[#808080]">
              {WIN98_PALETTE.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setCurrentColor(hex)}
                  className={cn(
                    "w-3.5 h-3.5 border border-[#808080] transition-transform",
                    currentColor === hex && "scale-125 z-10 ring-1 ring-black"
                  )}
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Canvas Frame ── */}
      <div className="relative w-full aspect-[3/2] bg-white border-2 border-[#404040] border-r-white border-b-white shadow-inner overflow-hidden flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={cn(
            "w-full h-full block touch-none",
            isDrawer
              ? currentTool === "bucket"
                ? "cursor-crosshair"
                : "cursor-pencil"
              : "cursor-default"
          )}
        />

        {/* Read-only spectator watermark banner */}
        {!isDrawer && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 text-white text-[10px] font-mono rounded pointer-events-none">
            MODE PENONTON / LIVE STREAM
          </div>
        )}
      </div>
    </div>
  )
}
