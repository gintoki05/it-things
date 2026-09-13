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

export type AdzanSoundType =
  | "makkah"
  | "madinah"
  | "mishary"
  | "nusantara"
  | "bedug"
  | "chime"

export interface AdzanSoundOption {
  id: AdzanSoundType
  name: string
  desc: string
  icon: string
  audioUrl?: string
}

export const ADZAN_SOUND_OPTIONS: AdzanSoundOption[] = [
  {
    id: "makkah",
    name: "Adzan Makkah (Masjidil Haram)",
    desc: "Lantunan takbir & adzan asli Masjidil Haram Makkah",
    icon: "🕋",
    audioUrl: "/sounds/adzan-makkah-pendek.mp3",
  },
  {
    id: "madinah",
    name: "Adzan Madinah (Masjid Nabawi)",
    desc: "Takbir adzan merdu & syahdu Masjid Nabawi Madinah",
    icon: "🕌",
    audioUrl: "/sounds/adzan-madinah-takbir.mp3",
  },
  {
    id: "mishary",
    name: "Mishary Rashid Alafasy",
    desc: "Lantunan adzan merdu Syaikh Mishary Alafasy",
    icon: "✨",
    audioUrl: "/sounds/adzan-mishary.mp3",
  },
  {
    id: "nusantara",
    name: "Adzan Nusantara (Melayu)",
    desc: "Cengkok adzan merdu khas Nusantara / Melayu",
    icon: "🌴",
    audioUrl: "/sounds/adzan-nusantara.mp3",
  },
  {
    id: "bedug",
    name: "Bedug Masjid Nusantara",
    desc: "Ketukan ritmis bedug kayu kulit otentik (instrumen)",
    icon: "🥁",
  },
  {
    id: "chime",
    name: "Lonceng Digital Masjid",
    desc: "Chime harmonis tubular bell modern (tanpa vokal)",
    icon: "🔔",
  },
]

let activeAdzanAudio: HTMLAudioElement | null = null

export function stopAdzanAudio() {
  if (activeAdzanAudio) {
    try {
      activeAdzanAudio.pause()
      activeAdzanAudio.currentTime = 0
    } catch {}
    activeAdzanAudio = null
  }
}

/**
 * 1. Lonceng Digital Masjid (Chime Tubular Bell harmonis)
 */
function playChimeSynth(ctx: AudioContext, volume: number) {
  const now = ctx.currentTime
  const masterGain = ctx.createGain()
  masterGain.gain.setValueAtTime(volume, now)
  masterGain.connect(ctx.destination)

  // Arpeggio D4, F#4, A4, D5 dengan overtone lonceng
  const notes = [293.66, 369.99, 440.0, 587.33]
  notes.forEach((freq, idx) => {
    const noteStart = now + idx * 0.22

    // Nada fundamental
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.setValueAtTime(freq, noteStart)

    gain.gain.setValueAtTime(0, noteStart)
    gain.gain.linearRampToValueAtTime(0.8, noteStart + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 1.8)

    osc.connect(gain)
    gain.connect(masterGain)
    osc.start(noteStart)
    osc.stop(noteStart + 1.85)

    // Overtone metalik lonceng (2.76x frekuensi)
    const overtone = ctx.createOscillator()
    const overtoneGain = ctx.createGain()
    overtone.type = "sine"
    overtone.frequency.setValueAtTime(freq * 2.76, noteStart)

    overtoneGain.gain.setValueAtTime(0, noteStart)
    overtoneGain.gain.linearRampToValueAtTime(0.2, noteStart + 0.015)
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.6)

    overtone.connect(overtoneGain)
    overtoneGain.connect(masterGain)
    overtone.start(noteStart)
    overtone.stop(noteStart + 0.65)
  })
}

/**
 * 2. Bedug Nusantara (Pukulan ritmis bedug kayu kulit otentik)
 */
