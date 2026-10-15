import * as THREE from "three"
import { playTennisHitSound, playTennisBounceSound, playTennisNetSound, playCrowdCheerSound, playCrowdGaspSound, playWhistleSound, playVictoryFanfare } from "./audio"
import { LoadedMiiActor } from "./glb-models"

export type BallState = "idle_serve" | "serving_toss" | "in_play" | "point_ended"
export type Hitter = "player" | "opponent" | null
export type ShotQuality = "early" | "perfect" | "late" | "miss"

export interface CourtBounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  netZ: number
  netHeight: number
  serviceLineZ: number
}

// Dimensi Lapangan Berdasarkan Skala Model GLB Wii Sports
export const COURT_BOUNDS: CourtBounds = {
  minX: -4.8,
  maxX: 4.8,
  minZ: -12.2,
  maxZ: 12.2,
  netZ: 0,
  netHeight: 1.08,
  serviceLineZ: 6.4,
}

// Gravitasi Terkalibrasi Lapangan Tenis (Memberikan lengkungan parabola alami & waktu reaksi arcade yang seimbang)
export const TENNIS_GRAVITY = 15.6

export interface ScoreState {
  playerPoints: number // 0, 15, 30, 40, Advantage (45)
  opponentPoints: number
  playerGames: number
  opponentGames: number
  server: "player" | "opponent"
  isDeuce: boolean
  pointBanner: string | null
  rallyCount: number
  matchWinner: "player" | "opponent" | null
}

export type TennisScore = ScoreState

export class TennisPhysicsEngine {
  // Posisi & Kecepatan Bola 3D
  public ballPos = new THREE.Vector3(0, 0.9, 9.2)
  public ballVel = new THREE.Vector3(0, 0, 0)
  public ballSpin = new THREE.Vector3(0, 0, 0)
  public ballRadius = 0.115

  // State Pertandingan
  public state: BallState = "idle_serve"
  public lastHitter: Hitter = null
  public bounceCountThisSide = 0
  public currentSide: "player" | "opponent" = "player"
  public hasCrossedNet = false

  // Posisi Karakter
  public playerTargetX = 0
  public playerCurrentX = 0
  public playerZ = 9.2

  // Tangan dominan pemain (dipilih dari HP). Kanan = raket di sisi +X dunia (pemain menghadap -Z).
  public playerHandedness: "right" | "left" = "right"

  /** +1 untuk tangan kanan, -1 untuk kidal (mirror semua offset sisi raket) */
  public get playerHandSign(): number {
    return this.playerHandedness === "left" ? -1 : 1
  }

  public setPlayerHandedness(h: "right" | "left") {
    this.playerHandedness = h === "left" ? "left" : "right"
  }

  /** Bola ada di sisi raket (forehand) pemain? Persis seperti Wii Sports: stroke dipilih dari posisi bola. */
  public isBallOnPlayerForehandSide(): boolean {
    return (this.ballPos.x - this.playerCurrentX) * this.playerHandSign >= 0
  }

  public opponentTargetX = 0
  public opponentCurrentX = 0
  public opponentZ = -9.2
  public opponentIsSwinging = false

  // Score
  public score: ScoreState = {
    playerPoints: 0,
    opponentPoints: 0,
    playerGames: 0,
    opponentGames: 0,
    server: "player",
    isDeuce: false,
    pointBanner: null,
    rallyCount: 0,
    matchWinner: null,
  }

  // Target pendaratan bola yang diprediksi (untuk AI & Auto-run)
  public predictedLanding = new THREE.Vector3(0, 0.15, -9.2)

  // Feedback banner sementara (e.g. "NICE SHOT!", "OUT!", "FAULT!")
  public hitFeedback: { text: string; color: string; duration: number } | null = null

  // State Animasi & Ayunan Lawan (Bot AI 60fps Frame Synced)
  public opponentSwingState: {
    active: boolean
    progress: number
    type: "forehand" | "backhand" | "serve"
    hitEvaluated: boolean
  } = {
    active: false,
    progress: 0,
    type: "serve",
    hitEvaluated: false,
  }
  private opponentServeTimer = 0
  private opponentServeTossed = false

