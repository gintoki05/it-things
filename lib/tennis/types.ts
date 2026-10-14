import * as THREE from "three"

export type DifficultyLevel = "easy" | "normal" | "pro"
export type GameMode = "vs_bot" | "wall_practice"
export type MatchState = "warmup" | "serving" | "rally" | "point_scored" | "game_over"

export interface CourtDimensions {
  width: number // Half court or total width (standard singles = ~8.23m, doubles = ~10.97m)
  length: number // Total court length (~23.77m)
  netHeight: number // Center net height (~0.914m)
  netWidth: number
  serviceLineZ: number // Distance of service line from net
}

export const COURT_CONFIG: CourtDimensions = {
  width: 11, // in game units
  length: 24,
  netHeight: 1.1,
  netWidth: 12.5,
  serviceLineZ: 6.4,
}

export interface PlayerVisualConfig {
  name: string
  shirtColor: number
  skinTone: number
  hairColor: number
  capColor?: number
  isOpponent?: boolean
}

export interface SwingData {
  speed: number // m/s^2 equivalent (10 - 45)
  angle: number // -45 to +45 deg (forehand vs backhand tilt)
  timing: "early" | "perfect" | "late"
  type: "flat" | "topspin" | "slice" | "smash"
}

export interface MiiAvatarObject {
  group: THREE.Group
  head: THREE.Mesh
  body: THREE.Mesh
  rightHand: THREE.Group
  leftHand: THREE.Mesh
  racket: THREE.Group
  setSwingAnimation: (progress: number, swingType: "forehand" | "backhand" | "serve" | boolean) => void
  setRunningAnimation: (time: number, isMoving: boolean) => void
  setVictoryAnimation?: (time: number) => void
  resetPose: () => void
}
