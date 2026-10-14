import * as THREE from "three"

/**
 * Helper untuk membuat CanvasTexture secara prosedural
 */
function createProceduralTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void
): THREE.CanvasTexture {
  if (typeof document === "undefined") {
    return new THREE.CanvasTexture({} as any)
  }

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (ctx) {
    draw(ctx, width, height)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.needsUpdate = true
  return texture
}

/**
 * 1. Tekstur Wajah Mii 360° Equirectangular Seamless (Bungkus Bola Kepala Utuh)
 * Tidak menggunakan stiker kotak melayang! Wajah langsung ter-render halus melengkung di bola kepala.
 */
export function createMiiHeadTexture(
  skinHex: string = "#ffdbac",
  isOpponent: boolean = false,
  eyeColor: string = "#111111",
  hairHex: string = "#3d2314"
): THREE.CanvasTexture {
  return createProceduralTexture(1024, 512, (ctx, w, h) => {
    // A. Warna Dasar Kulit Mii
    ctx.fillStyle = skinHex
    ctx.fillRect(0, 0, w, h)

    // B. Pusat Wajah berdasarkan hadap karakter di Three.js Sphere UV:
    // Player 1 hadap ke -Z (arah net): center U = 0.75 (x = w * 0.75)
    // Opponent hadap ke +Z (arah player): center U = 0.25 (x = w * 0.25)
    const centerX = isOpponent ? w * 0.25 : w * 0.75
    const eyeY = h * 0.52
    const eyeSpacing = w * 0.052
    const eyeRadiusX = 18
    const eyeRadiusY = 25

    // C. Pipi Merona Halus (Blush Cheeks)
    const blushGradL = ctx.createRadialGradient(centerX - eyeSpacing - 10, eyeY + 28, 2, centerX - eyeSpacing - 10, eyeY + 28, 26)
    blushGradL.addColorStop(0, "rgba(244, 63, 94, 0.45)")
    blushGradL.addColorStop(1, "rgba(244, 63, 94, 0)")
    ctx.fillStyle = blushGradL
    ctx.beginPath()
    ctx.arc(centerX - eyeSpacing - 10, eyeY + 28, 26, 0, Math.PI * 2)
    ctx.fill()

    const blushGradR = ctx.createRadialGradient(centerX + eyeSpacing + 10, eyeY + 28, 2, centerX + eyeSpacing + 10, eyeY + 28, 26)
    blushGradR.addColorStop(0, "rgba(244, 63, 94, 0.45)")
    blushGradR.addColorStop(1, "rgba(244, 63, 94, 0)")
    ctx.fillStyle = blushGradR
    ctx.beginPath()
    ctx.arc(centerX + eyeSpacing + 10, eyeY + 28, 26, 0, Math.PI * 2)
    ctx.fill()

    // D. Mata Hitam Kartun Ikonik Mii
    // Mata Kiri
    ctx.fillStyle = eyeColor
    ctx.beginPath()
    ctx.ellipse(centerX - eyeSpacing, eyeY, eyeRadiusX, eyeRadiusY, 0, 0, Math.PI * 2)
    ctx.fill()

    // Mata Kanan
    ctx.beginPath()
    ctx.ellipse(centerX + eyeSpacing, eyeY, eyeRadiusX, eyeRadiusY, 0, 0, Math.PI * 2)
    ctx.fill()

    // Kilau Cahaya Putih di Mata (Specular Catchlight Mii)
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(centerX - eyeSpacing + 4, eyeY - 7, 7, 0, Math.PI * 2)
    ctx.arc(centerX + eyeSpacing + 4, eyeY - 7, 7, 0, Math.PI * 2)
    ctx.fill()

    // Kilau kecil kedua
    ctx.beginPath()
    ctx.arc(centerX - eyeSpacing - 5, eyeY + 8, 3.5, 0, Math.PI * 2)
    ctx.arc(centerX + eyeSpacing - 5, eyeY + 8, 3.5, 0, Math.PI * 2)
    ctx.fill()

    // E. Alis Karakter Khas Mii (Tebal & Ekspresif)
    ctx.strokeStyle = hairHex
    ctx.lineWidth = 11
    ctx.lineCap = "round"

    if (isOpponent) {
      // Alis sedikit sporty/fokus untuk lawan
      ctx.beginPath()
      ctx.moveTo(centerX - eyeSpacing - 24, eyeY - 35)
      ctx.lineTo(centerX - eyeSpacing + 20, eyeY - 27)
      ctx.moveTo(centerX + eyeSpacing + 24, eyeY - 35)
      ctx.lineTo(centerX + eyeSpacing - 20, eyeY - 27)
      ctx.stroke()
    } else {
      // Alis ramah melengkung ceria
      ctx.beginPath()
      ctx.arc(centerX - eyeSpacing, eyeY - 24, 25, Math.PI * 1.15, Math.PI * 1.85)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(centerX + eyeSpacing, eyeY - 24, 25, Math.PI * 1.15, Math.PI * 1.85)
      ctx.stroke()
    }

    // F. Hidung Mungil Mii (Segitiga Lembut)
    ctx.fillStyle = "rgba(161, 98, 7, 0.85)"
    ctx.beginPath()
    ctx.arc(centerX, eyeY + 16, 5, 0, Math.PI * 2)
    ctx.fill()

    // G. Senyuman Hangat Lebar Khas Mii
    ctx.strokeStyle = "#1a1a1a"
    ctx.lineWidth = 9
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.arc(centerX, eyeY + 32, 26, Math.PI * 0.12, Math.PI * 0.88)
    ctx.stroke()
  })
}

/**
 * 2. Tekstur Lapangan Rumput Garis-Garis Khas Wii Sports (Persis Gambar 2)
 */
export function createWiiSportsGrassCourtTexture(): THREE.CanvasTexture {
  return createProceduralTexture(1024, 2048, (ctx, w, h) => {
    // Lawn mower horizontal stripes
    const stripeHeight = 64
    const totalStripes = Math.ceil(h / stripeHeight)

    for (let i = 0; i < totalStripes; i++) {
      const isEven = i % 2 === 0
      ctx.fillStyle = isEven ? "#62b032" : "#72bf3a"
      ctx.fillRect(0, i * stripeHeight, w, stripeHeight)
    }

    // Micro grass noise
    ctx.fillStyle = "rgba(0, 0, 0, 0.025)"
    for (let i = 0; i < 8000; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 2.5)
    }
    ctx.fillStyle = "rgba(255, 255, 255, 0.035)"
    for (let i = 0; i < 8000; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 2.5)
    }

    // Inner Court Box
    const marginX = w * 0.16
    const marginY = h * 0.1
    const courtW = w - marginX * 2
    const courtH = h - marginY * 2

    // Garis Batas Lapangan Putih Bersih
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 14
    ctx.lineCap = "square"

    // 1. Boundary luar
    ctx.strokeRect(marginX, marginY, courtW, courtH)

    // 2. Singles sidelines
    const singlesMargin = courtW * 0.125
    ctx.beginPath()
    ctx.moveTo(marginX + singlesMargin, marginY)
    ctx.lineTo(marginX + singlesMargin, marginY + courtH)
    ctx.moveTo(marginX + courtW - singlesMargin, marginY)
    ctx.lineTo(marginX + courtW - singlesMargin, marginY + courtH)
    ctx.stroke()

    // 3. Garis Net Tengah
    const midY = h / 2
    ctx.lineWidth = 6
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)"
    ctx.beginPath()
    ctx.moveTo(marginX - 20, midY)
    ctx.lineTo(marginX + courtW + 20, midY)
    ctx.stroke()

    // 4. Service Lines
    ctx.lineWidth = 14
    ctx.strokeStyle = "#ffffff"
    const serviceDist = courtH * 0.28
    const topServiceY = midY - serviceDist
    const botServiceY = midY + serviceDist

    ctx.beginPath()
    ctx.moveTo(marginX + singlesMargin, topServiceY)
    ctx.lineTo(marginX + courtW - singlesMargin, topServiceY)
    ctx.moveTo(marginX + singlesMargin, botServiceY)
    ctx.lineTo(marginX + courtW - singlesMargin, botServiceY)
    ctx.moveTo(w / 2, topServiceY)
    ctx.lineTo(w / 2, botServiceY)

    const markLength = 32
    ctx.moveTo(w / 2, marginY)
    ctx.lineTo(w / 2, marginY + markLength)
    ctx.moveTo(w / 2, marginY + courtH)
    ctx.lineTo(w / 2, marginY + courtH - markLength)
    ctx.stroke()
  })
}

