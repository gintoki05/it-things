import { Ball, BallType, ShotResult } from "./types"
import {
  playBallCollisionSound,
  playCushionSound,
  playPocketSound,
} from "./sound"

export const TABLE_WIDTH = 800
export const TABLE_HEIGHT = 400
export const CUSHION_WIDTH = 28
export const BALL_RADIUS = 11.5
export const POCKET_RADIUS = 20
export const POCKET_SUCTION_RADIUS = 26

export interface Pocket {
  x: number
  y: number
  radius: number
}

// 6 lubang meja biliar dalam koordinat playfield (0,0 sampai TABLE_WIDTH, TABLE_HEIGHT)
export const POCKETS: Pocket[] = [
  { x: 2, y: 2, radius: POCKET_RADIUS }, // Pojok kiri atas
  { x: TABLE_WIDTH / 2, y: -2, radius: POCKET_RADIUS * 0.95 }, // Tengah atas
  { x: TABLE_WIDTH - 2, y: 2, radius: POCKET_RADIUS }, // Pojok kanan atas
  { x: 2, y: TABLE_HEIGHT - 2, radius: POCKET_RADIUS }, // Pojok kiri bawah
  { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT + 2, radius: POCKET_RADIUS * 0.95 }, // Tengah bawah
  { x: TABLE_WIDTH - 2, y: TABLE_HEIGHT - 2, radius: POCKET_RADIUS }, // Pojok kanan bawah
]

const BALL_COLORS: Record<number, { color: string; stripeColor?: string }> = {
  0: { color: "#F0F0F0" }, // Putih / Cue
  1: { color: "#FBC02D" }, // Kuning
  2: { color: "#1976D2" }, // Biru
  3: { color: "#D32F2F" }, // Merah
  4: { color: "#7B1FA2" }, // Ungu
  5: { color: "#F57C00" }, // Oranye
  6: { color: "#388E3C" }, // Hijau
  7: { color: "#5D4037" }, // Cokelat
  8: { color: "#111111" }, // Hitam (8)
  9: { color: "#FFFFFF", stripeColor: "#FBC02D" },
  10: { color: "#FFFFFF", stripeColor: "#1976D2" },
  11: { color: "#FFFFFF", stripeColor: "#D32F2F" },
  12: { color: "#FFFFFF", stripeColor: "#7B1FA2" },
  13: { color: "#FFFFFF", stripeColor: "#F57C00" },
  14: { color: "#FFFFFF", stripeColor: "#388E3C" },
  15: { color: "#FFFFFF", stripeColor: "#5D4037" },
}

export function getBallType(ballNumber: number): BallType {
  if (ballNumber === 0) return "cue"
  if (ballNumber === 8) return "eight"
  if (ballNumber >= 1 && ballNumber <= 7) return "solid"
  return "stripe"
}

/**
 * Membuat susunan bola segitiga standar 8-Ball
 */
export function createInitialBalls(): Ball[] {
  const balls: Ball[] = []

  // Bola Putih (Cue Ball) di area headstring
  balls.push({
    id: 0,
    number: 0,
    type: "cue",
    x: TABLE_WIDTH * 0.25,
    y: TABLE_HEIGHT * 0.5,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS,
    isPocketed: false,
    color: BALL_COLORS[0].color,
    poleX: 0,
    poleY: 0,
    poleZ: 1,
  })

  // Pola susunan 15 bola di rak segitiga (Bola 8 wajib di tengah baris ke-3)
  // [1]
  // [2, 3]
  // [4, 8, 5]
  // [6, 7, 9, 10]
  // [11, 12, 13, 14, 15]
  // Pastikan dua sudut bawah beda jenis (1 solid, 1 stripe)
  const rackPattern: number[][] = [
    [1], // Baris 0 (Apex)
    [9, 2], // Baris 1
    [3, 8, 10], // Baris 2 (8 di tengah)
    [11, 4, 12, 5], // Baris 3
    [6, 13, 7, 14, 15], // Baris 4 (sudut kiri 6 solid, sudut kanan 15 stripe)
  ]

  const startX = TABLE_WIDTH * 0.72
  const centerY = TABLE_HEIGHT * 0.5
  const ballSpacing = BALL_RADIUS * 2 + 0.5
  const rowSpacing = Math.sqrt(3) * BALL_RADIUS + 0.5

  for (let row = 0; row < rackPattern.length; row++) {
    const count = rackPattern[row].length
    const rowX = startX + row * rowSpacing
    const startRowY = centerY - ((count - 1) * ballSpacing) / 2

    for (let col = 0; col < count; col++) {
      const num = rackPattern[row][col]
      const ballColor = BALL_COLORS[num]
      balls.push({
        id: num,
        number: num,
        type: getBallType(num),
        x: rowX,
        y: startRowY + col * ballSpacing,
        vx: 0,
        vy: 0,
        radius: BALL_RADIUS,
        isPocketed: false,
        color: ballColor.color,
        stripeColor: ballColor.stripeColor,
        poleX: 0,
        poleY: 0,
        poleZ: 1,
      })
    }
  }

  return balls
}

