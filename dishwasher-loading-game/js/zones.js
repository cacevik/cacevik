// Bölgeler: Alt Raf, Üst Raf, Çatal-Kaşık Sepeti.
// Her bölgenin kendi yerel fizik dikdörtgeni (physW x physH) ve ekrana çizim
// için bir Iso dönüşümü (transform) vardır. Fizik gövdeleri ortak tek bir
// Matter dünyasında, bölgeler yan yana (physX ofsetiyle) konumlanır.

const ZONE_ORDER = ['topRack', 'bottomRack', 'basket'];

const ZONE_BASE = {
  topRack: { label: 'Üst Raf', category: 'top', physW: 360, physH: 130, color: '#7fb8cf', gap: 40 },
  bottomRack: { label: 'Alt Raf', category: 'bottom', physW: 420, physH: 190, color: '#c7d0d6', gap: 40 },
  basket: { label: 'Çatal-Kaşık Sepeti', category: 'basket', physW: 120, physH: 190, color: '#e0b25a', gap: 0 },
};

class Zone {
  constructor(id) {
    const base = ZONE_BASE[id];
    this.id = id;
    this.label = base.label;
    this.category = base.category;
    this.physW = base.physW;
    this.physH = base.physH;
    this.color = base.color;
    this.physX = 0; // fizik dünyasındaki x ofseti (build() ile atanır)
    this.transform = null; // Iso.makeTransform(...) — layout() ile atanır
    this.screenBox = { x: 0, y: 0, w: 0, h: 0 }; // hit-test için ekran AABB
    this.staticBodies = [];
    this.pegs = []; // {x,y,r} local koordinat
    this.sprayArm = null; // {x,y,r} varsa
  }

  // Fizik dünyasındaki statik duvarları/pegleri (yeniden) oluşturur.
  build(world) {
    // eski statik gövdeleri temizle
    if (this.staticBodies.length) {
      Matter.World.remove(world, this.staticBodies);
      this.staticBodies = [];
    }
    const t = 14; // duvar kalınlığı
    const opts = { isStatic: true, friction: 0.6, restitution: 0.05, label: 'wall' };
    const floor = Matter.Bodies.rectangle(this.physX + this.physW / 2, this.physH + t / 2, this.physW + t * 2, t, opts);
    const left = Matter.Bodies.rectangle(this.physX - t / 2, this.physH / 2, t, this.physH + t * 2, opts);
    const right = Matter.Bodies.rectangle(this.physX + this.physW + t / 2, this.physH / 2, t, this.physH + t * 2, opts);
    this.staticBodies.push(floor, left, right);

    for (const peg of this.pegs) {
      const body = Matter.Bodies.circle(this.physX + peg.x, peg.y, peg.r, {
        isStatic: true, friction: 0.4, restitution: 0.1, label: 'peg',
      });
      this.staticBodies.push(body);
    }

    if (this.sprayArm) {
      const sa = Matter.Bodies.circle(this.physX + this.sprayArm.x, this.sprayArm.y, this.sprayArm.r, {
        isStatic: true, isSensor: true, label: 'sprayArm',
      });
      this.staticBodies.push(sa);
    }

    Matter.World.add(world, this.staticBodies);
  }

  setPegPattern(count) {
    this.pegs = [];
    if (!count) return;
    const cols = Math.min(count, Math.max(2, Math.round(this.physW / 90)));
    for (let i = 0; i < count; i++) {
      const cx = ((i % cols) + 0.5) * (this.physW / cols);
      const cy = this.physH * (0.35 + 0.3 * Math.floor(i / cols));
      this.pegs.push({ x: cx, y: cy, r: 9 });
    }
  }

  setSprayArm(enabled) {
    this.sprayArm = enabled ? { x: this.physW / 2, y: this.physH * 0.55, r: 34 } : null;
  }

  toLocal(px, py) {
    return { x: px - this.physX, y: py };
  }

  toScreen(px, py) {
    const local = this.toLocal(px, py);
    return Iso.toScreen(this.transform, local.x, local.y);
  }

  containsScreenPoint(sx, sy) {
    const b = this.screenBox;
    return sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h;
  }

  screenToPhys(sx, sy) {
    const local = Iso.toLocal(this.transform, sx, sy);
    return { x: this.physX + local.x, y: local.y };
  }
}

const Zones = {};
ZONE_ORDER.forEach((id) => { Zones[id] = new Zone(id); });

// Fizik dünyasında bölgeleri yan yana konumlandırır (x ofsetleri) ve duvarları kurar.
function buildZonesPhysics(world) {
  let cursor = 0;
  for (const id of ZONE_ORDER) {
    const z = Zones[id];
    z.physX = cursor;
    cursor += z.physW + 60;
    z.build(world);
  }
}

// Ekran düzenini hesaplar: her bölgeye bir Iso transform ve screenBox atar.
// Dikey istifleme (mobil dikey ekrana uygun): üstte Üst Raf, ortada geniş
// Alt Raf, altta Çatal-Kaşık Sepeti — her biri hafif izometrik eğimle çizilir.
function layoutZones(canvasW, canvasH) {
  const shearTop = canvasW * 0.05;
  const shearBottom = canvasW * 0.07;
  const shearBasket = canvasW * 0.03;

  const padTop = canvasH * 0.04;
  const topH = canvasH * 0.22;
  const gap1 = canvasH * 0.05;
  const bottomH = canvasH * 0.36;
  const gap2 = canvasH * 0.03;
  const basketH = canvasH * 0.16;

  // Üst Raf
  const topW = canvasW * 0.80;
  const topX = (canvasW - (topW + shearTop)) / 2;
  const topY = padTop;
  const top = Zones.topRack;
  top.transform = Iso.makeTransform(topX, topY, topW / top.physW, topH / top.physH, shearTop / top.physH);
  top.screenBox = { x: topX - 12, y: topY - 12, w: topW + shearTop + 24, h: topH + 18 };

  // Alt Raf
  const bottomW = canvasW * 0.94;
  const bottomX = (canvasW - (bottomW + shearBottom)) / 2;
  const bottomY = topY + topH + gap1;
  const bottom = Zones.bottomRack;
  bottom.transform = Iso.makeTransform(bottomX, bottomY, bottomW / bottom.physW, bottomH / bottom.physH, shearBottom / bottom.physH);
  bottom.screenBox = { x: bottomX - 12, y: bottomY - 12, w: bottomW + shearBottom + 24, h: bottomH + 18 };

  // Sepet
  const basketW = canvasW * 0.5;
  const basketX = (canvasW - (basketW + shearBasket)) / 2;
  const basketY = bottomY + bottomH + gap2;
  const basket = Zones.basket;
  basket.transform = Iso.makeTransform(basketX, basketY, basketW / basket.physW, basketH / basket.physH, shearBasket / basket.physH);
  basket.screenBox = { x: basketX - 12, y: basketY - 12, w: basketW + shearBasket + 24, h: basketH + 18 };
}

function findZoneAtScreenPoint(sx, sy) {
  for (const id of ZONE_ORDER) {
    if (Zones[id].containsScreenPoint(sx, sy)) return Zones[id];
  }
  return null;
}
