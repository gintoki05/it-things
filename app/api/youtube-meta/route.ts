import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const targetUrl = searchParams.get("url")
  const videoId = searchParams.get("id")

  let urlToFetch = targetUrl
  if (!urlToFetch && videoId) {
    urlToFetch = `https://www.youtube.com/watch?v=${videoId}`
  }

  if (!urlToFetch) {
    return NextResponse.json({ error: "URL or ID parameter is required" }, { status: 400 })
  }

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(urlToFetch)}&format=json`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(oembedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; IT-Things/1.0)",
      },
    })
    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      return NextResponse.json({
        title: data.title || null,
        author: data.author_name || null,
        thumbnail: data.thumbnail_url || null,
      })
    }

    // Fallback: fetch page HTML and match <title>
    const pageRes = await fetch(urlToFetch, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    })

    if (pageRes.ok) {
      const html = await pageRes.text()
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
      if (titleMatch && titleMatch[1]) {
        let title = titleMatch[1].replace(/ - YouTube$/i, "").trim()
        return NextResponse.json({
          title,
          author: null,
          thumbnail: null,
        })
      }
    }

    return NextResponse.json({ title: null, error: "Not found" }, { status: 404 })
  } catch (err: any) {
    return NextResponse.json(
      { title: null, error: err?.message || "Failed to fetch metadata" },
      { status: 500 }
    )
  }
}
