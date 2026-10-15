/**
 * Tennis 98 — Smartphone Motion & Gesture Recognition Engine
 * 
 * Classifies 3-axis accelerometer telemetry into discrete tennis strokes:
 * - Upward flick (+Y): Serve Toss
 * - Downward snap (-Y): Overhead Smash / Rocket Serve
 * - Rightward flick (+X): Forehand (for right-handed grip)
 * - Leftward flick (-X): Backhand (for right-handed grip)
 * 
 * Features:
 * - Pure mathematical engine decoupled from DOM / browser APIs
 * - Axis dominance gating to eliminate ambiguous diagonal noise
 * - Peak acceleration measurement & bounded power scaling (1.0x - 1.5x)
 * - 320ms debounce cooldown to cancel wrist recoil deceleration false-triggers
 * - Low-pass EMA filter fallback to remove 1G gravity when linear acceleration is unavailable
 * - W3C Vibration API haptic patterns & safe execution helpers
 * - DeviceMotionEvent permission negotiation for iOS 13+ Safari & Android Chrome
 */

export type TennisGestureType = "toss" | "smash" | "forehand" | "backhand"

export interface MotionVector {
  x: number
  y: number
  z: number
}

export interface MotionSample {
  timestamp?: number
  acceleration?: MotionVector | null
  accelerationIncludingGravity?: MotionVector | null
  rotationRate?: {
    alpha?: number | null
    beta?: number | null
    gamma?: number | null
  } | null
}

export interface GestureEvent {
  type: TennisGestureType
  peakAcceleration: number
  powerMultiplier: number
  timestamp: number
  velocity: number
}

export interface ClassifierConfig {
  /** Minimum acceleration magnitude for regular swing/smash in m/s^2 (default: 12.0) */
  swingThreshold: number
  /** Minimum acceleration magnitude for upward toss in m/s^2 (default: 10.0) */
  tossThreshold: number
  /** Cooldown window in ms to suppress follow-through / recoil deceleration (default: 320) */
  debounceMs: number
  /** Acceleration magnitude corresponding to maximum 1.5x power multiplier (default: 32.0) */
  maxPowerThreshold: number
  /** Player handedness for lateral axis orientation (default: "right") */
  handedness?: "right" | "left"
  /** Explicit X-axis flip override (default: false) */
  invertX?: boolean
}

export const DEFAULT_CLASSIFIER_CONFIG: ClassifierConfig = {
  swingThreshold: 12.0,
  tossThreshold: 10.0,
  debounceMs: 320,
  maxPowerThreshold: 32.0,
  handedness: "right",
  invertX: false,
}

/**
 * Calculate Euclidean 3-axis magnitude: sqrt(x^2 + y^2 + z^2)
 */
export function calculateMagnitude(v: { x: number; y: number; z: number }): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
}

/**
 * Linearly scales acceleration magnitude to a power multiplier between 1.0x and 1.5x
 */
export function calculatePowerMultiplier(
  magnitude: number,
  config: Pick<ClassifierConfig, "swingThreshold" | "maxPowerThreshold"> = DEFAULT_CLASSIFIER_CONFIG
): number {
  const range = Math.max(0.001, config.maxPowerThreshold - config.swingThreshold)
  const normalized = Math.min(1.0, Math.max(0.0, (magnitude - config.swingThreshold) / range))
  return 1.0 + normalized * 0.5
}

/**
 * Pure gesture classifier that processes continuous motion telemetry without DOM dependencies.
 */
export class TennisGestureClassifier {
  private config: ClassifierConfig
  private lastSwingTime = 0
  private gravity: MotionVector = { x: 0, y: 9.8, z: 0 }
  private gravityInitialized = false
  private gravityAlpha = 0.85

  constructor(config: Partial<ClassifierConfig> = {}) {
    this.config = { ...DEFAULT_CLASSIFIER_CONFIG, ...config }
  }

  /**
   * Reset classifier state (cooldown and gravity history)
   */
  public reset(): void {
    this.lastSwingTime = 0
    this.gravityInitialized = false
    this.gravity = { x: 0, y: 9.8, z: 0 }
  }

  /**
   * Check if the classifier is currently within the debounce cooldown window
   */
  public isInCooldown(timestamp: number): boolean {
    if (this.lastSwingTime <= 0) {
      return false
    }
    return timestamp - this.lastSwingTime < this.config.debounceMs
  }

  /**
   * Get timestamp of the last detected swing
   */
  public getLastSwingTime(): number {
    return this.lastSwingTime
  }

  /**
   * Read-only access to active configuration
   */
  public getConfig(): Readonly<ClassifierConfig> {
    return { ...this.config }
  }

