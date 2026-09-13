// 3D bölgeler: Üst Raf, Alt Raf, Çatal-Kaşık Sepeti.
// Üçü de TEK bir gerçekçi bulaşık makinesi gövdesinin iç hacmi içinde,
// birbiriyle çakışmayan bölgeler olarak konumlanır (alt raf tabanda geniş,
// üst raf onun üstünde daha dar bir raf, sepet alt rafın bir köşesine
// yerleştirilmiş küçük bir sepet) — bkz. scene3d.js'teki gövde/kasa ölçüleri.
// Fizik ve raycast hedefleme doğrudan bu koordinatlarda çalışır.

const ZONE3D_ORDER = ['topRack', 'bottomRack', 'basket'];

const ZONE3D_BASE = {
  bottomRack: {
    label: 'Alt Raf', category: 'bottom', color: 0xaebac2,
    center: { x: -0.175, y: 0.08, z: 0 }, w: 1.45, d: 1.2, wallH: 0.15,
  },
  topRack: {
    label: 'Üst Raf', category: 'top', color: 0x7fb8cf,
    center: { x: -0.1, y: 0.5, z: 0 }, w: 1.3, d: 0.85, wallH: 0.12,
  },
  basket: {
    label: 'Çatal-Kaşık Sepeti', category: 'basket', color: 0xdba545,
    center: { x: 0.725, y: 0.08, z: 0.35 }, w: 0.35, d: 0.5, wallH: 0.26,
  },
};

class Zone3D {
  constructor(id) {
    const base = ZONE3D_BASE[id];
    this.id = id;
    this.label = base.label;
    this.category = base.category;
    this.color = base.color;
    this.center = base.center;
    this.w = base.w;
    this.d = base.d;
    this.wallH = base.wallH;
    this.pegs = []; // {x,z,r} yerel (merkeze göre) koordinat
    this.sprayArm = null; // {x,z,r} yerel
    this.group = null; // THREE.Group — bu bölgenin görsel nesneleri
    this.floorMesh = null; // raycast hedefi
  }

  // Yerel (bölge merkezine göre) x/z -> dünya x/z
  localToWorldXZ(lx, lz) {
    return { x: this.center.x + lx, z: this.center.z + lz };
  }

  worldToLocalXZ(wx, wz) {
    return { x: wx - this.center.x, z: wz - this.center.z };
  }

  // İç sınırlar (kenar payı ile) — düşürülen bulaşık bu aralığa kelepçelenir.
  clampLocalXZ(lx, lz, margin) {
    const hw = this.w / 2 - margin;
    const hd = this.d / 2 - margin;
    return {
      x: Math.max(-hw, Math.min(hw, lx)),
      z: Math.max(-hd, Math.min(hd, lz)),
    };
  }

  setPegPattern(count) {
    this.pegs = [];
    if (!count) return;
    const cols = Math.max(2, Math.min(count, 3));
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const lx = (col - (cols - 1) / 2) * (this.w / (cols + 0.6));
      const lz = (row - 0.5) * (this.d * 0.4);
      this.pegs.push({ x: lx, z: lz, r: 0.035 });
    }
  }

  setSprayArm(enabled) {
    this.sprayArm = enabled ? { x: 0, z: 0, r: 0.14 } : null;
  }
}

const Zones3D = {};
ZONE3D_ORDER.forEach((id) => { Zones3D[id] = new Zone3D(id); });

function findZone3DByFloorMesh(mesh) {
  for (const id of ZONE3D_ORDER) {
    if (Zones3D[id].floorMesh === mesh) return Zones3D[id];
  }
  return null;
}
