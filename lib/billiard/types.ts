export type BallType = "cue" | "solid" | "stripe" | "eight"

export interface Ball {
  id: number // 0 is cue ball, 1-15 are object balls
  number: number
  type: BallType
  x: number // x position in internal virtual coordinates (0 to TABLE_WIDTH)
  y: number // y position in internal virtual coordinates (0 to TABLE_HEIGHT)
  vx: number // velocity x
  vy: number // velocity y
  radius: number
  isPocketed: boolean
  pocketAnimationProgress?: number // 0 to 1 for dropping into pocket
  color: string // primary color hex
  stripeColor?: string // secondary color if stripe
  poleX?: number // 3D orientation x
  poleY?: number // 3D orientation y
  poleZ?: number // 3D orientation z
}

export type PlayerId = "player1" | "player2"
export type BallGroup = "solid" | "stripe"

export type GamePhase =
  | "aiming" // Waiting for player to aim and shoot
  | "simulating" // Balls are currently moving
  | "ball_in_hand" // Player is dragging cue ball to place it on table
  | "game_over" // Game has finished

export interface PlayerInfo {
  id: PlayerId
  name: string
  avatar?: string
  group: BallGroup | null // Assigned group (solid or stripe)
  pocketedCount: number // How many of their assigned balls are in
}

export interface ShotResult {
  cueBallPocketed: boolean
  eightBallPocketed: boolean
  pocketedBalls: number[] // Ball numbers pocketed on this shot
  firstBallHit: number | null // Ball number first contacted by cue ball
  cushionsHitAfterContact: number
  isLegalBreak: boolean
}

export interface GameState {
  mode: "local" | "online"
  roomCode?: string
  isHost?: boolean
  currentTurn: PlayerId
  phase: GamePhase
  turnTimeLeft: number // Seconds remaining for current turn (e.g. 30s)
  isBreakShot: boolean
  openTable: boolean
  player1: PlayerInfo
  player2: PlayerInfo
  winner: PlayerId | null
  winReason: string | null
  foulMessage: string | null
  consecutiveFouls: Record<PlayerId, number>
  pocketedOrder: number[] // Urutan bola masuk untuk Ball Return Rack
}

// Supabase Realtime broadcast message payload
export type BilliardRealtimeMessage =
  | {
      type: "player_joined"
      playerId: string
      playerName: string
    }
  | {
      type: "shot_taken"
      shooter: PlayerId
      angle: number
      power: number
      cueX: number
      cueY: number
      spinX?: number
      spinY?: number
    }
  | {
      type: "ball_placed"
      shooter: PlayerId
      x: number
      y: number
    }
  | {
      type: "quick_chat"
      sender: PlayerId
      senderName: string
      text: string
    }
  | {
      type: "emoji_reaction"
      sender: PlayerId
      senderName: string
      emoji: string
    }
  | {
      type: "sync_balls"
      balls: Array<{ id: number; x: number; y: number; vx: number; vy: number; isPocketed: boolean }>
      currentTurn: PlayerId
      phase: GamePhase
      winner: PlayerId | null
      pocketedOrder: number[]
    }
  | {
      type: "rematch"
    }
  | {
      type: "player_forfeited"
      leaverId: PlayerId
      leaverName: string
    }