  // Callback listeners
  public onScoreUpdate?: (score: ScoreState) => void
  public onScoreChange?: (score: ScoreState, winner?: "player" | "opponent") => void
  public onFeedback?: (text: string, color: string) => void
  public onBallContact?: (details: { hitter: "player" | "opponent"; isSmash: boolean; speed: number; quality: string }) => void
  public onBallHit?: (details: { hitter: "player" | "opponent"; isSmash: boolean; speed: number; quality: string }) => void

  constructor(
    onScoreUpdate?: (score: ScoreState) => void,
    onFeedback?: (text: string, color: string) => void,
    onBallContact?: (details: { hitter: "player" | "opponent"; isSmash: boolean; speed: number; quality: string }) => void,
    onScoreChange?: (score: ScoreState, winner?: "player" | "opponent") => void
  ) {
    this.onScoreUpdate = onScoreUpdate
    this.onFeedback = onFeedback
    this.onBallContact = onBallContact
    this.onScoreChange = onScoreChange
    this.resetToServe(this.score.server)
  }

  /**
   * Setel posisi siap servis
   */
  public resetToServe(server: "player" | "opponent") {
    this.state = "idle_serve"
    this.lastHitter = null
    this.bounceCountThisSide = 0
    this.score.server = server
    this.hasCrossedNet = false
    this.opponentIsSwinging = false
    this.opponentSwingState = {
      active: false,
      progress: 0,
      type: "serve",
      hitEvaluated: false,
    }
    this.opponentServeTimer = 0
    this.opponentServeTossed = false

    if (server === "player") {
      this.currentSide = "player"
      this.playerCurrentX = 1.2
      this.playerTargetX = 1.2
      this.ballPos.set(1.5, 0.9, 9.2)
      this.ballVel.set(0, 0, 0)
    } else {
      this.currentSide = "opponent"
      this.opponentCurrentX = -1.2
      this.opponentTargetX = -1.2
      this.ballPos.set(-1.5, 0.9, -9.2)
      this.ballVel.set(0, 0, 0)
    }

    this.notifyScore()
  }

  // State Efek Spesial (Rocket Serve & Smash)
  public isRocketServe = false
  public isSmashShot = false

  /**
   * Lempar bola ke atas untuk Servis (Toss Tinggi Khas Tenis Pro)
   */
  public triggerServeToss(): boolean {
    if (this.state !== "idle_serve") return false

    this.state = "serving_toss"
    this.isRocketServe = false
    this.isSmashShot = false
    // Kecepatan vertikal 8.2 m/s melontarkan bola tinggi hingga ketinggian ~3.1m
    this.ballVel.set(0, 8.2, 0)
    return true
  }

