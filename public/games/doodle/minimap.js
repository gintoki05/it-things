// Geometry comes from the same colliders as gameplay. Ampera is rotated so
// Ilir is up; Luxville retains its original north-up orientation.
export class MapMinimap {
  constructor(root) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "doodle-minimap";
    this.canvas.width = this.canvas.height = 480;
    this.canvas.hidden = true;
    this.canvas.setAttribute("role", "img");
    root.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.background = document.createElement("canvas");
    this.background.width = this.background.height = 480;
    this.lastDraw = -Infinity;
  }

  build(level, world) {
    this.level = level;
    this.canvas.setAttribute("aria-label", level.minimapDescription || "Minimap Luxville: posisi dan arah pemain, site A dan B");
    const { minX, maxX, minZ, maxZ } = level.bounds;
    this.scale = 208 / Math.max(maxX - minX, maxZ - minZ);
    this.project = (x, z) => [
      120 + (x - (minX + maxX) / 2) * this.scale,
      122 + (z - (minZ + maxZ) / 2) * this.scale,
    ];
    const ctx = this.background.getContext("2d");
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, 240, 240);
    for (const area of level.minimapAreas || []) {
      const [x, z] = this.project(area.minX, area.minZ);
      ctx.fillStyle = area.color;
      ctx.fillRect(x, z, (area.maxX - area.minX) * this.scale, (area.maxZ - area.minZ) * this.scale);
    }
    // Upper walkways are translucent; ground walls and cover remain readable.
    for (const elevated of [true, false]) {
      for (const box of world.boxes) {
        if (box.max.y <= 0 || box.min.y >= 8 || box.data.noShoot || box.data.tag === "minimap-ceiling" || box.data.tag === "ampera-deck") continue;
        if ((box.min.y >= 2.5) !== elevated) continue;
        if (box.data.breakable) continue; // Draw live breakables separately.
        const [x, z] = this.project(box.min.x, box.min.z);
        ctx.fillStyle = elevated ? "#b4a67c66" : box.max.y >= 7 ? "#42474c" : "#8e8879";
        ctx.fillRect(x, z, (box.max.x-box.min.x)*this.scale, (box.max.z-box.min.z)*this.scale);
      }
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    for (const [label, x, z, color] of level.minimapLabels || []) {
      const [px, pz] = this.project(x, z);
      ctx.font = `${label.length === 1 ? 17 : 11}px monospace`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#f6f3e6";
      ctx.strokeText(label, px, pz);
      ctx.fillStyle = color || "#222a36";
      ctx.fillText(label, px, pz);
    }
    ctx.font = "bold 10px monospace";
    ctx.fillStyle = "#24395b";
    const title = level.minimapTitle || "LUXVILLE · N ↑";
    ctx.strokeText(title, 120, 9);
    ctx.fillText(title, 120, 9);
    ctx.font = "9px monospace";
    ctx.strokeText("▲ KAMU", 120, 233);
    ctx.fillText("▲ KAMU", 120, 233);
  }

  update(level, world, position, camera, visible, now, bombData = null) {
    this.canvas.hidden = !visible || !["luxville", "ampera"].includes(level.key);
    if (this.canvas.hidden || !this.ctx) return;
    if (level !== this.level) {
      this.build(level, world);
      this.lastDraw = -Infinity;
    }
    if (now - this.lastDraw < 66) return;
    this.lastDraw = now;
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.background, 0, 0);
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    for (const item of level.breakables) {
      if (!item.alive || !item.box) continue;
      const { min, max } = item.box;
      const [x, z] = this.project(min.x, min.z);
      ctx.fillStyle = "#98794b";
      ctx.fillRect(x, z, (max.x-min.x)*this.scale, (max.z-min.z)*this.scale);
    }

    // Bomb Mission: Site or Bomb Radar Markers
    if (bombData && bombData.bomb) {
      const b = bombData.bomb;
      const [bx, bz] = this.project(b.x, b.z);
      const isPlanted = b.state === "planted";
      const pulse = (Math.sin(now * 0.008) + 1) * 0.5;

      ctx.save();
      ctx.beginPath();
      ctx.arc(bx, bz, isPlanted ? 8 + pulse * 5 : 6, 0, Math.PI * 2);
      ctx.fillStyle = isPlanted
        ? `rgba(208, 32, 48, ${0.4 + pulse * 0.4})`
        : "rgba(235, 140, 20, 0.6)";
      ctx.fill();
      ctx.strokeStyle = isPlanted ? "#d02030" : "#2e3342";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("💣", bx, bz - 0.5);
      ctx.restore();
    }

    const [x, z] = this.project(position.x, position.z);
    // Camera forward is -Z; its world matrix also handles pitch correctly.
    const matrix = camera.matrixWorld.elements;
    const angle = Math.atan2(-matrix[8], matrix[10]);
    ctx.save();
    ctx.translate(x, z);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 22, -Math.PI / 2 - .45, -Math.PI / 2 + .45);
    ctx.closePath();
    ctx.fillStyle = "#2166cc30";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fillStyle = "#1673ed";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }
}