/**
 * 3. Tekstur Bola Tenis
 */
export function createTennisBallTexture(): THREE.CanvasTexture {
  return createProceduralTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#d7f52a"
    ctx.fillRect(0, 0, w, h)

    ctx.fillStyle = "rgba(255, 255, 255, 0.2)"
    for (let i = 0; i < 3000; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5)
    }
    ctx.fillStyle = "rgba(100, 130, 20, 0.1)"
    for (let i = 0; i < 2000; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 2)
    }

    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 28
    ctx.lineCap = "round"

    ctx.beginPath()
    ctx.arc(0, h / 2, w * 0.38, -Math.PI / 2, Math.PI / 2)
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(w, h / 2, w * 0.38, Math.PI / 2, (3 * Math.PI) / 2)
    ctx.stroke()

    ctx.strokeStyle = "rgba(120, 140, 40, 0.25)"
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.arc(0, h / 2, w * 0.38, -Math.PI / 2, Math.PI / 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(w, h / 2, w * 0.38, Math.PI / 2, (3 * Math.PI) / 2)
    ctx.stroke()
  })
}

/**
 * 4. Tekstur Senar Raket Tenis
 */
export function createRacketStringsTexture(): THREE.CanvasTexture {
  return createProceduralTexture(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)

    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)"
    ctx.lineWidth = 3

    const spacing = 18
    for (let x = spacing; x < w; x += spacing) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    for (let y = spacing; y < h; y += spacing) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
  })
}

