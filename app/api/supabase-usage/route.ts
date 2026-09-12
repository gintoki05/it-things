import { NextResponse } from "next/server"

const PROJECT_REF = "pdftwetkgslpvwissyik"
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN

const FREE_TIER_LIMITS = {
  db_size_bytes: 500 * 1024 * 1024,        // 500 MB
  realtime_messages_monthly: 2_000_000,     // 2M/bulan
  realtime_connections: 200,                // concurrent
  storage_bytes: 1 * 1024 * 1024 * 1024,   // 1 GB
  edge_function_invocations: 500_000,       // /bulan
  api_requests_daily: 5_000_000,            // 5M/hari
}

async function fetchMgmt(path: string) {
  if (!ACCESS_TOKEN) return null
  try {
    const res = await fetch(`https://api.supabase.com${path}`, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      cache: "no-store",
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

async function fetchPrometheus(): Promise<string | null> {
  if (!ACCESS_TOKEN) return null
  try {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/metrics`,
      {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
        cache: "no-store",
      }
    )
    if (!res.ok) return null
    return res.text()
  } catch {
    return null
  }
}

function parseMetric(text: string, name: string): number | null {
  for (const line of text.split("\n")) {
    if (line.startsWith(name) && !line.startsWith("#")) {
      const val = parseFloat(line.split(" ").pop() ?? "")
      return isNaN(val) ? null : val
    }
  }
  return null
}

export async function GET() {
  const hasToken = !!ACCESS_TOKEN

  // Prometheus metrics (needs Logs:Read)
  let db_size_bytes: number | null = null
  let active_db_connections: number | null = null
  let realtime_connections: number | null = null

  const prom = await fetchPrometheus()
  if (prom) {
    db_size_bytes = parseMetric(prom, "pg_database_size_bytes")
    active_db_connections = parseMetric(prom, "pg_stat_activity_count")
    realtime_connections = parseMetric(prom, "realtime_connected_users")
      ?? parseMetric(prom, "realtime_connected_clients")
  }

  // Usage analytics (needs Usage Analytics:Read)
  let api_request_count: number | null = null
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0]
  const endDate = now.toISOString().split("T")[0]

  const usageData = await fetchMgmt(
    `/v1/projects/${PROJECT_REF}/usage/api-count?period_start=${startOfMonth}&period_end=${endDate}`
  )
  if (usageData?.total != null) api_request_count = usageData.total

  return NextResponse.json({
    db_size_bytes,
    active_db_connections,
    realtime_connections,
    api_request_count,
    limits: FREE_TIER_LIMITS,
    has_token: hasToken,
    fetched_at: now.toISOString(),
  })
}
