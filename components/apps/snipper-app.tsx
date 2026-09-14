"use client"

import * as React from "react"
import {
  Upload,
  Download,
  Copy,
  Check,
  RotateCcw,
  Undo,
  MoveRight,
  Square,
  Hash,
  PenTool,
  EyeOff,
  Grid3X3,
  Type,
  Tag,
  SplitSquareVertical,
  Maximize2,
  Info,
  ShieldCheck,
  Layers,
  Sparkles,
  Camera,
  MousePointer,
  Crop,
  SunMedium,
  Highlighter,
  MessageSquare,
  Trash2,
  ZoomIn,
  ZoomOut,
  Sliders,
  Columns2,
  Bug,
} from "lucide-react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { playRetroNotificationSound } from "@/lib/sound-effects"

type ToolType =
  | "select"
  | "crop"
  | "arrow"
  | "rect"
  | "spotlight"
  | "highlight"
  | "callout"
  | "step"
  | "pen"
  | "blackout"
  | "pixelate"
  | "text"
  | "stamp"

interface Point {
  x: number
  y: number
}

interface AnnotationItem {
  id: string
  type: ToolType
  color: string
  width: number
  fontSize?: number
  points?: Point[] // For pen / highlight / arrow
  x?: number
  y?: number
  w?: number
  h?: number
  text?: string
  stepNumber?: number
  tailX?: number
  tailY?: number
}

type ResizeHandleType = "nw" | "ne" | "se" | "sw" | "p1" | "p2" | "scale" | null

const PALETTE = [
  { name: "Merah", color: "#EF4444" },
  { name: "Kuning", color: "#FACC15" },
  { name: "Biru", color: "#3B82F6" },
  { name: "Hijau", color: "#22C55E" },
  { name: "Ungu", color: "#A855F7" },
  { name: "Putih", color: "#FFFFFF" },
  { name: "Hitam", color: "#000000" },
]

const STAMP_PRESETS = [
  { label: "[ BUG / ERROR ]", color: "#EF4444" },
  { label: "[ UI GLITCH ]", color: "#F59E0B" },
  { label: "[ REPRODUCED ]", color: "#8B5CF6" },
  { label: "[ FIXED / PASS ]", color: "#10B981" },
]

// Helper distance to segment
function distanceToSegment(p: Point, v: Point, w: Point): number {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y)
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)))
}

// Compute accurate bounding box for any annotation item
function getAnnotationBounds(
  item: AnnotationItem,
  ctx?: CanvasRenderingContext2D | null
): { x: number; y: number; w: number; h: number } | null {
  if (
    (item.type === "rect" ||
      item.type === "spotlight" ||
      item.type === "blackout" ||
      item.type === "pixelate") &&
    item.x !== undefined &&
    item.y !== undefined &&
    item.w !== undefined &&
    item.h !== undefined
  ) {
    const minX = Math.min(item.x, item.x + item.w)
    const minY = Math.min(item.y, item.y + item.h)
    const w = Math.abs(item.w)
    const h = Math.abs(item.h)
    return { x: minX, y: minY, w, h }
  }

  if (item.type === "arrow" && item.points && item.points.length === 2) {
    const [p1, p2] = item.points
    const minX = Math.min(p1.x, p2.x) - 6
    const minY = Math.min(p1.y, p2.y) - 6
    const maxX = Math.max(p1.x, p2.x) + 6
    const maxY = Math.max(p1.y, p2.y) + 6
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
  }

  if (item.type === "text" && item.x !== undefined && item.y !== undefined && item.text) {
    const fSize = item.fontSize || 16
    let textW = item.text.length * (fSize * 0.65)
    if (ctx) {
      ctx.font = `bold ${fSize}px Tahoma, Arial, sans-serif`
      textW = ctx.measureText(item.text).width
    }
    const pad = Math.max(4, Math.round(fSize * 0.3))
    return {
      x: item.x - pad,
      y: item.y - fSize - pad,
      w: textW + pad * 2,
      h: fSize + pad * 2 + 2,
    }
  }

  if (item.type === "callout" && item.x !== undefined && item.y !== undefined) {
    const fSize = item.fontSize || 14
    const text = item.text || "Catatan QA"
    let textW = text.length * (fSize * 0.65)
    if (ctx) {
      ctx.font = `bold ${fSize}px Tahoma, Arial, sans-serif`
      textW = ctx.measureText(text).width
    }
    const bw = textW + Math.round(fSize * 1.3)
    const bh = Math.round(fSize * 1.8)
    return {
      x: item.x - bw / 2,
      y: item.y - bh / 2,
      w: bw,
      h: bh,
    }
  }

  if (item.type === "stamp" && item.x !== undefined && item.y !== undefined && item.text) {
    const fSize = item.fontSize || 14
    let textW = item.text.length * (fSize * 0.7)
    if (ctx) {
      ctx.font = `bold ${fSize}px 'Lucida Console', Monaco, monospace`
      textW = ctx.measureText(item.text).width
    }
    const bgW = textW + Math.round(fSize * 1.1)
    const bgH = Math.round(fSize * 1.7)
    return {
      x: item.x - bgW / 2,
      y: item.y - bgH / 2,
      w: bgW,
      h: bgH,
    }
  }

  if (item.type === "step" && item.x !== undefined && item.y !== undefined) {
    const fSize = item.fontSize || 13
    const radius = Math.max(10, Math.round(fSize * 1.05))
    let totalW = radius * 2
    if (item.text) {
      let textW = item.text.length * (fSize * 0.6)
      if (ctx) {
        ctx.font = `bold ${Math.max(10, Math.round(fSize * 0.9))}px Tahoma, Arial, sans-serif`
        textW = ctx.measureText(item.text).width
      }
      totalW += textW + 14
    }
    return {
      x: item.x - radius,
      y: item.y - radius,
      w: totalW,
      h: radius * 2,
    }
  }

  if ((item.type === "pen" || item.type === "highlight") && item.points && item.points.length > 0) {
    const xs = item.points.map((p) => p.x)
    const ys = item.points.map((p) => p.y)
    const minX = Math.min(...xs) - 6
    const minY = Math.min(...ys) - 6
    const maxX = Math.max(...xs) + 6
    const maxY = Math.max(...ys) + 6
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
  }

  return null
}

// Helper hit test for annotations
function hitTestAnnotation(
  item: AnnotationItem,
  p: Point,
  ctx?: CanvasRenderingContext2D | null
): boolean {
  if (item.type === "arrow" && item.points && item.points.length === 2) {
    const [p1, p2] = item.points
    const dist = distanceToSegment(p, p1, p2)
    return dist <= Math.max(12, item.width * 3)
  }

  if ((item.type === "pen" || item.type === "highlight") && item.points) {
    for (let i = 0; i < item.points.length; i++) {
      if (Math.hypot(p.x - item.points[i].x, p.y - item.points[i].y) <= Math.max(12, item.width * 2)) {
        return true
      }
    }
    return false
  }

  const bounds = getAnnotationBounds(item, ctx)
  if (bounds) {
    return (
      p.x >= bounds.x &&
      p.x <= bounds.x + bounds.w &&
      p.y >= bounds.y &&
      p.y <= bounds.y + bounds.h
    )
  }

  return false
}

// Get interactive resize handles for selected annotation
function getResizeHandles(
  item: AnnotationItem,
  ctx?: CanvasRenderingContext2D | null
): { type: ResizeHandleType; x: number; y: number }[] {
  const handles: { type: ResizeHandleType; x: number; y: number }[] = []

  if (
    item.type === "rect" ||
    item.type === "spotlight" ||
    item.type === "blackout" ||
    item.type === "pixelate"
  ) {
    const b = getAnnotationBounds(item, ctx)
    if (b) {
      handles.push({ type: "nw", x: b.x - 2, y: b.y - 2 })
      handles.push({ type: "ne", x: b.x + b.w + 2, y: b.y - 2 })
      handles.push({ type: "se", x: b.x + b.w + 2, y: b.y + b.h + 2 })
      handles.push({ type: "sw", x: b.x - 2, y: b.y + b.h + 2 })
    }
  } else if (item.type === "arrow" && item.points && item.points.length === 2) {
    handles.push({ type: "p1", x: item.points[0].x, y: item.points[0].y })
    handles.push({ type: "p2", x: item.points[1].x, y: item.points[1].y })
  } else if (
    item.type === "text" ||
    item.type === "callout" ||
    item.type === "stamp" ||
    item.type === "step"
  ) {
    const b = getAnnotationBounds(item, ctx)
    if (b) {
      handles.push({ type: "scale", x: b.x + b.w + 2, y: b.y + b.h + 2 })
    }
    if (item.type === "callout" && item.tailX !== undefined && item.tailY !== undefined) {
      handles.push({ type: "p1", x: item.tailX, y: item.tailY })
    }
  }

  return handles
}

function hitTestResizeHandle(
  item: AnnotationItem,
  p: Point,
  ctx?: CanvasRenderingContext2D | null
): ResizeHandleType {
  const handles = getResizeHandles(item, ctx)
  for (const h of handles) {
    if (Math.hypot(p.x - h.x, p.y - h.y) <= 8) {
      return h.type
    }
  }
  return null
}

function drawRetroHandle(ctx: CanvasRenderingContext2D, pt: Point) {
  const size = 8
  ctx.fillStyle = "#FFFFFF"
  ctx.fillRect(pt.x - size / 2, pt.y - size / 2, size, size)
  ctx.strokeStyle = "#000000"
  ctx.lineWidth = 1.5
  ctx.strokeRect(pt.x - size / 2, pt.y - size / 2, size, size)
}

