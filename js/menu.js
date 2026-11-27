/* =========================================================
 * Sistem menu: utama, pilih map, tower (toko & loadout),
 * pencapaian, statistik, pengaturan, cara main, pause, hasil
 * ========================================================= */
'use strict';

/** Jumlah hadiah misi / season pass yang siap diambil (untuk badge) */
function missionsReady() {
  const v = PROFILE.vault, now = Date.now(), m = SHARED.rollMissions(v, now); let n = 0;
  for (const kind of ['daily', 'weekly']) for (const d of SHARED.MISSIONS[kind])
    if (!(kind === 'daily' ? m.dc : m.wc).includes(d.id) && SHARED.missionProgress(v, now, kind, d) >= d.target) n++;
  return n;
}
function seasonReady() {
  const v = PROFILE.vault, now = Date.now(), m = SHARED.rollMissions(v, now);
  return SHARED.MISSIONS.season.filter(d => !m.sc.includes(d.id) && SHARED.missionProgress(v, now, 'season', d) >= d.target).length;
}
function passReady() {
  const ps = SHARED.rollPass(PROFILE.vault, Date.now()), lv = SHARED.passTier(ps); let n = 0;
  for (let t = 1; t <= lv; t++) { if (!ps.f.includes(t)) n++; if (ps.premium && !ps.p.includes(t)) n++; }
  return n + seasonReady();
}

/** XP akun untuk hadiah level (dicatat server; sebelum pertama kali dicatat pakai XP profil, maks level 30) */
function accXpNow() { const v = PROFILE.vault; return v.axpSeed ? (v.axp || 0) : Math.max(v.axp || 0, Math.min(PROFILE.xp || 0, SHARED.accXpFor(29))); }
function levelReady() { const lv = SHARED.accLevel(accXpNow()), c = PROFILE.vault.lvc || []; let n = 0; for (let L = 2; L <= lv; L++) if (!c.includes(L)) n++; return n; }
function eventReady() {
  const e = PROFILE.vault.ev, now = Date.now(); if (!SHARED.limitedActive(now) || !e || e.id !== SHARED.LIMITED.id) return 0;
  return SHARED.EV_MISSIONS.filter(d => !e.mc.includes(d.id) && (e.s[d.stat] || 0) >= d.target).length + SHARED.EV_MILESTONES.filter((m, i) => e.earned >= m.at && !e.ms.includes(i)).length;
}
const RW_ICON = { coins: 'coin', diamonds: 'dia', gems: 'gem', crystals: 'cry', stones: 'orb', pxp: 'ticket', tok: 'tok', lan: 'snow' };

