// Bulaşık türleri — gerçek 3D mesh'ler (Three.js primitifleriyle inşa edilir).
// category: 'bottom' (alt raf), 'top' (üst raf), 'basket' (çatal-kaşık sepeti)

function stdMat(color, roughness, metalness) {
  return new THREE.MeshStandardMaterial({ color, roughness: roughness ?? 0.55, metalness: metalness ?? 0.05 });
}

function plateMesh(radius, color) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.94, 0.022, 40), stdMat(color, 0.35, 0.05));
  g.add(base);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.82, radius * 0.05, 10, 40),
    stdMat(color, 0.3, 0.05)
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.014;
  g.add(rim);
  return g;
}

function bowlMesh(radius, color) {
  const g = new THREE.Group();
  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
    stdMat(color, 0.4, 0.05)
  );
  bowl.rotation.x = Math.PI;
  bowl.position.y = radius * 0.42;
  g.add(bowl);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.98, radius * 0.045, 8, 32), stdMat(color, 0.3, 0.05));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = radius * 0.42;
  g.add(rim);
  return g;
}

function cupMesh(radius, height, color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.85, height, 24), stdMat(color, 0.4, 0.05));
  body.position.y = height / 2;
  g.add(body);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.55, radius * 0.13, 8, 16, Math.PI * 1.3), stdMat(color, 0.4, 0.05));
  handle.position.set(radius * 0.95, height / 2, 0);
  handle.rotation.y = Math.PI / 2;
  handle.rotation.z = -0.3;
  g.add(handle);
  return g;
}

function glassMesh(radius, height, color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.08, radius * 0.82, height, 24),
    new THREE.MeshPhysicalMaterial({ color, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.55, transmission: 0.3 })
  );
  body.position.y = height / 2;
  g.add(body);
  return g;
}

function potMesh(radius, height, color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 28), stdMat(color, 0.35, 0.4));
  body.position.y = height / 2;
  g.add(body);
  const handleGeo = new THREE.BoxGeometry(radius * 0.55, radius * 0.14, radius * 0.14);
  const hMat = stdMat(0x6b7278, 0.4, 0.5);
  const h1 = new THREE.Mesh(handleGeo, hMat);
  h1.position.set(radius * 1.18, height * 0.75, 0);
  g.add(h1);
  const h2 = new THREE.Mesh(handleGeo, hMat);
  h2.position.set(-radius * 1.18, height * 0.75, 0);
  g.add(h2);
  return g;
}

function panMesh(radius, height, color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.92, height, 28), stdMat(color, 0.3, 0.55));
  body.position.y = height / 2;
  g.add(body);
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.09, radius * 0.09, radius * 1.6, 10),
    stdMat(0x1c1d1f, 0.5, 0.2)
  );
  handle.rotation.z = Math.PI / 2;
  handle.position.set(radius * 1.55, height * 0.6, 0);
  g.add(handle);
  return g;
}

function cutleryMesh(kind, color) {
  const g = new THREE.Group();
  const len = kind === 'knife' ? 0.34 : kind === 'spoon' ? 0.3 : 0.32;
  const w = kind === 'knife' ? 0.032 : kind === 'spoon' ? 0.036 : 0.034;
  const handle = new THREE.Mesh(new THREE.BoxGeometry(w, 0.014, len * 0.6), stdMat(color, 0.4, 0.3));
  handle.position.z = -len * 0.18;
  g.add(handle);

  if (kind === 'fork') {
    for (let i = -1; i <= 1; i++) {
      const prong = new THREE.Mesh(new THREE.BoxGeometry(w / 4, 0.012, len * 0.32), stdMat(color, 0.4, 0.3));
      prong.position.set(i * (w / 2.6), 0, len * 0.32);
      g.add(prong);
    }
  } else if (kind === 'spoon') {
    const head = new THREE.Mesh(new THREE.SphereGeometry(w * 1.3, 16, 10), stdMat(color, 0.4, 0.3));
    head.scale.set(1, 0.35, 1.5);
    head.position.z = len * 0.28;
    g.add(head);
  } else if (kind === 'knife') {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.01, len * 0.55), stdMat(0xc7ccd0, 0.25, 0.6));
    blade.position.z = len * 0.32;
    g.add(blade);
  }
  return g;
}

const ITEM_TYPES = {
  plate: {
    id: 'plate', name: 'Tabak', category: 'bottom', color: 0xf4f6f8,
    approxRadius: 0.15, height: 0.03,
    build: () => plateMesh(0.15, 0xf4f6f8),
  },
  bigplate: {
    id: 'bigplate', name: 'Servis Tabağı', category: 'bottom', color: 0xeef2f5,
    approxRadius: 0.185, height: 0.03,
    build: () => plateMesh(0.185, 0xeef2f5),
  },
  pot: {
    id: 'pot', name: 'Tencere', category: 'bottom', color: 0xc7cdd2,
    approxRadius: 0.17, height: 0.16,
    build: () => potMesh(0.15, 0.15, 0xc7cdd2),
  },
  pan: {
    id: 'pan', name: 'Tava', category: 'bottom', color: 0x5b5f66,
    approxRadius: 0.16, height: 0.06,
    build: () => panMesh(0.155, 0.045, 0x5b5f66),
  },
  bowl: {
    id: 'bowl', name: 'Kase', category: 'top', color: 0xffd97d,
    approxRadius: 0.115, height: 0.09,
    build: () => bowlMesh(0.11, 0xffd97d),
  },
  cup: {
    id: 'cup', name: 'Fincan', category: 'top', color: 0xff8fa3,
    approxRadius: 0.09, height: 0.075,
    build: () => cupMesh(0.075, 0.065, 0xff8fa3),
  },
  glass: {
    id: 'glass', name: 'Bardak', category: 'top', color: 0x9fe8ff,
    approxRadius: 0.075, height: 0.11,
    build: () => glassMesh(0.065, 0.1, 0x9fe8ff),
  },
  fork: {
    id: 'fork', name: 'Çatal', category: 'basket', color: 0xd8dde2,
    approxRadius: 0.17, height: 0.02,
    build: () => cutleryMesh('fork', 0xd8dde2),
  },
  spoon: {
    id: 'spoon', name: 'Kaşık', category: 'basket', color: 0xe3e7ea,
    approxRadius: 0.16, height: 0.02,
    build: () => cutleryMesh('spoon', 0xe3e7ea),
  },
  knife: {
    id: 'knife', name: 'Bıçak', category: 'basket', color: 0xc9ced3,
    approxRadius: 0.17, height: 0.018,
    build: () => cutleryMesh('knife', 0xc9ced3),
  },
};
