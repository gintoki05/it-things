import { extractYouTubeId } from "@/lib/winamp-store"

export interface YouTubeMeta {
  title: string
  author?: string | null
  thumbnail?: string | null
}

const memoryCache = new Map<string, YouTubeMeta>()
const STORAGE_KEY = "it_things_yt_meta_cache_v1"

function getLocalCache(): Record<string, YouTubeMeta> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveToLocalCache(videoId: string, meta: YouTubeMeta) {
  if (typeof window === "undefined") return
  try {
    const local = getLocalCache()
    local[videoId] = meta
    const keys = Object.keys(local)
    if (keys.length > 200) {
      delete local[keys[0]]
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(local))
  } catch {
    // ignore
  }
}

export async function fetchYouTubeMeta(urlOrId: string): Promise<YouTubeMeta | null> {
  const trimmed = urlOrId.trim()
  if (!trimmed) return null

  const videoId =
    extractYouTubeId(trimmed) ||
    (trimmed.length === 11 && !trimmed.includes("/") ? trimmed : null)

  if (!videoId) return null

  // 1. Check in-memory cache
  if (memoryCache.has(videoId)) {
    return memoryCache.get(videoId)!
  }

  // 2. Check localStorage cache
  const local = getLocalCache()
  if (local[videoId]) {
    memoryCache.set(videoId, local[videoId])
    return local[videoId]
  }

  // 3. Fetch from API route
  try {
    const res = await fetch(`/api/youtube-meta?id=${encodeURIComponent(videoId)}`)
    if (res.ok) {
      const data = await res.json()
      if (data.title) {
        const meta: YouTubeMeta = {
          title: data.title,
          author: data.author || null,
          thumbnail: data.thumbnail || null,
        }
        memoryCache.set(videoId, meta)
        saveToLocalCache(videoId, meta)
        return meta
      }
    }
  } catch {
    // API route failed, try direct oembed
    try {
      const res = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      )
      if (res.ok) {
        const data = await res.json()
        if (data.title) {
          const meta: YouTubeMeta = {
            title: data.title,
            author: data.author_name || null,
            thumbnail: data.thumbnail_url || null,
          }
          memoryCache.set(videoId, meta)
          saveToLocalCache(videoId, meta)
          return meta
        }
      }
    } catch {
      // ignore
    }
  }

  return null
}
