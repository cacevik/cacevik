// Menü, tepsi (tray) ve sonuç ekranı için DOM/HTML yardımcı fonksiyonları.

const PROGRESS_KEY = 'dishwasher_progress_v1';

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveProgress(levelId, stars) {
  try {
    const p = loadProgress();
    if (!p[levelId] || p[levelId] < stars) p[levelId] = stars;
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch (e) { /* localStorage yoksa sessizce geç */ }
}

function starString(n) {
  return '★★★☆☆☆'.slice(3 - n, 6 - n);
}

function renderLevelSelect(container, onSelect) {
  const progress = loadProgress();
  container.innerHTML = '';
  LEVELS.forEach((level) => {
    const attemptedPrev = level.id === 1 || progress[level.id - 1] !== undefined;
    const btn = document.createElement('button');
    btn.className = 'level-btn';
    btn.dataset.locked = (!attemptedPrev).toString();
    const stars = progress[level.id];
    const brand = getBrandForLevel(level.id);
    btn.innerHTML = `${level.id}<span class="lvl-stars">${stars !== undefined ? starString(stars) : '—'}</span>` +
      `<span class="lvl-brand">${brand.name}</span>`;
    if (attemptedPrev) {
      btn.addEventListener('click', () => onSelect(level.id));
    }
    container.appendChild(btn);
  });
}

const ITEM_EMOJI = {
  plate: '🍽️', bigplate: '🥘', pot: '🍲', pan: '🍳',
  bowl: '🥣', cup: '☕', glass: '🥤',
  fork: '🍴', spoon: '🥄', knife: '🔪',
};

function trayIconHtml(itemType) {
  return `<span style="font-size:30px;line-height:1">${ITEM_EMOJI[itemType] || '🍽️'}</span>`;
}

function renderTray(container, trayItems, onDragStart) {
  container.innerHTML = '';
  trayItems.forEach((entry) => {
    const el = document.createElement('div');
    el.className = 'tray-item';
    el.dataset.uid = entry.uid;
    el.innerHTML = trayIconHtml(entry.typeId);
    const tag = document.createElement('span');
    tag.className = 'cat-tag';
    const catLabel = { bottom: 'Alt', top: 'Üst', basket: 'Sepet' }[ITEM_TYPES[entry.typeId].category];
    tag.textContent = catLabel;
    el.appendChild(tag);
    el.addEventListener('pointerdown', (ev) => onDragStart(ev, entry, el));
    container.appendChild(el);
  });
}

function updateHud(state) {
  const level = state.level;
  document.getElementById('hud-level').textContent = level.name.split('—')[0].trim();
  if (state.brand) document.getElementById('hud-brand').textContent = `${state.brand.name} ${state.brand.model}`;
  document.getElementById('hud-score').textContent = `Puan: ${Math.round(state.liveScore)}`;
  const pct = Math.max(0, state.timeLeft / level.time);
  document.getElementById('timer-bar').style.transform = `scaleX(${pct})`;
  document.getElementById('hud-time').textContent = Math.ceil(Math.max(0, state.timeLeft));
}

function showResult(levelId, breakdown, finalPct, stars, isLast) {
  document.getElementById('result-title').textContent =
    finalPct >= 35 ? 'Bölüm Tamamlandı!' : 'Biraz Dağınık Oldu...';
  document.getElementById('result-stars').textContent = starString(stars);
  const list = breakdown.map((b) => {
    const mark = b.score >= 70 ? '✅' : b.score >= 35 ? '⚠️' : '❌';
    return `${mark} <b>${ITEM_TYPES[b.typeId].name}</b> — ${b.detail} (${b.score} puan)`;
  }).join('<br>');
  document.getElementById('result-breakdown').innerHTML = list;
  document.getElementById('result-score').textContent = `Toplam Puan: ${Math.round(finalPct)} / 100`;
  document.getElementById('btn-next-level').style.display = isLast ? 'none' : 'block';
  saveProgress(levelId, stars);
}

// Ana ekranlar (menü / oyun) birbirini dışlar.
function showMainScreen(id) {
  document.getElementById('screen-menu').classList.remove('active');
  document.getElementById('screen-game').classList.remove('active');
  document.getElementById(id).classList.add('active');
}

// Duraklatma / sonuç gibi overlay ekranlar, oyun ekranının üzerine biner.
function toggleOverlay(id, show) {
  document.getElementById(id).classList.toggle('active', show);
}