function playBedugSynth(ctx: AudioContext, volume: number) {
  const now = ctx.currentTime
  const masterGain = ctx.createGain()
  masterGain.gain.setValueAtTime(volume * 1.2, now)
  masterGain.connect(ctx.destination)

  // Pola ritme khas: Duk... Duk... Duk-duk-duk... DUK!
  const hits = [
    { delay: 0.0, pitch: 78, decay: 0.45, power: 0.85 },
    { delay: 0.48, pitch: 78, decay: 0.45, power: 0.85 },
    { delay: 0.92, pitch: 82, decay: 0.3, power: 0.9 },
    { delay: 1.15, pitch: 82, decay: 0.3, power: 0.9 },
    { delay: 1.38, pitch: 85, decay: 0.35, power: 0.95 },
    { delay: 1.75, pitch: 70, decay: 1.1, power: 1.1 }, // Pukulan mantap penutup
  ]

  hits.forEach((h) => {
    const hitTime = now + h.delay

    // Body drum (decay frekuensi rendah)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.setValueAtTime(h.pitch, hitTime)
    osc.frequency.exponentialRampToValueAtTime(45, hitTime + 0.12)

    gain.gain.setValueAtTime(0, hitTime)
    gain.gain.linearRampToValueAtTime(h.power, hitTime + 0.006)
    gain.gain.exponentialRampToValueAtTime(0.0001, hitTime + h.decay)

    osc.connect(gain)
    gain.connect(masterGain)
    osc.start(hitTime)
    osc.stop(hitTime + h.decay + 0.05)

    // Wood/Skin click impact
    const click = ctx.createOscillator()
    const clickGain = ctx.createGain()
    click.type = "triangle"
    click.frequency.setValueAtTime(220, hitTime)
    click.frequency.exponentialRampToValueAtTime(60, hitTime + 0.02)

    clickGain.gain.setValueAtTime(h.power * 0.4, hitTime)
    clickGain.gain.exponentialRampToValueAtTime(0.001, hitTime + 0.035)

    click.connect(clickGain)
    clickGain.connect(masterGain)
    click.start(hitTime)
    click.stop(hitTime + 0.04)
  })
}

/**
 * 3. Maqam Hijaz (Melodi syahdu seruling Islami)
 */
function playHijazSynth(ctx: AudioContext, volume: number) {
  const now = ctx.currentTime
  const masterGain = ctx.createGain()
  masterGain.gain.setValueAtTime(volume * 0.9, now)
  masterGain.connect(ctx.destination)

  // Tangga nada Maqam Hijaz: D4, Eb4, F#4, G4, A4, D5
  const melody = [
    { f: 293.66, t: 0.0, d: 0.28 },
    { f: 311.13, t: 0.26, d: 0.28 },
    { f: 369.99, t: 0.52, d: 0.3 },
    { f: 392.0, t: 0.8, d: 0.32 },
    { f: 440.0, t: 1.1, d: 0.38 },
    { f: 587.33, t: 1.45, d: 1.2 }, // Nada puncak & lingering
  ]

  melody.forEach((note) => {
    const noteTime = now + note.t

    // Warm reed / flute timbre (Triangle + soft sine)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "triangle"
    osc.frequency.setValueAtTime(note.f, noteTime)

    gain.gain.setValueAtTime(0, noteTime)
    gain.gain.linearRampToValueAtTime(0.7, noteTime + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + note.d)

    osc.connect(gain)
    gain.connect(masterGain)
    osc.start(noteTime)
    osc.stop(noteTime + note.d + 0.05)

    // Sub-octave harmonic
    const sub = ctx.createOscillator()
    const subGain = ctx.createGain()
    sub.type = "sine"
    sub.frequency.setValueAtTime(note.f, noteTime)

    subGain.gain.setValueAtTime(0, noteTime)
    subGain.gain.linearRampToValueAtTime(0.35, noteTime + 0.05)
    subGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + note.d * 0.8)

    sub.connect(subGain)
    subGain.connect(masterGain)
    sub.start(noteTime)
    sub.stop(noteTime + note.d)
  })
}

/**
 * 4. Genta TVRI 90s (Gong penanda azan siaran klasik bergema)
 */
function playGongSynth(ctx: AudioContext, volume: number) {
  const now = ctx.currentTime
  const masterGain = ctx.createGain()
  masterGain.gain.setValueAtTime(volume, now)
  masterGain.connect(ctx.destination)

  const gongs = [
    { f: 196.0, t: 0.0, d: 1.2 }, // G3
    { f: 261.63, t: 0.55, d: 1.3 }, // C4
    { f: 130.81, t: 1.25, d: 2.2 }, // C3 Agung
  ]

  gongs.forEach((g) => {
    const noteTime = now + g.t

    // Detuned dual oscillator untuk getaran genta alami
    ;[-1.2, 1.2].forEach((detuneHz) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.setValueAtTime(g.f + detuneHz, noteTime)

      gain.gain.setValueAtTime(0, noteTime)
      gain.gain.linearRampToValueAtTime(0.5, noteTime + 0.06)
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + g.d)

      osc.connect(gain)
      gain.connect(masterGain)
      osc.start(noteTime)
      osc.stop(noteTime + g.d + 0.05)
    })
  })
}

/**
 * 5. Jam Digital 90s (Alarm piezzo buzzer jam tangan retro)
 */
