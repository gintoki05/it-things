/**
 * Billiard 98 — AI Bot Engine
 * Pure TypeScript algoritma, tanpa ML/API eksternal.
 * Menggunakan pendekatan Ghost Ball + Raycasting + Scoring.
 */

import { Ball, BallGroup, GameState } from "./types"
import {
  POCKETS,
  TABLE_WIDTH,
  TABLE_HEIGHT,
  BALL_RADIUS,
  CUSHION_WIDTH,
} from "./physics"

export type AiDifficulty = "easy" | "medium" | "hard"

interface ShotCandidate {
  angle: number
  power: number
  score: number
  targetBallId: number
  pocketIdx: number
}

/** Batas area aman dalam meja (excludes cushion) */
const PLAY_MIN_X = CUSHION_WIDTH
const PLAY_MAX_X = TABLE_WIDTH - CUSHION_WIDTH
const PLAY_MIN_Y = CUSHION_WIDTH
const PLAY_MAX_Y = TABLE_HEIGHT - CUSHION_WIDTH

/**
 * Hitung posisi Ghost Ball — titik di mana bola putih harus berada
 * untuk mendorong `targetBall` ke arah `pocket`.
 */
function getGhostBallPos(
  targetBall: Ball,
  pocketX: number,
  pocketY: number
): { x: number; y: number } {
  const dx = targetBall.x - pocketX
  const dy = targetBall.y - pocketY
  const dist = Math.hypot(dx, dy) || 1
  const nx = dx / dist
  const ny = dy / dist
  return {
    x: targetBall.x + nx * BALL_RADIUS * 2,
    y: targetBall.y + ny * BALL_RADIUS * 2,
  }
}

/**
 * Cek apakah jalur lurus antara (x1,y1) → (x2,y2) bebas dari bola lain.
 * `ignoreBallIds` = bola yang tidak dihitung (target bola itu sendiri dan cue ball).
 */
function isPathClear(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  balls: Ball[],
  ignoreBallIds: number[]
): boolean {
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.hypot(dx, dy)
  if (length < 0.001) return true

  const nx = dx / length
  const ny = dy / length

  for (const b of balls) {
    if (b.isPocketed) continue
    if (ignoreBallIds.includes(b.id)) continue

    // Jarak tegak lurus bola ke garis lintasan
    const toX = b.x - x1
    const toY = b.y - y1
    const proj = toX * nx + toY * ny

    // Hanya cek bola yang berada di antara titik awal dan akhir
    if (proj < -BALL_RADIUS || proj > length + BALL_RADIUS) continue

    const perpX = toX - proj * nx
    const perpY = toY - proj * ny
    const perpDist = Math.hypot(perpX, perpY)

    if (perpDist < BALL_RADIUS * 2 - 0.5) return false
  }

  return true
}

/**
 * Apakah posisi ghost ball berada di dalam area bermain?
 */
function isGhostBallInBounds(gx: number, gy: number): boolean {
  return (
    gx >= PLAY_MIN_X + BALL_RADIUS &&
    gx <= PLAY_MAX_X - BALL_RADIUS &&
    gy >= PLAY_MIN_Y + BALL_RADIUS &&
    gy <= PLAY_MAX_Y - BALL_RADIUS
  )
}

/**
 * Tambahkan error human-like ke angle dan power berdasarkan difficulty.
 */
function injectError(
  angle: number,
  power: number,
  difficulty: AiDifficulty
): { angle: number; power: number } {
  const config = {
    easy: { angleDeg: 7, powerVariance: 0.28 },
    medium: { angleDeg: 2.2, powerVariance: 0.10 },
    hard: { angleDeg: 0.35, powerVariance: 0.03 },
  }

  const { angleDeg, powerVariance } = config[difficulty]
  const maxAngleRad = (angleDeg * Math.PI) / 180

  // Gaussian-ish error: rata-rata dua random dan kurangkan 1
  const randGauss = () => (Math.random() + Math.random() - 1)

  const angleError = randGauss() * maxAngleRad
  const powerError = randGauss() * powerVariance

  return {
    angle: angle + angleError,
    power: Math.max(0.15, Math.min(1.0, power + powerError)),
  }
}

