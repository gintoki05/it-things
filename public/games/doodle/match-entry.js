// A start message needs an acknowledgement: a player can already be in the
// roster while still waiting in the lobby. Retry without resetting a match.
export class MatchEntry {
  constructor() {
    this.ready = new Set();
    this.spawns = new Map();
    this.received = null;
  }

  reset() {
    this.ready.clear();
    this.spawns.clear();
    this.received = null;
  }

  acknowledge(id, packet, matchId) {
    if (packet?.matchId !== matchId) return false;
    this.ready.add(id);
    return true;
  }

  accept(packet) {
    if (typeof packet?.matchId !== "string" || !packet.matchId) return false;
    if (packet.matchId === this.received) return false;
    this.received = packet.matchId;
    return true;
  }

  pending(ids, localId) {
    return [...ids].filter(id => id !== localId && !this.ready.has(id));
  }

  spawn(id, pick) {
    if (!this.spawns.has(id)) this.spawns.set(id, pick(id));
    return this.spawns.get(id);
  }
}
