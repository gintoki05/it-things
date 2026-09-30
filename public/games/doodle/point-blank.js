// POINT BLANK COMBAT MEDALS & ANNOUNCER SYSTEM
// Authentic Point Blank style badges: Headshot, Chain Killer, Double Kill, Triple Kill,
// Chain Headshot, Chain Stopper, Piercing Shot, Mass Kill, Chain Slugger!

export class PointBlankCombat {
  constructor(hudEl, audioManager) {
    this.hud = hudEl;
    this.audio = audioManager;
    
    // Streaks and timers
    this.localStreak = 0;
    this.consecutiveHeadshots = 0;
    this.lastKillTime = 0;
    this.streakWindow = 4500; // 4.5 seconds to continue kill streak
    this.recentKillBatch = []; // For piercing shot / mass kill detection
    
    // Player streaks map (id -> current streak) for Chain Stopper
    this.playerStreaks = new Map();
    
    // Web Audio Context reference
    this.audioCtx = null;
    
    // Voices cache
    this.announcerVoice = null;
    this.initVoiceSynthesis();
    
    // Preloaded Audio Elements for Instant Voice Assets
    this.soundMap = {
      HEADSHOT: "./sounds/headshot.wav",
      DOUBLE_KILL: "./sounds/doublekill.wav",
      TRIPLE_KILL: "./sounds/triplekill.wav",
      CHAIN_KILLER: "./sounds/chain_killer.wav",
      CHAIN_HEADSHOT: "./sounds/chain_headshot.wav",
      CHAIN_SLUGGER: "./sounds/chain_slugger.wav",
      CHAIN_STOPPER: "./sounds/chain_stopper.wav",
      PIERCING_SHOT: "./sounds/piercing_shot.wav",
      MASS_KILL: "./sounds/mass_kill.wav"
    };
    this.audioPool = new Map();
    this.preloadSounds();

    // Create DOM element for medals
    this.container = document.createElement("div");
    this.container.id = "pb-combat-hud";
    this.container.className = "pb-combat-hud";
    this.hud.appendChild(this.container);
    
    this.activeTimeout = null;
  }

  preloadSounds() {
    if (typeof window === "undefined") return;
    for (const [key, path] of Object.entries(this.soundMap)) {
      try {
        const audio = new Audio(path);
        audio.preload = "auto";
        audio.volume = 0.95;
        this.audioPool.set(key, audio);
      } catch (e) {}
    }
  }