/**
 * Cek apakah semua bola sudah berhenti bergerak dan animasi pocketing selesai
 */
export function areBallsAtRest(balls: Ball[]): boolean {
  const restThreshold = 0.08
  for (const b of balls) {
    // Tunggu sampai animasi jatuh ke lubang benar-benar rampung
    if (b.pocketAnimationProgress !== undefined && b.pocketAnimationProgress < 1.0) {
      return false
    }
    if (!b.isPocketed) {
      if (Math.abs(b.vx) > restThreshold || Math.abs(b.vy) > restThreshold) {
        return false
      }
    }
  }
  return true
}

/**
 * Hentikan paksa bola yang kecepatannya di bawah threshold
 */
export function stopSlowBalls(balls: Ball[]) {
  const restThreshold = 0.08
  for (const b of balls) {
    if (b.pocketAnimationProgress === undefined && Math.abs(b.vx) <= restThreshold && Math.abs(b.vy) <= restThreshold) {
      b.vx = 0
      b.vy = 0
    }
  }
}

/**
 * Step simulasi fisika untuk 1 frame / tick
 * @returns Peristiwa yang terjadi di frame ini (tabrakan, pocket, cushion)
 */
export function stepPhysics(
  balls: Ball[],
  shotTracker: {
    firstBallHit: number | null
    cushionsHit: number
    pocketedThisShot: number[]
    spinX?: number
    spinY?: number
    shotAngle?: number
  }
): void {
  const friction = 0.988 // Redaman kain felt
  const cushionRestitution = 0.88 // Pantulan bantalan karet
  const ballRestitution = 0.96 // Elastisitas benturan bola

  // 1. Update posisi dan cek kantong (Pockets)
  for (const b of balls) {
    if (b.isPocketed) continue

    // Jika bola sedang dalam animasi masuk lubang (smooth drop)
    if (b.pocketAnimationProgress !== undefined) {
      b.pocketAnimationProgress += 0.042 // Berlangsung ~24 frame (~380ms)
      b.vx *= 0.88
      b.vy *= 0.88
      b.x += b.vx
      b.y += b.vy
      if (b.pocketAnimationProgress >= 1.0) {
        b.isPocketed = true
        b.vx = 0
        b.vy = 0
      }
      continue
    }

    // Cek lubang
    for (const p of POCKETS) {
      const dx = p.x - b.x
      const dy = p.y - b.y
      const dist = Math.hypot(dx, dy)

      // Gravitasi tarikan lubang jika dekat bibir lubang (suction bertahap)
      if (dist < POCKET_SUCTION_RADIUS) {
        const suctionForce = (1 - dist / POCKET_SUCTION_RADIUS) * 0.4
        b.vx += (dx / dist) * suctionForce
        b.vy += (dy / dist) * suctionForce
      }

      // Masuk ke bibir lubang: mulai animasi jatuh 3D mulus
      if (dist < p.radius * 0.92) {
        b.pocketAnimationProgress = 0.01
        // Kurva kecepatan melengkung ke tengah kantong
        b.vx = (dx / (dist || 1)) * 1.3
        b.vy = (dy / (dist || 1)) * 1.3
        shotTracker.pocketedThisShot.push(b.number)
        playPocketSound()
        break
      }
    }

    if (b.pocketAnimationProgress !== undefined) continue

    // Gerakkan bola
    b.x += b.vx
    b.y += b.vy

    // Rotasi Bola 3D saat Menggelinding (Sphere Rolling Rotation)
    const speed = Math.hypot(b.vx, b.vy)
    if (speed > 0.001) {
      const angle = speed / b.radius
      const ux = -b.vy / speed
      const uy = b.vx / speed

      const px = b.poleX ?? 0
      const py = b.poleY ?? 0
      const pz = b.poleZ ?? 1

      const cosA = Math.cos(angle)
      const sinA = Math.sin(angle)
      const dot = ux * px + uy * py

      const cx = uy * pz
      const cy = -ux * pz
      const cz = ux * py - uy * px

      const newPx = px * cosA + cx * sinA + ux * dot * (1 - cosA)
      const newPy = py * cosA + cy * sinA + uy * dot * (1 - cosA)
      const newPz = pz * cosA + cz * sinA

      const len = Math.hypot(newPx, newPy, newPz) || 1
      b.poleX = newPx / len
      b.poleY = newPy / len
      b.poleZ = newPz / len
    }

    // Gesekan kain meja
    b.vx *= friction
    b.vy *= friction

    // 2. Pantulan Dinding Meja (Cushion Bouncing)
    // Dinding Kiri
    if (b.x - b.radius < 0) {
      b.x = b.radius
      b.vx = -b.vx * cushionRestitution
      if (b.number === 0 && shotTracker.spinX) {
        b.vy += b.vx * shotTracker.spinX * 0.35
        shotTracker.spinX *= 0.6
      }
      shotTracker.cushionsHit++
      playCushionSound(Math.abs(b.vx))
    }
    // Dinding Kanan
    else if (b.x + b.radius > TABLE_WIDTH) {
      b.x = TABLE_WIDTH - b.radius
      b.vx = -b.vx * cushionRestitution
      if (b.number === 0 && shotTracker.spinX) {
        b.vy += b.vx * shotTracker.spinX * 0.35
        shotTracker.spinX *= 0.6
      }
      shotTracker.cushionsHit++
      playCushionSound(Math.abs(b.vx))
    }

    // Dinding Atas
    if (b.y - b.radius < 0) {
      b.y = b.radius
      b.vy = -b.vy * cushionRestitution
      if (b.number === 0 && shotTracker.spinX) {
        b.vx -= b.vy * shotTracker.spinX * 0.35
        shotTracker.spinX *= 0.6
      }
      shotTracker.cushionsHit++
      playCushionSound(Math.abs(b.vy))
    }
    // Dinding Bawah
    else if (b.y + b.radius > TABLE_HEIGHT) {
      b.y = TABLE_HEIGHT - b.radius
      b.vy = -b.vy * cushionRestitution
      if (b.number === 0 && shotTracker.spinX) {
        b.vx -= b.vy * shotTracker.spinX * 0.35
        shotTracker.spinX *= 0.6
      }
      shotTracker.cushionsHit++
      playCushionSound(Math.abs(b.vy))
    }
  }

  // 3. Tabrakan Antar Bola (Ball-to-Ball Elastic Collisions)
  const activeBalls = balls.filter((b) => !b.isPocketed)
  for (let i = 0; i < activeBalls.length; i++) {
    for (let j = i + 1; j < activeBalls.length; j++) {
      const b1 = activeBalls[i]
      const b2 = activeBalls[j]

      const dx = b2.x - b1.x
      const dy = b2.y - b1.y
      const dist = Math.hypot(dx, dy)
      const minDist = b1.radius + b2.radius

      if (dist < minDist && dist > 0) {
        const isFirstHit = shotTracker.firstBallHit === null
        // Catat jika bola putih pertama kali menyentuh bola lain
        if (b1.number === 0 && isFirstHit) {
          shotTracker.firstBallHit = b2.number
        } else if (b2.number === 0 && isFirstHit) {
          shotTracker.firstBallHit = b1.number
        }

        // Normalisasi vektor tabrakan
        const nx = dx / dist
        const ny = dy / dist

        // Posisi overlap separation (cegah bola nempel / nyangkut)
        const overlap = minDist - dist
        b1.x -= nx * (overlap * 0.5)
        b1.y -= ny * (overlap * 0.5)
        b2.x += nx * (overlap * 0.5)
        b2.y += ny * (overlap * 0.5)

        // Kecepatan relatif
        const kx = b1.vx - b2.vx
        const ky = b1.vy - b2.vy
        const p = 2 * (nx * kx + ny * ky) / 2 // Massa kedua bola sama (1:1)

        // Hanya pantul jika kedua bola sedang mendekat
        if (p > 0) {
          b1.vx -= p * nx * ballRestitution
          b1.vy -= p * ny * ballRestitution
          b2.vx += p * nx * ballRestitution
          b2.vy += p * ny * ballRestitution

          // Terapkan efek Topspin / Backspin (Draw / Follow shot) pada bola putih
          if ((b1.number === 0 || b2.number === 0) && shotTracker.spinY && shotTracker.shotAngle !== undefined) {
            const cue = b1.number === 0 ? b1 : b2
            const sa = shotTracker.shotAngle
            const spin = shotTracker.spinY // -1 (backspin) to 1 (topspin)
            const speedMagnitude = Math.hypot(cue.vx, cue.vy) || 3

            if (spin < -0.1) {
              // Backspin / Draw: tarik mundur ke arah berlawanan tembakan
              cue.vx -= Math.cos(sa) * (speedMagnitude * Math.abs(spin) * 0.65)
              cue.vy -= Math.sin(sa) * (speedMagnitude * Math.abs(spin) * 0.65)
            } else if (spin > 0.1) {
              // Topspin / Follow: dorong maju ke arah tembakan
              cue.vx += Math.cos(sa) * (speedMagnitude * spin * 0.5)
              cue.vy += Math.sin(sa) * (speedMagnitude * spin * 0.5)
            }
            // Efek terpakai
            shotTracker.spinY = 0
          }

          const hitSpeed = Math.hypot(p * nx, p * ny)
          playBallCollisionSound(hitSpeed * 0.1)
        }
      }
    }
  }
}

