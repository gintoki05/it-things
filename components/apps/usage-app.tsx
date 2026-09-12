"use client"

import * as React from "react"
import { RotateCw, Database, Wifi, Activity, Server, AlertTriangle, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface UsageMetrics {
  db_size_bytes: number | null
  active_db_connections: number | null
  realtime_connections: number | null
  api_request_count: number | null
  limits: {
    db_size_bytes: number
    realtime_messages_monthly: number
    realtime_connections: number
    storage_bytes: number
    edge_function_invocations: number
    api_requests_daily: number
  }
  has_token: boolean
  fetched_at: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function UsageBar({
  label,
  icon: Icon,
  current,
  limit,
  currentLabel,
  limitLabel,
  isNull,
}: {
  label: string
  icon: React.ElementType
  current: number | null
  limit: number
  currentLabel: string
  limitLabel: string
  isNull?: boolean
}) {
  const pct = current != null ? Math.min((current / limit) * 100, 100) : 0
  const color =
    isNull || current == null
      ? "bg-[#808080]"
      : pct >= 90
      ? "bg-[#C0392B]"
      : pct >= 70
      ? "bg-[#E0A800]"
      : "bg-[#27AE60]"

  const textColor =
    isNull || current == null
      ? "text-[#808080]"
      : pct >= 90
      ? "text-[#C0392B]"
      : pct >= 70
      ? "text-[#E0A800]"
      : "text-[#27AE60]"

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Icon size={12} className="text-[#1E4E8C] shrink-0" />
          <span className="font-mono text-[11px] font-bold text-[#003087] uppercase tracking-wide">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("font-mono text-[11px] font-bold", textColor)}>
            {current != null ? currentLabel : "N/A"}
          </span>
          <span className="font-mono text-[10px] text-[#666]">/ {limitLabel}</span>
          {current != null && (
            <span className={cn("font-mono text-[10px] font-bold", textColor)}>
              ({pct.toFixed(1)}%)
            </span>
          )}
        </div>
      </div>
      {/* Progress Bar Win98 Style */}
      <div className="h-4 bg-[#C0C0C0] border border-[#808080] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.4)] relative overflow-hidden">
        <div
          className={cn("h-full transition-all duration-700", color)}
          style={{ width: `${pct}%` }}
        />
        {/* Win98 progress stripes overlay */}
        {current != null && pct > 0 && (
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255,255,255,0.5) 8px, rgba(255,255,255,0.5) 10px)",
            }}
          />
        )}
      </div>
    </div>
  )
}