const Menu = {
  open: false, screen: null, back: 'main', endData: null, resetArm: false, shopSel: 'scout',

  show(scr, quiet) {
    this.open = true; this.screen = scr;
    const o = $('overlay');
    o.style.display = 'flex';
    const ingame = scr === 'pause' || scr === 'end' || (scr === 'settings' && this.back === 'pause');
    this.scene(!ingame);
    o.classList.toggle('home-bg', scr === 'main');
    o.classList.toggle('scene-bg', !ingame && scr !== 'main');
    document.body.classList.toggle('on-home', scr === 'main');
    o.innerHTML = `<div class="screen screen-${scr} ${quiet ? 'noanim' : ''}">${this.screens[scr].call(this)}</div>`;
    // App shell: header & tab tetap di atas, isi bergulir di dalam layar (rapi di HP)
    const sc = o.firstElementChild;
    if (scr !== 'main' && scr !== 'pause' && scr !== 'end') {
      const kids = [...sc.children], body = document.createElement('div'); body.className = 'scr-body';
      let i = 0; while (i < kids.length && kids[i].matches('.mhead, .tabs')) i++;
      kids.slice(i).filter(k => !k.matches('.room-bar')).forEach(k => body.appendChild(k));
      const foot = sc.querySelector(':scope > .room-bar');
      sc.insertBefore(body, foot || null); sc.classList.add('shell');
      if (quiet && this._scrollKeep && this._scrollKeep[0] === scr) body.scrollTop = this._scrollKeep[1];
      body.addEventListener('scroll', () => { this._scrollKeep = [scr, body.scrollTop]; }, { passive: true });
    }
    if (this.after[scr]) this.after[scr].call(this);
    UI.tooltip(null);
  },
  go(scr) { sfx('click'); this.show(scr); },
  /** Hitung mundur [data-cd] (ms epoch) — diperbarui tiap detik */
  tickCd() {
    const els = document.querySelectorAll('[data-cd]'); if (!els.length) return;
    const now = Date.now();
    els.forEach(el => { const s = Math.max(0, Math.floor((+el.dataset.cd - now) / 1000)); el.textContent = s >= 172800 ? `${Math.floor(s / 86400)} hari ${Math.floor(s % 86400 / 3600)} jam` : `${Math.floor(s / 3600)}j ${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}m ${String(s % 60).padStart(2, '0')}d`; });
  },
  close() { this.open = false; this.screen = null; $('overlay').style.display = 'none'; this.scene(false); },
  /** Latar pemandangan menu (dibuat sekali, berganti sesuai jam WIB) */
  scene(on) {
    const el = $('menuScene'); if (!el) return;
    if (!on) { el.style.display = 'none'; if (window.LobbyScene) LobbyScene.stop(); return; }
    el.style.display = 'block'; LobbyScene.mount(el);
  },

  /* ---------- helper tampilan ---------- */
  profileBar() {
    const lv = levelFromXp(PROFILE.xp), lo = lv > 1 ? xpForLevel(lv - 1) : 0, hi = xpForLevel(lv);
    const pct = Math.min(100, (PROFILE.xp - lo) / (hi - lo) * 100);
    return `<div class="pbar"><div class="lvl">Lv ${lv}</div>
      <div class="xp"><div style="width:${pct}%"></div><span>${PROFILE.xp - lo} / ${hi - lo} XP</span></div>
      ${this.currency()}</div>`;
  },
  currency() {
    const v = PROFILE.vault;
    return `<span class="cur dia" title="Diamond — didapat dari bermain, untuk Summon">💎 ${(v.diamonds || 0).toLocaleString('id-ID')}</span>
      <span class="cur gems" title="Permata — dari top up, untuk Lucky Summon & skin">💠 ${v.gems.toLocaleString('id-ID')}<button class="plus" data-act="shoptab:topup" title="Top up">＋</button></span>
      <span class="cur" title="Koin">🪙 ${v.coins.toLocaleString('id-ID')}</span>
      <span class="cur hide-sm" title="Kristal Trait">✨ ${v.crystals}</span><span class="cur hide-sm" title="Batu Evolusi">🔮 ${v.stones}</span>`;
  },
  rarityTag(type) { const r = RARITY[UNIT_RARITY[type]]; return `<span class="rar" style="background:${r.color}">${r.name}</span>`; },
  unitName(u) { return u.evo ? EVOS[u.type].name : TOWERS[u.type].name; },
  unitCard(u, opts = {}) {
    const r = UNIT_RARITY[u.type], tr = u.trait && TRAITS[u.trait], inLo = PROFILE.loadout.includes(u.id);
    return `<div class="ucard r-${r} ${opts.sel ? 'sel' : ''} ${opts.cls || ''}" data-act="${opts.act || 'unit:' + u.id}">
      <canvas width="64" height="64" data-icon="${u.type}" data-skin="${u.skin || 'default'}" data-evo="${u.evo ? 1 : 0}"></canvas>
      <b>${this.unitName(u)}</b><small>M${unitLevel(u.xp)}${u.evo ? ' ★' : ''}</small>
      ${tr ? `<i class="utr" style="background:${RARITY[tr.rarity].color}" title="${tr.name}">${tr.icon}</i>` : ''}
      ${opts.quick ? `<i class="uq ${inLo ? 'on' : ''}" data-act="${inLo ? 'unequip' : 'equip'}:${u.id}" title="${inLo ? 'Lepas' : 'Pasang'}">${inLo ? '✔' : '＋'}</i>` : inLo && !opts.noEquip ? '<i class="ueq">✔</i>' : ''}${u.lock ? '<i class="ulock">🔒</i>' : ''}${u.tradable === false && opts.showTrade ? '<i class="unt" title="Tidak bisa diperdagangkan">⛔</i>' : ''}</div>`;
  },
  avatar(u, size = 44) {
    const name = (u && u.name) || 'Tamu';
    if (u && u.avatar) return `<img class="av" style="width:${size}px;height:${size}px" src="${esc(u.avatar)}" referrerpolicy="no-referrer" alt="">`;
    const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
    return `<div class="av" style="width:${size}px;height:${size}px;background:hsl(${hue},60%,45%);font-size:${size * 0.45}px">${esc(name[0].toUpperCase())}</div>`;
  },
  needLogin(title, why) {
    if (Online.loggedIn) return '';
    return `${this.header(title)}<div class="box center-box"><div class="big-ic">🔐</div><h3>Masuk dulu untuk ${why}</h3>
      <p class="dim">Gunakan akun Google. Progres kamu juga akan tersimpan di cloud.</p>${this.loginBlock()}</div>`;
  },
  loginBlock() {
    if (!Online.available) return `<p class="warn">⚠️ Server online tidak tersedia. Mainkan game dari alamat Vercel agar fitur online aktif.</p>`;
    let h = Online.cfg.googleClientId ? `<div class="gbtn"></div>` : `<p class="warn">⚠️ Login Google belum dikonfigurasi (GOOGLE_CLIENT_ID).</p>`;
    if (Online.cfg.devAuth) h += `<div class="devlogin"><input id="devName" placeholder="Nama uji coba" maxlength="20"><button class="btn sm gray" data-act="login-dev">Login uji coba</button></div>`;
    return h;
  },
  badge(n) { return n ? `<span class="badge-dot on">${n}</span>` : ''; },
  rw(r) {
    const I = { coins: '🪙', diamonds: '💎', gems: '💠', crystals: '✨', stones: '🔮' };
    return Object.keys(I).filter(k => r[k]).map(k => `${I[k]} ${r[k].toLocaleString('id-ID')}`).concat(r.skin ? [`🎨 ${SKINS[r.skin].name}`] : [], r.unit ? [`🗼 ${TOWERS[r.unit.type || r.unit] ? TOWERS[r.unit.type || r.unit].name : r.unit}`] : [], r.pxp ? [`🎫 ${r.pxp} XP`] : [], r.tok ? [`🎟️ ${r.tok}`] : [], r.lan ? [`${SHARED.LIMITED.icon} ${r.lan}`] : []).join(' • ');
  },
  /** Index summon: semua unit, bentuknya, peluang & status koleksi */
  gachaIndex() {
    const v = PROFILE.vault, own = {}; v.units.forEach(u => { own[u.type] = (own[u.type] || 0) + 1; });
    const sel = this.idxSel && TOWERS[this.idxSel] ? this.idxSel : null, total = UNIT_TYPES.length, got = UNIT_TYPES.filter(t => own[t]).length;
    const rateOf = (cfg, t) => { const r = UNIT_RARITY[t]; return (cfg.rates[r] || 0) / SHARED.unitsOfRarity(r).length; };
    const pct = x => x >= 1 ? x.toFixed(1) + '%' : x >= 0.1 ? x.toFixed(2) + '%' : x.toFixed(3) + '%';
    const groups = [...SHARED.EXCLUSIVE, ...RARITY_ORDER.slice().reverse()].map(r => {
      const list = SHARED.unitsOfRarity(r);
      return `<div class="ix-group r-${r}" style="--rc:${RARITY[r].color}"><div class="ix-head"><b>${RARITY[r].name}</b><small>${list.filter(t => own[t]).length}/${list.length} • ${RARITY[r].exclusive ? 'Eksklusif — tidak ada di Summon (kode redeem Beta)' : `Summon ${GACHA.rates[r]}% • Lucky ${LUCKY.rates[r]}%`}</small></div>
        <div class="ix-grid">${list.map(t => `<button class="ix-card ${own[t] ? 'own' : 'miss'} ${sel === t ? 'on' : ''}" data-act="idx:${t}">
          <canvas width="72" height="72" data-icon="${t}" data-skin="default" data-evo="0"></canvas><b>${TOWERS[t].name}</b>
          <small>${own[t] ? `✓ ×${own[t]}` : '🔒 Belum punya'}</small></button>`).join('')}</div></div>`;
    }).join('');
    let det = `<div class="box ix-det empty"><p class="dim">Pilih unit untuk melihat detail, bentuk evolusi & statistik.</p></div>`;
    if (sel) {
      const d = TOWERS[sel], L0 = d.levels[0], Lm = d.levels[d.levels.length - 1], ev = EVOS[sel], r = UNIT_RARITY[sel];
      const st = L => L.aura ? `⚔️ ${fmtNum(L.dmg)} / ${L.rate}s aura` : L.income ? `💰 +$${L.income}/wave` : L.buff ? `▲ buff ${Math.round(L.buff * 100)}%` : `⚔️ ${fmtNum(L.dmg)} • ⏱ ${L.rate}s • 🎯 ${L.range}`;
      det = `<div class="box ix-det" style="--rc:${RARITY[r].color}">
        <div class="ix-pair"><div><canvas width="110" height="110" data-icon="${sel}" data-skin="default" data-evo="0"></canvas><small>Normal</small></div>
          <div><canvas width="110" height="110" data-icon="${sel}" data-skin="default" data-evo="1"></canvas><small>Evo: ${ev ? ev.name : '-'}</small></div></div>
        <h3>${d.name} ${this.rarityTag(sel)}</h3><small class="dim">${d.role || ''} • Maks ${d.limit} di map</small>
        <p>${d.desc}</p>
        <div class="ix-st"><div><small>Lv 0</small><b>${st(L0)}</b></div><div><small>Lv ${d.levels.length - 1}</small><b>${st(Lm)}</b></div></div>
        ${this.skillRow(sel)}
        ${ev ? `<p class="dim">✨ Evolusi: ${ev.desc}</p>` : ''}
        ${RARITY[r].exclusive ? '<div class="ix-rate"><span>Cara mendapatkan</span><b>Kode redeem EARLYACC (pemain Beta)</b></div>' : `<div class="ix-rate"><span>Peluang per tarikan</span><b>Summon ${pct(rateOf(GACHA, sel))}</b><b>Lucky ${pct(rateOf(LUCKY, sel))}</b></div>`}
        <small class="dim">${own[sel] ? `Kamu punya ${own[sel]} unit ini.` : 'Belum dimiliki — dapatkan lewat Summon' + (r === 'secret' ? ', Lucky Summon, atau Toko Pass.' : '.')}</small></div>`;
    }
    return `<div class="ix-top box"><b>📖 Koleksi ${got}/${total}</b><div class="mbar"><div style="width:${got / total * 100}%"></div></div><small class="dim">Unit 🔒 terlihat bentuknya, tapi harus didapat dari Summon.</small></div>
      <div class="ix-wrap"><div class="ix-list">${groups}</div>${det}</div>`;
  },
  /** Ikon besar hadiah (unit → gambar unit, skin → palet, lainnya → ikon mata uang) + label singkat */
  rwBig(rw) {
    if (rw.unit) { const t = rw.unit.type || rw.unit; return [`<canvas width="44" height="44" data-icon="${t}" data-skin="default" data-evo="0"></canvas>`, TOWERS[t] ? TOWERS[t].name : t]; }
    if (rw.skin) return [pxImg('paint', 'big'), 'Skin ' + SKINS[rw.skin].name];
    const k = Object.keys(RW_ICON).find(k => rw[k]); if (!k) return [pxImg('star', 'big'), ''];
    const more = Object.keys(rw).filter(x => rw[x] && x !== 'premiumUnit').length > 1 ? '+' : '';
    return [pxImg(RW_ICON[k], 'big'), rw[k].toLocaleString('id-ID') + more];
  },
  passRail(ps, lv) {
    const P = SHARED.PASS;
    const cell = (tr, t) => {
      const rw = SHARED.passReward(tr, t, ps.season), got = ps[tr].includes(t), lockP = tr === 'p' && !ps.premium, open = t <= lv && !lockP, [ic, lab] = this.rwBig(rw);
      const st = got ? 'got' : open ? 'ready' : lockP ? 'lock' : 'wait';
      return `<button class="pc2 ${tr} ${st}" data-act="${st === 'ready' ? `pclaim:${tr}:${t}` : 'noop'}" title="${esc(this.rw(rw))}" data-nopx>
        <span class="pc2-ic">${ic}</span><small>${esc(lab)}</small>${got ? `<i class="pc2-st">${pxImg('check')}</i>` : lockP ? `<i class="pc2-st">${pxImg('lock')}</i>` : st === 'ready' ? '<em>AMBIL</em>' : ''}</button>`;
    };
    let cols = '';
    for (let t = 1; t <= P.tiers; t++) cols += `<div class="pcol2 ${t <= lv ? 'on' : ''} ${t === lv + 1 ? 'next' : ''}" data-tier="${t}">${cell('f', t)}<div class="pt2"><b>${t}</b></div>${cell('p', t)}</div>`;
    return `<div class="prail2"><div class="pr-lab"><span class="pl-f">Gratis</span><span class="pl-mid"></span><span class="pl-p">${pxImg('star')} Premium</span></div>
      <div class="pr-scroll" id="prScroll">${cols}</div></div>`;
  },
  levelCard() {
    const lv = SHARED.accLevel(accXpNow()), n = levelReady();
    return `<button class="lvcard" data-act="go:levels"><span class="tierbadge sm"><small>LV</small><b>${lv}</b></span><div><b>⭐ Hadiah Level</b><small>${n ? `${n} hadiah siap diambil!` : 'Lihat hadiah tiap naik level'}</small></div>${this.badge(n)}<i>›</i></button>`;
  },
  passMissions() {
    const now = Date.now(), v = PROFILE.vault, m = SHARED.rollMissions(v, now);
    return `<div class="box"><h3>🎯 Misi Pass <small class="dim">• berlaku sampai akhir season</small></h3>${SHARED.MISSIONS.season.map(def => {
      const claimed = m.sc.includes(def.id), pr = Math.min(def.target, SHARED.missionProgress(v, now, 'season', def)), done = pr >= def.target;
      return `<div class="mis ${claimed ? 'claimed' : done ? 'done' : ''}"><div class="mi"><b>${def.name}</b><small>${this.rw(def.reward)}</small>
        <div class="mbar"><div style="width:${pr / def.target * 100}%"></div><span>${pr.toLocaleString('id-ID')}/${def.target.toLocaleString('id-ID')}</span></div></div>
        ${claimed ? '<span class="ok">✅</span>' : `<button class="btn sm ${done ? '' : 'gray'}" ${done ? '' : 'disabled'} data-act="mclaim:season:${def.id}">${done ? 'Ambil' : 'Belum'}</button>`}</div>`;
    }).join('')}</div>`;
  },
  passShop() {
    const ps = SHARED.rollPass(PROFILE.vault, Date.now());
    return `<div class="pshop">${SHARED.PASS_SHOP.map(it => {
      const n = ps.buy[it.id] || 0, left = it.limit - n, can = left > 0 && (ps.tok || 0) >= it.cost;
      return `<div class="psi ${it.id === 'secret' ? 'r-secret' : ''} ${left ? '' : 'soldout'}"><span class="psi-ic">${it.icon}</span><b>${it.name}</b>
        <small>Stok ${left}/${it.limit}</small><button class="btn sm ${can ? '' : 'gray'}" ${can ? '' : 'disabled'} data-act="pshop:${it.id}">🎟️ ${it.cost.toLocaleString('id-ID')}</button></div>`;
    }).join('')}</div><small class="dim">Stok & token direset setiap season. Unit dari Toko Pass bisa diperdagangkan.</small>`;
  },
  avatarPicker(u) {
    const types = [...new Set(PROFILE.vault.units.map(x => x.type))].sort((a, b) => RARITY[UNIT_RARITY[b]].rank - RARITY[UNIT_RARITY[a]].rank);
    return `<div class="avpick"><b>Ganti foto profil</b>
      <div class="row2"><label class="btn sm">🖼️ Unggah dari perangkat<input type="file" accept="image/*" id="avFile" hidden></label>
        ${u.hasCustomAvatar ? '<button class="btn sm gray" data-act="avreset">↺ Pakai foto Google</button>' : ''}<button class="btn sm gray" data-act="avpick">Tutup</button></div>
      <small class="dim">Atau pakai karakter unit yang kamu punya:</small>
      <div class="avunits">${types.map(t => `<button class="avu" data-act="avunit:${t}" title="${TOWERS[t].name}" style="--rc:${RARITY[UNIT_RARITY[t]].color}"><canvas width="56" height="56" data-icon="${t}" data-skin="default" data-evo="0"></canvas></button>`).join('')}</div></div>`;
  },
  /** Kecilkan gambar jadi persegi 128px (JPEG) sebelum diunggah */
  async avatarFromImage(img) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const sz = Math.min(img.width, img.height); g.fillStyle = '#1b2448'; g.fillRect(0, 0, 128, 128);
    g.drawImage(img, (img.width - sz) / 2, (img.height - sz) / 2, sz, sz, 0, 0, 128, 128);
    return c.toDataURL('image/jpeg', 0.85);
  },
  async uploadAvatar(dataUrl) {
    try { const r = await Online.api('me.avatar', { image: dataUrl }); Online.user = r.user; this.avPick = false; sfx('coin'); UI.toast('✅ Foto profil diperbarui'); Online.refreshUi(); this.show(this.screen, true); }
    catch (e) { UI.toast('❌ ' + e.message); }
  },
  /** Ringkasan skill pasif & aktif unit */
  skillRow(type) {
    const sk = UNIT_SKILLS[type]; if (!sk) return '';
    return `<div class="skrow"><div class="sp"><b>🛡 Pasif: ${esc(sk.passive.name)}</b>${esc(sk.passive.desc)}</div>
      <div class="sa"><b>${sk.active.icon} Aktif: ${esc(sk.active.name)}</b>${esc(sk.active.desc)}<br><small class="dim">Cooldown ${sk.active.cd} dtk • terbuka di level upgrade ${SKILL_UNLOCK_LV} • tombol F</small></div></div>`;
  },
  /** Ambil & urai CHANGELOG.md jadi daftar versi */
  async loadUpdates(force) {
    if (this.updLoading || (this.updLog && !force)) return this.updLog;
    this.updLoading = true;
    try {
      const md = await (await fetch('CHANGELOG.md?v=' + VERSION, { cache: 'no-cache' })).text();
      const out = []; let cur = null, sec = null;
      const inline = x => esc(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');
      for (const raw of md.split('\n')) {
        const line = raw.replace(/\s+$/, '');
        let m;
        if ((m = /^## \[(.+?)\](?:\s*[—-]\s*(.+))?/.exec(line))) { cur = { v: m[1], date: m[2] || '', secs: [] }; out.push(cur); sec = null; }
        else if (cur && (m = /^### (.+)/.exec(line))) { sec = { t: m[1], items: [] }; cur.secs.push(sec); }
        else if (cur && /^\s*- /.test(line)) { if (!sec) { sec = { t: 'Perubahan', items: [] }; cur.secs.push(sec); } sec.items.push(inline(line.replace(/^\s*- /, ''))); }
        else if (cur && sec && sec.items.length && /^\s{2,}\S/.test(line)) sec.items[sec.items.length - 1] += ' ' + inline(line.trim());
      }
      this.updLog = out;
    } catch (e) { this.updLog = { error: true }; }
    this.updLoading = false;
    if (this.screen === 'updates') this.show('updates', true);
    return this.updLog;
  },
  updCard(v, open) {
    const ic = t => /tambah/i.test(t) ? '✨' : /perbaik/i.test(t) ? '🛠️' : /performa/i.test(t) ? '⚡' : '🔄';
    return `<details class="upd box" ${open ? 'open' : ''}><summary><b>v${esc(v.v)}</b>${v.v === VERSION ? '<span class="tag gold">TERBARU</span>' : ''}<small>${esc(v.date)}</small></summary>
      ${v.secs.map(s => `<h5>${ic(s.t)} ${esc(s.t)}</h5><ul>${s.items.map(i => `<li>${i}</li>`).join('')}</ul>`).join('')}</details>`;
  },
  /** Popup "Yang baru" sekali setiap versi baru */
  async whatsNew() {
    if (!SET.seenVersion && !PROFILE.stats.games) { SET.seenVersion = VERSION; saveSettings(true); return; }   // pemain baru: tidak perlu popup
    if (SET.seenVersion === VERSION) return;
    const L = await this.loadUpdates(); SET.seenVersion = VERSION; saveSettings(true);
    if (!Array.isArray(L) || !L.length || this.screen !== 'main') return;
    const box = document.createElement('div'); box.className = 'wn-modal';
    box.innerHTML = `<div class="wn-card"><div class="wn-head"><span>🎉</span><div><b>Yang baru di v${esc(L[0].v)}</b><small>${esc(L[0].date)}</small></div></div>
      <div class="wn-body">${this.updCard(L[0], true)}</div>
      <div class="row2"><button class="btn" data-wn="ok">Mantap!</button><button class="btn gray" data-wn="all">📜 Lihat semua update</button></div></div>`;
    box.onclick = ev => { const b = ev.target.closest('[data-wn]'); if (!b && ev.target !== box) return; box.remove(); if (b && b.dataset.wn === 'all') this.go('updates'); };
    document.body.appendChild(box);
  },
  announce() {
    const g = Online.cfg.global || {}, a = g.announcement || {};
    let h = a.active && a.text ? `<div class="announce" style="--ac:${a.color || '#ffcc33'}">📢 ${esc(a.text)}</div>` : '';
    if (g.maintenance) h += `<div class="announce" style="--ac:#ff5252">🚧 ${esc(g.maintenanceMsg || 'Server sedang maintenance')}</div>`;
    return h;
  },
  header(title) { return `<div class="mhead"><button class="btn gray" data-act="back">← Kembali</button><h2>${title}</h2>${this.profileBar()}</div>`; },
  fmtTime(s) { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h}j ${m}m` : m ? `${m}m ${s % 60}d` : `${s}d`; },

  /* ---------- layar ---------- */
  screens: {
    main() {
      const u = Online.user, v = PROFILE.vault, lv = levelFromXp(PROFILE.xp), lo = lv > 1 ? xpForLevel(lv - 1) : 0, hi = xpForLevel(lv);
      const pct = Math.min(100, (PROFILE.xp - lo) / (hi - lo) * 100), now = Date.now();
      const nextDay = Date.parse(SHARED.dayStr(now + 864e5) + 'T00:00:00+07:00');
      const hour = new Date(now + 7 * 3600e3).getUTCHours();
      const sky = hour >= 5 && hour < 8 ? 'dawn' : hour < 16 ? 'day' : hour < 19 ? 'dusk' : 'night';
      const tile = (act, ic, label, cls, badge = '') => `<button class="ltile ${cls}" data-act="${act}"><span class="lt-ic">${pxi(ic)}</span><b>${label}</b>${badge}</button>`;
      // unggulan
      const feat = SHARED.featuredUnit(now), fr = RARITY[UNIT_RARITY[feat]], pityLeft = Math.max(1, GACHA.pity - ((v.pity || {}).feat || 0));
      // showcase loadout
      const lo4 = (PROFILE.loadout || []).map(id => unitById(id)).filter(Boolean).slice(0, 6);
      const show = lo4.map((x, i) => {
        const L = computeL(x.type, 0), d = TOWERS[x.type], tr = x.trait && TRAITS[x.trait], r = RARITY[UNIT_RARITY[x.type]];
        return `<button class="sc-unit" style="--i:${i};--rc:${r.color}" data-act="unit:${x.id}">
          <div class="sc-tip"><b>${esc(this.unitName(x))}</b> <small>Lv ${unitLevel(x.xp)}</small><br>${this.rarityTag(x.type)} <small>${d.role || ''}</small>
            <div class="sc-st"><span>⚔️ ${fmtNum(L.dmg)}</span><span>🎯 ${(+L.range).toFixed(1)}</span><span>⏱ ${(+L.rate).toFixed(2)}s</span><span>💥 ${fmtNum(L.dmg / L.rate)}/s</span></div>
            ${tr ? `<small class="sc-tr">${tr.icon || '✦'} ${tr.name}</small>` : ''}</div>
          <canvas width="96" height="96" data-icon="${x.type}" data-skin="${x.skin || 'default'}" data-evo="${x.evo ? 1 : 0}"></canvas>
          <i class="sc-shadow"></i></button>`;
      }).join('');
      // misi aktif (2 teratas yang belum diambil)
      const m = SHARED.rollMissions(v, now), active = SHARED.MISSIONS.daily.filter(d => !m.dc.includes(d.id)).slice(0, 3);
      const misW = active.map(d => { const pr = Math.min(d.target, SHARED.missionProgress(v, now, 'daily', d)); return `<div class="mw-row ${pr >= d.target ? 'ok' : ''}"><small>${d.name}</small><div class="mbar"><div style="width:${pr / d.target * 100}%"></div><span>${pr}/${d.target}</span></div></div>`; }).join('') || '<small class="dim">✅ Semua misi harian selesai!</small>';
      // pass
      const ps = SHARED.rollPass(v, now), pt = SHARED.passTier(ps), ppct = pt >= SHARED.PASS.tiers ? 100 : (ps.xp - pt * SHARED.PASS.xpPerTier) / SHARED.PASS.xpPerTier * 100;
      const streak = (v.daily || {}).streak || 0, nextLogin = SHARED.DAILY_LOGIN[streak % SHARED.DAILY_LOGIN.length];
      const ev = SHARED.EVENT, evOn = ev.rewardMul > 1 || ev.diamondMul > 1;
      const save = SaveGame.get(), sm = save && (MAPS.find(x => x.id === save.map) || MAPS[0]);
      return `
        <div class="lh">
          ${this.announce()}
          <header class="lh-top">
            <button class="lh-prof" data-act="go:account">${this.avatar(u, 46)}
              <div><b>${esc(u ? u.name : 'Tamu')}</b><div class="lvrow"><span class="lvl">Lv ${lv}</span><div class="xpbar"><div style="width:${pct}%"></div></div></div></div>${this.badge(levelReady())}</button>
            <div class="lh-cur">${this.currency()}</div>
            <div class="lh-sys">${PWA.installed() ? '' : `<button class="sysb dl" data-act="go:download" title="Download aplikasi">${pxi('down')}</button>`}
              <button class="sysb" data-act="go:howto" title="Cara main">${pxi('help')}</button><button class="sysb" data-act="settings:main" title="Pengaturan">${pxi('gear')}</button></div>
          </header>
          <nav class="lh-left">
            ${tile('go:gacha', 'chest', 'Summon', 'c-gold')}${tile('go:units', 'tower', 'Unit', 'c-purple')}
            ${tile('go:skills', 'bolt', 'Skill', 'c-orange')}${tile('go:shop', 'bag', 'Toko', 'c-teal')}
            ${tile('go:missions', 'target', 'Misi', 'c-green', this.badge(missionsReady()))}${tile('go:pass', 'ticket', 'Pass', 'c-pink', this.badge(passReady()))}
            ${tile('go:friends', 'friend', 'Teman', 'c-blue', `<span class="badge-dot" data-badge="friends">${Online.requests || ''}</span>`)}${tile('go:more', 'menu', 'Lainnya', 'c-gray')}
          </nav>
          <section class="lh-center">
            <div class="feat-ban" style="--rc:${fr.color}">
              <div class="fb-art"><canvas width="110" height="110" data-icon="${feat}" data-skin="default" data-evo="0"></canvas></div>
              <div class="fb-info"><small class="fb-tag">★ UNIT UNGGULAN</small><b>${TOWERS[feat].name}</b>
                <div>${this.rarityTag(feat)} <span class="fb-cd">⏳ <span data-cd="${nextDay}"></span></span></div>
                <div class="fb-btns"><button class="fbb" data-act="hpull:1">Summon ×1<small>💎 ${GACHA.cost1}</small></button><button class="fbb x10" data-act="hpull:10">Summon ×10<small>💎 ${GACHA.cost10}</small></button></div>
                <small class="fb-pity">Legendaris+ dijamin dalam ${pityLeft} tarikan</small></div>
            </div>
            <div class="showcase">${show}<div class="sc-plat"></div><button class="sc-edit" data-act="go:units">✎ Atur tim</button></div>
          </section>
          <aside class="lh-right">
            ${SHARED.limitedActive(now) ? `<button class="rcard r-limited" data-act="go:event"><span class="rc-ic">${pxi('snow')}</span><div><b>${esc(SHARED.LIMITED.name.toUpperCase())}</b><small>${SHARED.LIMITED.icon} ${((v.ev && v.ev.id === SHARED.LIMITED.id && v.ev.lan) || 0).toLocaleString('id-ID')} • sisa <span data-cd="${SHARED.limitedEndsAt()}"></span></small></div>${this.badge(eventReady())}</button>` : ''}
            ${evOn ? `<button class="rcard r-event" data-act="go:play"><span class="rc-ic">${pxi('star')}</span><div><b>EVENT AKTIF</b><small>${ev.rewardMul > 1 ? `🪙 ×${ev.rewardMul} ` : ''}${ev.diamondMul > 1 ? `💎 ×${ev.diamondMul}` : ''} hadiah bermain</small></div></button>` : ''}
            <button class="rcard r-pass" data-act="go:pass"><span class="rc-ic">${pxi('ticket')}</span><div><b>SEASON PASS</b><small>Tier ${pt}/${SHARED.PASS.tiers}${ps.premium ? ' • ⭐' : ''}</small><div class="rc-bar"><div style="width:${ppct}%"></div></div></div>${this.badge(passReady())}</button>
            <button class="rcard r-daily" data-act="go:daily"><span class="rc-ic">${pxi('cal')}</span><div><b>TANTANGAN HARIAN</b><small>${dailyState().won ? '✅ Selesai • reset <span data-cd="' + nextDay + '"></span>' : 'Hadiah 🪙 ' + DAILY_REWARD + ' + 💎'}</small></div></button>
            <div class="rcard r-login"><span class="rc-ic">${pxi('gift')}</span><div><b>LOGIN HARIAN</b><small>Hari ke-${streak || 1} • besok 💎 ${nextLogin}</small><small class="dim">Berikutnya <span data-cd="${nextDay}"></span></small></div></div>
          </aside>
          <button class="lh-mis" data-act="go:missions"><b>${pxi('target', 'sm')} MISI HARIAN</b>${misW}</button>
          <div class="lh-play">
            ${save ? `<button class="bigplay cont" data-act="continue"><span class="bp-ic">⏯</span><div><b>LANJUTKAN</b><small>${sm.name} • Wave ${save.wave + 1}</small></div></button>
              <div class="bp-side"><button class="hchip" data-act="go:play">＋ Baru</button><button class="hchip" data-act="discard">✕ Hapus</button></div>`
            : `<button class="bigplay" data-act="go:play"><span class="bp-ic">${pxi('play')}</span><div><b>MAIN</b><small>${MAP.name} • ${DIFFS[DIFF].name}</small></div></button>`}
          </div>
          <button class="lh-coop" data-act="go:mabar"><span>${pxi('swords')}</span><div><b>MABAR</b><small>Co-op 2–4 pemain</small></div></button>
          <div class="lh-foot">v${VERSION} • ${Online.available ? '🟢 Online' : '⚪ Offline'}</div>
        </div>`;
    },
    autosell() {
      const on = PROFILE.vault.autoSell || [];
      return `${this.header('⚙️ Auto Jual')}<div class="box"><p>Unit hasil Summon dengan kelangkaan yang dipilih akan <b>langsung dijual</b> bila kamu <b>sudah punya jenis unit itu</b>. Unit jenis baru selalu disimpan.</p>
        <div class="aslist">${SHARED.AUTO_SELL_OK.map(r => `<button class="asrow ${on.includes(r) ? 'on' : ''}" data-act="astog:${r}" style="--rc:${RARITY[r].color}"><span class="tog ${on.includes(r) ? 'on' : ''}"></span><b>${RARITY[r].name}</b><small>Jual: ${this.rw(SHARED.SCRAP[r])}</small></button>`).join('')}</div>
        <small class="dim">Mitos & Rahasia tidak pernah dijual otomatis.</small></div>
        <div class="row2"><button class="btn gray" data-act="go:units">← Kembali ke Unit</button></div>`;
    },
    updates() {
      const L = this.updLog;
      if (!L) { this.loadUpdates(); return `${this.header('📜 Update Log')}<div class="box">⏳ Memuat catatan pembaruan…</div>`; }
      if (L.error) return `${this.header('📜 Update Log')}<div class="box">❌ Tidak bisa memuat update log (offline?).</div>`;
      const list = this.updAll ? L : L.slice(0, 6);
      return `${this.header('📜 Update Log')}<div class="upd-list">${list.map((v, i) => this.updCard(v, i === 0)).join('')}</div>
        ${!this.updAll && L.length > 6 ? `<div class="row2"><button class="btn gray" data-act="updall">Tampilkan semua (${L.length} versi)</button></div>` : ''}`;
    },
    more() {
      const u = Online.user, row = (act, ic, t, d) => `<button class="mrow" data-act="${act}"><span>${ic}</span><div><b>${t}</b><small>${d}</small></div><i>›</i></button>`;
      return `${this.header('Lainnya')}<div class="mlist">
        ${row('mgo:trade', '🔁', 'Trading', u ? 'Tukar unit dengan teman' : 'Perlu login')}
        ${row('mgo:levels', '⭐', 'Hadiah Level', levelReady() ? `${levelReady()} hadiah siap diambil` : 'Hadiah tiap naik level')}
        ${row('mgo:event', '❄️', 'Event Terbatas', SHARED.limitedActive(Date.now()) ? SHARED.LIMITED.name : 'Tidak ada event aktif')}
        ${row('mgo:redeem', '🎁', 'Kode Redeem', 'Tukar kode hadiah')}
        ${row('mgo:scores', '🏆', 'Papan Skor', 'Lokal & global')}
        ${row('mgo:achievements', '🏅', 'Pencapaian', `${PROFILE.achievements.length}/${ACHIEVEMENTS.length}`)}
        ${row('mgo:stats', '📊', 'Statistik', PROFILE.stats.games + ' game')}
        ${row('mgo:download', '📲', 'Download Aplikasi', PWA.installed() ? 'Sudah terpasang' : 'Android • iPhone • PC')}
        ${row('mgo:updates', '📜', 'Update Log', 'Versi ' + VERSION + ' • yang baru')}
        ${row('mgo:howto', '📖', 'Cara Main', 'Panduan')}
        ${row('mgo:account', '👤', 'Akun', u ? esc(u.name) : 'Masuk dengan Google')}
        ${u && u.isAdmin ? row('mgo:dev', '🛠️', 'Panel Developer', 'Atur semua') : ''}
      </div><div class="foot center"><a href="privacy.html" target="_blank">Privasi</a> • <a href="terms.html" target="_blank">Syarat & Ketentuan</a> • ${TOWER_ORDER.length} unit</div>`;
    },
    missions() {
      const now = Date.now(), v = PROFILE.vault, m = SHARED.rollMissions(v, now);
      const card = (kind, def) => {
        const claimed = (kind === 'daily' ? m.dc : m.wc).includes(def.id), pr = Math.min(def.target, SHARED.missionProgress(v, now, kind, def)), done = pr >= def.target;
        return `<div class="mis ${claimed ? 'claimed' : done ? 'done' : ''}"><div class="mi"><b>${def.name}</b><small>${this.rw(def.reward)}</small>
          <div class="mbar"><div style="width:${pr / def.target * 100}%"></div><span>${pr}/${def.target}</span></div></div>
          ${claimed ? '<span class="ok">✅</span>' : `<button class="btn sm ${done ? 'green' : 'gray'}" ${done ? '' : 'disabled'} data-act="mclaim:${kind}:${def.id}">${done ? 'Ambil' : 'Belum'}</button>`}</div>`;
      };
      const left = ms => { const h = Math.max(0, Math.floor(ms / 3600e3)); return h >= 24 ? Math.floor(h / 24) + ' hari' : h + ' jam'; };
      const nextDay = Date.parse(SHARED.dayStr(now + 864e5) + 'T00:00:00+07:00'), nextWeek = Date.parse(m.week + 'T00:00:00+07:00') + 7 * 864e5;
      return `${this.header('🎯 Misi')}<div class="cols2">
        <div class="box"><h3>Harian <small class="dim">• reset ${left(nextDay - now)} lagi</small></h3>${SHARED.MISSIONS.daily.map(d => card('daily', d)).join('')}</div>
        <div class="box"><h3>Mingguan <small class="dim">• reset ${left(nextWeek - now)} lagi</small></h3>${SHARED.MISSIONS.weekly.map(d => card('weekly', d)).join('')}</div></div>
        <small class="dim">Misi juga memberi 🎫 XP Season Pass.</small>`;
    },
    pass() {
      const now = Date.now(), ps = SHARED.rollPass(PROFILE.vault, now), P = SHARED.PASS, lv = SHARED.passTier(ps);
      const into = ps.xp - lv * P.xpPerTier, pct = lv >= P.tiers ? 100 : into / P.xpPerTier * 100;
      const end = new Date(Date.parse(ps.season + '-01T00:00:00+07:00')); end.setMonth(end.getMonth() + 1);
      const days = Math.max(0, Math.ceil((end - now) / 864e5));
      const ready = passReady() - seasonReady(), tab = this.passTab || 'rail';
      return `${this.header('Season Pass')}
        <div class="box ph2">
          <div class="ph-l"><small class="ph-k">SEASON PASS</small><h3>${SHARED.seasonName(ps.season).replace('Season ', '')}</h3><small class="dim">Berakhir ${days} hari lagi</small></div>
          <div class="ph-tier"><div class="tierbadge"><small>TIER</small><b>${lv}</b></div>
            <div class="ph-xp"><div class="xpbar wide"><div style="width:${pct}%"></div></div><small>${lv >= P.tiers ? 'Tier maksimal' : `${into}/${P.xpPerTier} XP menuju tier ${lv + 1}`}</small></div></div>
          <div class="ph-r">${ready ? `<button class="btn" data-act="pclaimall">🎁 Ambil semua (${ready})</button>` : ''}
            ${ps.premium ? '<span class="ph-prem">⭐ Premium aktif</span>' : `<button class="btn blue" data-act="pbuy">⭐ Premium • 💠 ${P.premiumCost}</button>`}</div>
        </div>
        <div class="tabs">${[['rail', 'Hadiah Tier'], ['mis', 'Misi Pass', this.badge(seasonReady())], ['shop', 'Toko Pass']].map(([k, l, b]) => `<button class="tab ${tab === k ? 'on' : ''}" data-act="ptab:${k}">${l}${b || ''}</button>`).join('')}
          <span class="tokchip">🎟️ ${(ps.tok || 0).toLocaleString('id-ID')}</span></div>
        ${tab === 'mis' ? this.passMissions() : tab === 'shop' ? this.passShop() : `${this.passRail(ps, lv)}
        <small class="dim pnote">XP pass dari bermain & misi. Klaim tier memberi 🎟️ Token (gratis +${SHARED.PASS_TOK.f}, premium +${SHARED.PASS_TOK.p}) untuk Toko Pass. Premium: skin eksklusif tier 15, unit Mitos tier 30.</small>`}<div id="pullResult"></div>`;
    },
    levels() {
      const v = PROFILE.vault, xp = accXpNow(), lv = SHARED.accLevel(xp), c = v.lvc || [], max = SHARED.ACC_MAX;
      const lo = lv > 1 ? SHARED.accXpFor(lv - 1) : 0, hi = SHARED.accXpFor(lv), pct = lv >= max ? 100 : Math.min(100, (xp - lo) / (hi - lo) * 100);
      const ready = levelReady(), until = Math.min(max, Math.max(lv + 10, 12));
      const row = L => {
        const rw = SHARED.levelReward(L), got = c.includes(L), open = L <= lv && !got, sp = SHARED.LEVEL_SPECIAL[L], [ic] = this.rwBig(sp || rw);
        return `<div class="lvr ${got ? 'got' : open ? 'ready' : 'wait'} ${sp ? 'sp' : ''}"><span class="lvn">Lv ${L}</span><span class="lvic">${ic}</span>
          <div class="lvi"><b>${sp ? (sp.unit ? 'Unit ' + TOWERS[sp.unit].name : 'Skin ' + SKINS[sp.skin].name) : 'Hadiah level'}</b><small>${this.rw(rw)}</small></div>
          ${got ? `<span class="ok">${pxImg('check')}</span>` : `<button class="btn sm ${open ? '' : 'gray'}" ${open ? '' : 'disabled'} data-act="lvclaim:${L}">${open ? 'Ambil' : 'Terkunci'}</button>`}</div>`;
      };
      const rows = []; for (let L = 2; L <= until; L++) rows.push(row(L));
      const specials = Object.keys(SHARED.LEVEL_SPECIAL).map(Number).filter(L => L > until);
      return `${this.header('Hadiah Level')}
        <div class="box lvhead"><div class="tierbadge"><small>LEVEL</small><b>${lv}</b></div>
          <div class="ph-xp"><div class="xpbar wide"><div style="width:${pct}%"></div></div><small>${lv >= max ? 'Level maksimal' : `${(xp - lo).toLocaleString('id-ID')}/${(hi - lo).toLocaleString('id-ID')} XP menuju level ${lv + 1}`}</small></div>
          ${ready ? `<button class="btn" data-act="lvclaim:all">🎁 Ambil semua (${ready})</button>` : ''}</div>
        <small class="dim">Setiap naik level kamu dapat 🪙 Koin & 💎 Diamond. Tiap 5 level ✨ Kristal, tiap 10 level 🔮 Batu Evolusi, dan level tertentu memberi unit atau skin spesial. XP didapat dari bermain.</small>
        <div class="lvlist">${rows.join('')}</div>
        ${specials.length ? `<div class="box"><h4>⭐ Hadiah spesial berikutnya</h4><div class="lvsp">${specials.map(L => { const sp = SHARED.LEVEL_SPECIAL[L], [ic, lab] = this.rwBig(sp); return `<div class="lvspc"><span class="lvic">${ic}</span><b>Lv ${L}</b><small>${esc(lab)}</small></div>`; }).join('')}</div></div>` : ''}`;
    },
    event() {
      const now = Date.now(), L = SHARED.LIMITED;
      if (!SHARED.limitedActive(now)) return `${this.header('Event')}<div class="box center-box"><div class="big-ic">${pxImg('snow', 'huge')}</div><h3>Belum ada event terbatas</h3><p class="dim">Nantikan event berikutnya!</p></div>`;
      const e = SHARED.rollEvent(PROFILE.vault, now) || { lan: 0, earned: 0, s: {}, mc: [], ms: [], buy: {} }, tab = this.evTab || 'mis';
      let body;
      if (tab === 'mis') body = `<div class="box">${SHARED.EV_MISSIONS.map(d => {
        const pr = Math.min(d.target, e.s[d.stat] || 0), done = pr >= d.target, cl = e.mc.includes(d.id);
        return `<div class="mis ${cl ? 'claimed' : done ? 'done' : ''}"><div class="mi"><b>${d.name}</b><small>${this.rw(d.reward)}</small>
          <div class="mbar"><div style="width:${pr / d.target * 100}%"></div><span>${pr}/${d.target}</span></div></div>
          ${cl ? `<span class="ok">${pxImg('check')}</span>` : `<button class="btn sm ${done ? '' : 'gray'}" ${done ? '' : 'disabled'} data-act="evm:${d.id}">${done ? 'Ambil' : 'Belum'}</button>`}</div>`;
      }).join('')}</div>`;
      else if (tab === 'road') {
        const top = SHARED.EV_MILESTONES[SHARED.EV_MILESTONES.length - 1].at;
        body = `<div class="box evroad"><div class="evtrack"><div class="evfill" style="width:${Math.min(100, e.earned / top * 100)}%"></div>
          ${SHARED.EV_MILESTONES.map((m, i) => `<i style="left:${m.at / top * 100}%" class="${e.earned >= m.at ? 'on' : ''}"></i>`).join('')}</div>
          <small class="dim">Total ${SHARED.LIMITED.icon} dikumpulkan: <b>${e.earned.toLocaleString('id-ID')}</b> (yang sudah dibelanjakan tetap dihitung)</small>
          <div class="evms">${SHARED.EV_MILESTONES.map((m, i) => { const ok = e.earned >= m.at, got = e.ms.includes(i), [ic, lab] = this.rwBig(m.reward);
            return `<div class="evm ${got ? 'got' : ok ? 'ready' : ''}" data-nopx><span class="lvic">${ic}</span><b>${esc(lab)}</b><small>${SHARED.LIMITED.icon} ${m.at.toLocaleString('id-ID')}</small>
              ${got ? `<span class="ok">${pxImg('check')}</span>` : `<button class="btn sm ${ok ? '' : 'gray'}" ${ok ? '' : 'disabled'} data-act="evms:${i}">${ok ? 'Ambil' : 'Terkunci'}</button>`}</div>`; }).join('')}</div></div>`;
      } else if (tab === 'units') body = `<div class="evunits">${SHARED.unitsOfRarity('winter').map(t => { const sk = UNIT_SKILLS[t] || {}, own = PROFILE.vault.units.some(u => u.type === t);
          return `<div class="box evu"><canvas width="110" height="110" data-icon="${t}" data-skin="default" data-evo="0"></canvas><div><b>${TOWERS[t].name}</b> ${this.rarityTag(t)} ${own ? '<span class="rar" style="background:#43a047">Dimiliki</span>' : ''}
            <small class="dim">${TOWERS[t].role}</small><p>${TOWERS[t].desc}</p>${sk.passive ? `<small><b>Pasif:</b> ${sk.passive.name} — ${sk.passive.desc}</small><br>` : ''}${sk.active ? `<small><b>Aktif:</b> ${sk.active.name} — ${sk.active.desc}</small>` : ''}</div></div>`; }).join('')}</div>
        <small class="dim">Hanya dari ❄️ Banner Winter selama event: peluang unit Winter ${(SHARED.WINTER_GACHA.rate * 100).toFixed(1)}% per tarikan (Yeti ${Math.round(SHARED.WINTER_GACHA.yeti * 100)}% dari itu), dijamin di tarikan ke-${SHARED.WINTER_GACHA.pity}. Biaya ${SHARED.LIMITED.icon} ${SHARED.WINTER_GACHA.cost1} per tarikan.</small>
        <div class="row2"><button class="btn" data-act="evgo:gacha">❄️ Ke Banner Winter</button></div>`;
      else body = `<div class="pshop">${SHARED.EV_SHOP.map(it => {
        const left = it.limit - (e.buy[it.id] || 0), owned = it.give.skin && PROFILE.vault.skins.includes(it.give.skin), can = left > 0 && !owned && e.lan >= it.cost;
        return `<div class="psi ${it.id === 'skin' ? 'r-secret' : ''} ${left && !owned ? '' : 'soldout'}"><span class="psi-ic">${it.icon}</span><b>${it.name}</b>
          <small>${owned ? 'Sudah dimiliki' : `Stok ${left}/${it.limit}`}</small><button class="btn sm ${can ? '' : 'gray'}" ${can ? '' : 'disabled'} data-act="evbuy:${it.id}">${SHARED.LIMITED.icon} ${it.cost.toLocaleString('id-ID')}</button></div>`;
      }).join('')}</div><small class="dim">${SHARED.LIMITED.token} & stok hilang saat event berakhir — tukarkan sebelum waktunya habis.</small>`;
      return `${this.header(L.name)}
        <div class="box evhead"><span class="evart">${pxImg('snow', 'huge')}</span>
          <div class="evinfo"><small class="ph-k">EVENT TERBATAS</small><h3>${esc(L.name)}</h3><p>${SHARED.LIMITED.desc}</p>
            <small class="dim">⏳ Berakhir dalam <b data-cd="${SHARED.limitedEndsAt()}"></b></small></div>
          <span class="evbal">${SHARED.LIMITED.icon} <b>${e.lan.toLocaleString('id-ID')}</b><small>${SHARED.LIMITED.token}</small></span></div>
        <small class="dim">Dapatkan ${SHARED.LIMITED.icon} dari setiap permainan (wave, boss, menang; Sulit ×1,5; map event Lembah Beku ×1,5) dan dari misi event.</small>
        <div class="evlinks"><button class="btn blue sm" data-act="evgo:gacha">❄️ Banner Winter — unit eksklusif</button><button class="btn sm" data-act="evgo:frost">🗺️ Main di Lembah Beku</button></div>
        <div class="tabs">${[['mis', 'Misi Event'], ['road', 'Hadiah Pencapaian'], ['shop', 'Toko Event'], ['units', 'Unit Eksklusif']].map(([k, l]) => `<button class="tab ${tab === k ? 'on' : ''}" data-act="evtab:${k}">${l}</button>`).join('')}</div>
        ${body}`;
    },
    redeem() {
      if (!Online.user) return this.needLogin('Kode Redeem', 'Masuk dengan Google untuk menukar kode hadiah.');
      return `${this.header('🎁 Kode Redeem')}<div class="box center-box"><div class="big-ic">🎁</div>
        <p class="dim">Masukkan kode hadiah dari event, media sosial, atau developer. Setiap kode hanya bisa dipakai sekali per akun.</p>
        <div class="devrow center"><input id="rcode" class="bigin" placeholder="KODE" maxlength="20" autocomplete="off"><button class="btn green" data-act="redeem">Tukar</button></div>
        <div id="rres"></div></div>`;
    },
    download() {
      const P = PWA, ios = P.isIOS();
      return `${this.header('📲 Download Aplikasi')}<div class="box center-box">
        <img class="appic" src="icons/icon-192.png" alt="">
        <h3>Block Tower Defense</h3>
        <p class="dim">Pasang sebagai aplikasi: buka langsung dari layar utama, layar penuh tanpa bilah browser, lebih ringan, dan tetap bisa main solo saat offline.</p>
        ${P.installed() ? '<p class="okmsg">✅ Aplikasi sudah terpasang di perangkat ini.</p>'
          : P.canPrompt() ? `<button class="btn green big" data-act="install">⬇️ Pasang Aplikasi</button>`
          : ios ? '<p class="okmsg">Di iPhone/iPad: ketuk <b>Bagikan</b> di Safari, lalu pilih <b>Tambah ke Layar Utama</b>.</p>'
          : '<p class="okmsg">Buka menu browser (⋮) lalu pilih <b>Instal aplikasi</b> / <b>Tambahkan ke layar utama</b>.</p>'}
        <div class="dlgrid">
          <div><span>🤖</span><b>Android</b><small>Chrome → ⋮ → Instal aplikasi</small></div>
          <div><span>🍎</span><b>iPhone / iPad</b><small>Safari → Bagikan → Tambah ke Layar Utama</small></div>
          <div><span>💻</span><b>PC / Laptop</b><small>Chrome / Edge → ikon pasang di bilah alamat</small></div>
        </div>
        <small class="dim">Progres tersimpan di akun Google, jadi sama di semua perangkat.</small></div>`;
    },
    account() {
      const u = Online.user;
      if (!u) return `${this.header('Akun')}<div class="box center-box"><div class="big-ic">🧑‍🚀</div><h3>Masuk / Daftar dengan Google</h3>
        <p class="dim">Akun dibuat otomatis saat pertama kali masuk. Dengan akun, progres (koin, tower, trait, evolusi, pencapaian) tersimpan di cloud dan bisa dimainkan di perangkat lain. Kamu juga bisa menambah teman dan mabar.</p>
        ${this.loginBlock()}
        <small class="dim">Progres yang sudah ada di perangkat ini akan ikut disimpan ke akunmu.</small></div>${this.levelCard()}`;
      const ago = Online.lastSync ? Math.max(0, Math.round((Date.now() - Online.lastSync) / 1000)) : null;
      return `${this.header('Akun')}
        <div class="acc">
          <div class="box acc-card"><div class="avwrap">${this.avatar(u, 84)}<button class="avedit" data-act="avpick" title="Ganti foto profil">📷</button></div>
            ${this.avPick ? this.avatarPicker(u) : ''}
            <div class="field"><label>Nama pemain</label><div class="inrow"><input id="accName" value="${esc(u.name)}" maxlength="20"><button class="btn sm" data-act="rename">Simpan</button></div></div>
            <div class="field"><label>Kode teman</label><div class="inrow"><code class="fcode">${u.friendCode}</code><button class="btn sm blue" data-act="copy:${u.friendCode}">Salin</button></div>
              <small class="dim">Bagikan kode ini agar temanmu bisa menambahkanmu.</small></div>
            ${this.levelCard()}
          </div>
          <div class="box">
            <h4>☁️ Cloud Save</h4>
            <p>Status: ${Online.syncing ? '⏳ Menyinkronkan…' : '✅ Aktif'} ${ago !== null ? `<span class="dim">• terakhir ${ago < 60 ? ago + ' detik' : Math.round(ago / 60) + ' menit'} lalu</span>` : ''}</p>
            <p class="dim">Progres disimpan otomatis setiap ada perubahan.</p>
            <div class="cloudlist"><b>☁️ Tersimpan di database akunmu</b><span>🗼 Unit, item & mata uang</span><span>📊 Level, XP, statistik & rekor</span><span>🏅 Pencapaian, misi & Season Pass</span><span>🎒 Loadout unit & skill</span><span>⚙️ Pengaturan game</span><span>⏯ Permainan yang sedang berjalan</span><span>👥 Teman, trading & riwayat top up</span><small class="dim">Login akun yang sama di perangkat lain untuk melanjutkan.</small></div>
            <div class="row2"><button class="btn blue" data-act="sync">🔄 Sinkronkan sekarang</button><button class="btn red" data-act="logout">🚪 Keluar</button></div>
          </div>
        </div>`;
    },

    friends() {
      const nl = this.needLogin('Teman', 'menambah teman'); if (nl) return nl;
      const f = this.friendsData;
      const row = (x, btns) => `<div class="frow">${this.avatar(x, 40)}<div class="fi"><b>${esc(x.name)}</b><small>Lv ${x.level} • ${x.online ? (x.roomCode ? `🎮 di room ${x.roomCode}` : '🟢 Online') : '⚫ Offline'}</small></div><div class="fb">${btns}</div></div>`;
      return `${this.header('Teman')}
        <div class="fgrid">
          <div class="box">
            <h4>➕ Tambah teman</h4>
            <div class="inrow"><input id="friendCode" placeholder="Kode teman (6 huruf)" maxlength="8" style="text-transform:uppercase"><button class="btn" data-act="friend-add">Tambah</button></div>
            <p class="dim">Kode kamu: <code class="fcode sm">${Online.user.friendCode}</code> <button class="btn sm blue" data-act="copy:${Online.user.friendCode}">Salin</button></p>
            ${f && f.incoming.length ? `<h4>📥 Permintaan masuk</h4>${f.incoming.map(x => row(x, `<button class="btn sm" data-act="friend-acc:${x.id}">Terima</button><button class="btn sm gray" data-act="friend-dec:${x.id}">Tolak</button>`)).join('')}` : ''}
            ${f && f.outgoing.length ? `<h4>📤 Menunggu konfirmasi</h4>${f.outgoing.map(x => row(x, '<small class="dim">menunggu</small>')).join('')}` : ''}
          </div>
          <div class="box">
            <h4>👥 Daftar teman ${f ? `(${f.friends.length})` : ''} <button class="btn sm gray" data-act="friends-refresh" style="float:right">🔄</button></h4>
            ${!f ? '<p class="dim">Memuat…</p>' : !f.friends.length ? '<p class="dim">Belum ada teman. Tambahkan dengan kode teman!</p>' :
              f.friends.map(x => row(x, `${Lobby.room ? `<button class="btn sm purple" data-act="invite:${x.id}">Undang</button>` : ''}${x.roomCode && x.online ? `<button class="btn sm" data-act="join-room:${x.roomCode}">Gabung</button>` : ''}<button class="btn sm red" data-act="friend-rm:${x.id}" title="Hapus teman">✕</button>`)).join('')}
          </div>
        </div>`;
    },

    mabar() {
      const nl = this.needLogin('Mabar', 'bermain bersama teman'); if (nl) return nl;
      if (Lobby.room) return this.screens.lobby.call(this);
      const f = this.friendsData, inRooms = f ? f.friends.filter(x => x.online && x.roomCode) : [];
      return `${this.header('Mabar Co-op')}
        <div class="fgrid">
          <div class="box center-box">
            <div class="big-ic">🏠</div><h3>Buat Room</h3>
            <p class="dim">Kamu jadi host. Pilih map & kesulitan di lobby, lalu ajak hingga 3 teman.</p>
            <button class="btn big" data-act="room-create">➕ Buat Room</button>
          </div>
          <div class="box center-box">
            <div class="big-ic">🔑</div><h3>Gabung dengan Kode</h3>
            <div class="inrow"><input id="roomCode" placeholder="KODE" maxlength="6" style="text-transform:uppercase;font-size:22px;text-align:center;letter-spacing:4px"><button class="btn" data-act="room-join">Gabung</button></div>
            ${inRooms.length ? `<h4>Teman yang sedang di room</h4>${inRooms.map(x => `<div class="frow">${this.avatar(x, 36)}<div class="fi"><b>${esc(x.name)}</b><small>Room ${x.roomCode}</small></div><button class="btn sm" data-act="join-room:${x.roomCode}">Gabung</button></div>`).join('')}` : ''}
          </div>
        </div>
        <div class="box tipbox">💡 Mabar: semua pemain berbagi nyawa base. Setiap pemain punya uang & tower sendiri, hadiah kill dibagi rata. Trait, evolusi, dan mastery masing-masing pemain tetap berlaku.</div>`;
    },

    lobby() {
      const r = Lobby.room; if (!r) return this.screens.mabar.call(this);
      const host = Lobby.isHost(), me = Online.user.id;
      const slots = Array.from({ length: 4 }, (_, i) => {
        const p = r.players[i];
        return p ? `<div class="rp" style="--pc:${PLAYER_COLORS[i]}"><span class="rp-n">P${i + 1}</span>${p.id === r.host ? '<span class="rp-crown">👑</span>' : ''}
            ${this.avatar(p, 54)}<b>${esc(p.name)}</b><small>Lv ${p.level}${p.id === me ? ' • kamu' : ''}</small><i class="rp-ok">● SIAP</i></div>`
          : `<div class="rp empty"><div class="rp-plus">＋</div><b>Kosong</b><small>Undang teman</small></div>`;
      }).join('');
      const m = MAPS[r.map] || MAPS[0];
      const seg = (act, opts, cur) => `<div class="seg">${opts.map(([k, l]) => `<button class="${cur === k ? 'on' : ''}" data-act="${act}:${k}" ${host ? '' : 'disabled'}>${l}</button>`).join('')}</div>`;
      const f = this.friendsData, online = f ? f.friends.filter(x => x.online && !r.players.some(p => p.id === x.id)) : [];
      return `<div class="mhead"><button class="btn gray" data-act="room-leave">← Keluar</button><h2>🤝 Room Mabar</h2>
          <div class="rcode"><small>KODE</small><code>${r.code}</code><button class="btn sm blue" data-act="copy:${r.code}">📋 Salin</button></div></div>
        <div class="room">
          <section class="room-main">
            <div class="rslots" id="lobbyPlayers">${slots}</div>
            <div class="box rset" id="lobbySettings">
              <div class="rset-head"><h4>🗺️ Pilih Map</h4>${host ? '' : '<small class="dim">Hanya host yang bisa mengubah</small>'}</div>
              <div class="rmaps">${MAPS.map((x, i) => !mapOpen(x) ? '' : `<button class="rmap ${i === r.map ? 'on' : ''}" data-act="lobby-map:${i}" ${host ? '' : 'disabled'}>
                <canvas width="160" height="96" data-map="${i}"></canvas><b>${x.name}</b><small>${'★'.repeat(x.stars)}</small></button>`).join('')}</div>
              <small class="dim rdesc">${esc(m.desc)}</small>
              <div class="ropts"><div><span>Kesulitan</span>${seg('lobby-diff', Object.entries(DIFFS).map(([k, d]) => [k, d.name]), r.diff)}</div>
                <div><span>Mode</span>${seg('lobby-mode', Object.entries(MODES).map(([k, d]) => [k, d.name]), r.mode)}</div></div>
            </div>
          </section>
          <aside class="room-side">
            <div class="box chatbox"><h4>💬 Chat Room</h4><div class="clog" id="lobbyChat">${(r.chat || []).slice(-30).map(c => `<div><b>${esc(c.n)}:</b> ${esc(c.t)}</div>`).join('') || '<div class="dim">Belum ada pesan. Sapa temanmu! 👋</div>'}</div>
              <div class="inrow"><input id="lobbyIn" placeholder="Ketik pesan…" maxlength="140"><button class="btn sm" data-act="lobby-chat">Kirim</button></div></div>
            <div class="box"><h4>📨 Undang teman online</h4>${!f ? '<p class="dim">Memuat…</p>' : online.length ? online.map(x => `<div class="frow">${this.avatar(x, 32)}<div class="fi"><b>${esc(x.name)}</b><small>🟢 Online</small></div><button class="btn sm purple" data-act="invite:${x.id}">Undang</button></div>`).join('') : '<p class="dim">Tidak ada teman online. Bagikan kode room di atas!</p>'}</div>
          </aside>
        </div>
        <div class="room-bar">
          <div class="rb-info"><span><b>${m.name}</b> • ${DIFFS[r.diff] ? DIFFS[r.diff].name : r.diff} • ${MODES[r.mode] ? MODES[r.mode].name : r.mode}</span><small>${r.players.length}/4 pemain • bagikan kode room agar teman bisa bergabung</small></div>
          ${host ? `<button class="bigplay rb-go" data-act="room-start"><span class="bp-ic">${pxi('play')}</span><div><b>MULAI</b><small>${r.players.length} pemain</small></div></button>` : '<div class="waiting">⏳ Menunggu host memulai…</div>'}
        </div>`;
    },

    play() {
      return `${this.header('Pilih Map')}
        <div class="cards">${MAPS.map((m, i) => {
          if (!mapOpen(m)) return '';
          const b = PROFILE.best[bestKey(m.id, DIFF, MODE)] || 0, won = MODE === 'classic' && b >= DIFFS[DIFF].waves;
          return `<div class="card ${MAP === m ? 'sel' : ''} ${m.event ? 'evmap' : ''}" data-act="map:${i}">${m.event ? '<span class="evtag">❄️ EVENT</span>' : ''}
            <canvas width="200" height="120" data-map="${i}"></canvas>
            <div class="nm">${m.name} ${won ? '🏆' : ''}</div>
            <div class="stars">${'★'.repeat(m.stars)}${'☆'.repeat(4 - m.stars)}</div>
            <small>${m.desc}</small><div class="best">Rekor: wave ${b}</div></div>`;
        }).join('')}</div>
        <h3>Mode</h3>
        <div class="diffs">${Object.entries(MODES).map(([k, m]) => `<button class="btn blue ${MODE === k ? 'sel' : ''}" data-act="mode:${k}">
          ${k === 'endless' ? '♾️' : '🏁'} ${m.name}<small>${m.desc}</small></button>`).join('')}</div>
        <h3>Kesulitan</h3>
        <div class="diffs">${Object.entries(DIFFS).map(([k, d]) => `<button class="btn ${DIFF === k ? 'sel' : ''}" style="background:${d.color}" data-act="diff:${k}">
          ${d.name}<small>${MODE === 'endless' ? '∞' : d.waves} wave • ❤️ ${d.hp} • $${d.cash} • 🪙×${d.coinMul}</small></button>`).join('')}</div>
        <div class="loadout-mini">Loadout: ${loadoutUnits().map(u => `<i title="${this.unitName(u)}" style="background:${u.evo ? EVOS[u.type].color : TOWERS[u.type].color}"></i>`).join('')}
          <button class="btn purple sm" data-act="go:units">Ubah</button>
          <span class="dim">Skill:</span> ${equippedSkills().map(id => `<span title="${skillById(id).name}">${skillById(id).icon}</span>`).join(' ') || '-'}
          <button class="btn orange sm" data-act="go:skills">Ubah</button></div>
        <button class="btn big" data-act="start">MULAI ▶</button>`;
    },

    units() {
      const v = PROFILE.vault, f = this.unitFilter || 'all';
      let list = [...v.units];
      if (f === 'equip') list = list.filter(u => PROFILE.loadout.includes(u.id));
      else if (RARITY[f]) list = list.filter(u => UNIT_RARITY[u.type] === f);
      list.sort((a, b) => RARITY[UNIT_RARITY[b.type]].rank - RARITY[UNIT_RARITY[a.type]].rank || b.evo - a.evo || b.xp - a.xp || a.type.localeCompare(b.type));
      if (!this.unitSel || !v.units.some(u => u.id === this.unitSel)) this.unitSel = (list[0] || v.units[0] || {}).id;
      const u = v.units.find(x => x.id === this.unitSel);
      const slots = Array.from({ length: LOADOUT_SIZE }, (_, i) => { const x = unitById(PROFILE.loadout[i]); return x ? this.unitCard(x, { act: 'unit:' + x.id, noEquip: true, cls: 'slotc' }) : '<div class="ucard empty">Kosong</div>'; }).join('');
      const have = r => v.units.some(x => UNIT_RARITY[x.type] === r);
      const filters = [['all', 'Semua'], ['equip', 'Terpasang'], ...[...RARITY_ORDER, ...SHARED.EXCLUSIVE].filter(r => have(r) || !SHARED.EXCLUSIVE.includes(r)).map(r => [r, RARITY[r].name])];
      return `${this.header('Unit')}
        <div class="lo-row"><b>Loadout</b><div class="lo-slots">${slots}</div></div>
        <div class="unitwrap">
          <div class="box inv">
            <div class="tabs sm">${filters.map(([k, l]) => `<button class="tab ${f === k ? 'on' : ''}" data-act="ufilter:${k}">${l}</button>`).join('')}</div>
            <small class="dim ug-hint">Ketuk unit untuk detail • tombol <b>＋</b> di kartu = pasang cepat</small>
            <div class="ugrid">${list.map(x => this.unitCard(x, { sel: x.id === this.unitSel, quick: true })).join('') || '<p class="dim">Tidak ada unit</p>'}</div>
            <div class="row2 ubar"><button class="btn gold sm" data-act="go:gacha">🎰 Summon</button><button class="btn gray sm" data-act="sellpanel">💰 Jual Massal</button><button class="btn gray sm" data-act="autosell">⚙️ Auto Jual${(v.autoSell || []).length ? ' • ON' : ''}</button></div>
            ${this.sellPanel ? this.sellPanelHtml() : ''}
          </div>
          ${u ? this.unitDetail(u) : '<div class="box">Pilih unit</div>'}
        </div>`;
    },

    shop() {
      const tab = this.shopTab && this.shopTab !== 'skill' ? this.shopTab : 'skin', v = PROFILE.vault;
      const tabs = [['skillx', '⚡ Skill'], ['skin', '🎨 Skin'], ['material', '✨ Material'], ['topup', '💠 Top Up']];
      if (tab === 'skillx') { this.shopTab = 'skin'; setTimeout(() => this.go('skills'), 0); }
      let body = '';
      if (false) body = '';
      else if (tab === 'skin') body = `${SHARED.limitedActive(Date.now()) ? (() => { const it = SHARED.EV_SHOP.find(x => x.give.skin), sk = it && SKINS[it.give.skin]; if (!sk) return ''; const e = SHARED.rollEvent(v, Date.now()), own = v.skins.includes(it.give.skin), can = !own && e && e.lan >= it.cost;
            return `<h4>❄️ Skin Event</h4><div class="shopgrid skins"><div class="sitem skin evskin"><canvas width="64" height="64" data-icon="scout" data-skin="${it.give.skin}" data-evo="0"></canvas><div class="sinfo"><b>${sk.icon} ${sk.name}</b><small class="dim">Eksklusif event • dibeli dengan ${SHARED.LIMITED.token}</small></div>
              ${own ? '<span class="owned">✔ Dimiliki</span>' : `<button class="btn sm ${can ? '' : 'gray'}" ${can ? '' : 'disabled'} data-act="evbuy:${it.id}">${SHARED.LIMITED.icon} ${it.cost.toLocaleString('id-ID')}</button>`}</div></div>`; })() : ''}
          <h4>Skin Permata</h4><div class="shopgrid skins">${Object.entries(SKINS).filter(([k, x]) => k !== 'default' && !x.event).map(([k, sk]) => {
        const own = v.skins.includes(k);
        return `<div class="sitem skin"><canvas width="64" height="64" data-icon="scout" data-skin="${k}" data-evo="0"></canvas><div class="sinfo"><b>${sk.icon} ${sk.name}</b><small class="dim">Kosmetik untuk semua unit</small></div>
          ${own ? '<span class="owned">✔ Dimiliki</span>' : `<button class="btn sm purple" data-act="buyskin:${k}">💠 ${sk.price}</button>`}</div>`; }).join('')}</div>
          <p class="dim">Pasang skin di menu <b>Unit</b> → pilih unit → Skin.</p>`;
      else if (tab === 'material') body = `<div class="cards">${Object.entries(MATERIALS).map(([k, m]) => `<div class="card shopc">
          <div class="big-ic">${m.icon}</div><div class="nm">${m.name}</div><small>${m.desc}</small><div class="best">Dimiliki: ${v[k]}</div>
          <div class="row2"><button class="btn gold sm" data-act="mat:${k}:1">1× — 🪙 ${m.price}</button><button class="btn gold sm" data-act="mat:${k}:5">5× — 🪙 ${m.price * 5}</button></div></div>`).join('')}</div>`;
      else body = this.topupBody();
      return `${this.header('Toko')}<div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${tab === k ? 'on' : ''}" data-act="shoptab:${k}">${l}</button>`).join('')}</div>
        <div class="box">${body}</div>`;
    },

    gacha() {
      let ban = this.banner || 'std'; const v = PROFILE.vault, feat = SHARED.featuredUnit(Date.now());
      if (GACHA.banners[ban] && GACHA.banners[ban].event && !SHARED.limitedActive(Date.now())) ban = this.banner = 'std';
      const tabs = `<div class="tabs">${Object.entries(GACHA.banners).filter(([k, b]) => !b.event || SHARED.limitedActive(Date.now())).map(([k, b]) => `<button class="tab ${ban === k ? 'on' : ''}" data-act="banner:${k}">${b.name}</button>`).join('')}<button class="tab ${ban === 'index' ? 'on' : ''}" data-act="banner:index">📖 Index Unit</button></div>`;
      if (ban === 'index') return `${this.header('Summon')}${tabs}${this.gachaIndex()}`;
      const lucky = ban === 'lucky', win = ban === 'winter', cfg = lucky ? LUCKY : win ? SHARED.WINTER_GACHA : GACHA, cur = lucky ? 'gems' : 'diamonds', icon = win ? SHARED.LIMITED.icon : lucky ? '💠' : '💎';
      const evb = win && SHARED.rollEvent(v, Date.now()), bal = win ? (evb ? evb.lan : 0) : v[cur] || 0;
      const rates = Object.entries((lucky ? LUCKY : GACHA).rates).map(([r, p]) => `<span class="rate r-${r}" style="--rc:${RARITY[r].color}">${RARITY[r].name} ${p}%</span>`).join('');
      return `${this.header('Summon')}${tabs}
        <div class="gacha box ${ban}">
          <div class="gleft">
            <h3>${GACHA.banners[ban].name}</h3><p class="dim">${GACHA.banners[ban].desc}</p>
            ${ban === 'winter' ? `<div class="wban">${SHARED.unitsOfRarity('winter').map(t => `<div class="wbu"><canvas width="96" height="96" data-icon="${t}" data-skin="default" data-evo="0"></canvas><b>${TOWERS[t].name}</b><small>${t === 'yeti' ? (SHARED.WINTER_GACHA.rate * SHARED.WINTER_GACHA.yeti * 100).toFixed(2) : (SHARED.WINTER_GACHA.rate * (1 - SHARED.WINTER_GACHA.yeti) * 100).toFixed(2)}%</small></div>`).join('')}</div>
              <p class="dim">❄️ Unit Winter dijamin dalam <b>${SHARED.WINTER_GACHA.pity - ((v.pity || {}).wex || 0)}</b> tarikan • berakhir <span data-cd="${SHARED.limitedEndsAt()}"></span></p>`
            : ban === 'feat' ? `<div class="featured"><canvas width="96" height="96" data-icon="${feat}" data-skin="default" data-evo="0"></canvas><div><small>UNIT UNGGULAN HARI INI</small><b>${TOWERS[feat].name}</b>${this.rarityTag(feat)}<small>${TOWERS[feat].desc}</small></div></div>`
              : `<div class="gacha-art">${lucky ? '🍀' : '🎰'}</div>`}
            <div class="rates">${rates}</div>
            <p class="dim">Pity: <b>${v.pity[ban] || 0}/${GACHA.pity}</b> — Legendaris dijamin di tarikan ke-${lucky ? LUCKY.pity : GACHA.pity}. 10× menjamin minimal 1 ${lucky ? 'Legendaris' : 'Epik'}.</p>
            <button class="btn sm gray" data-act="banner:index">📖 Lihat semua unit & peluangnya</button>
          </div>
          <div class="gright">
            <div class="gem-bal ${lucky ? '' : win ? 'wcoin' : 'dia'}">${icon} ${bal.toLocaleString('id-ID')}</div>
            <button class="btn big gold" data-act="pull:1" ${bal < cfg.cost1 ? 'disabled' : ''}>Summon ×1 <small>${icon} ${cfg.cost1}</small></button>
            <button class="btn big" data-act="pull:10" ${bal < cfg.cost10 ? 'disabled' : ''}>Summon ×10 <small>${icon} ${cfg.cost10} (hemat 10%)</small></button>
            ${win ? `<small class="dim center">${SHARED.LIMITED.icon} ${SHARED.LIMITED.token} didapat dari setiap permainan (map Lembah Beku ×1,5) dan misi event.</small><button class="btn gray sm" data-act="go:event">❄️ Buka Event</button>`
              : lucky ? `<button class="btn gray" data-act="shoptab:topup">💠 Top Up Permata</button>` : `<small class="dim center">💎 Diamond didapat dari menyelesaikan wave, mengalahkan boss, menang, login harian & pencapaian.</small>`}
          </div>
        </div>
        <div id="pullResult"></div>`;
    },

    trade() {
      const nl = this.needLogin('Trading', 'trading unit dengan teman'); if (nl) return nl;
      const d = this.tradeData;
      const side = (sd) => `${sd.units.map(x => x.missing ? '<div class="ucard empty">Hilang</div>' : this.unitCard(x, { act: 'noop', noEquip: true })).join('')}${sd.diamonds ? `<div class="gemchip">💎 ${sd.diamonds}</div>` : ''}${!sd.units.length && !sd.diamonds ? '<small class="dim">—</small>' : ''}`;
      const row = t => `<div class="trow box ${t.status}">
        <div class="thead"><b>${t.mine ? 'Ke' : 'Dari'} ${esc(t.other)}</b><span class="tstat">${({ pending: '⏳ Menunggu', done: '✅ Selesai', declined: '❌ Ditolak', cancelled: '🚫 Dibatalkan', failed: '⚠️ Gagal', processing: '⏳ Diproses' })[t.status] || t.status}</span></div>
        <div class="tsides"><div><small>${t.mine ? 'Kamu beri' : 'Kamu dapat'}</small><div class="tunits">${side(t.give)}</div></div><div class="tarrow">⇄</div>
          <div><small>${t.mine ? 'Kamu minta' : 'Kamu beri'}</small><div class="tunits">${side(t.want)}</div></div></div>
        ${t.reason ? `<small class="warn">${esc(t.reason)}</small>` : ''}
        ${t.status === 'pending' ? `<div class="row2">${t.mine ? `<button class="btn sm gray" data-act="tcancel:${t.id}">Batalkan</button>` : `<button class="btn sm" data-act="taccept:${t.id}">✅ Terima</button><button class="btn sm red" data-act="tdecline:${t.id}">Tolak</button>`}</div>` : ''}
      </div>`;
      const pending = d ? d.trades.filter(t => t.status === 'pending' || t.status === 'processing') : [], hist = d ? d.trades.filter(t => !pending.includes(t)) : [];
      return `${this.header('Trading')}
        <div class="row2"><button class="btn big" data-act="tnew">➕ Buat Penawaran</button><button class="btn gray" data-act="trefresh">🔄 Muat ulang</button></div>
        <div class="box tipbox">🔁 Tukar unit (beserta trait, evolusi & mastery-nya) dan 💎 Diamond dengan teman. Unit awal/impor (⛔) dan unit terkunci tidak bisa diperdagangkan.</div>
        <h3>Penawaran aktif</h3>${!d ? '<p class="dim">Memuat…</p>' : pending.map(row).join('') || '<p class="dim">Tidak ada penawaran aktif.</p>'}
        ${hist.length ? `<h3>Riwayat</h3>${hist.slice(0, 10).map(row).join('')}` : ''}`;
    },

    tradeNew() {
      const nl = this.needLogin('Trading', 'trading unit'); if (nl) return nl;
      const T0 = this.tn || (this.tn = { friend: null, give: [], want: [], giveGems: 0, wantGems: 0, theirs: null });
      const f = this.friendsData;
      if (!T0.friend) return `${this.header('Pilih teman')}<div class="box">${!f ? '<p class="dim">Memuat…</p>' : f.friends.length ? f.friends.map(x => `<div class="frow">${this.avatar(x, 40)}<div class="fi"><b>${esc(x.name)}</b><small>Lv ${x.level}</small></div><button class="btn sm" data-act="tfriend:${x.id}">Pilih</button></div>`).join('') : '<p class="dim">Belum punya teman. Tambahkan teman dulu.</p>'}</div>`;
      const mine = PROFILE.vault.units.filter(u => u.tradable !== false && !u.lock);
      const fr = f && f.friends.find(x => x.id === T0.friend);
      const pickGrid = (list, picked, act) => list.map(u => this.unitCard(u, { act: act + ':' + u.id, sel: picked.includes(u.id), noEquip: true })).join('') || '<p class="dim">Tidak ada unit yang bisa diperdagangkan</p>';
      return `${this.header('Penawaran ke ' + esc(fr ? fr.name : 'teman'))}
        <div class="tnew">
          <div class="box"><h4>Kamu beri</h4><div class="ugrid sm">${pickGrid(mine, T0.give, 'tgive')}</div>
            <div class="inrow"><span>💎 Diamond</span><input id="tGiveGems" type="number" min="0" value="${T0.giveGems}" style="max-width:120px"><small class="dim">punya ${PROFILE.vault.diamonds || 0}</small></div></div>
          <div class="box"><h4>Kamu minta</h4><div class="ugrid sm">${T0.theirs ? pickGrid(T0.theirs, T0.want, 'twant') : '<p class="dim">Memuat unit teman…</p>'}</div>
            <div class="inrow"><span>💎 Diamond</span><input id="tWantGems" type="number" min="0" value="${T0.wantGems}" style="max-width:120px"></div></div>
        </div>
        <div class="row2"><button class="btn gray" data-act="tback">← Ganti teman</button><button class="btn big" data-act="tsend">📨 Kirim Penawaran</button></div>`;
    },

    achievements() {
      return `${this.header('Pencapaian')}
        <div class="achs">${ACHIEVEMENTS.map(a => {
          const got = PROFILE.achievements.includes(a.id);
          return `<div class="ach ${got ? 'got' : ''}"><div class="medal">${got ? '🏅' : '🔒'}</div>
            <div><b>${a.name}</b><small>${a.desc}</small></div><div class="rw">🪙 ${a.coins}</div></div>`;
        }).join('')}</div>`;
    },

    stats() {
      const s = PROFILE.stats;
      return `${this.header('Statistik')}
        <div class="statgrid">
          ${[['🎮', 'Game dimainkan', s.games], ['🏆', 'Menang', s.wins], ['📈', 'Win rate', s.games ? Math.round(s.wins / s.games * 100) + '%' : '-'],
             ['🧟', 'Musuh dikalahkan', s.kills.toLocaleString('id-ID')], ['👑', 'Boss dikalahkan', s.bossKills], ['🗼', 'Tower dipasang', s.towersPlaced],
             ['⭐', 'Tower level maks', s.maxed], ['💰', 'Total uang', '$' + s.cashEarned.toLocaleString('id-ID')], ['⏱️', 'Waktu bermain', this.fmtTime(s.playTime)]]
            .map(([i, l, v]) => `<div class="stat-card"><span>${i}</span><b>${v}</b><small>${l}</small></div>`).join('')}
        </div>
        <div class="box"><b>Rekor wave tertinggi (Klasik)</b>
          <table><tr><th>Map</th>${Object.values(DIFFS).map(d => `<th>${d.name}</th>`).join('')}</tr>
          ${MAPS.map(m => `<tr><td>${m.name}</td>${Object.entries(DIFFS).map(([k, d]) => {
            const b = PROFILE.best[bestKey(m.id, k)] || 0; return `<td>${b >= d.waves ? '🏆 ' : ''}${b}</td>`; }).join('')}</tr>`).join('')}</table></div>`;
    },

    howto() {
      return `${this.header('Cara Main')}
        <div class="box howto">
          <h4>🎯 Tujuan</h4><p>Zombie berjalan dari portal ungu menuju <b>BASE</b>. Pasang tower di rumput dekat jalur untuk menghentikannya. Musuh yang lolos mengurangi nyawa sebesar sisa HP-nya, sedangkan boss yang lolos langsung mengakhiri permainan. Bertahan sampai wave terakhir untuk menang.</p>
          <h4>💰 Ekonomi</h4><p>Dapatkan uang dari mengalahkan musuh, bonus akhir wave, dan tower <b>Farm</b>. Jual tower untuk mendapat kembali ${SELL_RATE * 100}% total biaya.</p>
          <h4>🧟 Musuh</h4>
          <table>${Object.entries(ENEMIES).filter(([, e]) => !e.hide).map(([k, e]) => `<tr><td><i class="dot" style="background:${e.color}"></i> ${e.name}</td><td>${e.desc}${ENEMY_INTRO[k] ? ` <small class="dim">(mulai wave ${ENEMY_INTRO[k]})</small>` : ''}</td></tr>`).join('')}</table>
          <h4>⚡ Skill & Skip</h4><p>Ada ${ABILITIES.length} skill. Pasang hingga ${SKILL_SLOTS} skill di menu <b>Skill</b> dan gunakan dengan <kbd>Z</kbd> <kbd>C</kbd> <kbd>V</kbd> <kbd>B</kbd>. Buka skill sekali bayar di menu <b>Skill</b>; setelah terbuka bebas dipakai tanpa batas (hanya cooldown). Jika semua musuh wave sudah keluar, tekan <b>Skip</b> untuk memulai wave berikutnya lebih cepat dan dapat bonus uang.</p>
          <h4>📅 Mode</h4><p><b>Klasik</b>: menang di wave terakhir. <b>Endless</b>: wave tanpa batas, kejar skor tertinggi. <b>Tantangan Harian</b>: map, kesulitan, dan modifier berganti tiap hari. Selesaikan untuk bonus 🪙 ${DAILY_REWARD}.</p>
          <h4>🧬 Trait, Mastery & Evolusi</h4><p>Setiap tower punya <b>Mastery</b> (Lv 1–${UNIT_MAX_LV}, +2% damage per level) yang naik saat tower dipakai. Roll <b>Trait</b> dengan ✨ Kristal untuk bonus acak dari Biasa sampai Mitos. Setelah Mastery Lv ${EVO_REQ.level}, <b>Evolusikan</b> tower dengan 🔮 ${EVO_REQ.stones} Batu Evolusi + 🪙 ${EVO_REQ.coins} untuk bentuk baru dengan kemampuan unik.</p>
          <h4>📈 Progres</h4><p>Setiap selesai bermain kamu mendapat <b>🪙 koin</b> dan <b>XP</b>. Dapatkan unit baru lewat <b>Summon</b> (💎 Diamond dari bermain, atau 💠 Permata untuk Lucky Summon), lalu pasang hingga ${LOADOUT_SIZE} unit di menu <b>Unit</b>. Unit bisa diperdagangkan dengan teman di menu <b>Trading</b>. Kesulitan dan map yang lebih sulit memberi koin lebih banyak.</p>
          <h4>⌨️ Kontrol</h4>
          <table><tr><td><kbd>1</kbd>–<kbd>${LOADOUT_SIZE}</kbd></td><td>Pilih tower</td></tr><tr><td>Klik</td><td>Pasang / pilih tower</td></tr>
          <tr><td><kbd>Shift</kbd> + klik</td><td>Pasang berulang</td></tr><tr><td><kbd>Q</kbd> / <kbd>E</kbd></td><td>Upgrade tower terpilih</td></tr>
          <tr><td><kbd>X</kbd> / <kbd>Del</kbd></td><td>Jual tower terpilih</td></tr><tr><td><kbd>T</kbd></td><td>Ganti mode target</td></tr>
          <tr><td><kbd>Spasi</kbd></td><td>Mulai / skip wave</td></tr><tr><td><kbd>Z</kbd> <kbd>C</kbd> <kbd>V</kbd> <kbd>B</kbd></td><td>Skill pemain</td></tr><tr><td><kbd>F</kbd></td><td>Ganti kecepatan</td></tr>
          <tr><td><kbd>Esc</kbd> / klik kanan</td><td>Batal / pause</td></tr></table>
        </div>`;
    },

    settings() {
      const tg = (k, l) => `<div class="tog"><span>${l}</span><button class="btn sm ${SET[k] ? '' : 'red'}" data-act="tog:${k}">${SET[k] ? 'ON' : 'OFF'}</button></div>`;
      const sl = (k, l) => `<div class="tog"><span>${l}</span><input type="range" min="0" max="1" step="0.05" value="${SET[k]}" data-vol="${k}"></div>`;
      return `${this.header('Pengaturan')}
        <div class="box">
          <h4>🔊 Audio</h4>${tg('sound', 'Efek suara')}${sl('sfxVol', 'Volume efek')}${tg('music', 'Musik latar')}${sl('musicVol', 'Volume musik')}
          <h4>🖥️ Tampilan</h4>${tg('dmgNum', 'Angka damage')}${tg('shake', 'Getaran layar')}${tg('range', 'Jangkauan tower terpilih')}${tg('grid', 'Garis grid')}${tg('fps', 'Tampilkan FPS')}
          <div class="tog"><span>Kualitas partikel</span><button class="btn sm blue" data-act="quality">${SET.quality === 'high' ? 'Tinggi' : 'Rendah'}</button></div>
          <h4>🎮 Permainan</h4>${tg('autoPause', 'Pause otomatis saat pindah tab')}${tg('autoFs', 'Layar penuh otomatis saat bermain (desktop)')}
          <h4>💾 Data</h4>
          <div class="tog"><span>Hapus semua progres (koin, tower, rekor, pencapaian)</span><button class="btn sm red" data-act="reset">${this.resetArm ? 'Yakin? Klik lagi' : 'Reset'}</button></div>
        </div>`;
    },

    daily() {
      const d = dailyChallenge(), ds = dailyState(), m = MAPS[d.map];
      return `${this.header('Tantangan Harian')}
        <div class="box daily">
          <div class="dhead"><canvas width="240" height="144" data-map="${d.map}"></canvas>
            <div><h3>📅 ${d.date}</h3><p><b>${m.name}</b> • ${DIFFS[d.diff].name} • ${DAILY_WAVES} wave</p>
            <p>Status: ${ds.won ? '✅ <b>Selesai</b>' : '⏳ Belum selesai'} • Terbaik hari ini: wave ${ds.best}</p>
            <p>Hadiah: <b class="gold">🪙 ${DAILY_REWARD}</b> (sekali per hari) + skor ×1.2</p></div></div>
          <h4>Modifier hari ini</h4>
          <div class="mods">${d.mods.map(k => `<div class="modc"><span>${MODIFIERS[k].icon}</span><div><b>${MODIFIERS[k].name}</b><small>${MODIFIERS[k].desc}</small></div></div>`).join('')}</div>
          <small class="dim">Tantangan baru setiap tengah malam. Semua pemain mendapat tantangan yang sama di hari yang sama.</small>
        </div>
        <button class="btn red big" data-act="daily">MULAI TANTANGAN ▶</button>`;
    },

    scores() {
      const tab = this.scoreTab || 'local';
      const tabs = [['local', '💾 Lokal'], ['classic', '🌍 Klasik'], ['endless', '♾️ Endless'], ['daily', '📅 Harian'], ['coop', '🤝 Mabar']];
      const tabBar = `<div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${tab === k ? 'on' : ''}" data-act="tab:${k}">${l}</button>`).join('')}</div>`;
      const medal = i => ['🥇', '🥈', '🥉'][i] || '#' + (i + 1);
      if (tab !== 'local') {
        const data = this.lbData && this.lbData[tab];
        const body = !Online.available ? '<p class="dim center">Papan skor global butuh server online.</p>'
          : !data ? '<p class="dim center">Memuat…</p>'
          : !data.length ? '<p class="dim center">Belum ada skor. Jadilah yang pertama!</p>'
          : `<table><tr><th>#</th><th>Pemain</th><th>Skor</th><th>Wave</th><th>Map</th><th>Hasil</th></tr>${data.map((r, i) => `<tr><td>${medal(i)}</td>
              <td class="pl">${this.avatar(r, 26)} ${esc(r.name)}</td><td><b>${r.score.toLocaleString('id-ID')}</b></td><td>${r.wave}</td>
              <td>${(MAPS.find(m => m.id === r.map) || {}).name || '-'}</td><td>${r.won ? '🏆' : '💀'}</td></tr>`).join('')}</table>`;
        return `${this.header('Papan Skor')}${tabBar}<div class="box">${body}</div>${Online.loggedIn ? '' : '<small class="dim">Masuk dengan Google agar skormu tercatat di papan skor global.</small>'}`;
      }
      const runs = PROFILE.runs;
      return `${this.header('Papan Skor')}${tabBar}
        <div class="box">${runs.length ? `<table><tr><th>#</th><th>Skor</th><th>Map</th><th>Mode</th><th>Wave</th><th>Hasil</th><th>Tanggal</th></tr>
          ${runs.map((r, i) => `<tr><td>${medal(i)}</td><td><b>${r.score.toLocaleString('id-ID')}</b></td>
            <td>${(MAPS.find(m => m.id === r.map) || {}).name || r.map}</td>
            <td>${r.coop ? '🤝 Mabar' : r.daily ? '📅 Harian' : MODES[r.mode].name} • ${DIFFS[r.diff].name}</td><td>${r.wave}</td>
            <td>${r.won ? '🏆' : '💀'}</td><td class="dim">${r.date}</td></tr>`).join('')}</table>`
          : '<p class="dim center">Belum ada permainan. Ayo main!</p>'}</div>
        <small class="dim">Skor = wave × 500 + kill × 5 + nyawa × 10 + boss × 1000 + bonus menang, dikali kesulitan & map.</small>`;
    },

    skills() {
      const eq = equippedSkills(), v = PROFILE.vault;
      const priceTxt = id => { const p = SHARED.SKILL_PRICES[id]; return p ? Object.entries(p).map(([c, n]) => `${CURRENCY[c].icon} ${n.toLocaleString('id-ID')}`).join(' + ') : 'Gratis'; };
      return `${this.header('Skill')}
        <div class="box"><h4>Skill terpasang (${eq.length}/${SKILL_SLOTS}) — tombol ${SKILL_KEYS.map(k => `<kbd>${k.toUpperCase()}</kbd>`).join(' ')}</h4>
          <div class="sk-eq">${Array.from({ length: SKILL_SLOTS }, (_, i) => { const a = skillById(eq[i]); return a ? `<div class="sk-slot" style="--c:${a.color}" data-act="skilltog:${a.id}"><span>${a.icon}</span><b>${a.name}</b><small>${SKILL_KEYS[i].toUpperCase()} • CD ${a.cd} dtk</small></div>` : '<div class="sk-slot empty">Kosong</div>'; }).join('')}</div>
          <small class="dim">Buka skill sekali bayar, setelah itu bebas dipakai tanpa batas (hanya cooldown). Pasang maksimal ${SKILL_SLOTS}.</small></div>
        <div class="shopgrid">${ABILITIES.map(a => { const on = eq.includes(a.id), own = skillOwned(a.id);
          return `<div class="sitem ${on ? 'on' : ''} ${own ? '' : 'locked-sk'}"><div class="sic" style="background:${a.color}">${own ? a.icon : '🔒'}</div><div class="sinfo"><b>${a.name} ${on ? '✔' : ''}</b><small>${a.desc}</small><small class="dim">Cooldown ${a.cd} detik</small></div>
            ${own ? `<button class="btn sm ${on ? 'red' : 'blue'}" data-act="skilltog:${a.id}">${on ? 'Lepas' : 'Pasang'}</button>`
                  : `<button class="btn sm gold" data-act="skillbuy:${a.id}">🔓 ${priceTxt(a.id)}</button>`}</div>`; }).join('')}</div>`;
    },

    pause() {
      if (isMP()) return `<h1>🤝 MENU MABAR</h1><div class="sub">Room ${S.mp.room} • ${MAP.name} • Wave ${S.wave} — permainan tetap berjalan</div>
        <div class="mcol">
          <button class="btn big" data-act="resume">▶ Kembali ke Permainan</button>
          <button class="btn gray big" data-act="settings:pause">⚙️ Pengaturan</button>
          <button class="btn red big" data-act="mp-quit">🚪 Keluar dari Mabar</button>
        </div><small class="dim">${isHost() ? 'Kamu host: jika keluar, permainan berakhir untuk semua pemain.' : 'Tower kamu tetap di map setelah keluar.'}</small>`;
      return `<h1>⏸ PAUSE</h1><div class="sub">${MAP.name} • ${DIFFS[S.diff].name} • ${S.daily ? 'Harian' : MODES[S.mode].name} • Wave ${S.wave}${S.maxWave === Infinity ? '' : '/' + S.maxWave}</div>
        <div class="mcol">
          <button class="btn big" data-act="resume">▶ Lanjutkan</button>
          <button class="btn blue big" data-act="${S.daily ? 'daily' : 'start'}">🔄 Ulangi</button>
          <button class="btn gray big" data-act="settings:pause">⚙️ Pengaturan</button>
          <button class="btn red big" data-act="quit">🏠 ${S.wave > 0 ? 'Simpan & Keluar' : 'Keluar ke Menu'}</button>
        </div>${DevPanel.pauseTools()}<small class="dim">${S.wave > 0 ? `Progres tersimpan di awal wave ${S.state === 'ready' ? S.wave + 1 : S.wave}. Lanjutkan dari menu utama.` : ''}</small>`;
    },

    end() {
      const d = this.endData;
      return `<h1 class="${d.won ? 'win' : 'lose'}">${d.won ? '🏆 MENANG!' : '💀 GAME OVER'}</h1>
        <div class="score">${d.score.toLocaleString('id-ID')} <small>poin • peringkat #${d.rank}</small></div>
        ${d.record ? '<span class="badge">⭐ REKOR BARU!</span>' : ''}${d.dailyReward ? `<span class="badge">📅 Tantangan harian selesai! +${d.dailyReward} 🪙</span>` : ''}
        ${d.unlockedSkill ? `<span class="badge purple">⚡ Skill baru: ${d.unlockedSkill.icon} ${d.unlockedSkill.name}</span>` : ''}${d.levelUp ? `<span class="badge purple">⬆ NAIK KE LEVEL ${d.levelUp}!</span>` : ''}
        <div class="box endbox"><table>
          <tr><td>Map</td><td><b>${MAP.name}</b> (${DIFFS[S.diff].name})</td></tr>
          <tr><td>Mode</td><td><b>${isMP() ? '🤝 Mabar • ' + MODES[S.mode].name : S.daily ? '📅 Tantangan Harian' : MODES[S.mode].name}</b></td></tr>
          <tr><td>Wave</td><td><b>${S.wave}${S.maxWave === Infinity ? '' : '/' + S.maxWave}</b></td></tr>
          <tr><td>Musuh dikalahkan</td><td><b>${S.kills}</b> (boss ${S.bossKills})</td></tr>
          <tr><td>Uang didapat</td><td><b>$${S.earned.toLocaleString('id-ID')}</b></td></tr>
          <tr><td>Durasi</td><td><b>${this.fmtTime(S.time)}</b></td></tr>
          <tr><td>Hadiah</td><td><b class="gold">🪙 +${d.coins}</b> &nbsp; <b class="xpc">+${d.xp} XP</b>${d.diamonds ? ` &nbsp; <b>💎 +${d.diamonds}</b>` : ''}${d.crystals ? ` &nbsp; <b>✨ +${d.crystals}</b>` : ''}${d.stones ? ` &nbsp; <b>🔮 +${d.stones}</b>` : ''}${d.lan ? ` &nbsp; <b>${SHARED.LIMITED.icon} +${d.lan}</b>` : ''}</td></tr></table>
          ${d.mastery.length ? `<div class="mlist"><b>Mastery tower</b>${d.mastery.slice(0, 6).map(m => `<div><span>${TOWERS[m.type].name}</span><span>+${m.gain} XP • M${m.lv} ${m.up ? '<b class="up">⬆ NAIK!</b>' : ''}</span></div>`).join('')}</div>` : ''}
          ${d.ach.length ? `<div class="newach">${d.ach.map(a => `🏅 ${a.name}`).join('<br>')}</div>` : ''}</div>
        ${isMP() ? `<div class="row2"><button class="btn big" data-act="go:mabar">🤝 Mabar Lagi</button><button class="btn gray" data-act="quit">🏠 Menu</button></div>`
        : `<div class="row2"><button class="btn big" data-act="${S.daily ? 'daily' : 'start'}">🔄 Main Lagi</button>
          <button class="btn blue" data-act="go:play">🗺️ Pilih Map</button><button class="btn gray" data-act="quit">🏠 Menu</button></div>`}`;
    },
  },

  after: {
    play() { document.querySelectorAll('canvas[data-map]').forEach(c => drawPreview(c, MAPS[+c.dataset.map])); },
    daily() { this.after.play(); },
    units() { this.drawIcons(); },
    shop() { this.drawIcons(); document.querySelectorAll('.gbtn').forEach(el => Online.renderGoogleButton(el)); },
    gacha() { this.drawIcons(); this.tickCd(); },
    trade() { this.drawIcons(); document.querySelectorAll('.gbtn').forEach(el => Online.renderGoogleButton(el)); if (Online.loggedIn && !this.tradeData) this.loadTrades(); },
    tradeNew() {
      this.drawIcons();
      if (!Online.loggedIn) return;
      if (!this.friendsData && !this.loadingF) this.loadFriends();
      const t = this.tn;
      if (t && t.friend && !t.theirs && !t.loading) {
        t.loading = true;
        Online.api('inv.of', null, 'GET', { id: t.friend }).then(r => { t.theirs = r.units; t.loading = false; if (this.screen === 'tradeNew') this.show('tradeNew', true); })
          .catch(e => { t.loading = false; UI.toast('❌ ' + e.message); });
      }
    },
    main() { Online.refreshBadge && Online.refreshBadge(); this.drawIcons(); this.tickCd(); },
    pass() { this.drawIcons(); const sc = $('prScroll'), nx = sc && (sc.querySelector('.pcol2.next') || sc.querySelector('.pcol2.on:last-child')); if (sc && nx && !this._passKeep) sc.scrollLeft = Math.max(0, nx.offsetLeft - sc.clientWidth / 2 + nx.offsetWidth / 2); },
    levels() { this.drawIcons(); },
    event() { this.drawIcons(); this.tickCd(); },
    account() {
      document.querySelectorAll('.gbtn').forEach(el => Online.renderGoogleButton(el)); this.drawIcons();
      const f = $('avFile');
      if (f) f.onchange = () => { const file = f.files && f.files[0]; if (!file) return;
        if (!/^image\//.test(file.type)) return UI.toast('❌ Pilih file gambar');
        const img = new Image(), url = URL.createObjectURL(file);
        img.onload = async () => { URL.revokeObjectURL(url); this.uploadAvatar(await this.avatarFromImage(img)); };
        img.onerror = () => UI.toast('❌ Gambar tidak bisa dibuka'); img.src = url; };
    },
    friends() { document.querySelectorAll('.gbtn').forEach(el => Online.renderGoogleButton(el)); if (Online.loggedIn && !this.loadingF && (!this.friendsData || Date.now() - this.friendsAt > 10000)) this.loadFriends(); },
    mabar() { this.after.friends.call(this); if (Lobby.room) this.after.lobby.call(this); },
    lobby() {
      document.querySelectorAll('canvas[data-map]').forEach(c => drawPreview(c, MAPS[+c.dataset.map]));
      const log = $('lobbyChat'); if (log) log.scrollTop = log.scrollHeight;
      const inp = $('lobbyIn'); if (inp) inp.onkeydown = e => { if (e.key === 'Enter') { Lobby.chat(inp.value); inp.value = ''; } };
      if (Online.loggedIn && !this.loadingF && (!this.friendsData || Date.now() - this.friendsAt > 15000)) this.loadFriends();
    },
    scores() {
      const tab = this.scoreTab || 'local';
      if (tab !== 'local' && Online.available && !(this.lbData && this.lbData[tab])) {
        Online.api('lb.get', null, 'GET', { mode: tab }).then(r => { this.lbData = { ...(this.lbData || {}), [tab]: r.top }; if (this.screen === 'scores') this.show('scores', true); }).catch(() => {});
      }
    },
    settings() {
      document.querySelectorAll('[data-vol]').forEach(r => {
        r.oninput = () => { SET[r.dataset.vol] = +r.value; saveSettings(); Sound.applyVolume(); };
        r.onchange = () => sfx('coin');
      });
    },
  },

  /* ---------- aksi tombol ---------- */
  act(a) {
    const [cmd, arg] = a.split(':');
    switch (cmd) {
      case 'go': this.go(arg); break;
      case 'tab': this.scoreTab = arg; if (arg !== 'local' && this.lbData) delete this.lbData[arg]; this.show('scores', true); break;
      case 'login-dev': Online.devLogin(($('devName') || {}).value || 'Tester'); break;
      case 'logout': Online.logout(); break;
      case 'rename': Online.rename($('accName').value).then(() => { UI.toast('✅ Nama disimpan'); this.show('account', true); }).catch(e => UI.toast('❌ ' + e.message)); break;
      case 'sync': UI.toast('🔄 Menyinkronkan…'); Online.pushProfile().then(() => { UI.toast('✅ Tersimpan di cloud'); this.show('account', true); }); break;
      case 'copy': { const t = a.split(':')[1]; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => UI.toast('📋 Disalin: ' + t)).catch(() => UI.toast('Kode: ' + t)); break; }
      case 'friends-refresh': this.loadFriends(); break;
      case 'friend-add': {
        const code = ($('friendCode') || {}).value;
        Online.api('friends.add', { code }).then(r => { UI.toast(r.accepted ? `🤝 Sekarang berteman dengan ${r.user.name}` : `📤 Permintaan dikirim ke ${r.user.name}`); this.loadFriends(); }).catch(e => UI.toast('❌ ' + e.message));
        break;
      }
      case 'friend-acc': case 'friend-dec':
        Online.api('friends.respond', { id: arg, accept: cmd === 'friend-acc' }).then(() => { Online.requests = Math.max(0, Online.requests - 1); this.loadFriends(); }).catch(e => UI.toast('❌ ' + e.message)); break;
      case 'friend-rm':
        if (this.rmArm !== arg) { this.rmArm = arg; UI.toast('Klik ✕ sekali lagi untuk menghapus teman'); break; }
        this.rmArm = null; Online.api('friends.remove', { id: arg }).then(() => this.loadFriends()); break;
      case 'invite': { const x = this.friendsData && this.friendsData.friends.find(q => q.id === arg); Lobby.invite(arg, x ? x.name : 'teman'); break; }
      case 'join-room': Lobby.join(arg); break;
      case 'room-create': Lobby.create(); break;
      case 'room-join': Lobby.join(($('roomCode') || {}).value); break;
      case 'room-leave': Lobby.leave().then(() => this.show('mabar')); break;
      case 'room-start': Lobby.start(); break;
      case 'lobby-map': Lobby.update({ map: +arg }); break;
      case 'lobby-diff': Lobby.update({ diff: arg }); break;
      case 'lobby-mode': Lobby.update({ mode: arg }); break;
      case 'lobby-chat': { const inp = $('lobbyIn'); if (inp) { Lobby.chat(inp.value); inp.value = ''; } break; }
      case 'mp-quit': MP.leave().then(() => { newGame(); this.show('main'); }); break;
      case 'back':
        this.resetArm = false;
        if (this.screen === 'lobby' || (this.screen === 'mabar' && Lobby.room)) { Lobby.leave(); UI.toast('Kamu keluar dari room'); }
        if (this.ret && this.screen !== this.ret && this.screen !== 'settings') { const r = this.ret; this.ret = null; this.go(r); break; }
        this.ret = null;
        this.go(this.screen === 'settings' ? this.back : 'main'); break;
      case 'settings': this.back = arg; this.go('settings'); break;
      case 'map': MAP = MAPS[+arg]; loadMap(MAP); this.go('play'); break;
      case 'diff': DIFF = arg; this.go('play'); break;
      case 'mode': MODE = arg; this.go('play'); break;
      case 'daily': startGame({ daily: dailyChallenge() }); break;
      case 'continue': sfx('click'); if (loadSavedGame()) { this.close(); autoFullscreen(); UI.banner(`Lanjut: Wave ${S.wave + 1}`, '#fff', 1400); } break;
      case 'discard': SaveGame.clear(); this.go('main'); break;
      case 'start': startGame(); break;
      case 'resume': sfx('click'); this.close(); break;
      case 'quit': if (isMP()) MP.cleanup(); else abandonGame(); newGame(); this.go('main'); break;
      case 'noop': break;
      case 'dev': DevPanel.act(a); break;
      case 'hpull': {
        const btn = document.querySelector(`[data-act="hpull:${arg}"]`); if (btn) btn.classList.add('busy');
        this.banner = 'feat';
        Eco.act('summon', { banner: 'feat', count: +arg }).then(r => { this.show('gacha'); this.showPull(r.units); this.soldToast(r); checkAchievements(null); })
          .catch(e => { if (btn) btn.classList.remove('busy'); sfx('error'); UI.toast('❌ ' + e.message); });
        break;
      }
      case 'updall': this.updAll = true; this.show('updates', true); break;
      case 'mgo': this.ret = 'more'; this.go(arg); break;
      case 'mclaim': { const [, kind, id] = a.split(':'); this.eco('missionClaim', { kind, id }, r => '🎯 ' + this.rw(r)).then(() => this.show(this.screen, true)); break; }
      case 'pclaim': { const [, track, t] = a.split(':'); this.eco('passClaim', { track, tier: +t }, r => '🎫 ' + this.rw(r.claimed[0].got)).then(() => this.show('pass', true)); break; }
      case 'ptab': this.passTab = arg; this.show('pass', true); break;
      case 'lvclaim': this.eco('levelClaim', { lv: arg === 'all' ? 'all' : +arg }, r => r.claimed.length > 1 ? `⭐ ${r.claimed.length} hadiah level diambil!` : '⭐ ' + this.rw(r.claimed[0].got)); break;
      case 'evtab': this.evTab = arg; this.show('event', true); break;
      case 'evm': this.eco('evMission', { id: arg }, r => this.rw(r)); break;
      case 'evms': this.eco('evMilestone', { i: arg === 'all' ? 'all' : +arg }, r => r.claimed.map(g => this.rw(g)).join(' • ')); break;
      case 'evbuy': this.eco('evShopBuy', { id: arg }, r => '🎁 ' + this.rw(r.got)); break;
      case 'evgo': if (arg === 'gacha') { this.banner = 'winter'; this.go('gacha'); } else { const i = MAPS.findIndex(m => m.id === arg); if (i >= 0) { MAP = MAPS[i]; loadMap(MAP); } this.go('play'); } break;
      case 'pshop': { const it = SHARED.PASS_SHOP.find(x => x.id === arg); if (it && (it.cost < 300 || confirm(`Tukar 🎟️ ${it.cost} Token untuk ${it.name}?`))) this.eco('passShopBuy', { id: arg }, r => '🛍️ Didapat: ' + this.rw(r.got)).then(r => { if (r && r.got.unit) this.showPull([r.got.unit]); }); break; }
      case 'pclaimall': this.eco('passClaim', { tier: 'all' }, r => `🎁 ${r.claimed.length} hadiah diambil!`).then(() => this.show('pass', true)); break;
      case 'pbuy': if (confirm(`Aktifkan Season Pass Premium seharga 💠 ${SHARED.PASS.premiumCost} Permata?`)) this.eco('passBuy', {}, () => '⭐ Pass Premium aktif!').then(() => this.show('pass', true)); break;
      case 'install': PWA.install().then(() => this.show('download', true)); break;
      case 'redeem': {
        const code = ($('rcode') || {}).value || '';
        if (!code.trim()) { UI.toast('Masukkan kode'); break; }
        Online.api('redeem', { code }).then(r => { Eco.apply(r.vault); sfx('coin'); const t = this.rw(r.got); UI.toast('🎁 ' + t); const el = $('rres'); if (el) el.innerHTML = `<p class="okmsg">✅ Didapat: ${t}</p>`; $('rcode').value = ''; })
          .catch(e => { sfx('error'); UI.toast('❌ ' + e.message); });
        break;
      }

      case 'unit': this.unitSel = arg; this.rollArm = null; this.scrapArm = null; this.show('units', true);
        if (innerWidth <= 760) { const d = document.querySelector('.udetail'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'start' }); } break;
      case 'ufilter': this.unitFilter = arg; this.show('units', true); break;
      case 'equip': {
        const u = unitById(arg); if (!u) break;
        const same = PROFILE.loadout.findIndex(id => (unitById(id) || {}).type === u.type);
        if (same >= 0) PROFILE.loadout[same] = u.id;
        else if (PROFILE.loadout.length < LOADOUT_SIZE) PROFILE.loadout.push(u.id);
        else { UI.toast('Loadout penuh — lepas unit lain dulu'); break; }
        saveProfile(); sfx('place'); this.show('units', true); break;
      }
      case 'unequip': if (PROFILE.loadout.length > 1) { PROFILE.loadout = PROFILE.loadout.filter(id => id !== arg); saveProfile(); } this.show('units', true); break;
      case 'ulock': { const u = unitById(arg); this.eco('lock', { unitId: arg, lock: !(u && u.lock) }); break; }
      case 'scrap':
        if (this.scrapArm !== arg) { this.scrapArm = arg; this.show('units', true); break; }
        this.scrapArm = null; this.eco('scrap', { unitIds: [arg] }, r => `💰 Terjual: ${this.rw(r)}`); break;
      case 'udtab': this.udTab = arg; this.show('units', true); break;
      case 'sellpanel': this.sellPanel = this.sellPanel ? null : { rars: ['common'], keep: true }; this.show('units', true); break;
      case 'sellrar': { const r = this.sellPanel.rars; this.sellPanel.rars = r.includes(arg) ? r.filter(x => x !== arg) : [...r, arg]; this.show('units', true); break; }
      case 'sellkeep': this.sellPanel.keep = !this.sellPanel.keep; this.show('units', true); break;
      case 'sellgo': this.sellBulk(); break;
      case 'autosell': this.go('autosell'); break;
      case 'astog': { const cur = PROFILE.vault.autoSell || [], nx = cur.includes(arg) ? cur.filter(x => x !== arg) : [...cur, arg]; this.eco('setAutoSell', { rarities: nx }, () => 'Auto Jual: ' + (nx.length ? nx.map(r => RARITY[r].name).join(', ') : 'mati')); break; }
      case 'roll': {
        const u = unitById(arg); if (!u) break;
        if (u.trait && RARITY[TRAITS[u.trait].rarity].rank >= 2 && this.rollArm !== arg) { this.rollArm = arg; this.show('units', true); break; }
        this.rollArm = null;
        Eco.act('rollTrait', { unitId: arg }).then(r => { PROFILE.stats.rolls++; saveProfile(); this.show('units', true); this.animateRoll(r.trait); checkAchievements(null); })
          .catch(e => { sfx('error'); UI.toast('❌ ' + e.message); });
        break;
      }
      case 'evo':
        Eco.act('evolve', { unitId: arg }).then(() => { const u = unitById(arg); sfx('win'); UI.toast(`🧬 Berevolusi menjadi ${EVOS[u.type].name}!`, 'gold', 4000); this.show('units', true); checkAchievements(null); })
          .catch(e => { sfx('error'); UI.toast('❌ ' + e.message); });
        break;
      case 'setskin': { const [, id, skin] = a.split(':'); this.eco('setSkin', { unitId: id, skin }); break; }
      case 'mat': this.eco('buyMaterial', { key: arg, n: +a.split(':')[2] }, r => `${MATERIALS[r.key].icon} +${r.n} ${MATERIALS[r.key].name}`); break;
      case 'buyskill': this.eco('buySkill', { skill: arg, packs: 1 }, r => `${skillById(r.skill).icon} Stok ${skillById(r.skill).name}: ${r.uses}`); break;
      case 'buyskin': this.eco('buySkin', { skin: arg }, r => `🎨 Skin ${SKINS[r.skin].name} dibeli!`); break;
      case 'shoptab': this.shopTab = arg; this.go('shop'); break;
      case 'topup': this.topup(arg); break;
      case 'banner': this.banner = arg; this.show('gacha', true); break;
      case 'pull':
        Eco.act('summon', { banner: this.banner || 'std', count: +arg }).then(r => { this.show('gacha', true); this.showPull(r.units); this.soldToast(r); checkAchievements(null); })
          .catch(e => { sfx('error'); UI.toast('❌ ' + e.message); });
        break;
      case 'avpick': this.avPick = !this.avPick; this.show('account', true); break;
      case 'avreset': this.uploadAvatar(null); break;
      case 'avunit': {
        const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
        const gr = g.createRadialGradient(64, 50, 10, 64, 64, 90); gr.addColorStop(0, RARITY[UNIT_RARITY[arg]].color); gr.addColorStop(1, '#141b36');
        g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
        const ic = document.createElement('canvas'); ic.width = ic.height = 128; drawUnitIcon(ic, arg, 'default', false); g.drawImage(ic, 0, 6);
        this.uploadAvatar(c.toDataURL('image/jpeg', 0.9)); break;
      }
      case 'idx': this.idxSel = arg; this.show('gacha', true); break;
      case 'pullclose': { const el = $('pullResult'); if (el) el.innerHTML = ''; break; }
      case 'skillbuy': this.eco('unlockSkill', { skill: arg }, r => `🔓 Skill ${skillById(r.skill).name} terbuka! Pasang di slot kosong.`).then(r => { if (r && (PROFILE.skillLoadout || []).length < SKILL_SLOTS && !PROFILE.skillLoadout.includes(r.skill)) { PROFILE.skillLoadout.push(r.skill); saveProfile(); this.show('skills', true); } }); break;
      case 'skilltog': {
        if (!skillOwned(arg)) { UI.toast('🔒 Buka skill ini dulu'); break; }
        const eq = PROFILE.skillLoadout || (PROFILE.skillLoadout = []);
        if (eq.includes(arg)) PROFILE.skillLoadout = eq.filter(x => x !== arg);
        else if (eq.length < SKILL_SLOTS) eq.push(arg);
        else { UI.toast(`Maksimal ${SKILL_SLOTS} skill`); break; }
        saveProfile(); sfx('click'); this.show('skills', true); break;
      }
      case 'trefresh': this.tradeData = null; this.loadTrades(); break;
      case 'tnew': this.tn = null; this.go('tradeNew'); break;
      case 'tfriend': this.tn.friend = arg; this.tn.theirs = null; this.show('tradeNew', true); break;
      case 'tback': this.tn = null; this.show('tradeNew', true); break;
      case 'tgive': case 'twant': {
        const k = cmd === 'tgive' ? 'give' : 'want', list = this.tn[k];
        this.tn[k] = list.includes(arg) ? list.filter(x => x !== arg) : list.length < 8 ? [...list, arg] : list;
        this.tn.giveGems = +($('tGiveGems') || {}).value || 0; this.tn.wantGems = +($('tWantGems') || {}).value || 0;
        this.show('tradeNew', true); break;
      }
      case 'tsend': {
        const t = this.tn; t.giveGems = +($('tGiveGems') || {}).value || 0; t.wantGems = +($('tWantGems') || {}).value || 0;
        Online.api('trade.create', { to: t.friend, give: { units: t.give, diamonds: t.giveGems }, want: { units: t.want, diamonds: t.wantGems } })
          .then(() => { UI.toast('📨 Penawaran dikirim!', 'gold'); this.tn = null; this.tradeData = null; this.go('trade'); })
          .catch(e => UI.toast('❌ ' + e.message));
        break;
      }
      case 'taccept':
        Online.api('trade.respond', { id: arg, accept: true }).then(async () => {
          PROFILE.stats.trades = (PROFILE.stats.trades || 0) + 1; saveProfile();
          await Online.refreshVault(); sfx('win'); UI.toast('✅ Trading berhasil!', 'gold'); this.tradeData = null; this.loadTrades(); checkAchievements(null);
        }).catch(e => { UI.toast('❌ ' + e.message); this.tradeData = null; this.loadTrades(); });
        break;
      case 'tdecline': Online.api('trade.respond', { id: arg, accept: false }).then(() => { this.tradeData = null; this.loadTrades(); }); break;
      case 'tcancel': Online.api('trade.cancel', { id: arg }).then(() => { this.tradeData = null; this.loadTrades(); }); break;
      case 'tog': SET[arg] = !SET[arg]; saveSettings(); Sound.applyVolume(); if (arg === 'music' && SET.music) Sound.startMusic(); this.go('settings'); break;
      case 'quality': SET.quality = SET.quality === 'high' ? 'low' : 'high'; saveSettings(); this.go('settings'); break;
      case 'reset':
        if (!this.resetArm) { this.resetArm = true; this.go('settings'); break; }
        this.resetArm = false; resetAllData(); UI.toast('Semua data dihapus'); newGame(); this.go('settings'); break;
    }
  },
  async loadFriends() {
    if (!Online.loggedIn) return;
    this.loadingF = true;
    try {
      this.friendsData = await Online.api('friends.list', null, 'GET'); this.friendsAt = Date.now();
      Online.requests = this.friendsData.incoming.length; Online.refreshUi && document.querySelectorAll('[data-badge="friends"]').forEach(b => b.textContent = Online.requests || '');
      if (['friends', 'mabar', 'lobby', 'tradeNew'].includes(this.screen)) this.show(this.screen, true);
    } catch (e) { UI.toast('❌ ' + e.message); }
    this.loadingF = false;
  },
  /** Perbarui lobby tanpa mengganggu input chat */
  updateLobby() {
    if (this.screen !== 'lobby' && this.screen !== 'mabar') return;
    const inp = $('lobbyIn'), val = inp ? inp.value : '', focused = document.activeElement === inp;
    this.show(this.screen, true);
    const n = $('lobbyIn'); if (n) { n.value = val; if (focused) { n.focus(); n.setSelectionRange(val.length, val.length); } }
  },
  /** Nilai jual sebuah unit */
  sellVal(type) { return SHARED.SCRAP[UNIT_RARITY[type]] || {}; },
  /** Kandidat jual massal: tidak terkunci, tidak di loadout, belum evolusi; sisakan 1 terbaik per jenis */
  sellCandidates(rars, keepOne) {
    const v = PROFILE.vault, byType = {};
    v.units.forEach(u => (byType[u.type] = byType[u.type] || []).push(u));
    const out = [];
    for (const [t, arr] of Object.entries(byType)) {
      if (!rars.includes(UNIT_RARITY[t])) continue;
      const sorted = arr.slice().sort((a, b) => (PROFILE.loadout.includes(b.id) - PROFILE.loadout.includes(a.id)) || b.evo - a.evo || (b.trait ? 1 : 0) - (a.trait ? 1 : 0) || b.xp - a.xp);
      sorted.slice(keepOne ? 1 : 0).forEach(u => { if (!u.lock && !u.evo && !PROFILE.loadout.includes(u.id)) out.push(u); });
    }
    return out;
  },
  sellPanelHtml() {
    const sp = this.sellPanel, list = this.sellCandidates(sp.rars, sp.keep), tot = {};
    list.forEach(u => { for (const [k, n] of Object.entries(this.sellVal(u.type))) tot[k] = (tot[k] || 0) + n; });
    return `<div class="sellbox"><b>💰 Jual Massal</b><div class="seg">${SHARED.AUTO_SELL_OK.map(r => `<button class="${sp.rars.includes(r) ? 'on' : ''}" data-act="sellrar:${r}" style="--rc:${RARITY[r].color}">${RARITY[r].name}</button>`).join('')}</div>
      <label class="chk"><input type="checkbox" ${sp.keep ? 'checked' : ''} data-act="sellkeep"> Sisakan 1 unit terbaik per jenis</label>
      <small class="dim">Unit terkunci 🔒, terpasang & hasil evolusi tidak ikut dijual.</small>
      <div class="sellsum">${list.length} unit → ${this.rw(tot) || '—'}</div>
      <div class="row2"><button class="btn red sm" data-act="sellgo" ${list.length ? '' : 'disabled'}>Jual ${list.length} unit</button><button class="btn gray sm" data-act="sellpanel">Tutup</button></div></div>`;
  },
  unitDetail(u) {
    const d = TOWERS[u.type], ev = EVOS[u.type], es = evoStatus(u), lv = unitLevel(u.xp), lo = unitXpFor(lv), hi = unitXpFor(lv + 1);
    const mpct = lv >= UNIT_MAX_LV ? 100 : Math.min(100, (u.xp - lo) / (hi - lo) * 100), tr = u.trait && TRAITS[u.trait];
    const inLo = PROFILE.loadout.includes(u.id), v = PROFILE.vault, tab = this.udTab || 'stat';
    const L0 = computeL(u.type, 0, u), Lm = computeL(u.type, d.levels.length - 1, u);
    const st = L => L.dmg ? `⚔️ ${fmtNum(L.dmg)} • ⏱ ${L.rate}s • 🎯 ${L.range}${L.goldHit ? ` • 💰 +$${L.goldHit}/hit` : ''}` : L.income ? `💰 $${L.income}/wave` : `▲ +${Math.round(L.buff * 100)}% • 🎯 ${L.range}`;
    const rows = d.levels.map((_, i) => { const L = computeL(u.type, i, u); return `<tr><td>${i}</td><td>${esc(L.name)}</td><td>$${Math.round(d.levels[i].cost * ((tr && tr.costMul) || 1))}</td><td>${st(L)}${L.hidden ? ' • 👁' : ''}${L.pierceArmor ? ' • 🛡' : ''}${L.splash || L.splashHit ? ' • 💥' : ''}${L.slow ? ' • ❄' : ''}${L.chain ? ' • ⚡' + L.chain : ''}${L.dot ? ' • 🔥' : ''}</td></tr>`; }).join('');
    const req = (ok, txt) => `<li class="${ok ? 'ok' : ''}">${ok ? '✅' : '⬜'} ${txt}</li>`;
    const sameType = PROFILE.loadout.map(unitById).find(x => x && x.type === u.type && x.id !== u.id);
    const sv = this.rw(this.sellVal(u.type));
    const tabs = [['stat', '📊 Statistik'], ['trait', '🎲 Trait'], ['evo', '🧬 Evolusi'], ['skin', '🎨 Skin']];
    let body = '';
    if (tab === 'stat') body = `${this.skillRow(u.type)}<div class="ud-st"><div><small>Lv 0</small><b>${st(L0)}</b></div><div><small>Lv ${d.levels.length - 1}</small><b>${st(Lm)}</b></div></div>
        <details><summary>Semua level upgrade</summary><table>${rows}</table></details>`;
    else if (tab === 'trait') body = `<div class="trait-cur" id="traitCur">${tr ? `<span class="ticon">${tr.icon}</span><div><b style="color:${RARITY[tr.rarity].color}">${tr.name}</b> <small>${tr.desc}</small></div>` : '<span class="dim">Belum ada trait</span>'}</div>
        <button class="btn sm purple" data-act="roll:${u.id}" ${v.crystals < 1 ? 'disabled' : ''}>${this.rollArm === u.id ? '⚠️ Yakin? Trait ini akan hilang' : '🎲 Roll Trait — ✨ 1'}</button>
        <details><summary>Peluang trait</summary><div class="odds">${RARITY_ORDER.map(rk => { const r = RARITY[rk], list = Object.values(TRAITS).filter(t => t.rarity === rk), pct = list.reduce((a, t) => a + t.w, 0);
          return list.length ? `<div><b style="color:${r.color}">${r.name} ${pct}%</b><small>${list.map(t => `${t.icon} ${t.name}: ${t.desc}`).join('<br>')}</small></div>` : ''; }).join('')}</div></details>`;
    else if (tab === 'evo') body = `<p><small><b>${ev.name}</b> — ${ev.desc}</small></p>${u.evo ? '<div class="evo-ok">★ Sudah berevolusi</div>' : `<ul class="reqs">${req(es.lvOk, `Mastery Lv ${EVO_REQ.level} (sekarang ${lv})`)}${req(es.stonesOk, `🔮 ${EVO_REQ.stones} Batu Evolusi (punya ${v.stones})`)}${req(es.coinsOk, `🪙 ${EVO_REQ.coins} koin`)}</ul>
        <button class="btn sm gold" data-act="evo:${u.id}" ${es.lvOk && es.stonesOk && es.coinsOk ? '' : 'disabled'}>🧬 EVOLUSI</button>`}`;
    else body = `<div class="skinpick">${v.skins.map(k => `<button class="skb ${u.skin === k || (!u.skin && k === 'default') ? 'on' : ''}" data-act="setskin:${u.id}:${k}" title="${SKINS[k].name}">${SKINS[k].icon}</button>`).join('')}<button class="skb more" data-act="shoptab:skin" title="Beli skin">＋</button></div>`;
    return `<div class="udetail box ud-compact" style="--rc:${RARITY[UNIT_RARITY[u.type]].color}">
      <div class="ud-head"><canvas width="60" height="60" data-icon="${u.type}" data-skin="${u.skin || 'default'}" data-evo="${u.evo ? 1 : 0}"></canvas>
        <div class="ud-t"><b>${this.unitName(u)}${u.evo ? ' ★' : ''}</b><div>${this.rarityTag(u.type)} <span class="tag">${d.role}</span>${tr ? ` <span class="tag" style="border-color:${RARITY[tr.rarity].color}">${tr.icon} ${tr.name}</span>` : ''}${u.tradable === false ? ' <span class="tag gray" title="Tidak bisa ditukar">⛔</span>' : ''}</div>
          <div class="mbar sm"><div style="width:${mpct}%"></div><span>Mastery ${lv}${lv >= UNIT_MAX_LV ? ' • MAKS' : ` • ${u.xp - lo}/${hi - lo}`}</span></div></div></div>
      <div class="ud-act">
        ${inLo ? `<button class="btn sm red" data-act="unequip:${u.id}" ${PROFILE.loadout.length <= 1 ? 'disabled' : ''}>✕ Lepas</button>`
               : `<button class="btn sm" data-act="equip:${u.id}">${sameType ? '⇄ Ganti' : PROFILE.loadout.length >= LOADOUT_SIZE ? 'Penuh' : '＋ Pasang'}</button>`}
        <button class="btn sm gray" data-act="ulock:${u.id}">${u.lock ? '🔓' : '🔒'}</button>
        <button class="btn sm gray" data-act="scrap:${u.id}" ${u.lock || inLo ? 'disabled' : ''} title="Jual unit">💰 ${this.scrapArm === u.id ? 'Yakin?' : 'Jual'} <small>${sv}</small></button>
      </div>
      <p class="ud-desc">${u.evo ? '★ ' + ev.desc : d.desc}</p>
      <div class="seg ud-tabs">${tabs.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="udtab:${k}">${l}</button>`).join('')}</div>
      <div class="ud-body">${body}</div>
    </div>`;
  },
  topupBody() {
    if (!Online.loggedIn) return `<div class="center-box"><div class="big-ic">💠</div><h3>Masuk dulu untuk top up</h3><p class="dim">Permata hasil top up tersimpan aman di akunmu.</p>${this.loginBlock()}</div>`;
    if (!Online.cfg.topup) return `<div class="center-box"><div class="big-ic">🛠️</div><h3>Top up belum aktif</h3><p class="dim">Pembayaran Midtrans belum dikonfigurasi di server.</p></div>`;
    return `<div class="topup">${TOPUP.map(p => `<button class="tpack" data-act="topup:${p.id}">${p.tag ? `<i>${p.tag}</i>` : ''}<span class="tg">💠 ${p.gems.toLocaleString('id-ID')}</span>
      ${p.bonus ? `<small class="bonus">+${p.bonus} bonus</small>` : '<small>&nbsp;</small>'}<b>Rp ${p.price.toLocaleString('id-ID')}</b></button>`).join('')}</div>
      <p class="dim center">Pembayaran diproses Midtrans (QRIS, e-wallet, transfer bank, kartu). Permata masuk otomatis setelah pembayaran berhasil.</p>
      ${Online.cfg.midtransProd ? '' : '<p class="warn center">Mode SANDBOX — gunakan data pembayaran uji Midtrans.</p>'}`;
  },
  /** Animasi hasil summon */
  showPull(units) {
    const el = $('pullResult'); if (!el) return;
    const best = Math.max(...units.map(u => RARITY[UNIT_RARITY[u.type]].rank));
    el.innerHTML = `<div class="pullov ${best >= 3 ? 'gold' : ''}" data-act="pullclose"><div class="pullcards">${units.map((u, i) => `<div class="pcardx r-${UNIT_RARITY[u.type]}" style="--d:${i * 0.18}s">
      <div class="back">?</div><div class="front"><canvas width="80" height="80" data-icon="${u.type}" data-skin="default" data-evo="0"></canvas><b>${TOWERS[u.type].name}</b>${this.rarityTag(u.type)}${u.sold ? '<i class="soldtag">💰 Dijual</i>' : ''}</div></div>`).join('')}</div>
      <small>Klik untuk menutup</small></div>`;
    this.drawIcons(el);
    units.forEach((u, i) => setTimeout(() => sfx(RARITY[UNIT_RARITY[u.type]].rank >= 3 ? 'win' : RARITY[UNIT_RARITY[u.type]].rank >= 2 ? 'achieve' : 'coin'), 300 + i * 180));
  },
  drawIcons(root) { (root || document).querySelectorAll('canvas[data-icon]').forEach(c => drawUnitIcon(c, c.dataset.icon, c.dataset.skin, c.dataset.evo === '1')); (root || document).querySelectorAll('canvas[data-pxi]').forEach(drawPxi); },
  async loadTrades() {
    try { this.tradeData = await Online.api('trade.list', null, 'GET'); if (this.screen === 'trade') this.show('trade', true); }
    catch (e) { UI.toast('❌ ' + e.message); }
  },
  /** Jalankan aksi ekonomi lalu tampilkan ulang layar */
  soldToast(r) { const n = (r.units || []).filter(u => u.sold).length; if (n) setTimeout(() => UI.toast(`💰 Auto Jual: ${n} unit duplikat terjual → ${this.rw(r.sold || {})}`, 'gold', 3500), 900); },
  async sellBulk() {
    const sp = this.sellPanel; if (!sp) return;
    const list = this.sellCandidates(sp.rars, sp.keep).map(u => u.id);
    if (!list.length) return;
    if (!confirm(`Jual ${list.length} unit? Tindakan ini tidak bisa dibatalkan.`)) return;
    const tot = {};
    for (let i = 0; i < list.length; i += 50) {
      try { const r = await Eco.act('scrap', { unitIds: list.slice(i, i + 50) }); for (const k in r) tot[k] = (tot[k] || 0) + r[k]; }
      catch (e) { UI.toast('❌ ' + e.message); break; }
    }
    this.sellPanel = null; sfx('coin'); UI.toast(`💰 ${list.length} unit terjual: ${this.rw(tot)}`, 'gold'); this.show('units', true);
  },
  async eco(action, payload, okMsg) {
    const btn = this.lastBtn; if (btn) btn.classList.add('busy');
    try { const r = await Eco.act(action, payload); if (okMsg) UI.toast(typeof okMsg === 'function' ? okMsg(r) : okMsg, 'gold'); this.show(this.screen, true); return r; }
    catch (e) { sfx('error'); UI.toast('❌ ' + e.message); return null; }
    finally { if (btn) btn.classList.remove('busy'); }
  },
  async topup(packId) {
    try {
      UI.toast('⏳ Membuat transaksi…');
      const r = await Online.api('pay.create', { pack: packId });
      await loadSnap();
      const check = async () => {
        for (let i = 0; i < 6; i++) {
          const st = await Online.api('pay.status', null, 'GET', { order: r.orderId }).catch(() => null);
          if (st && st.status === 'paid') { await Online.refreshVault(); sfx('win'); UI.toast(`💠 Top up berhasil! +${st.gems} Permata`, 'gold', 5000); this.show(this.screen, true); return; }
          if (st && st.status !== 'pending') { UI.toast('Pembayaran ' + st.status); return; }
          await new Promise(res => setTimeout(res, 2500));
        }
        UI.toast('⏳ Pembayaran masih diproses. Permata akan masuk otomatis setelah lunas.', '', 5000);
      };
      if (window.snap) window.snap.pay(r.token, { onSuccess: check, onPending: check, onError: () => UI.toast('❌ Pembayaran gagal'), onClose: check });
      else window.open(r.redirectUrl, '_blank');
    } catch (e) { UI.toast('❌ ' + e.message); }
  },
  saveButton() {
    const g = SaveGame.get(); if (!g) return '';
    const m = MAPS.find(x => x.id === g.map) || MAPS[0];
    return `<div class="controw"><button class="btn gold big" data-act="continue">⏯ Lanjutkan <small>${m.name} • ${g.daily ? 'Harian' : MODES[g.mode].name} • Wave ${g.wave + 1} • $${Math.floor(g.cash)}</small></button>
      <button class="btn gray sm" data-act="discard" title="Hapus simpanan">✕</button></div>`;
  },
  /** Animasi roll trait: acak nama trait beberapa kali sebelum hasil akhir */
  animateRoll(finalId) {
    const el = $('traitCur'), keys = Object.keys(TRAITS); if (!el) return;
    const final = el.innerHTML, box = el.closest('.trait-box');
    let i = 0;
    const show = id => { const t = TRAITS[id]; el.innerHTML = `<span class="ticon">${t.icon}</span><div><b style="color:${RARITY[t.rarity].color}">${t.name}</b></div>`; };
    const iv = setInterval(() => {
      if (++i > 14) {
        clearInterval(iv); el.innerHTML = final;
        const t = TRAITS[finalId], rank = RARITY[t.rarity].rank;
        box.classList.add('flash'); sfx(rank >= 3 ? 'win' : rank >= 2 ? 'achieve' : 'upgrade');
        if (rank >= 3) UI.toast(`🎉 ${RARITY[t.rarity].name}! ${t.icon} ${t.name}`, 'gold', 4000);
        return;
      }
      show(keys[Math.floor(Math.random() * keys.length)]); sfx('click');
    }, 60 + i * 4);
  },
};

/** Desktop: masuk layar penuh saat mulai bermain (dipicu klik, sehingga diizinkan browser) */
function autoFullscreen() {
  const desktop = !matchMedia('(pointer: coarse)').matches && innerWidth > 900;
  if (desktop && SET.autoFs && !document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
}
function startGame(opts = {}) {
  sfx('click');
  if (!opts.daily && !mapOpen(MAP)) { MAP = MAPS[0]; loadMap(MAP); UI.toast('Map event sudah berakhir'); }
  SaveGame.clear();
  newGame(opts);
  PROFILE.stats.games++; saveProfile(); checkAchievements(null);
  Menu.close();
  autoFullscreen();
  UI.banner(opts.daily ? `📅 Tantangan Harian` : `${MAP.name} • ${DIFFS[DIFF].name}`, '#fff', 1400);
  tip('start');
}

/** Muat skrip Midtrans Snap sesuai mode (sandbox / produksi) */
function loadSnap() {
  if (window.snap) return Promise.resolve();
  return new Promise((res, rej) => {
    const sc = document.createElement('script');
    sc.src = Online.cfg.midtransProd ? 'https://app.midtrans.com/snap/snap.js' : 'https://app.sandbox.midtrans.com/snap/snap.js';
    sc.setAttribute('data-client-key', Online.cfg.midtransClientKey || '');
    sc.onload = res; sc.onerror = () => rej(new Error('Gagal memuat Midtrans'));
    document.head.appendChild(sc);
  });
}
