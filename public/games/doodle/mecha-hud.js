// DOODLE WAR — MECHA OPS: Tactical Sci-Fi HUD (RUSTLINE Aesthetic)
// Features: Heading Tape Compass, 3D Tactical Radar (80m), Auto-Lock Reticle with HP/Distance,
// Vertical Energy Boost Gauge (BOOST 97 EN), and Dual Weapon Status (VC-21 SQUALL & RP-06 STARLING).

export class MechaHud {
  constructor(containerEl) {
    this.container = containerEl || document.getElementById("hud") || document.body;
    this.root = null;
    this.lockBox = null;
    this.targetName = null;
    this.targetDist = null;
    this.targetHpFill = null;
    this.targetSub = null;
    this.boostFill = null;
    this.boostText = null;
    this.missileAmmo = null;
    this.primaryAmmo = null;
    this.alertBox = null;
    this.headingVal = null;
    this.radarBlips = null;
    this.radarCount = null;

    this.visible = false;
    this.buildHud();
  }

  buildHud() {
    this.root = document.createElement("div");
    this.root.id = "mecha-hud-root";
    this.root.className = "mecha-hud-root hidden";
    this.root.innerHTML = `
      <!-- Top Heading Compass Tape (RUSTLINE) -->
      <div class="mecha-compass">
        <div class="mecha-compass-ticks" id="mecha-compass-ticks">
          <span>120</span> <span>SE</span> <span>150</span> <span>165</span> <span>S</span> <span>195</span> <span>210</span> <span>SW</span> <span>240</span>
        </div>
        <div class="mecha-compass-center">
          <span class="mecha-compass-carrot">▼</span>
          <span id="mecha-heading-val">176</span>
        </div>
      </div>

      <!-- Tactical 3D Radar (Top-Right) -->
      <div class="mecha-radar">
        <div class="mecha-radar-header">
          <span class="mecha-radar-title">TACTICAL RADAR</span>
          <span class="mecha-radar-range">80m</span>
        </div>
        <div class="mecha-radar-scope">
          <div class="mecha-radar-sweep"></div>
          <div class="mecha-radar-ring ring-40"></div>
          <div class="mecha-radar-ring ring-80"></div>
          <div class="mecha-radar-axis-h"></div>
          <div class="mecha-radar-axis-v"></div>
          <div class="mecha-radar-player"></div>
          <div id="mecha-radar-blips" class="mecha-radar-blips"></div>
        </div>
        <div class="mecha-radar-count"><span id="mecha-radar-hostile-count">0</span> HOSTILES</div>
      </div>

      <!-- Center Reticle & Target Lock Box (RUSTLINE) -->
      <div id="mecha-target-box" class="mecha-target-box hidden">
        <div class="mecha-bracket top-left"></div>
        <div class="mecha-bracket top-right"></div>
        <div class="mecha-bracket btm-left"></div>
        <div class="mecha-bracket btm-right"></div>
        <div class="mecha-target-header">
          <span class="mecha-lock-status">AUTO LOCK</span>
          <span class="mecha-lock-sub" id="mecha-target-sub">HOSTILE LOCK · LV.1</span>
        </div>
        <div class="mecha-target-body">
          <div class="mecha-target-name" id="mecha-target-name">WARDEN 09</div>
          <div class="mecha-target-hp-track">
            <div class="mecha-target-hp-fill" id="mecha-target-hp-fill"></div>
          </div>
          <div class="mecha-target-dist" id="mecha-target-dist">94 M</div>
        </div>
      </div>

      <!-- Center Scan Brackets -->
      <div class="mecha-center-scan">
        <div class="mecha-scan-bracket left"></div>
        <div class="mecha-scan-bracket right"></div>
      </div>

      <!-- Vertical Boost Gauge (Beside Reticle on Left) -->
      <div class="mecha-boost-vertical">
        <div class="mecha-bv-header">
          <span class="mecha-bv-label">BOOST</span>
          <span id="mecha-bv-val" class="mecha-bv-val">100 EN</span>
        </div>
        <div class="mecha-bv-track">
          <div id="mecha-bv-fill" class="mecha-bv-fill"></div>
        </div>
        <div class="mecha-bv-hint">[SPACE] HOVER<br>[SHIFT] DASH</div>
      </div>

      <!-- Dual Weapon HUD (Under Reticle / Bottom Center) -->
      <div class="mecha-weapons-hud">
        <div class="mecha-weap-card left">
          <div class="mecha-weap-slot-tag">L</div>
          <div class="mecha-weap-info">
            <span class="mecha-weap-name">VC-21 SQUALL</span>
            <span id="mecha-primary-ammo" class="mecha-weap-ammo">480 / 480</span>
          </div>
          <span class="mecha-weap-type">AUTO</span>
        </div>
        <div class="mecha-weap-card right">
          <div class="mecha-weap-slot-tag">R</div>
          <div class="mecha-weap-info">
            <span class="mecha-weap-name">RP-06 STARLING</span>
            <span id="mecha-missile-ammo" class="mecha-weap-ammo ready">06 / 6</span>
          </div>
          <span class="mecha-weap-type">SALVO</span>
        </div>
      </div>

      <!-- Warning / Alert Popups -->
      <div id="mecha-alert" class="mecha-alert hidden"></div>
    `;

    this.container.appendChild(this.root);

    // Cache elements
    this.lockBox = this.root.querySelector("#mecha-target-box");
    this.targetName = this.root.querySelector("#mecha-target-name");
    this.targetDist = this.root.querySelector("#mecha-target-dist");
    this.targetHpFill = this.root.querySelector("#mecha-target-hp-fill");
    this.targetSub = this.root.querySelector("#mecha-target-sub");

    this.boostFill = this.root.querySelector("#mecha-bv-fill");
    this.boostText = this.root.querySelector("#mecha-bv-val");

    this.primaryAmmo = this.root.querySelector("#mecha-primary-ammo");
    this.missileAmmo = this.root.querySelector("#mecha-missile-ammo");

    this.headingVal = this.root.querySelector("#mecha-heading-val");
    this.compassTicks = this.root.querySelector("#mecha-compass-ticks");

    this.radarBlips = this.root.querySelector("#mecha-radar-blips");
    this.radarCount = this.root.querySelector("#mecha-radar-hostile-count");

    this.alertBox = this.root.querySelector("#mecha-alert");
  }