  /**
   * Dynamically update configuration parameters
   */
  public updateConfig(newConfig: Partial<ClassifierConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Convenience helper to classify direct 3D vector values
   */
  public classifyVector(x: number, y: number, z: number, timestamp?: number): GestureEvent | null {
    return this.processSample({
      timestamp,
      acceleration: { x, y, z },
    })
  }

  /**
   * Process a single motion telemetry sample and return a GestureEvent if a stroke was executed.
   */
  public processSample(sample: MotionSample): GestureEvent | null {
    const timestamp =
      sample.timestamp ?? (typeof performance !== "undefined" ? performance.now() : Date.now())

    // 1. Debounce cooldown check
    if (this.isInCooldown(timestamp)) {
      return null
    }

    // 2. Extract or derive linear acceleration
    let ax: number | null = null
    let ay: number | null = null
    let az: number | null = null

    const rawLinear = sample.acceleration
    const isLinearValid =
      rawLinear != null &&
      typeof rawLinear.x === "number" &&
      rawLinear.x !== null &&
      typeof rawLinear.y === "number" &&
      rawLinear.y !== null &&
      typeof rawLinear.z === "number" &&
      rawLinear.z !== null &&
      (rawLinear.x !== 0 ||
       rawLinear.y !== 0 ||
       rawLinear.z !== 0 ||
       !sample.accelerationIncludingGravity)

    if (isLinearValid && rawLinear) {
      ax = rawLinear.x
      ay = rawLinear.y
      az = rawLinear.z
    } else {
      // Fallback: derive linear acceleration from accelerationIncludingGravity via low-pass EMA filter
      const rawG = sample.accelerationIncludingGravity
      if (
        !rawG ||
        typeof rawG.x !== "number" ||
        rawG.x === null ||
        typeof rawG.y !== "number" ||
        rawG.y === null ||
        typeof rawG.z !== "number" ||
        rawG.z === null
      ) {
        return null
      }

      if (!this.gravityInitialized) {
        this.gravity.x = rawG.x
        this.gravity.y = rawG.y
        this.gravity.z = rawG.z
        this.gravityInitialized = true
      } else {
        this.gravity.x = this.gravityAlpha * this.gravity.x + (1 - this.gravityAlpha) * rawG.x
        this.gravity.y = this.gravityAlpha * this.gravity.y + (1 - this.gravityAlpha) * rawG.y
        this.gravity.z = this.gravityAlpha * this.gravity.z + (1 - this.gravityAlpha) * rawG.z
      }

      ax = rawG.x - this.gravity.x
      ay = rawG.y - this.gravity.y
      az = rawG.z - this.gravity.z
    }

    // 3. Compute acceleration magnitude
    const magnitude = Math.sqrt(ax * ax + ay * ay + az * az)

    // 4. Threshold gating (minimum toss threshold)
    if (magnitude < this.config.tossThreshold) {
      return null
    }

    // 5. Account for handedness / X-inversion
    const isLeftHanded = this.config.handedness === "left" || Boolean(this.config.invertX)
    const effectiveAx = isLeftHanded ? -ax : ax

    // 6. Directional classification via axis dominance
    let gestureType: TennisGestureType | null = null
    const absX = Math.abs(effectiveAx)
    const absY = Math.abs(ay)

    if (absY >= absX) {
      // Vertical axis dominates (Y)
      if (ay > 0 && ay >= this.config.tossThreshold) {
        gestureType = "toss"
      } else if (ay < 0 && absY >= this.config.swingThreshold) {
        gestureType = "smash"
      }
    } else {
      // Horizontal axis dominates (X)
      if (effectiveAx > 0 && effectiveAx >= this.config.swingThreshold) {
        gestureType = "forehand"
      } else if (effectiveAx < 0 && absX >= this.config.swingThreshold) {
        gestureType = "backhand"
      }
    }

    if (!gestureType) {
      return null
    }

    // 7. Calculate power multiplier
    const powerMultiplier = calculatePowerMultiplier(magnitude, this.config)

    // 8. Commit timestamp to arm debounce cooldown
    this.lastSwingTime = timestamp

    return {
      type: gestureType,
      peakAcceleration: magnitude,
      powerMultiplier,
      timestamp,
      velocity: magnitude,
    }
  }
}

/**
 * Haptic Vibration API Patterns
 */
export const HAPTIC_PATTERNS = {
  swing: 15,
  hit: 45,
  smash: [25, 20, 80],
  point_win: [50, 40, 50, 40, 100],
  point_lose: [120, 60, 120],
} as const

export type HapticPatternType = keyof typeof HAPTIC_PATTERNS

/**
 * Trigger mobile vibration safely. Never throws even if unsupported.
 */
export function triggerHaptic(type: HapticPatternType | number | number[]): boolean {
  if (
    typeof navigator === "undefined" ||
    !("vibrate" in navigator) ||
    typeof (navigator as { vibrate?: (pattern: unknown) => boolean }).vibrate !== "function"
  ) {
    return false
  }

  try {
    const pattern = typeof type === "string" ? HAPTIC_PATTERNS[type as HapticPatternType] : type
    if (!pattern) return false
    return (navigator as { vibrate: (pattern: unknown) => boolean }).vibrate(pattern)
  } catch {
    return false
  }
}

/**
 * Permission request handling for iOS 13+ Safari vs Android/modern browsers
 */
export type MotionPermissionState = "granted" | "denied" | "unsupported"

export async function requestMotionPermission(): Promise<MotionPermissionState> {
  if (typeof window === "undefined") {
    return "unsupported"
  }

  // iOS 13+ Safari explicit permission request
  const DeviceMotion = (
    window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }
  ).DeviceMotionEvent

