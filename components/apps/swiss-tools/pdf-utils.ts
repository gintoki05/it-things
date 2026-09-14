"use client"

import JSZip from "jszip"

// Format ukuran file jadi ramah dibaca
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// Download Uint8Array sebagai file PDF
export function downloadPdfBytes(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" })
  downloadBlob(blob, filename.endsWith(".pdf") ? filename : `${filename}.pdf`)
}

// Download Blob generik
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

// Download banyak file sekaligus dikemas sebagai file ZIP
export async function downloadFilesAsZip(
  files: { name: string; blob: Blob }[],
  zipFilename: string
) {
  const zip = new JSZip()
  for (const file of files) {
    zip.file(file.name, file.blob)
  }
  const content = await zip.generateAsync({ type: "blob" })
  downloadBlob(content, zipFilename.endsWith(".zip") ? zipFilename : `${zipFilename}.zip`)
}

// Lazy-load PDF.js agar aman di lingkungan Next.js client-side
let pdfjsLibCache: typeof import("pdfjs-dist") | null = null

export async function getPdfjsLib() {
  if (pdfjsLibCache) return pdfjsLibCache

  const pdfjs = await import("pdfjs-dist")
  if (typeof window !== "undefined") {
    // Gunakan file worker lokal dari public directory
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
  }
  pdfjsLibCache = pdfjs
  return pdfjs
}

// Load dokumen PDF dari File / ArrayBuffer menggunakan PDF.js
export async function loadPdfDocument(source: ArrayBuffer | Uint8Array) {
  const pdfjs = await getPdfjsLib()

  // Clone buffer agar tidak detached saat ditransfer ke Web Worker PDF.js
  let dataCopy: Uint8Array
  if (source instanceof Uint8Array) {
    dataCopy = source.slice()
  } else {
    dataCopy = new Uint8Array(source.slice(0))
  }

  const loadingTask = pdfjs.getDocument({
    data: dataCopy,
    cMapUrl: "https://unpkg.com/pdfjs-dist@legacy/cmaps/",
    cMapPacked: true,
  })
  return await loadingTask.promise
}

// Render satu halaman PDF ke canvas lalu return data URL (untuk thumbnail & export image)
export async function renderPdfPageToDataUrl(
  pdfDoc: Awaited<ReturnType<typeof loadPdfDocument>>,
  pageNumber: number,
  scale: number = 1.0,
  mimeType: "image/jpeg" | "image/png" = "image/jpeg",
  quality: number = 0.85
): Promise<{ dataUrl: string; width: number; height: number; blob: Blob }> {
  const page = await pdfDoc.getPage(pageNumber)
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Gagal menginisialisasi 2D canvas context")

  canvas.width = viewport.width
  canvas.height = viewport.height

  // Background putih agar tidak transparan saat render ke JPEG
  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, canvas.width, canvas.height)

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  }

  // @ts-expect-error PDF.js render types mismatch with DOM canvas context
  await page.render(renderContext).promise

  const dataUrl = canvas.toDataURL(mimeType, quality)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b)
        else reject(new Error("Gagal membuat blob dari canvas"))
      },
      mimeType,
      quality
    )
  })

  return {
    dataUrl,
    width: viewport.width,
    height: viewport.height,
    blob,
  }
}
