import { Ball, BallGroup, GameState, PlayerId, ShotResult } from "./types"
import { getBallType, TABLE_WIDTH, TABLE_HEIGHT } from "./physics"
import { playFoulSound, playVictorySound } from "./sound"

export interface RuleEvaluationResult {
  nextTurn: PlayerId
  nextPhase: "aiming" | "ball_in_hand" | "game_over"
  winner: PlayerId | null
  winReason: string | null
  foulMessage: string | null
  assignedGroups?: {
    player1: BallGroup | null
    player2: BallGroup | null
  }
  openTable: boolean
}

/**
 * Menghitung sisa bola untuk grup tertentu yang belum masuk lubang
 */
export function countRemainingBalls(balls: Ball[], group: BallGroup): number {
  return balls.filter(
    (b) => !b.isPocketed && getBallType(b.number) === group
  ).length
}

/**
 * Mengevaluasi aturan resmi 8-Ball Pool setelah sebuah tembakan selesai
 */
export function evaluateShot(
  gameState: GameState,
  balls: Ball[],
  shotResult: ShotResult
): RuleEvaluationResult {
  const currentShooter = gameState.currentTurn
  const opponent: PlayerId = currentShooter === "player1" ? "player2" : "player1"

  const shooterInfo = gameState[currentShooter]
  const opponentInfo = gameState[opponent]

  let foulOccurred = false
  let foulMessage: string | null = null
  let openTable = gameState.openTable
  let assignedGroups = {
    player1: gameState.player1.group,
    player2: gameState.player2.group,
  }

  // ── 1. Cek Kejadian Bola Putih Masuk (Scratch) ──
  if (shotResult.cueBallPocketed) {
    foulOccurred = true
    foulMessage = "Scratch! Bola putih masuk kantong."
  }

  // ── 2. Cek Kejadian Bola 8 Hitam Masuk ──
  if (shotResult.eightBallPocketed) {
    // Jika bola 8 masuk saat break shot
    if (gameState.isBreakShot) {
      if (shotResult.cueBallPocketed) {
        // Scratch + bola 8 masuk saat break: Kalah
        playFoulSound()
        return {
          nextTurn: opponent,
          nextPhase: "game_over",
          winner: opponent,
          winReason: `${shooterInfo.name} scratch saat bola 8 masuk di pukulan break.`,
          foulMessage: "Scratch pada bola 8!",
          openTable,
        }
      } else {
        // Bola 8 masuk bersih saat break: Menang spektakuler!
        playVictorySound()
        return {
          nextTurn: currentShooter,
          nextPhase: "game_over",
          winner: currentShooter,
          winReason: `${shooterInfo.name} memasukkan bola 8 langsung saat break shot!`,
          foulMessage: null,
          openTable,
        }
      }
    }

    // Jika bola 8 masuk di tembakan reguler:
    // Cek apakah pemain ini sudah memasukkan seluruh bolanya
    const shooterGroup = shooterInfo.group
    const remainingBalls = shooterGroup ? countRemainingBalls(balls, shooterGroup) : 7

    if (foulOccurred || shotResult.cueBallPocketed) {
      // Scratch saat memasukkan bola 8 = KALAH
      playFoulSound()
      return {
        nextTurn: opponent,
        nextPhase: "game_over",
        winner: opponent,
        winReason: `${shooterInfo.name} melakukan foul/scratch saat bola 8 masuk!`,
        foulMessage: "Kalah: Foul pada bola 8.",
        openTable,
      }
    }

    if (remainingBalls > 0 || openTable || !shooterGroup) {
      // Masukin bola 8 sebelum bolanya habis = KALAH
      playFoulSound()
      return {
        nextTurn: opponent,
        nextPhase: "game_over",
        winner: opponent,
        winReason: `${shooterInfo.name} memasukkan bola 8 sebelum seluruh bolanya habis!`,
        foulMessage: "Kalah: Bola 8 masuk terlalu cepat.",
        openTable,
      }
    }

    // Bola 8 masuk sah saat semua bola habis = MENANG!
    playVictorySound()
    return {
      nextTurn: currentShooter,
      nextPhase: "game_over",
      winner: currentShooter,
      winReason: `${shooterInfo.name} berhasil memasukkan bola 8 dan memenangkan pertandingan!`,
      foulMessage: null,
      openTable,
    }
  }

  // ── 3. Cek Sentuhan Pertama (First Contact) ──
  if (!gameState.isBreakShot) {
    if (shotResult.firstBallHit === null) {
      foulOccurred = true
      foulMessage = "Foul! Bola putih tidak menyentuh bola sasaran apa pun."
    } else if (!openTable && shooterInfo.group) {
      const shooterGroup = shooterInfo.group
      const remainingOfGroup = countRemainingBalls(balls, shooterGroup)
      const hitBallType = getBallType(shotResult.firstBallHit)

      if (remainingOfGroup > 0) {
        // Masih ada bola grup sendiri, harus kena bola grup sendiri dulu
        if (hitBallType !== shooterGroup) {
          foulOccurred = true
          foulMessage = `Foul! Bola putih mengenai bola ${hitBallType === "eight" ? "hitam (8)" : "lawan"} terlebih dahulu.`
        }
      } else {
        // Bola grup sendiri sudah habis, bola yang harus disentuh wajib bola 8
        if (hitBallType !== "eight") {
          foulOccurred = true
          foulMessage = "Foul! Seluruh bola grup lu sudah habis, wajib mengenai bola 8."
        }
      }
    }
  }

  // ── 4. Alokasi Grup (Solid vs Stripe) saat Open Table ──
  const validPocketed = shotResult.pocketedBalls.filter(
    (n) => n !== 0 && n !== 8
  )

  if (openTable && !gameState.isBreakShot && !foulOccurred && validPocketed.length > 0) {
    const firstPocketedType = getBallType(validPocketed[0])
    if (firstPocketedType === "solid" || firstPocketedType === "stripe") {
      openTable = false
      const otherGroup: BallGroup = firstPocketedType === "solid" ? "stripe" : "solid"
      if (currentShooter === "player1") {
        assignedGroups = {
          player1: firstPocketedType,
          player2: otherGroup,
        }
      } else {
        assignedGroups = {
          player1: otherGroup,
          player2: firstPocketedType,
        }
      }
    }
  }

  // ── 5. Evaluasi Kelanjutan Giliran ──
  if (foulOccurred) {
    playFoulSound()
    // Kembalikan bola putih ke meja jika scratch
    const cueBall = balls.find((b) => b.number === 0)
    if (cueBall) {
      cueBall.isPocketed = false
      cueBall.pocketAnimationProgress = undefined
      cueBall.x = TABLE_WIDTH * 0.25
      cueBall.y = TABLE_HEIGHT * 0.5
      cueBall.vx = 0
      cueBall.vy = 0
    }

    return {
      nextTurn: opponent,
      nextPhase: "ball_in_hand",
      winner: null,
      winReason: null,
      foulMessage,
      assignedGroups,
      openTable,
    }
  }

  // Jika tidak foul, cek apakah ada bola sah yang masuk
  let keepTurn = false
  if (validPocketed.length > 0) {
    if (openTable) {
      keepTurn = true
    } else {
      const shooterGroup = assignedGroups[currentShooter]
      const pocketedOwnBall = validPocketed.some(
        (n) => getBallType(n) === shooterGroup
      )
      if (pocketedOwnBall) {
        keepTurn = true
      }
    }
  }

  return {
    nextTurn: keepTurn ? currentShooter : opponent,
    nextPhase: "aiming",
    winner: null,
    winReason: null,
    foulMessage: null,
    assignedGroups,
    openTable,
  }
}
