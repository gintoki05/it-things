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