/**
 * 5. Logo Plakat Stadion Resmi IT-THINGS 98
 */
export function createStadiumLogoTexture(): THREE.CanvasTexture {
  return createProceduralTexture(768, 192, (ctx, w, h) => {
    // Background Plakat Hijau Stadion Solid (Menutup sempurna teks GLB di baliknya)
    ctx.fillStyle = "#1e4726"
    ctx.fillRect(0, 0, w, h)

    // Border Emas Retro
    ctx.strokeStyle = "#f59e0b"
    ctx.lineWidth = 10
    ctx.strokeRect(6, 6, w - 12, h - 12)

    // Inner Border Putih Halus
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.roundRect(18, 18, w - 36, h - 36, 18)
    ctx.stroke()

    // Teks Logo
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 56px 'Segoe UI', Tahoma, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.shadowColor = "rgba(0, 0, 0, 0.7)"
    ctx.shadowBlur = 8
    ctx.fillText("IT-THINGS 98  TENNIS", w / 2, h / 2 - 4)

    // Subtitle
    ctx.shadowBlur = 0
    ctx.fillStyle = "#facc15"
    ctx.font = "bold 20px 'Segoe UI', Tahoma, sans-serif"
    ctx.fillText("★ GRAND SLAM TOURNAMENT ★", w / 2, h / 2 + 42)
  })
}

/**
 * 6. Tekstur Jaring Net Tenis
 */
export function createTennisNetTexture(): THREE.CanvasTexture {
  return createProceduralTexture(512, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)

    ctx.strokeStyle = "rgba(20, 20, 20, 0.65)"
    ctx.lineWidth = 2
    const step = 8
    for (let x = 0; x < w; x += step) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, w, 16)
  })
}
