// Oyunun ana durum makinesi: 3D sahne, sürükle-bırak (raycast), kamera
// döndürme, puanlama.

const Game = {
  state: 'menu', // 'menu' | 'playing' | 'paused' | 'result'
  canvas: null,
  cssWidth: 0,
  cssHeight: 0,

  level: null,
  tray: [],
  totalToPlace: 0,
  breakdown: [],
  liveScore: 0,
  timeLeft: 0,

  dragging: null,
  orbitDrag: null,

  init(canvas) {
    this.canvas = canvas;
    Scene3D.init(canvas);
    Physics3D.reset();

    renderLevelSelect(document.getElementById('level-select'), (id) => this.startLevel(id));

    canvas.addEventListener('pointerdown', (e) => this.onCanvasPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onDragMove(e));
    window.addEventListener('pointerup', (e) => this.onDragEnd(e));
    window.addEventListener('pointercancel', (e) => this.onDragEnd(e));
  },

  layout(cssWidth, cssHeight) {
    this.cssWidth = cssWidth;
    this.cssHeight = cssHeight;
    Scene3D.resize(cssWidth, cssHeight);
  },

  startLevel(levelId) {
    const level = getLevel(levelId);
    this.level = level;
    this.brand = getBrandForLevel(levelId);
    Scene3D.setBrand(this.brand);

    ZONE3D_ORDER.forEach((id) => {
      const z = Zones3D[id];
      z.setPegPattern((level.pegs && level.pegs[id]) || 0);
      z.setSprayArm(id === 'bottomRack' && !!level.sprayArm);
    });
    Scene3D.rebuildHazards();

    Physics3D.bodies.forEach((b) => Scene3D.scene.remove(b.mesh));
    Physics3D.reset();

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

  togglePause() {
    if (this.state === 'playing') {
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

  // ---------- Kamera döndürme (tepsi öğesi sürüklenmiyorken) ----------

  onCanvasPointerDown(ev) {
    if (this.state !== 'playing' || this.dragging) return;
    this.orbitDrag = { lastX: ev.clientX, lastY: ev.clientY, moved: false };
  },

  // ---------- Sürükle-bırak (tepsiden) ----------

  onDragStart(ev, entry, el) {
    if (this.state !== 'playing') return;
    ev.preventDefault();
    ev.stopPropagation();
    el.classList.add('active-drag');
    let ghost = document.getElementById('drag-ghost');
    if (!ghost) {
      ghost = document.createElement('div');
      ghost.id = 'drag-ghost';
      document.body.appendChild(ghost);
    }
    ghost.innerHTML = trayIconHtml(entry.typeId);
    ghost.style.left = ev.clientX + 'px';
    ghost.style.top = ev.clientY + 'px';
    ghost.style.display = 'block';
    this.dragging = { entry, el, ghost };
  },

  onDragMove(ev) {
    if (this.dragging) {
      this.dragging.ghost.style.left = ev.clientX + 'px';
      this.dragging.ghost.style.top = ev.clientY + 'px';
      return;
    }
    if (this.orbitDrag) {
      const dx = ev.clientX - this.orbitDrag.lastX;
      const dy = ev.clientY - this.orbitDrag.lastY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this.orbitDrag.moved = true;
      this.orbitDrag.lastX = ev.clientX;
      this.orbitDrag.lastY = ev.clientY;
      Scene3D.rotateOrbit(-dx * 0.008, dy * 0.006);
    }
  },

  onDragEnd(ev) {
    if (this.orbitDrag) this.orbitDrag = null;

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

    const hit = Scene3D.raycastDrop(sx, sy);
    if (!hit) {
      this.recordBreakdown(d.entry.typeId, null, 0, 'Lavaboya düştü, kırıldı! 💥');
      this.addPopupAtScreen(sx, sy, '💥 Kırıldı', '#f87171');
      this.checkLevelDone();
      return;
    }

    const zone = hit.zone;
    const def = ITEM_TYPES[d.entry.typeId];
    const local = zone.worldToLocalXZ(hit.point.x, hit.point.z);
    const clamped = zone.clampLocalXZ(local.x, local.z, def.approxRadius);
    const world = zone.localToWorldXZ(clamped.x, clamped.z);

    this.spawnBody(d.entry.typeId, zone, world.x, zone.center.y + 0.55, world.z);
  },

  removeFromTray(uid) {
    this.tray = this.tray.filter((t) => t.uid !== uid);
    renderTray(document.getElementById('tray'), this.tray, (ev, entry, el) => this.onDragStart(ev, entry, el));
  },

  spawnBody(typeId, zone, x, y, z) {
    const def = ITEM_TYPES[typeId];
    const mesh = def.build();
    mesh.position.set(x, y, z);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    mesh.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    Scene3D.scene.add(mesh);

    const entry = {
      mesh,
      position: new THREE.Vector3(x, y, z),
      velocity: new THREE.Vector3((Math.random() - 0.5) * 0.15, 0, (Math.random() - 0.5) * 0.15),
      angVel: new THREE.Vector3((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2),
      zoneId: zone.id,
      approxRadius: def.approxRadius,
      typeId,
      settled: false,
      settleTimer: 0,
      scored: false,
    };
    Physics3D.addBody(entry);
  },

  recordBreakdown(typeId, zoneId, score, detail) {
    this.breakdown.push({ typeId, zoneId, score, detail });
    this.liveScore += score;
    updateHud(this);
  },

  addPopupAtScreen(sx, sy, text, color) {
    const rect = this.canvas.getBoundingClientRect();
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = `position:fixed;left:${rect.left + sx}px;top:${rect.top + sy}px;transform:translate(-50%,-50%);
      color:${color};font-weight:700;font-size:15px;pointer-events:none;z-index:40;text-shadow:0 1px 3px rgba(0,0,0,0.6);
      transition:transform 0.9s ease-out, opacity 0.9s ease-out;`;
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.style.transform = 'translate(-50%, -180%)';
      el.style.opacity = '0';
    });
    setTimeout(() => el.remove(), 950);
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

    Physics3D.step(dt, (entry) => this.scoreBody(entry));
    updateHud(this);
  },

  scoreBody(entry) {
    entry.scored = true;
    const zone = Zones3D[entry.zoneId];
    const def = ITEM_TYPES[entry.typeId];
    const correct = def.category === zone.category;

    let overlapSum = 0;
    for (const other of Physics3D.bodies) {
      if (other === entry || other.zoneId !== zone.id) continue;
      const dist = entry.position.distanceTo(other.position);
      const combined = (entry.approxRadius + other.approxRadius) * 0.95;
      const overlapAmt = combined - dist;
      if (overlapAmt > 0) overlapSum += overlapAmt;
    }
    const spacingScore = Math.max(0, Math.min(1, 1 - overlapSum / (entry.approxRadius * 2.2)));

    let sprayPenalty = 0;
    if (zone.sprayArm) {
      const local = zone.worldToLocalXZ(entry.position.x, entry.position.z);
      const d = Math.hypot(local.x - zone.sprayArm.x, local.z - zone.sprayArm.z);
      if (d < zone.sprayArm.r + entry.approxRadius) sprayPenalty = 25;
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

    const screenPos = Scene3D.worldToScreen(entry.position);
    this.addPopupAtScreen(screenPos.x, screenPos.y, `+${score}`, score >= 70 ? '#4ade80' : score >= 35 ? '#ffb347' : '#f87171');
    this.recordBreakdown(entry.typeId, zone.id, score, detail);
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

  render() {
    Scene3D.render();
  },
};
