// Three.js sahne kurulumu: kamera (dokunarak döndürülebilir "orbit"),
// ışıklandırma, raf/sepet 3D görselleri, raycast ile bırakma hedefi tespiti.

function blendHex(hexA, hexB, t) {
  const ar = (hexA >> 16) & 0xff, ag = (hexA >> 8) & 0xff, ab = hexA & 0xff;
  const br = (hexB >> 16) & 0xff, bg = (hexB >> 8) & 0xff, bb = hexB & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | b;
}

const Scene3D = {
  renderer: null,
  scene: null,
  camera: null,
  raycaster: null,
  cssWidth: 0,
  cssHeight: 0,

  orbit: {
    theta: 0.42, // azimut (Y ekseni etrafında)
    phi: 0.72, // yükseklik açısı (yataydan)
    radius: 3.5,
    minPhi: 0.32,
    maxPhi: 1.4,
    minRadius: 2.2,
    maxRadius: 4.6,
    target: null, // THREE.Vector3
  },

  hazardMeshes: [],
  caseGroup: null,
  currentBrand: null,

  // Kasa (gövde) ölçüleri — bkz. zones3d.js'teki iç hacim yerleşimiyle uyumlu.
  CASE: { wt: 0.05, plinthH: 0.08, caseH: 0.92, panelH: 0.15, halfW: 0.9, halfD: 0.6 },

  init(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    // Orta tonlu, "fotoğraf stüdyosu" gri fon — hem açık (Solvex) hem koyu
    // (Nordlux) gövde renklerine karşı kontrast versin diye.
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8f969c);
    this.scene.fog = new THREE.Fog(0x8f969c, 6, 13);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 20);
    this.orbit.target = new THREE.Vector3(0, 0.42, 0.02);
    this.updateCameraFromOrbit();

    this.raycaster = new THREE.Raycaster();

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);
    const hemi = new THREE.HemisphereLight(0xdfe6ea, 0x50565a, 0.45);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xfff3e0, 0.95);
    dir.position.set(1.6, 3.2, 1.8);
    dir.castShadow = true;
    dir.shadow.mapSize.set(768, 768);
    dir.shadow.camera.left = -1.2;
    dir.shadow.camera.right = 1.2;
    dir.shadow.camera.top = 1.1;
    dir.shadow.camera.bottom = -0.9;
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 5;
    dir.shadow.bias = -0.003;
    this.scene.add(dir);
    const fill = new THREE.DirectionalLight(0xcfe8ff, 0.18);
    fill.position.set(-2, 1.5, -1.5);
    this.scene.add(fill);

    this.buildGround();
    ZONE3D_ORDER.forEach((id) => this.buildZoneVisual(Zones3D[id]));
    this.setBrand(BRANDS.solvex);
  },

  // Metal/plastik yüzeylerde gerçekçi yansımalar için basit, prosedürel bir
  // "ortam" (kutu şeklinde mutfak/gökyüzü gradyanı) üretip PBR environment
  // map olarak kullanır — harici bir HDRI dosyasına ihtiyaç duymadan.
  buildEnvironment() {
    const envScene = new THREE.Scene();
    const c = document.createElement('canvas');
    c.width = 16; c.height = 128;
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, '#d3d9dd');
    grad.addColorStop(0.45, '#9aa1a6');
    grad.addColorStop(1, '#5b6165');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 128);
    const tex = new THREE.CanvasTexture(c);
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(6, 16, 16),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide })
    );
    envScene.add(sky);
    const glow = new THREE.PointLight(0xffffff, 0.5, 10);
    glow.position.set(2, 3, 2);
    envScene.add(glow);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const rt = pmrem.fromScene(envScene, 0.05);
    this.scene.environment = rt.texture;
    pmrem.dispose();
  },

  makeCounterTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#c7cdd2';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * 256, y = Math.random() * 256;
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
      ctx.fillRect(x, y, 2, 2);
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.04})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    return tex;
  },

  buildGround() {
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(3.4, 48),
      new THREE.MeshStandardMaterial({ color: 0xc7cdd2, roughness: 0.75, metalness: 0.05, map: this.makeCounterTexture() })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 3),
      new THREE.MeshStandardMaterial({ color: 0xa4abb0, roughness: 0.95 })
    );
    backdrop.position.set(0, 1.3, -2.2);
    this.scene.add(backdrop);
  },

  makePerforatedAlphaMap() {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#000';
    for (let y = 6; y < 64; y += 12) {
      for (let x = 6; x < 64; x += 12) {
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 2);
    return tex;
  },

  // Gerçek bir bulaşık makinesi rafı gibi görünmesi için raflar düz boyalı
  // kutular yerine ince "tel" geometrisiyle (InstancedMesh) inşa edilir; sepet
  // ise delikli plastik görünümü versin diye alfa maskeli düz duvarlar kullanır.
  buildZoneVisual(zone) {
    const group = new THREE.Group();
    group.position.set(zone.center.x, zone.center.y, zone.center.z);

    const tubColor = 0xc9ced2;
    const floorMat = new THREE.MeshStandardMaterial({ color: tubColor, roughness: 0.6, metalness: 0.08 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(zone.w, 0.025, zone.d), floorMat);
    floor.receiveShadow = true;
    floor.userData.zoneId = zone.id;
    group.add(floor);
    zone.floorMesh = floor;

    const wireColor = blendHex(zone.color, 0xd7dbdd, 0.55);
    const wireMat = new THREE.MeshStandardMaterial({ color: wireColor, roughness: 0.35, metalness: 0.55 });

    if (zone.id === 'basket') {
      const wallMat = new THREE.MeshStandardMaterial({
        color: zone.color, roughness: 0.5, metalness: 0.1,
        transparent: true, alphaMap: this.makePerforatedAlphaMap(), alphaTest: 0.3,
      });
      const wt = 0.025;
      const wallH = zone.wallH;
      const wallY = wallH / 2;
      const front = new THREE.Mesh(new THREE.BoxGeometry(zone.w + wt * 2, wallH, wt), wallMat);
      front.position.set(0, wallY, zone.d / 2);
      const back = front.clone(); back.position.z = -zone.d / 2;
      const left = new THREE.Mesh(new THREE.BoxGeometry(wt, wallH, zone.d + wt * 2), wallMat);
      left.position.set(-zone.w / 2, wallY, 0);
      const right = left.clone(); right.position.x = zone.w / 2;
      [front, back, left, right].forEach((m) => { m.castShadow = true; m.receiveShadow = true; group.add(m); });
    } else {
      this.buildWireFloor(group, zone, wireMat);
      this.buildWireRim(group, zone, wireMat);
    }

    this.scene.add(group);
    zone.group = group;
  },

  buildWireFloor(group, zone, wireMat) {
    const wireR = 0.007;
    const margin = 0.05;
    const rows = Math.max(6, Math.round(zone.w / 0.075));
    const dummy = new THREE.Object3D();

    const along = new THREE.InstancedMesh(new THREE.CylinderGeometry(wireR, wireR, zone.d - margin, 6), wireMat, rows);
    for (let i = 0; i < rows; i++) {
      const x = -zone.w / 2 + margin / 2 + (i * (zone.w - margin)) / (rows - 1);
      dummy.position.set(x, 0.014, 0);
      dummy.rotation.set(Math.PI / 2, 0, 0);
      dummy.updateMatrix();
      along.setMatrixAt(i, dummy.matrix);
    }
    along.castShadow = true;
    along.receiveShadow = true;
    group.add(along);

    const crossCount = 3;
    const cross = new THREE.InstancedMesh(new THREE.CylinderGeometry(wireR * 1.3, wireR * 1.3, zone.w - margin, 6), wireMat, crossCount);
    for (let j = 0; j < crossCount; j++) {
      const z = -zone.d / 2 + margin / 2 + (j * (zone.d - margin)) / (crossCount - 1);
      dummy.position.set(0, 0.02, z);
      dummy.rotation.set(0, 0, Math.PI / 2);
      dummy.updateMatrix();
      cross.setMatrixAt(j, dummy.matrix);
    }
    cross.castShadow = true;
    group.add(cross);
  },

  buildWireRim(group, zone, wireMat) {
    const barT = 0.013;
    const y = zone.wallH;
    const frontBar = new THREE.Mesh(new THREE.BoxGeometry(zone.w, barT, barT), wireMat);
    frontBar.position.set(0, y, zone.d / 2);
    const backBar = frontBar.clone(); backBar.position.z = -zone.d / 2;
    const leftBar = new THREE.Mesh(new THREE.BoxGeometry(barT, barT, zone.d), wireMat);
    leftBar.position.set(-zone.w / 2, y, 0);
    const rightBar = leftBar.clone(); rightBar.position.x = zone.w / 2;
    [frontBar, backBar, leftBar, rightBar].forEach((m) => { m.castShadow = true; group.add(m); });

    const postR = 0.009;
    const corners = [
      [-zone.w / 2, -zone.d / 2], [zone.w / 2, -zone.d / 2],
      [-zone.w / 2, zone.d / 2], [zone.w / 2, zone.d / 2],
      [0, -zone.d / 2], [0, zone.d / 2],
    ];
    corners.forEach(([px, pz]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(postR, postR, y, 6), wireMat);
      post.position.set(px, y / 2, pz);
      post.castShadow = true;
      group.add(post);
    });
  },

  makeNameplateTexture(brand) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const ctx = c.getContext('2d');
    const panelHex = '#' + brand.panelColor.toString(16).padStart(6, '0');
    const accentHex = '#' + brand.accentColor.toString(16).padStart(6, '0');
    ctx.fillStyle = panelHex;
    ctx.fillRect(0, 0, 512, 128);

    // sahte dijital gösterge
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(20, 28, 120, 72);
    ctx.fillStyle = accentHex;
    ctx.font = '700 40px monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText('88:88', 32, 66);

    // marka adı
    ctx.fillStyle = '#f5f7f8';
    ctx.font = '700 44px -apple-system, sans-serif';
    ctx.fillText(brand.name, 168, 52);
    ctx.fillStyle = 'rgba(245,247,248,0.7)';
    ctx.font = '500 22px -apple-system, sans-serif';
    ctx.fillText(brand.model, 170, 92);

    // düğmeler
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(430 + i * 26, 64, 9, 0, Math.PI * 2);
      ctx.fillStyle = accentHex;
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  },

  disposeGroup(group) {
    if (!group) return;
    group.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose();
        if (o.material.map) o.material.map.dispose();
        o.material.dispose();
      }
    });
    this.scene.remove(group);
  },

  // Marka değişince sadece dış kasa/panel yenilenir — iç raflar sabit kalır.
  setBrand(brand) {
    this.currentBrand = brand;
    this.disposeGroup(this.caseGroup);
    this.caseGroup = this.buildCase(brand);
    this.scene.add(this.caseGroup);
  },

  buildCase(brand) {
    const { wt, plinthH, caseH, panelH, halfW, halfD } = this.CASE;
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: brand.bodyColor, roughness: brand.roughness, metalness: brand.metalness });
    const trimMat = new THREE.MeshStandardMaterial({ color: brand.doorTrim, roughness: 0.4, metalness: 0.5 });

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + wt * 2, plinthH, halfD * 2 + wt * 2), bodyMat);
    plinth.position.set(0, plinthH / 2 - 0.001, 0);
    plinth.receiveShadow = true;
    group.add(plinth);

    const wallY = plinthH + caseH / 2;
    const back = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + wt * 2, caseH, wt), bodyMat);
    back.position.set(0, wallY, -halfD - wt / 2);
    const left = new THREE.Mesh(new THREE.BoxGeometry(wt, caseH, halfD * 2 + wt * 2), bodyMat);
    left.position.set(-halfW - wt / 2, wallY, 0);
    const right = left.clone();
    right.position.x = halfW + wt / 2;
    [back, left, right].forEach((m) => { m.castShadow = true; m.receiveShadow = true; group.add(m); });

    const panelY = plinthH + caseH + panelH / 2;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + wt * 2, panelH, 0.12), bodyMat);
    panel.position.set(0, panelY, halfD + wt - 0.06);
    panel.castShadow = true;
    group.add(panel);

    const nameplateTex = this.makeNameplateTexture(brand);
    const nameplate = new THREE.Mesh(
      new THREE.PlaneGeometry(halfW * 1.6, panelH * 0.86),
      new THREE.MeshBasicMaterial({ map: nameplateTex })
    );
    nameplate.position.set(0, panelY, halfD + wt - 0.06 + 0.061);
    group.add(nameplate);

    // kapı çerçevesi vurgu şeritleri (ön açıklığın kenarları)
    const trimFront1 = new THREE.Mesh(new THREE.BoxGeometry(wt * 1.4, caseH, wt * 1.4), trimMat);
    trimFront1.position.set(-halfW - wt / 2, wallY, halfD + wt / 2);
    const trimFront2 = trimFront1.clone();
    trimFront2.position.x = halfW + wt / 2;
    const trimBottom = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + wt * 2, wt, wt * 1.4), trimMat);
    trimBottom.position.set(0, plinthH + caseH, halfD + wt / 2);
    [trimFront1, trimFront2, trimBottom].forEach((m) => { m.castShadow = true; group.add(m); });

    return group;
  },

  rebuildHazards() {
    this.hazardMeshes.forEach((m) => this.scene.remove(m));
    this.hazardMeshes = [];

    ZONE3D_ORDER.forEach((id) => {
      const zone = Zones3D[id];
      const pegMat = new THREE.MeshStandardMaterial({ color: 0xe8eef2, roughness: 0.4, metalness: 0.3 });
      zone.pegs.forEach((peg) => {
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(peg.r, peg.r, zone.wallH * 0.9, 10), pegMat);
        mesh.position.set(zone.center.x + peg.x, zone.center.y + zone.wallH * 0.45, zone.center.z + peg.z);
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.hazardMeshes.push(mesh);
      });

      if (zone.sprayArm) {
        const armMat = new THREE.MeshStandardMaterial({ color: 0xff6b6b, roughness: 0.4, metalness: 0.4, transparent: true, opacity: 0.85 });
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 8), armMat);
        post.position.set(zone.center.x + zone.sprayArm.x, zone.center.y + 0.05, zone.center.z + zone.sprayArm.z);
        this.scene.add(post);
        this.hazardMeshes.push(post);
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, zone.sprayArm.r * 2, 8), armMat);
        bar.rotation.z = Math.PI / 2;
        bar.position.set(zone.center.x + zone.sprayArm.x, zone.center.y + 0.09, zone.center.z + zone.sprayArm.z);
        this.scene.add(bar);
        this.hazardMeshes.push(bar);
        const bar2 = bar.clone();
        bar2.rotation.y = Math.PI / 2;
        this.scene.add(bar2);
        this.hazardMeshes.push(bar2);
        const ring = new THREE.Mesh(new THREE.RingGeometry(zone.sprayArm.r * 0.9, zone.sprayArm.r, 32), new THREE.MeshBasicMaterial({ color: 0xff6b6b, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(zone.center.x + zone.sprayArm.x, zone.center.y + 0.005, zone.center.z + zone.sprayArm.z);
        this.scene.add(ring);
        this.hazardMeshes.push(ring);
      }
    });
  },

  resize(cssWidth, cssHeight) {
    this.cssWidth = cssWidth;
    this.cssHeight = cssHeight;
    this.renderer.setSize(cssWidth, cssHeight, true);
    this.camera.aspect = cssWidth / Math.max(1, cssHeight);
    this.camera.updateProjectionMatrix();
  },

  updateCameraFromOrbit() {
    const o = this.orbit;
    const x = o.target.x + o.radius * Math.cos(o.phi) * Math.sin(o.theta);
    const z = o.target.z + o.radius * Math.cos(o.phi) * Math.cos(o.theta);
    const y = o.target.y + o.radius * Math.sin(o.phi);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(o.target);
  },

  rotateOrbit(dTheta, dPhi) {
    const o = this.orbit;
    o.theta += dTheta;
    o.phi = Math.max(o.minPhi, Math.min(o.maxPhi, o.phi + dPhi));
    this.updateCameraFromOrbit();
  },

  zoomOrbit(dRadius) {
    const o = this.orbit;
    o.radius = Math.max(o.minRadius, Math.min(o.maxRadius, o.radius + dRadius));
    this.updateCameraFromOrbit();
  },

  // sx,sy: canvas'a göre CSS piksel koordinatları
  raycastDrop(sx, sy) {
    const ndcX = (sx / this.cssWidth) * 2 - 1;
    const ndcY = -(sy / this.cssHeight) * 2 + 1;
    this.raycaster.setFromCamera({ x: ndcX, y: ndcY }, this.camera);
    const floors = ZONE3D_ORDER.map((id) => Zones3D[id].floorMesh);
    const hits = this.raycaster.intersectObjects(floors, false);
    if (!hits.length) return null;
    const hit = hits[0];
    const zone = findZone3DByFloorMesh(hit.object);
    return { zone, point: hit.point };
  },

  worldToScreen(vec3) {
    const p = vec3.clone().project(this.camera);
    return {
      x: (p.x * 0.5 + 0.5) * this.cssWidth,
      y: (-p.y * 0.5 + 0.5) * this.cssHeight,
    };
  },

  render() {
    this.renderer.render(this.scene, this.camera);
  },
};
