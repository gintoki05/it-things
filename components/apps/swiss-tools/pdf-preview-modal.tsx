"use client"

/* eslint-disable @next/next/no-img-element */
import * as React from "react"
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  RefreshCw,
  FileText,
} from "lucide-react"
import { loadPdfDocument, renderPdfPageToDataUrl, downloadBlob } from "./pdf-utils"
import type { PDFDocumentProxy } from "pdfjs-dist"

interface PdfPreviewModalProps {
  isOpen: boolean
  title: string
  source: File | ArrayBuffer | Uint8Array | null
  onClose: () => void
}

export function PdfPreviewModal({
  isOpen,
  title,
  source,
  onClose,
}: PdfPreviewModalProps) {
  const [pdfDoc, setPdfDoc] = React.useState<PDFDocumentProxy | null>(null)
  const [totalPages, setTotalPages] = React.useState(0)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [zoom, setZoom] = React.useState(1.0)
  const [isLoading, setIsLoading] = React.useState(false)
  const [pageImageUrl, setPageImageUrl] = React.useState<string | null>(null)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [pageInput, setPageInput] = React.useState("1")

  // Cache rendered pages by `${pageNum}-${zoom}` for instant page flips
  const renderCacheRef = React.useRef<Map<string, string>>(new Map())

  // Load PDF document whenever source changes
  React.useEffect(() => {
    if (!isOpen || !source) {
      setPdfDoc(null)
      setTotalPages(0)
      setCurrentPage(1)
      setPageImageUrl(null)
      renderCacheRef.current.clear()
      return
    }

    let isMounted = true
    setIsLoading(true)
    setErrorMsg(null)
    renderCacheRef.current.clear()

    const loadDoc = async () => {
      try {
        let buffer: ArrayBuffer
        if (source instanceof File) {
          buffer = await source.arrayBuffer()
        } else if (source instanceof Uint8Array) {
          buffer = source.buffer.slice(
            source.byteOffset,
            source.byteOffset + source.byteLength
          ) as ArrayBuffer
        } else {
          buffer = source
        }

        const doc = await loadPdfDocument(buffer)
        if (!isMounted) return

        setPdfDoc(doc as unknown as PDFDocumentProxy)
        setTotalPages(doc.numPages)
        setCurrentPage(1)
        setPageInput("1")
      } catch (err) {
        if (!isMounted) return
        console.error("Gagal membuka preview dokumen PDF:", err)
        setErrorMsg(err instanceof Error ? err.message : "Gagal memuat dokumen.")
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadDoc()

    return () => {
      isMounted = false
    }
  }, [isOpen, source])

  // Render current page
  React.useEffect(() => {
    if (!isOpen || !pdfDoc || totalPages === 0) return

    let isMounted = true
    const cacheKey = `${currentPage}-${zoom.toFixed(2)}`

    if (renderCacheRef.current.has(cacheKey)) {
      setPageImageUrl(renderCacheRef.current.get(cacheKey) || null)
      return
    }

    setIsLoading(true)
    setErrorMsg(null)

    const render = async () => {
      try {
        // Base scale 1.25 for crisp preview multiplied by zoom
        const scale = 1.25 * zoom
        const result = await renderPdfPageToDataUrl(pdfDoc, currentPage, scale, "image/jpeg", 0.9)
        if (!isMounted) return

        renderCacheRef.current.set(cacheKey, result.dataUrl)
        setPageImageUrl(result.dataUrl)
      } catch (err) {
        if (!isMounted) return
        console.error("Gagal render halaman:", err)
        setErrorMsg("Gagal memuat preview halaman ini.")
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    render()

    return () => {
      isMounted = false
    }
  }, [isOpen, pdfDoc, currentPage, zoom, totalPages])

  if (!isOpen) return null

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const nextP = currentPage - 1
      setCurrentPage(nextP)
      setPageInput(String(nextP))
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      const nextP = currentPage + 1
      setCurrentPage(nextP)
      setPageInput(String(nextP))
    }
  }

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseInt(pageInput, 10)
    if (!isNaN(num) && num >= 1 && num <= totalPages) {
      setCurrentPage(num)
    } else {
      setPageInput(String(currentPage))
    }
  }

  const handleZoomIn = () => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))
  const handleResetZoom = () => setZoom(1.0)

  const handleDownload = () => {
    if (!source) return
    if (source instanceof File) {
      downloadBlob(source, source.name)
    } else if (source instanceof Uint8Array) {
      const blob = new Blob([source as unknown as BlobPart], { type: "application/pdf" })
      downloadBlob(blob, title.endsWith(".pdf") ? title : `${title}.pdf`)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4 select-none backdrop-blur-xs">
      <div className="flex h-[90vh] max-h-[750px] w-full max-w-3xl flex-col border-2 border-t-white border-l-white border-r-[#404040] border-b-[#404040] bg-[#c0c0c0] shadow-2xl">
        {/* Window Title Bar */}
        <div className="flex h-7 shrink-0 items-center justify-between bg-linear-to-r from-[#000080] to-[#1084d0] px-2 text-white">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-[#ffd700]" />
            <span className="truncate text-xs font-bold font-sans tracking-wide">
              PREVIEW_DOKUMEN.EXE — {title}
            </span>
          </div>

          <button
            onClick={onClose}
            className="flex h-4 w-4 items-center justify-center border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] text-black active:border-gray-800 active:border-r-white active:border-b-white hover:bg-red-200"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Toolbar: Navigation & Zoom Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-400 bg-[#d4d0c8] px-2 py-1 text-xs">
          {/* Page Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1 || isLoading}
              title="Halaman Sebelumnya"
              className="flex items-center gap-0.5 border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] px-2 py-0.5 font-bold disabled:opacity-40 active:border-gray-800 active:border-r-white active:border-b-white hover:bg-[#e0e0e0]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            <form onSubmit={handlePageSubmit} className="flex items-center gap-1 font-mono text-xs">
              <span className="text-gray-700">Hal</span>
              <input
                type="text"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={() => setPageInput(String(currentPage))}
                className="w-10 border border-gray-600 border-t-gray-800 border-l-gray-800 bg-white px-1 py-0.5 text-center font-bold text-black outline-none"
              />
              <span className="text-gray-700">/ {totalPages || 1}</span>
            </form>

            <button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages || isLoading}
              title="Halaman Selanjutnya"
              className="flex items-center gap-0.5 border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] px-2 py-0.5 font-bold disabled:opacity-40 active:border-gray-800 active:border-r-white active:border-b-white hover:bg-[#e0e0e0]"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 0.5 || isLoading}
              title="Perkecil (-)"
              className="border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] p-1 disabled:opacity-40 active:border-gray-800 active:border-r-white active:border-b-white hover:bg-[#e0e0e0]"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={handleResetZoom}
              title="Reset Zoom 100%"
              className="border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] px-2 py-0.5 font-mono text-[11px] font-bold active:border-gray-800 active:border-r-white active:border-b-white hover:bg-[#e0e0e0]"
            >
              {Math.round(zoom * 100)}%
            </button>

            <button
              onClick={handleZoomIn}
              disabled={zoom >= 2.5 || isLoading}
              title="Perbesar (+)"
              className="border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] p-1 disabled:opacity-40 active:border-gray-800 active:border-r-white active:border-b-white hover:bg-[#e0e0e0]"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={handleResetZoom}
              title="Kembalikan Tampilan Normal"
              className="border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] p-1 active:border-gray-800 active:border-r-white active:border-b-white hover:bg-[#e0e0e0]"
            >
              <RotateCcw className="h-3.5 w-3.5 text-gray-700" />
            </button>
          </div>

          {/* Quick Download Action */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] px-2.5 py-0.5 font-bold text-blue-900 active:border-gray-800 active:border-r-white active:border-b-white hover:bg-blue-100"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Unduh Berkas</span>
          </button>
        </div>

        {/* Document Viewer Canvas Area */}
        <div className="relative flex flex-1 items-center justify-center overflow-auto border border-gray-600 border-t-gray-800 border-l-gray-800 bg-[#808080] p-4">
          {isLoading && !pageImageUrl && (
            <div className="flex flex-col items-center gap-2 rounded bg-white/90 p-4 shadow-lg">
              <RefreshCw className="h-7 w-7 animate-spin text-blue-800" />
              <span className="text-xs font-bold text-gray-800">Memuat Lembar Dokumen...</span>
            </div>
          )}

          {errorMsg ? (
            <div className="rounded border border-red-700 bg-red-100 p-4 text-center text-xs text-red-900 shadow">
              <p className="font-bold">Error Preview</p>
              <p className="mt-1">{errorMsg}</p>
            </div>
          ) : (
            pageImageUrl && (
              <div className="flex items-center justify-center transition-transform">
                <img
                  src={pageImageUrl}
                  alt={`Preview Halaman ${currentPage}`}
                  className="max-w-none bg-white shadow-2xl border border-gray-400"
                  style={{
                    width: `${Math.round(595 * zoom)}px`,
                  }}
                />
              </div>
            )
          )}
        </div>

        {/* Status Bar Bottom */}
        <div className="flex items-center justify-between border-t border-white bg-[#d4d0c8] px-2 py-1 font-mono text-[10px] text-gray-700">
          <span>
            Halaman {currentPage} dari {totalPages}
          </span>
          <span>Zoom: {Math.round(zoom * 100)}%</span>
          <button
            onClick={onClose}
            className="border border-white border-r-gray-800 border-b-gray-800 bg-[#c0c0c0] px-3 py-0.5 font-bold active:border-gray-800 active:border-r-white active:border-b-white hover:bg-gray-200"
          >
            Tutup [Esc]
          </button>
        </div>
      </div>
    </div>
  )
}
