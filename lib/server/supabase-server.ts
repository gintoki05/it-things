import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

export function createServerSupabase(authHeader?: string | null) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const candidateKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  const supabaseKey = candidateKey.endsWith("...")
    ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ""
    : candidateKey

  if (!supabaseUrl || !supabaseKey) {
    return null
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: authHeader
      ? {
          headers: {
            Authorization: authHeader.startsWith("Bearer ")
              ? authHeader
              : `Bearer ${authHeader}`,
          },
        }
      : undefined,
  })
}