  /**
   * Eksekusi Pukulan Pemain (Forehand / Backhand / Serve / Smash)
   */
  public handlePlayerSwing(
    swingType?: "forehand" | "backhand" | "serve" | "smash",
    powerMultiplier = 1.0
  ): ShotQuality {
    // 1. Jika dalam mode lempar bola servis (Serving Toss)
    if (this.state === "serving_toss" && this.score.server === "player") {
      // Strike window servis overhead saat bola melayang di udara tinggi
      if (this.ballPos.y > 1.6 && this.ballPos.y < 3.4) {
        // Deteksi ROCKET SERVE: Jika dipukul tepat di apex toss (y >= 2.85m atau vy hampir 0) atau tipe pukulan smash
        const isApexHit = this.ballPos.y >= 2.85 || Math.abs(this.ballVel.y) < 2.0 || swingType === "smash"
        this.isRocketServe = isApexHit
        this.isSmashShot = false

        // Snap bola ke sweet spot raket servis di atas kepala
        this.ballPos.set(
          this.playerCurrentX + 0.35 * this.playerHandSign,
          Math.min(3.1, Math.max(2.1, this.ballPos.y)),
          this.playerZ - 0.35
        )
        this.executeServe("player", isApexHit, powerMultiplier)

        const hitSpeed = Math.hypot(this.ballVel.x, this.ballVel.y, this.ballVel.z)
        const contactDetails = {
          hitter: "player" as const,
          isSmash: isApexHit,
          speed: hitSpeed,
          quality: isApexHit ? "rocket" : "good",
        }
        this.onBallContact?.(contactDetails)
        this.onBallHit?.(contactDetails)

        return isApexHit ? "perfect" : "early"
      } else {
        // Servis miss
        this.showFeedback("FAULT! (Luput Toss)", "#ef4444")
        playTennisNetSound()
        this.awardPoint("opponent", "FAULT! (Miss Toss)")
        return "miss"
      }
    }

    // 2. Jika bola sedang in-play dan berada di sisi pemain (Z > 1.0)
    if (this.state === "in_play" && this.ballPos.z > 1.0) {
      const distZ = Math.abs(this.ballPos.z - this.playerZ)
      const distX = Math.abs(this.ballPos.x - this.playerCurrentX)

      // Strike zone toleran khas Wii Sports
      if (distZ < 2.8 && distX < 2.6 && this.ballPos.y > 0.25 && this.ballPos.y < 3.0) {
        let quality: ShotQuality = "perfect"
        let speedMult = 1.0
        let targetX = 0
        let targetZ = -6.8

        const hand = this.playerHandSign
        const isForehand =
          swingType === "forehand" ? true : swingType === "backhand" ? false : this.isBallOnPlayerForehandSide()
        const isSmash = this.ballPos.y > 2.0 || swingType === "smash"
        this.isSmashShot = isSmash
        this.isRocketServe = false

        // TIMING MEKANIK WII SPORTS (nilai X di bawah untuk tangan kanan, dikali `hand` agar kidal mirror):
        // Forehand:
        // Early (Z < 8.6) -> Cross-Court ke KIRI (-X)
        // Sweet spot (8.6 <= Z <= 9.6) -> Center Drive lurus bertenaga
        // Late (Z > 9.6) -> Down-the-Line ke KANAN (+X)
        //
        // Backhand:
        // Early (Z < 8.6) -> Cross-Court ke KANAN (+X)
        // Sweet spot (8.6 <= Z <= 9.6) -> Center Drive lurus bertenaga
        // Late (Z > 9.6) -> Down-the-Line ke KIRI (-X)

        if (this.ballPos.z < 8.6) {
          // EARLY SWING: Pukul lebih awal -> Tarik sudut silang tajam (Cross-court)
          quality = "early"
          speedMult = 1.05
          targetX = (isForehand ? -3.4 - Math.random() * 0.8 : 3.4 + Math.random() * 0.8) * hand
          targetZ = -5.4 - Math.random() * 1.2 // Jatuh pendek sudut sempit
        } else if (this.ballPos.z > 9.6) {
          // LATE SWING: Pukul agak telat -> Terdorong lurus ke samping (Down-the-line)
          quality = "late"
          speedMult = 0.92
          targetX = (isForehand ? 2.8 + Math.random() * 0.8 : -2.8 - Math.random() * 0.8) * hand
          targetZ = -6.2 - Math.random() * 1.2 // Kedalaman sedang
        } else {
          // ON-TIME / SWEET SPOT: Pukulan tepat di samping badan
          quality = "perfect"
          speedMult = 1.25
          // Drive kencang menembus ruang terbuka yang jauh dari posisi bot
          const openSide = this.opponentCurrentX > 0 ? -2.6 : 2.6
          targetX = openSide + (Math.random() - 0.5) * 1.4
          targetZ = -7.2 - Math.random() * 1.4 // Menembus dalam di depan baseline
        }

        // Tembakan Smash jika bola memantul tinggi di udara
        if (isSmash) {
          speedMult *= 1.3
          targetZ = -6.0 - Math.random() * 1.4 // Smash tajam menukik ke mid-court
        }

        // Terapkan pengali daya ayunan (power multiplier dari gesture / controller)
        speedMult = speedMult * (powerMultiplier ?? 1.0)

        // MAGNETISASI BOLA KE SWEET SPOT MESH RAKET (Presisi Kontak Visual & Fisika)
        if (isSmash) {
          this.ballPos.set(
            this.playerCurrentX + 0.35 * hand,
            Math.min(2.35, Math.max(1.8, this.ballPos.y)),
            this.playerZ - 0.35
          )
        } else if (!isForehand) {
          // Raket Backhand menyapu di sisi non-dominan badan pemain
          this.ballPos.set(
            this.playerCurrentX - 0.52 * hand,
            Math.max(0.65, Math.min(1.25, this.ballPos.y)),
            this.playerZ - 0.45
          )
        } else {
          // Raket Forehand menyapu di sisi tangan dominan pemain
          this.ballPos.set(
            this.playerCurrentX + 0.52 * hand,
            Math.max(0.65, Math.min(1.25, this.ballPos.y)),
            this.playerZ - 0.45
          )
        }

        // Hitung vektor kembali melintasi net ke seberang
        this.hitBallToOpponent(targetX, targetZ, speedMult, isSmash)
        this.lastHitter = "player"
        this.bounceCountThisSide = 0
        this.score.rallyCount++
        playTennisHitSound(speedMult, isSmash)

        const hitSpeed = Math.hypot(this.ballVel.x, this.ballVel.y, this.ballVel.z)
        const qualityStr = isSmash ? "smash" : quality === "perfect" ? "great" : "good"
        const contactDetails = {
          hitter: "player" as const,
          isSmash,
          speed: hitSpeed,
          quality: qualityStr,
        }
        this.onBallContact?.(contactDetails)
        this.onBallHit?.(contactDetails)

        return quality
      }
    }

    return "miss"
  }

