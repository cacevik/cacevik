// Oyunun ana durum makinesi: fizik dünyası, sürükle-bırak girişi, puanlama.

const Game = {
  state: 'menu', // 'menu' | 'playing' | 'paused' | 'result'
  engine: null,
  world: null,
  canvas: null,
  ctx: null,
  cssWidth: 0,
  cssHeight: 0,

  level: null,
  tray: [],
  totalToPlace: 0,
  breakdown: [],
  bodies: [],
  liveScore: 0,
  timeLeft: 0,

  dragging: null,
  popups: [],

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.engine = Matter.Engine.create({ gravity: { x: 0, y: 1.15 } });
    this.world = this.engine.world;
    buildZonesPhysics(this.world);

    renderLevelSelect(document.getElementById('level-select'), (id) => this.startLevel(id));

    window.addEventListener('pointermove', (e) => this.onDragMove(e));
    window.addEventListener('pointerup', (e) => this.onDragEnd(e));
    window.addEventListener('pointercancel', (e) => this.onDragEnd(e));
  },

  layout(cssWidth, cssHeight) {
    this.cssWidth = cssWidth;
    this.cssHeight = cssHeight;
    layoutZones(cssWidth, cssHeight);
  },

  startLevel(levelId) {
    const level = getLevel(levelId);
    this.level = level;

    ZONE_ORDER.forEach((id) => {
      const z = Zones[id];
      z.setPegPattern((level.pegs && level.pegs[id]) || 0);
      z.setSprayArm(id === 'bottomRack' && !!level.sprayArm);
      z.build(this.world);
    });

    if (this.bodies.length) {
      Matter.World.remove(this.world, this.bodies.map((b) => b.body));
    }
    this.bodies = [];
    this.popups = [];

    const shuffled = level.items.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    this.tray = shuffled.map((typeId, i) => ({ uid: `${Date.now()}_${i}`, typeId }));
    this.totalToPlace = this.tray.length;
    this.breakdown = [];
    this.liveScore = 0;
    this.timeLeft = level.time;

    renderTray(document.getElementById('tray'), this.tray, (ev, entry, el) => this.onDragStart(ev, entry, el));
    showMainScreen('screen-game');
    toggleOverlay('screen-result', false);
    toggleOverlay('screen-pause', false);
    this.state = 'playing';
    updateHud(this);
  },

  restartCurrentLevel() {
    this.startLevel(this.level.id);
  },

  togglePause(forceState) {
    if (this.state === 'playing' && forceState !== 'playing') {
      this.state = 'paused';
      toggleOverlay('screen-pause', true);
    } else if (this.state === 'paused') {
      this.state = 'playing';
      toggleOverlay('screen-pause', false);
    }
  },

  quitToMenu() {
    this.state = 'menu';
    toggleOverlay('screen-pause', false);
    toggleOverlay('screen-result', false);
    renderLevelSelect(document.getElementById('level-select'), (id) => this.startLevel(id));
    showMainScreen('screen-menu');
  },

  // ---------- Sürükle-bırak ----------

  onDragStart(ev, entry, el) {
    if (this.state !== 'playing') return;
    ev.preventDefault();
    el.classList.add('active-drag');
    let ghost = document.getElementById('drag-ghost');
    if (!ghost) {
      ghost = document.createElement('div');
      ghost.id = 'drag-ghost';
      document.body.appendChild(ghost);
    }
    ghost.innerHTML = '';
    ghost.appendChild(iconCanvasFor(entry.typeId));
    ghost.style.left = ev.clientX + 'px';
    ghost.style.top = ev.clientY + 'px';
    ghost.style.display = 'block';
    this.dragging = { entry, el, ghost };
  },

  onDragMove(ev) {
    if (!this.dragging) return;
    this.dragging.ghost.style.left = ev.clientX + 'px';
    this.dragging.ghost.style.top = ev.clientY + 'px';
  },

  onDragEnd(ev) {
    const d = this.dragging;
    if (!d) return;
    this.dragging = null;
    d.ghost.style.display = 'none';
    d.el.classList.remove('active-drag');

    const rect = this.canvas.getBoundingClientRect();
    const sx = ev.clientX - rect.left;
    const sy = ev.clientY - rect.top;
    const overCanvas = sx >= 0 && sy >= 0 && sx <= rect.width && sy <= rect.height;

    if (!overCanvas) return; // tepsiye bırakıldı, iptal — bulaşık tepside kalır

    this.removeFromTray(d.entry.uid);

    const zone = findZoneAtScreenPoint(sx, sy);
    if (!zone) {
      this.recordBreakdown(d.entry.typeId, null, 0, 'Lavaboya düştü, kırıldı! 💥');
      this.addPopup(sx, sy, '💥 Kırıldı', '#f87171');
      this.checkLevelDone();
      return;
    }

    const def = ITEM_TYPES[d.entry.typeId];
    const approxRadius = def.shape === 'circle' ? def.radius * 0.85 : Math.max(def.width, def.height) / 2;
    const phys = zone.screenToPhys(sx, sy);
    const clampedX = Math.max(approxRadius + 2, Math.min(zone.physW - approxRadius - 2, phys.x - zone.physX)) + zone.physX;
    const dropY = Math.max(approxRadius + 4, Math.min(zone.physH * 0.4, phys.y));

    this.spawnBody(d.entry.typeId, zone, clampedX, dropY, approxRadius);
  },

  removeFromTray(uid) {
    this.tray = this.tray.filter((t) => t.uid !== uid);
    renderTray(document.getElementById('tray'), this.tray, (ev, entry, el) => this.onDragStart(ev, entry, el));
  },

  spawnBody(typeId, zone, px, py, approxRadius) {
    const def = ITEM_TYPES[typeId];
    let body;
    const commonOpts = { restitution: 0.12, friction: 0.55, frictionAir: 0.025, density: 0.0018 };
    if (def.shape === 'circle') {
      body = Matter.Bodies.circle(px, py, approxRadius, commonOpts);
    } else {
      body = Matter.Bodies.rectangle(px, py, def.width, def.height, { ...commonOpts, chamfer: { radius: def.width / 2.4 } });
    }
    Matter.Body.setAngle(body, (Math.random() - 0.5) * 0.6);
    Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.05);
    body.gameData = { typeId, zoneId: zone.id, scored: false, settleTimer: 0, approxRadius };
    Matter.World.add(this.world, body);
    this.bodies.push({ body, meta: body.gameData });
  },

  recordBreakdown(typeId, zoneId, score, detail) {
    this.breakdown.push({ typeId, zoneId, score, detail });
    this.liveScore += score;
    updateHud(this);
  },

  addPopup(x, y, text, color) {
    this.popups.push({ x, y, text, color, life: 1.0 });
  },

  checkLevelDone() {
    if (this.state === 'playing' && this.breakdown.length >= this.totalToPlace) {
      this.endLevel();
    }
  },

  // ---------- Güncelleme / Fizik ----------

  update(dt) {
    if (this.state !== 'playing') return;

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.tray.forEach((t) => this.recordBreakdown(t.typeId, null, 0, 'Süre bitti, yıkanamadı'));
      this.tray = [];
      renderTray(document.getElementById('tray'), this.tray, () => {});
      this.endLevel();
      return;
    }

    Matter.Engine.update(this.engine, Math.min(dt * 1000, 33));

    for (const entry of this.bodies) {
      const { body, meta } = entry;
      if (meta.scored) continue;
      const speed = Matter.Vector.magnitude(body.velocity) + Math.abs(body.angularVelocity) * 8;
      if (speed < 0.12) {
        meta.settleTimer += dt;
        if (meta.settleTimer > 0.35) {
          this.scoreBody(entry);
        }
      } else {
        meta.settleTimer = 0;
      }
    }

    this.popups.forEach((p) => { p.life -= dt * 0.9; p.y -= dt * 22; });
    this.popups = this.popups.filter((p) => p.life > 0);

    updateHud(this);
  },

  scoreBody(entry) {
    const { body, meta } = entry;
    meta.scored = true;
    const zone = Zones[meta.zoneId];
    const def = ITEM_TYPES[meta.typeId];
    const correct = def.category === zone.category;

    let overlapSum = 0;
    for (const other of this.bodies) {
      if (other === entry) continue;
      if (other.meta.zoneId !== zone.id) continue;
      const dist = Matter.Vector.magnitude(Matter.Vector.sub(body.position, other.body.position));
      const combined = (meta.approxRadius + other.meta.approxRadius) * 0.95;
      const overlapAmt = combined - dist;
      if (overlapAmt > 0) overlapSum += overlapAmt;
    }
    const spacingScore = Math.max(0, Math.min(1, 1 - overlapSum / (meta.approxRadius * 2.2)));

    let sprayPenalty = 0;
    if (zone.sprayArm) {
      const local = zone.toLocal(body.position.x, body.position.y);
      const d = Math.hypot(local.x - zone.sprayArm.x, local.y - zone.sprayArm.y);
      if (d < zone.sprayArm.r + meta.approxRadius) sprayPenalty = 25;
    }

    const base = correct ? 60 : 15;
    const bonus = correct ? 40 : 15;
    const score = Math.round(Math.max(0, Math.min(100, base + bonus * spacingScore - sprayPenalty)));

    let detail;
    if (correct) {
      detail = sprayPenalty > 0
        ? 'Doğru raf ama püskürtme koluna çok yakın'
        : (spacingScore > 0.7 ? 'Düzgün ve aralıklı yerleşti' : 'Doğru raf ama biraz sıkışık');
    } else {
      detail = `Yanlış yer (${zone.label})`;
    }

    const screenPos = zone.toScreen(body.position.x, body.position.y);
    this.addPopup(screenPos.x, screenPos.y, `+${score}`, score >= 70 ? '#4ade80' : score >= 35 ? '#ffb347' : '#f87171');
    this.recordBreakdown(meta.typeId, zone.id, score, detail);
    this.checkLevelDone();
  },

  endLevel() {
    this.state = 'result';
    const accuracyAvg = this.breakdown.length
      ? this.breakdown.reduce((s, b) => s + b.score, 0) / this.breakdown.length
      : 0;
    const timeBonusPct = this.timeLeft > 0 ? (this.timeLeft / this.level.time) * 100 : 0;
    const finalPct = accuracyAvg * 0.7 + timeBonusPct * 0.3;
    const stars = finalPct >= 85 ? 3 : finalPct >= 60 ? 2 : finalPct >= 35 ? 1 : 0;
    const isLast = this.level.id === LEVELS[LEVELS.length - 1].id;
    showResult(this.level.id, this.breakdown, finalPct, stars, isLast);
    toggleOverlay('screen-result', true);
  },

  // ---------- Çizim ----------

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);

    ZONE_ORDER.forEach((id) => {
      const zone = Zones[id];
      Iso.drawPlatform(ctx, zone.transform, zone.physW, zone.physH, 16, zone.color);

      ctx.font = '600 13px -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      const labelPos = Iso.toScreen(zone.transform, 4, -8);
      ctx.fillText(zone.label, labelPos.x, labelPos.y);

      for (const peg of zone.pegs) Iso.drawPeg(ctx, zone.transform, peg.x, peg.y, peg.r);

      if (zone.sprayArm) {
        const c = Iso.toScreen(zone.transform, zone.sprayArm.x, zone.sprayArm.y);
        const s = Iso.avgScale(zone.transform);
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, zone.sprayArm.r * s, zone.sprayArm.r * s * 0.7, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,90,90,0.16)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,120,120,0.55)';
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    const sorted = this.bodies.slice().sort((a, b) => a.body.position.y - b.body.position.y);
    for (const entry of sorted) {
      const zone = Zones[entry.meta.zoneId];
      const pos = zone.toScreen(entry.body.position.x, entry.body.position.y);
      const scale = Iso.avgScale(zone.transform);
      const def = ITEM_TYPES[entry.meta.typeId];
      def.draw(ctx, pos.x, pos.y, scale, entry.body.angle);
    }

    ctx.textAlign = 'center';
    for (const p of this.popups) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.font = '700 15px -apple-system, sans-serif';
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';
  },
};
