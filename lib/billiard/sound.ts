// Web Audio API Retro Sound Generator for Billiard 98
// Menghasilkan efek suara fisika bola biliar sintetis tanpa aset file eksternal

let audioCtx: AudioContext | null = null
let soundEnabled = true

export function setBilliardSoundEnabled(enabled: boolean) {
  soundEnabled = enabled
}

export function isBilliardSoundEnabled(): boolean {
  return soundEnabled
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

/**
 * Suara pukulan stik ke bola putih
 * @param power 0.1 s.d. 1.0 (kekuatan dorongan stik)
 */
export function playCueHitSound(power = 0.5) {
  if (!soundEnabled) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    // Pitch rendah dan punchy
    osc.type = "triangle"
    const startFreq = 220 + power * 150
    osc.frequency.setValueAtTime(startFreq, now)
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.08)

    const vol = Math.min(0.8, 0.2 + power * 0.5)
    gain.gain.setValueAtTime(vol, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.1)
  } catch {
    // Abaikan error audio autoplay
  }
}

/**
 * Suara benturan antar dua bola biliar (acrylic ball click)
 * @param intensity 0.05 s.d. 1.0 (kecepatan relatif benturan)
 */
export function playBallCollisionSound(intensity = 0.5) {
  if (!soundEnabled) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    const clampedIntensity = Math.max(0.05, Math.min(1.0, intensity))
    const vol = clampedIntensity * 0.4

    // Benturan bola akrilik memiliki pitch tinggi dengan klik tajam
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(1200 + Math.random() * 200, now)
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.035)

    gain.gain.setValueAtTime(vol, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.04)
  } catch {
    // Ignore
  }
}

/**
 * Suara bola membentur bantalan karet meja (cushion thud)
 */
export function playCushionSound(intensity = 0.5) {
  if (!soundEnabled) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    const clamped = Math.max(0.05, Math.min(1.0, intensity))
    const vol = clamped * 0.35

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(140, now)
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.06)

    gain.gain.setValueAtTime(vol, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.07)
  } catch {
    // Ignore
  }
}

/**
 * Suara bola masuk lubang kantong meja
 */
export function playPocketSound() {
  if (!soundEnabled) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    // Bunyi plop & roll masuk kantong
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(300, now)
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.15)

    gain.gain.setValueAtTime(0.4, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.2)
  } catch {
    // Ignore
  }
}

/**
 * Suara foul / scratch (retro Windows error / chord)
 */
export function playFoulSound() {
  if (!soundEnabled) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sawtooth"
    osc.frequency.setValueAtTime(150, now)
    osc.frequency.setValueAtTime(110, now + 0.1)

    gain.gain.setValueAtTime(0.25, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.35)
  } catch {
    // Ignore
  }
}

/**
 * Fanfare retro saat menang game
 */
export function playVictorySound() {
  if (!soundEnabled) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.12
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "triangle"
      osc.frequency.setValueAtTime(freq, startTime)

      gain.gain.setValueAtTime(0.3, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + 0.28)
    })
  } catch {
    // Ignore
  }
}

/**
 * Bunyi tick peringatan saat timer mendekati 0
 */
export function playTimerTickSound() {
  if (!soundEnabled) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(800, now)

    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.06)
  } catch {
    // Ignore
  }
}

/**
 * Suara pop / chime saat mengirim atau menerima emoji reaction
 */
export function playReactionSound() {
  if (!soundEnabled) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(440, now)
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08)

    gain.gain.setValueAtTime(0.25, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.13)
  } catch {
    // Ignore
  }
}