  /**
   * Eksekusi Pukulan Servis
   */
  public executeServe(server: "player" | "opponent", isRocket = false, powerMultiplier = 1.0) {
    this.state = "in_play"
    this.lastHitter = server
    this.bounceCountThisSide = 0
    this.score.rallyCount = 1

    if (server === "player") {
      // Kecepatan servis normal 17.5 m/s, jika Rocket Serve melonjak ke 24.5 m/s!
      const speed = (isRocket ? 24.5 : 17.5) * (powerMultiplier ?? 1.0)
      const minNet = isRocket ? 0.22 : 0.35
      const targetX = (Math.random() - 0.5) * 3.4
      const targetZ = isRocket ? -5.8 : -4.8 - Math.random() * 1.4

      this.calculateTrajectory(this.ballPos, new THREE.Vector3(targetX, 0.15, targetZ), speed, minNet)
      playTennisHitSound(isRocket ? 1.5 : 1.2, true)
    } else {
      // AI Bot Servis ke kotak servis pemain (Z: 4.8 s.d. 6.2)
      const targetX = (Math.random() - 0.5) * 3.4
      const targetZ = 4.8 + Math.random() * 1.4
      this.calculateTrajectory(this.ballPos, new THREE.Vector3(targetX, 0.15, targetZ), 16.0, 0.35)
      playTennisHitSound(1.1, true)

      const hitSpeed = Math.hypot(this.ballVel.x, this.ballVel.y, this.ballVel.z)
      const contactDetails = {
        hitter: "opponent" as const,
        isSmash: false,
        speed: hitSpeed,
        quality: "good",
      }
      this.onBallContact?.(contactDetails)
      this.onBallHit?.(contactDetails)
    }

    this.predictFutureLanding()
  }

