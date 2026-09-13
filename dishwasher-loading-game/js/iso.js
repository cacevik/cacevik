// Basit izometrik/pseudo-3D projeksiyon yardımcıları.
// Fizik simülasyonu her bölgenin kendi "local" (yerel) dikdörtgen uzayında,
// eksene paralı koordinatlarla çalışır. Ekrana çizerken bu local koordinatları
// bir afin dönüşümle (kaydırma + ölçek) eğik/izometrik görünüme çeviririz.

const Iso = {};

// transform: { originX, originY, scaleX, scaleY, shearX }
Iso.makeTransform = function (originX, originY, scaleX, scaleY, shearX) {
  return { originX, originY, scaleX, scaleY, shearX: shearX || 0 };
};

Iso.toScreen = function (t, lx, ly) {
  return {
    x: t.originX + lx * t.scaleX + ly * t.shearX,
    y: t.originY + ly * t.scaleY,
  };
};

Iso.toLocal = function (t, sx, sy) {
  const ly = (sy - t.originY) / t.scaleY;
  const lx = (sx - t.originX - ly * t.shearX) / t.scaleX;
  return { x: lx, y: ly };
};

// Ortalama ölçek (sprite boyutlandırma için)
Iso.avgScale = function (t) {
  return (Math.abs(t.scaleX) + Math.abs(t.scaleY)) / 2;
};

function shade(hex, amt) {
  const c = hex.replace('#', '');
  const num = parseInt(c, 16);
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0xff) + amt;
  let b = (num & 0xff) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `rgb(${r},${g},${b})`;
}
Iso.shade = shade;

// Bir "raf/platform" kutusunu üstten görünümlü, hafif derinlikli çizer.
// w,h: local birimlerde platform genişlik/derinliği. depth: ekran pikseli cinsinden dikey ekstruzyon.
Iso.drawPlatform = function (ctx, t, w, h, depth, baseColor) {
  const a = Iso.toScreen(t, 0, 0);
  const b = Iso.toScreen(t, w, 0);
  const c = Iso.toScreen(t, w, h);
  const d = Iso.toScreen(t, 0, h);

  const front = shade(baseColor, -35);
  const side = shade(baseColor, -55);
  const top = shade(baseColor, 18);

  // sağ yan yüz
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(c.x, c.y + depth);
  ctx.lineTo(b.x, b.y + depth);
  ctx.closePath();
  ctx.fillStyle = side;
  ctx.fill();

  // ön yüz
  ctx.beginPath();
  ctx.moveTo(d.x, d.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(c.x, c.y + depth);
  ctx.lineTo(d.x, d.y + depth);
  ctx.closePath();
  ctx.fillStyle = front;
  ctx.fill();

  // üst yüz (raf zemini)
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
  ctx.fillStyle = top;
  ctx.fill();
  ctx.strokeStyle = shade(baseColor, 40);
  ctx.lineWidth = 2;
  ctx.stroke();

  // raf çizgileri (tel görünümü)
  ctx.strokeStyle = shade(baseColor, 30);
  ctx.lineWidth = 1;
  const lines = Math.max(3, Math.round(w / 28));
  for (let i = 1; i < lines; i++) {
    const lx = (w / lines) * i;
    const p1 = Iso.toScreen(t, lx, 0);
    const p2 = Iso.toScreen(t, lx, h);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  return { a, b, c, d };
};

Iso.drawPeg = function (ctx, t, lx, ly, r) {
  const p = Iso.toScreen(t, lx, ly);
  const s = Iso.avgScale(t);
  const rad = r * s;
  const grad = ctx.createRadialGradient(p.x - rad * 0.3, p.y - rad * 0.3, rad * 0.1, p.x, p.y, rad);
  grad.addColorStop(0, '#e8eef2');
  grad.addColorStop(1, '#9fb3bd');
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, rad, rad * 0.7, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#6c8892';
  ctx.lineWidth = 1.5;
  ctx.stroke();
};
