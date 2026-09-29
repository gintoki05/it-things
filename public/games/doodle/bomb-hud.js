// DOODLE.EXE — Bomb Mission HUD
// Win98 & Doodle Retro styled UI for round scores, timers, prompts, interact progress, and spectator info.

export class BombHud {
  constructor(rootEl) {
    this.root = rootEl;
    this.container = document.createElement("div");
    this.container.id = "bomb-hud";
    this.container.className = "bomb-hud";
    this.container.style.display = "none";
    this.root.appendChild(this.container);

    this.container.innerHTML = `
      <!-- Top Center Header: Scores, Round Number, Phase Timer -->
      <div class="bm-header">
        <div class="bm-team-score tero">
          <span class="bm-badge">TERO</span>
          <b class="bm-score" id="bmScoreTero">0</b>
          <div class="bm-pips" id="bmPipsTero"></div>
        </div>
        <div class="bm-round-info">
          <div class="bm-round-num" id="bmRoundNum">RONDE 1</div>
          <div class="bm-timer" id="bmTimer">02:30</div>
          <div class="bm-status-msg" id="bmStatusMsg"></div>
        </div>
        <div class="bm-team-score ct">
          <b class="bm-score" id="bmScoreCt">0</b>
          <span class="bm-badge">CT</span>
          <div class="bm-pips" id="bmPipsCt"></div>
        </div>
      </div>

      <!-- Center Action Prompt (Plant, Defuse, Pickup) -->
      <div class="bm-prompt" id="bmPrompt"></div>

      <!-- Center Hold Progress Tube -->
      <div class="bm-progress-wrap" id="bmProgressWrap">
        <div class="bm-progress-label" id="bmProgressLabel">PLANTING BOMB...</div>
        <div class="bm-tube">
          <div class="bm-fill" id="bmProgressFill"></div>
        </div>
        <div class="bm-progress-pct" id="bmProgressPct">0%</div>
      </div>

      <!-- Spectator Overlay Banner -->
      <div class="bm-spectator" id="bmSpectator">
        <div class="bm-spec-card">
          <span class="bm-spec-tag">👁️ MENONTON</span>
          <b class="bm-spec-name" id="bmSpecName">Teman</b>
          <span class="bm-spec-hint">[Klik / Spasi] untuk ganti rekan</span>
        </div>
      </div>

      <!-- Round End Big Win Banner -->
      <div class="bm-round-end" id="bmRoundEnd">
        <h1 class="bm-win-title" id="bmWinTitle">TERO MENANG!</h1>
        <div class="bm-win-reason" id="bmWinReason">Bom Meledak</div>
      </div>
    `;

    this.el = {
      scoreTero: this.container.querySelector("#bmScoreTero"),
      scoreCt: this.container.querySelector("#bmScoreCt"),
      pipsTero: this.container.querySelector("#bmPipsTero"),
      pipsCt: this.container.querySelector("#bmPipsCt"),
      roundNum: this.container.querySelector("#bmRoundNum"),
      timer: this.container.querySelector("#bmTimer"),
      statusMsg: this.container.querySelector("#bmStatusMsg"),
      prompt: this.container.querySelector("#bmPrompt"),
      progressWrap: this.container.querySelector("#bmProgressWrap"),
      progressLabel: this.container.querySelector("#bmProgressLabel"),
      progressFill: this.container.querySelector("#bmProgressFill"),
      progressPct: this.container.querySelector("#bmProgressPct"),
      spectator: this.container.querySelector("#bmSpectator"),
      specName: this.container.querySelector("#bmSpecName"),
      roundEnd: this.container.querySelector("#bmRoundEnd"),
      winTitle: this.container.querySelector("#bmWinTitle"),
      winReason: this.container.querySelector("#bmWinReason"),
    };

    this.lastWinReason = "";
  }