  /**
   * Eksekusi Pukulan Rally Bot Lawan
   */
  public executeOpponentHit(isForehand: boolean) {
    if (this.state !== "in_play") return

    // Snap bola ke sweet spot raket bot
    if (isForehand) {
      this.ballPos.set(
        this.opponentCurrentX + 0.52,
        Math.max(0.65, Math.min(1.25, this.ballPos.y)),
        this.opponentZ + 0.45
      )
    } else {
      this.ballPos.set(
        this.opponentCurrentX - 0.52,
        Math.max(0.65, Math.min(1.25, this.ballPos.y)),
        this.opponentZ + 0.45
      )
    }

    // Variasi strategi pukulan bot: Cross-Court vs Down-the-Line
    const botStrategy = Math.random()
    let targetX = 0
    if (botStrategy < 0.48) {
      targetX = isForehand ? -3.2 - Math.random() * 0.6 : 3.2 + Math.random() * 0.6
    } else if (botStrategy < 0.82) {
      targetX = isForehand ? 2.6 + Math.random() * 0.6 : -2.6 - Math.random() * 0.6
    } else {
      targetX = (Math.random() - 0.5) * 1.5
    }
    const speedMult = 0.98 + Math.random() * 0.22
    this.hitBallToPlayer(targetX, speedMult)

    this.lastHitter = "opponent"
    this.bounceCountThisSide = 0
    this.score.rallyCount++
    playTennisHitSound(speedMult, false)

    const hitSpeed = Math.hypot(this.ballVel.x, this.ballVel.y, this.ballVel.z)
    const contactDetails = {
      hitter: "opponent" as const,
      isSmash: false,
      speed: hitSpeed,
      quality: "good",
    }
    this.onBallContact?.(contactDetails)
    this.onBallHit?.(contactDetails)
  }

  /**
   * Menembakkan bola dari sisi pemain ke sisi musuh
   */
  private hitBallToOpponent(targetX: number, targetZ: number, speedMult = 1.0, isSmash = false) {
    const baseSpeed = isSmash ? 21.0 : 16.5 * speedMult
    const minNetMargin = isSmash ? 0.22 : 0.42

    this.calculateTrajectory(
      this.ballPos,
      new THREE.Vector3(targetX, 0.15, targetZ),
      baseSpeed,
      minNetMargin
    )
    this.predictFutureLanding()
  }

  /**
   * Menembakkan bola dari sisi bot lawan ke sisi pemain
   */
  private hitBallToPlayer(targetX: number, speedMult = 1.0) {
    // Bola diarahkan ke area rally pemain (Z: 6.4 s.d. 8.2) — tidak lagi kejauhan di belakang pemain
    const targetZ = 6.4 + Math.random() * 1.8
    const baseSpeed = 15.5 * speedMult
    const minNetMargin = 0.42

    this.calculateTrajectory(
      this.ballPos,
      new THREE.Vector3(targetX, 0.15, targetZ),
      baseSpeed,
      minNetMargin
    )
    this.predictFutureLanding()
  }

  /**
   * Hitung trajectory balistik fisik Three.js dari startPos menuju targetPos
   * Menjamin bola melewati net dengan aman dan jatuh TEPAT di titik target (xt, yt, zt)
   */
  private calculateTrajectory(start: THREE.Vector3, target: THREE.Vector3, speed: number, minNetMargin = 0.35) {
    const deltaX = target.x - start.x
    const deltaZ = target.z - start.z
    const horizDist = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ)

    // Waktu tempuh dasar berdasarkan kecepatan horizontal yang diinginkan
    let totalTime = Math.max(0.55, horizDist / speed)

    // Cek apakah bola menyeberang net (Z = 0)
    const hasNetCrossing = (start.z > 0 && target.z < 0) || (start.z < 0 && target.z > 0)
    if (hasNetCrossing) {
      const alpha = Math.abs(start.z) / (Math.abs(start.z) + Math.abs(target.z))
      const lineYAtNet = start.y * (1 - alpha) + target.y * alpha
      const requiredNetHeight = COURT_BOUNDS.netHeight + minNetMargin

      // Ketinggian parabola di net: y_net = lineYAtNet + 0.5 * TENNIS_GRAVITY * totalTime^2 * alpha * (1 - alpha)
      const neededBoost = requiredNetHeight - lineYAtNet
      if (neededBoost > 0) {
        const factor = 0.5 * TENNIS_GRAVITY * alpha * (1 - alpha)
        if (factor > 0) {
          const minTimeForNet = Math.sqrt(neededBoost / factor)
          if (totalTime < minTimeForNet) {
            totalTime = minTimeForNet
          }
        }
      }
    }

    // Kecepatan horizontal konstan
    this.ballVel.x = deltaX / totalTime
    this.ballVel.z = deltaZ / totalTime