function playWatchBeepSynth(ctx: AudioContext, volume: number) {
  const now = ctx.currentTime
  const masterGain = ctx.createGain()
  masterGain.gain.setValueAtTime(volume * 0.7, now)
  masterGain.connect(ctx.destination)

  // 3 pasang bip (bip-bip ... bip-bip ... bip-bip)
  const beeps = [
    0.0, 0.08, // pair 1
    0.28, 0.36, // pair 2
    0.56, 0.64, // pair 3
  ]

  beeps.forEach((t) => {
    const noteTime = now + t
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "square"
    osc.frequency.setValueAtTime(2048, noteTime) // Frekuensi piezzo standar

    gain.gain.setValueAtTime(0, noteTime)
    gain.gain.setValueAtTime(0.8, noteTime + 0.005)
    gain.gain.setValueAtTime(0.8, noteTime + 0.055)
    gain.gain.linearRampToValueAtTime(0.0001, noteTime + 0.06)

    osc.connect(gain)
    gain.connect(masterGain)
    osc.start(noteTime)
    osc.stop(noteTime + 0.065)
  })
}

/**
 * Main dispatcher untuk memainkan efek suara azan berdasarkan pilihan user
 */
export function playAdzanSound(
  type: AdzanSoundType = "makkah",
  volume = 0.5,
  onEnd?: () => void
) {
  try {
    stopAdzanAudio()

    const opt = ADZAN_SOUND_OPTIONS.find((o) => o.id === type)
    if (opt && opt.audioUrl && typeof window !== "undefined") {
      const audio = new Audio(opt.audioUrl)
      audio.volume = Math.min(1, Math.max(0, volume))
      activeAdzanAudio = audio

      audio.onended = () => {
        if (activeAdzanAudio === audio) {
          activeAdzanAudio = null
        }
        if (onEnd) onEnd()
      }

      audio.onerror = () => {
        if (activeAdzanAudio === audio) {
          activeAdzanAudio = null
        }
        if (onEnd) onEnd()
      }

      audio.play().catch((err) => {
        console.warn("Could not play audio element, falling back to synth:", err)
        const ctx = getAudioContext()
        if (ctx) playChimeSynth(ctx, volume)
        if (onEnd) onEnd()
      })
      return
    }

    const ctx = getAudioContext()
    if (!ctx) {
      if (onEnd) onEnd()
      return
    }

    if (type === "bedug") {
      playBedugSynth(ctx, volume)
      if (onEnd) setTimeout(onEnd, 2200)
    } else {
      playChimeSynth(ctx, volume)
      if (onEnd) setTimeout(onEnd, 2000)
    }
  } catch (err) {
    console.warn("Could not play adzan sound:", err)
    if (onEnd) onEnd()
  }
}

/**
 * Kompatibilitas mundur
 */
export function playRetroAdzanChime(volume = 0.25) {
  playAdzanSound("chime", volume)
}

/**
 * Efek suara balon dialog Clippy (Pop lembut)
 */
export function playClippyPopSound(volume = 0.15) {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.setValueAtTime(450, now)
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.06)

    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.09)
  } catch (err) {
    console.warn("Could not play clippy pop sound:", err)
  }
}

/**
 * Efek suara Pomodoro Timer (Focus Done & Break Done)
 */
export function playPomodoroChime(mode: "focus_done" | "break_done" = "focus_done", volume = 0.3) {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(volume, now)
    masterGain.connect(ctx.destination)

    if (mode === "focus_done") {
      // 4-note ascending fanfare retro chime (C5 -> E5 -> G5 -> C6)
      const notes = [
        { f: 523.25, t: 0.0, d: 0.18 }, // C5
        { f: 659.25, t: 0.12, d: 0.18 }, // E5
        { f: 783.99, t: 0.24, d: 0.22 }, // G5
        { f: 1046.5, t: 0.38, d: 0.5 },  // C6
      ]

      notes.forEach((n) => {
        const noteTime = now + n.t
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = "triangle"
        osc.frequency.setValueAtTime(n.f, noteTime)

        gain.gain.setValueAtTime(0, noteTime)
        gain.gain.linearRampToValueAtTime(0.7, noteTime + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + n.d)

        osc.connect(gain)
        gain.connect(masterGain)
        osc.start(noteTime)
        osc.stop(noteTime + n.d + 0.02)
      })
    } else {
      // 2-tone gentle ping-pong chime (A5 -> E5)
      const notes = [
        { f: 880.0, t: 0.0, d: 0.25 },
        { f: 659.25, t: 0.18, d: 0.45 },
      ]

      notes.forEach((n) => {
        const noteTime = now + n.t
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = "sine"
        osc.frequency.setValueAtTime(n.f, noteTime)

        gain.gain.setValueAtTime(0, noteTime)
        gain.gain.linearRampToValueAtTime(0.6, noteTime + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + n.d)

        osc.connect(gain)
        gain.connect(masterGain)
        osc.start(noteTime)
        osc.stop(noteTime + n.d + 0.02)
      })
    }
  } catch (err) {
    console.warn("Could not play pomodoro chime:", err)
  }
}