/**
 * Validasi posisi bola putih saat Ball-in-Hand
 * Memastikan tidak menabrak bola lain dan berada dalam playfield
 */
export function isValidCuePlacement(x: number, y: number, balls: Ball[]): boolean {
  if (x - BALL_RADIUS < 5 || x + BALL_RADIUS > TABLE_WIDTH - 5) return false
  if (y - BALL_RADIUS < 5 || y + BALL_RADIUS > TABLE_HEIGHT - 5) return false

  // Cek tidak terlalu dekat dengan lubang
  for (const p of POCKETS) {
    if (Math.hypot(p.x - x, p.y - y) < p.radius + BALL_RADIUS) {
      return false
    }
  }

  // Cek tidak menabrak bola lain
  for (const b of balls) {
    if (b.number === 0 || b.isPocketed) continue
    if (Math.hypot(b.x - x, b.y - y) < BALL_RADIUS * 2 + 2) {
      return false
    }
  }

  return true
}

/**
 * Menemukan posisi valid terdekat untuk bola putih saat Ball-in-Hand.
 * Jika koordinat yang diminta terhalang bola lain atau terlalu dekat bantalan/lubang,
 * fungsi ini akan menggeser bola secara otomatis ke titik valid terdekat.
 */
export function findClosestValidCuePlacement(
  targetX: number,
  targetY: number,
  balls: Ball[]
): { x: number; y: number } {
  const minX = BALL_RADIUS + 6
  const maxX = TABLE_WIDTH - BALL_RADIUS - 6
  const minY = BALL_RADIUS + 6
  const maxY = TABLE_HEIGHT - BALL_RADIUS - 6

  const clampedX = Math.max(minX, Math.min(maxX, targetX))
  const clampedY = Math.max(minY, Math.min(maxY, targetY))

  if (isValidCuePlacement(clampedX, clampedY, balls)) {
    return { x: clampedX, y: clampedY }
  }

  // Spiral search ke luar untuk menemukan titik valid terdekat
  const maxRadius = 80
  const stepRadius = 4
  const angleSteps = 16

  for (let r = stepRadius; r <= maxRadius; r += stepRadius) {
    for (let i = 0; i < angleSteps; i++) {
      const angle = (i * 2 * Math.PI) / angleSteps
      const testX = Math.max(minX, Math.min(maxX, clampedX + Math.cos(angle) * r))
      const testY = Math.max(minY, Math.min(maxY, clampedY + Math.sin(angle) * r))
      if (isValidCuePlacement(testX, testY, balls)) {
        return { x: testX, y: testY }
      }
    }
  }

  // Fallback ke area aman head string
  const fallbackX = TABLE_WIDTH * 0.25
  const fallbackY = TABLE_HEIGHT * 0.5
  if (isValidCuePlacement(fallbackX, fallbackY, balls)) {
    return { x: fallbackX, y: fallbackY }
  }

  return { x: clampedX, y: clampedY }
}