/**
 * Scoring kandidat tembakan.
 * Skor lebih tinggi = lebih diprioritaskan.
 */
function scoreShotCandidate(
  cueBall: Ball,
  targetBall: Ball,
  ghostX: number,
  ghostY: number,
  pocketIdx: number,
  balls: Ball[]
): number {
  const pocket = POCKETS[pocketIdx]

  // Jarak cue ball ke ghost ball (lebih dekat = lebih oke)
  const cueDist = Math.hypot(cueBall.x - ghostX, cueBall.y - ghostY)

  // Jarak target ball ke pocket (lebih dekat = lebih gampang)
  const targetDist = Math.hypot(targetBall.x - pocket.x, targetBall.y - pocket.y)

  // Sudut cut angle (ghost ball relative ke target ball ke pocket)
  // Sudut kecil = tembakan lebih lurus = lebih mudah
  const dx1 = ghostX - targetBall.x
  const dy1 = ghostY - targetBall.y
  const dx2 = pocket.x - targetBall.x
  const dy2 = pocket.y - targetBall.y
  const dot = dx1 * dx2 + dy1 * dy2
  const len1 = Math.hypot(dx1, dy1) || 1
  const len2 = Math.hypot(dx2, dy2) || 1
  const cosAngle = Math.max(-1, Math.min(1, dot / (len1 * len2)))
  const cutAngle = Math.acos(cosAngle)

  // Filter cut angle terlalu ekstrem (>75°)
  if (cutAngle > (75 * Math.PI) / 180) return -1000

  // Bonus untuk corner pocket (radius lebih besar)
  const isCornerPocket = pocketIdx === 0 || pocketIdx === 2 || pocketIdx === 3 || pocketIdx === 5
  const pocketBonus = isCornerPocket ? 15 : 0

  const score =
    200 -
    cueDist * 0.3 -
    targetDist * 0.5 -
    cutAngle * 30 +
    pocketBonus

  return score
}

/**
 * Fungsi utama AI: cari tembakan terbaik dari semua bola valid dan semua pocket.
 * Returns kandidat tembakan terbaik atau null kalau tidak ada yang valid.
 */
export function findBestShot(
  balls: Ball[],
  targetGroup: BallGroup | null,
  gameState: GameState,
  difficulty: AiDifficulty
): { angle: number; power: number } {
  const cueBall = balls.find((b) => b.number === 0 && !b.isPocketed)
  if (!cueBall) return { angle: 0, power: 0.5 }

  // Tentukan bola yang harus ditembak bot (player2)
  const targetBalls = balls.filter((b) => {
    if (b.isPocketed || b.number === 0) return false

    // Saat open table atau belum ada grup, tembak bola apapun
    if (gameState.openTable || targetGroup === null) return b.number !== 8

    // Kalau tinggal 8 ball (semua bola grup sudah masuk)
    const groupRemaining = balls.filter(
      (x) => !x.isPocketed && x.type === targetGroup
    )
    if (groupRemaining.length === 0) return b.number === 8

    return b.type === targetGroup
  })

  const candidates: ShotCandidate[] = []

  for (const target of targetBalls) {
    for (let pIdx = 0; pIdx < POCKETS.length; pIdx++) {
      const pocket = POCKETS[pIdx]

      // Hitung posisi ghost ball
      const ghost = getGhostBallPos(target, pocket.x, pocket.y)

      // Ghost ball harus dalam batas meja
      if (!isGhostBallInBounds(ghost.x, ghost.y)) continue

      // Cek jalur bola putih → ghost ball (tidak boleh ada bola penghalang)
      if (
        !isPathClear(cueBall.x, cueBall.y, ghost.x, ghost.y, balls, [
          cueBall.id,
          target.id,
        ])
      )
        continue

      // Cek jalur target ball → pocket (tidak boleh ada bola penghalang)
      if (
        !isPathClear(target.x, target.y, pocket.x, pocket.y, balls, [
          cueBall.id,
          target.id,
        ])
      )
        continue

      const score = scoreShotCandidate(
        cueBall,
        target,
        ghost.x,
        ghost.y,
        pIdx,
        balls
      )
      if (score < -999) continue

      // Hitung angle dari cue ball ke ghost ball position
      const angle = Math.atan2(ghost.y - cueBall.y, ghost.x - cueBall.x)

      // Power proporsional dengan jarak (semakin jauh sedikit lebih kencang)
      const dist = Math.hypot(cueBall.x - ghost.x, cueBall.y - ghost.y)
      const basePower = Math.max(0.3, Math.min(0.9, dist / 400 + 0.35))

      candidates.push({ angle, power: basePower, score, targetBallId: target.id, pocketIdx: pIdx })
    }
  }

  // Kalau tidak ada kandidat valid, lakukan safety shot (tembak random)
  if (candidates.length === 0) {
    return getSafetyShot(cueBall, balls, difficulty)
  }

  // Sort berdasarkan skor tertinggi
  candidates.sort((a, b) => b.score - a.score)

  // Hard selalu ambil terbaik, medium sedikit variasi, easy agak random
  let chosen = candidates[0]
  if (difficulty === "easy" && candidates.length > 1) {
    // Easy: pilih dari top-3 secara random
    const pool = candidates.slice(0, Math.min(3, candidates.length))
    chosen = pool[Math.floor(Math.random() * pool.length)]
  } else if (difficulty === "medium" && candidates.length > 1) {
    // Medium: pilih dari top-2
    const pool = candidates.slice(0, Math.min(2, candidates.length))
    chosen = pool[Math.floor(Math.random() * pool.length)]
  }

  return injectError(chosen.angle, chosen.power, difficulty)
}

