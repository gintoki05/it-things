export { cn } from "cn"

export function formatRupiah(amount: number): string {
  return "Rp " + Math.round(amount).toLocaleString("id-ID")
}

export function formatDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("id-ID", options || { day: "numeric", month: "short", year: "numeric" })
}

export function formatTime(date: string | Date = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
}

/**
 * Menghasilkan link web aplikasi lengkap dengan query param / deep link.
 * Otomatis menggunakan hostname saat ini (kecuali localhost/127.0.0.1 fallback ke https://it-things.vercel.app/).
 */
export function getShareUrl(params?: Record<string, string | undefined | null> | string): string {
  const isBrowser = typeof window !== "undefined"
  const isLocalhost =
    isBrowser && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  const baseUrl = !isBrowser || isLocalhost ? "https://it-things.vercel.app" : window.location.origin

  if (!params) return baseUrl

  if (typeof params === "string") {
    const cleanParams = params.startsWith("?") ? params.slice(1) : params
    return cleanParams ? `${baseUrl}/?${cleanParams}` : baseUrl
  }

  const query = new URLSearchParams()
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== "") {
      query.set(key, val)
    }
  }

  const qs = query.toString()
  return qs ? `${baseUrl}/?${qs}` : baseUrl
}