export function SnipperApp() {
  const [activeTab, setActiveTab] = React.useState<"single" | "compare">("single")

  // Single Studio State
  const [baseImage, setBaseImage] = React.useState<HTMLImageElement | null>(null)
  const [activeTool, setActiveTool] = React.useState<ToolType>("arrow")
  const [activeColor, setActiveColor] = React.useState<string>("#EF4444")
  const [lineWidth, setLineWidth] = React.useState<number>(3)
  const [fontSize, setFontSize] = React.useState<number>(16)
  const [cursorStyle, setCursorStyle] = React.useState<string>("default")
  const [annotations, setAnnotations] = React.useState<AnnotationItem[]>([])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [stepCounter, setStepCounter] = React.useState<number>(1)
  const [activeStamp, setActiveStamp] = React.useState<string>(STAMP_PRESETS[0].label)
  const [customText, setCustomText] = React.useState<string>("Periksa bagian ini")
  const [includeWatermark, setIncludeWatermark] = React.useState<boolean>(true)
  const [envName, setEnvName] = React.useState<string>("Staging")

  // Zoom State
  const [zoom, setZoom] = React.useState<number>(1.0)

  // Crop State
  const [isCropActive, setIsCropActive] = React.useState(false)
  const [cropRect, setCropRect] = React.useState<{ x: number; y: number; w: number; h: number } | null>(null)

  // Compare Studio State
  const [compareImgA, setCompareImgA] = React.useState<HTMLImageElement | null>(null)
  const [compareImgB, setCompareImgB] = React.useState<HTMLImageElement | null>(null)
  const [compareMode, setCompareMode] = React.useState<"side-by-side" | "slider">("side-by-side")
  const [compareSplitPos, setCompareSplitPos] = React.useState<number>(50)
  const [labelA, setLabelA] = React.useState<string>("EXPECTED (DESAIN)")
  const [labelB, setLabelB] = React.useState<string>("ACTUAL (BUG)")

  // UI / Feedback State
  const [copied, setCopied] = React.useState(false)
  const [isResetOpen, setIsResetOpen] = React.useState(false)
  const [statusMessage, setStatusMessage] = React.useState<string>("Siap. Paste screenshot dengan Ctrl+V.")

  // Canvas Refs
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const compareCanvasRef = React.useRef<HTMLCanvasElement>(null)
  const isDrawingRef = React.useRef(false)
  const isDraggingItemRef = React.useRef(false)
  const isDraggingCropRef = React.useRef(false)
  const dragStartPosRef = React.useRef<Point>({ x: 0, y: 0 })
  const startPosRef = React.useRef<Point>({ x: 0, y: 0 })
  const currentPathRef = React.useRef<Point[]>([])
  const resizingRef = React.useRef<{
    handle: ResizeHandleType
    item: AnnotationItem
    startPos: Point
  } | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const fileInputARef = React.useRef<HTMLInputElement>(null)
  const fileInputBRef = React.useRef<HTMLInputElement>(null)

  // Load single image helper
  const loadImage = React.useCallback((file: Blob) => {
    if (!file.type.startsWith("image/")) {
      setStatusMessage("File harus berupa gambar!")
      return
    }

    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      setBaseImage(img)
      setAnnotations([])
      setSelectedId(null)
      setStepCounter(1)
      setIsCropActive(false)
      setCropRect(null)
      setStatusMessage(`Gambar dimuat: ${img.width}x${img.height}px`)
      playRetroNotificationSound()
    }
    img.src = url
  }, [])

  // Global Paste Handler (Ctrl + V)
  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile()
          if (blob) {
            if (activeTab === "single") {
              loadImage(blob)
            } else {
              const img = new Image()
              const url = URL.createObjectURL(blob)
              img.onload = () => {
                URL.revokeObjectURL(url)
                if (!compareImgA) {
                  setCompareImgA(img)
                  setStatusMessage("Gambar A (Expected) terisi dari Clipboard!")
                } else {
                  setCompareImgB(img)
                  setStatusMessage("Gambar B (Actual) terisi dari Clipboard!")
                }
                playRetroNotificationSound()
              }
              img.src = url
            }
            e.preventDefault()
            break
          }
        }
      }
    }

    window.addEventListener("paste", handlePaste)
    return () => window.removeEventListener("paste", handlePaste)
  }, [activeTab, loadImage, compareImgA])

  // Keyboard Delete / Backspace for Selected Item
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== "single") return

      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        // Jangan delete jika sedang ngetik di input teks
        if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return

        setAnnotations((prev) => prev.filter((item) => item.id !== selectedId))
        setSelectedId(null)
        setStatusMessage("Anotasi terpilih dihapus.")
        playRetroNotificationSound()
        e.preventDefault()
      } else if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
        if (annotations.length > 0) {
          setAnnotations((prev) => prev.slice(0, -1))
          e.preventDefault()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [activeTab, selectedId, annotations.length])

  // Change color / width / font size / text updates selected annotation in real time
  const handleColorChange = (newColor: string) => {
    setActiveColor(newColor)
    if (selectedId) {
      setAnnotations((prev) =>
        prev.map((item) => (item.id === selectedId ? { ...item, color: newColor } : item))
      )
    }
  }

  const handleWidthChange = (newWidth: number) => {
    const clamped = Math.max(1, Math.min(20, newWidth))
    setLineWidth(clamped)
    if (selectedId) {
      setAnnotations((prev) =>
        prev.map((item) => (item.id === selectedId ? { ...item, width: clamped } : item))
      )
    }
  }

  const handleFontSizeChange = (newSize: number) => {
    const clamped = Math.max(10, Math.min(72, newSize))
    setFontSize(clamped)
    if (selectedId) {
      setAnnotations((prev) =>
        prev.map((item) => (item.id === selectedId ? { ...item, fontSize: clamped } : item))
      )
    }
  }

  const handleTextChange = (newText: string) => {
    setCustomText(newText)
    if (selectedId) {
      setAnnotations((prev) =>
        prev.map((item) => (item.id === selectedId ? { ...item, text: newText } : item))
      )
    }
  }

  // --------------------------------------------------------------------------
  // SINGLE CANVAS REDRAW ENGINE
  // --------------------------------------------------------------------------
  const renderSingleCanvas = React.useCallback(
    (previewItem?: AnnotationItem, hideSelection = false) => {
      const canvas = canvasRef.current
      if (!canvas || !baseImage) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const watermarkHeight = includeWatermark ? 28 : 0
      canvas.width = baseImage.width
      canvas.height = baseImage.height + watermarkHeight

      // 1. Draw base image
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(baseImage, 0, 0)

      const allItems = previewItem ? [...annotations, previewItem] : annotations

      // 2. Render Spotlights first
      allItems.forEach((item) => {
        if (item.type === "spotlight" && item.x !== undefined && item.y !== undefined && item.w && item.h) {
          const sx = item.w < 0 ? item.x + item.w : item.x
          const sy = item.h < 0 ? item.y + item.h : item.y
          const sw = Math.abs(item.w)
          const sh = Math.abs(item.h)

          // Dim entire image
          ctx.fillStyle = "rgba(0, 0, 0, 0.55)"
          ctx.fillRect(0, 0, baseImage.width, baseImage.height)

          // Clear hole and redraw crisp un-dimmed image inside spotlight
          ctx.drawImage(baseImage, sx, sy, sw, sh, sx, sy, sw, sh)

          // Border frame
          ctx.strokeStyle = item.color
          ctx.lineWidth = Math.max(2, item.width)
          ctx.strokeRect(sx, sy, sw, sh)
        }
      })

      // 3. Render Redactions (Blackout & Pixelate)
      allItems.forEach((item) => {
        if (item.type === "blackout" && item.x !== undefined && item.y !== undefined && item.w && item.h) {
          ctx.fillStyle = "#000000"
          ctx.fillRect(item.x, item.y, item.w, item.h)
        } else if (item.type === "pixelate" && item.x !== undefined && item.y !== undefined && item.w && item.h) {
          const rw = Math.abs(item.w)
          const rh = Math.abs(item.h)
          const rx = item.w < 0 ? item.x + item.w : item.x
          const ry = item.h < 0 ? item.y + item.h : item.y

          if (rw > 4 && rh > 4) {
            try {
              const offCanvas = document.createElement("canvas")
              const scale = 0.1
              const miniW = Math.max(1, Math.floor(rw * scale))
              const miniH = Math.max(1, Math.floor(rh * scale))
              offCanvas.width = miniW
              offCanvas.height = miniH
              const offCtx = offCanvas.getContext("2d")
              if (offCtx) {
                offCtx.drawImage(canvas, rx, ry, rw, rh, 0, 0, miniW, miniH)
                ctx.imageSmoothingEnabled = false
                ctx.drawImage(offCanvas, 0, 0, miniW, miniH, rx, ry, rw, rh)
                ctx.imageSmoothingEnabled = true
              }
            } catch (e) {
              ctx.fillStyle = "rgba(0,0,0,0.85)"
              ctx.fillRect(rx, ry, rw, rh)
            }
          }
        }
      })

      // 4. Render Highlighters (Stabilo)
      allItems.forEach((item) => {
        if (item.type === "highlight" && item.points && item.points.length > 1) {
          ctx.save()
          ctx.globalAlpha = 0.38
          ctx.strokeStyle = item.color
          ctx.lineWidth = Math.max(18, item.width * 5)
          ctx.lineCap = "square"
          ctx.lineJoin = "round"
          ctx.beginPath()
          ctx.moveTo(item.points[0].x, item.points[0].y)
          for (let i = 1; i < item.points.length; i++) {
            ctx.lineTo(item.points[i].x, item.points[i].y)
          }
          ctx.stroke()
          ctx.restore()
        }
      })

      // 5. Render Shapes, Arrows, Step Badges, Callouts, Text
      allItems.forEach((item) => {
        ctx.strokeStyle = item.color
        ctx.fillStyle = item.color
        ctx.lineWidth = item.width
        ctx.lineCap = "round"
        ctx.lineJoin = "round"

        if (item.type === "pen" && item.points && item.points.length > 1) {
          ctx.beginPath()
          ctx.moveTo(item.points[0].x, item.points[0].y)
          for (let i = 1; i < item.points.length; i++) {
            ctx.lineTo(item.points[i].x, item.points[i].y)
          }
          ctx.stroke()
        } else if (item.type === "rect" && item.x !== undefined && item.y !== undefined && item.w && item.h) {
          ctx.strokeRect(item.x, item.y, item.w, item.h)
        } else if (item.type === "arrow" && item.points && item.points.length === 2) {
          const [p1, p2] = item.points
          const headlen = Math.max(14, item.width * 4)
          const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x)

          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.stroke()

          ctx.beginPath()
          ctx.moveTo(p2.x, p2.y)
          ctx.lineTo(p2.x - headlen * Math.cos(angle - Math.PI / 6), p2.y - headlen * Math.sin(angle - Math.PI / 6))
          ctx.lineTo(p2.x - headlen * Math.cos(angle + Math.PI / 6), p2.y - headlen * Math.sin(angle + Math.PI / 6))
          ctx.closePath()
          ctx.fill()
        } else if (item.type === "step" && item.x !== undefined && item.y !== undefined && item.stepNumber) {
          const fSize = item.fontSize || 13
          const radius = Math.max(10, Math.round(fSize * 1.05))
          ctx.beginPath()
          ctx.arc(item.x, item.y, radius, 0, Math.PI * 2)
          ctx.fillStyle = item.color
          ctx.fill()
          ctx.lineWidth = Math.max(1.5, Math.round(fSize * 0.15))
          ctx.strokeStyle = "#FFFFFF"
          ctx.stroke()

          ctx.fillStyle = "#FFFFFF"
          ctx.font = `bold ${fSize}px Tahoma, Arial, sans-serif`
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillText(String(item.stepNumber), item.x, item.y)

          // Step label note if present
          if (item.text) {
            const noteFSize = Math.max(10, Math.round(fSize * 0.9))
            ctx.font = `bold ${noteFSize}px Tahoma, Arial, sans-serif`
            const metrics = ctx.measureText(item.text)
            const boxH = Math.round(noteFSize * 1.6)
            ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
            ctx.fillRect(item.x + radius + 4, item.y - boxH / 2, metrics.width + 10, boxH)
            ctx.fillStyle = "#FFFFFF"
            ctx.textAlign = "left"
            ctx.textBaseline = "middle"
            ctx.fillText(item.text, item.x + radius + 9, item.y)
          }
        } else if (item.type === "callout" && item.x !== undefined && item.y !== undefined) {
          const text = item.text || "Catatan QA"
          const fSize = item.fontSize || 14
          ctx.font = `bold ${fSize}px Tahoma, Arial, sans-serif`
          const metrics = ctx.measureText(text)
          const bw = metrics.width + Math.round(fSize * 1.3)
          const bh = Math.round(fSize * 1.8)
          const bx = item.x - bw / 2
          const by = item.y - bh / 2

          // Tail
          const tx = item.tailX !== undefined ? item.tailX : item.x
          const ty = item.tailY !== undefined ? item.tailY : item.y + 40
          ctx.beginPath()
          ctx.moveTo(bx + bw / 2 - 8, by + bh)
          ctx.lineTo(tx, ty)
          ctx.lineTo(bx + bw / 2 + 8, by + bh)
          ctx.closePath()
          ctx.fillStyle = item.color
          ctx.fill()

          // Bubble box
          ctx.fillStyle = item.color
          ctx.fillRect(bx, by, bw, bh)
          ctx.lineWidth = Math.max(1.5, item.width)
          ctx.strokeStyle = "#FFFFFF"
          ctx.strokeRect(bx, by, bw, bh)

          ctx.fillStyle = "#FFFFFF"
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillText(text, bx + bw / 2, by + bh / 2)
        } else if (item.type === "stamp" && item.x !== undefined && item.y !== undefined && item.text) {
          const fSize = item.fontSize || 14
          ctx.font = `bold ${fSize}px 'Lucida Console', Monaco, monospace`
          const textMetrics = ctx.measureText(item.text)
          const bgW = textMetrics.width + Math.round(fSize * 1.1)
          const bgH = Math.round(fSize * 1.7)

          ctx.fillStyle = "rgba(0, 0, 0, 0.85)"
          ctx.fillRect(item.x - bgW / 2, item.y - bgH / 2, bgW, bgH)
          ctx.strokeStyle = item.color
          ctx.lineWidth = Math.max(1.5, item.width)
          ctx.strokeRect(item.x - bgW / 2, item.y - bgH / 2, bgW, bgH)

          ctx.fillStyle = item.color
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillText(item.text, item.x, item.y)
        } else if (item.type === "text" && item.x !== undefined && item.y !== undefined && item.text) {
          const fSize = item.fontSize || 16
          ctx.font = `bold ${fSize}px Tahoma, Arial, sans-serif`
          const metrics = ctx.measureText(item.text)
          const pad = Math.max(4, Math.round(fSize * 0.3))
          ctx.fillStyle = "rgba(0, 0, 0, 0.75)"
          ctx.fillRect(item.x - pad, item.y - fSize - pad, metrics.width + pad * 2, fSize + pad * 2 + 2)

          ctx.fillStyle = item.color
          ctx.textAlign = "left"
          ctx.textBaseline = "alphabetic"
          ctx.fillText(item.text, item.x, item.y)
        }

        // Selection highlight & Resize Handles
        if (!hideSelection && item.id === selectedId && item.id !== "preview") {
          ctx.save()
          ctx.setLineDash([4, 4])
          ctx.strokeStyle = "#38BDF8"
          ctx.lineWidth = 2

          const bounds = getAnnotationBounds(item, ctx)
          if (bounds) {
            ctx.strokeRect(bounds.x - 2, bounds.y - 2, bounds.w + 4, bounds.h + 4)
          }

          // Draw retro handles
          ctx.setLineDash([])
          const handles = getResizeHandles(item, ctx)
          handles.forEach((h) => {
            drawRetroHandle(ctx, { x: h.x, y: h.y })
          })

          ctx.restore()
        }
      })

      // 6. Render Crop Mask if crop tool is active
      if (isCropActive && cropRect && cropRect.w !== 0 && cropRect.h !== 0) {
        const cx = cropRect.w < 0 ? cropRect.x + cropRect.w : cropRect.x
        const cy = cropRect.h < 0 ? cropRect.y + cropRect.h : cropRect.y
        const cw = Math.abs(cropRect.w)
        const ch = Math.abs(cropRect.h)

        ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
        // Top
        ctx.fillRect(0, 0, canvas.width, cy)
        // Bottom
        ctx.fillRect(0, cy + ch, canvas.width, canvas.height - (cy + ch))
        // Left
        ctx.fillRect(0, cy, cx, ch)
        // Right
        ctx.fillRect(cx + cw, cy, canvas.width - (cx + cw), ch)

        // Crop border dashed
        ctx.save()
        ctx.setLineDash([6, 6])
        ctx.strokeStyle = "#FFFFFF"
        ctx.lineWidth = 2
        ctx.strokeRect(cx, cy, cw, ch)
        ctx.restore()
      }

      // 7. Watermark bar
      if (includeWatermark) {
        const barY = baseImage.height
        ctx.fillStyle = "#1E293B"
        ctx.fillRect(0, barY, canvas.width, watermarkHeight)

        ctx.fillStyle = "#94A3B8"
        ctx.font = "11px 'Lucida Console', Monaco, monospace"
        ctx.textAlign = "left"
        ctx.textBaseline = "middle"
        const timeStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
        const dateStr = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
        ctx.fillText(
          `[ ENV: ${envName.toUpperCase()} | RES: ${baseImage.width}x${baseImage.height} | ${dateStr} ${timeStr} ]`,
          10,
          barY + watermarkHeight / 2
        )

        ctx.textAlign = "right"
        ctx.fillStyle = "#38BDF8"
        ctx.fillText("it-things / Snipper.exe QA Pro", canvas.width - 10, barY + watermarkHeight / 2)
      }
    },
    [baseImage, annotations, selectedId, isCropActive, cropRect, includeWatermark, envName]
  )

  React.useEffect(() => {
    if (activeTab === "single") {
      renderSingleCanvas()
    }
  }, [activeTab, renderSingleCanvas])

  // Coordinate mapper from client event to canvas native coordinates
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  // Pointer Down
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!baseImage) return
    const pos = getCanvasCoords(e)
    if (!pos) return

    startPosRef.current = pos

    // Check if clicking a resize handle of the selected item first!
    if (selectedId) {
      const sel = annotations.find((a) => a.id === selectedId)
      if (sel) {
        const handle = hitTestResizeHandle(sel, pos, canvasRef.current?.getContext("2d"))
        if (handle) {
          resizingRef.current = {
            handle,
            item: JSON.parse(JSON.stringify(sel)),
            startPos: pos,
          }
          setStatusMessage(`Mengubah ukuran ${sel.type.toUpperCase()}...`)
          return
        }
      }
    }

    // Select Tool: hit test items
    if (activeTool === "select") {
      let found: AnnotationItem | null = null
      for (let i = annotations.length - 1; i >= 0; i--) {
        if (hitTestAnnotation(annotations[i], pos, canvasRef.current?.getContext("2d"))) {
          found = annotations[i]
          break
        }
      }

      if (found) {
        setSelectedId(found.id)
        if (found.fontSize) setFontSize(found.fontSize)
        if (found.width) setLineWidth(found.width)
        if (found.color) setActiveColor(found.color)
        if (found.text !== undefined) setCustomText(found.text)
        isDraggingItemRef.current = true
        dragStartPosRef.current = pos
        setStatusMessage(`Item dipilih (${found.type.toUpperCase()}). Ubah ukuran, geser posisi, atau tekan Delete.`)
      } else {
        setSelectedId(null)
      }
      return
    }

    // Crop Tool: start drag crop box
    if (activeTool === "crop") {
      setIsCropActive(true)
      isDraggingCropRef.current = true
      setCropRect({ x: pos.x, y: pos.y, w: 0, h: 0 })
      return
    }

    isDrawingRef.current = true

    if (activeTool === "pen" || activeTool === "highlight") {
      currentPathRef.current = [pos]
    } else if (activeTool === "step") {
      const newItem: AnnotationItem = {
        id: `step-${Date.now()}`,
        type: "step",
        color: activeColor,
        width: lineWidth,
        fontSize: fontSize,
        x: pos.x,
        y: pos.y,
        stepNumber: stepCounter,
        text: customText.trim() ? customText : undefined,
      }
      setAnnotations((prev) => [...prev, newItem])
      setStepCounter((prev) => prev + 1)
      isDrawingRef.current = false
      playRetroNotificationSound()
    } else if (activeTool === "stamp") {
      const newItem: AnnotationItem = {
        id: `stamp-${Date.now()}`,
        type: "stamp",
        color: activeColor,
        width: lineWidth,
        fontSize: fontSize,
        x: pos.x,
        y: pos.y,
        text: activeStamp,
      }
      setAnnotations((prev) => [...prev, newItem])
      isDrawingRef.current = false
      playRetroNotificationSound()
    } else if (activeTool === "text") {
      const newItem: AnnotationItem = {
        id: `text-${Date.now()}`,
        type: "text",
        color: activeColor,
        width: lineWidth,
        fontSize: fontSize,
        x: pos.x,
        y: pos.y,
        text: customText.trim() ? customText : "Catatan Bug",
      }
      setAnnotations((prev) => [...prev, newItem])
      setSelectedId(newItem.id)
      setActiveTool("select")
      isDrawingRef.current = false
      playRetroNotificationSound()
      setStatusMessage("Teks ditambahkan. Anda dapat mengubah ukuran font atau mengedit teks.")
    }
  }

  // Pointer Move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!baseImage) return
    const pos = getCanvasCoords(e)
    if (!pos) return

    // Drag resize handle of selected item
    if (resizingRef.current && selectedId) {
      const { handle, item: orig, startPos } = resizingRef.current
      const dx = pos.x - startPos.x
      const dy = pos.y - startPos.y

      setAnnotations((prev) =>
        prev.map((item) => {
          if (item.id !== selectedId) return item
          const updated = { ...item }

          if (orig.x !== undefined && orig.y !== undefined && orig.w !== undefined && orig.h !== undefined) {
            const origX = Math.min(orig.x, orig.x + orig.w)
            const origY = Math.min(orig.y, orig.y + orig.h)
            const origW = Math.abs(orig.w)
            const origH = Math.abs(orig.h)

            if (handle === "se") {
              updated.x = origX
              updated.y = origY
              updated.w = Math.max(10, origW + dx)
              updated.h = Math.max(10, origH + dy)
            } else if (handle === "nw") {
              updated.x = origX + dx
              updated.y = origY + dy
              updated.w = Math.max(10, origW - dx)
              updated.h = Math.max(10, origH - dy)
            } else if (handle === "ne") {
              updated.x = origX
              updated.y = origY + dy
              updated.w = Math.max(10, origW + dx)
              updated.h = Math.max(10, origH - dy)
            } else if (handle === "sw") {
              updated.x = origX + dx
              updated.y = origY
              updated.w = Math.max(10, origW - dx)
              updated.h = Math.max(10, origH + dy)
            }
          } else if (orig.type === "arrow" && orig.points && orig.points.length === 2) {
            if (handle === "p1") {
              updated.points = [pos, orig.points[1]]
            } else if (handle === "p2") {
              updated.points = [orig.points[0], pos]
            }
          } else if (handle === "scale") {
            const origSize = orig.fontSize || 16
            const delta = (dx + dy) / 3
            const newSize = Math.max(10, Math.min(72, Math.round(origSize + delta)))
            updated.fontSize = newSize
            setFontSize(newSize)
          } else if (orig.type === "callout" && handle === "p1") {
            updated.tailX = pos.x
            updated.tailY = pos.y
          }

          return updated
        })
      )
      return
    }

    // Drag selected item
    if (isDraggingItemRef.current && selectedId) {
      const dx = pos.x - dragStartPosRef.current.x
      const dy = pos.y - dragStartPosRef.current.y
      dragStartPosRef.current = pos

      setAnnotations((prev) =>
        prev.map((item) => {
          if (item.id !== selectedId) return item
          const updated = { ...item }
          if (updated.x !== undefined) updated.x += dx
          if (updated.y !== undefined) updated.y += dy
          if (updated.tailX !== undefined) updated.tailX += dx
          if (updated.tailY !== undefined) updated.tailY += dy
          if (updated.points) {
            updated.points = updated.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy }))
          }
          return updated
        })
      )
      return
    }

    // Drag crop box
    if (isDraggingCropRef.current && cropRect) {
      setCropRect({
        x: startPosRef.current.x,
        y: startPosRef.current.y,
        w: pos.x - startPosRef.current.x,
        h: pos.y - startPosRef.current.y,
      })
      return
    }

    // Dynamic cursor feedback when not drawing
    if (!isDrawingRef.current && !isDraggingItemRef.current && !resizingRef.current) {
      if (activeTool === "select") {
        if (selectedId) {
          const sel = annotations.find((a) => a.id === selectedId)
          if (sel) {
            const handle = hitTestResizeHandle(sel, pos, canvasRef.current?.getContext("2d"))
            if (handle === "nw" || handle === "se" || handle === "scale") {
              setCursorStyle("nwse-resize")
            } else if (handle === "ne" || handle === "sw") {
              setCursorStyle("nesw-resize")
            } else if (handle === "p1" || handle === "p2") {
              setCursorStyle("crosshair")
            } else if (hitTestAnnotation(sel, pos, canvasRef.current?.getContext("2d"))) {
              setCursorStyle("move")
            } else {
              setCursorStyle("default")
            }
          } else {
            setCursorStyle("default")
          }
        } else {
          let hovered = false
          for (let i = annotations.length - 1; i >= 0; i--) {
            if (hitTestAnnotation(annotations[i], pos, canvasRef.current?.getContext("2d"))) {
              hovered = true
              break
            }
          }
          setCursorStyle(hovered ? "pointer" : "default")
        }
      } else if (activeTool === "crop") {
        setCursorStyle("crosshair")
      } else {
        setCursorStyle("crosshair")
      }
    }

    if (!isDrawingRef.current) return

    if (activeTool === "pen" || activeTool === "highlight") {
      currentPathRef.current.push(pos)
      renderSingleCanvas({
        id: "preview",
        type: activeTool,
        color: activeColor,
        width: lineWidth,
        points: [...currentPathRef.current],
      })
    } else if (activeTool === "arrow") {
      renderSingleCanvas({
        id: "preview",
        type: "arrow",
        color: activeColor,
        width: lineWidth,
        points: [startPosRef.current, pos],
      })
    } else if (activeTool === "callout") {
      renderSingleCanvas({
        id: "preview",
        type: "callout",
        color: activeColor,
        width: lineWidth,
        fontSize: fontSize,
        x: pos.x,
        y: pos.y,
        tailX: startPosRef.current.x,
        tailY: startPosRef.current.y,
        text: customText,
      })
    } else if (
      activeTool === "rect" ||
      activeTool === "spotlight" ||
      activeTool === "blackout" ||
      activeTool === "pixelate"
    ) {
      const w = pos.x - startPosRef.current.x
      const h = pos.y - startPosRef.current.y
      renderSingleCanvas({
        id: "preview",
        type: activeTool,
        color: activeColor,
        width: lineWidth,
        x: startPosRef.current.x,
        y: startPosRef.current.y,
        w,
        h,
      })
    }
  }

  // Pointer Up
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!baseImage) return
    const pos = getCanvasCoords(e)

    if (resizingRef.current) {
      resizingRef.current = null
      setStatusMessage("Ukuran objek diperbarui.")
      renderSingleCanvas()
      return
    }

    if (isDraggingItemRef.current) {
      isDraggingItemRef.current = false
      return
    }

    if (isDraggingCropRef.current) {
      isDraggingCropRef.current = false
      return
    }

    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    if (!pos) return

    if (activeTool === "pen" || activeTool === "highlight") {
      if (currentPathRef.current.length > 1) {
        setAnnotations((prev) => [
          ...prev,
          {
            id: `${activeTool}-${Date.now()}`,
            type: activeTool,
            color: activeColor,
            width: lineWidth,
            points: currentPathRef.current,
          },
        ])
      }
      currentPathRef.current = []
    } else if (activeTool === "arrow") {
      setAnnotations((prev) => [
        ...prev,
        {
          id: `arrow-${Date.now()}`,
          type: "arrow",
          color: activeColor,
          width: lineWidth,
          points: [startPosRef.current, pos],
        },
      ])
    } else if (activeTool === "callout") {
      const newItem: AnnotationItem = {
        id: `callout-${Date.now()}`,
        type: "callout",
        color: activeColor,
        width: lineWidth,
        fontSize: fontSize,
        x: pos.x,
        y: pos.y,
        tailX: startPosRef.current.x,
        tailY: startPosRef.current.y,
        text: customText.trim() ? customText : "Catatan QA",
      }
      setAnnotations((prev) => [...prev, newItem])
      setSelectedId(newItem.id)
      setActiveTool("select")
      playRetroNotificationSound()
      setStatusMessage("Callout dibuat! Anda bisa ubah teks di bar atas atau geser ekor penunjuk.")
    } else if (
      activeTool === "rect" ||
      activeTool === "spotlight" ||
      activeTool === "blackout" ||
      activeTool === "pixelate"
    ) {
      const w = pos.x - startPosRef.current.x
      const h = pos.y - startPosRef.current.y
      if (Math.abs(w) > 4 && Math.abs(h) > 4) {
        setAnnotations((prev) => [
          ...prev,
          {
            id: `${activeTool}-${Date.now()}`,
            type: activeTool,
            color: activeColor,
            width: lineWidth,
            x: startPosRef.current.x,
            y: startPosRef.current.y,
            w,
            h,
          },
        ])
      }
    }
    renderSingleCanvas()
  }

  // Apply Crop Action
  const applyCrop = () => {
    if (!baseImage || !cropRect) return
    const cx = Math.max(0, cropRect.w < 0 ? cropRect.x + cropRect.w : cropRect.x)
    const cy = Math.max(0, cropRect.h < 0 ? cropRect.y + cropRect.h : cropRect.y)
    const cw = Math.min(baseImage.width - cx, Math.abs(cropRect.w))
    const ch = Math.min(baseImage.height - cy, Math.abs(cropRect.h))

    if (cw < 10 || ch < 10) {
      setStatusMessage("Area crop terlalu kecil!")
      return
    }

    const offCanvas = document.createElement("canvas")
    offCanvas.width = cw
    offCanvas.height = ch
    const offCtx = offCanvas.getContext("2d")
    if (!offCtx) return

    offCtx.drawImage(baseImage, cx, cy, cw, ch, 0, 0, cw, ch)

    const newImg = new Image()
    newImg.onload = () => {
      setBaseImage(newImg)
      // Geser koordinat anotasi yang tersisa
      setAnnotations((prev) =>
        prev
          .map((item) => {
            const updated = { ...item }
            if (updated.x !== undefined) updated.x -= cx
            if (updated.y !== undefined) updated.y -= cy
            if (updated.tailX !== undefined) updated.tailX -= cx
            if (updated.tailY !== undefined) updated.tailY -= cy
            if (updated.points) {
              updated.points = updated.points.map((pt) => ({ x: pt.x - cx, y: pt.y - cy }))
            }
            return updated
          })
          .filter((item) => {
            if (item.x !== undefined && item.y !== undefined) {
              return item.x >= -50 && item.x <= cw + 50 && item.y >= -50 && item.y <= ch + 50
            }
            return true
          })
      )
      setIsCropActive(false)
      setCropRect(null)
      setActiveTool("select")
      setStatusMessage(`Crop berhasil! Resolusi baru: ${cw}x${ch}px`)
      playRetroNotificationSound()
    }
    newImg.src = offCanvas.toDataURL("image/png")
  }

  const cancelCrop = () => {
    setIsCropActive(false)
    setCropRect(null)
    setActiveTool("select")
  }

  // Copy Single Canvas
  const handleCopySingle = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    renderSingleCanvas(undefined, true)
    try {
      canvas.toBlob(async (blob) => {
        renderSingleCanvas()
        if (!blob) return
        const item = new ClipboardItem({ "image/png": blob })
        await navigator.clipboard.write([item])
        setCopied(true)
        playRetroNotificationSound()
        setStatusMessage("Screenshot berhasil disalin ke Clipboard!")
        setTimeout(() => setCopied(false), 2500)
      })
    } catch (err) {
      renderSingleCanvas()
      console.error("Gagal copy:", err)
      setStatusMessage("Clipboard ditolak browser. Gunakan tombol Download.")
    }
  }

  // Download Single Canvas
  const handleDownloadSingle = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    renderSingleCanvas(undefined, true)
    const a = document.createElement("a")
    a.href = canvas.toDataURL("image/png")
    a.download = `bug-snip-${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    renderSingleCanvas()
  }

  // --------------------------------------------------------------------------
  // COMPARE MODE ENGINE (Side-by-Side & Interactive Slider Diff)
  // --------------------------------------------------------------------------
  const renderCompareCanvas = React.useCallback(() => {
    const canvas = compareCanvasRef.current
    if (!canvas || !compareImgA || !compareImgB) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const headerHeight = 36
    const pad = 12

    if (compareMode === "side-by-side") {
      const targetH = Math.max(compareImgA.height, compareImgB.height)
      const widthA = Math.round((compareImgA.width * targetH) / compareImgA.height)
      const widthB = Math.round((compareImgB.width * targetH) / compareImgB.height)

      const totalWidth = widthA + widthB + pad * 3
      const totalHeight = targetH + headerHeight + pad * 2

      canvas.width = totalWidth
      canvas.height = totalHeight

      ctx.fillStyle = "#1E293B"
      ctx.fillRect(0, 0, totalWidth, totalHeight)

      // Card A (Expected)
      const xA = pad
      const yA = headerHeight + pad
      ctx.fillStyle = "#0F172A"
      ctx.fillRect(xA - 2, yA - 2, widthA + 4, targetH + 4)
      ctx.drawImage(compareImgA, xA, yA, widthA, targetH)

      ctx.fillStyle = "#10B981"
      ctx.fillRect(xA, pad, widthA, headerHeight - 6)
      ctx.fillStyle = "#064E3B"
      ctx.font = "bold 13px Tahoma, Arial, sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(labelA.toUpperCase(), xA + widthA / 2, pad + (headerHeight - 6) / 2)

      // Card B (Actual)
      const xB = xA + widthA + pad
      const yB = headerHeight + pad
      ctx.fillStyle = "#0F172A"
      ctx.fillRect(xB - 2, yB - 2, widthB + 4, targetH + 4)
      ctx.drawImage(compareImgB, xB, yB, widthB, targetH)

      ctx.fillStyle = "#EF4444"
      ctx.fillRect(xB, pad, widthB, headerHeight - 6)
      ctx.fillStyle = "#FFFFFF"
      ctx.font = "bold 13px Tahoma, Arial, sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(labelB.toUpperCase(), xB + widthB / 2, pad + (headerHeight - 6) / 2)
    } else {
      // SLIDER OVERLAY MODE (Pixel Diff Curtain)
      const maxW = Math.max(compareImgA.width, compareImgB.width)
      const maxH = Math.max(compareImgA.height, compareImgB.height)

      canvas.width = maxW + pad * 2
      canvas.height = maxH + headerHeight + pad * 2

      ctx.fillStyle = "#1E293B"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const originX = pad
      const originY = headerHeight + pad

      // 1. Draw Image B (Actual / Background)
      ctx.drawImage(compareImgB, originX, originY, maxW, maxH)

      // 2. Draw Image A (Expected / Clipped on Left Side of slider)
      const splitX = Math.round((maxW * compareSplitPos) / 100)
      ctx.save()
      ctx.beginPath()
      ctx.rect(originX, originY, splitX, maxH)
      ctx.clip()
      ctx.drawImage(compareImgA, originX, originY, maxW, maxH)
      ctx.restore()

      // 3. Slider Divider Line
      ctx.strokeStyle = "#FFFFFF"
      ctx.lineWidth = 2
      ctx.shadowColor = "rgba(0,0,0,0.8)"
      ctx.shadowBlur = 4
      ctx.beginPath()
      ctx.moveTo(originX + splitX, originY)
      ctx.lineTo(originX + splitX, originY + maxH)
      ctx.stroke()
      ctx.shadowBlur = 0

      // Handle circle
      ctx.fillStyle = "#38BDF8"
      ctx.beginPath()
      ctx.arc(originX + splitX, originY + maxH / 2, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = "#FFFFFF"
      ctx.lineWidth = 2
      ctx.stroke()

      // Header Labels
      ctx.fillStyle = "#10B981"
      ctx.fillRect(originX, pad, Math.max(120, splitX), headerHeight - 6)
      ctx.fillStyle = "#064E3B"
      ctx.font = "bold 12px Tahoma, Arial, sans-serif"
      ctx.textAlign = "left"
      ctx.textBaseline = "middle"
      ctx.fillText(`◄ ${labelA.toUpperCase()}`, originX + 8, pad + (headerHeight - 6) / 2)

      ctx.fillStyle = "#EF4444"
      ctx.fillRect(originX + splitX, pad, Math.max(120, maxW - splitX), headerHeight - 6)
      ctx.fillStyle = "#FFFFFF"
      ctx.font = "bold 12px Tahoma, Arial, sans-serif"
      ctx.textAlign = "right"
      ctx.textBaseline = "middle"
      ctx.fillText(`${labelB.toUpperCase()} ►`, originX + maxW - 8, pad + (headerHeight - 6) / 2)
    }
  }, [compareImgA, compareImgB, compareMode, compareSplitPos, labelA, labelB])

  React.useEffect(() => {
    if (activeTab === "compare") {
      renderCompareCanvas()
    }
  }, [activeTab, renderCompareCanvas])

  const handleCopyCompare = async () => {
    const canvas = compareCanvasRef.current
    if (!canvas) return
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return
        const item = new ClipboardItem({ "image/png": blob })
        await navigator.clipboard.write([item])
        setCopied(true)
        playRetroNotificationSound()
        setStatusMessage("Perbandingan berhasil disalin ke Clipboard!")
        setTimeout(() => setCopied(false), 2500)
      })
    } catch (err) {
      console.error("Gagal copy:", err)
    }
  }

  const handleDownloadCompare = () => {
    const canvas = compareCanvasRef.current
    if (!canvas) return
    const a = document.createElement("a")
    a.href = canvas.toDataURL("image/png")
    a.download = `compare-${compareMode}-${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const doResetSingle = () => {
    setBaseImage(null)
    setAnnotations([])
    setSelectedId(null)
    setStepCounter(1)
    setIsCropActive(false)
    setCropRect(null)
    setZoom(1.0)
    setStatusMessage("Studio di-reset. Siap paste gambar baru.")
    setIsResetOpen(false)
  }

  return (
    <div className="flex flex-col h-full bg-[#C0C0C0] text-black font-sans text-xs select-none overflow-hidden">
      {/* ── Retro Header Tab Bar ── */}
      <div className="bg-[#D4D0C8] border-b border-[#808080] px-2 pt-1 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("single")}
            className={`px-3 py-1 font-bold border-t-2 border-l-2 border-r-2 text-xs flex items-center gap-1.5 cursor-pointer ${
              activeTab === "single"
                ? "bg-[#C0C0C0] border-white border-r-[#808080] translate-y-px z-10"
                : "bg-[#B0B0B0] border-[#D0D0D0] border-r-[#606060] text-[#555]"
            }`}
          >
            <Bug className="w-3.5 h-3.5 text-emerald-700" />
            <span>Studio Anotasi QA Pro</span>
          </button>
          <button
            onClick={() => setActiveTab("compare")}
            className={`px-3 py-1 font-bold border-t-2 border-l-2 border-r-2 text-xs flex items-center gap-1.5 cursor-pointer ${
              activeTab === "compare"
                ? "bg-[#C0C0C0] border-white border-r-[#808080] translate-y-px z-10"
                : "bg-[#B0B0B0] border-[#D0D0D0] border-r-[#606060] text-[#555]"
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5 text-emerald-700" />
            <span>Before vs After (Expected vs Actual)</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-[#EFEFEF] border border-[#808080] text-[10px] text-emerald-800 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Zero Server Leak • 100% Client-Side RAM</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: QA PRO ANNOTATION STUDIO
      ───────────────────────────────────────────────────────────── */}
      <div className={activeTab === "single" ? "flex-1 flex flex-col min-h-0" : "hidden"}>
          {/* Main Toolbar */}
          <div className="bg-[#D4D0C8] border-b border-[#808080] p-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
            {/* Tools Palette */}
            <div className="flex flex-wrap items-center gap-1">
              {/* Select Pointer */}
              <button
                onClick={() => {
                  setActiveTool("select")
                  setIsCropActive(false)
                }}
                className={`p-1.5 border-t border-l border-b border-r font-bold text-xs flex items-center gap-1 cursor-pointer ${
                  activeTool === "select"
                    ? "bg-[#000080] text-white border-black"
                    : "bg-[#C0C0C0] border-white border-r-black border-b-black"
                }`}
                title="Pilih & Geser Objek (Delete untuk hapus)"
              >
                <MousePointer className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Pilih</span>
              </button>

              {/* Crop Tool */}
              <button
                onClick={() => {
                  setActiveTool("crop")
                  setIsCropActive(true)
                  setSelectedId(null)
                }}
                className={`p-1.5 border-t border-l border-b border-r font-bold text-xs flex items-center gap-1 cursor-pointer ${
                  activeTool === "crop"
                    ? "bg-[#000080] text-white border-black"
                    : "bg-[#C0C0C0] border-white border-r-black border-b-black"
                }`}
                title="Potong Screenshot (Crop)"
              >
                <Crop className="w-3.5 h-3.5 text-amber-700" />
                <span>Crop</span>
              </button>

              <div className="w-px h-5 bg-[#808080] mx-0.5" />

              {/* Arrow */}
              <button
                onClick={() => {
                  setActiveTool("arrow")
                  setIsCropActive(false)
                  setSelectedId(null)
                }}
                className={`p-1.5 border-t border-l border-b border-r font-bold text-xs flex items-center gap-1 cursor-pointer ${
                  activeTool === "arrow"
                    ? "bg-[#000080] text-white border-black"
                    : "bg-[#C0C0C0] border-white border-r-black border-b-black"
                }`}
                title="Panah Penunjuk Bug"
              >
                <MoveRight className="w-4 h-4" />
                <span className="hidden md:inline">Panah</span>
              </button>

              {/* Rect */}
              <button
                onClick={() => {
                  setActiveTool("rect")
                  setIsCropActive(false)
                  setSelectedId(null)
                }}
                className={`p-1.5 border-t border-l border-b border-r font-bold text-xs flex items-center gap-1 cursor-pointer ${
                  activeTool === "rect"
                    ? "bg-[#000080] text-white border-black"
                    : "bg-[#C0C0C0] border-white border-r-black border-b-black"
                }`}
                title="Kotak Sorot Bug"
              >
                <Square className="w-4 h-4" />
                <span className="hidden md:inline">Kotak</span>
              </button>

              {/* Spotlight Dimmer */}
              <button
                onClick={() => {
                  setActiveTool("spotlight")
                  setIsCropActive(false)
                  setSelectedId(null)
                }}
                className={`p-1.5 border-t border-l border-b border-r font-bold text-xs flex items-center gap-1 cursor-pointer ${
                  activeTool === "spotlight"
                    ? "bg-[#000080] text-white border-black"
                    : "bg-[#C0C0C0] border-white border-r-black border-b-black"
                }`}
                title="Sorot Fokus (Layar Luar Redup)"
              >
                <SunMedium className="w-4 h-4 text-amber-500" />
                <span>Spotlight</span>
              </button>

              {/* Highlighter (Stabilo) */}
              <button
                onClick={() => {
                  setActiveTool("highlight")
                  setIsCropActive(false)
                  setSelectedId(null)
                }}
                className={`p-1.5 border-t border-l border-b border-r font-bold text-xs flex items-center gap-1 cursor-pointer ${
                  activeTool === "highlight"
                    ? "bg-[#000080] text-white border-black"
                    : "bg-[#C0C0C0] border-white border-r-black border-b-black"
                }`}
                title="Stabilo Transparan Teks Error"
              >
                <Highlighter className="w-4 h-4 text-emerald-600" />
                <span className="hidden md:inline">Stabilo</span>
              </button>

              {/* Step Badge */}
              <button
                onClick={() => {
                  setActiveTool("step")
                  setIsCropActive(false)
                  setSelectedId(null)
                }}
                className={`p-1.5 border-t border-l border-b border-r font-bold text-xs flex items-center gap-1 cursor-pointer ${
                  activeTool === "step"
                    ? "bg-[#000080] text-white border-black"
                    : "bg-[#C0C0C0] border-white border-r-black border-b-black"
                }`}
                title="Nomor Langkah Reproduksi (1, 2, 3...)"
              >
                <Hash className="w-4 h-4" />
                <span>#{stepCounter}</span>
              </button>

              {/* Callout Bubble */}
              <button
                onClick={() => {
                  setActiveTool("callout")
                  setIsCropActive(false)
                  setSelectedId(null)
                }}
                className={`p-1.5 border-t border-l border-b border-r font-bold text-xs flex items-center gap-1 cursor-pointer ${
                  activeTool === "callout"
                    ? "bg-[#000080] text-white border-black"
                    : "bg-[#C0C0C0] border-white border-r-black border-b-black"
                }`}
                title="Callout Bubble dengan Ekor Penunjuk"
              >
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span className="hidden md:inline">Callout</span>
              </button>

              {/* Freehand Pen */}
              <button
                onClick={() => {
                  setActiveTool("pen")
                  setIsCropActive(false)
                  setSelectedId(null)
                }}
                className={`p-1.5 border-t border-l border-b border-r font-bold text-xs flex items-center gap-1 cursor-pointer ${
                  activeTool === "pen"
                    ? "bg-[#000080] text-white border-black"
                    : "bg-[#C0C0C0] border-white border-r-black border-b-black"
                }`}
                title="Coret Bebas (Pen)"
              >
                <PenTool className="w-4 h-4" />
              </button>

              {/* Text Tool */}
              <button
                onClick={() => {
                  setActiveTool("text")
                  setIsCropActive(false)
                  setSelectedId(null)
                }}
                className={`p-1.5 border-t border-l border-b border-r font-bold text-xs flex items-center gap-1 cursor-pointer ${
                  activeTool === "text"
                    ? "bg-[#000080] text-white border-black"
                    : "bg-[#C0C0C0] border-white border-r-black border-b-black"
                }`}
                title="Teks Anotasi (Klik kanvas untuk menulis & resize)"
              >
                <Type className="w-4 h-4" />
                <span className="hidden md:inline">Teks</span>
              </button>

              <div className="w-px h-5 bg-[#808080] mx-0.5" />

              {/* Redaction Tools */}
              <button
                onClick={() => {
                  setActiveTool("blackout")
                  setIsCropActive(false)
                  setSelectedId(null)
                }}
                className={`p-1.5 border-t border-l border-b border-r font-bold text-xs flex items-center gap-1 cursor-pointer ${
                  activeTool === "blackout"
                    ? "bg-[#000080] text-white border-black"
                    : "bg-[#C0C0C0] border-white border-r-black border-b-black"
                }`}
                title="Sensor Kotak Hitam (Tutup Password / Token / NIK)"
              >
                <EyeOff className="w-4 h-4 text-red-600" />
                <span className="hidden lg:inline">Sensor</span>
              </button>

              <button
                onClick={() => {
                  setActiveTool("pixelate")
                  setIsCropActive(false)
                  setSelectedId(null)
                }}
                className={`p-1.5 border-t border-l border-b border-r font-bold text-xs flex items-center gap-1 cursor-pointer ${
                  activeTool === "pixelate"
                    ? "bg-[#000080] text-white border-black"
                    : "bg-[#C0C0C0] border-white border-r-black border-b-black"
                }`}
                title="Sensor Pixelate / Blur"
              >
                <Grid3X3 className="w-4 h-4 text-blue-600" />
                <span className="hidden lg:inline">Pixelate</span>
              </button>

              {/* Stamps */}
              <select
                value={activeStamp}
                onChange={(e) => {
                  setActiveStamp(e.target.value)
                  setActiveTool("stamp")
                  setIsCropActive(false)
                  setSelectedId(null)
                }}
                className="bg-white border border-[#808080] px-1 py-0.5 text-xs font-mono font-bold"
                title="Pilih Stempel Status"
              >
                {STAMP_PRESETS.map((st) => (
                  <option key={st.label} value={st.label}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Right: Colors, Undo, Copy, Download */}
            <div className="flex items-center gap-1.5">
              {/* Palette */}
              <div className="flex items-center gap-1 p-0.5 bg-white border border-[#808080]">
                {PALETTE.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => handleColorChange(p.color)}
                    className={`w-4 h-4 border border-black cursor-pointer ${
                      activeColor === p.color ? "ring-2 ring-blue-500" : ""
                    }`}
                    style={{ backgroundColor: p.color }}
                    title={p.name}
                  />
                ))}
              </div>

              {/* Undo */}
              <button
                onClick={() => {
                  if (annotations.length > 0) {
                    setAnnotations((prev) => prev.slice(0, -1))
                  }
                }}
                disabled={annotations.length === 0}
                className="px-2 py-1 bg-[#C0C0C0] border-t border-l border-white border-b border-r border-black active:translate-y-px disabled:opacity-40 cursor-pointer flex items-center gap-1 text-xs"
                title="Undo (Ctrl+Z)"
              >
                <Undo className="w-3.5 h-3.5" />
              </button>

              {/* Copy */}
              <button
                onClick={handleCopySingle}
                disabled={!baseImage}
                className="px-2.5 py-1 bg-[#000080] text-white border-t border-l border-[#8080FF] border-b border-r border-black active:translate-y-px disabled:opacity-40 font-bold flex items-center gap-1 text-xs cursor-pointer shadow-xs"
                title="Salin Screenshot ke Clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Tersalin!" : "Copy PNG"}</span>
              </button>

              {/* Download */}
              <button
                onClick={handleDownloadSingle}
                disabled={!baseImage}
                className="px-2 py-1 bg-[#C0C0C0] border-t border-l border-white border-b border-r border-black active:translate-y-px disabled:opacity-40 flex items-center gap-1 text-xs cursor-pointer"
                title="Download PNG"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {/* Reset */}
              {baseImage && (
                <button
                  onClick={() => setIsResetOpen(true)}
                  className="px-1.5 py-1 bg-[#C0C0C0] border-t border-l border-white border-b border-r border-black text-red-700 active:translate-y-px text-xs cursor-pointer"
                  title="Hapus / Mulai Ulang"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Sub Toolbar: Crop Confirmation / Selected Object Properties / Text Options / Watermark */}
          {(() => {
            const selectedItem = selectedId ? annotations.find((a) => a.id === selectedId) : null

            return (
              <div className="bg-[#EBE9E4] border-b border-[#808080] px-3 py-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#333]">
                {isCropActive ? (
                  // Crop Active Action Bar
                  <div className="flex items-center gap-2 font-bold text-amber-900 animate-pulse">
                    <span>✂️ Pilih area potongan dengan mouse:</span>
                    <button
                      onClick={applyCrop}
                      className="px-2.5 py-0.5 bg-[#000080] text-white border border-black cursor-pointer shadow-xs"
                    >
                      ✓ Terapkan Crop
                    </button>
                    <button
                      onClick={cancelCrop}
                      className="px-2 py-0.5 bg-[#C0C0C0] border border-black cursor-pointer text-black"
                    >
                      ✕ Batal
                    </button>
                  </div>
                ) : selectedItem ? (
                  // Properties Bar for Selected Annotation
                  <div className="flex flex-wrap items-center gap-2 py-0.5 w-full">
                    <div className="flex items-center gap-1 font-bold text-[#000080] bg-[#D4D0C8] px-1.5 py-0.5 border border-[#808080]">
                      <span>Objek:</span>
                      <span className="uppercase">{selectedItem.type}</span>
                    </div>

                    {/* Text input if item supports text */}
                    {["text", "callout", "stamp", "step"].includes(selectedItem.type) && (
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">Teks:</span>
                        <input
                          type="text"
                          value={selectedItem.text || ""}
                          onChange={(e) => handleTextChange(e.target.value)}
                          className="w-40 px-1 py-0.5 bg-white border border-[#808080] text-xs font-sans"
                          placeholder="Isi teks..."
                        />
                      </div>
                    )}

                    {/* Font size controls for text/callout/stamp/step */}
                    {["text", "callout", "stamp", "step"].includes(selectedItem.type) && (
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">Ukuran:</span>
                        <button
                          onClick={() => handleFontSizeChange((selectedItem.fontSize || 16) - 2)}
                          className="px-1.5 py-0.5 bg-[#C0C0C0] border border-[#808080] font-bold active:translate-y-px cursor-pointer"
                          title="Perkecil Font (-2px)"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold w-9 text-center bg-white border border-[#808080] py-0.5 text-xs">
                          {selectedItem.fontSize || 16}px
                        </span>
                        <button
                          onClick={() => handleFontSizeChange((selectedItem.fontSize || 16) + 2)}
                          className="px-1.5 py-0.5 bg-[#C0C0C0] border border-[#808080] font-bold active:translate-y-px cursor-pointer"
                          title="Perbesar Font (+2px)"
                        >
                          +
                        </button>
                        <div className="hidden sm:flex items-center gap-0.5 ml-0.5">
                          {[12, 16, 20, 28, 36].map((sz) => (
                            <button
                              key={sz}
                              onClick={() => handleFontSizeChange(sz)}
                              className={`px-1 py-0.5 text-[10px] font-mono border cursor-pointer ${
                                (selectedItem.fontSize || 16) === sz
                                  ? "bg-[#000080] text-white border-black font-bold"
                                  : "bg-white border-[#808080] text-black"
                              }`}
                            >
                              {sz}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Line width controls for shapes/lines */}
                    {["arrow", "rect", "spotlight", "pen", "highlight", "blackout", "pixelate"].includes(
                      selectedItem.type
                    ) && (
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">Tebal:</span>
                        <button
                          onClick={() => handleWidthChange(selectedItem.width - 1)}
                          className="px-1.5 py-0.5 bg-[#C0C0C0] border border-[#808080] font-bold active:translate-y-px cursor-pointer"
                          title="Perkecil Garis"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold w-7 text-center bg-white border border-[#808080] py-0.5 text-xs">
                          {selectedItem.width}px
                        </span>
                        <button
                          onClick={() => handleWidthChange(selectedItem.width + 1)}
                          className="px-1.5 py-0.5 bg-[#C0C0C0] border border-[#808080] font-bold active:translate-y-px cursor-pointer"
                          title="Pertebal Garis"
                        >
                          +
                        </button>
                        <div className="hidden sm:flex items-center gap-0.5 ml-0.5">
                          {[1, 2, 3, 5, 8].map((w) => (
                            <button
                              key={w}
                              onClick={() => handleWidthChange(w)}
                              className={`px-1 py-0.5 text-[10px] font-mono border cursor-pointer ${
                                selectedItem.width === w
                                  ? "bg-[#000080] text-white border-black font-bold"
                                  : "bg-white border-[#808080] text-black"
                              }`}
                            >
                              {w}px
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={() => {
                        setAnnotations((prev) => prev.filter((it) => it.id !== selectedId))
                        setSelectedId(null)
                        setStatusMessage("Objek dihapus.")
                        playRetroNotificationSound()
                      }}
                      className="px-2 py-0.5 bg-red-100 hover:bg-red-200 text-red-800 border border-red-400 text-xs font-bold flex items-center gap-1 ml-auto cursor-pointer"
                      title="Hapus Objek Terpilih (Delete)"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus</span>
                    </button>

                    {/* Deselect button */}
                    <button
                      onClick={() => setSelectedId(null)}
                      className="px-2 py-0.5 bg-[#C0C0C0] hover:bg-[#D0D0D0] text-black border border-[#808080] text-xs font-medium cursor-pointer"
                    >
                      ✕ Batal Pilih
                    </button>
                  </div>
                ) : (
                  // Default Sub-options when no object is selected
                  <>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeWatermark}
                          onChange={(e) => setIncludeWatermark(e.target.checked)}
                        />
                        <span className="font-medium">Watermark QA (Env & Resolusi)</span>
                      </label>

                      {includeWatermark && (
                        <div className="flex items-center gap-1">
                          <span>Env:</span>
                          <input
                            type="text"
                            value={envName}
                            onChange={(e) => setEnvName(e.target.value)}
                            className="w-20 px-1 py-0.5 bg-white border border-[#808080] text-[11px]"
                            placeholder="Staging"
                          />
                        </div>
                      )}

                      {/* Font size picker for active tool */}
                      {["text", "callout", "stamp", "step"].includes(activeTool) && (
                        <div className="flex items-center gap-1">
                          <span className="font-semibold">Ukuran Font:</span>
                          <button
                            onClick={() => handleFontSizeChange(fontSize - 2)}
                            className="px-1.5 py-0.5 bg-[#C0C0C0] border border-[#808080] font-bold active:translate-y-px cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-mono font-bold w-9 text-center bg-white border border-[#808080] py-0.5 text-xs">
                            {fontSize}px
                          </span>
                          <button
                            onClick={() => handleFontSizeChange(fontSize + 2)}
                            className="px-1.5 py-0.5 bg-[#C0C0C0] border border-[#808080] font-bold active:translate-y-px cursor-pointer"
                          >
                            +
                          </button>
                          <div className="hidden sm:flex items-center gap-0.5 ml-0.5">
                            {[12, 16, 20, 28, 36].map((sz) => (
                              <button
                                key={sz}
                                onClick={() => handleFontSizeChange(sz)}
                                className={`px-1 py-0.5 text-[10px] font-mono border cursor-pointer ${
                                  fontSize === sz
                                    ? "bg-[#000080] text-white border-black font-bold"
                                    : "bg-white border-[#808080] text-black"
                                }`}
                              >
                                {sz}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Line thickness picker for active tool */}
                      {["arrow", "rect", "spotlight", "pen", "highlight", "blackout", "pixelate"].includes(
                        activeTool
                      ) && (
                        <div className="flex items-center gap-1">
                          <span className="font-semibold">Tebal Garis:</span>
                          <button
                            onClick={() => handleWidthChange(lineWidth - 1)}
                            className="px-1.5 py-0.5 bg-[#C0C0C0] border border-[#808080] font-bold active:translate-y-px cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-mono font-bold w-7 text-center bg-white border border-[#808080] py-0.5 text-xs">
                            {lineWidth}px
                          </span>
                          <button
                            onClick={() => handleWidthChange(lineWidth + 1)}
                            className="px-1.5 py-0.5 bg-[#C0C0C0] border border-[#808080] font-bold active:translate-y-px cursor-pointer"
                          >
                            +
                          </button>
                          <div className="hidden sm:flex items-center gap-0.5 ml-0.5">
                            {[1, 2, 3, 5, 8].map((w) => (
                              <button
                                key={w}
                                onClick={() => handleWidthChange(w)}
                                className={`px-1 py-0.5 text-[10px] font-mono border cursor-pointer ${
                                  lineWidth === w
                                    ? "bg-[#000080] text-white border-black font-bold"
                                    : "bg-white border-[#808080] text-black"
                                }`}
                              >
                                {w}px
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Text input editor */}
                    {(activeTool === "text" || activeTool === "callout" || activeTool === "step") && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold">Keterangan:</span>
                        <input
                          type="text"
                          value={customText}
                          onChange={(e) => handleTextChange(e.target.value)}
                          className="w-52 px-1.5 py-0.5 bg-white border border-[#808080] text-[11px]"
                          placeholder="Ketik catatan bug..."
                        />
                      </div>
                    )}

                    {/* Zoom Controls */}
                    {baseImage && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.2).toFixed(1))))}
                          className="px-1.5 py-0.5 bg-[#C0C0C0] border border-[#808080] font-bold cursor-pointer"
                          title="Zoom Out"
                        >
                          <ZoomOut className="w-3 h-3" />
                        </button>
                        <span className="font-mono w-12 text-center font-bold">{Math.round(zoom * 100)}%</span>
                        <button
                          onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.2).toFixed(1))))}
                          className="px-1.5 py-0.5 bg-[#C0C0C0] border border-[#808080] font-bold cursor-pointer"
                          title="Zoom In"
                        >
                          <ZoomIn className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setZoom(1.0)}
                          className="px-1 py-0.5 bg-[#C0C0C0] border border-[#808080] text-[10px] cursor-pointer"
                        >
                          100%
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })()}

          {/* Canvas Viewport */}
          <div className="flex-1 min-h-0 bg-[#606060] p-3 overflow-auto flex items-center justify-center relative">
            {!baseImage ? (
              // Empty State
              <div
                onClick={() => fileInputRef.current?.click()}
                className="max-w-md w-full bg-white border-2 border-dashed border-[#808080] p-8 text-center cursor-pointer hover:bg-slate-50 transition-colors shadow-lg"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) loadImage(e.target.files[0])
                  }}
                />
                <div className="w-14 h-14 bg-[#000080] text-white flex items-center justify-center border-2 border-white shadow-[2px_2px_0px_rgba(0,0,0,0.5)] mx-auto mb-3">
                  <Camera className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-sm text-[#000080] mb-1">
                  Ambil Screenshot & Tempel di Sini!
                </h3>
                <p className="text-[#555] text-xs mb-3">
                  Gunakan <kbd className="px-1.5 py-0.5 border border-[#808080] bg-[#C0C0C0] font-mono font-bold text-black">Ctrl + V</kbd> untuk menempelkan screenshot langsung dari clipboard, atau klik untuk memilih file.
                </p>
                <div className="inline-block px-3 py-1 bg-[#FFFFCC] border border-[#CCCC99] text-[11px] text-[#555]">
                  💡 <strong>Fitur QA Pro:</strong> Crop, Spotlight Focus, Stabilo Highlighter, Callout Bubble & Step Counter 1-klik!
                </div>
              </div>
            ) : (
              // Canvas with Zoom scaling
              <div
                className="relative inline-block border-2 border-black bg-white shadow-2xl transition-transform origin-center"
                style={{ transform: `scale(${zoom})` }}
              >
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  style={{ cursor: cursorStyle }}
                  className="block max-w-[85vw] max-h-[70vh] object-contain"
                />
              </div>
            )}
          </div>
        </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: BEFORE VS AFTER (EXPECTED VS ACTUAL)
      ───────────────────────────────────────────────────────────── */}
      <div className={activeTab === "compare" ? "flex-1 flex flex-col min-h-0" : "hidden"}>
          {/* Compare Toolbar */}
          <div className="bg-[#D4D0C8] border-b border-[#808080] p-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
            {/* Mode Switcher */}
            <div className="flex items-center gap-2">
              <div className="flex items-center border border-[#808080] bg-white p-0.5">
                <button
                  onClick={() => setCompareMode("side-by-side")}
                  className={`px-2 py-0.5 flex items-center gap-1 font-bold text-xs cursor-pointer ${
                    compareMode === "side-by-side" ? "bg-[#000080] text-white" : "bg-transparent text-black"
                  }`}
                >
                  <Columns2 className="w-3.5 h-3.5" />
                  <span>Berdampingan</span>
                </button>
                <button
                  onClick={() => setCompareMode("slider")}
                  className={`px-2 py-0.5 flex items-center gap-1 font-bold text-xs cursor-pointer ${
                    compareMode === "slider" ? "bg-[#000080] text-white" : "bg-transparent text-black"
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Overlay Slider Diff</span>
                </button>
              </div>

              {/* Labels */}
              <div className="flex items-center gap-1">
                <span className="font-bold text-emerald-800">Label A:</span>
                <input
                  type="text"
                  value={labelA}
                  onChange={(e) => setLabelA(e.target.value)}
                  className="w-32 px-1.5 py-0.5 bg-white border border-[#808080] font-bold text-emerald-800 text-[11px]"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold text-red-800">Label B:</span>
                <input
                  type="text"
                  value={labelB}
                  onChange={(e) => setLabelB(e.target.value)}
                  className="w-32 px-1.5 py-0.5 bg-white border border-[#808080] font-bold text-red-800 text-[11px]"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopyCompare}
                disabled={!compareImgA || !compareImgB}
                className="px-2.5 py-1 bg-[#000080] text-white border-t border-l border-[#8080FF] border-b border-r border-black active:translate-y-px disabled:opacity-40 font-bold flex items-center gap-1 text-xs cursor-pointer shadow-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Tersalin!" : "Copy Gabungan PNG"}</span>
              </button>

              <button
                onClick={handleDownloadCompare}
                disabled={!compareImgA || !compareImgB}
                className="px-2 py-1 bg-[#C0C0C0] border-t border-l border-white border-b border-r border-black active:translate-y-px disabled:opacity-40 flex items-center gap-1 text-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {(compareImgA || compareImgB) && (
                <button
                  onClick={() => {
                    setCompareImgA(null)
                    setCompareImgB(null)
                  }}
                  className="px-2 py-1 bg-[#C0C0C0] border-t border-l border-white border-b border-r border-black active:translate-y-px text-red-700 text-xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Compare Content Area */}
          <div className="flex-1 min-h-0 bg-[#606060] p-3 overflow-auto flex flex-col items-center justify-center gap-4">
            {!compareImgA || !compareImgB ? (
              // Empty Slot upload
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                {/* Slot A */}
                <div
                  onClick={() => fileInputARef.current?.click()}
                  className={`border-2 border-dashed p-6 text-center cursor-pointer transition-colors bg-white ${
                    compareImgA ? "border-emerald-600 bg-emerald-50/40" : "border-[#808080] hover:bg-slate-50"
                  }`}
                >
                  <input
                    ref={fileInputARef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        const img = new Image()
                        img.src = URL.createObjectURL(e.target.files[0])
                        img.onload = () => setCompareImgA(img)
                      }
                    }}
                  />
                  <div className="font-bold text-sm text-emerald-700 mb-1">{labelA}</div>
                  <p className="text-xs text-[#666]">
                    {compareImgA ? "✓ Gambar A Terpasang" : "Klik pilih / Paste Ctrl+V"}
                  </p>
                </div>

                {/* Slot B */}
                <div
                  onClick={() => fileInputBRef.current?.click()}
                  className={`border-2 border-dashed p-6 text-center cursor-pointer transition-colors bg-white ${
                    compareImgB ? "border-red-600 bg-red-50/40" : "border-[#808080] hover:bg-slate-50"
                  }`}
                >
                  <input
                    ref={fileInputBRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        const img = new Image()
                        img.src = URL.createObjectURL(e.target.files[0])
                        img.onload = () => setCompareImgB(img)
                      }
                    }}
                  />
                  <div className="font-bold text-sm text-red-700 mb-1">{labelB}</div>
                  <p className="text-xs text-[#666]">
                    {compareImgB ? "✓ Gambar B Terpasang" : "Klik pilih / Paste Ctrl+V"}
                  </p>
                </div>
              </div>
            ) : (
              // Active Canvas Result
              <div className="flex flex-col items-center gap-2">
                <div className="border-2 border-black bg-[#1E293B] shadow-2xl p-1">
                  <canvas
                    ref={compareCanvasRef}
                    className="block max-w-[85vw] max-h-[65vh] object-contain"
                  />
                </div>

                {/* Slider Control when in Slider mode */}
                {compareMode === "slider" && (
                  <div className="w-full max-w-md bg-[#D4D0C8] p-2 border-t-2 border-l-2 border-white border-b-2 border-r-2 border-[#808080] flex items-center gap-3">
                    <span className="font-bold text-emerald-800 text-[11px] shrink-0">{labelA}</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={compareSplitPos}
                      onChange={(e) => setCompareSplitPos(Number(e.target.value))}
                      className="flex-1 cursor-ew-resize accent-[#000080]"
                    />
                    <span className="font-bold text-red-800 text-[11px] shrink-0">{labelB}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      {/* ── Status Bar ── */}
      <div className="bg-[#C0C0C0] border-t-2 border-white px-2 py-0.5 flex items-center justify-between text-[11px] text-[#333] shrink-0">
        <div className="flex items-center gap-2 truncate">
          <span className="font-mono">Status: {statusMessage}</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 font-mono">
          <span>Tool: {activeTool.toUpperCase()}</span>
          <span>RAM / GPU Local Only</span>
        </div>
      </div>

      {/* Confirm Reset Dialog */}
      <ConfirmDialog
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        onConfirm={doResetSingle}
        title="RESET_STUDIO.EXE"
        message="Apakah Anda yakin ingin menghapus kanvas saat ini? Coretan dan screenshot yang belum disimpan akan hilang."
        confirmText="Reset Kanvas"
        cancelText="Batal"
        variant="destructive"
      />
    </div>
  )
}
