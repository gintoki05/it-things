"use server"

export type SupportedPlatform = "youtube" | "tiktok" | "twitter" | "instagram" | "other"

export interface MediaMetadataResult {
  success: boolean
  platform: SupportedPlatform
  title?: string
  author?: string
  thumbnail?: string
  duration?: string
  error?: string
}

export interface MediaDownloadResult {
  success: boolean
  platform: SupportedPlatform
  title?: string
  thumbnail?: string
  downloadUrl?: string
  filename?: string
  format: "video" | "audio"
  quality?: string
  helperUrl?: string
  helperName?: string
  error?: string
}

/**
 * Deteksi platform berdasarkan URL
 */
export async function detectPlatform(urlStr: string): Promise<SupportedPlatform> {
  try {
    const parsed = new URL(urlStr)
    const host = parsed.hostname.toLowerCase()

    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube"
    if (host.includes("tiktok.com")) return "tiktok"
    if (host.includes("twitter.com") || host.includes("x.com")) return "twitter"
    if (host.includes("instagram.com")) return "instagram"
    return "other"
  } catch {
    return "other"
  }
}

/**
 * Ambil pratinjau metadata (Judul, Author, Thumbnail) secara cepat & ringan
 */
export async function fetchMediaMetadataAction(rawUrl: string): Promise<MediaMetadataResult> {
  const cleanUrl = rawUrl.trim()
  if (!cleanUrl) {
    return { success: false, platform: "other", error: "URL tidak boleh kosong." }
  }

  const platform = await detectPlatform(cleanUrl)

  try {
    // 1. YOUTUBE METADATA (via Official oEmbed - 100% cepat & tanpa limit)
    if (platform === "youtube") {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`
      const res = await fetch(oembedUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        next: { revalidate: 3600 },
      })

      if (res.ok) {
        const data = await res.json()
        return {
          success: true,
          platform: "youtube",
          title: data.title || "YouTube Video",
          author: data.author_name || "YouTube Creator",
          thumbnail: data.thumbnail_url || undefined,
        }
      }

      // Fallback thumbnail via video ID jika oEmbed gagal
      const videoIdMatch = cleanUrl.match(/(?:v=|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
      if (videoIdMatch) {
        return {
          success: true,
          platform: "youtube",
          title: `YouTube Video [${videoIdMatch[1]}]`,
          thumbnail: `https://i.ytimg.com/vi/${videoIdMatch[1]}/hqdefault.jpg`,
        }
      }
    }

    // 2. TIKTOK METADATA (via TikWM)
    if (platform === "tiktok") {
      const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(cleanUrl)}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.code === 0 && data.data) {
          return {
            success: true,
            platform: "tiktok",
            title: data.data.title || "TikTok Video",
            author: data.data.author?.nickname || data.data.author?.unique_id || "TikTok User",
            thumbnail: data.data.cover || data.data.origin_cover,
            duration: data.data.duration ? `${data.data.duration}s` : undefined,
          }
        }
      }
    }

    // 3. TWITTER / X METADATA (via FxTwitter)
    if (platform === "twitter") {
      const tweetMatch = cleanUrl.match(/status\/(\d+)/)
      if (tweetMatch) {
        const tweetId = tweetMatch[1]
        const res = await fetch(`https://api.fxtwitter.com/status/${tweetId}`, {
          headers: { "User-Agent": "Mozilla/5.0" },
        })
        if (res.ok) {
          const data = await res.json()
          if (data.code === 200 && data.tweet) {
            const media = data.tweet.media?.videos?.[0] || data.tweet.media?.photos?.[0]
            return {
              success: true,
              platform: "twitter",
              title: data.tweet.text?.slice(0, 100) || `Post oleh @${data.tweet.author?.screen_name}`,
              author: data.tweet.author?.name ? `${data.tweet.author.name} (@${data.tweet.author.screen_name})` : "Twitter User",
              thumbnail: media?.thumbnail_url || media?.url,
            }
          }
        }
      }
    }

    // 4. INSTAGRAM / PLATFORM LAIN
    return {
      success: true,
      platform,
      title: `${platform.toUpperCase()} Media Link`,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memuat info media"
    return {
      success: false,
      platform,
      error: msg,
    }
  }
}

/**
 * Resolusi URL Download Langsung
 */