export function UsageApp() {
  const [data, setData] = React.useState<UsageMetrics | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [lastFetched, setLastFetched] = React.useState<Date | null>(null)

  const fetchUsage = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/supabase-usage", { cache: "no-store" })
      if (!res.ok) throw new Error("Gagal fetch metrics")
      const json = await res.json()
      setData(json)
      setLastFetched(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error tidak diketahui")
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch on mount + auto-refresh setiap 5 menit
  React.useEffect(() => {
    fetchUsage()
    const interval = setInterval(fetchUsage, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchUsage])

  return (
    <div className="flex flex-col h-full font-mono bg-[#D4D0C8]">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1E4E8C] text-white border-b-2 border-[#003087]">
        <div className="flex items-center gap-2">
          <Server size={13} />
          <span className="text-[11px] font-bold tracking-wider uppercase">
            Supabase Free Tier — Kuota Monitor
          </span>
        </div>
        <button
          type="button"
          onClick={fetchUsage}
          disabled={loading}
          title="Refresh metrics"
          className="flex items-center gap-1 bg-[#C0C0C0] border border-[#808080] shadow-[1px_1px_0px_#fff_inset,-1px_-1px_0px_#808080_inset] text-[#000080] px-2 py-0.5 text-[10px] font-bold hover:bg-[#d0d0d0] active:shadow-[inset_1px_1px_0px_#808080] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          <RotateCw size={10} className={loading ? "animate-spin" : ""} />
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Token Status Banner */}
        {data && !data.has_token && (
          <div className="flex items-start gap-2 bg-[#FFF3CD] border border-[#E0A800] px-2 py-2 mb-3 text-[10px] text-[#856404]">
            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">SUPABASE_ACCESS_TOKEN belum diset.</span>
              {" "}Tambahkan ke <code className="bg-[#E8E8E8] px-1">.env.local</code> dengan permission{" "}
              <span className="font-bold">Logs (Read)</span> + <span className="font-bold">Usage Analytics (Read)</span> untuk data lengkap.
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-[#FAD7D7] border border-[#C0392B] px-2 py-2 mb-3 text-[10px] text-[#C0392B] font-bold">
            <AlertTriangle size={12} />
            {error}
          </div>
        )}

        {!data && !loading && !error && (
          <div className="text-center text-[#808080] font-mono text-[11px] py-8">
            Klik Refresh untuk memuat data...
          </div>
        )}

        {loading && !data && (
          <div className="text-center text-[#1E4E8C] font-mono text-[11px] py-8 animate-pulse">
            Memuat data dari Supabase Management API...
          </div>
        )}

        {data && (
          <>
            {/* Section: Database */}
            <div className="mb-4">
              <div className="bg-[#1E4E8C] text-white text-[10px] font-bold px-2 py-0.5 mb-2 uppercase tracking-widest">
                DATABASE
              </div>
              <UsageBar
                label="DB Size"
                icon={Database}
                current={data.db_size_bytes}
                limit={data.limits.db_size_bytes}
                currentLabel={data.db_size_bytes != null ? formatBytes(data.db_size_bytes) : ""}
                limitLabel="500 MB"
              />
              <UsageBar
                label="Active DB Connections"
                icon={Activity}
                current={data.active_db_connections}
                limit={60}
                currentLabel={data.active_db_connections?.toString() ?? ""}
                limitLabel="60 (pooled)"
              />
            </div>

            {/* Section: Realtime */}
            <div className="mb-4">
              <div className="bg-[#1E4E8C] text-white text-[10px] font-bold px-2 py-0.5 mb-2 uppercase tracking-widest">
                REALTIME
              </div>
              <UsageBar
                label="Concurrent Connections"
                icon={Wifi}
                current={data.realtime_connections}
                limit={data.limits.realtime_connections}
                currentLabel={data.realtime_connections?.toString() ?? ""}
                limitLabel="200"
              />
              <div className="bg-[#F8F8F0] border border-[#C0C0C0] px-2 py-1.5 text-[10px] text-[#666] mt-1">
                <span className="font-bold text-[#003087]">ℹ Realtime Messages/bulan</span>
                {" "}— limit 2.000.000 pesan/bulan. Tidak bisa dimonitor real-time via API (cek di Supabase Dashboard).
              </div>
            </div>

            {/* Section: API */}
            <div className="mb-4">
              <div className="bg-[#1E4E8C] text-white text-[10px] font-bold px-2 py-0.5 mb-2 uppercase tracking-widest">
                API REQUESTS
              </div>
              <UsageBar
                label="Request Bulan Ini"
                icon={Server}
                current={data.api_request_count}
                limit={data.limits.api_requests_daily * 30}
                currentLabel={data.api_request_count != null ? formatNumber(data.api_request_count) : ""}
                limitLabel="150M/bulan"
              />
            </div>

            {/* Section: Free Tier Reference */}
            <div className="mb-2">
              <div className="bg-[#C0C0C0] text-[#003087] text-[10px] font-bold px-2 py-0.5 mb-2 uppercase tracking-widest border border-[#808080]">
                FREE TIER LIMITS (REFERENSI)
              </div>
              <table className="w-full text-[10px] border-collapse">
                <tbody>
                  {[
                    ["DB Size", "500 MB"],
                    ["Realtime Messages", "2.000.000/bulan"],
                    ["Realtime Connections", "200 concurrent"],
                    ["Storage", "1 GB"],
                    ["Edge Function Invocations", "500.000/bulan"],
                    ["MAU (Monthly Active Users)", "50.000"],
                  ].map(([label, val]) => (
                    <tr key={label} className="border-b border-[#C0C0C0]">
                      <td className="py-1 px-2 font-bold text-[#1E4E8C]">{label}</td>
                      <td className="py-1 px-2 text-right text-[#333]">{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-1.5 text-[9px] text-[#808080] mt-2">
              <CheckCircle size={9} className="text-[#27AE60]" />
              <span>
                Terakhir diperbarui:{" "}
                {lastFetched
                  ? lastFetched.toLocaleTimeString("id-ID")
                  : "-"}
                {" "}· Auto-refresh setiap 5 menit
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
