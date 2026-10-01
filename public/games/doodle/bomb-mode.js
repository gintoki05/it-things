// DOODLE.EXE — Bomb Mission Mode (Luxville)
// Implements host-authoritative Bomb Mission logic: state machine, deadlines,
// 3D bomb object & carrier backpack, plant/defuse interactions, audio, spectator, and HUD.

import * as THREE from "three";

export const BOMB_CONFIG = {
  PREP_TIME: 5,        // 5 seconds round prep
  ROUND_TIME: 150,     // 150 seconds round attack time
  PLANT_TIME: 3.0,     // 3 seconds hold to plant
  BOMB_TIME: 40.0,     // 40 seconds bomb explosion timer
  DEFUSE_TIME: 5.0,    // 5 seconds hold to defuse
  POST_ROUND_TIME: 5,  // 5 seconds round result delay
  TARGET_WINS: 5,      // First team to 5 wins match
  INTERACT_MAX_DIST: 2.8,   // Max interaction distance
  INTERACT_MAX_Y_DIFF: 1.4, // Max vertical interaction difference
  MOVE_CANCEL_THRESHOLD: 0.45, // Moving beyond this distance cancels interact
  PICKUP_RADIUS: 2.0,  // Proximity to pick up dropped bomb
};

// Luxville Plant Site Bounds (World coordinates)
// X(x) = (x - 340) / 5, Z(z) = (z - 350) / 5
export const LUXVILLE_SITES = {
  A: {
    id: "A",
    name: "SITE A",
    center: new THREE.Vector3((297 - 340) / 5, 0, (466 - 350) / 5), // (-8.6, 0, 23.2)
    radius: 4.2,
    minY: -0.5,
    maxY: 1.2, // Upper balcony is at Y >= 2.8; ground floor is <= 1.2
  },
  B: {
    id: "B",
    name: "SITE B",
    center: new THREE.Vector3((442 - 340) / 5, 0, (298 - 350) / 5), // (20.4, 0, -10.4)
    radius: 4.2,
    minY: -0.5,
    maxY: 1.2,
  },
};

export class BombMode {
  constructor(gameCtx) {
    this.game = gameCtx; // { scene, camera, world, level, audio, peer, hud, player, remotePlayers, input }
    this.enabled = false;
    this.isHost = false;

    // Match session identifiers
    this.matchId = "";
    this.roundId = 0;
    this.revision = 0;
    this.phase = "lobby"; // lobby | preparing | live | planted | round_end | match_end

    // Monotonic timers (performance.now() based)
    this.phaseEndsAt = 0;
    this.explodesAt = 0;
    this.hostTimeOffset = 0; // estimate of hostNow - clientNow

    // Team scores & roster
    this.scores = { red: 0, blue: 0 }; // red: Tero, blue: CT
    this.teams = { red: [], blue: [] };
    this.alivePlayerIds = new Set();
    this.carrierHistory = [];
    this.lastWinner = null;
    this.lastReason = null;
    this.roundEndSoundPlayed = false;

    // Bomb State
    // state: 'carried' | 'dropped' | 'planted' | 'defused' | 'exploded'
    this.bomb = {
      state: "carried",
      carrierId: null,
      position: new THREE.Vector3(),
      siteId: null,
      plantedAt: 0,
      explodesAt: 0,
    };

    // Active interaction on host
    this.interaction = null; // { kind: 'plant'|'defuse', playerId, startedAt, completesAt, token }

    // Client local interaction state
    this.localInteract = {
      active: false,
      kind: null,
      token: 0,
      startPos: new THREE.Vector3(),
      startedAt: 0,
      duration: 3.0,
      lastHeartbeat: 0,
    };

    // Spectator state
    this.spectator = {
      active: false,
      targetId: null,
      candidates: [],
      candidateIndex: 0,
      fireHeld: false,
      cameraTargetId: null,
    };

    // Audio & Beep synthesizer
    this.lastBeepTime = 0;
    this.nextBeepInterval = 1.0;

    // 3D Visual Objects
    this.bombMesh = null;
    this.carrierBackpackMesh = null;
    this.siteRings = [];

    // HUD element references
    this.hudRoot = null;
    this.initVisuals();
  }

  // Check if a point is inside a plant site volume (X, Z, and Y)
  isInsideSite(pos, siteKey) {
    const site = LUXVILLE_SITES[siteKey];
    if (!site) return false;
    if (pos.y < site.minY || pos.y > site.maxY) return false;
    const dx = pos.x - site.center.x;
    const dz = pos.z - site.center.z;
    return dx * dx + dz * dz <= site.radius * site.radius;
  }

  getSiteAt(pos) {
    if (this.isInsideSite(pos, "A")) return "A";
    if (this.isInsideSite(pos, "B")) return "B";
    return null;
  }