export async function resolveMediaDownloadAction(params: {
  url: string
  format: "video" | "audio"
  quality?: "1080" | "720" | "auto"
}): Promise<MediaDownloadResult> {
  const { url, format, quality = "auto" } = params
  const cleanUrl = url.trim()

  if (!cleanUrl) {
    return {
      success: false,
      platform: "other",
      format,
      error: "Tautan URL wajib diisi.",
    }
  }

  const platform = await detectPlatform(cleanUrl)

  try {
    // ── 1. TIKTOK RESOLVER ──
    if (platform === "tiktok") {
      const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(cleanUrl)}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.code === 0 && data.data) {
          const isAudio = format === "audio"
          const downloadUrl = isAudio ? (data.data.music || data.data.play) : (data.data.play || data.data.wmplay)
          const cleanTitle = (data.data.title || "tiktok_media").replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 40)
          const ext = isAudio ? "mp3" : "mp4"

          return {
            success: true,
            platform: "tiktok",
            title: data.data.title || "TikTok Video",
            thumbnail: data.data.cover,
            downloadUrl,
            filename: `${cleanTitle}.${ext}`,
            format,
            quality: isAudio ? "MP3 128kbps" : "HD No-Watermark",
          }
        }
      }
    }

    // ── 2. TWITTER / X RESOLVER ──
    if (platform === "twitter") {
      const tweetMatch = cleanUrl.match(/status\/(\d+)/)
      if (tweetMatch) {
        const tweetId = tweetMatch[1]
        const res = await fetch(`https://api.fxtwitter.com/status/${tweetId}`, {
          headers: { "User-Agent": "Mozilla/5.0" },
        })
        if (res.ok) {
          const data = await res.json()
          if (data.code === 200 && data.tweet) {
            const video = data.tweet.media?.videos?.[0]
            if (video && video.url) {
              const cleanText = (data.tweet.text || `twitter_${tweetId}`).replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 40)
              return {
                success: true,
                platform: "twitter",
                title: data.tweet.text || "Twitter Video",
                thumbnail: video.thumbnail_url,
                downloadUrl: video.url,
                filename: `${cleanText}.mp4`,
                format: "video",
                quality: "HD MP4",
              }
            }
          }
        }
      }
    }

    // ── 3. COBALT ENGINE RESOLVER (Bisa untuk YouTube, IG, dll) ──
    const cobaltInstances = [
      process.env.COBALT_API_URL,
      "https://cobalt-backend.canine.tools",
      "https://cobalt.api.redstream.lat",
      "https://api.cobalt.tools",
    ].filter(Boolean) as string[]

    for (const instance of cobaltInstances) {
      try {
        const cobaltRes = await fetch(`${instance.replace(/\/$/, "")}/`, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            ...(process.env.COBALT_API_KEY ? { "Authorization": `Api-Key ${process.env.COBALT_API_KEY}` } : {}),
          },
          body: JSON.stringify({
            url: cleanUrl,
            downloadMode: format === "audio" ? "audio" : "auto",
            videoQuality: quality === "auto" ? "1080" : quality,
            audioFormat: "mp3",
          }),
          signal: AbortSignal.timeout(5000),
        })

        if (cobaltRes.ok) {
          const cobaltData = await cobaltRes.json()
          if ((cobaltData.status === "tunnel" || cobaltData.status === "redirect") && cobaltData.url) {
            return {
              success: true,
              platform,
              title: cobaltData.filename || "Media File",
              downloadUrl: cobaltData.url,
              filename: cobaltData.filename,
              format,
              quality: quality === "auto" ? "Best Available" : quality,
            }
          }
        }
      } catch {
        // Lanjut ke kandidat resolver berikutnya jika timeout/error
      }
    }

    // ── 4. YOUTUBE (SEMENTARA DIBATASI) ──
    if (platform === "youtube") {
      return {
        success: false,
        platform: "youtube",
        format,
        error: "Unduhan YouTube sementara dibatasi karena proteksi server. Silakan gunakan untuk TikTok atau Twitter/X.",
      }
    }

    return {
      success: false,
      platform,
      format,
      error: "Layanan resolver sedang sibuk atau URL tidak didukung. Coba periksa kembali tautan Anda.",
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat memproses unduhan."
    return {
      success: false,
      platform,
      format,
      error: msg,
    }
  }
}
