// DOODLE WAR — MECHA OPS: Flight, Thrusters, Lock-On & Homing Missile System
// Implements 3D Mecha aerial movement (hover/jetpack, boost glide), targeting cone,
// and Macross-style homing missile salvos with ink contrails.

import * as THREE from "three";

export const MECHA_CONFIG = {
  MAX_BOOST: 100,
  BOOST_RECHARGE_RATE: 24,       // % per second
  BOOST_RECHARGE_DELAY: 0.5,      // seconds before recharge begins after boost
  HOVER_DRAIN_RATE: 26,          // % per second while hovering
  DASH_DRAIN_COST: 22,           // % consumed per boost dash
  OVERHEAT_COOLDOWN: 2.2,        // penalty cooldown when energy hits 0
  VERTICAL_THRUST_ACCEL: 32,     // upward thrust acceleration
  MAX_VERTICAL_VEL: 12,          // terminal upward velocity
  HOVER_GRAVITY_DAMP: 0.15,      // gravity dampening while hovering
  DASH_SPEED: 32,                // horizontal burst velocity
  DASH_DURATION: 0.28,           // seconds of high-velocity burst
  LOCK_ON_RANGE: 85,             // max lock-on distance in meters
  LOCK_ON_FOV_COS: 0.58,         // ~55 degree forward cone
  MISSILE_COUNT: 6,              // 6 missiles per salvo (RP-06 STARLING 06/6)
  MISSILE_COOLDOWN: 3.8,         // seconds between salvos
  MISSILE_SPEED: 40,             // missile travel speed
  MISSILE_TURN_RATE: 7.8,        // angular tracking rate (rad/s)
  MISSILE_DAMAGE: 45,            // damage per missile impact
  MISSILE_SPLASH_RADIUS: 3.8,    // splash damage radius
  CANNON_INTERVAL: 0.088,        // ~11.3 shots/sec rapid kinetic autocannon (VC-21 SQUALL)
  CANNON_DAMAGE: 28,             // damage per kinetic linear round
  CANNON_SPREAD: 0.012,          // high precision linear accelerator
  CANNON_MAX_AMMO: 480,          // matching RUSTLINE video 475 ammo count
  CANNON_RECHARGE_RATE: 75,      // ammo recharge rate per second when not firing
};

function getPlayerInk() {
  if (typeof window !== "undefined" && window.__playerInk != null) {
    return window.__playerInk;
  }
  return 0;
}