  initVoiceSynthesis() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const findVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;
      // Prefer aggressive/deep US English voices
      const preferred = ["Google US English", "Microsoft David", "Alex", "Daniel", "en-US", "en_US"];
      for (const name of preferred) {
        const v = voices.find(vo => vo.name.includes(name) || (vo.lang && vo.lang.replace('_', '-').startsWith(name)));
        if (v) {
          this.announcerVoice = v;
          return;
        }
      }
      this.announcerVoice = voices.find(vo => vo.lang && vo.lang.startsWith("en")) || voices[0];
    };
    findVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = findVoice;
    }
  }

  getAudioContext() {
    if (this.audio && this.audio.ctx) return this.audio.ctx;
    if (!this.audioCtx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.audioCtx = new AudioCtx();
    }
    return this.audioCtx;
  }

  // Play Point Blank Web Audio Sound Effects
  playCombatSfx(type) {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;

      // 1. Heavy Sub Impact Boom (Common to all PB medals)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = "sine";
      subOsc.frequency.setValueAtTime(140, now);
      subOsc.frequency.exponentialRampToValueAtTime(36, now + 0.28);
      subGain.gain.setValueAtTime(0.7, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.35);

      // 2. Metallic Medal Clank / Slap
      const metalOsc = ctx.createOscillator();
      const metalGain = ctx.createGain();
      metalOsc.type = "triangle";
      metalOsc.frequency.setValueAtTime(type === "HEADSHOT" || type === "CHAIN_HEADSHOT" ? 2200 : 1600, now);
      metalOsc.frequency.exponentialRampToValueAtTime(350, now + 0.12);
      metalGain.gain.setValueAtTime(0.45, now);
      metalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      metalOsc.connect(metalGain);
      metalGain.connect(ctx.destination);
      metalOsc.start(now);
      metalOsc.stop(now + 0.16);

      // 3. Headshot Cranium Crack (Crisp crunch sound)
      if (type === "HEADSHOT" || type === "CHAIN_HEADSHOT") {
        const snapOsc = ctx.createOscillator();
        const snapGain = ctx.createGain();
        snapOsc.type = "sawtooth";
        snapOsc.frequency.setValueAtTime(3200, now);
        snapOsc.frequency.exponentialRampToValueAtTime(180, now + 0.08);
        snapGain.gain.setValueAtTime(0.5, now);
        snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        snapOsc.connect(snapGain);
        snapGain.connect(ctx.destination);
        snapOsc.start(now);
        snapOsc.stop(now + 0.1);
      }

      // 4. Chain Killer / Chain Headshot / Chain Stopper: Fiery / Metal Rattle
      if (type === "CHAIN_KILLER" || type === "CHAIN_HEADSHOT" || type === "CHAIN_STOPPER") {
        for (let i = 0; i < 3; i++) {
          const chOsc = ctx.createOscillator();
          const chGain = ctx.createGain();
          chOsc.type = "square";
          const delay = i * 0.06;
          chOsc.frequency.setValueAtTime(800 + i * 400, now + delay);
          chOsc.frequency.exponentialRampToValueAtTime(200, now + delay + 0.12);
          chGain.gain.setValueAtTime(0.25, now + delay);
          chGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.13);
          chOsc.connect(chGain);
          chGain.connect(ctx.destination);
          chOsc.start(now + delay);
          chOsc.stop(now + delay + 0.15);
        }
      }
    } catch (e) {
      // Audio autoplay policy or inactive
    }
  }

  // Play Point Blank Announcer Voice (Audio Asset with SpeechSynthesis Fallback)
  playAnnouncer(type, text) {
    if (typeof window === "undefined") return;

    // 1. Try playing preloaded high-quality audio asset first
    const original = this.audioPool.get(type);
    if (original) {
      try {
        const audio = original.cloneNode ? original.cloneNode() : original;
        audio.currentTime = 0;
        audio.volume = 0.95;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Autoplay restriction or decode error -> fallback to SpeechSynthesis
            this.playSpeechSynthesis(text);
          });
        }
        return;
      } catch (e) {
        // Fallback below
      }
    }

    // 2. Fallback to SpeechSynthesis
    this.playSpeechSynthesis(text);
  }

  playSpeechSynthesis(text) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (this.announcerVoice) u.voice = this.announcerVoice;
      u.rate = 1.18; // Snappy, rapid military style
      u.pitch = 0.72; // Deep, gritty, authoritative
      u.volume = 1.0;
      window.speechSynthesis.speak(u);
    } catch (e) {
      // Speech synthesis error
    }
  }

  // Reset streaks (on death or match restart)
  reset() {
    this.localStreak = 0;
    this.consecutiveHeadshots = 0;
    this.lastKillTime = 0;
    this.recentKillBatch = [];
    this.playerStreaks.clear();
    if (this.container) this.container.innerHTML = "";
  }

  onLocalDeath() {
    this.localStreak = 0;
    this.consecutiveHeadshots = 0;
    this.recentKillBatch = [];
  }

  // Called when any player kills someone (to track streaks for Chain Stopper)
  onEnemyKill({ killerId, victimId }) {
    if (victimId) {
      this.playerStreaks.set(victimId, 0);
    }
    if (killerId) {
      const cur = this.playerStreaks.get(killerId) || 0;
      this.playerStreaks.set(killerId, cur + 1);
    }
  }

  // Main entry when local player scores a kill
  onLocalKill({ isHeadshot = false, weapon = "gun", source = "gun", victimId = null, victimName = "", isAirborne = false } = {}) {
    const now = performance.now();
    const isCombo = (now - this.lastKillTime <= this.streakWindow);
    this.lastKillTime = now;

    // Track multi-kill batch within 180ms (for Piercing Shot / Mass Kill)
    this.recentKillBatch = this.recentKillBatch.filter(k => now - k.t < 200);
    this.recentKillBatch.push({ t: now, isHeadshot, source, weapon });

    // Check victim streak for Chain Stopper
    const victimStreak = victimId ? (this.playerStreaks.get(victimId) || 0) : 0;
    const isChainStopper = victimStreak >= 2;

    if (isCombo) {
      this.localStreak++;
    } else {
      this.localStreak = 1;
    }

    if (isHeadshot) {
      this.consecutiveHeadshots++;
    } else {
      this.consecutiveHeadshots = 0;
    }

    // Determine Medals to award
    let medalType = "KILL";
    let medalTitle = "KILL";
    let medalSub = "+100 SCORE";
    let voiceText = "";

    // 1. Check Mass Kill (2+ kills by blast in < 200ms)
    const blastKillsInBatch = this.recentKillBatch.filter(k => k.source === "blast" || k.weapon === "grenade");
    if (blastKillsInBatch.length >= 2) {
      medalType = "MASS_KILL";
      medalTitle = "MASS KILL";
      medalSub = "EXPLOSIVE MULTI-KILL · +300 EXP";
      voiceText = "Mass Kill";
    }
    // 2. Check Piercing Shot (2+ kills by bullet in < 140ms)
    else if (this.recentKillBatch.length >= 2 && !["katana", "blast"].includes(source)) {
      medalType = "PIERCING_SHOT";
      medalTitle = "PIERCING SHOT";
      medalSub = "PENETRATION DOUBLE KILL · +250 EXP";
      voiceText = "Piercing Shot";
    }
    // 3. Chain Stopper (Killed an enemy who was on a streak!)
    else if (isChainStopper) {
      medalType = "CHAIN_STOPPER";
      medalTitle = "CHAIN STOPPER";
      medalSub = `STOPPED ${victimName || "ENEMY"}'S SPREE! · +200 EXP`;
      voiceText = "Chain Stopper";
    }
    // 4. Chain Headshot (Headshot during a streak or consecutive headshot)
    else if (isHeadshot && (this.localStreak >= 2 || this.consecutiveHeadshots >= 2)) {
      medalType = "CHAIN_HEADSHOT";
      medalTitle = "CHAIN HEADSHOT";
      medalSub = `HEADSHOT STREAK x${this.consecutiveHeadshots || this.localStreak} · +200 EXP`;
      voiceText = "Chain Headshot";
    }
    // 5. Chain Killer (4th kill in streak)
    else if (this.localStreak === 4) {
      medalType = "CHAIN_KILLER";
      medalTitle = "CHAIN KILLER";
      medalSub = "4 IN A ROW! · +300 EXP";
      voiceText = "Chain Killer";
    }
    // 6. Chain Slugger (5+ kills in streak)
    else if (this.localStreak >= 5) {
      medalType = "CHAIN_SLUGGER";
      medalTitle = "CHAIN SLUGGER";
      medalSub = `UNSTOPPABLE x${this.localStreak}! · +400 EXP`;
      voiceText = "Chain Slugger";
    }
    // 7. Triple Kill (3rd kill in streak)
    else if (this.localStreak === 3) {
      medalType = "TRIPLE_KILL";
      medalTitle = "TRIPLE KILL";
      medalSub = "TRIPLE STRIKE · +180 EXP";
      voiceText = "Triple Kill";
    }
    // 8. Double Kill (2nd kill in streak)
    else if (this.localStreak === 2) {
      medalType = "DOUBLE_KILL";
      medalTitle = "DOUBLE KILL";
      medalSub = "RAPID KILL x2 · +120 EXP";
      voiceText = "Double Kill";
    }
    // 9. Standard Headshot (First kill is a headshot)
    else if (isHeadshot) {
      medalType = "HEADSHOT";
      medalTitle = "HEADSHOT";
      medalSub = "CRITICAL HEAD IMPACT · +150 EXP";
      voiceText = "Headshot";
    } else {
      // Regular kill without special medal: don't clutter with full screen PB badge
      return;
    }

    // Award Medal & Trigger Visuals + Sounds
    this.displayMedal({
      type: medalType,
      title: medalTitle,
      subtitle: medalSub,
      streak: this.localStreak,
      headshots: this.consecutiveHeadshots,
    });

    this.playCombatSfx(medalType);
    if (voiceText) {
      this.playAnnouncer(medalType, voiceText);
    }

    // Mild screen punch
    if (window.__effects && typeof window.__effects.shakeAmt === "number") {
      window.__effects.shakeAmt += 0.22;
    }
  }

  // Display Point Blank Badge on HUD
  displayMedal({ type, title, subtitle, streak, headshots }) {
    if (!this.container) return;

    // Remove existing badge with rapid refresh
    this.container.innerHTML = "";
    if (this.activeTimeout) {
      clearTimeout(this.activeTimeout);
      this.activeTimeout = null;
    }

    const badgeEl = document.createElement("div");
    badgeEl.className = `pb-medal-card pb-${type.toLowerCase()}`;
    badgeEl.innerHTML = `
      <div class="pb-metal-backing">
        <div class="pb-shockwave"></div>
        <div class="pb-sparks">
          <i></i><i></i><i></i><i></i><i></i><i></i>
        </div>
        <div class="pb-badge-icon">
          ${this.getMedalSvg(type)}
        </div>
        <div class="pb-banner">
          <div class="pb-banner-title">${title}</div>
          <div class="pb-banner-sub">${subtitle}</div>
        </div>
      </div>
    `;

    this.container.appendChild(badgeEl);

    // Keep on screen for 2.2 seconds, then smoothly animate out
    this.activeTimeout = setTimeout(() => {
      badgeEl.classList.add("pb-fadeout");
      setTimeout(() => {
        if (badgeEl.parentElement) badgeEl.remove();
      }, 350);
    }, 2200);
  }

  // Authentic Point Blank SVG Badges
  getMedalSvg(type) {
    switch (type) {
      case "HEADSHOT":
        return `
          <svg class="pb-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="pbSkullGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ffffff"/>
                <stop offset="50%" stop-color="#d4d4d4"/>
                <stop offset="100%" stop-color="#8a8a8a"/>
              </linearGradient>
              <radialGradient id="pbHoleGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#ff1a1a"/>
                <stop offset="70%" stop-color="#990000"/>
                <stop offset="100%" stop-color="#330000"/>
              </radialGradient>
              <filter id="pbGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feComposite in="SourceGraphic" in2="blur" operator="over"/>
              </filter>
            </defs>
            <!-- Shield Background -->
            <polygon points="60,6 108,22 96,82 60,114 24,82 12,22" fill="#1c1c1e" stroke="#c02828" stroke-width="4"/>
            <polygon points="60,14 100,28 90,78 60,104 30,78 20,28" fill="#2c1414" stroke="#ff4d4d" stroke-width="2"/>
            
            <!-- Point Blank Cranium / Skull -->
            <path d="M36,42 C36,25 46,16 60,16 C74,16 84,25 84,42 C84,52 80,59 76,64 L76,74 L44,74 L44,64 C40,59 36,52 36,42 Z" fill="url(#pbSkullGrad)" stroke="#111" stroke-width="3"/>
            <!-- Eye Sockets (Angled Angry) -->
            <polygon points="44,45 54,49 52,57 42,53" fill="#111"/>
            <polygon points="76,45 66,49 68,57 78,53" fill="#111"/>
            <!-- Nose Hole -->
            <polygon points="60,56 56,64 64,64" fill="#111"/>
            <!-- Teeth / Jaw -->
            <rect x="47" y="74" width="26" height="8" fill="#e5e5e5" stroke="#111" stroke-width="2"/>
            <line x1="53" y1="74" x2="53" y2="82" stroke="#111" stroke-width="2"/>
            <line x1="60" y1="74" x2="60" y2="82" stroke="#111" stroke-width="2"/>
            <line x1="67" y1="74" x2="67" y2="82" stroke="#111" stroke-width="2"/>

            <!-- Bullet Hole in Forehead with Blood Splatter Cracks -->
            <circle cx="60" cy="32" r="7.5" fill="url(#pbHoleGlow)" filter="url(#pbGlow)"/>
            <circle cx="60" cy="32" r="3" fill="#110000"/>
            <path d="M60,24 L58,18 M66,28 L74,24 M64,38 L72,42 M54,37 L46,41 M53,28 L47,24" stroke="#ff2222" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        `;

      case "CHAIN_HEADSHOT":
        return `
          <svg class="pb-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="pbGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#fff2a3"/>
                <stop offset="50%" stop-color="#ffd700"/>
                <stop offset="100%" stop-color="#d48800"/>
              </linearGradient>
            </defs>
            <!-- Fiery Spiked Shield -->
            <polygon points="60,4 112,20 102,86 60,116 18,86 8,20" fill="#221200" stroke="#ffd700" stroke-width="4"/>
            <!-- Flaming Chains Left & Right -->
            <path d="M12,40 Q28,50 36,46" stroke="#ffd700" stroke-width="6" stroke-dasharray="6,4" stroke-linecap="round"/>
            <path d="M108,40 Q92,50 84,46" stroke="#ffd700" stroke-width="6" stroke-dasharray="6,4" stroke-linecap="round"/>
            <!-- Skull -->
            <path d="M36,42 C36,25 46,16 60,16 C74,16 84,25 84,42 C84,52 80,59 76,64 L76,74 L44,74 L44,64 C40,59 36,52 36,42 Z" fill="url(#pbGoldGrad)" stroke="#3a1c00" stroke-width="3"/>
            <polygon points="44,45 54,49 52,57 42,53" fill="#220000"/>
            <polygon points="76,45 66,49 68,57 78,53" fill="#220000"/>
            <!-- Bullet Hole -->
            <circle cx="60" cy="32" r="8" fill="#ff0000"/>
            <circle cx="60" cy="32" r="3.5" fill="#2b0000"/>
            <!-- Chain wrap across skull forehead -->
            <path d="M38,36 Q60,44 82,36" stroke="#ffd700" stroke-width="4" stroke-dasharray="5,3"/>
          </svg>
        `;

      case "CHAIN_KILLER":
        return `
          <svg class="pb-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="pbCrimsonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ff4d4d"/>
                <stop offset="60%" stop-color="#b30000"/>
                <stop offset="100%" stop-color="#590000"/>
              </linearGradient>
            </defs>
            <!-- Heavy Spiked Iron Cog/Crest -->
            <circle cx="60" cy="60" r="48" fill="#140202" stroke="#ff2a2a" stroke-width="5"/>
            <!-- Spikes around circle -->
            <polygon points="60,4 66,16 54,16" fill="#ffd700"/>
            <polygon points="60,116 66,104 54,104" fill="#ffd700"/>
            <polygon points="4,60 16,54 16,66" fill="#ffd700"/>
            <polygon points="116,60 104,54 104,66" fill="#ffd700"/>
            <polygon points="20,20 32,24 24,32" fill="#ff3333"/>
            <polygon points="100,20 88,24 96,32" fill="#ff3333"/>
            <polygon points="20,100 32,96 24,88" fill="#ff3333"/>
            <polygon points="100,100 88,96 96,88" fill="#ff3333"/>
            <!-- Fierce Horned Demon Skull -->
            <path d="M34,48 C34,28 44,20 60,20 C76,20 86,28 86,48 C86,60 80,68 76,74 L76,82 L44,82 L44,74 C40,68 34,60 34,48 Z" fill="url(#pbCrimsonGrad)" stroke="#111" stroke-width="3"/>
            <!-- Horns -->
            <path d="M36,32 Q22,14 18,6 Q30,16 38,24 Z" fill="#ffd700" stroke="#111" stroke-width="2"/>
            <path d="M84,32 Q98,14 102,6 Q90,16 82,24 Z" fill="#ffd700" stroke="#111" stroke-width="2"/>
            <!-- Eye Sockets with fiery pupils -->
            <polygon points="42,50 54,54 52,64 40,60" fill="#000"/>
            <circle cx="48" cy="56" r="3" fill="#ffff00"/>
            <polygon points="78,50 66,54 68,64 80,60" fill="#000"/>
            <circle cx="72" cy="56" r="3" fill="#ffff00"/>
            <!-- Barbed Chains looping around -->
            <path d="M22,76 Q60,94 98,76" stroke="#ffd700" stroke-width="5" stroke-dasharray="6,4" stroke-linecap="round"/>
          </svg>
        `;

      case "CHAIN_SLUGGER":
        return `
          <svg class="pb-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="60,4 114,24 98,90 60,116 22,90 6,24" fill="#2b1a00" stroke="#ffd700" stroke-width="5"/>
            <!-- Crossed Golden Axes Behind Skull -->
            <line x1="20" y1="20" x2="100" y2="100" stroke="#ffd700" stroke-width="6"/>
            <line x1="100" y1="20" x2="20" y2="100" stroke="#ffd700" stroke-width="6"/>
            <!-- Master Skull -->
            <path d="M38,44 C38,26 48,18 60,18 C72,18 82,26 82,44 C82,56 78,64 74,70 L74,80 L46,80 L46,70 C42,64 38,56 38,44 Z" fill="#ffd700" stroke="#3d2400" stroke-width="3"/>
            <polygon points="46,48 54,52 52,60 44,56" fill="#111"/>
            <polygon points="74,48 66,52 68,60 76,56" fill="#111"/>
            <!-- 5-Star Rank Crown -->
            <polygon points="60,6 64,16 74,16 66,22 69,32 60,26 51,32 54,22 46,16 56,16" fill="#ffffff" stroke="#ffd700" stroke-width="1.5"/>
          </svg>
        `;

      case "DOUBLE_KILL":
        return `
          <svg class="pb-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Shield plate -->
            <polygon points="60,10 110,24 96,86 60,112 24,86 10,24" fill="#161b26" stroke="#2563eb" stroke-width="4"/>
            <!-- Dual Chevrons -->
            <path d="M35,92 L60,105 L85,92" stroke="#60a5fa" stroke-width="5" fill="none" stroke-linecap="round"/>
            <path d="M35,80 L60,93 L85,80" stroke="#93c5fd" stroke-width="5" fill="none" stroke-linecap="round"/>
            <!-- Twin Skulls -->
            <g transform="translate(-14, 0)">
              <path d="M46,40 C46,28 53,20 62,20 C71,20 78,28 78,40 C78,48 75,54 72,58 L72,66 L52,66 L52,58 C49,54 46,48 46,40 Z" fill="#e2e8f0" stroke="#0f172a" stroke-width="2.5"/>
              <circle cx="56" cy="44" r="3" fill="#0f172a"/><circle cx="68" cy="44" r="3" fill="#0f172a"/>
            </g>
            <g transform="translate(14, 0)">
              <path d="M46,40 C46,28 53,20 62,20 C71,20 78,28 78,40 C78,48 75,54 72,58 L72,66 L52,66 L52,58 C49,54 46,48 46,40 Z" fill="#cbd5e1" stroke="#0f172a" stroke-width="2.5"/>
              <circle cx="56" cy="44" r="3" fill="#0f172a"/><circle cx="68" cy="44" r="3" fill="#0f172a"/>
            </g>
            <!-- Badge 2X text banner -->
            <rect x="42" y="14" width="36" height="18" rx="4" fill="#2563eb" stroke="#ffffff" stroke-width="2"/>
            <text x="60" y="28" fill="#ffffff" font-size="14" font-weight="900" text-anchor="middle" font-family="'Patrick Hand', 'Caveat', cursive">2X</text>
          </svg>
        `;

      case "TRIPLE_KILL":
        return `
          <svg class="pb-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="60,8 112,24 98,88 60,114 22,88 8,24" fill="#2d1502" stroke="#ea580c" stroke-width="4"/>
            <!-- Triple Chevrons -->
            <path d="M32,96 L60,108 L88,96" stroke="#f97316" stroke-width="4.5" fill="none" stroke-linecap="round"/>
            <path d="M32,86 L60,98 L88,86" stroke="#fb923c" stroke-width="4.5" fill="none" stroke-linecap="round"/>
            <path d="M32,76 L60,88 L88,76" stroke="#fdba74" stroke-width="4.5" fill="none" stroke-linecap="round"/>
            <!-- Center Fierce Skull -->
            <path d="M40,42 C40,26 49,18 60,18 C71,18 80,26 80,42 C80,52 76,58 72,64 L72,72 L48,72 L48,64 C44,58 40,52 40,42 Z" fill="#ffedd5" stroke="#431407" stroke-width="3"/>
            <polygon points="48,46 54,49 53,56 47,53" fill="#431407"/>
            <polygon points="72,46 66,49 67,56 73,53" fill="#431407"/>
            <!-- Flaming Wings Left and Right -->
            <path d="M22,34 Q10,48 24,62 Q32,48 38,42 Z" fill="#ea580c"/>
            <path d="M98,34 Q110,48 96,62 Q88,48 82,42 Z" fill="#ea580c"/>
            <!-- 3X Badge -->
            <rect x="42" y="10" width="36" height="18" rx="4" fill="#ea580c" stroke="#fed7aa" stroke-width="2"/>
            <text x="60" y="24" fill="#ffffff" font-size="14" font-weight="900" text-anchor="middle" font-family="'Patrick Hand', 'Caveat', cursive">3X</text>
          </svg>
        `;

      case "CHAIN_STOPPER":
        return `
          <svg class="pb-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="60,8 112,24 96,86 60,114 24,86 8,24" fill="#1f0303" stroke="#dc2626" stroke-width="4"/>
            <!-- Crossed Red Blades Piercing -->
            <line x1="24" y1="24" x2="96" y2="96" stroke="#ef4444" stroke-width="6" stroke-linecap="round"/>
            <line x1="96" y1="24" x2="24" y2="96" stroke="#ef4444" stroke-width="6" stroke-linecap="round"/>
            <!-- Shattered Skull -->
            <path d="M38,42 C38,26 48,18 60,18 C72,18 82,26 82,42 C82,54 78,62 74,68 L74,78 L46,78 L46,68 C42,62 38,54 38,42 Z" fill="#f87171" stroke="#450a0a" stroke-width="3"/>
            <!-- Fracture Cracks across Skull -->
            <path d="M60,18 L56,36 L66,48 L54,64 L60,78" stroke="#450a0a" stroke-width="3" stroke-linecap="round"/>
            <!-- Giant NO / STOP Symbol -->
            <circle cx="60" cy="54" r="32" stroke="#dc2626" stroke-width="5" fill="none"/>
            <line x1="38" y1="32" x2="82" y2="76" stroke="#dc2626" stroke-width="5"/>
          </svg>
        `;

      case "PIERCING_SHOT":
        return `
          <svg class="pb-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="60,8 112,24 96,86 60,114 24,86 8,24" fill="#0c1a29" stroke="#38bdf8" stroke-width="4"/>
            <!-- Dual Concentric Targets -->
            <circle cx="44" cy="56" r="22" stroke="#0284c7" stroke-width="3" stroke-dasharray="4,4" fill="none"/>
            <circle cx="76" cy="56" r="22" stroke="#38bdf8" stroke-width="3" stroke-dasharray="4,4" fill="none"/>
            <!-- Penetrating High-Caliber Bullet -->
            <polygon points="106,56 70,44 14,52 14,60 70,68" fill="#facc15" stroke="#713f12" stroke-width="2"/>
            <!-- Piercing Shockwave Rings -->
            <ellipse cx="44" cy="56" rx="6" ry="16" stroke="#ffffff" stroke-width="3" fill="none"/>
            <ellipse cx="76" cy="56" rx="6" ry="16" stroke="#ffffff" stroke-width="3" fill="none"/>
          </svg>
        `;

      case "MASS_KILL":
        return `
          <svg class="pb-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="60,8 112,24 96,86 60,114 24,86 8,24" fill="#2e1005" stroke="#f97316" stroke-width="4"/>
            <!-- Blast Shockwave Starburst -->
            <polygon points="60,10 72,34 98,24 88,48 112,60 88,72 98,96 72,86 60,110 48,86 22,96 32,72 8,60 32,48 22,24 48,34" fill="#ea580c"/>
            <polygon points="60,24 68,42 86,34 78,52 96,60 78,68 86,86 68,78 60,96 52,78 34,86 42,68 24,60 42,52 34,34 52,42" fill="#fde047"/>
            <!-- Central Demolition Skull -->
            <path d="M44,48 C44,36 51,30 60,30 C69,30 76,36 76,48 C76,56 73,62 70,66 L70,74 L50,74 L50,66 C47,62 44,56 44,48 Z" fill="#18181b" stroke="#000" stroke-width="2"/>
            <circle cx="52" cy="50" r="3" fill="#ef4444"/><circle cx="68" cy="50" r="3" fill="#ef4444"/>
          </svg>
        `;

      default:
        return `
          <svg class="pb-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="60" r="45" fill="#1e293b" stroke="#e2e8f0" stroke-width="4"/>
            <polygon points="60,25 70,45 92,48 76,64 80,86 60,75 40,86 44,64 28,48 50,45" fill="#facc15"/>
          </svg>
        `;
    }
  }
}
