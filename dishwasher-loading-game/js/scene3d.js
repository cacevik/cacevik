// Three.js sahne kurulumu: kamera (dokunarak döndürülebilir "orbit"),
// ışıklandırma, raf/sepet 3D görselleri, raycast ile bırakma hedefi tespiti.

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

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d2b3a);
    this.scene.fog = new THREE.Fog(0x0d2b3a, 3.5, 6.5);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 20);
    this.orbit.target = new THREE.Vector3(0, 0.42, 0.02);
    this.updateCameraFromOrbit();

    this.raycaster = new THREE.Raycaster();

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);
    const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x1a2530, 0.5);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
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

    this.buildGround();
    ZONE3D_ORDER.forEach((id) => this.buildZoneVisual(Zones3D[id]));
    this.setBrand(BRANDS.solvex);
  },

  buildGround() {
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(3.2, 48),
      new THREE.MeshStandardMaterial({ color: 0x0a2230, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    this.scene.add(ground);
  },

  makeGridTexture(hex) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 128; i += 16) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  },

  buildZoneVisual(zone) {
    const group = new THREE.Group();
    group.position.set(zone.center.x, zone.center.y, zone.center.z);

    const floorColorHex = '#' + zone.color.toString(16).padStart(6, '0');
    const floorMat = new THREE.MeshStandardMaterial({
      color: zone.color, roughness: 0.85, metalness: 0.05,
      map: this.makeGridTexture(floorColorHex),
    });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(zone.w, 0.03, zone.d), floorMat);
    floor.receiveShadow = true;
    floor.userData.zoneId = zone.id;
    group.add(floor);
    zone.floorMesh = floor;

    const wallMat = new THREE.MeshStandardMaterial({ color: zone.color, roughness: 0.7, metalness: 0.1 });
    const wt = 0.03;
    const wallH = zone.wallH;
    const wallY = wallH / 2;
    const front = new THREE.Mesh(new THREE.BoxGeometry(zone.w + wt * 2, wallH, wt), wallMat);
    front.position.set(0, wallY, zone.d / 2);
    const back = front.clone(); back.position.z = -zone.d / 2;
    const left = new THREE.Mesh(new THREE.BoxGeometry(wt, wallH, zone.d + wt * 2), wallMat);
    left.position.set(-zone.w / 2, wallY, 0);
    const right = left.clone(); right.position.x = zone.w / 2;
    [front, back, left, right].forEach((m) => { m.castShadow = true; m.receiveShadow = true; group.add(m); });

    this.scene.add(group);
    zone.group = group;

    // yerel -> dünya dönüştürücüler zaten Zone3D üzerinde tanımlı (center offset).
    zone.floorMesh.userData.worldOffset = zone.center;
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
