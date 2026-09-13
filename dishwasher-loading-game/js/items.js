// Bulaşık türleri: fiziksel gövde tanımı + izometrik/karikatür stil çizim.
// category: 'bottom' (alt raf), 'top' (üst raf), 'basket' (çatal-kaşık sepeti)

const ITEM_TYPES = {
  plate: {
    id: 'plate', name: 'Tabak', category: 'bottom',
    shape: 'circle', radius: 34, color: '#f4f6f8',
    draw: drawPlate,
  },
  bigplate: {
    id: 'bigplate', name: 'Servis Tabağı', category: 'bottom',
    shape: 'circle', radius: 42, color: '#eef2f5',
    draw: drawPlate,
  },
  pot: {
    id: 'pot', name: 'Tencere', category: 'bottom',
    shape: 'circle', radius: 40, color: '#c7cdd2',
    draw: drawPot,
  },
  pan: {
    id: 'pan', name: 'Tava', category: 'bottom',
    shape: 'circle', radius: 38, color: '#5b5f66',
    draw: drawPan,
  },
  bowl: {
    id: 'bowl', name: 'Kase', category: 'top',
    shape: 'circle', radius: 26, color: '#ffd97d',
    draw: drawBowl,
  },
  cup: {
    id: 'cup', name: 'Fincan', category: 'top',
    shape: 'circle', radius: 18, color: '#ff8fa3',
    draw: drawCup,
  },
  glass: {
    id: 'glass', name: 'Bardak', category: 'top',
    shape: 'circle', radius: 16, color: '#9fe8ff',
    draw: drawGlass,
  },
  fork: {
    id: 'fork', name: 'Çatal', category: 'basket',
    shape: 'capsule', width: 10, height: 46, color: '#d8dde2',
    draw: (ctx, x, y, s, rot) => drawCutlery(ctx, x, y, s, rot, 'fork'),
  },
  spoon: {
    id: 'spoon', name: 'Kaşık', category: 'basket',
    shape: 'capsule', width: 11, height: 44, color: '#e3e7ea',
    draw: (ctx, x, y, s, rot) => drawCutlery(ctx, x, y, s, rot, 'spoon'),
  },
  knife: {
    id: 'knife', name: 'Bıçak', category: 'basket',
    shape: 'capsule', width: 9, height: 48, color: '#c9ced3',
    draw: (ctx, x, y, s, rot) => drawCutlery(ctx, x, y, s, rot, 'knife'),
  },
};

function drawPlate(ctx, x, y, s, rot, color) {
  color = color || '#f4f6f8';
  const r = 34 * s;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot || 0);
  const grad = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.1, 0, 0, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, Iso.shade(color, -22));
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.86, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,30,35,0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.7, r * 0.6, 0, 0, Math.PI * 2);
  ctx.strokeStyle = Iso.shade(color, -40);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

function drawBowl(ctx, x, y, s, rot) {
  const r = 26 * s;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot || 0);
  const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
  grad.addColorStop(0, '#fff2cf');
  grad.addColorStop(1, '#e0a63f');
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.9, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,30,35,0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.05, r * 0.6, r * 0.48, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(90,55,10,0.35)';
  ctx.fill();
  ctx.restore();
}

function drawCup(ctx, x, y, s, rot) {
  const r = 18 * s;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot || 0);
  const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
  grad.addColorStop(0, '#ffd4dd');
  grad.addColorStop(1, '#e05577');
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.94, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,30,35,0.55)';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // sap (kulp)
  ctx.beginPath();
  ctx.ellipse(r * 0.95, 0, r * 0.32, r * 0.5, 0, -0.9, 0.9);
  ctx.strokeStyle = '#a5304f';
  ctx.lineWidth = r * 0.28;
  ctx.stroke();
  ctx.restore();
}

function drawGlass(ctx, x, y, s, rot) {
  const r = 16 * s;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot || 0);
  const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.05, 0, 0, r);
  grad.addColorStop(0, '#e7fbff');
  grad.addColorStop(1, '#4fc4e0');
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.95, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.9;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(15,60,75,0.65)';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();
}

function drawPot(ctx, x, y, s, rot) {
  const r = 40 * s;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot || 0);
  // saplar
  ctx.fillStyle = '#7d8790';
  ctx.fillRect(-r * 1.28, -r * 0.14, r * 0.34, r * 0.28);
  ctx.fillRect(r * 0.94, -r * 0.14, r * 0.34, r * 0.28);
  const grad = ctx.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.1, 0, 0, r);
  grad.addColorStop(0, '#e7eaed');
  grad.addColorStop(1, '#8b939a');
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.88, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(15,20,25,0.6)';
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.68, r * 0.58, 0, 0, Math.PI * 2);
  ctx.strokeStyle = '#aab1b7';
  ctx.stroke();
  ctx.restore();
}

function drawPan(ctx, x, y, s, rot) {
  const r = 38 * s;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot || 0);
  // uzun sap
  ctx.fillStyle = '#2b2d31';
  ctx.fillRect(r * 0.7, -r * 0.09, r * 1.1, r * 0.18);
  const grad = ctx.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.1, 0, 0, r);
  grad.addColorStop(0, '#82868c');
  grad.addColorStop(1, '#2f3236');
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.88, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#151618';
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.66, r * 0.56, 0, 0, Math.PI * 2);
  ctx.strokeStyle = '#54585d';
  ctx.stroke();
  ctx.restore();
}

function drawCutlery(ctx, x, y, s, rot, kind) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot || 0);
  const len = (kind === 'knife' ? 48 : kind === 'spoon' ? 44 : 46) * s;
  const w = (kind === 'knife' ? 9 : kind === 'spoon' ? 11 : 10) * s;
  ctx.fillStyle = '#d3d8dc';
  ctx.strokeStyle = 'rgba(20,25,30,0.6)';
  ctx.lineWidth = 1.4;

  ctx.beginPath();
  ctx.roundRect(-w / 2, -len / 2, w, len * 0.62, w / 2);
  ctx.fill();
  ctx.stroke();

  if (kind === 'fork') {
    for (let i = -1; i <= 1; i++) {
      ctx.fillRect(i * (w / 3.2) - w / 14, -len / 2 - len * 0.28, w / 7, len * 0.3);
    }
  } else if (kind === 'spoon') {
    ctx.beginPath();
    ctx.ellipse(0, -len / 2 - len * 0.12, w * 0.85, len * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (kind === 'knife') {
    ctx.beginPath();
    ctx.moveTo(-w * 0.4, -len / 2);
    ctx.lineTo(w * 0.4, -len / 2);
    ctx.lineTo(w * 0.15, -len / 2 - len * 0.36);
    ctx.lineTo(-w * 0.15, -len / 2 - len * 0.36);
    ctx.closePath();
    ctx.fillStyle = '#b9c0c5';
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