export function createMechModel({
  inkColor = 0,
  createMaterial = null,
  isRemote = false,
} = {}) {
  const root = new THREE.Group();
  root.name = isRemote ? "mecha_remote" : "mecha_player_local";

  const isCustomShader = typeof createMaterial === "function";

  const makeMat = (inkIndex, hexFallback, fill = true, doubleSide = false) => {
    if (isCustomShader) {
      return createMaterial({
        ink: inkIndex,
        fill: fill,
        side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
      });
    }
    return new THREE.MeshBasicMaterial({
      color: hexFallback,
      wireframe: !fill,
      side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
    });
  };

  const bodyInkIndex = (typeof inkColor === "number" && inkColor >= 0 && inkColor <= 5) ? inkColor : 0;
  const bodyHex = (typeof inkColor === "number" && inkColor > 5) ? inkColor : 0x1a31c2;

  const matBody = makeMat(bodyInkIndex, bodyHex, true);
  const matFrame = makeMat(2, 0x18181b, true); // k.BLACK = 2
  const matVisor = makeMat(3, 0xd9651e, true); // k.ORANGE = 3
  const matAccent = makeMat(3, 0xd9651e, true); // k.ORANGE = 3
  const matCyan = makeMat(0, 0x00f0ff, true); // k.BLUE = 0

  // 1. Pelvis & Waist Core
  const hips = new THREE.Group();
  hips.position.y = 0.88;
  root.add(hips);

  const hipCore = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, 0.28), matFrame);
  hips.add(hipCore);

  // Front Skirt Armor
  const frontSkirt = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.08), matBody);
  frontSkirt.position.set(0, -0.06, -0.15);
  frontSkirt.rotation.x = -0.25;
  hips.add(frontSkirt);

  // Side Skirt Thrusters
  const sideSkirtL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.2), matBody);
  sideSkirtL.position.set(-0.22, -0.06, 0);
  sideSkirtL.rotation.z = -0.15;
  hips.add(sideSkirtL);

  const sideSkirtR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.2), matBody);
  sideSkirtR.position.set(0.22, -0.06, 0);
  sideSkirtR.rotation.z = 0.15;
  hips.add(sideSkirtR);

  // 2. Reverse-Joint High-Mobility Legs
  const buildLeg = (side) => {
    const legG = new THREE.Group();
    legG.position.set(side * 0.22, -0.05, 0);

    // Thigh (angled forward)
    const thigh = new THREE.Group();
    legG.add(thigh);
    const thighMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.38, 0.18), matBody);
    thighMesh.position.set(0, -0.16, 0.05);
    thighMesh.rotation.x = -0.22;
    thigh.add(thighMesh);

    // Knee Armor Cowl (sharp protruding angle)
    const knee = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.24), matAccent);
    knee.position.set(0, -0.32, -0.12);
    knee.rotation.x = 0.4;
    thigh.add(knee);

    // Shin (angled backward - reverse joint feel)
    const shin = new THREE.Group();
    shin.position.set(0, -0.35, -0.05);
    thigh.add(shin);

    const shinMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.44, 0.18), matFrame);
    shinMesh.position.set(0, -0.22, 0.06);
    shinMesh.rotation.x = 0.35;
    shin.add(shinMesh);

    // Calf Thruster
    const calfThruster = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.12), matBody);
    calfThruster.position.set(side * 0.08, -0.22, 0.16);
    shin.add(calfThruster);

    // Ankle & Claw Foot (broad tripod stance)
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.36), matBody);
    foot.position.set(0, -0.48, -0.04);
    shin.add(foot);

    return { legG, thigh, shin, foot };
  };

  const leftLeg = buildLeg(-1);
  hips.add(leftLeg.legG);
  const rightLeg = buildLeg(1);
  hips.add(rightLeg.legG);

  // 3. Torso & Chiseled Chestplate
  const torso = new THREE.Group();
  torso.position.y = 0.2;
  hips.add(torso);

  // Abdomen segment
  const abdomen = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.22), matFrame);
  abdomen.position.y = 0.08;
  torso.add(abdomen);

  // Main Chest Block
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.48, 0.4), matBody);
  chest.position.y = 0.32;
  torso.add(chest);

  // Angular Front Armor Plate (chiseled wedge)
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.16), matFrame);
  chestPlate.position.set(0, 0.34, -0.22);
  chestPlate.rotation.x = -0.18;
  torso.add(chestPlate);

  // Reactor Intake Grills (Left & Right)
  const intakeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.05), matAccent);
  intakeL.position.set(-0.18, 0.26, -0.24);
  torso.add(intakeL);

  const intakeR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.05), matAccent);
  intakeR.position.set(0.18, 0.26, -0.24);
  torso.add(intakeR);

  // Sensor Head Unit
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.24), matFrame);
  head.position.set(0, 0.58, -0.08);
  torso.add(head);

  // Optical Sensor Visor (Glowing Amber Line)
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.08), matVisor);
  visor.position.set(0, 0.58, -0.2);
  torso.add(visor);

  // V-Fin Blade Antennas
  const finGeom = new THREE.BoxGeometry(0.02, 0.28, 0.08);
  const finL = new THREE.Mesh(finGeom, matAccent);
  finL.position.set(-0.12, 0.72, -0.05);
  finL.rotation.z = -0.35;
  finL.rotation.x = 0.2;
  torso.add(finL);

  const finR = new THREE.Mesh(finGeom, matAccent);
  finR.position.set(0.12, 0.72, -0.05);
  finR.rotation.z = 0.35;
  finR.rotation.x = 0.2;
  torso.add(finR);

  // 4. Overboost Backpack with Wing Binders & 4x Thrusters
  const backpack = new THREE.Group();
  backpack.position.set(0, 0.32, 0.22);
  torso.add(backpack);

  const packCore = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.44, 0.22), matFrame);
  backpack.add(packCore);

  // Left Thruster Binder Wing
  const binderL = new THREE.Group();
  binderL.position.set(-0.28, 0.1, 0.05);
  binderL.rotation.z = 0.22;
  binderL.rotation.y = -0.15;
  backpack.add(binderL);

  const binderMeshL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.48, 0.22), matBody);
  binderL.add(binderMeshL);

  // Right Thruster Binder Wing
  const binderR = new THREE.Group();
  binderR.position.set(0.28, 0.1, 0.05);
  binderR.rotation.z = -0.22;
  binderR.rotation.y = 0.15;
  backpack.add(binderR);

  const binderMeshR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.48, 0.22), matBody);
  binderR.add(binderMeshR);

  // 4x Exhaust Nozzles & Plasma Flames
  const nozzleGeom = new THREE.CylinderGeometry(0.05, 0.08, 0.14, 6);
  nozzleGeom.rotateX(Math.PI / 2);
  const flameGeom = new THREE.ConeGeometry(0.065, 0.45, 6);
  flameGeom.rotateX(-Math.PI / 2);

  const makeNozzle = (parent, x, y, z) => {
    const noz = new THREE.Mesh(nozzleGeom, matFrame);
    noz.position.set(x, y, z);
    parent.add(noz);

    const flm = new THREE.Mesh(flameGeom, matCyan);
    flm.position.set(x, y, z + 0.22);
    flm.visible = false;
    parent.add(flm);
    return { noz, flm };
  };

  const thrusterL1 = makeNozzle(binderL, 0, 0.12, 0.14);
  const thrusterL2 = makeNozzle(binderL, 0, -0.12, 0.14);
  const thrusterR1 = makeNozzle(binderR, 0, 0.12, 0.14);
  const thrusterR2 = makeNozzle(binderR, 0, -0.12, 0.14);
  const thrusterCalfL = makeNozzle(leftLeg.shin, -0.08, -0.22, 0.22);
  const thrusterCalfR = makeNozzle(rightLeg.shin, 0.08, -0.22, 0.22);

  const allFlames = [
    thrusterL1.flm, thrusterL2.flm, thrusterR1.flm, thrusterR2.flm,
    thrusterCalfL.flm, thrusterCalfR.flm
  ];

  // 5. Shoulder Missile Launchers (RP-06 STARLING - 6-Tube Box Pod)
  const buildShoulderPod = (side) => {
    const sh = new THREE.Group();
    sh.position.set(side * 0.44, 0.45, 0);

    // Pauldron
    const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.32), matBody);
    sh.add(pauldron);

    // Missile Box Pod
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.42), matFrame);
    pod.position.set(0, 0.18, -0.04);
    sh.add(pod);

    // 6 Missile Launcher Tubes (2 rows of 3 tubes matching RUSTLINE RP-06 Starling)
    const tubeGeom = new THREE.CylinderGeometry(0.024, 0.024, 0.09, 6);
    tubeGeom.rotateX(Math.PI / 2);
    const tubeOffsets = [
      [-0.065, 0.05], [0, 0.05], [0.065, 0.05],
      [-0.065, -0.05], [0, -0.05], [0.065, -0.05]
    ];
    for (const [tx, ty] of tubeOffsets) {
      const tube = new THREE.Mesh(tubeGeom, matAccent);
      tube.position.set(tx, 0.18 + ty, -0.25);
      sh.add(tube);
    }

    return sh;
  };

  const shoulderL = buildShoulderPod(-1);
  torso.add(shoulderL);
  const shoulderR = buildShoulderPod(1);
  torso.add(shoulderR);

  // 6. Left Arm: Tactical Shield Gauntlet
  const armL = new THREE.Group();
  armL.position.set(-0.46, 0.34, 0);
  torso.add(armL);

  const upperArmL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.26, 0.12), matFrame);
  upperArmL.position.y = -0.13;
  armL.add(upperArmL);

  const forearmL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.14), matBody);
  forearmL.position.set(0, -0.38, -0.08);
  armL.add(forearmL);

  // Strike Shield
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.48, 0.28), matAccent);
  shield.position.set(-0.1, -0.38, -0.08);
  shield.rotation.y = -0.1;
  armL.add(shield);

  // 7. Right Arm: Dual-Rail Heavy Linear Cannon (VC-21 SQUALL / HC-46 TIDEGLASS)
  const armR = new THREE.Group();
  armR.position.set(0.46, 0.34, 0);
  torso.add(armR);

  const upperArmR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.26, 0.12), matFrame);
  upperArmR.position.y = -0.13;
  armR.add(upperArmR);

  const forearmR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.14), matBody);
  forearmR.position.set(0, -0.38, -0.08);
  armR.add(forearmR);

  // Heavy Cannon Body Assembly
  const cannon = new THREE.Group();
  cannon.position.set(0, -0.38, -0.24);
  armR.add(cannon);

  // Breech Receiver Box
  const cannonBreech = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.52), matFrame);
  cannon.add(cannonBreech);

  // Side Ammo Capacitor Drum
  const ammoDrum = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.22), matAccent);
  ammoDrum.position.set(0.14, -0.02, 0.08);
  cannon.add(ammoDrum);

  // Top Linear Rail
  const railGeom = new THREE.BoxGeometry(0.045, 0.065, 1.05);
  const topRail = new THREE.Mesh(railGeom, matBody);
  topRail.position.set(0, 0.065, -0.58);
  cannon.add(topRail);

  // Bottom Linear Rail
  const btmRail = new THREE.Mesh(railGeom, matBody);
  btmRail.position.set(0, -0.065, -0.58);
  cannon.add(btmRail);

  // Glowing Cyan Inner Energy Conduit
  const conduitGeom = new THREE.BoxGeometry(0.02, 0.038, 0.95);
  const cyanConduit = new THREE.Mesh(conduitGeom, matCyan);
  cyanConduit.position.set(0, 0, -0.55);
  cannon.add(cyanConduit);

  // Rail Cross Braces
  for (const bz of [-0.35, -0.7, -0.98]) {
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.17, 0.05), matAccent);
    brace.position.set(0, 0, bz);
    cannon.add(brace);
  }

  // World Muzzle Marker at cannon tip
  const cannonMuzzle = new THREE.Object3D();
  cannonMuzzle.position.set(0, 0, -1.12);
  cannon.add(cannonMuzzle);

  // Muzzle Flash Mesh
  const flashGeom = new THREE.ConeGeometry(0.14, 0.55, 6);
  flashGeom.rotateX(-Math.PI / 2);
  const muzzleFlashMesh = new THREE.Mesh(flashGeom, matCyan);
  muzzleFlashMesh.position.set(0, 0, -1.35);
  muzzleFlashMesh.visible = false;
  cannon.add(muzzleFlashMesh);

  return {
    root,
    hips,
    torso,
    head,
    visor,
    chest,
    leftLeg,
    rightLeg,
    armL,
    armR,
    cannon,
    cannonMuzzle,
    muzzleFlashMesh,
    shoulderL,
    shoulderR,
    backpack,
    allFlames,
    flameL: allFlames[0],
    flameR: allFlames[2],
    matBody,
  };
}

