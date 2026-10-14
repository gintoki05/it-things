/**
 * Synthesizer Efek Audio Tenis Wii Sports murni menggunakan Web Audio API
 * Tidak membutuhkan file MP3 eksternal, latensi instan (<1ms) & zero download.
 */

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
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
 * 1. Pukulan Raket ("THWACK!")
 * Suara dentuman senar dan kayu yang tajam khas Wii Sports Tennis
 */
export function playTennisHitSound(power = 1.0, isSmash = false) {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime

  // A. String Snap (Noise Burst tajam)
  const bufferSize = ctx.sampleRate * 0.05
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15))
  }

  const noise = ctx.createBufferSource()
  noise.buffer = buffer

  const noiseFilter = ctx.createBiquadFilter()
  noiseFilter.type = "bandpass"
  noiseFilter.frequency.setValueAtTime(isSmash ? 2400 : 1800, now)
  noiseFilter.Q.setValueAtTime(3.0, now)

  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(Math.min(1.2, 0.7 * power), now)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)

  noise.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(ctx.destination)
  noise.start(now)

  // B. Racket Body Resonance (Frekuensi rendah beresonansi)
  const osc = ctx.createOscillator()
  const oscGain = ctx.createGain()

  osc.type = isSmash ? "triangle" : "sine"
  const startFreq = isSmash ? 380 : 280
  const endFreq = isSmash ? 90 : 70

  osc.frequency.setValueAtTime(startFreq, now)
  osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.09)

  oscGain.gain.setValueAtTime(Math.min(1.0, 0.8 * power), now)
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

  osc.connect(oscGain)
  oscGain.connect(ctx.destination)

  osc.start(now)
  osc.stop(now + 0.13)
}

/**
 * 2. Pantulan Bola di Lapangan ("Pock")
 */
export function playTennisBounceSound(volume = 0.6) {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = "sine"
  osc.frequency.setValueAtTime(220, now)
  osc.frequency.exponentialRampToValueAtTime(110, now + 0.06)

  gain.gain.setValueAtTime(volume, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(now)
  osc.stop(now + 0.08)
}

/**
 * 3. Bola Kena Jaring Net ("Thud")
 */
export function playTennisNetSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = "sawtooth"
  osc.frequency.setValueAtTime(140, now)
  osc.frequency.linearRampToValueAtTime(40, now + 0.1)

  gain.gain.setValueAtTime(0.5, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(now)
  osc.stop(now + 0.13)
}

/**
 * 4. Tepuk Tangan Penonton (Dinonaktifkan sesuai permintaan)
 */
export function playCrowdCheerSound(_duration = 2.0) {
  // Dinonaktifkan
  return
}

/**
 * 5. Penonton Menahan Napas (Dinonaktifkan)
 */
export function playCrowdGaspSound() {
  // Dinonaktifkan
  return
}

/**
 * 6. Peluit Wasit (Referee Whistle)
 */
export function playWhistleSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const osc1 = ctx.createOscillator()
  const osc2 = ctx.createOscillator()
  const gain = ctx.createGain()

  osc1.type = "sine"
  osc2.type = "sine"
  osc1.frequency.setValueAtTime(2850, now)
  osc2.frequency.setValueAtTime(3120, now)

  gain.gain.setValueAtTime(0.2, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

  osc1.connect(gain)
  osc2.connect(gain)
  gain.connect(ctx.destination)

  osc1.start(now)
  osc2.start(now)
  osc1.stop(now + 0.32)
  osc2.stop(now + 0.32)
}

/**
 * 7. Fanfare Kemenangan Wii Sports (Victory Jingle)
 */
export function playVictoryFanfare() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const notes = [
    { freq: 261.63, time: 0.0, dur: 0.12 }, // C4
    { freq: 329.63, time: 0.14, dur: 0.12 }, // E4
    { freq: 392.0, time: 0.28, dur: 0.14 }, // G4
    { freq: 523.25, time: 0.45, dur: 0.4 }, // C5
  ]

  notes.forEach((note) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "triangle"
    osc.frequency.setValueAtTime(note.freq, now + note.time)

    gain.gain.setValueAtTime(0.25, now + note.time)
    gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now + note.time)
    osc.stop(now + note.time + note.dur + 0.05)
  })
}

/**
 * 8. Desingan Angin Ayunan Raket ("SWOOSH!")
 * Suara hembusan udara saat raket dikibaskan di udara (Wii Sports whoosh)
 */
export function playTennisSwingWhoosh(power = 1.0) {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const bufferSize = Math.floor(ctx.sampleRate * 0.14)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25))
  }

  const noise = ctx.createBufferSource()
  noise.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = "bandpass"
  filter.frequency.setValueAtTime(800 * power, now)
  filter.frequency.exponentialRampToValueAtTime(260, now + 0.12)
  filter.Q.setValueAtTime(2.2, now)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(Math.min(0.55, 0.35 * power), now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13)

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)

  noise.start(now)
}

