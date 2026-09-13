// Uygulama girişi: canvas boyutlandırma, buton bağlama, oyun döngüsü.

(function () {
  const canvas = document.getElementById('game-canvas');
  Game.init(canvas);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    Game.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    Game.layout(rect.width, rect.height);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 150));
  if (window.ResizeObserver) {
    new ResizeObserver(resize).observe(canvas);
  }
  resize();

  document.getElementById('btn-pause').addEventListener('click', () => Game.togglePause());
  document.getElementById('btn-resume').addEventListener('click', () => Game.togglePause());
  document.getElementById('btn-restart-from-pause').addEventListener('click', () => Game.restartCurrentLevel());
  document.getElementById('btn-quit-to-menu').addEventListener('click', () => Game.quitToMenu());
  document.getElementById('btn-next-level').addEventListener('click', () => {
    const next = getLevel(Game.level.id + 1);
    if (next) Game.startLevel(next.id); else Game.quitToMenu();
  });
  document.getElementById('btn-retry-level').addEventListener('click', () => Game.restartCurrentLevel());
  document.getElementById('btn-result-to-menu').addEventListener('click', () => Game.quitToMenu());

  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    if (Game.state === 'playing') Game.update(dt);
    Game.render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