    // Kecepatan vertikal vy yang secara matematis PASTI mendarat di target.y pada t = totalTime
    this.ballVel.y = (target.y - start.y + 0.5 * TENNIS_GRAVITY * totalTime * totalTime) / totalTime
  }

  /**
   * Prediksi titik jatuh bola di lapangan untuk auto-run pemain & bot
   */
  private predictFutureLanding() {
    let simPos = this.ballPos.clone()
    let simVel = this.ballVel.clone()
    const dt = 0.02
    const gravity = -TENNIS_GRAVITY

    for (let i = 0; i < 200; i++) {
      simPos.x += simVel.x * dt
      simPos.y += simVel.y * dt
      simPos.z += simVel.z * dt
      simVel.y += gravity * dt

      if (simPos.y <= 0.15) {
        this.predictedLanding.copy(simPos)
        this.predictedLanding.y = 0.15
        break
      }
    }

    // Set auto-target untuk pemain atau bot
    if (this.predictedLanding.z > 0) {
      // Menuju sisi pemain
      this.playerTargetX = Math.max(-4.2, Math.min(4.2, this.predictedLanding.x))
    } else {
      // Menuju sisi lawan
      this.opponentTargetX = Math.max(-4.2, Math.min(4.2, this.predictedLanding.x))
    }
  }

  /**
   * Perbarui fisika dan AI setiap frame (delta time)
   */
  public update(dt: number, opponentActor?: LoadedMiiActor, playerActor?: LoadedMiiActor) {
    // 0. Jika sedang menunggu servis, posisikan bola di samping tangan server
    if (this.state === "idle_serve") {
      if (this.score.server === "player") {
        // Bola dipegang tangan non-raket (sisi berlawanan dari tangan dominan)
        this.ballPos.set(this.playerCurrentX - 0.36 * this.playerHandSign, 0.96, this.playerZ - 0.22)
      } else {
        this.ballPos.set(this.opponentCurrentX - 0.36, 0.96, this.opponentZ + 0.22)
      }
      this.ballVel.set(0, 0, 0)
    }

    // 1. Update Feedback Banner timer
    if (this.hitFeedback) {
      this.hitFeedback.duration -= dt
      if (this.hitFeedback.duration <= 0) {
        this.hitFeedback = null
      }
    }

    // 2. Auto-Run Player (Lerp halus khas Wii Sports ke posisi intercept bola)
    if (this.state === "in_play" && this.ballPos.z > -1.0) {
      this.playerCurrentX = THREE.MathUtils.lerp(this.playerCurrentX, this.playerTargetX, 0.08)
    } else {
      // Kembali santai ke tengah baseline saat bola di seberang
      this.playerCurrentX = THREE.MathUtils.lerp(this.playerCurrentX, 0, 0.03)
    }

    // 3. AI Bot Logic (Opponent)
    this.updateOpponentAI(dt, opponentActor)

    // 4. Fisika Bola
    if (this.state === "serving_toss" || this.state === "in_play") {
      this.ballVel.y += -TENNIS_GRAVITY * dt

      this.ballPos.x += this.ballVel.x * dt
      this.ballPos.y += this.ballVel.y * dt
      this.ballPos.z += this.ballVel.z * dt

      // A. Deteksi Benturan Net (Z = 0)
      if (Math.abs(this.ballPos.z) < 0.25) {
        if (this.ballPos.y < COURT_BOUNDS.netHeight && Math.abs(this.ballPos.x) < 5.8) {
          // Bola tersangkut di net!
          playTennisNetSound()
          this.ballVel.set(0, -2, (this.ballVel.z > 0 ? -1 : 1) * 1.5)
          this.showFeedback("NET FAULT!", "#ef4444")
          const winner = this.lastHitter === "player" ? "opponent" : "player"
          this.awardPoint(winner, "NET FAULT!")
          return
        }
      }

      // B. Deteksi Pantulan Lapangan Rumput (Y <= 0.15)
      if (this.ballPos.y <= 0.15) {
        this.ballPos.y = 0.15

        // Cek apakah bola di dalam lapangan (In-bounds vs Out)
        const isInsideCourt =
          Math.abs(this.ballPos.x) <= COURT_BOUNDS.maxX &&
          Math.abs(this.ballPos.z) <= COURT_BOUNDS.maxZ

        // Jika pantulan pertama keluar lapangan -> OUT!
        if (this.bounceCountThisSide === 0 && !isInsideCourt) {
          playTennisBounceSound(0.7)
          this.showFeedback("OUT!", "#f87171")
          const winner = this.lastHitter === "player" ? "opponent" : "player"
          this.awardPoint(winner, "OUT OF BOUNDS!")
          return
        }

        // Pantulan sah di dalam lapangan (Fisika pantulan rumput yang realistis)
        playTennisBounceSound(0.65)
        this.ballVel.y = Math.abs(this.ballVel.y) * 0.65 // Restitusi pantulan
        this.ballVel.x *= 0.82 // Friksi rumput
        this.ballVel.z *= 0.82
        this.bounceCountThisSide++

        // Jika bola mantul 2 kali di satu sisi tanpa dipukul -> Double Bounce Point!
        if (this.bounceCountThisSide >= 2) {
          const sideWithDoubleBounce = this.ballPos.z > 0 ? "player" : "opponent"
          const winner = sideWithDoubleBounce === "player" ? "opponent" : "player"
          this.showFeedback("POINT!", "#fbbf24")
          this.awardPoint(winner, "DOUBLE BOUNCE!")
          return
        }
      }

      // C. Bola meluncur jatuh terlalu jauh melewati stadion
      if (this.ballPos.y < -3.0 || Math.abs(this.ballPos.z) > 22.0) {
        const winner = this.lastHitter === "player" ? "opponent" : "player"
        this.awardPoint(winner, "BALL OUT!")
      }
    }
  }

  /**
   * Logika AI Bot Lawan (Tracking, Auto-run, dan Pukulan Balik)
   */
  private updateOpponentAI(dt: number, _opponentActor?: LoadedMiiActor) {
    // 1. Logika Servis Lawan
    if (this.score.server === "opponent") {
      if (this.state === "idle_serve") {
        this.opponentServeTimer += dt
        // Jeda 1.1 detik agar pemain siap di baseline
        if (this.opponentServeTimer >= 1.1 && !this.opponentServeTossed) {
          this.opponentServeTossed = true
          this.triggerServeToss()
        }
        return
      }

      if (this.state === "serving_toss") {
        // Saat bola melambung tinggi ke udara mendekati puncak toss (y > 2.2 atau vy mulai turun)
        if (!this.opponentSwingState.active && (this.ballPos.y >= 2.2 || this.ballVel.y < 3.2)) {
          this.opponentSwingState = {
            active: true,
            progress: 0,
            type: "serve",
            hitEvaluated: false,
          }
        }
        return
      }
    }

    if (this.state !== "in_play") return

    // 2. Bot bergerak mengejar target bola di lapangannya (Z < 0)
    if (this.ballPos.z < 1.0) {
      this.opponentCurrentX = THREE.MathUtils.lerp(this.opponentCurrentX, this.opponentTargetX, 0.08)
    } else {
      this.opponentCurrentX = THREE.MathUtils.lerp(this.opponentCurrentX, 0, 0.03)
    }

    // 3. Deteksi waktu ayunan bot membalas pukulan selama rally
    const isApproachingBot = this.ballPos.z < -5.5 && this.ballPos.z > -11.2 && this.ballVel.z < 0
    const isBotStrikeZone = (this.bounceCountThisSide === 1 && this.ballPos.y < 1.6) || (Math.abs(this.ballPos.z - this.opponentZ) < 3.0)
    if (isApproachingBot && isBotStrikeZone && !this.opponentSwingState.active) {
      const distX = Math.abs(this.ballPos.x - this.opponentCurrentX)
      if (distX < 2.6 && this.ballPos.y > 0.3 && this.ballPos.y < 2.8) {
        const isForehand = this.ballPos.x >= this.opponentCurrentX
        this.opponentSwingState = {
          active: true,
          progress: 0,
          type: isForehand ? "forehand" : "backhand",
          hitEvaluated: false,
        }
      }
    }
  }

  /**
   * Catat perolehan poin dan evaluasi game / match
   */
  private awardPoint(winner: "player" | "opponent", reason: string) {
    if (this.state === "point_ended") return
    this.state = "point_ended"
    this.ballVel.set(0, 0, 0)

    if (winner === "player") {
      this.showFeedback("POINT PLAYER! 🎾", "#22c55e")
    } else {
      playWhistleSound()
      this.showFeedback("POINT OPPONENT!", "#ef4444")
    }

    // Sistem Skor Tenis Otentik (0 -> 15 -> 30 -> 40 -> Deuce -> Game)
    this.advanceTennisScore(winner)

    // Reset ke rally berikutnya setelah 2.2 detik
    setTimeout(() => {
      if (this.score.matchWinner) return
      const nextServer = this.score.server === "player" ? "opponent" : "player"
      this.resetToServe(nextServer)
    }, 2400)
  }

  /**
   * Logika Hitungan Skor Tenis (Love, 15, 30, 40, Deuce, Ad-In, Game)
   */
  private advanceTennisScore(winner: "player" | "opponent") {
    let pPts = this.score.playerPoints
    let oPts = this.score.opponentPoints

    if (winner === "player") {
      if (pPts === 0) pPts = 15
      else if (pPts === 15) pPts = 30
      else if (pPts === 30) pPts = 40
      else if (pPts === 40) {
        if (oPts === 40) {
          pPts = 45 // Advantage Player
        } else if (oPts === 45) {
          oPts = 40 // Back to Deuce
        } else {
          // Game Player!
          this.score.playerGames++
          pPts = 0
          oPts = 0
          this.showFeedback("GAME PLAYER! 🏆", "#10b981")
          playVictoryFanfare()
        }
      } else if (pPts === 45) {
        // Game Win from Advantage!
        this.score.playerGames++
        pPts = 0
        oPts = 0
        this.showFeedback("GAME PLAYER! 🏆", "#10b981")
        playVictoryFanfare()
      }
    } else {
      if (oPts === 0) oPts = 15
      else if (oPts === 15) oPts = 30
      else if (oPts === 30) oPts = 40
      else if (oPts === 40) {
        if (pPts === 40) {
          oPts = 45 // Advantage Opponent
        } else if (pPts === 45) {
          pPts = 40 // Back to Deuce
        } else {
          // Game Opponent!
          this.score.opponentGames++
          pPts = 0
          oPts = 0
          this.showFeedback("GAME OPPONENT!", "#ef4444")
        }
      } else if (oPts === 45) {
        // Game Win Opponent!
        this.score.opponentGames++
        pPts = 0
        oPts = 0
        this.showFeedback("GAME OPPONENT!", "#ef4444")
      }
    }

    this.score.playerPoints = pPts
    this.score.opponentPoints = oPts
    this.score.isDeuce = pPts === 40 && oPts === 40

    // Cek Match Winner (First to 2 Games / Sets)
    if (this.score.playerGames >= 2) {
      this.score.matchWinner = "player"
      this.showFeedback("🏆 MATCH VICTORY! YOU WIN! 🏆", "#3b82f6")
      playVictoryFanfare()
    } else if (this.score.opponentGames >= 2) {
      this.score.matchWinner = "opponent"
      this.showFeedback("MATCH OVER - OPPONENT WINS", "#94a3b8")
    }

    this.notifyScore(winner)
  }

  public showFeedback(text: string, color = "#ffffff") {
    this.hitFeedback = { text, color, duration: 2.2 }
    if (this.onFeedback) this.onFeedback(text, color)
  }

  private notifyScore(winner?: "player" | "opponent") {
    if (this.onScoreUpdate) {
      this.onScoreUpdate({ ...this.score })
    }
    if (this.onScoreChange) {
      this.onScoreChange({ ...this.score }, winner)
    }
  }

  /**
   * Reset seluruh match dari awal
   */
  public restartMatch() {
    this.score = {
      playerPoints: 0,
      opponentPoints: 0,
      playerGames: 0,
      opponentGames: 0,
      server: "player",
      isDeuce: false,
      pointBanner: null,
      rallyCount: 0,
      matchWinner: null,
    }
    this.resetToServe("player")
  }
}