/**
 * Safety shot — dipakai saat tidak ada tembakan valid (kalau semua terhalang).
 * Tembak ke bola terdekat dengan power rendah.
 */
function getSafetyShot(
  cueBall: Ball,
  balls: Ball[],
  difficulty: AiDifficulty
): { angle: number; power: number } {
  const activeBalls = balls.filter((b) => !b.isPocketed && b.number !== 0)

  if (activeBalls.length === 0) {
    return { angle: Math.random() * Math.PI * 2, power: 0.3 }
  }

  // Cari bola non-cue terdekat
  let nearest = activeBalls[0]
  let minDist = Math.hypot(cueBall.x - nearest.x, cueBall.y - nearest.y)
  for (const b of activeBalls) {
    const d = Math.hypot(cueBall.x - b.x, cueBall.y - b.y)
    if (d < minDist) {
      minDist = d
      nearest = b
    }
  }

  const angle = Math.atan2(nearest.y - cueBall.y, nearest.x - cueBall.x)
  const power = difficulty === "easy" ? 0.25 + Math.random() * 0.2 : 0.35

  return injectError(angle, power, difficulty)
}

/**
 * Hitung angle tembakan saja (untuk animasi aim stik bot).
 * Sama seperti findBestShot tapi tanpa inject error (untuk visual aiming).
 */
export function calculateAimAngle(
  balls: Ball[],
  targetGroup: BallGroup | null,
  gameState: GameState
): number {
  const cueBall = balls.find((b) => b.number === 0 && !b.isPocketed)
  if (!cueBall) return 0

  const result = findBestShot(balls, targetGroup, gameState, "hard")
  return result.angle
}

/**
 * Pilih random komentar bot berdasarkan situasi.
 */
export function getBotComment(situation: "start" | "pocket" | "foul" | "win" | "thinking"): string {
  const comments: Record<string, string[]> = {
    start: ["Siap bermain!", "Mulai permainan!", "Ayo mulai!", "Fokus..."],
    pocket: ["Mantap!", "Masuk!", "Yes!", "Gampang.", "Hehe..."],
    foul: ["Aduh...", "Yaah...", "Sial.", "Next shot."],
    win: ["GG!", "Menang lagi!", "Terlalu mudah.", "Coba lagi ya!"],
    thinking: ["Hmm...", "Mikir dulu...", "Kalkulasi...", "..."],
  }
  const list = comments[situation]
  return list[Math.floor(Math.random() * list.length)]
}
