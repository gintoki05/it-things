export type DoodlePacket = {
  type?: string
  from?: string
  to?: string
  msg?: { t?: string; from?: string; [key: string]: unknown }
  [key: string]: unknown
}

// Coalesce transient state, but preserve control/event order. One batch counts
// as one broadcast even when it contains packets for several relay recipients.
export class DoodleBroadcastQueue {
  private controls: DoodlePacket[] = []
  private heartbeats = new Map<string, DoodlePacket>()
  private positions = new Map<string, DoodlePacket>()
  private lastSent: number | null = null

  enqueue(packet: DoodlePacket): boolean {
    const stream = `${packet.to || "*"}|${packet.msg?.from || packet.from}`
    if (packet.type === "game_msg" && packet.msg?.t === "ps") {
      this.positions.set(stream, packet)
    } else if (packet.type === "game_msg" &&
      (packet.msg?.t === "netping" || packet.msg?.t === "netpong")) {
      this.heartbeats.set(`${stream}|${packet.msg.t}`, packet)
    } else {
      if (this.controls.length >= 512) return false
      this.controls.push(packet)
    }
    return true
  }

  take(now: number, playerCount: number): DoodlePacket[] {
    // Leave headroom below Free's 100 incoming + outgoing messages/second.
    // Assume every player needs relay, including fan-out to all subscribers.
    const players = Math.min(10, Math.max(4, playerCount))
    const interval = 1000 / (60 / (players * players))
    if (this.lastSent !== null && now - this.lastSent < interval) return []
    const batch: DoodlePacket[] = []
    for (const [key, packet] of this.heartbeats) {
      if (batch.length >= 64) break
      batch.push(packet)
      this.heartbeats.delete(key)
    }
    batch.push(...this.controls.splice(0, Math.max(0, 32 - batch.length)))
    for (const [key, packet] of this.positions) {
      if (batch.length >= 64) break
      batch.push(packet)
      this.positions.delete(key)
    }
    if (batch.length) this.lastSent = now
    return batch
  }

  clear() {
    this.controls = []
    this.heartbeats.clear()
    this.positions.clear()
    this.lastSent = null
  }
}
