// Hafif, elle yazılmış 3D "fizik": yerçekimi + zemin/duvar/pim çarpışması +
// gövdeler arası basit ayrıştırma (position-based). Ağır bir fizik motoru
// kütüphanesi eklemek yerine, bu oyunun ihtiyacı olan "düşüp yerleşme" hissini
// veren minimal bir simülasyon.

const Physics3D = {
  bodies: [], // { mesh, position, velocity, angVel, zoneId, approxRadius, typeId, settled, settleTimer, scored }
  gravity: -3.2,

  reset() {
    this.bodies = [];
  },

  addBody(entry) {
    this.bodies.push(entry);
  },

  step(dt, onSettle) {
    dt = Math.min(dt, 1 / 30);
    const list = this.bodies;

    for (const b of list) {
      if (b.scored) continue;
      b.velocity.y += this.gravity * dt;
      b.position.addScaledVector(b.velocity, dt);

      const zone = Zones3D[b.zoneId];
      const floorY = zone.center.y;
      const r = b.approxRadius;

      // Zemin çarpışması
      if (b.position.y - r * 0.55 < floorY) {
        b.position.y = floorY + r * 0.55;
        if (b.velocity.y < 0) b.velocity.y *= -0.12;
        b.velocity.x *= 0.82;
        b.velocity.z *= 0.82;
      }

      // Kenar duvarları (yerel sınırlar)
      const local = zone.worldToLocalXZ(b.position.x, b.position.z);
      const clamped = zone.clampLocalXZ(local.x, local.z, r * 0.85);
      if (clamped.x !== local.x) { b.velocity.x *= -0.2; }
      if (clamped.z !== local.z) { b.velocity.z *= -0.2; }
      const worldClamped = zone.localToWorldXZ(clamped.x, clamped.z);
      b.position.x = worldClamped.x;
      b.position.z = worldClamped.z;

      // Pim engelleri — sadece içe doğru hızı söndür, her karede enerji EKLEME
      // (aksi halde bir pime yaslanan bulaşık sonsuza dek titreyip hiç yerleşemez).
      for (const peg of zone.pegs) {
        const dx = local.x - peg.x;
        const dz = local.z - peg.z;
        const dist = Math.hypot(dx, dz);
        const combined = r + peg.r;
        if (dist < combined && dist > 1e-4) {
          const push = (combined - dist);
          const nx = dx / dist, nz = dz / dist;
          const wp = zone.localToWorldXZ(local.x + nx * push, local.z + nz * push);
          b.position.x = wp.x;
          b.position.z = wp.z;
          const vn = b.velocity.x * nx + b.velocity.z * nz;
          if (vn < 0) {
            b.velocity.x -= vn * nx * 1.3;
            b.velocity.z -= vn * nz * 1.3;
          }
        }
      }

      // Açısal sönümleme (yavaşça dönüşü durdur)
      b.angVel.multiplyScalar(0.9);
      b.mesh.rotation.x += b.angVel.x * dt;
      b.mesh.rotation.y += b.angVel.y * dt;
      b.mesh.rotation.z += b.angVel.z * dt;

      b.age = (b.age || 0) + dt;
    }

    // Gövdeler arası basit ayrıştırma (aynı bölgedekiler)
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.scored) continue;
      for (let j = i + 1; j < list.length; j++) {
        const c = list[j];
        if (c.scored || c.zoneId !== a.zoneId) continue;
        const dx = c.position.x - a.position.x;
        const dz = c.position.z - a.position.z;
        const dy = c.position.y - a.position.y;
        const dist = Math.hypot(dx, dy, dz);
        const combined = (a.approxRadius + c.approxRadius) * 0.92;
        if (dist < combined && dist > 1e-4) {
          const push = (combined - dist) * 0.5;
          const nx = dx / dist, ny = dy / dist, nz = dz / dist;
          a.position.x -= nx * push; a.position.y -= ny * push; a.position.z -= nz * push;
          c.position.x += nx * push; c.position.y += ny * push; c.position.z += nz * push;
        }
      }
    }

    for (const b of list) {
      if (b.scored) continue;
      b.mesh.position.copy(b.position);
      const speed = b.velocity.length() + b.angVel.length() * 0.3;
      // Nadir de olsa bir cisim (ör. bir pime yaslanmış halde) hiç durmuyormuş
      // gibi asılı kalırsa, oyunun sonsuza dek beklememesi için belirli bir
      // süre sonra zorla yerleşmiş say.
      if (speed < 0.06 || b.age > 3) {
        b.settleTimer += dt;
        if (b.settleTimer > 0.4 || b.age > 3) onSettle(b);
      } else {
        b.settleTimer = 0;
      }
    }
  },
};