  update(bombMode, myId) {
    if (!bombMode || !bombMode.enabled || bombMode.phase === "lobby") {
      this.container.style.display = "none";
      return;
    }

    this.container.style.display = "block";
    const now = performance.now();

    // 1. Update Scores & Round Number
    this.el.scoreTero.textContent = bombMode.scores.red || 0;
    this.el.scoreCt.textContent = bombMode.scores.blue || 0;
    this.el.roundNum.textContent = `RONDE ${bombMode.roundId} (Target: 5)`;

    // 2. Team Alive Pips
    const teroTotal = bombMode.teams.red.length || 0;
    const ctTotal = bombMode.teams.blue.length || 0;
    const teroAlive = bombMode.teams.red.filter((id) => bombMode.alivePlayerIds.has(id)).length;
    const ctAlive = bombMode.teams.blue.filter((id) => bombMode.alivePlayerIds.has(id)).length;

    let teroPips = "";
    for (let i = 0; i < teroTotal; i++) {
      teroPips += `<i class="pip red ${i < teroAlive ? "alive" : "dead"}"></i>`;
    }
    this.el.pipsTero.innerHTML = teroPips;

    let ctPips = "";
    for (let i = 0; i < ctTotal; i++) {
      ctPips += `<i class="pip blue ${i < ctAlive ? "alive" : "dead"}"></i>`;
    }
    this.el.pipsCt.innerHTML = ctPips;

    // 3. Phase Timer & Status Message
    this.el.timer.classList.remove("danger", "prep");

    if (bombMode.phase === "preparing") {
      const remaining = Math.max(0, Math.ceil((bombMode.phaseEndsAt - now) / 1000));
      this.el.timer.textContent = `00:0${remaining}`;
      this.el.timer.classList.add("prep");
      this.el.statusMsg.textContent = "FASE PERSIAPAN (KUNCI GERAK)";
    } else if (bombMode.phase === "live") {
      const remainingSec = Math.max(0, Math.ceil((bombMode.phaseEndsAt - now) / 1000));
      const mins = Math.floor(remainingSec / 60);
      const secs = remainingSec % 60;
      this.el.timer.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
      if (bombMode.bomb.carrierId === myId) {
        this.el.statusMsg.textContent = "KAMU MEMBAWA BOM C4!";
      } else {
        this.el.statusMsg.textContent = "SERANG / PERTAHANKAN SITE A & B";
      }
    } else if (bombMode.phase === "planted") {
      const remainingSec = Math.max(0, Math.ceil((bombMode.explodesAt - now) / 1000));
      this.el.timer.textContent = `⚠️ 00:${String(remainingSec).padStart(2, "0")}`;
      this.el.timer.classList.add("danger");
      this.el.statusMsg.textContent = `BOM AKTIF DI SITE ${bombMode.bomb.siteId || "A"}!`;
    } else if (bombMode.phase === "round_end") {
      this.el.timer.textContent = "00:00";
      this.el.statusMsg.textContent = "RONDE SELESAI";
    }

    // 4. Contextual Prompt & Local Interact Bar
    const player = bombMode.game?.player;
    const isAlive = myId && bombMode.alivePlayerIds.has(myId);
    const isTero = bombMode.teams.red.includes(myId);
    const isCt = bombMode.teams.blue.includes(myId);

    let promptText = "";
    if (isAlive && player && !bombMode.localInteract.active) {
      if (isTero && bombMode.phase === "live" && bombMode.bomb.carrierId === myId) {
        const siteId = bombMode.getSiteAt(player.body.pos);
        if (siteId) {
          promptText = `[F] TAHAN UNTUK MEMASANG BOM (SITE ${siteId})`;
        }
      } else if (isTero && bombMode.bomb.state === "dropped") {
        const dist = player.body.pos.distanceTo(bombMode.bomb.position);
        if (dist <= 3.0) {
          promptText = "[F] DEKATI / AMBIL BOM C4";
        }
      } else if (isCt && bombMode.phase === "planted" && bombMode.bomb.state === "planted") {
        const dist = player.body.pos.distanceTo(bombMode.bomb.position);
        if (dist <= 2.8) {
          promptText = "[F] TAHAN UNTUK JINAKKAN BOM";
        }
      }
    }

    if (promptText) {
      this.el.prompt.textContent = promptText;
      this.el.prompt.classList.add("show");
    } else {
      this.el.prompt.classList.remove("show");
    }

    // 5. Local Interact Progress Bar
    if (bombMode.localInteract.active) {
      this.el.progressWrap.classList.add("show");
      const elapsed = (now - bombMode.localInteract.startedAt) / 1000;
      const duration = bombMode.localInteract.duration || 3.0;
      const pct = Math.min(100, Math.max(0, Math.round((elapsed / duration) * 100)));

      this.el.progressLabel.textContent =
        bombMode.localInteract.kind === "plant" ? "MEMASANG BOM C4..." : "MENJINAKKAN BOM...";
      this.el.progressFill.style.width = `${pct}%`;
      this.el.progressPct.textContent = `${pct}%`;
    } else {
      this.el.progressWrap.classList.remove("show");
    }

    // 6. Spectator Overlay
    if (bombMode.spectator.active) {
      this.el.spectator.classList.add("show");
      const targetId = bombMode.spectator.targetId;
      const targetPlayer = targetId ? bombMode.game?.remotePlayers?.get(targetId) : null;
      this.el.specName.textContent = targetPlayer?.name || targetId || "Mencari rekan...";
    } else {
      this.el.spectator.classList.remove("show");
    }

    // 7. Round End Victory Banner
    if (bombMode.phase === "round_end") {
      this.el.roundEnd.classList.add("show");
      const isRedWin = bombMode.lastWinner === "red" || bombMode.scores.red > bombMode.scores.blue;
      const reason = this.formatWinReason(bombMode.lastReason);

      this.el.winTitle.textContent = isRedWin ? "TERRORIST WIN!" : "COUNTER-TERRORIST WIN!";
      this.el.winTitle.className = `bm-win-title ${isRedWin ? "red" : "blue"}`;
      this.el.winReason.textContent = reason;
    } else {
      this.el.roundEnd.classList.remove("show");
    }
  }

  formatWinReason(reason) {
    switch (reason) {
      case "bomb_exploded":
        return "BOM BERHASIL MELEDAK";
      case "bomb_defused":
        return "BOM BERHASIL DIJINAKKAN";
      case "ct_eliminated":
        return "SELURUH ANGGOTA CT TELAH DIELIMINASI";
      case "tero_eliminated":
        return "SELURUH ANGGOTA TERO TELAH DIELIMINASI";
      case "time_expired":
        return "WAKTU HABIS (BOM GAGAL DIPASANG)";
      case "tero_forfeit":
        return "TIM TERO MENINGGALKAN PERTANDINGAN";
      case "ct_forfeit":
        return "TIM CT MENINGGALKAN PERTANDINGAN";
      default:
        return "RONDE BERAKHIR";
    }
  }

  hide() {
    this.container.style.display = "none";
    if (this.el?.prompt) this.el.prompt.classList.remove("show");
    if (this.el?.progressWrap) this.el.progressWrap.classList.remove("show");
    if (this.el?.spectator) this.el.spectator.classList.remove("show");
    if (this.el?.roundEnd) this.el.roundEnd.classList.remove("show");
  }
}

