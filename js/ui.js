/* =========================================================
 * UI HTML: HUD, hotbar, panel tower, tooltip, toast, banner
 * ========================================================= */
'use strict';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const UI = {
  /** Bangun ulang semua elemen HUD (dipanggil saat ada perubahan besar) */
  refreshAll() {
    if (!S) return;
    this.updateHud();
    this.renderBar();
    this.renderPreview();
    this.renderAbilities();
    if (S.selected) this.showPanel(S.selected); else this.hidePanel();
  },

  updateHud() {
    $('hudCash').textContent = '$' + Math.floor(S.cash).toLocaleString('id-ID');
    const endless = S.maxWave === Infinity;
    $('hudWave').textContent = endless ? `${S.wave} ∞` : `${S.wave}/${S.maxWave}`;
    $('hudWaveBar').style.width = endless ? '100%' : (S.wave / S.maxWave * 100) + '%';
    const hpPct = Math.max(0, S.hp / S.maxHp * 100);
    $('hudHp').textContent = Math.max(0, Math.ceil(S.hp));
    $('hudHpBar').style.width = hpPct + '%';
    $('hudHpBar').style.background = hpPct > 50 ? '#66bb6a' : hpPct > 25 ? '#ffca28' : '#ef5350';
    $('hudEnemies').textContent = S.enemies.length + S.spawnQ.length;
    const sb = $('startBtn');
    sb.disabled = S.state !== 'ready';
    sb.textContent = S.state === 'wave' ? '⚔️ Wave berjalan' : '▶ Mulai Wave';
    const sk = $('skipWaveBtn'), can = canSkip();
    sk.style.display = can ? '' : 'none';
    if (can) { sk.textContent = `⏭ Skip +$${skipBonusAmt()}`; tip('skip'); }
    $('skipBtn').textContent = 'Auto: ' + (S.autoSkip ? 'ON' : 'OFF');
    $('skipBtn').classList.toggle('on', S.autoSkip);
    $('speedBtn').textContent = '⏩ ' + S.speed + 'x';
  },

  /** Hotbar berdasarkan loadout pemain */
  renderBar() {
    const lo = PROFILE.loadout;
    $('bar').innerHTML = lo.map((k, i) => {
      const d = TOWERS[k], c = costOf(k, 0), u = unitOf(k), tr = u.trait && TRAITS[u.trait];
      return `<div class="slot ${S.placing === k ? 'sel' : ''} ${u.evo ? 'evo' : ''}" data-k="${k}" data-i="${i}" ${tr ? `style="--rc:${RARITY[tr.rarity].color}"` : ''}>
        <span class="key">${i + 1}</span>${tr ? `<span class="tr" title="${tr.name}">${tr.icon}</span>` : ''}
        <div class="ico" style="background:${towerColor(k)}">${u.evo ? '★' : ''}</div>
        <div class="nm">${towerName(k)}</div><div class="pr">$${c}</div>
        <div class="cnt" data-cnt="${k}">${countType(k)}/${d.limit}</div></div>`;
    }).join('');
    $('bar').querySelectorAll('.slot').forEach(el => {
      el.onclick = () => this.selectPlace(el.dataset.k);
      el.onmouseenter = () => this.tooltip(el, el.dataset.k);
      el.onmouseleave = () => this.tooltip(null);
    });
    this.updateBar();
  },
  updateBar() {
    $('bar').querySelectorAll('.slot').forEach(el => {
      const k = el.dataset.k, d = TOWERS[k];
      const banned = S.M.ban.includes(k);
      el.classList.toggle('poor', banned || S.cash < costOf(k, 0) || countType(k) >= d.limit);
      el.classList.toggle('banned', banned);
    });
  },
  selectPlace(k) {
    if (!k || !S || Menu.open) return;
    sfx('click');
    S.placing = S.placing === k ? null : k; S.selected = null; S.targeting = null;
    this.hidePanel(); this.renderBar(); this.renderAbilities();
  },

  tooltip(el, k) {
    const tt = $('tooltip');
    if (!el) { tt.style.display = 'none'; return; }
    const d = TOWERS[k], L = computeL(k, 0), u = unitOf(k), tr = u.trait && TRAITS[u.trait];
    let stats = '';
    if (L.dmg) stats += `Damage ${L.dmg} • Range ${L.range} • ${L.rate}s`;
    if (L.income) stats += `Pendapatan $${L.income}/wave`;
    if (L.buff) stats += `Buff +${L.buff * 100}% kecepatan • Range ${L.range}`;
    tt.innerHTML = `<b>${towerName(k)}</b> <span class="tag">${d.role}</span> <span class="tag mlv">Mastery ${unitLevel(u.xp)}</span><br>${u.evo ? '★ ' + EVOS[k].desc : d.desc}<br><small>${stats}</small>` +
      (tr ? `<br><small style="color:${RARITY[tr.rarity].color}">${tr.icon} ${tr.name}: ${tr.desc}</small>` : '');
    const r = el.getBoundingClientRect(), wr = $('wrap').getBoundingClientRect();
    tt.style.display = 'block';
    tt.style.left = Math.max(0, Math.min(wr.width - 260, r.left - wr.left + r.width / 2 - 130)) + 'px';
    tt.style.top = (r.top - wr.top - tt.offsetHeight - 8) + 'px';
  },

  /** Pratinjau komposisi wave berikutnya */
  renderPreview() {
    const el = $('preview');
    const mods = S.mods.map(m => `<span class="chip mod" title="${MODIFIERS[m].desc}">${MODIFIERS[m].icon} ${MODIFIERS[m].name}</span>`).join('');
    if (S.state !== 'ready' || S.wave >= S.maxWave) { el.innerHTML = mods; el.dataset.ready = ''; return; }
    el.dataset.ready = '1';
    const n = S.wave + 1, counts = wavePreview(n);
    el.innerHTML = mods + `<span class="plabel">Wave ${n}${n % 10 === 0 ? ' 👑' : ''}:</span>` +
      Object.entries(counts).map(([k, c]) => `<span class="chip" title="${ENEMIES[k].name}"><i style="background:${ENEMIES[k].color}"></i>${ENEMIES[k].name} ×${c}</span>`).join('');
  },

  /** Panel tower terpilih */
  showPanel(t) {
    const def = TOWERS[t.type], L = lvl(t), hasNext = t.level < def.levels.length - 1;
    const next = hasNext ? Object.assign(computeL(t.type, t.level + 1), { cost: costOf(t.type, t.level + 1) }) : undefined;
    const tr = t.trait && TRAITS[t.trait];
    const st = (lab, a, b) => `<div class="row"><span>${lab}</span><span>${a}${b !== undefined && b !== a ? ` → <b class="up">${b}</b>` : ''}</span></div>`;
    const yn = v => v ? '✅' : '❌';
    let h = `<div class="ph"><div class="pico" style="background:${towerColor(t.type)}">${t.evo ? '★' : ''}</div><div><h3>${towerName(t.type)}</h3>
      <small>Lv ${t.level} • ${esc(L.name)} • M${unitLevel(unitOf(t.type).xp)}</small></div><button class="x" id="pClose">✕</button></div>`;
    if (tr || t.evo) h += `<div class="ptags">${tr ? `<span class="tag" style="background:${RARITY[tr.rarity].color}" title="${tr.desc}">${tr.icon} ${tr.name}</span>` : ''}${t.evo ? `<span class="tag gold" title="${EVOS[t.type].desc}">★ Evolusi</span>` : ''}</div>`;
    h += `<div class="lvbar">${def.levels.map((_, i) => `<i class="${i <= t.level ? 'on' : ''}"></i>`).join('')}</div>`;
    if (t.type === 'farm') h += st('Pendapatan/wave', '$' + L.income, next && '$' + next.income);
    else if (t.type === 'commander') {
      h += st('Buff kecepatan', '+' + L.buff * 100 + '%', next && '+' + next.buff * 100 + '%') + st('Range', L.range, next && next.range);
      h += st('Beri deteksi hidden', yn(L.grantHidden), next && yn(next.grantHidden));
    } else {
      h += st('Damage', L.dmg, next && next.dmg) + st('Range', L.range, next && next.range) + st('Cooldown', L.rate + 's', next && next.rate + 's');
      if (L.splash) h += st('Splash', L.splash, next && next.splash);
      if (L.slow) h += st('Slow', Math.round(L.slow * 100) + '%', next && Math.round(next.slow * 100) + '%');
      if (L.bossMul) h += st('Bonus boss', '×' + L.bossMul, next && '×' + next.bossMul);
      h += st('Deteksi hidden', yn(L.hidden) + (t.gh && !L.hidden ? ' (buff)' : ''), next && yn(next.hidden));
      h += st('Tembus armor', yn(L.pierceArmor), next && yn(next.pierceArmor));
      h += `<div class="row dim"><span>Total damage</span><span id="pDmg">${fmtNum(t.dmg)}</span></div>`;
      h += `<div class="row dim"><span>Kills</span><span id="pKills">${t.kills}</span></div>`;
      h += `<button class="btn blue" id="tgtBtn">🎯 Target: ${TARGET_LABEL[t.target]}</button>`;
    }
    h += next ? `<button class="btn" id="upBtn">⬆ ${esc(next.name)} — $${next.cost.toLocaleString('id-ID')} <kbd>Q</kbd></button>`
              : `<button class="btn" disabled>★ LEVEL MAKS</button>`;
    h += `<button class="btn red" id="sellBtn">Jual $${Math.floor(t.spent * SELL_RATE).toLocaleString('id-ID')} <kbd>X</kbd></button>`;
    const p = $('panel'); p.innerHTML = h; p.style.display = 'block';
    const left = t.x > W / 2;            // panel di sisi berlawanan dari tower
    p.classList.toggle('left', left);
    p.classList.toggle('bottom', !left && exitRow() < ROWS / 2); // hindari menutupi base
    if ($('upBtn')) $('upBtn').onclick = () => upgradeTower(t);
    $('sellBtn').onclick = () => sellTower(t);
    $('pClose').onclick = () => { S.selected = null; this.hidePanel(); };
    if ($('tgtBtn')) $('tgtBtn').onclick = () => { t.target = TARGET_MODES[(TARGET_MODES.indexOf(t.target) + 1) % TARGET_MODES.length]; sfx('click'); this.showPanel(t); };
    this.updatePanel();
  },
  updatePanel() {
    const t = S.selected; if (!t) return;
    if ($('upBtn') && !isMax(t)) $('upBtn').disabled = S.cash < costOf(t.type, t.level + 1);
    if ($('pDmg')) $('pDmg').textContent = fmtNum(t.dmg);
    if ($('pKills')) $('pKills').textContent = t.kills;
  },
  hidePanel() { $('panel').style.display = 'none'; },

  /** Banner besar di tengah layar */
  banner(txt, col = '#fff', ms = 1600) {
    const m = $('banner'); m.textContent = txt; m.style.color = col;
    m.classList.remove('show'); void m.offsetWidth; m.classList.add('show');
    clearTimeout(this._bt); this._bt = setTimeout(() => m.classList.remove('show'), ms);
  },
  /** Notifikasi kecil di pojok */
  toast(txt, type = '', ms = 2800) {
    const el = document.createElement('div');
    el.className = 'toast ' + type; el.textContent = txt;
    $('toasts').appendChild(el);
    while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
    setTimeout(() => el.classList.add('out'), ms);
    setTimeout(() => el.remove(), ms + 500);
  },

  /** Tombol skill pemain */
  renderAbilities() {
    const lv = playerLevel();
    $('abilities').innerHTML = ABILITIES.map(a => {
      const locked = lv < a.level;
      return `<button class="abil ${locked ? 'locked' : ''} ${S.targeting === a.id ? 'sel' : ''}" data-ab="${a.id}" style="--c:${a.color}"
        title="${a.name} (${a.key.toUpperCase()}) — ${locked ? 'Terbuka di level ' + a.level : a.desc}">
        <span class="ai">${locked ? '🔒' : a.icon}</span><span class="ak">${a.key.toUpperCase()}</span><span class="acd"></span></button>`;
    }).join('');
    $('abilities').querySelectorAll('.abil').forEach(b => b.onclick = () => useAbility(b.dataset.ab));
    this.updateAbilities();
  },
  updateAbilities() {
    $('abilities').querySelectorAll('.abil').forEach(b => {
      const a = ABILITIES.find(x => x.id === b.dataset.ab), cd = S.abilityCd[a.id] || 0;
      b.querySelector('.acd').textContent = cd > 0 ? Math.ceil(cd) : '';
      b.style.setProperty('--p', cd > 0 ? (cd / a.cd * 100) + '%' : '0%');
      b.classList.toggle('cooling', cd > 0);
    });
  },

  /** Update ringan tiap ~150 ms */
  tick() {
    if (!S) return;
    this.updateHud(); this.updateBar(); this.updatePanel();
    const pv = $('preview');
    if ((S.state === 'ready') !== (pv.dataset.ready === '1')) this.renderPreview();
    this.updateAbilities();
  },
};