  show() {
    if (!this.visible) {
      this.visible = true;
      this.root.classList.remove("hidden");
    }
  }

  hide() {
    if (this.visible) {
      this.visible = false;
      this.root.classList.add("hidden");
    }
  }

  update(mechaMode, camera, width, height) {
    if (!mechaMode || !mechaMode.enabled) {
      this.hide();
      return;
    }

    this.show();
    const player = mechaMode.game?.player;

    // 1. Heading Compass
    if (player && typeof player.yaw === "number") {
      let deg = Math.round((-player.yaw * 180 / Math.PI) % 360);
      if (deg < 0) deg += 360;
      if (this.headingVal) {
        this.headingVal.textContent = String(deg).padStart(3, "0");
      }
      if (this.compassTicks) {
        // Shift compass ticks smoothly
        const offset = ((deg % 90) / 90) * 40 - 20;
        this.compassTicks.style.transform = `translateX(${-offset}px)`;
      }
    }

    // 2. Tactical 3D Radar (80m radius)
    if (player && player.body?.pos && this.radarBlips) {
      const pPos = player.body.pos;
      const yaw = player.yaw || 0;
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const rRange = 80;
      const rRadius = 45; // pixel radius on radar scope

      let html = "";
      let hostiles = 0;

      // Bot enemies
      const enemies = mechaMode.game?.enemies?.enemies || [];
      for (const e of enemies) {
        if (!e.alive || e.state === "spawn") continue;
        const ePos = e.center || e.body?.pos;
        if (!ePos) continue;

        const dx = ePos.x - pPos.x;
        const dz = ePos.z - pPos.z;
        const dist = Math.hypot(dx, dz);
        if (dist > rRange) continue;

        hostiles++;
        // Transform to local player space
        const lx = dx * cosY - dz * sinY;
        const lz = dx * sinY + dz * cosY;

        const bx = rRadius + (lx / rRange) * (rRadius - 5);
        const by = rRadius + (lz / rRange) * (rRadius - 5);

        html += `<div class="mecha-radar-blip hostile" style="left:${bx}px;top:${by}px;"></div>`;
      }

      // Remote players
      const remotes = mechaMode.game?.remotePlayers;
      if (remotes) {
        for (const [id, rp] of remotes.entries()) {
          if (!rp.alive) continue;
          const rPos = rp.center || rp.body?.pos;
          if (!rPos) continue;

          const dx = rPos.x - pPos.x;
          const dz = rPos.z - pPos.z;
          const dist = Math.hypot(dx, dz);
          if (dist > rRange) continue;

          hostiles++;
          const lx = dx * cosY - dz * sinY;
          const lz = dx * sinY + dz * cosY;

          const bx = rRadius + (lx / rRange) * (rRadius - 5);
          const by = rRadius + (lz / rRange) * (rRadius - 5);

          html += `<div class="mecha-radar-blip remote" style="left:${bx}px;top:${by}px;"></div>`;
        }
      }

      this.radarBlips.innerHTML = html;
      if (this.radarCount) this.radarCount.textContent = String(hostiles);
    }

    // 3. Boost Gauge & Overheat State (BOOST 97 EN)
    const boostPct = Math.max(0, Math.min(100, Math.round(mechaMode.boostEnergy)));
    if (this.boostFill && this.boostText) {
      this.boostFill.style.height = `${boostPct}%`;
      if (mechaMode.isOverheated) {
        this.boostFill.classList.add("overheated");
        this.boostText.textContent = "OVERHEAT";
        this.boostText.classList.add("blink-red");
      } else {
        this.boostFill.classList.remove("overheated");
        this.boostText.textContent = `${boostPct} EN`;
        this.boostText.classList.remove("blink-red");
      }
    }

    // 4. Primary Cannon Weapon Status (VC-21 SQUALL)
    if (this.primaryAmmo) {
      this.primaryAmmo.textContent = `${mechaMode.cannonAmmo} / 480`;
    }

    // 5. Missile Salvo Status (RP-06 STARLING)
    if (this.missileAmmo) {
      if (mechaMode.missileCooldown > 0) {
        this.missileAmmo.textContent = `${mechaMode.missileCooldown.toFixed(1)}s`;
        this.missileAmmo.className = "mecha-weap-ammo reloading";
      } else {
        this.missileAmmo.textContent = "06 / 6";
        this.missileAmmo.className = "mecha-weap-ammo ready";
      }
    }

    // 6. Target Lock Box (3D Screen projection)
    const lockTarget = mechaMode.currentLockTarget;
    if (lockTarget && lockTarget.center && camera) {
      const proj = lockTarget.center.clone().project(camera);
      // Check if target is in front of camera
      if (proj.z < 1.0) {
        const sx = (proj.x * 0.5 + 0.5) * (width || window.innerWidth);
        const sy = (-proj.y * 0.5 + 0.5) * (height || window.innerHeight);

        this.lockBox.classList.remove("hidden");
        this.lockBox.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%)`;
        if (this.targetName) this.targetName.textContent = lockTarget.name || "WARDEN 09";
        if (this.targetDist) this.targetDist.textContent = `${Math.round(lockTarget.dist || 0)} M`;

        if (this.targetHpFill && lockTarget.entity) {
          const hp = lockTarget.entity.hp ?? 100;
          const maxHp = lockTarget.entity.maxHp ?? 100;
          const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
          this.targetHpFill.style.width = `${hpPct}%`;
        }
      } else {
        this.lockBox.classList.add("hidden");
      }
    } else {
      this.lockBox.classList.add("hidden");
    }

    // 7. Alert notification popups
    if (mechaMode.alertMessage && mechaMode.alertDuration > 0) {
      this.alertBox.textContent = mechaMode.alertMessage;
      this.alertBox.className = `mecha-alert ${mechaMode.alertType || "info"}`;
      this.alertBox.classList.remove("hidden");
    } else {
      this.alertBox.classList.add("hidden");
    }
  }

  destroy() {
    if (this.root && this.root.parentElement) {
      this.root.parentElement.removeChild(this.root);
    }
  }
}
