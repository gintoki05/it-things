// Web Audio API Retro Sound Generator
// Menghasilkan nada 2-tone chime Windows 98 secara sintetis tanpa asset eksternal

let audioCtx: AudioContext | null = null

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
 * Memainkan efek suara nada chime retro khas Windows 98 / 2000
 * Terdiri dari dua nada manis (E5 ~659Hz diikuti A5 ~880Hz) dengan decay lembut
 */
export function playRetroNotificationSound(volume = 0.25) {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // Master gain node untuk volume & fade out
    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(volume, now)
    masterGain.connect(ctx.destination)

    // Tone 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = "sine"
    osc1.frequency.setValueAtTime(659.25, now)

    gain1.gain.setValueAtTime(0, now)
    gain1.gain.linearRampToValueAtTime(0.7, now + 0.02)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28)

    osc1.connect(gain1)
    gain1.connect(masterGain)

    osc1.start(now)
    osc1.stop(now + 0.3)

    // Tone 2: A5 (880 Hz) sedikit overlap
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = "sine"
    osc2.frequency.setValueAtTime(880.0, now + 0.1)

    gain2.gain.setValueAtTime(0, now + 0.1)
    gain2.gain.linearRampToValueAtTime(1.0, now + 0.12)
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55)

    osc2.connect(gain2)
    gain2.connect(masterGain)

    osc2.start(now + 0.1)
    osc2.stop(now + 0.6)
  } catch (err) {
    console.warn("Could not play retro sound:", err)
  }
}

/**
 * Efek suara ketika tebakan benar (Arpeggio riang C-E-G-C tinggi retro)
 */
export function playRetroCorrectSound(volume = 0.25) {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "triangle"
      osc.frequency.setValueAtTime(freq, now + idx * 0.08)

      gain.gain.setValueAtTime(0, now + idx * 0.08)
      gain.gain.linearRampToValueAtTime(volume, now + idx * 0.08 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now + idx * 0.08)
      osc.stop(now + idx * 0.08 + 0.28)
    })
  } catch (err) {
    console.warn("Could not play correct sound:", err)
  }
}

/**
 * Efek suara buzzer / waktu habis (Retro square wave low buzzer)
 */
export function playRetroBuzzerSound(volume = 0.2) {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sawtooth"
    osc.frequency.setValueAtTime(150, now)
    osc.frequency.linearRampToValueAtTime(110, now + 0.3)

    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.38)
  } catch (err) {
    console.warn("Could not play buzzer sound:", err)
  }
}

/**
 * Efek suara giliran / ronde baru dimulai (Fanfare 2-chord retro)
 */
export function playRetroRoundStartSound(volume = 0.22) {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    const tones = [440, 554.37, 659.25] // A4 major triad
    tones.forEach((freq) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "square"
      osc.frequency.setValueAtTime(freq, now)

      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(volume * 0.4, now + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.5)
    })
  } catch (err) {
    console.warn("Could not play round start sound:", err)
  }
}