  if (typeof DeviceMotion?.requestPermission === "function") {
    try {
      const response = await DeviceMotion.requestPermission()
      return response === "granted" ? "granted" : "denied"
    } catch {
      return "denied"
    }
  }

  // Android Chrome / Standard W3C DeviceMotionEvent
  if ("DeviceMotionEvent" in window) {
    return "granted"
  }

  return "unsupported"
}

/**
 * Browser adapter for subscribing to DeviceMotionEvent and forwarding to TennisGestureClassifier.
 */
export interface MotionListenerOptions {
  classifier?: TennisGestureClassifier
  onGesture?: (gesture: GestureEvent) => void
  onRawSample?: (sample: MotionSample, magnitude: number) => void
  onError?: (error: Error) => void
}

export class BrowserMotionListener {
  private classifier: TennisGestureClassifier
  private onGesture?: (gesture: GestureEvent) => void
  private onRawSample?: (sample: MotionSample, magnitude: number) => void
  private isListening = false
  private handler = (event: DeviceMotionEvent) => this.handleDeviceMotion(event)

  constructor(options: MotionListenerOptions = {}) {
    this.classifier = options.classifier ?? new TennisGestureClassifier()
    this.onGesture = options.onGesture
    this.onRawSample = options.onRawSample
  }

  public start(): boolean {
    if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) {
      return false
    }
    if (this.isListening) return true

    window.addEventListener("devicemotion", this.handler, { passive: true })
    this.isListening = true
    return true
  }

  public stop(): void {
    if (typeof window === "undefined") return
    if (!this.isListening) return

    window.removeEventListener("devicemotion", this.handler)
    this.isListening = false
  }

  public getClassifier(): TennisGestureClassifier {
    return this.classifier
  }

  public getIsListening(): boolean {
    return this.isListening
  }

  private handleDeviceMotion(event: DeviceMotionEvent): void {
    const rawAcc = event.acceleration
    const hasLinear =
      rawAcc != null &&
      typeof rawAcc.x === "number" &&
      rawAcc.x !== null &&
      !isNaN(rawAcc.x) &&
      typeof rawAcc.y === "number" &&
      rawAcc.y !== null &&
      !isNaN(rawAcc.y) &&
      typeof rawAcc.z === "number" &&
      rawAcc.z !== null &&
      !isNaN(rawAcc.z) &&
      (Math.abs(rawAcc.x) > 0.001 ||
       Math.abs(rawAcc.y) > 0.001 ||
       Math.abs(rawAcc.z) > 0.001 ||
       !event.accelerationIncludingGravity)

    const rawG = event.accelerationIncludingGravity
    const hasG =
      rawG != null &&
      typeof rawG.x === "number" &&
      rawG.x !== null &&
      !isNaN(rawG.x) &&
      typeof rawG.y === "number" &&
      rawG.y !== null &&
      !isNaN(rawG.y) &&
      typeof rawG.z === "number" &&
      rawG.z !== null &&
      !isNaN(rawG.z)

    const sample: MotionSample = {
      timestamp: event.timeStamp || Date.now(),
      acceleration: hasLinear && rawAcc
        ? {
            x: rawAcc.x ?? 0,
            y: rawAcc.y ?? 0,
            z: rawAcc.z ?? 0,
          }
        : null,
      accelerationIncludingGravity: hasG && rawG
        ? {
            x: rawG.x ?? 0,
            y: rawG.y ?? 0,
            z: rawG.z ?? 0,
          }
        : null,
      rotationRate: event.rotationRate
        ? {
            alpha: event.rotationRate.alpha,
            beta: event.rotationRate.beta,
            gamma: event.rotationRate.gamma,
          }
        : null,
    }

    let mag = 0
    if (sample.acceleration) {
      const { x, y, z } = sample.acceleration
      mag = Math.sqrt(x * x + y * y + z * z)
    } else if (sample.accelerationIncludingGravity) {
      const { x, y, z } = sample.accelerationIncludingGravity
      const totalG = Math.sqrt(x * x + y * y + z * z)
      // Deviation from Earth gravity (9.80665 m/s^2) reflects dynamic physical swing
      mag = Math.max(0, Math.abs(totalG - 9.80665))
    }

    if (this.onRawSample) {
      this.onRawSample(sample, mag)
    }

    const gesture = this.classifier.processSample(sample)
    if (gesture && this.onGesture) {
      this.onGesture(gesture)
    }
  }
}