export class MechaMode {
  constructor(gameCtx) {
    this.game = gameCtx; // { scene, camera, world, level, audio, peer, hud, player, remotePlayers, input, state, lobby, effects, enemies }
    this.enabled = false;

    // TPP Camera Configuration & State - Closer and Lower for punchy view!
    this.camDistance = 2.3;
    this.camHeightOffset = 0.28;
    this.camShoulderOffset = 0.44;
    this.currentCamDist = this.camDistance;
    this.currentCamHeight = this.camHeightOffset;
    this.currentShoulder = this.camShoulderOffset;

    // 3D Procedural Local Mech Model
    this.mechModel = null;
    this.mechParts = null;
    this.walkPhase = 0;
    // Remote Player Mechas (multiplayer sync)
    this.remoteMechs = new Map();
    if (this.game && this.game.scene) {
      this.buildLocalMechModel();
    }

    // Boost & Thruster State
    this.boostEnergy = MECHA_CONFIG.MAX_BOOST;
    this.isOverheated = false;
    this.overheatTimer = 0;
    this.rechargeDelayTimer = 0;
    this.isHovering = false;
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashDir = new THREE.Vector3();

    // Lock-on System
    this.currentLockTarget = null;
    this.lockTimer = 0;

    // Primary Heavy Linear Cannon (VC-21 SQUALL / HC-46 TIDEGLASS)
    this.cannonAmmo = MECHA_CONFIG.CANNON_MAX_AMMO;
    this.cannonTimer = 0;
    this.cannonRecoil = 0;
    this.muzzleFlashTimer = 0;
    this.activeTracers = [];

    // Missile System (RP-06 STARLING)
    this.missileCooldown = 0;
    this.missileCooldownMax = MECHA_CONFIG.MISSILE_COOLDOWN;
    this.activeMissiles = [];
    this.pendingSalvo = []; // Queue for staggered missile launch

    // Visual Alerts
    this.alertMessage = "";
    this.alertType = "info";
    this.alertDuration = 0;

    // Audio helper throttle
    this.lastThrusterSound = 0;

    // Ink material for missile body
    this.missileMat = new THREE.MeshBasicMaterial({ color: 0x1a31c2 });
    this.missileGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.65, 6);
    this.missileGeom.rotateX(Math.PI / 2);
  }

  enable() {
    this.enabled = true;
    this.boostEnergy = MECHA_CONFIG.MAX_BOOST;
    this.isOverheated = false;
    this.overheatTimer = 0;
    this.missileCooldown = 0;
    this.activeMissiles = [];
    this.pendingSalvo = [];
    this.currentCamDist = this.camDistance;
    this.currentCamHeight = this.camHeightOffset;
    this.currentShoulder = this.camShoulderOffset;

    if (typeof document !== "undefined" && document.body?.classList) {
      document.body.classList.add("mecha-active");
    }

    if (this.game && this.game.scene && !this.mechModel) {
      this.buildLocalMechModel();
    }
    if (this.mechModel) {
      this.mechModel.visible = true;
    }
    if (this.game?.player?.rig) {
      this.game.player.rig.visible = false;
    }

    // Build and attach 3D Mecha models for all online remote players
    if (this.game?.remotePlayers) {
      for (const [id, rp] of this.game.remotePlayers.entries()) {
        this.ensureRemoteMech(id, rp);
      }
    }

    this.showAlert("SYSTEM ONLINE: MECHA MODE ACTIVE [TPP]", "info", 3.0);
  }

  disable() {
    this.enabled = false;
    this.clearMissiles();
    if (typeof document !== "undefined" && document.body?.classList) {
      document.body.classList.remove("mecha-active");
    }
    if (this.mechModel) {
      this.mechModel.visible = false;
    }
    if (this.game?.player?.rig) {
      this.game.player.rig.visible = true;
    }
    if (this.game && this.game.hud && this.game.hud.hide) {
      this.game.hud.hide();
    }

    // Clean up all remote player mechas and restore humanoid stickmen
    for (const [id, rm] of this.remoteMechs.entries()) {
      if (rm.root && rm.root.parent) {
        rm.root.parent.remove(rm.root);
      }
      this.restoreRemoteHumanoid(rm.rp);
    }
    this.remoteMechs.clear();
  }

  showAlert(msg, type = "info", duration = 2.5) {
    this.alertMessage = msg;
    this.alertType = type;
    this.alertDuration = duration;
  }

  clearMissiles() {
    for (const m of this.activeMissiles) {
      if (m.mesh && m.mesh.parent) {
        m.mesh.parent.remove(m.mesh);
      }
    }
    this.activeMissiles = [];
    this.pendingSalvo = [];
  }

  // --- Main Update Loop ---
  update(dt, timestamp) {
    if (!this.enabled || !this.game || !this.game.player) return;

    // 0. Update all remote online players so enemies/allies render as 3D Mechas!
    this.updateRemoteMechs(dt);

    const player = this.game.player;
    const input = this.game.input;
    const body = player.body;

    if (!player.alive) {
      this.currentLockTarget = null;
      this.isHovering = false;
      this.isDashing = false;
      this.updateMissiles(dt);
      return;
    }

    // 1. Update Alert Timer
    if (this.alertDuration > 0) {
      this.alertDuration -= dt;
      if (this.alertDuration <= 0) {
        this.alertMessage = "";
      }
    }

    // 2. Overheat & Boost Recharge Management
    if (this.isOverheated) {
      this.overheatTimer -= dt;
      if (this.overheatTimer <= 0) {
        this.isOverheated = false;
        this.showAlert("SYSTEM RESTORED: THRUSTERS READY", "info", 1.8);
      }
    } else {
      if (this.rechargeDelayTimer > 0) {
        this.rechargeDelayTimer -= dt;
      } else if (this.boostEnergy < MECHA_CONFIG.MAX_BOOST && !this.isHovering && !this.isDashing) {
        this.boostEnergy = Math.min(
          MECHA_CONFIG.MAX_BOOST,
          this.boostEnergy + MECHA_CONFIG.BOOST_RECHARGE_RATE * dt
        );
      }
    }

    // 3. Vertical Thrust & Hover (SPACE)
    const isSpaceDown = input && (input.down("jump") || input.state?.jump || (input.keys && input.keys["Space"]));
    this.isHovering = false;

    if (isSpaceDown && !this.isOverheated && this.boostEnergy > 0) {
      this.isHovering = true;
      this.rechargeDelayTimer = MECHA_CONFIG.BOOST_RECHARGE_DELAY;
      this.boostEnergy -= MECHA_CONFIG.HOVER_DRAIN_RATE * dt;

      // Apply upward vertical lift
      body.vel.y = Math.min(
        MECHA_CONFIG.MAX_VERTICAL_VEL,
        body.vel.y + MECHA_CONFIG.VERTICAL_THRUST_ACCEL * dt
      );

      // Dampen downward gravity so the mech feels floaty and maneuverable
      if (body.vel.y < 0) {
        body.vel.y *= (1 - MECHA_CONFIG.HOVER_GRAVITY_DAMP);
      }

      // Visual particles & Thruster Audio
      this.spawnThrusterParticles(player, false);

      if (this.boostEnergy <= 0) {
        this.triggerOverheat();
      }
    }

    // 4. Boost Dash (SHIFT or DASH key)
    const isShiftPressed = input && (input.pressed("sprint") || input.pressed("dash") || (input.keys && input.keys["ShiftLeft"]));
    if (isShiftPressed && !this.isOverheated && !this.isDashing && this.boostEnergy >= MECHA_CONFIG.DASH_DRAIN_COST) {
      this.triggerDash(player);
    }

    // Update ongoing Dash
    if (this.isDashing) {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
      } else {
        // Apply directional burst velocity
        body.vel.x = this.dashDir.x * MECHA_CONFIG.DASH_SPEED;
        body.vel.z = this.dashDir.z * MECHA_CONFIG.DASH_SPEED;
        this.spawnThrusterParticles(player, true);
      }
    }

    // 5. Target Lock-On Scanning
    this.scanLockOnTarget(player);

    // 6. Primary Linear Heavy Cannon (VC-21 SQUALL) Firing & Ammo Management
    if (this.cannonTimer > 0) {
      this.cannonTimer = Math.max(0, this.cannonTimer - dt);
    }

    const isFireDown = input && (
      input.down("fire") ||
      input.state?.fire ||
      input.mouseBtns?.left ||
      (input.keys && (input.keys["Mouse0"] || input.keys["ControlLeft"]))
    );

    if (isFireDown) {
      this.firePrimaryCannon(player);
    } else if (this.cannonAmmo < MECHA_CONFIG.CANNON_MAX_AMMO) {
      this.cannonAmmo = Math.min(
        MECHA_CONFIG.CANNON_MAX_AMMO,
        this.cannonAmmo + MECHA_CONFIG.CANNON_RECHARGE_RATE * dt
      );
    }

    // 7. Missile Salvo Input (F or RMB or E)
    if (this.missileCooldown > 0) {
      this.missileCooldown = Math.max(0, this.missileCooldown - dt);
    }

    const isMissilePressed = input && (
      input.pressed("secondary") ||
      input.pressed("melee") ||
      (input.keys && (input.keys["KeyF"] || input.keys["KeyE"] || input.keys["KeyV"]))
    );

    if (isMissilePressed) {
      if (this.missileCooldown <= 0) {
        this.fireMissileSalvo(player);
      } else {
        this.showAlert(`MISSILES RELOADING... (${this.missileCooldown.toFixed(1)}s)`, "warning", 0.6);
      }
    }

    // 8. Update Staggered Salvo Queue
    if (this.pendingSalvo.length > 0) {
      const next = this.pendingSalvo[0];
      next.delay -= dt;
      if (next.delay <= 0) {
        this.pendingSalvo.shift();
        this.spawnSingleMissile(player, next.target, next.hardpointSide);
      }
    }

    // 9. Update Active Missiles & Heavy Tracers (Flight Physics & Collisions)
    this.updateMissiles(dt);
    this.updateTracers(dt);

    // 10. Update Cockpit HUD
    if (this.game.hud && typeof this.game.hud.update === "function") {
      const width = typeof window !== "undefined" ? window.innerWidth : 1000;
      const height = typeof window !== "undefined" ? window.innerHeight : 800;
      this.game.hud.update(this, this.game.camera, width, height);
    }

    // 11. Hide FPP weapon model so floating gun doesn't block TPP view
    if (player.rig) {
      player.rig.visible = false;
    }

    // 12. Update 3D Local Mech Model
    this.updateLocalMechModel(dt, player);

    // 13. Update TPP Camera with Wall Collision Avoidance
    this.updateTppCamera(dt, player);
  }

  // --- 3D Procedural Mech Model Construction (Rustline / Armored Core Blueprint Style) ---
  buildLocalMechModel() {
    if (!this.game || !this.game.scene) return;

    // Dispose old model if exists
    if (this.mechModel && this.mechModel.parent) {
      this.mechModel.parent.remove(this.mechModel);
    }

    const inkColor = getPlayerInk() != null ? getPlayerInk() : 0;
    const modelData = createMechModel({
      inkColor,
      createMaterial: this.game.createMaterial,
      isRemote: false,
    });

    modelData.root.visible = this.enabled;
    this.game.scene.add(modelData.root);
    this.mechModel = modelData.root;
    this.mechParts = modelData;
    this.walkPhase = 0;
  }

  ensureRemoteMech(id, rp) {
    if (!this.game?.scene || !rp) return null;
    let rm = this.remoteMechs.get(id);
    if (rm) return rm;

    const inkColor = rp.ink != null ? rp.ink : (getPlayerInk() != null ? getPlayerInk() : 0);
    const modelData = createMechModel({
      inkColor,
      createMaterial: this.game.createMaterial,
      isRemote: true,
    });

    modelData.root.visible = this.enabled && !!rp.alive;
    this.game.scene.add(modelData.root);

    this.hideRemoteHumanoid(rp);

    rm = {
      id,
      rp,
      root: modelData.root,
      parts: modelData,
      walkPhase: 0,
      flashTimer: 0,
    };
    this.remoteMechs.set(id, rm);
    return rm;
  }

  hideRemoteHumanoid(rp) {
    if (!rp || !rp.root) return;
    if (rp.root.children) {
      for (const child of rp.root.children) {
        if (child !== rp.tagG) {
          child.visible = false;
        }
      }
    }
    if (rp.tagG) {
      rp.tagG.visible = true;
      rp.tagG.position.y = 2.75;
    }
  }

  restoreRemoteHumanoid(rp) {
    if (!rp || !rp.root) return;
    if (rp.root.children) {
      for (const child of rp.root.children) {
        child.visible = true;
      }
    }
    if (rp.tagG) {
      rp.tagG.position.y = 2.25;
    }
  }

  removeRemoteMech(id) {
    const rm = this.remoteMechs.get(id);
    if (!rm) return;
    if (rm.root && rm.root.parent) {
      rm.root.parent.remove(rm.root);
    }
    this.restoreRemoteHumanoid(rm.rp);
    this.remoteMechs.delete(id);
  }

  updateRemoteMechs(dt) {
    if (!this.enabled || !this.game?.remotePlayers) return;

    const activeIds = new Set();
    for (const [id, rp] of this.game.remotePlayers.entries()) {
      activeIds.add(id);
      let rm = this.remoteMechs.get(id);
      if (!rm) {
        rm = this.ensureRemoteMech(id, rp);
      }
      if (!rm) continue;

      this.hideRemoteHumanoid(rp);

      if (!rp.alive) {
        rm.root.visible = false;
        continue;
      }

      rm.root.visible = true;

      // Sync ink color if changed
      if (rp.ink != null && rm.parts?.matBody) {
        if (rm.parts.matBody.uniforms?.uInk) {
          rm.parts.matBody.uniforms.uInk.value = rp.ink;
        } else if (rm.parts.matBody.color) {
          rm.parts.matBody.color.set(rp.ink);
        }
      }

      // Position & Yaw
      if (rp.body?.pos) {
        rm.root.position.copy(rp.body.pos);
      }
      if (typeof rp.yaw === "number") {
        rm.root.rotation.y = rp.yaw;
      }

      // Torso Pitch (aim angle)
      if (typeof rp.pitch === "number" && rm.parts.torso) {
        rm.parts.torso.rotation.x = -rp.pitch * 0.6;
      }

      // Velocity & Speed
      const velX = rp.body?.vel ? rp.body.vel.x : 0;
      const velY = rp.body?.vel ? rp.body.vel.y : 0;
      const velZ = rp.body?.vel ? rp.body.vel.z : 0;
      const horizSpeed = Math.hypot(velX, velZ);
      const isAirborne = !rp.body?.onGround || Math.abs(velY) > 0.8;
      const isFastMove = horizSpeed > 6.0;

      // Walking Leg Cycle
      if (!isAirborne && horizSpeed > 0.3) {
        rm.walkPhase = (rm.walkPhase + dt * Math.min(12, horizSpeed * 2.5)) % (Math.PI * 2);
        const legSwing = Math.sin(rm.walkPhase) * 0.45;
        rm.parts.leftLeg.thigh.rotation.x = legSwing;
        rm.parts.rightLeg.thigh.rotation.x = -legSwing;
        rm.parts.leftLeg.shin.rotation.x = 0.35 + Math.max(0, -legSwing * 0.3);
        rm.parts.rightLeg.shin.rotation.x = 0.35 + Math.max(0, legSwing * 0.3);
      } else {
        rm.parts.leftLeg.thigh.rotation.x *= 0.85;
        rm.parts.rightLeg.thigh.rotation.x *= 0.85;
        rm.parts.leftLeg.shin.rotation.x = THREE.MathUtils.lerp(rm.parts.leftLeg.shin.rotation.x, 0.35, dt * 10);
        rm.parts.rightLeg.shin.rotation.x = THREE.MathUtils.lerp(rm.parts.rightLeg.shin.rotation.x, 0.35, dt * 10);
      }

      // Thrusters
      const thrustersActive = isAirborne || isFastMove;
      for (const flm of rm.parts.allFlames) {
        flm.visible = thrustersActive;
        if (thrustersActive) {
          flm.scale.set(1, 0.8 + Math.random() * 0.5, 1);
        }
      }

      if (thrustersActive && Math.random() < 0.25) {
        if (this.game.effects && typeof this.game.effects.strokeBurst === "function") {
          const exhaustOrigin = rp.body.pos.clone().add(new THREE.Vector3(0, 1.2, 0));
          this.game.effects.strokeBurst(exhaustOrigin, 0x00f0ff, 2, 4, { life: 0.2, size: 0.035 });
        }
      }

      // Muzzle flash timer
      if (rm.flashTimer > 0) {
        rm.flashTimer -= dt;
        rm.parts.muzzleFlashMesh.visible = (rm.flashTimer > 0);
      }
    }

    // Disconnected cleanup
    for (const [id, rm] of this.remoteMechs.entries()) {
      if (!activeIds.has(id)) {
        this.removeRemoteMech(id);
      }
    }
  }

  onRemoteShot(id, shotData) {
    if (!this.enabled) return;
    const rm = this.remoteMechs.get(id);
    if (!rm || !rm.rp?.alive) return;

    rm.flashTimer = 0.09;
    rm.parts.muzzleFlashMesh.visible = true;

    const muzzlePos = new THREE.Vector3();
    rm.parts.cannonMuzzle.getWorldPosition(muzzlePos);

    const targets = shotData?.e || [];
    for (let o = 0; o + 2 < targets.length; o += 3) {
      const hitPoint = new THREE.Vector3(targets[o], targets[o + 1], targets[o + 2]);
      this.spawnHeavyTracer(muzzlePos, hitPoint);
    }

    this.playMechaCannonSound();
  }

  onRemoteMissileSalvo(id, data) {
    if (!this.enabled) return;
    const rm = this.remoteMechs.get(id);
    if (!rm || !rm.rp?.alive) return;

    if (this.game.audio && this.game.audio.shot) {
      this.game.audio.shot("rocket");
    }

    const scene = this.game.scene;
    if (!scene) return;

    let target = null;
    if (data?.targetId === this.game.peer?.id) {
      target = {
        id: this.game.player.id || "local",
        name: this.game.player.name || "YOU",
        center: this.game.player.eye ? this.game.player.eye.clone() : new THREE.Vector3(),
        body: this.game.player.body,
        entity: this.game.player,
        isBot: false,
      };
    } else if (data?.targetId && this.game.remotePlayers?.has(data.targetId)) {
      const rp = this.game.remotePlayers.get(data.targetId);
      target = {
        id: data.targetId,
        name: rp.name,
        center: rp.center,
        body: rp.body,
        entity: rp,
        isBot: false,
      };
    }

    const count = data?.count || MECHA_CONFIG.MISSILE_COUNT;
    const rp = rm.rp;
    const forward = rp.forward || new THREE.Vector3(0, 0, -1);
    const right = rp.right || new THREE.Vector3(1, 0, 0);

    for (let i = 0; i < count; i++) {
      const side = (i % 2 === 0 ? -1 : 1);
      const origin = rp.body.pos.clone();
      origin.y += 1.8;
      origin.addScaledVector(right, side * 0.5);

      const launchDir = forward.clone()
        .addScaledVector(right, side * 0.6)
        .addScaledVector(new THREE.Vector3(0, 1, 0), 0.4)
        .normalize();

      const mesh = new THREE.Mesh(this.missileGeom, this.missileMat);
      mesh.position.copy(origin);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), launchDir);
      scene.add(mesh);

      const missile = {
        pos: origin.clone(),
        vel: launchDir.clone().multiplyScalar(MECHA_CONFIG.MISSILE_SPEED * 0.7),
        target: target,
        life: 0,
        maxLife: 3.5,
        mesh: mesh,
        swirlPhase: Math.random() * Math.PI * 2,
        lastTrail: 0,
        ownerId: id,
      };
      this.activeMissiles.push(missile);
    }
  }

  onRemoteDeath(id, data) {
    const rm = this.remoteMechs.get(id);
    if (!rm) return;
    rm.root.visible = false;
    const pos = rm.root.position.clone();
    pos.y += 1.0;

    const effects = this.game?.effects;
    if (effects && typeof effects.strokeBurst === "function") {
      effects.strokeBurst(pos, 0xd9651e, 16, 12, { life: 0.6, size: 0.08 });
      effects.strokeBurst(pos, 0x00f0ff, 12, 8, { life: 0.45, size: 0.06 });
    }
    if (effects && typeof effects.smoke === "function") {
      effects.smoke(pos, 8);
    }
    if (this.game?.audio && typeof this.game.audio.explode === "function") {
      this.game.audio.explode(pos);
    }
  }

  updateLocalMechModel(dt, player) {
    if (!this.mechModel || !player) return;

    if (!this.enabled || !player.alive) {
      this.mechModel.visible = false;
      return;
    }

    this.mechModel.visible = true;

    // Sync body ink color if changed
    const inkColor = getPlayerInk();
    if (this.mechParts?.matBody && inkColor != null) {
      if (this.mechParts.matBody.uniforms?.uInk) {
        this.mechParts.matBody.uniforms.uInk.value = inkColor;
      } else if (this.mechParts.matBody.color) {
        this.mechParts.matBody.color.set(inkColor);
      }
    }

    // 1. Follow player position
    if (player.body?.pos) {
      this.mechModel.position.copy(player.body.pos);
    }

    // Ghost/fade mech body when aiming (RMB zoom) so crosshair is never blocked
    const isAiming = !!player._aiming;
    if (this.lastAimState !== isAiming) {
      this.lastAimState = isAiming;
      this.mechModel.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.transparent = true;
          child.material.opacity = isAiming ? 0.35 : 1.0;
        }
      });
    }

    // 2. Rotate body to match player yaw
    if (typeof player.yaw === "number") {
      this.mechModel.rotation.y = player.yaw;
    }

    // 3. Torso pitch tilt (aim up / down)
    const torso = this.mechParts?.torso;
    if (torso && typeof player.pitch === "number") {
      torso.rotation.x = player.pitch * 0.45;
    }

    // 4. Lateral tilt when strafing or dashing
    const input = this.game.input;
    const moveX = input?.move?.x || 0;
    this.mechModel.rotation.z = -moveX * 0.12;

    // 5. Thruster flame animation (4x nozzles)
    const isThrusting = this.isHovering || this.isDashing;
    const flames = this.mechParts?.allFlames || [];
    if (isThrusting) {
      const boostScale = this.isDashing ? 2.5 : (1.4 + Math.random() * 0.4);
      for (const flm of flames) {
        flm.visible = true;
        flm.scale.set(1 + Math.random() * 0.25, 1 + Math.random() * 0.25, boostScale);
      }
    } else {
      for (const flm of flames) {
        flm.visible = false;
      }
    }

    // 6. Leg & Arm animations
    const vel = player.body?.vel || { x: 0, z: 0 };
    const speed = Math.hypot(vel.x || 0, vel.z || 0);
    const onGround = !!player.body?.onGround;

    const leftLeg = this.mechParts?.leftLeg;
    const rightLeg = this.mechParts?.rightLeg;
    const armL = this.mechParts?.armL;
    const armR = this.mechParts?.armR;

    if (!onGround || this.isHovering) {
      // Aerial flight stance: legs swept back, arm cannon aimed forward
      if (leftLeg && rightLeg) {
        leftLeg.legG.rotation.x = 0.42;
        rightLeg.legG.rotation.x = 0.42;
        leftLeg.legG.rotation.z = -0.1;
        rightLeg.legG.rotation.z = 0.1;
      }
      if (armL && armR) {
        armL.rotation.x = -0.2;
        armR.rotation.x = -0.4;
      }
    } else if (speed > 0.5) {
      // Walking stride animation
      this.walkPhase = (this.walkPhase || 0) + dt * speed * 2.8;
      const legSwing = Math.sin(this.walkPhase) * 0.45;
      if (leftLeg && rightLeg) {
        leftLeg.legG.rotation.x = legSwing;
        rightLeg.legG.rotation.x = -legSwing;
        leftLeg.legG.rotation.z = 0;
        rightLeg.legG.rotation.z = 0;
      }
      if (armL && armR) {
        armL.rotation.x = -legSwing * 0.3;
        armR.rotation.x = -0.3 + legSwing * 0.15;
      }
    } else {
      // Idle stance
      if (leftLeg && rightLeg) {
        leftLeg.legG.rotation.set(0, 0, 0);
        rightLeg.legG.rotation.set(0, 0, 0);
      }
      if (armL && armR) {
        armL.rotation.set(0, 0, 0);
        armR.rotation.set(-0.25, 0, 0); // Ready arm cannon
      }
    }

    // 7. Cannon Recoil Physical Kickback on Arm
    if (armR) {
      armR.position.z = THREE.MathUtils.lerp(armR.position.z, -(this.cannonRecoil || 0), 0.45);
      this.cannonRecoil = THREE.MathUtils.lerp(this.cannonRecoil || 0, 0, 0.25);
    }

    // 8. Muzzle Flash Timer Management
    if (this.mechParts?.muzzleFlashMesh && this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.muzzleFlashTimer <= 0) {
        this.mechParts.muzzleFlashMesh.visible = false;
      }
    }
  }

  // --- TPP Camera System ---
  computeTppCamera(player, world, dt = 0.016) {
    if (!player) return null;

    const isAiming = !!player._aiming;
    // When aiming (RMB zoom):
    // - distance pulls in to 1.85m for punchy over-the-shoulder focus
    // - shoulder shifts OUTWARD to 0.72m (outside the right pauldron line)
    // - height raises to 0.40m (elevated sightline over the right shoulder)
    // This guarantees the target & crosshair are 100% unobstructed!
    const targetDist = isAiming ? 1.85 : this.camDistance;
    const targetShoulder = isAiming ? 0.72 : this.camShoulderOffset;
    const targetHeight = isAiming ? 0.40 : this.camHeightOffset;

    const lerpFactor = Math.min(1.0, 16 * dt);
    this.currentCamDist += (targetDist - this.currentCamDist) * lerpFactor;
    this.currentShoulder += (targetShoulder - this.currentShoulder) * lerpFactor;
    this.currentCamHeight += (targetHeight - this.currentCamHeight) * lerpFactor;

    // Anchor point at player's mid-chest / eye line
    const anchor = player.eye
      ? player.eye.clone().add(new THREE.Vector3(0, -0.2, 0))
      : (player.body?.pos ? player.body.pos.clone().add(new THREE.Vector3(0, 1.4, 0)) : new THREE.Vector3(0, 1.4, 0));

    // Desired camera position in world space:
    // camera sits behind player (-forward * dist) and over right shoulder (+right * shoulder) + height
    const fwd = player.forward || new THREE.Vector3(0, 0, -1);
    const right = player.right || new THREE.Vector3(1, 0, 0);

    const desiredPos = anchor.clone()
      .addScaledVector(fwd, -this.currentCamDist)
      .addScaledVector(right, this.currentShoulder)
      .add(new THREE.Vector3(0, this.currentCamHeight, 0));

    let clamped = false;
    // Anti-clipping Spring Arm raycast against world geometry
    if (world && typeof world.raycast === "function") {
      const camDir = desiredPos.clone().sub(anchor);
      const totalDist = camDir.length();
      if (totalDist > 0.05) {
        camDir.divideScalar(totalDist);
        const hit = world.raycast(anchor, camDir, totalDist);
        if (hit && hit.dist < totalDist) {
          const safeDist = Math.max(0.4, hit.dist - 0.2);
          desiredPos.copy(anchor).addScaledVector(camDir, safeDist);
          clamped = true;
        }
      }
    }

    const rotation = {
      x: player.pitch || 0,
      y: player.yaw || 0,
      z: player.roll || 0,
    };

    return {
      position: desiredPos,
      rotation: rotation,
      clamped: clamped,
    };
  }

  updateTppCamera(dt, player) {
    const camera = this.game?.camera;
    if (!camera || !player) return;

    const camData = this.computeTppCamera(player, this.game.world, dt);
    if (!camData) return;

    if (camera.position && typeof camera.position.copy === "function") {
      camera.position.copy(camData.position);
    }
    if (camera.rotation && typeof camera.rotation.set === "function") {
      camera.rotation.set(camData.rotation.x, camData.rotation.y, camData.rotation.z);
    }
  }

  triggerOverheat() {
    this.boostEnergy = 0;
    this.isOverheated = true;
    this.overheatTimer = MECHA_CONFIG.OVERHEAT_COOLDOWN;
    this.isHovering = false;
    this.isDashing = false;
    this.showAlert("WARNING: BOOSTER OVERHEATED!", "danger", 2.2);

    if (this.game.audio && this.game.audio.empty) {
      this.game.audio.empty();
    }
  }

  triggerDash(player) {
    this.boostEnergy -= MECHA_CONFIG.DASH_DRAIN_COST;
    this.rechargeDelayTimer = MECHA_CONFIG.BOOST_RECHARGE_DELAY * 1.5;
    this.isDashing = true;
    this.dashTimer = MECHA_CONFIG.DASH_DURATION;

    // Calculate dash direction from input or forward vector
    const input = this.game.input;
    const fwd = player.forward.clone().setY(0).normalize();
    const right = player.right.clone().setY(0).normalize();
    const move = input?.move || { x: 0, y: 0 };

    if (Math.abs(move.x) > 0.1 || Math.abs(move.y) > 0.1) {
      this.dashDir.set(0, 0, 0)
        .addScaledVector(right, move.x)
        .addScaledVector(fwd, move.y)
        .normalize();
    } else {
      this.dashDir.copy(fwd);
    }

    // Camera FOV Kick & Screen Shake
    if (typeof player.kickFov === "function") {
      player.kickFov(8);
    }
    if (this.game.effects) {
      this.game.effects.shakeAmt = Math.min(0.8, (this.game.effects.shakeAmt || 0) + 0.3);
    }
    if (this.game.audio && this.game.audio.dash) {
      this.game.audio.dash();
    }

    this.spawnThrusterBurst(player.center);

    if (this.boostEnergy <= 0) {
      this.triggerOverheat();
    }
  }

  spawnThrusterParticles(player, isHighBurst = false) {
    const effects = this.game.effects;
    if (!effects) return;

    // Spawn pen ink smoke/burst near the player's lower back
    const backPos = player.eye.clone()
      .addScaledVector(player.forward, -0.6)
      .addScaledVector(player.right, (Math.random() - 0.5) * 0.4);
    backPos.y -= 0.8;

    const inkColor = getPlayerInk();
    if (effects.strokeBurst) {
      effects.strokeBurst(backPos, inkColor, isHighBurst ? 4 : 2, isHighBurst ? 6 : 3, {
        life: isHighBurst ? 0.25 : 0.18,
        size: isHighBurst ? 0.04 : 0.025,
      });
    }
  }

  spawnThrusterBurst(pos) {
    const effects = this.game.effects;
    if (!effects || !effects.strokeBurst) return;
    const inkColor = getPlayerInk();
    effects.strokeBurst(pos, inkColor, 6, 8, { life: 0.35, size: 0.05 });
  }

  // --- Target Lock-On Logic ---
  scanLockOnTarget(player) {
    let bestTarget = null;
    let bestScore = -1;

    const candidates = [];

    // Collect Solo Bot enemies
    if (this.game.enemies && this.game.enemies.enemies) {
      for (const e of this.game.enemies.enemies) {
        if (e.alive && e.state !== "spawn") {
          candidates.push({
            id: e.id || "bot",
            name: (e.T && e.T.name) || "DRONE MECH",
            center: e.center,
            body: e.body,
            entity: e,
            isBot: true,
          });
        }
      }
    }

    // Collect Online Remote Players
    if (this.game.remotePlayers) {
      for (const [id, rp] of this.game.remotePlayers.entries()) {
        if (rp.alive) {
          // Check team friendliness if team mode
          const myTeam = this.game.lobby?.teams ? (this.game.lobby.teams.red?.includes(this.game.peer?.id) ? "red" : "blue") : null;
          const targetTeam = this.game.lobby?.teams ? (this.game.lobby.teams.red?.includes(id) ? "red" : "blue") : null;
          if (myTeam && targetTeam && myTeam === targetTeam) {
            continue; // Skip teammates
          }

          candidates.push({
            id: id,
            name: rp.name || "PILOT",
            center: rp.center,
            body: rp.body,
            entity: rp,
            isBot: false,
          });
        }
      }
    }

    const eye = player.eye;
    const fwd = player.forward;
    if (!eye || !fwd) return null;
    const diff = new THREE.Vector3();

    for (const c of candidates) {
      diff.subVectors(c.center, eye);
      const dist = diff.length();
      if (dist > MECHA_CONFIG.LOCK_ON_RANGE || dist < 1.0) continue;

      const dir = diff.divideScalar(dist);
      const dot = dir.dot(fwd);

      // Check within forward view cone
      if (dot < MECHA_CONFIG.LOCK_ON_FOV_COS) continue;

      // Line of sight check
      if (this.game.world && typeof this.game.world.hasLineOfSight === "function") {
        if (!this.game.world.hasLineOfSight(eye, c.center)) continue;
      }

      // Closer to crosshair center = higher score
      const score = dot * 4.0 - (dist / MECHA_CONFIG.LOCK_ON_RANGE);
      if (score > bestScore) {
        bestScore = score;
        c.dist = dist;
        bestTarget = c;
      }
    }

    this.currentLockTarget = bestTarget;
  }

  // --- Homing Missile Salvo ---
  fireMissileSalvo(player) {
    this.missileCooldown = MECHA_CONFIG.MISSILE_COOLDOWN;
    this.showAlert("MISSILE SALVO LAUNCHED!", "warning", 1.5);

    if (this.game.audio && this.game.audio.shot) {
      this.game.audio.shot("rocket");
    }

    // Queue 6 staggered missiles (left, right, left, right shoulder hardpoints)
    const target = this.currentLockTarget;
    for (let i = 0; i < MECHA_CONFIG.MISSILE_COUNT; i++) {
      this.pendingSalvo.push({
        delay: i * 0.09,
        target: target,
        hardpointSide: i % 2 === 0 ? -1 : 1,
      });
    }

    // Multiplayer sync missile salvo
    if (this.game.peer && this.game.peer.active) {
      const targetId = target ? (target.entity?.id || target.id || null) : null;
      if (typeof this.game.peer.sendFast === "function") {
        this.game.peer.sendFast("mecha_missile", { targetId });
      } else if (typeof this.game.peer.send === "function") {
        this.game.peer.send("mecha_missile", { targetId });
      }
    }
  }

  spawnSingleMissile(player, target, hardpointSide = 1) {
    const scene = this.game.scene;
    if (!scene) return;

    // Origin: Shoulder position behind/beside camera
    const origin = player.eye.clone()
      .addScaledVector(player.right, hardpointSide * 0.65)
      .addScaledVector(player.forward, -0.2);
    origin.y += 0.35;

    // Initial outward arc direction (Macross style launch curve)
    const launchDir = player.forward.clone()
      .addScaledVector(player.right, hardpointSide * 0.6)
      .addScaledVector(new THREE.Vector3(0, 1, 0), 0.4)
      .normalize();

    // 3D Mesh
    const mesh = new THREE.Mesh(this.missileGeom, this.missileMat);
    mesh.position.copy(origin);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), launchDir);
    scene.add(mesh);

    const missile = {
      pos: origin.clone(),
      vel: launchDir.clone().multiplyScalar(MECHA_CONFIG.MISSILE_SPEED * 0.7),
      target: target,
      life: 0,
      maxLife: 3.5,
      mesh: mesh,
      swirlPhase: Math.random() * Math.PI * 2,
      lastTrail: 0,
    };

    this.activeMissiles.push(missile);

    // Initial launch puff
    if (this.game.effects && this.game.effects.smoke) {
      this.game.effects.smoke(origin, 0.08);
    }
  }

  updateMissiles(dt) {
    const toRemove = [];
    const diff = new THREE.Vector3();
    const desiredDir = new THREE.Vector3();

    for (let i = 0; i < this.activeMissiles.length; i++) {
      const m = this.activeMissiles[i];
      m.life += dt;

      if (m.life >= m.maxLife) {
        toRemove.push(i);
        continue;
      }

      // 1. Steering & Guidance
      let hasTarget = m.target && m.target.entity && (m.target.entity.alive !== false);
      if (hasTarget) {
        diff.subVectors(m.target.center || m.target.body.pos, m.pos);
        const dist = diff.length();

        // Hit detection with target
        if (dist <= 1.4) {
          this.explodeMissile(m.pos, m.target);
          toRemove.push(i);
          continue;
        }

        desiredDir.copy(diff).normalize();

        // Add spiral swerve offset (Macross aesthetic)
        m.swirlPhase += dt * 14;
        const swerveX = Math.cos(m.swirlPhase) * 0.15;
        const swerveY = Math.sin(m.swirlPhase) * 0.15;
        desiredDir.x += swerveX;
        desiredDir.y += swerveY;
        desiredDir.normalize();

        // Steer velocity vector smoothly
        const currentSpeed = m.vel.length();
        const currentDir = m.vel.clone().normalize();
        currentDir.lerp(desiredDir, Math.min(1.0, MECHA_CONFIG.MISSILE_TURN_RATE * dt));
        m.vel.copy(currentDir).multiplyScalar(Math.min(MECHA_CONFIG.MISSILE_SPEED, currentSpeed + 15 * dt));
      }

      // 2. Step Position
      const nextPos = m.pos.clone().addScaledVector(m.vel, dt);

      // Check collision with world walls/geometry
      if (this.game.world && typeof this.game.world.raycast === "function") {
        const hit = this.game.world.raycast(m.pos, nextPos);
        if (hit && hit.dist < m.pos.distanceTo(nextPos)) {
          this.explodeMissile(hit.point || m.pos, null);
          toRemove.push(i);
          continue;
        }
      }

      m.pos.copy(nextPos);
      m.mesh.position.copy(m.pos);
      m.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), m.vel.clone().normalize());

      // 3. Smoke Trail Particles
      m.lastTrail += dt;
      if (m.lastTrail >= 0.035) {
        m.lastTrail = 0;
        if (this.game.effects && this.game.effects.tracer) {
          const inkColor = getPlayerInk();
          this.game.effects.tracer(m.pos, m.pos.clone().addScaledVector(m.vel, -0.05), inkColor, 0.02, 0.18);
        }
      }
    }

    // Clean up dead missiles
    for (let j = toRemove.length - 1; j >= 0; j--) {
      const idx = toRemove[j];
      const m = this.activeMissiles[idx];
      if (m.mesh && m.mesh.parent) {
        m.mesh.parent.remove(m.mesh);
      }
      this.activeMissiles.splice(idx, 1);
    }
  }

  explodeMissile(impactPoint, directTarget) {
    const scene = this.game.scene;
    const effects = this.game.effects;
    const enemies = this.game.enemies;
    const remotePlayers = this.game.remotePlayers;

    // Ink explosion blast
    const inkColor = getPlayerInk();
    if (effects && effects.strokeBurst) {
      effects.strokeBurst(impactPoint, inkColor, 10, 12, { life: 0.35, size: 0.06 });
    }
    if (effects) {
      effects.shakeAmt = Math.min(1.0, (effects.shakeAmt || 0) + 0.25);
    }

    // Audio explosion
    if (this.game.audio && this.game.audio.explode) {
      this.game.audio.explode(impactPoint);
    }

    // Damage Direct Target
    if (directTarget && directTarget.entity) {
      this.applyDamage(directTarget.entity, MECHA_CONFIG.MISSILE_DAMAGE, impactPoint);
    }

    // Splash Damage in radius
    const radius = MECHA_CONFIG.MISSILE_SPLASH_RADIUS;
    if (enemies && enemies.enemies) {
      for (const e of enemies.enemies) {
        if (e.alive && (!directTarget || e !== directTarget.entity)) {
          const dist = e.center.distanceTo(impactPoint);
          if (dist <= radius) {
            const splashDmg = Math.round(MECHA_CONFIG.MISSILE_DAMAGE * (1 - dist / radius));
            this.applyDamage(e, splashDmg, impactPoint);
          }
        }
      }
    }

    if (remotePlayers) {
      for (const [id, rp] of remotePlayers.entries()) {
        if (rp.alive && (!directTarget || rp !== directTarget.entity)) {
          const dist = rp.center.distanceTo(impactPoint);
          if (dist <= radius) {
            const splashDmg = Math.round(MECHA_CONFIG.MISSILE_DAMAGE * (1 - dist / radius));
            this.applyDamage(rp, splashDmg, impactPoint);
          }
        }
      }
    }

    // Splash damage to local player from enemy missiles
    if (this.game.player && this.game.player.alive && (!directTarget || this.game.player !== directTarget.entity)) {
      const pos = this.game.player.eye || this.game.player.body?.pos;
      if (pos) {
        const dist = pos.distanceTo(impactPoint);
        if (dist <= radius) {
          const splashDmg = Math.round(MECHA_CONFIG.MISSILE_DAMAGE * (1 - dist / radius));
          this.applyDamage(this.game.player, splashDmg, impactPoint);
        }
      }
    }
  }

  applyDamage(entity, amount, impactPoint) {
    if (!entity || amount <= 0) return;

    if (entity.takeDamage && typeof entity.takeDamage === "function") {
      entity.takeDamage(amount, impactPoint);
    } else if (this.game.enemies && typeof this.game.enemies.damage === "function" && entity.T) {
      this.game.enemies.damage(entity, amount, {
        point: impactPoint,
        dir: new THREE.Vector3(0, 1, 0),
        part: "torso",
        source: "missile",
        crit: false,
      });
    }

    // Damage numbers popup
    if (typeof window !== "undefined" && window.__damageNumbers && typeof window.__damageNumbers.add === "function") {
      window.__damageNumbers.add(amount, impactPoint, false);
    }
  }

  // --- Primary Linear Heavy Cannon (VC-21 SQUALL / HC-46 TIDEGLASS) ---
  firePrimaryCannon(player) {
    if (!player || !player.alive) return;
    if (this.cannonTimer > 0 || this.cannonAmmo <= 0) return;

    this.cannonTimer = MECHA_CONFIG.CANNON_INTERVAL;
    this.cannonAmmo = Math.max(0, this.cannonAmmo - 1);
    this.cannonRecoil = 0.16; // Kicks arm backward!

    // Screen shake & camera recoil
    if (this.game.effects) {
      this.game.effects.shakeAmt = Math.min(0.65, (this.game.effects.shakeAmt || 0) + 0.04);
    }
    if (typeof player.recoil === "function") {
      player.recoil(0.012, (Math.random() - 0.5) * 0.008);
    }

    // Heavy sci-fi kinetic cannon audio
    this.playMechaCannonSound();

    // Muzzle World Position from 3D mech arm tip
    const muzzlePos = new THREE.Vector3();
    if (this.mechParts?.cannonMuzzle) {
      this.mechParts.cannonMuzzle.getWorldPosition(muzzlePos);
    } else {
      muzzlePos.copy(player.eye).addScaledVector(player.right, 0.45).addScaledVector(player.forward, 0.4);
    }

    // Muzzle flash visibility & particle burst
    if (this.mechParts?.muzzleFlashMesh) {
      this.mechParts.muzzleFlashMesh.visible = true;
      this.mechParts.muzzleFlashMesh.scale.set(
        1.1 + Math.random() * 0.4,
        1.1 + Math.random() * 0.4,
        1.5 + Math.random() * 0.5
      );
      this.mechParts.muzzleFlashMesh.rotation.z = Math.random() * Math.PI * 2;
      this.muzzleFlashTimer = 0.055;
    }
    if (this.game.effects && typeof this.game.effects.strokeBurst === "function") {
      this.game.effects.strokeBurst(muzzlePos, 0x00f0ff, 6, 8, { life: 0.1, size: 0.045, gravity: 0 });
    }

    // Target point calculation:
    // Raycast from camera center to find hit location under crosshair
    const cam = this.game.camera;
    const camPos = cam ? cam.position : player.eye;
    const camDir = new THREE.Vector3();
    if (cam) {
      cam.getWorldDirection(camDir);
    } else {
      camDir.copy(player.forward);
    }

    // Add slight spread
    const spread = MECHA_CONFIG.CANNON_SPREAD;
    camDir.x += (Math.random() - 0.5) * spread;
    camDir.y += (Math.random() - 0.5) * spread;
    camDir.z += (Math.random() - 0.5) * spread;
    camDir.normalize();

    let targetPoint = null;
    let directTarget = null;
    let isCrit = false;

    // 1. Raycast against bot enemies
    let enemyHit = null;
    if (this.game.enemies && typeof this.game.enemies.raycast === "function") {
      enemyHit = this.game.enemies.raycast(camPos, camDir, 250);
    }

    // 2. Raycast against world geometry
    let worldHit = null;
    if (this.game.world && typeof this.game.world.raycast === "function") {
      worldHit = this.game.world.raycast(camPos, camDir, 250);
    }

    // 3. Raycast against remote online players
    let playerHit = null;
    if (typeof this.raycastPlayers === "function") {
      playerHit = this.raycastPlayers(camPos, camDir, 250);
    }

    // Determine closest hit
    let closestDist = 250;
    if (worldHit && worldHit.dist < closestDist) {
      closestDist = worldHit.dist;
      targetPoint = worldHit.point;
    }
    if (enemyHit && enemyHit.dist < closestDist) {
      closestDist = enemyHit.dist;
      targetPoint = enemyHit.point;
      directTarget = { type: "enemy", hit: enemyHit };
    }
    if (playerHit && playerHit.dist < closestDist) {
      closestDist = playerHit.dist;
      targetPoint = playerHit.point;
      directTarget = { type: "player", hit: playerHit };
    }

    if (!targetPoint) {
      targetPoint = camPos.clone().addScaledVector(camDir, 200);
    }

    // Draw high-visibility tracer streak and flying kinetic projectile bolt
    this.spawnHeavyTracer(muzzlePos, targetPoint);

    // Apply hit damage
    if (directTarget) {
      const dmg = MECHA_CONFIG.CANNON_DAMAGE;
      if (directTarget.type === "enemy") {
        isCrit = directTarget.hit.part === "head";
        const finalDmg = isCrit ? Math.round(dmg * 1.5) : dmg;
        if (this.game.enemies && typeof this.game.enemies.damage === "function") {
          this.game.enemies.damage(directTarget.hit.enemy, finalDmg, {
            point: targetPoint,
            dir: camDir,
            part: directTarget.hit.part || "torso",
            source: "mecha_cannon",
            crit: isCrit,
          });
        }
      } else if (directTarget.type === "player") {
        isCrit = directTarget.hit.part === "head";
        const finalDmg = isCrit ? Math.round(dmg * 1.5) : dmg;
        if (typeof this.game.hitPlayer === "function") {
          this.game.hitPlayer(directTarget.hit.player, finalDmg, {
            point: targetPoint,
            dir: camDir,
            part: directTarget.hit.part || "torso",
            source: "mecha_cannon",
            crit: isCrit,
            dist: directTarget.hit.dist,
          });
        }
      }

      // Impact sparks and damage number
      if (this.game.effects && typeof this.game.effects.strokeBurst === "function") {
        this.game.effects.strokeBurst(targetPoint, 0x00f0ff, 8, 10, { life: 0.15, size: 0.05 });
      }
      if (typeof window !== "undefined" && window.__damageNumbers?.add) {
        window.__damageNumbers.add(dmg, targetPoint, isCrit);
      }
    } else if (worldHit) {
      // World impact
      if (this.game.effects && typeof this.game.effects.bulletImpact === "function") {
        this.game.effects.bulletImpact(targetPoint, worldHit.normal || new THREE.Vector3(0, 1, 0), 0x00f0ff);
      }
    }

    // Multiplayer sync shot: sendFast("shots", ...) so remote peers render tracer & muzzle flash!
    if (this.game.peer && this.game.peer.active) {
      if (typeof this.game.peer.sendFast === "function") {
        this.game.peer.sendFast("shots", {
          k: "rifle",
          e: [targetPoint.x, targetPoint.y, targetPoint.z],
          ink: 0x00f0ff,
        });
      } else if (typeof this.game.peer.send === "function") {
        this.game.peer.send("shots", {
          k: "rifle",
          e: [targetPoint.x, targetPoint.y, targetPoint.z],
          ink: 0x00f0ff,
        });
      }
    }
  }

  spawnHeavyTracer(origin, hitPoint) {
    const effects = this.game?.effects;
    if (effects && typeof effects.tracer === "function") {
      // 4x thicker than standard infantry bullet, stays visible for 0.22s!
      effects.tracer(origin, hitPoint, 0x00f0ff, 0.085, 0.22);
    }

    // Also spawn high-speed kinetic projectile bolt mesh
    const scene = this.game?.scene;
    if (scene) {
      const dir = hitPoint.clone().sub(origin);
      const dist = dir.length();
      if (dist > 0.1) {
        dir.divideScalar(dist);
        const boltGeom = new THREE.CylinderGeometry(0.035, 0.035, 1.2, 5);
        boltGeom.rotateX(Math.PI / 2);
        const boltMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const boltMesh = new THREE.Mesh(boltGeom, boltMat);
        boltMesh.position.copy(origin);
        boltMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        scene.add(boltMesh);

        this.activeTracers.push({
          mesh: boltMesh,
          pos: origin.clone(),
          dir: dir.clone(),
          speed: 260, // 260 m/s
          targetDist: dist,
          traveled: 0,
          life: 0,
          maxLife: 1.2,
        });
      }
    }
  }

  updateTracers(dt) {
    if (!this.activeTracers || this.activeTracers.length === 0) return;
    const toRemove = [];
    for (let i = 0; i < this.activeTracers.length; i++) {
      const tr = this.activeTracers[i];
      tr.life += dt;
      const step = tr.speed * dt;
      tr.traveled += step;
      if (tr.traveled >= tr.targetDist || tr.life >= tr.maxLife) {
        if (tr.mesh && tr.mesh.parent) {
          tr.mesh.parent.remove(tr.mesh);
        }
        toRemove.push(i);
      } else {
        tr.pos.addScaledVector(tr.dir, step);
        tr.mesh.position.copy(tr.pos);
      }
    }
    for (let j = toRemove.length - 1; j >= 0; j--) {
      this.activeTracers.splice(toRemove[j], 1);
    }
  }

  playMechaCannonSound() {
    const audio = this.game?.audio;
    const ctx = audio?.ctx;
    if (!ctx || ctx.state === "suspended") {
      if (audio && typeof audio.shot === "function") {
        audio.shot("rifle");
      }
      return;
    }

    try {
      const now = ctx.currentTime;
      // 1. Heavy low-frequency punch
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(175, now);
      osc.frequency.exponentialRampToValueAtTime(36, now + 0.11);

      oscGain.gain.setValueAtTime(0.35, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc.connect(oscGain);
      oscGain.connect(audio.master || ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);

      // 2. High-energy electric kinetic snap
      if (audio.noiseBuf) {
        const noise = ctx.createBufferSource();
        noise.buffer = audio.noiseBuf;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(2200, now);
        filter.Q.value = 2.8;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.28, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(audio.master || ctx.destination);
        noise.start(now);
        noise.stop(now + 0.06);
      }
    } catch {
      if (audio && typeof audio.shot === "function") {
        audio.shot("rifle");
      }
    }
  }

  raycastPlayers(origin, dir, maxDist = 250) {
    if (!this.game.remotePlayers) return null;
    let closest = null;
    let minD = maxDist;
    const ray = new THREE.Ray(origin, dir);

    for (const [id, rp] of this.game.remotePlayers.entries()) {
      if (!rp.alive) continue;
      const myTeam = this.game.lobby?.teams ? (this.game.lobby.teams.red?.includes(this.game.peer?.id) ? "red" : "blue") : null;
      const targetTeam = this.game.lobby?.teams ? (this.game.lobby.teams.red?.includes(id) ? "red" : "blue") : null;
      if (myTeam && targetTeam && myTeam === targetTeam) continue;

      const center = rp.center || rp.body?.pos;
      if (!center) continue;
      const d = ray.distanceToPoint(center);
      if (d < 1.1) {
        const dist = origin.distanceTo(center);
        if (dist < minD) {
          minD = dist;
          closest = { player: rp, point: origin.clone().addScaledVector(dir, dist), dist, part: "torso" };
        }
      }
    }
    return closest;
  }
}
