"use client"

import * as React from "react"
import {
  Upload,
  Download,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  Image as ImageIcon,
  ShieldCheck,
  AlertCircle,
} from "lucide-react"
import { RetroActionButton } from "@/components/ui/retro-action-button"
import { playRetroNotificationSound } from "@/lib/sound-effects"

// Helper downscale gambar jika terlalu besar agar inference AI cepat & hemat RAM
async function resizeImageIfNeeded(file: Blob, maxDimension = 1600): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width <= maxDimension && height <= maxDimension) {
        resolve(file)
        return
      }

      if (width > height) {
        height = Math.round((height * maxDimension) / width)
        width = maxDimension
      } else {
        width = Math.round((width * maxDimension) / height)
        height = maxDimension
      }

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        resolve(file)
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          resolve(blob || file)
        },
        "image/png",
        0.95
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    img.src = url
  })
}

export interface BgRemoveToolProps {
  onDirtyChange?: (isDirty: boolean) => void
}

export function BgRemoveTool({ onDirtyChange }: BgRemoveToolProps) {
  const [originalUrl, setOriginalUrl] = React.useState<string | null>(null)
  const [originalBlob, setOriginalBlob] = React.useState<Blob | null>(null)
  const [resultUrl, setResultUrl] = React.useState<string | null>(null)
  const [resultBlob, setResultBlob] = React.useState<Blob | null>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [progressText, setProgressText] = React.useState<string>("")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const [viewMode, setViewMode] = React.useState<"result" | "original" | "split">("result")
  const [splitPos, setSplitPos] = React.useState(50) // percentage for split slider

  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Lapor status dirty ke SwissToolsApp agar ada peringatan saat user mau tutup / pindah tool
  React.useEffect(() => {
    onDirtyChange?.(originalBlob !== null || isProcessing)
  }, [originalBlob, isProcessing, onDirtyChange])

  // Cegah refresh / tutup tab browser saat AI sedang bekerja
  React.useEffect(() => {
    if (!isProcessing) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isProcessing])

  // Handle image load
  const loadFile = React.useCallback(async (blob: Blob) => {
    if (isProcessing) return
    if (!blob.type.startsWith("image/")) {
      setErrorMessage("File harus berupa gambar (PNG, JPG, WebP)!")
      return
    }

    setErrorMessage(null)
    setResultUrl(null)
    setResultBlob(null)

    // Resize jika oversized
    const resizedBlob = await resizeImageIfNeeded(blob, 1600)
    setOriginalBlob(resizedBlob)
    const url = URL.createObjectURL(resizedBlob)
    setOriginalUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
  }, [])

  // Paste dari Clipboard (Ctrl + V)
  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile()
          if (blob) {
            loadFile(blob)
            e.preventDefault()
            break
          }
        }
      }
    }

    window.addEventListener("paste", handlePaste)
    return () => window.removeEventListener("paste", handlePaste)
  }, [loadFile])

  // Drag & Drop handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      loadFile(e.dataTransfer.files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // Proses Hapus Background AI (Dynamic Import)
  const handleRemoveBackground = async () => {
    if (!originalBlob) return

    setIsProcessing(true)
    setErrorMessage(null)
    setProgressText("Memuat model AI lokal...")

    try {
      // Dynamic import agar tidak membebani initial bundle
      const { removeBackground } = await import("@imgly/background-removal")

      setProgressText("Menghapus background (komputasi di browser)...")

      const outputBlob = await removeBackground(originalBlob, {
        progress: (key: string, current: number, total: number) => {
          if (total > 0) {
            const pct = Math.round((current / total) * 100)
            setProgressText(`Memproses (${pct}%)...`)
          }
        },
      })

      const outputUrl = URL.createObjectURL(outputBlob)
      setResultBlob(outputBlob)
      setResultUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return outputUrl
      })
      setViewMode("result")
      playRetroNotificationSound()
    } catch (err: any) {
      console.error("Gagal menghapus background:", err)
      setErrorMessage(
        err?.message ||
          "Gagal memproses gambar. Pastikan browser mendukung WebAssembly / WebGPU."
      )
    } finally {
      setIsProcessing(false)
      setProgressText("")
    }
  }

  // 1-Click Copy to Clipboard
  const handleCopy = async () => {
    if (!resultBlob) return
    try {
      const item = new ClipboardItem({ "image/png": resultBlob })
      await navigator.clipboard.write([item])
      setCopied(true)
      playRetroNotificationSound()
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Gagal copy ke clipboard:", err)
      setErrorMessage("Browser menolak akses clipboard. Gunakan tombol Download.")
    }
  }

  // Download PNG
  const handleDownload = () => {
    if (!resultUrl) return
    const a = document.createElement("a")
    a.href = resultUrl
    a.download = `no-bg-${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Reset
  const handleReset = () => {
    if (originalUrl) URL.revokeObjectURL(originalUrl)
    if (resultUrl) URL.revokeObjectURL(resultUrl)
    setOriginalUrl(null)
    setOriginalBlob(null)
    setResultUrl(null)
    setResultBlob(null)
    setErrorMessage(null)
    setViewMode("result")
  }

  return (
    <div
      ref={containerRef}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="flex flex-col h-full bg-[#C0C0C0] text-black text-xs select-none"
    >
      {/* Top Warning / Privacy Banner */}
      <div className="bg-[#FFFFCC] border-b border-[#808080] px-3 py-1.5 flex items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 font-medium text-emerald-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>100% Aman & Lokal:</strong> Model AI jalan di browser lu via WebAssembly. Gambar gak dikirim ke server mana pun!
          </span>
        </div>
        <span className="hidden sm:inline-block text-[#555] font-mono">
          Shortcut: Tekan <kbd className="px-1 border bg-white shadow-xs">Ctrl+V</kbd> langsung di sini
        </span>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="bg-[#FFCCCC] border-b border-red-500 px-3 py-1.5 flex items-center gap-2 text-red-800 text-[11px]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3">
        {!originalUrl ? (
          // Upload / Dropzone Empty State
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 min-h-[260px] border-2 border-dashed border-[#808080] bg-white flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-slate-50 transition-colors shadow-inner"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) loadFile(e.target.files[0])
              }}
            />
            <div className="w-14 h-14 bg-[#000080] text-white flex items-center justify-center border-2 border-white shadow-[2px_2px_0px_rgba(0,0,0,0.5)] mb-3">
              <Upload className="w-7 h-7" />
            </div>
            <p className="font-bold text-sm mb-1 text-[#000080]">
              Klik untuk Pilih Gambar atau Drag & Drop ke Sini
            </p>
            <p className="text-[#555] text-xs max-w-sm mb-3">
              Atau cukup tekan <kbd className="px-1.5 py-0.5 border border-[#808080] bg-[#C0C0C0] font-mono font-bold text-black">Ctrl + V</kbd> untuk menempelkan screenshot langsung dari clipboard.
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#E0E0E0] border border-[#808080] text-[11px] text-[#333]">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Format didukung: PNG, JPG, JPEG, WebP</span>
            </div>
          </div>
        ) : (
          // Active Editor / Preview Mode
          <div className="flex-1 flex flex-col gap-2 min-h-0">
            {/* Toolbar Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-[#D4D0C8] border-t-2 border-l-2 border-white border-b-2 border-r-2 border-[#808080]">
              <div className="flex items-center gap-1">
                {!resultUrl ? (
                  <button
                    onClick={handleRemoveBackground}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-3 py-1 font-bold bg-[#000080] text-white border-t-2 border-l-2 border-[#8080FF] border-b-2 border-r-2 border-black active:border-t-2 active:border-l-2 active:border-black active:border-b-2 active:border-r-2 active:border-white disabled:opacity-50 cursor-pointer text-xs shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                    <span>{isProcessing ? "Sedang Memproses..." : "Hapus Background (AI)"}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewMode("result")}
                      className={`px-2 py-0.5 border-t border-l border-white border-b border-r border-[#808080] font-bold ${
                        viewMode === "result" ? "bg-[#000080] text-white" : "bg-[#C0C0C0] text-black"
                      }`}
                    >
                      Hasil Transparan
                    </button>
                    <button
                      onClick={() => setViewMode("original")}
                      className={`px-2 py-0.5 border-t border-l border-white border-b border-r border-[#808080] font-bold ${
                        viewMode === "original" ? "bg-[#000080] text-white" : "bg-[#C0C0C0] text-black"
                      }`}
                    >
                      Gambar Asli
                    </button>
                    <button
                      onClick={() => setViewMode("split")}
                      className={`px-2 py-0.5 border-t border-l border-white border-b border-r border-[#808080] font-bold ${
                        viewMode === "split" ? "bg-[#000080] text-white" : "bg-[#C0C0C0] text-black"
                      }`}
                    >
                      Bandingkan
                    </button>
                  </div>
                )}
              </div>

              {/* Right Action buttons */}
              <div className="flex items-center gap-1.5">
                {resultBlob && (
                  <>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 px-2 py-1 bg-[#C0C0C0] border-t-2 border-l-2 border-white border-b-2 border-r-2 border-black active:translate-y-px font-bold text-xs cursor-pointer"
                      title="Salin PNG ke Clipboard"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? "Tersalin!" : "Copy PNG"}</span>
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-1 px-2 py-1 bg-[#C0C0C0] border-t-2 border-l-2 border-white border-b-2 border-r-2 border-black active:translate-y-px font-bold text-xs cursor-pointer"
                      title="Download File PNG"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </>
                )}
                <button
                  onClick={handleReset}
                  disabled={isProcessing}
                  className="flex items-center gap-1 px-2 py-1 bg-[#C0C0C0] border-t-2 border-l-2 border-white border-b-2 border-r-2 border-black active:translate-y-px text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-y-0"
                  title={isProcessing ? "Tidak dapat mengganti gambar selama proses AI berlangsung" : "Ganti gambar lain"}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ganti</span>
                </button>
              </div>
            </div>

            {/* Canvas / Image Display with Checkerboard */}
            <div className="relative flex-1 min-h-[340px] border-2 border-[#808080] bg-[#808080] flex items-center justify-center overflow-hidden p-2">
              {/* Checkerboard Pattern */}
              <div
                className="absolute inset-0 z-0"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg, #e5e5e5 25%, transparent 25%), linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e5e5 75%), linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)",
                  backgroundSize: "20px 20px",
                  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                  backgroundColor: "#ffffff",
                }}
              />

              {/* Processing Overlay */}
              {isProcessing && (
                <div className="absolute inset-0 z-30 bg-black/40 backdrop-blur-xs flex flex-col items-center justify-center p-4">
                  <div className="bg-[#C0C0C0] border-t-2 border-l-2 border-white border-b-2 border-r-2 border-black p-4 w-72 shadow-2xl">
                    <div className="bg-[#000080] text-white px-2 py-0.5 font-bold mb-3 flex items-center justify-between text-xs">
                      <span>MEMPROSES_AI.EXE</span>
                      <Sparkles className="w-3 h-3 text-amber-300" />
                    </div>
                    <p className="text-xs mb-2 font-mono font-medium text-black">{progressText || "Memproses..."}</p>
                    {/* Retro Progress Bar */}
                    <div className="w-full h-4 bg-white border border-[#808080] p-0.5 overflow-hidden">
                      <div className="h-full bg-[#000080] animate-pulse w-full" />
                    </div>
                    <p className="text-[10px] text-[#555] mt-2 text-center">
                      Menggunakan WebAssembly lokal (RAM/GPU Anda)
                    </p>
                    <div className="mt-2.5 p-1.5 bg-[#FFFFCC] border border-[#CCCC99] text-[10px] text-amber-950 flex items-center gap-1.5 text-left">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span><strong>Jangan tutup atau pindah window</strong> selama proses AI berlangsung.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Render Image based on viewMode */}
              <div className="relative z-10 max-w-full max-h-full flex items-center justify-center">
                {viewMode === "original" && (
                  <img
                    src={originalUrl}
                    alt="Original"
                    className="max-h-[500px] max-w-full object-contain shadow-md"
                  />
                )}

                {viewMode === "result" && (
                  <img
                    src={resultUrl || originalUrl}
                    alt="Result"
                    className="max-h-[500px] max-w-full object-contain shadow-md"
                  />
                )}

                {viewMode === "split" && resultUrl && (
                  <div className="relative max-h-[500px] max-w-full overflow-hidden select-none">
                    <img
                      src={originalUrl}
                      alt="Original"
                      className="max-h-[500px] max-w-full object-contain block pointer-events-none"
                    />
                    <div
                      className="absolute inset-0 overflow-hidden pointer-events-none"
                      style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}
                    >
                      <img
                        src={resultUrl}
                        alt="Transparent"
                        className="max-h-[500px] max-w-full object-contain block"
                      />
                    </div>
                    {/* Split Line */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_4px_rgba(0,0,0,0.8)] pointer-events-none"
                      style={{ left: `${splitPos}%` }}
                    />
                    {/* Slider Control */}
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={splitPos}
                      onChange={(e) => setSplitPos(Number(e.target.value))}
                      className="absolute inset-x-0 bottom-2 w-3/4 mx-auto z-20 opacity-80 hover:opacity-100 cursor-ew-resize"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-[#C0C0C0] border-t-2 border-white px-2 py-0.5 flex items-center justify-between text-[11px] text-[#333]">
        <div className="flex items-center gap-2">
          <span className="font-mono">Status: {isProcessing ? "Memproses AI..." : resultUrl ? "Background terhapus" : "Siap"}</span>
        </div>
        <div className="flex items-center gap-3 font-mono">
          <span>Engine: WebAssembly/WebGPU</span>
          <span>Zero-Cloud Leak</span>
        </div>
      </div>
    </div>
  )
}
