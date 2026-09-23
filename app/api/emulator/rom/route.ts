import { NextRequest, NextResponse } from "next/server"

const PRESET_ROMS: Record<string, { title: string; url: string; filename: string }> = {
  metalslug: {
    title: "Metal Slug Advance",
    url: "https://archive.org/download/GameBoyAdvanceTOSEC/Metal%20Slug%20Advance%20%28USA%29.zip",
    filename: "Metal_Slug_Advance.zip",
  },
  castlevania: {
    title: "Castlevania: Aria of Sorrow",
    url: "https://archive.org/download/GameBoyAdvanceTOSEC/Castlevania%20-%20Aria%20of%20Sorrow%20%28USA%29.zip",
    filename: "Castlevania_Aria_of_Sorrow.zip",
  },
  zelda: {
    title: "The Legend of Zelda: The Minish Cap",
    url: "https://archive.org/download/GameBoyAdvanceTOSEC/Legend%20of%20Zelda%2C%20The%20-%20The%20Minish%20Cap%20%28USA%29.zip",
    filename: "Zelda_The_Minish_Cap.zip",
  },
  pokemon: {
    title: "Pokemon Emerald",
    url: "https://archive.org/download/GameBoyAdvanceTOSEC/Pokemon%20-%20Emerald%20Version%20%28USA%2C%20Europe%29.zip",
    filename: "Pokemon_Emerald.zip",
  },
  sonic: {
    title: "Sonic Advance",
    url: "https://archive.org/download/GameBoyAdvanceTOSEC/Sonic%20Advance%20%28USA%29%20%28En%2CJa%29.zip",
    filename: "Sonic_Advance.zip",
  },
  anguna: {
    title: "Anguna: Warriors of Virtue",
    url: "https://raw.githubusercontent.com/OpenEmu/OpenEmu-Update/master/Homebrew/GBA/Anguna/anguna.gba",
    filename: "Anguna.gba",
  },
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get("id")
  const customUrl = searchParams.get("url")

  let targetUrl = ""
  let filename = "game.bin"

  if (id && PRESET_ROMS[id]) {
    targetUrl = PRESET_ROMS[id].url
    filename = PRESET_ROMS[id].filename
  } else if (customUrl) {
    try {
      const parsed = new URL(customUrl)
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        targetUrl = parsed.toString()
        filename = parsed.pathname.split("/").pop() || "game.zip"
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL provided" }, { status: 400 })
    }
  }

  if (!targetUrl) {
    return NextResponse.json({ error: "No valid ROM target found" }, { status: 400 })
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    })

    if (!res.ok || !res.body) {
      return NextResponse.json(
        { error: `Gagal mengunduh ROM: HTTP ${res.status}` },
        { status: res.status }
      )
    }

    const headers = new Headers()
    headers.set("Content-Type", "application/octet-stream")
    headers.set("Content-Disposition", `inline; filename="${filename}"`)
    headers.set("Cache-Control", "public, max-age=604800, immutable")
    headers.set("Access-Control-Allow-Origin", "*")
    const contentLength = res.headers.get("content-length")
    if (contentLength) {
      headers.set("Content-Length", contentLength)
    }

    return new Response(res.body as BodyInit, {
      status: 200,
      headers,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan saat mengambil ROM" },
      { status: 500 }
    )
  }
}