  // 3D Visuals & Markers
  initVisuals() {
    if (!this.game?.scene) return;
    const scene = this.game.scene;

    // 1. Doodle C4 Bomb Object
    const bombGroup = new THREE.Group();
    bombGroup.name = "doodle_bomb";
    bombGroup.visible = false;

    // Doodle C4 Brick (Clay/Paper style)
    const brickGeo = new THREE.BoxGeometry(0.38, 0.16, 0.24);
    const brickMat = new THREE.MeshBasicMaterial({
      color: 0x3d372d,
      wireframe: false,
    });
    const brick = new THREE.Mesh(brickGeo, brickMat);
    brick.position.y = 0.08;
    bombGroup.add(brick);

    // Tape / Straps
    const tapeGeo = new THREE.BoxGeometry(0.12, 0.17, 0.25);
    const tapeMat = new THREE.MeshBasicMaterial({ color: 0x8a7a58 });
    const tape = new THREE.Mesh(tapeGeo, tapeMat);
    tape.position.y = 0.08;
    bombGroup.add(tape);

    // Digital Keypad / Blinking LED
    const ledGeo = new THREE.SphereGeometry(0.04, 8, 6);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xd02030 });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(0, 0.17, 0.04);
    bombGroup.add(led);
    bombGroup.userData.ledMat = ledMat;

    scene.add(bombGroup);
    this.bombMesh = bombGroup;

    // 2. Carrier Backpack Mesh (Attached to active carrier)
    const packGroup = new THREE.Group();
    packGroup.name = "carrier_pack";
    packGroup.visible = false;
    const packGeo = new THREE.BoxGeometry(0.32, 0.38, 0.18);
    const packMat = new THREE.MeshBasicMaterial({ color: 0x2e3342 });
    const pack = new THREE.Mesh(packGeo, packMat);
    packGroup.add(pack);

    // Hazard strap
    const strapGeo = new THREE.BoxGeometry(0.06, 0.39, 0.19);
    const strapMat = new THREE.MeshBasicMaterial({ color: 0xeb8c14 });
    const strap = new THREE.Mesh(strapGeo, strapMat);
    packGroup.add(strap);

    scene.add(packGroup);
    this.carrierBackpackMesh = packGroup;

    // 3. Plant Site Zone Indicators (Light scribble rings)
    ["A", "B"].forEach((siteId) => {
      const site = LUXVILLE_SITES[siteId];
      const ringGeo = new THREE.RingGeometry(site.radius - 0.25, site.radius, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: siteId === "A" ? 0xd02030 : 0x1a30c0,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(site.center);
      ring.position.y = 0.04;
      ring.visible = false;
      scene.add(ring);
      this.siteRings.push(ring);
    });
  }

  // Synthesized Bomb Sounds & Audio/Visual Effects (Web Audio + Doodle Particles)
  playAudioBeep(freq = 1800, dur = 0.08, gain = 0.35) {
    this.playAudioTone(freq, dur, gain, "square", freq * 0.9);
  }

  playAudioTone(freq = 1000, dur = 0.08, gain = 0.3, type = "square", freqEnd = null) {
    try {
      const audio = this.game?.audio;
      if (!audio?.ctx) return;
      if (audio.ctx.state === "suspended") audio.ctx.resume();
      audio.tone({
        freq,
        freqEnd: freqEnd || freq,
        dur,
        gain,
        type,
      });
    } catch {}
  }

  // Keypad tick while planting
  playKeypadTick(pct = 0) {
    try {
      const audio = this.game?.audio;
      if (!audio?.ctx) return;
      const dtmfFreqs = [1209, 1336, 1477, 1633];
      const f = dtmfFreqs[Math.floor(Math.random() * dtmfFreqs.length)] + (pct * 3.5);
      this.playAudioTone(f, 0.045, 0.22, "square");
      this.game?.input?.rumble?.(0.12, 0.1, 35);
    } catch {}
  }

  // Wire snip & electrical sizzle while defusing
  playWireSnipTick(pct = 0) {
    try {
      const audio = this.game?.audio;
      if (!audio?.ctx) return;
      audio.noise({ dur: 0.04, gain: 0.32, type: "highpass", freq: 4200 });
      this.playAudioTone(320 + Math.random() * 80 + (pct * 2.5), 0.06, 0.18, "sawtooth");
      this.game?.input?.rumble?.(0.2, 0.16, 50);
    } catch {}
  }

  playPlantSound(pos = null) {
    try {
      const audio = this.game?.audio;
      if (!audio?.ctx) return;
      audio.noise({ dur: 0.12, gain: 0.45, type: "highpass", freq: 2400 });
      this.playAudioTone(1760, 0.08, 0.3, "square");
      setTimeout(() => this.playAudioTone(2349, 0.14, 0.35, "square"), 90);

      // Visual plant shockwave & smoke
      const effects = this.game?.effects;
      const plantPos = pos ? new THREE.Vector3(pos.x, pos.y, pos.z) : this.bomb.position;
      if (effects) {
        effects.strokeBurst(plantPos, 1, 28, 6, { life: 0.45, size: 0.06 }); // 1 is k.RED
        effects.smoke(plantPos, new THREE.Vector3(0, 1, 0), 3);
        effects.sparks(plantPos, new THREE.Vector3(0, 1, 0), 3, 10, 4); // 3 is k.ORANGE
      }
    } catch {}
  }

  playDefuseSound() {
    try {
      const audio = this.game?.audio;
      if (!audio?.ctx) return;
      audio.noise({ dur: 0.15, gain: 0.45, type: "bandpass", freq: 3000, q: 2 });
      [659.25, 880, 1318.51].forEach((f, idx) => {
        setTimeout(() => this.playAudioTone(f, 0.16, 0.25, "triangle"), idx * 90);
      });

      // Visual electric disarm burst
      const effects = this.game?.effects;
      const bombPos = this.bomb.position.clone();
      bombPos.y += 0.2;
      if (effects) {
        effects.strokeBurst(bombPos, 0, 32, 7, { life: 0.6, size: 0.07 }); // 0 is k.BLUE
        effects.sparks(bombPos, new THREE.Vector3(0, 1, 0), 0, 14, 6);
        effects.smoke(bombPos, new THREE.Vector3(0, 1, 0), 2);
      }
    } catch {}
  }

  playExplosionSound() {
    this.triggerBombExplosionEffects();
  }

  // Grand C4 Detonation Effects
  triggerBombExplosionEffects() {
    try {
      const audio = this.game?.audio;
      const effects = this.game?.effects;
      const player = this.game?.player;
      const input = this.game?.input;
      const bombPos = this.bomb.position.clone();

      // 1. Intense Camera Shake
      if (effects) {
        effects.shakeAmt = Math.max(effects.shakeAmt || 0, 2.4);
      }

      // 2. White Screen Flash & Blast Proximity Damage
      if (player) {
        player.flashFx = 1.0;
        const dist = player.body?.pos?.distanceTo(bombPos) || 999;
        if (dist < 22 && player.alive) {
          player.lastHit = { amount: 999, crit: true, src: "c4_blast" };
          player.takeDamage(999, bombPos);
        }
      }

      // 3. Heavy Controller Vibration
      if (input?.rumble) {
        input.rumble(1.0, 1.0, 750);
      }

      // 4. Primary Particle Explosion (Giant fireball + ink debris)
      if (effects) {
        effects.explosion(bombPos, 16, 2); // 2 is k.BLACK
        effects.strokeBurst(bombPos, 3, 50, 16, { life: 1.6, size: 0.18 }); // 3 is k.ORANGE
        effects.strokeBurst(bombPos, 1, 42, 12, { life: 1.4, size: 0.14 }); // 1 is k.RED
        effects.splat(bombPos, new THREE.Vector3(0, 1, 0), 2, 4.2, null, 12);
        effects.smoke(bombPos, new THREE.Vector3(0, 1, 0), 12);

        // Staggered secondary detonations for seismic rumble feel
        [110, 220, 360].forEach((delay, idx) => {
          setTimeout(() => {
            const offset = new THREE.Vector3((Math.random() - 0.5) * 3.5, Math.random() * 1.5, (Math.random() - 0.5) * 3.5);
            const subPos = bombPos.clone().add(offset);
            effects.explosion(subPos, 8, idx % 2 === 0 ? 3 : 1);
            effects.strokeBurst(subPos, 3, 24, 9, { life: 0.85, size: 0.09 });
            if (effects.shakeAmt < 1.2) effects.shakeAmt += 0.6;
          }, delay);
        });
      }

      // 5. Deep Seismic Audio Blast
      if (audio?.ctx) {
        try {
          const ctx = audio.ctx;
          const nowT = ctx.currentTime;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(85, nowT);
          osc.frequency.exponentialRampToValueAtTime(20, nowT + 1.2);
          gain.gain.setValueAtTime(0.85, nowT);
          gain.gain.exponentialRampToValueAtTime(0.001, nowT + 1.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(nowT);
          osc.stop(nowT + 1.5);
        } catch {}
      }
      if (audio?.explosion) {
        audio.explosion(bombPos);
      }

      // Hide bomb mesh on detonation
      if (this.bombMesh) {
        this.bombMesh.visible = false;
      }
    } catch {}
  }

  playRoundEndSound(won) {
    try {
      const audio = this.game?.audio;
      if (!audio) return;
      if (won) {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
          setTimeout(() => audio.tone({ freq: f, dur: 0.2, gain: 0.2, type: "triangle" }), idx * 100);
        });
      } else {
        [440, 415.3, 392, 369.99].forEach((f, idx) => {
          setTimeout(() => audio.tone({ freq: f, dur: 0.22, gain: 0.2, type: "sawtooth" }), idx * 110);
        });
      }
    } catch {}
  }

  // --- MATCH & ROUND LIFECYCLE ---

  startMatchHost(teams) {
    this.isHost = true;
    this.enabled = true;
    this.matchId = "bm_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
    this.roundId = 0;
    this.scores = { red: 0, blue: 0 };
    this.teams = {
      red: Array.isArray(teams.red) ? [...teams.red] : [],
      blue: Array.isArray(teams.blue) ? [...teams.blue] : [],
    };
    this.carrierHistory = [];
    this.lastWinner = null;
    this.lastReason = null;
    this.roundEndSoundPlayed = false;
    this.startRoundHost();
  }

  startRoundHost() {
    this.roundId++;
    this.revision++;
    this.phase = "preparing";
    const now = performance.now();
    this.phaseEndsAt = now + BOMB_CONFIG.PREP_TIME * 1000;
    this.explodesAt = 0;
    this.interaction = null;
    this.lastWinner = null;
    this.lastReason = null;
    this.roundEndSoundPlayed = false;

    // Populate alive players from active teams
    this.alivePlayerIds = new Set([...this.teams.red, ...this.teams.blue]);

    // Select Bomb Carrier among alive Tero players (rotate fair)
    const aliveTeros = this.teams.red.filter((id) => this.alivePlayerIds.has(id));
    let carrierId = null;
    if (aliveTeros.length > 0) {
      // Find one not in recent history, or reset history if all used
      const unused = aliveTeros.filter((id) => !this.carrierHistory.includes(id));
      if (unused.length > 0) {
        carrierId = unused[Math.floor(Math.random() * unused.length)];
      } else {
        this.carrierHistory = [];
        carrierId = aliveTeros[Math.floor(Math.random() * aliveTeros.length)];
      }
      this.carrierHistory.push(carrierId);
    }

    this.bomb = {
      state: "carried",
      carrierId,
      position: new THREE.Vector3(),
      siteId: null,
      plantedAt: 0,
      explodesAt: 0,
    };

    // Calculate spawn assignments for all players
    const spawns = this.calculateTeamSpawns();
    const spawnPositions = Object.fromEntries(
      Object.entries(spawns).map(([id, index]) => {
        const position = this.getTeamSpawnPosition(id, index);
        return [id, position ? { x: position.x, y: position.y, z: position.z } : null];
      }),
    );

    // Broadcast authoritative round start snapshot
    this.broadcastSnapshot({
      type: "round_start",
      spawns,
      spawnPositions,
    });
  }

  calculateTeamSpawns() {
    const level = this.game.level;
    const teamSpawns = level?.teamSpawns || [[], []];
    const redSpawns = teamSpawns[0] || [];
    const blueSpawns = teamSpawns[1] || [];

    const spawns = {};
    this.teams.red.forEach((id, idx) => {
      spawns[id] = idx % Math.max(1, redSpawns.length);
    });
    this.teams.blue.forEach((id, idx) => {
      spawns[id] = idx % Math.max(1, blueSpawns.length);
    });
    return spawns;
  }

  getTeamSpawnPosition(playerId, assignedIndex = null) {
    const team = this.teams?.red?.includes(playerId) ? "red"
      : this.teams?.blue?.includes(playerId) ? "blue" : null;
    if (!team) return null;
    const points = this.game?.level?.teamSpawns?.[team === "red" ? 0 : 1];
    if (!points?.length) return null;
    const index = Number.isInteger(assignedIndex) && assignedIndex >= 0
      ? assignedIndex : this.teams[team].indexOf(playerId);
    return points[index % points.length]?.clone() || null;
  }

  // --- HOST STATE MACHINE & TIMERS ---

  updateHost(dt, now) {
    if (!this.isHost || !this.enabled) return;

    // 1. Preparing Phase -> Live Phase
    if (this.phase === "preparing") {
      if (now >= this.phaseEndsAt) {
        this.phase = "live";
        this.phaseEndsAt = now + BOMB_CONFIG.ROUND_TIME * 1000;
        this.revision++;
        this.broadcastSnapshot({ type: "phase_change" });
      }
      return;
    }

    // 2. Active Interaction Handling (Planting / Defusing)
    if (this.interaction) {
      const inter = this.interaction;
      // Check if interaction timer finished
      if (now >= inter.completesAt) {
        if (inter.kind === "plant") {
          this.completePlantHost(inter.playerId, inter.siteId, inter.pos);
        } else if (inter.kind === "defuse") {
          this.completeDefuseHost(inter.playerId);
        }
      }
    }

    // 3. Live Phase: Attack Timer & Elimination Checks
    if (this.phase === "live") {
      // Check time out (CT wins because bomb not planted)
      if (now >= this.phaseEndsAt) {
        this.finalizeRoundHost("blue", "time_expired");
        return;
      }

      // Check Team Eliminations
      const aliveTeros = this.teams.red.filter((id) => this.alivePlayerIds.has(id));
      const aliveCts = this.teams.blue.filter((id) => this.alivePlayerIds.has(id));

      if (aliveTeros.length === 0 && aliveCts.length === 0) {
        // Both eliminated before plant: CT wins
        this.finalizeRoundHost("blue", "all_eliminated");
        return;
      }
      if (aliveTeros.length === 0) {
        // All Tero dead, bomb not planted: CT wins
        this.finalizeRoundHost("blue", "tero_eliminated");
        return;
      }
      if (aliveCts.length === 0) {
        // All CT dead: Tero wins
        this.finalizeRoundHost("red", "ct_eliminated");
        return;
      }
    }

    // 4. Planted Phase: Bomb Countdown & Elimination Checks
    if (this.phase === "planted") {
      // Check bomb explosion
      if (now >= this.explodesAt) {
        this.bomb.state = "exploded";
        this.finalizeRoundHost("red", "bomb_exploded");
        return;
      }

      // If all CTs dead after plant: Tero wins immediately (CT cannot defuse)
      const aliveCts = this.teams.blue.filter((id) => this.alivePlayerIds.has(id));
      if (aliveCts.length === 0) {
        this.finalizeRoundHost("red", "ct_eliminated");
        return;
      }
      // Note: If all Teros are dead after plant, round CONTINUES until CT defuses or bomb explodes!
    }

    // 5. Round End Phase -> Next Round or Match End
    if (this.phase === "round_end") {
      if (now >= this.phaseEndsAt) {
        if (this.scores.red >= BOMB_CONFIG.TARGET_WINS || this.scores.blue >= BOMB_CONFIG.TARGET_WINS) {
          this.phase = "match_end";
          this.revision++;
          const matchWinner = this.scores.red >= BOMB_CONFIG.TARGET_WINS ? "red" : "blue";
          this.broadcastSnapshot({ type: "match_end", matchWinner });
        } else {
          this.startRoundHost();
        }
      }
    }
  }

  // Complete Plant Action on Host
  completePlantHost(playerId, siteId, pos) {
    if (this.phase !== "live" || this.bomb.state !== "carried" || this.bomb.carrierId !== playerId) {
      this.interaction = null;
      return;
    }
    const now = performance.now();
    this.phase = "planted";
    this.explodesAt = now + BOMB_CONFIG.BOMB_TIME * 1000;
    this.phaseEndsAt = this.explodesAt;
    this.interaction = null;
    this.revision++;

    this.bomb = {
      state: "planted",
      carrierId: null,
      position: new THREE.Vector3(pos.x, pos.y, pos.z),
      siteId,
      plantedAt: now,
      explodesAt: this.explodesAt,
    };

    this.broadcastSnapshot({
      type: "bomb_planted",
      siteId,
      pos,
    });
  }

  // Complete Defuse Action on Host
  completeDefuseHost(playerId) {
    if (this.phase !== "planted" || this.bomb.state !== "planted") {
      this.interaction = null;
      return;
    }
    this.bomb.state = "defused";
    this.interaction = null;
    this.finalizeRoundHost("blue", "bomb_defused");
  }

  // Idempotent Round Finalization on Host
  finalizeRoundHost(winner, reason) {
    if (this.phase === "round_end" || this.phase === "match_end") return;
    const now = performance.now();
    this.phase = "round_end";
    this.phaseEndsAt = now + BOMB_CONFIG.POST_ROUND_TIME * 1000;
    this.revision++;

    this.lastWinner = winner;
    this.lastReason = reason;

    if (winner === "red") this.scores.red++;
    else if (winner === "blue") this.scores.blue++;

    this.interaction = null;

    this.broadcastSnapshot({
      type: "round_end",
      winner,
      reason,
      lastWinner: winner,
      lastReason: reason,
      scores: { ...this.scores },
    });
  }

  // --- HOST INTENT VALIDATION ---

  handleClientIntent(senderId, intent) {
    if (!this.isHost || !this.enabled) return;
    if (!intent || typeof intent !== "object") return;
    const now = performance.now();

    const isAlive = this.alivePlayerIds.has(senderId);
    const isTero = this.teams.red.includes(senderId);
    const isCt = this.teams.blue.includes(senderId);

    // 1. Drop Bomb (e.g. carrier died or disconnected)
    if (intent.action === "drop_bomb" && isTero && this.bomb.carrierId === senderId) {
      this.dropBombHost(intent.pos);
      return;
    }

    // 2. Pickup Dropped Bomb (Atomic: first valid alive Tero gets it)
    if (intent.action === "pickup" && isTero && isAlive && this.bomb.state === "dropped") {
      const playerPos = intent.pos ? new THREE.Vector3(intent.pos.x, intent.pos.y, intent.pos.z) : null;
      if (playerPos && playerPos.distanceTo(this.bomb.position) <= BOMB_CONFIG.PICKUP_RADIUS + 0.8) {
        this.bomb.state = "carried";
        this.bomb.carrierId = senderId;
        this.revision++;
        this.broadcastSnapshot({ type: "bomb_picked", carrierId: senderId });
      }
      return;
    }

    // 3. Start Interact (Plant or Defuse)
    if (intent.action === "start_interact") {
      if (!isAlive || (this.phase !== "live" && this.phase !== "planted")) return;

      if (intent.kind === "plant" && isTero && this.phase === "live") {
        if (this.bomb.state !== "carried" || this.bomb.carrierId !== senderId) return;
        const siteId = this.getSiteAt(intent.pos);
        if (!siteId) return; // not inside valid plant volume

        const duration = BOMB_CONFIG.PLANT_TIME;
        this.interaction = {
          kind: "plant",
          playerId: senderId,
          siteId,
          pos: intent.pos,
          startedAt: now,
          completesAt: now + duration * 1000,
          token: intent.token || 1,
        };
        this.broadcastSnapshot({
          type: "interact_start",
          interaction: this.interaction,
        });
        return;
      }

      if (intent.kind === "defuse" && isCt && this.phase === "planted") {
        if (this.bomb.state !== "planted") return;
        // Only 1 CT active defuser at a time
        if (this.interaction && this.interaction.kind === "defuse") return;

        const bombPos = this.bomb.position;
        const playerPos = new THREE.Vector3(intent.pos.x, intent.pos.y, intent.pos.z);
        if (playerPos.distanceTo(bombPos) > BOMB_CONFIG.INTERACT_MAX_DIST) return;
        if (Math.abs(playerPos.y - bombPos.y) > BOMB_CONFIG.INTERACT_MAX_Y_DIFF) return;

        const duration = BOMB_CONFIG.DEFUSE_TIME;
        this.interaction = {
          kind: "defuse",
          playerId: senderId,
          startedAt: now,
          completesAt: now + duration * 1000,
          token: intent.token || 1,
        };
        this.broadcastSnapshot({
          type: "interact_start",
          interaction: this.interaction,
        });
        return;
      }
    }

    // 4. Cancel Interact
    if (intent.action === "cancel_interact") {
      if (this.interaction && this.interaction.playerId === senderId) {
        this.interaction = null;
        this.broadcastSnapshot({
          type: "interact_cancel",
          playerId: senderId,
        });
      }
      return;
    }

    // 5. Heartbeat Interact (Keeps hold alive across packet jitter)
    if (intent.action === "interact_heartbeat") {
      if (this.interaction && this.interaction.playerId === senderId) {
        this.interaction.lastHeartbeat = now;
      }
      return;
    }
  }

  // Drop bomb on floor at position or safe fallback
  dropBombHost(lastPos) {
    if (this.bomb.state !== "carried") return;
    const world = this.game?.world;
    let dropY = 0;
    let dropPos = new THREE.Vector3();

    if (lastPos) {
      dropPos.set(lastPos.x, lastPos.y, lastPos.z);
      if (world?.groundBelow) {
        dropY = world.groundBelow(dropPos.x, dropPos.y + 0.5, dropPos.z, 20);
        dropPos.y = Math.max(0, dropY);
      }
    } else {
      // Fallback: Tero base center
      dropPos.set((345 - 340) / 5, 0, (205 - 350) / 5);
    }

    this.bomb.state = "dropped";
    this.bomb.carrierId = null;
    this.bomb.position.copy(dropPos);
    this.revision++;

    this.broadcastSnapshot({
      type: "bomb_dropped",
      pos: { x: dropPos.x, y: dropPos.y, z: dropPos.z },
    });
  }

  // Handle Player Death on Host
  handlePlayerDeathHost(deadId) {
    if (!this.isHost || !this.enabled) return;
    this.alivePlayerIds.delete(deadId);

    // If carrier died: cancel any plant & drop bomb
    if (this.bomb.carrierId === deadId) {
      if (this.interaction && this.interaction.playerId === deadId) {
        this.interaction = null;
      }
      const isLocalHost = deadId === this.game?.peer?.id;
      const pos = isLocalHost ? this.game?.player?.body?.pos : this.game?.remotePlayers?.get(deadId)?.body?.pos;
      this.dropBombHost(pos);
    }

    // If defuser died: cancel defuse
    if (this.interaction && this.interaction.playerId === deadId) {
      this.interaction = null;
      this.broadcastSnapshot({ type: "interact_cancel", playerId: deadId });
    }
  }

  // Handle Player Disconnect / Leave on Host
  handlePlayerLeaveHost(leftId) {
    if (!this.isHost || !this.enabled) return;
    this.alivePlayerIds.delete(leftId);
    this.teams.red = this.teams.red.filter((id) => id !== leftId);
    this.teams.blue = this.teams.blue.filter((id) => id !== leftId);

    // If carrier disconnected, drop bomb
    if (this.bomb.carrierId === leftId) {
      this.dropBombHost(null);
    }
    if (this.interaction && this.interaction.playerId === leftId) {
      this.interaction = null;
    }

    // Check Forfeit condition
    if (this.teams.red.length === 0 && this.teams.blue.length > 0) {
      this.finalizeRoundHost("blue", "tero_forfeit");
    } else if (this.teams.blue.length === 0 && this.teams.red.length > 0) {
      this.finalizeRoundHost("red", "ct_forfeit");
    }
  }

  // --- MULTIPLAYER SNAPSHOT BROADCAST ---

  broadcastSnapshot(extra = {}) {
    if (!this.isHost) return;
    const now = performance.now();
    const packet = {
      matchId: this.matchId,
      roundId: this.roundId,
      revision: this.revision,
      phase: this.phase,
      hostNow: now,
      phaseEndsAt: this.phaseEndsAt,
      explodesAt: this.explodesAt,
      scores: { ...this.scores },
      teams: { red: [...this.teams.red], blue: [...this.teams.blue] },
      alivePlayerIds: Array.from(this.alivePlayerIds),
      lastWinner: this.lastWinner,
      lastReason: this.lastReason,
      bomb: {
        state: this.bomb.state,
        carrierId: this.bomb.carrierId,
        pos: { x: this.bomb.position.x, y: this.bomb.position.y, z: this.bomb.position.z },
        siteId: this.bomb.siteId,
        explodesAt: this.bomb.explodesAt,
      },
      interaction: this.interaction,
      ...extra,
    };

    // Send through host peer
    this.game?.peer?.send("bomb", packet);
    // Also apply locally on host client
    this.applySnapshot(packet);
  }

  // Apply Authoritative Snapshot on Client
  applySnapshot(packet) {
    if (!packet) return;
    const myId = this.game?.peer?.id;
    const now = performance.now();

    // Ignore outdated rounds / revisions
    if (this.matchId && packet.matchId && this.matchId !== packet.matchId) {
      this.matchId = packet.matchId;
      this.roundId = packet.roundId;
      this.revision = packet.revision;
    } else if (packet.roundId < this.roundId || (packet.roundId === this.roundId && packet.revision < this.revision)) {
      return;
    }

    this.matchId = packet.matchId || this.matchId;
    this.roundId = packet.roundId ?? this.roundId;
    this.revision = packet.revision ?? this.revision;
    this.phase = packet.phase || this.phase;

    // Clock synchronization offset estimation
    if (packet.hostNow) {
      this.hostTimeOffset = packet.hostNow - now;
    }

    this.phaseEndsAt = packet.phaseEndsAt || 0;
    this.explodesAt = packet.explodesAt || 0;

    if (packet.scores) {
      this.scores = { ...packet.scores };
    }
    if (packet.teams) {
      this.teams = {
        red: Array.isArray(packet.teams.red) ? [...packet.teams.red] : [],
        blue: Array.isArray(packet.teams.blue) ? [...packet.teams.blue] : [],
      };
    }
    if (packet.alivePlayerIds) {
      this.alivePlayerIds = new Set(packet.alivePlayerIds);
    }
    if (packet.lastWinner !== undefined) {
      this.lastWinner = packet.lastWinner;
    }
    if (packet.lastReason !== undefined) {
      this.lastReason = packet.lastReason;
    }
    if (packet.winner !== undefined) {
      this.lastWinner = packet.winner;
    }
    if (packet.reason !== undefined) {
      this.lastReason = packet.reason;
    }

    // Bomb State Sync
    if (packet.bomb) {
      const oldState = this.bomb.state;
      this.bomb.state = packet.bomb.state;
      this.bomb.carrierId = packet.bomb.carrierId;
      if (packet.bomb.pos) {
        this.bomb.position.set(packet.bomb.pos.x, packet.bomb.pos.y, packet.bomb.pos.z);
      }
      this.bomb.siteId = packet.bomb.siteId;
      this.bomb.explodesAt = packet.bomb.explodesAt || 0;

      // Audio triggers on state changes
      if (oldState !== "planted" && this.bomb.state === "planted") {
        this.playPlantSound();
      } else if (oldState !== "defused" && this.bomb.state === "defused") {
        this.playDefuseSound();
      } else if (oldState !== "exploded" && this.bomb.state === "exploded") {
        this.playExplosionSound();
      }
    }

    // Interaction Sync
    this.interaction = packet.interaction || null;
    if (!this.interaction && this.localInteract.active) {
      this.cancelLocalInteract();
    }

    // Event Triggers
    if (packet.type === "round_start") {
      this.onRoundStartClient(packet);
    } else if (packet.type === "round_end") {
      this.onRoundEndClient(packet);
    } else if (packet.type === "match_end") {
      this.onMatchEndClient(packet);
    }

    // Update Spectator status for dead / late joiners
    const isMyTeamAlive = myId && this.alivePlayerIds.has(myId);
    if (!isMyTeamAlive && this.phase !== "lobby" && this.phase !== "match_end") {
      this.enableSpectatorClient();
    } else if (isMyTeamAlive) {
      this.disableSpectatorClient();
    }
  }

  // Client Event: Round Start
  onRoundStartClient(packet) {
    const myId = this.game?.peer?.id;
    const player = this.game?.player;

    // Reset local player weapons, HP, ammo, effects
    if (this.game?.state) {
      this.game.state.state = "play";
      this.game.state.deathT = 0;
      this.game.state.promptT = 0;
      this.game.state.respawnT = 0;
    }

    if (player) {
      player.hp = player.maxHp;
      player.alive = true;
      player.shieldT = 0;
      player.grapStam = 1;
      player.weapons.forEach((w) => {
        if (w.isGun) {
          w.mag = w.magSize;
          w.reserve = w.startReserve || 90;
          w.reloading = false;
        }
      });
      // Teleport to assigned spawn
      const mySpawnIdx = packet.spawns ? packet.spawns[myId] : null;
      const assigned = packet.spawnPositions?.[myId];
      const spawnPosition = assigned && [assigned.x, assigned.y, assigned.z].every(Number.isFinite)
        ? new THREE.Vector3(assigned.x, assigned.y, assigned.z)
        : this.getTeamSpawnPosition(myId, mySpawnIdx);
      if (spawnPosition) {
        player.body.pos.copy(spawnPosition);
        player.body.vel.set(0, 0, 0);
      }
      if (player.J?.hips?.parent) {
        player.J.hips.parent.rotation.x = 0;
      }
      if (player.face) {
        player.face.eyes.visible = true;
        player.face.xeyes.visible = false;
      }
      player.lastHitBy = null;
      player.lastHit = null;
    }

    if (this.game?.hud) {
      this.game.hud.setFocusMark?.(null);
    }

    // Reset breakables
    if (this.game?.level?.breakables) {
      this.game.level.breakables.forEach((b) => {
        b.alive = true;
        if (b.mesh) b.mesh.visible = true;
      });
    }

    this.lastWinner = null;
    this.lastReason = null;
    this.roundEndSoundPlayed = false;
    this.disableSpectatorClient();
  }

  // Client Event: Round End
  onRoundEndClient(packet) {
    if (packet.winner) this.lastWinner = packet.winner;
    if (packet.reason) this.lastReason = packet.reason;
    if (packet.lastWinner) this.lastWinner = packet.lastWinner;
    if (packet.lastReason) this.lastReason = packet.lastReason;

    const myId = this.game?.peer?.id;
    const myTeam = this.teams.red.includes(myId) ? "red" : this.teams.blue.includes(myId) ? "blue" : null;
    const roundWinner = this.lastWinner || packet.winner;
    const won = myTeam && roundWinner === myTeam;
    if (!this.roundEndSoundPlayed) {
      this.roundEndSoundPlayed = true;
      this.playRoundEndSound(won);
    }
  }

  // Client Event: Match End
  onMatchEndClient(packet) {
    const myId = this.game?.peer?.id;
    const myTeam = this.teams.red.includes(myId) ? "red" : this.teams.blue.includes(myId) ? "blue" : null;
    const won = myTeam && packet.matchWinner === myTeam;
    this.playRoundEndSound(won);
    if (typeof window.__doodleEndMatch === "function") {
      setTimeout(() => {
        window.__doodleEndMatch({
          id: packet.matchWinner === "red" ? "__red__" : "__blue__",
          name: packet.matchWinner === "red" ? "TERO (RED TEAM)" : "CT (GREEN TEAM)",
        });
      }, 3500);
    }
  }

  // --- CLIENT INPUT & LOCAL INTERACTION ---

  updateClient(dt, now) {
    if (!this.enabled || this.phase === "lobby") return;

    const myId = this.game?.peer?.id;
    const player = this.game?.player;
    const input = this.game?.input;
    if (!player) return;

    const isAlive = this.alivePlayerIds.has(myId);
    const isTero = this.teams.red.includes(myId);
    const isCt = this.teams.blue.includes(myId);

    // 1. Locked Movement/Firing during "preparing" and "round_end"
    if (this.phase === "preparing" || this.phase === "round_end" || this.phase === "match_end") {
      player.body.vel.x = 0;
      player.body.vel.z = 0;
      player.firing = false;
    }

    // 2. Spectator Camera Update
    if (this.spectator.active) {
      this.updateSpectatorCamera(dt);
      return;
    }

    if (!isAlive) return;

    // 3. Dropped Bomb Proximity Pickup for Tero
    if (isTero && this.bomb.state === "dropped") {
      const distToBomb = player.body.pos.distanceTo(this.bomb.position);
      if (distToBomb <= BOMB_CONFIG.PICKUP_RADIUS) {
        this.sendIntent({
          action: "pickup",
          pos: { x: player.body.pos.x, y: player.body.pos.y, z: player.body.pos.z },
        });
      }
    }

    // 4. Plant / Defuse Interaction Handling
    // Keys checked: KeyF, KeyE, or Gamepad button 2 (Square / X)
    const interactKeyDown =
      input?.keys?.melee || // KeyF
      input?.keys?.grapple || // KeyE
      input?.padState?.reload || // Gamepad Square
      (input?.mouseBtns?.fire && this.bomb.carrierId === myId && isTero);

    if (this.localInteract.active) {
      // Cancellation Checks:
      // a. Released interact key
      // b. Moved beyond threshold from start position
      // c. Jumped off ground
      const movedDist = player.body.pos.distanceTo(this.localInteract.startPos);
      const cancelTriggered =
        !interactKeyDown ||
        movedDist > BOMB_CONFIG.MOVE_CANCEL_THRESHOLD ||
        !player.body.onGround;

      if (cancelTriggered) {
        this.cancelLocalInteract();
      } else {
        // Send heartbeat every 150ms
        if (now - this.localInteract.lastHeartbeat > 150) {
          this.localInteract.lastHeartbeat = now;
          this.sendIntent({
            action: "interact_heartbeat",
            token: this.localInteract.token,
          });
        }

        // Active interact effect tick (audio keypad / wire snip + sparks)
        const elapsed = (now - this.localInteract.startedAt) / 1000;
        const duration = this.localInteract.duration || 3.0;
        const pct = Math.min(100, Math.max(0, Math.round((elapsed / duration) * 100)));
        const interval = this.localInteract.kind === "plant" ? 280 : 340;

        if (!this.localInteract.lastEffectTick || now - this.localInteract.lastEffectTick >= interval) {
          this.localInteract.lastEffectTick = now;
          const effects = this.game?.effects;

          if (this.localInteract.kind === "plant") {
            this.playKeypadTick(pct);
            if (effects) {
              const sparkPos = player.body.pos.clone();
              sparkPos.y += 0.3;
              sparkPos.addScaledVector(player.forward, 0.6);
              effects.sparks(sparkPos, new THREE.Vector3(0, 1, 0), 3, 3, 2); // 3 is k.ORANGE
              effects.strokeBurst(sparkPos, 3, 3, 2, { life: 0.15, size: 0.03 });
            }
          } else if (this.localInteract.kind === "defuse") {
            this.playWireSnipTick(pct);
            if (effects) {
              const sparkPos = this.bomb.position.clone();
              sparkPos.y += 0.18;
              effects.sparks(sparkPos, new THREE.Vector3(0, 1, 0), 0, 4, 3); // 0 is k.BLUE
              effects.strokeBurst(sparkPos, 0, 3, 2, { life: 0.16, size: 0.03 });
            }
          }
        }
      }
    } else if (interactKeyDown) {
      // Check if we can start an interaction
      if (isTero && this.phase === "live" && this.bomb.carrierId === myId && player.body.onGround) {
        const siteId = this.getSiteAt(player.body.pos);
        if (siteId) {
          this.startLocalInteract("plant", BOMB_CONFIG.PLANT_TIME);
        }
      } else if (isCt && this.phase === "planted" && this.bomb.state === "planted" && player.body.onGround) {
        const dist = player.body.pos.distanceTo(this.bomb.position);
        const yDiff = Math.abs(player.body.pos.y - this.bomb.position.y);
        if (dist <= BOMB_CONFIG.INTERACT_MAX_DIST && yDiff <= BOMB_CONFIG.INTERACT_MAX_Y_DIFF) {
          this.startLocalInteract("defuse", BOMB_CONFIG.DEFUSE_TIME);
        }
      }
    }

    // Remote player interaction sparks (visual cue for teammates & enemies)
    if (this.interaction && this.interaction.playerId !== myId) {
      if (!this.lastRemoteEffectTick || now - this.lastRemoteEffectTick > 300) {
        this.lastRemoteEffectTick = now;
        const interPos = this.interaction.pos;
        const effects = this.game?.effects;
        if (interPos && effects) {
          const pt = new THREE.Vector3(interPos.x, interPos.y + 0.3, interPos.z);
          const color = this.interaction.kind === "plant" ? 3 : 0; // 3 orange, 0 blue
          effects.sparks(pt, new THREE.Vector3(0, 1, 0), color, 4, 3);
          effects.strokeBurst(pt, color, 3, 2, { life: 0.15, size: 0.03 });
        }
      }
    }

    // 5. Beeping Sound when Planted
    if (this.bomb.state === "planted" && this.explodesAt > 0) {
      const remaining = Math.max(0, (this.explodesAt - now) / 1000);
      let interval = 1.0;
      if (remaining < 5) interval = 0.15;
      else if (remaining < 10) interval = 0.25;
      else if (remaining < 20) interval = 0.5;
      else if (remaining < 30) interval = 0.75;

      if (now - this.lastBeepTime >= interval * 1000) {
        this.lastBeepTime = now;
        this.playAudioBeep(remaining < 5 ? 2400 : 1800, 0.06, 0.35);
      }
    }
  }

  startLocalInteract(kind, duration) {
    const player = this.game?.player;
    if (!player) return;

    this.localInteract = {
      active: true,
      kind,
      token: Math.floor(Math.random() * 100000) + 1,
      startPos: player.body.pos.clone(),
      startedAt: performance.now(),
      duration,
      lastHeartbeat: performance.now(),
      lastEffectTick: 0,
    };

    // Disable offensive weapons while interacting
    player.firing = false;

    this.sendIntent({
      action: "start_interact",
      kind,
      token: this.localInteract.token,
      pos: { x: player.body.pos.x, y: player.body.pos.y, z: player.body.pos.z },
    });
  }

  cancelLocalInteract() {
    if (!this.localInteract.active) return;
    this.localInteract.active = false;
    this.sendIntent({
      action: "cancel_interact",
      token: this.localInteract.token,
    });
  }

  sendIntent(intent) {
    if (this.isHost) {
      const myId = this.game?.peer?.id;
      this.handleClientIntent(myId, intent);
    } else {
      this.game?.peer?.send("b_intent", intent);
    }
  }

  // Helper to reliably resolve player nicknames across game stores
  getPlayerName(id) {
    if (!id) return "Rekan Tim";
    if (this.game?.player && this.game?.peer?.id === id) {
      return this.game.player.name || "Kamu";
    }

    // 1. Remote player instance
    const remote = this.game?.remotePlayers?.get(id);
    if (remote?.name && remote.name !== id) return remote.name;

    // 2. Lobby players roster
    const lobbyPlayer = this.game?.lobby?.players?.get(id);
    if (lobbyPlayer?.name && lobbyPlayer.name !== id) return lobbyPlayer.name;

    // 3. Scoreboard map
    const scoreEntry = this.game?.scores?.get(id);
    if (scoreEntry?.name && scoreEntry.name !== id) return scoreEntry.name;

    // 4. Host name
    if (this.game?.peer && this.game.peer.hostId === id && this.game.peer.hostName) {
      return this.game.peer.hostName;
    }

    // 5. Global window fallback
    if (typeof window !== "undefined") {
      const gLobby = window.__game?.lobby?.players?.get(id);
      if (gLobby?.name && gLobby.name !== id) return gLobby.name;
      const gScore = window.__game?.scores?.get(id);
      if (gScore?.name && gScore.name !== id) return gScore.name;
    }

    // If ID is a long UUID/peerId, clean it up or return friendly role name
    if (typeof id === "string" && (id.length > 15 || id.includes("-"))) {
      const isRed = this.teams.red.includes(id);
      return isRed ? "Rekan TERO" : "Rekan CT";
    }
    return id;
  }

  // --- SPECTATOR SYSTEM ---

  enableSpectatorClient() {
    const wasActive = this.spectator.active;
    const previousTarget = this.spectator.targetId;
    this.spectator.active = true;
    const myId = this.game?.peer?.id;
    const myTeam = this.teams.red.includes(myId) ? "red"
      : this.teams.blue.includes(myId) ? "blue" : null;

    // 1. Prioritize alive teammates
    this.spectator.candidates = (this.teams[myTeam] || []).filter(
      (id) => id !== myId && this.alivePlayerIds.has(id)
    );

    if (this.spectator.candidates.length > 0) {
      const previousIndex = this.spectator.candidates.indexOf(previousTarget);
      this.spectator.candidateIndex = previousIndex >= 0 ? previousIndex : 0;
      this.spectator.targetId = this.spectator.candidates[this.spectator.candidateIndex];
    } else {
      this.spectator.targetId = null;
    }
    if (!wasActive) {
      this.spectator.cameraTargetId = null;
      this.spectator.fireHeld = !!this.game?.input?.mouseBtns?.fire;
    }
  }

  disableSpectatorClient() {
    this.spectator.active = false;
    this.spectator.targetId = null;
    this.spectator.candidates = [];
    this.spectator.fireHeld = false;
    this.spectator.cameraTargetId = null;
  }

  cycleSpectator(forward = true) {
    if (!this.spectator.active || this.spectator.candidates.length === 0) return;
    const count = this.spectator.candidates.length;
    if (forward) {
      this.spectator.candidateIndex = (this.spectator.candidateIndex + 1) % count;
    } else {
      this.spectator.candidateIndex = (this.spectator.candidateIndex - 1 + count) % count;
    }
    this.spectator.targetId = this.spectator.candidates[this.spectator.candidateIndex];
  }

  updateSpectatorCamera(dt) {
    const camera = this.game?.camera;
    const input = this.game?.input;
    if (!camera) return;

    // Auto switch if currently watched player died
    if (!this.spectator.targetId || !this.alivePlayerIds.has(this.spectator.targetId)) {
      this.enableSpectatorClient();
    }

    // Cycle teammates on click or Space
    const fireHeld = !!input?.mouseBtns?.fire;
    if (!this.game?.state?.menu && (input?.pressed?.("confirm") || input?.pressed?.("jump") || (fireHeld && !this.spectator.fireHeld))) {
      this.cycleSpectator(true);
    }
    this.spectator.fireHeld = fireHeld;

    const targetId = this.spectator.targetId;
    const target = targetId ? this.game?.remotePlayers?.get(targetId) : null;

    if (target && target.root) {
      // 3rd-person follow: slightly behind and above target
      const pos = target.body?.pos || target.root.position;
      const yaw = target.yaw || 0;
      const behindX = pos.x + Math.sin(yaw) * 3.2;
      const behindZ = pos.z + Math.cos(yaw) * 3.2;
      const targetCamPos = new THREE.Vector3(behindX, pos.y + 1.8, behindZ);

      if (this.spectator.cameraTargetId !== targetId) camera.position.copy(targetCamPos);
      else camera.position.lerp(targetCamPos, 1 - Math.exp(-dt * 22));
      this.spectator.cameraTargetId = targetId;
      camera.lookAt(pos.x, pos.y + 1.2, pos.z);
      this.game?.audio?.setListener?.(target.eye || camera.position, target.right);
    } else if (this.bomb.state === "planted") {
      // Spectate planted bomb if no teammates alive
      const bp = this.bomb.position;
      camera.position.lerp(new THREE.Vector3(bp.x + 2, bp.y + 2.5, bp.z + 2), Math.min(1, dt * 5));
      camera.lookAt(bp.x, bp.y + 0.3, bp.z);
      this.spectator.cameraTargetId = null;
    }
  }

  // --- 3D RENDER LOOP HOOK ---

  render() {
    if (!this.enabled || this.phase === "lobby") {
      if (this.bombMesh) this.bombMesh.visible = false;
      if (this.carrierBackpackMesh) this.carrierBackpackMesh.visible = false;
      this.siteRings.forEach((r) => (r.visible = false));
      return;
    }

    const myId = this.game?.peer?.id;
    const carrierId = this.bomb.carrierId;

    // 1. Update 3D Bomb Object
    if (this.bombMesh) {
      if (this.bomb.state === "dropped" || this.bomb.state === "planted") {
        this.bombMesh.visible = true;
        this.bombMesh.position.copy(this.bomb.position);
        if (this.bomb.state === "planted") {
          // Blinking LED
          const blink = Math.sin(performance.now() * 0.015) > 0;
          this.bombMesh.userData.ledMat.color.setHex(blink ? 0xff2020 : 0x400000);
        } else {
          this.bombMesh.userData.ledMat.color.setHex(0xd02030);
        }
      } else {
        this.bombMesh.visible = false;
      }
    }

    // 2. Carrier Backpack (Visible on third-person remote carrier)
    if (this.carrierBackpackMesh) {
      if (this.bomb.state === "carried" && carrierId && carrierId !== myId) {
        const remote = this.game?.remotePlayers?.get(carrierId);
        if (remote && remote.root) {
          this.carrierBackpackMesh.visible = true;
          const pos = remote.body?.pos || remote.root.position;
          const yaw = remote.root.rotation.y || 0;
          this.carrierBackpackMesh.position.set(
            pos.x - Math.sin(yaw) * 0.22,
            pos.y + 0.95,
            pos.z - Math.cos(yaw) * 0.22
          );
          this.carrierBackpackMesh.rotation.y = yaw;
        } else {
          this.carrierBackpackMesh.visible = false;
        }
      } else {
        this.carrierBackpackMesh.visible = false;
      }
    }

    // 3. Site rings visibility
    const showRings = this.phase === "live" || this.phase === "planted";
    this.siteRings.forEach((r) => (r.visible = showRings));
  }

  // --- MINIMAP METADATA ---

  getMinimapData(isTero) {
    if (!this.enabled || this.phase === "lobby") return null;

    const data = {
      sites: [
        { id: "A", x: LUXVILLE_SITES.A.center.x, z: LUXVILLE_SITES.A.center.z },
        { id: "B", x: LUXVILLE_SITES.B.center.x, z: LUXVILLE_SITES.B.center.z },
      ],
      bomb: null,
    };

    if (this.bomb.state === "planted") {
      // Visible to both teams
      data.bomb = {
        state: "planted",
        x: this.bomb.position.x,
        z: this.bomb.position.z,
        siteId: this.bomb.siteId,
      };
    } else if (this.bomb.state === "dropped" && isTero) {
      // Visible ONLY to Tero!
      data.bomb = {
        state: "dropped",
        x: this.bomb.position.x,
        z: this.bomb.position.z,
      };
    }

    return data;
  }
}
