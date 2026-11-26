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
function passReady() {
  const ps = SHARED.rollPass(PROFILE.vault, Date.now()), lv = SHARED.passTier(ps); let n = 0;
  for (let t = 1; t <= lv; t++) { if (!ps.f.includes(t)) n++; if (ps.premium && !ps.p.includes(t)) n++; }
  return n;
}

const Menu = {
  open: false, screen: null, back: 'main', endData: null, resetArm: false, shopSel: 'scout',

  show(scr, quiet) {
    this.open = true; this.screen = scr;
    const o = $('overlay');
    o.style.display = 'flex';
    o.classList.toggle('home-bg', scr === 'main');
    document.body.classList.toggle('on-home', scr === 'main');
    o.innerHTML = `<div class="screen screen-${scr} ${quiet ? 'noanim' : ''}">${this.screens[scr].call(this)}</div>`;
    if (this.after[scr]) this.after[scr].call(this);
    UI.tooltip(null);
  },
  go(scr) { sfx('click'); this.show(scr); },
  /** Hitung mundur [data-cd] (ms epoch) — diperbarui tiap detik */
  tickCd() {
    const els = document.querySelectorAll('[data-cd]'); if (!els.length) return;
    const now = Date.now();
    els.forEach(el => { const s = Math.max(0, Math.floor((+el.dataset.cd - now) / 1000)); el.textContent = `${Math.floor(s / 3600)}j ${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}m ${String(s % 60).padStart(2, '0')}d`; });
  },
  close() { this.open = false; this.screen = null; $('overlay').style.display = 'none'; },

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
      ${inLo && !opts.noEquip ? '<i class="ueq">✔</i>' : ''}${u.lock ? '<i class="ulock">🔒</i>' : ''}${u.tradable === false && opts.showTrade ? '<i class="unt" title="Tidak bisa diperdagangkan">⛔</i>' : ''}</div>`;
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
    return Object.keys(I).filter(k => r[k]).map(k => `${I[k]} ${r[k].toLocaleString('id-ID')}`).concat(r.skin ? [`🎨 ${SKINS[r.skin].name}`] : [], r.unit ? [`🗼 ${TOWERS[r.unit.type || r.unit] ? TOWERS[r.unit.type || r.unit].name : r.unit}`] : [], r.pxp ? [`🎫 ${r.pxp} XP`] : []).join(' • ');
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
      const tile = (act, ic, label, cls, badge = '') => `<button class="ltile ${cls}" data-act="${act}"><span class="lt-ic">${ic}</span><b>${label}</b>${badge}</button>`;
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
      return `<div class="lobby sky-${sky}"><div class="sky"></div><div class="sun"></div><div class="clouds"><i></i><i></i><i></i></div>
          <svg class="hills" viewBox="0 0 1200 300" preserveAspectRatio="none"><path class="h1" d="M0 190 L80 150 L160 170 L260 110 L360 160 L460 120 L560 165 L700 95 L820 150 L940 115 L1060 160 L1200 120 L1200 300 L0 300Z"/><path class="h2" d="M0 240 L120 200 L240 230 L380 190 L520 235 L660 200 L800 238 L940 205 L1080 232 L1200 210 L1200 300 L0 300Z"/></svg>
          <div class="ground"></div></div>
        <div class="lh">
          ${this.announce()}
          <header class="lh-top">
            <button class="lh-prof" data-act="go:account">${this.avatar(u, 46)}
              <div><b>${esc(u ? u.name : 'Tamu')}</b><div class="lvrow"><span class="lvl">Lv ${lv}</span><div class="xpbar"><div style="width:${pct}%"></div></div></div></div></button>
            <div class="lh-cur">${this.currency()}</div>
            <div class="lh-sys">${PWA.installed() ? '' : `<button class="sysb dl" data-act="go:download" title="Download aplikasi">⬇️</button>`}
              <button class="sysb" data-act="go:howto" title="Cara main">❔</button><button class="sysb" data-act="settings:main" title="Pengaturan">⚙️</button></div>
          </header>
          <nav class="lh-left">
            ${tile('go:gacha', '🎰', 'Summon', 'c-gold')}${tile('go:units', '🗼', 'Unit', 'c-purple')}
            ${tile('go:skills', '⚡', 'Skill', 'c-orange')}${tile('go:shop', '🛒', 'Toko', 'c-teal')}
            ${tile('go:missions', '🎯', 'Misi', 'c-green', this.badge(missionsReady()))}${tile('go:pass', '🎫', 'Pass', 'c-pink', this.badge(passReady()))}
            ${tile('go:friends', '👥', 'Teman', 'c-blue', `<span class="badge-dot" data-badge="friends">${Online.requests || ''}</span>`)}${tile('go:more', '☰', 'Lainnya', 'c-gray')}
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
            ${evOn ? `<button class="rcard r-event" data-act="go:play"><span class="rc-ic">🎉</span><div><b>EVENT AKTIF</b><small>${ev.rewardMul > 1 ? `🪙 ×${ev.rewardMul} ` : ''}${ev.diamondMul > 1 ? `💎 ×${ev.diamondMul}` : ''} hadiah bermain</small></div></button>` : ''}
            <button class="rcard r-pass" data-act="go:pass"><span class="rc-ic">🎫</span><div><b>SEASON PASS</b><small>Tier ${pt}/${SHARED.PASS.tiers}${ps.premium ? ' • ⭐' : ''}</small><div class="rc-bar"><div style="width:${ppct}%"></div></div></div>${this.badge(passReady())}</button>
            <button class="rcard r-daily" data-act="go:daily"><span class="rc-ic">📅</span><div><b>TANTANGAN HARIAN</b><small>${dailyState().won ? '✅ Selesai • reset <span data-cd="' + nextDay + '"></span>' : 'Hadiah 🪙 ' + DAILY_REWARD + ' + 💎'}</small></div></button>
            <div class="rcard r-login"><span class="rc-ic">🎁</span><div><b>LOGIN HARIAN</b><small>Hari ke-${streak || 1} • besok 💎 ${nextLogin}</small><small class="dim">Berikutnya <span data-cd="${nextDay}"></span></small></div></div>
          </aside>
          <button class="lh-mis" data-act="go:missions"><b>🎯 MISI HARIAN</b>${misW}</button>
          <div class="lh-play">
            ${save ? `<button class="bigplay cont" data-act="continue"><span class="bp-ic">⏯</span><div><b>LANJUTKAN</b><small>${sm.name} • Wave ${save.wave + 1}</small></div></button>
              <div class="bp-side"><button class="chip" data-act="go:play">＋ Baru</button><button class="chip" data-act="discard">✕ Hapus</button></div>`
            : `<button class="bigplay" data-act="go:play"><span class="bp-ic">▶</span><div><b>MAIN</b><small>${MAP.name} • ${DIFFS[DIFF].name}</small></div></button>`}
          </div>
          <button class="lh-coop" data-act="go:mabar"><span>🤝</span><div><b>MABAR</b><small>Co-op 2–4 pemain</small></div></button>
          <div class="lh-foot">v${VERSION} • ${Online.available ? '🟢 Online' : '⚪ Offline'}</div>
        </div>`;
    },
    more() {
      const u = Online.user, row = (act, ic, t, d) => `<button class="mrow" data-act="${act}"><span>${ic}</span><div><b>${t}</b><small>${d}</small></div><i>›</i></button>`;
      return `${this.header('Lainnya')}<div class="mlist">
        ${row('mgo:trade', '🔁', 'Trading', u ? 'Tukar unit dengan teman' : 'Perlu login')}
        ${row('mgo:redeem', '🎁', 'Kode Redeem', 'Tukar kode hadiah')}
        ${row('mgo:scores', '🏆', 'Papan Skor', 'Lokal & global')}
        ${row('mgo:achievements', '🏅', 'Pencapaian', `${PROFILE.achievements.length}/${ACHIEVEMENTS.length}`)}
        ${row('mgo:stats', '📊', 'Statistik', PROFILE.stats.games + ' game')}
        ${row('mgo:download', '📲', 'Download Aplikasi', PWA.installed() ? 'Sudah terpasang' : 'Android • iPhone • PC')}
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
      const cell = (tr, t) => {
        const rw = SHARED.passReward(tr, t, ps.season), got = ps[tr].includes(t), open = t <= lv && (tr === 'f' || ps.premium);
        const first = this.rw(rw).split(' • ')[0].split(' '), more = Object.keys(rw).filter(k => rw[k] && k !== 'premiumUnit').length > 1 ? '+' : '';
        const ic = rw.unit ? '🗼' : rw.skin ? '🎨' : first[0];
        const lab = rw.unit ? (TOWERS[rw.unit] ? TOWERS[rw.unit].name : rw.unit) : rw.skin ? SKINS[rw.skin].name : first.slice(1).join(' ') + more;
        return `<button class="pc ${tr} ${got ? 'got' : open ? 'open' : ''} ${tr === 'p' && !ps.premium ? 'lock' : ''}" ${open && !got ? `data-act="pclaim:${tr}:${t}"` : 'data-act="noop"'} title="${esc(this.rw(rw))}">
          <span>${ic}</span><small>${esc(lab)}</small>${got ? '<i>✓</i>' : tr === 'p' && !ps.premium ? '<i>🔒</i>' : ''}</button>`;
      };
      let cols = '';
      for (let t = 1; t <= P.tiers; t++) cols += `<div class="pcol ${t <= lv ? 'reached' : ''}"><b>${t}</b>${cell('f', t)}${cell('p', t)}</div>`;
      const ready = passReady();
      return `${this.header('🎫 Season Pass')}
        <div class="box passhead"><div><h3>${SHARED.seasonName(ps.season)}</h3><small class="dim">Berakhir ${days} hari lagi • XP dari bermain & misi</small></div>
          <div class="plv"><b>Tier ${lv}/${P.tiers}</b><div class="xpbar wide"><div style="width:${pct}%"></div></div><small>${lv >= P.tiers ? 'MAKS' : `${into}/${P.xpPerTier} XP`}</small></div>
          <div class="prow">${ready ? `<button class="btn green" data-act="pclaimall">🎁 Ambil semua (${ready})</button>` : ''}
          ${ps.premium ? '<span class="rar" style="background:#e040fb">⭐ PREMIUM AKTIF</span>' : `<button class="btn gold" data-act="pbuy">⭐ Premium • 💠 ${P.premiumCost}</button>`}</div></div>
        <div class="passrail"><div class="pcol plabels"><b>&nbsp;</b><span>Gratis</span><span>⭐ Premium</span></div>${cols}</div>
        <small class="dim">Premium: unit Mitos di tier 30, skin eksklusif di tier 15, dan bonus tiap tier. Season reset setiap awal bulan.</small>`;
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
        <small class="dim">Progres yang sudah ada di perangkat ini akan ikut disimpan ke akunmu.</small></div>`;
      const ago = Online.lastSync ? Math.max(0, Math.round((Date.now() - Online.lastSync) / 1000)) : null;
      return `${this.header('Akun')}
        <div class="acc">
          <div class="box acc-card">${this.avatar(u, 84)}
            <div class="field"><label>Nama pemain</label><div class="inrow"><input id="accName" value="${esc(u.name)}" maxlength="20"><button class="btn sm" data-act="rename">Simpan</button></div></div>
            <div class="field"><label>Kode teman</label><div class="inrow"><code class="fcode">${u.friendCode}</code><button class="btn sm blue" data-act="copy:${u.friendCode}">Salin</button></div>
              <small class="dim">Bagikan kode ini agar temanmu bisa menambahkanmu.</small></div>
          </div>
          <div class="box">
            <h4>☁️ Cloud Save</h4>
            <p>Status: ${Online.syncing ? '⏳ Menyinkronkan…' : '✅ Aktif'} ${ago !== null ? `<span class="dim">• terakhir ${ago < 60 ? ago + ' detik' : Math.round(ago / 60) + ' menit'} lalu</span>` : ''}</p>
            <p class="dim">Progres disimpan otomatis setiap ada perubahan.</p>
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
        return p ? `<div class="slotp" style="--pc:${PLAYER_COLORS[i]}">${this.avatar(p, 56)}<b>${esc(p.name)}${p.id === me ? ' (kamu)' : ''}</b><small>Lv ${p.level}${p.id === r.host ? ' • 👑 Host' : ''}</small></div>`
                 : `<div class="slotp empty"><div class="av">＋</div><b>Kosong</b><small>Menunggu pemain</small></div>`;
      }).join('');
      const m = MAPS[r.map] || MAPS[0];
      const sel = (act, opts, cur) => opts.map(([k, l]) => `<button class="btn sm ${cur === k ? 'sel' : 'gray'}" data-act="${act}:${k}" ${host ? '' : 'disabled'}>${l}</button>`).join('');
      const f = this.friendsData, online = f ? f.friends.filter(x => x.online && !r.players.some(p => p.id === x.id)) : [];
      return `${this.header('Lobby')}
        <div class="lobby">
          <div class="lcol">
            <div class="box roomcode"><small>KODE ROOM</small><code>${r.code}</code><button class="btn sm blue" data-act="copy:${r.code}">Salin</button></div>
            <div class="slots" id="lobbyPlayers">${slots}</div>
            <div class="box" id="lobbySettings">
              <div class="lset"><canvas width="160" height="96" data-map="${r.map}"></canvas>
                <div><b>${m.name}</b> <span class="stars">${'★'.repeat(m.stars)}</span><br><small class="dim">${m.desc}</small></div></div>
              <div class="lopts"><span>Map</span>${sel('lobby-map', MAPS.map((x, i) => [String(i), x.name]), String(r.map))}</div>
              <div class="lopts"><span>Kesulitan</span>${sel('lobby-diff', Object.entries(DIFFS).map(([k, d]) => [k, d.name]), r.diff)}</div>
              <div class="lopts"><span>Mode</span>${sel('lobby-mode', Object.entries(MODES).map(([k, d]) => [k, d.name]), r.mode)}</div>
              ${host ? '' : '<small class="dim">Hanya host yang bisa mengubah pengaturan.</small>'}
            </div>
          </div>
          <div class="rcol">
            <div class="box chatbox"><h4>💬 Chat</h4><div class="clog" id="lobbyChat">${(r.chat || []).slice(-30).map(c => `<div><b>${esc(c.n)}:</b> ${esc(c.t)}</div>`).join('') || '<div class="dim">Belum ada pesan</div>'}</div>
              <div class="inrow"><input id="lobbyIn" placeholder="Ketik pesan…" maxlength="140"><button class="btn sm" data-act="lobby-chat">Kirim</button></div></div>
            <div class="box"><h4>📨 Undang teman online</h4>${!f ? '<p class="dim">Memuat…</p>' : online.length ? online.map(x => `<div class="frow">${this.avatar(x, 32)}<div class="fi"><b>${esc(x.name)}</b></div><button class="btn sm purple" data-act="invite:${x.id}">Undang</button></div>`).join('') : '<p class="dim">Tidak ada teman online. Bagikan kode room!</p>'}</div>
          </div>
        </div>
        <div class="row2">
          <button class="btn red" data-act="room-leave">🚪 Keluar Room</button>
          ${host ? `<button class="btn big" data-act="room-start">MULAI ▶ <small>${r.players.length} pemain</small></button>` : '<div class="waiting">⏳ Menunggu host memulai…</div>'}
        </div>`;
    },

    play() {
      return `${this.header('Pilih Map')}
        <div class="cards">${MAPS.map((m, i) => {
          const b = PROFILE.best[bestKey(m.id, DIFF, MODE)] || 0, won = MODE === 'classic' && b >= DIFFS[DIFF].waves;
          return `<div class="card ${MAP === m ? 'sel' : ''}" data-act="map:${i}">
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
      const filters = [['all', 'Semua'], ['equip', 'Terpasang'], ...RARITY_ORDER.map(r => [r, RARITY[r].name])].reverse().reverse();
      return `${this.header('Unit')}
        <div class="lo-row"><b>Loadout</b><div class="lo-slots">${slots}</div></div>
        <div class="unitwrap">
          <div class="box inv">
            <div class="tabs sm">${filters.map(([k, l]) => `<button class="tab ${f === k ? 'on' : ''}" data-act="ufilter:${k}">${l}</button>`).join('')}</div>
            <div class="ugrid">${list.map(x => this.unitCard(x, { sel: x.id === this.unitSel })).join('') || '<p class="dim">Tidak ada unit</p>'}</div>
            <div class="row2"><button class="btn gold" data-act="go:gacha">🎰 Summon unit baru</button></div>
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
      else if (tab === 'skin') body = `<div class="shopgrid skins">${Object.entries(SKINS).filter(([k]) => k !== 'default').map(([k, sk]) => {
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
      const ban = this.banner || 'std', v = PROFILE.vault, feat = SHARED.featuredUnit(Date.now());
      const lucky = ban === 'lucky', cfg = lucky ? LUCKY : GACHA, cur = lucky ? 'gems' : 'diamonds', icon = lucky ? '💠' : '💎', bal = v[cur] || 0;
      const rates = Object.entries(cfg.rates).map(([r, p]) => `<span class="rate" style="--rc:${RARITY[r].color}">${RARITY[r].name} ${p}%</span>`).join('');
      const pool = RARITY_ORDER.slice().reverse().map(r => `<div class="pool"><b style="color:${RARITY[r].color}">${RARITY[r].name}</b> ${SHARED.unitsOfRarity(r).map(t => TOWERS[t].name).join(', ')}</div>`).join('');
      return `${this.header('Summon')}
        <div class="tabs">${Object.entries(GACHA.banners).map(([k, b]) => `<button class="tab ${ban === k ? 'on' : ''} ${k === 'lucky' ? 'lucky-tab' : ''}" data-act="banner:${k}">${b.name}</button>`).join('')}</div>
        <div class="gacha box ${ban}">
          <div class="gleft">
            <h3>${GACHA.banners[ban].name}</h3><p class="dim">${GACHA.banners[ban].desc}</p>
            ${ban === 'feat' ? `<div class="featured"><canvas width="96" height="96" data-icon="${feat}" data-skin="default" data-evo="0"></canvas><div><small>UNIT UNGGULAN HARI INI</small><b>${TOWERS[feat].name}</b>${this.rarityTag(feat)}<small>${TOWERS[feat].desc}</small></div></div>`
              : `<div class="gacha-art">${lucky ? '🍀' : '🎰'}</div>`}
            <div class="rates">${rates}</div>
            <p class="dim">Pity: <b>${v.pity[ban] || 0}/${cfg.pity}</b> — Legendaris dijamin di tarikan ke-${cfg.pity}. 10× menjamin minimal 1 ${lucky ? 'Legendaris' : 'Epik'}.</p>
          </div>
          <div class="gright">
            <div class="gem-bal ${lucky ? '' : 'dia'}">${icon} ${bal.toLocaleString('id-ID')}</div>
            <button class="btn big gold" data-act="pull:1" ${bal < cfg.cost1 ? 'disabled' : ''}>Summon ×1 <small>${icon} ${cfg.cost1}</small></button>
            <button class="btn big purple" data-act="pull:10" ${bal < cfg.cost10 ? 'disabled' : ''}>Summon ×10 <small>${icon} ${cfg.cost10} (hemat 10%)</small></button>
            ${lucky ? `<button class="btn blue" data-act="shoptab:topup">💠 Top Up Permata</button>` : `<small class="dim center">💎 Diamond didapat dari menyelesaikan wave, mengalahkan boss, menang, login harian & pencapaian.</small>`}
          </div>
        </div>
        <details class="box"><summary>Daftar unit per kelangkaan</summary>${pool}</details>
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
          <h4>🎮 Permainan</h4>${tg('autoPause', 'Pause otomatis saat pindah tab')}
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
          <tr><td>Hadiah</td><td><b class="gold">🪙 +${d.coins}</b> &nbsp; <b class="xpc">+${d.xp} XP</b>${d.diamonds ? ` &nbsp; <b>💎 +${d.diamonds}</b>` : ''}${d.crystals ? ` &nbsp; <b>✨ +${d.crystals}</b>` : ''}${d.stones ? ` &nbsp; <b>🔮 +${d.stones}</b>` : ''}</td></tr></table>
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
    gacha() { this.drawIcons(); },
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
    account() { document.querySelectorAll('.gbtn').forEach(el => Online.renderGoogleButton(el)); },
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
      case 'continue': sfx('click'); if (loadSavedGame()) { this.close(); UI.banner(`Lanjut: Wave ${S.wave + 1}`, '#fff', 1400); } break;
      case 'discard': SaveGame.clear(); this.go('main'); break;
      case 'start': startGame(); break;
      case 'resume': sfx('click'); this.close(); break;
      case 'quit': if (isMP()) MP.cleanup(); else abandonGame(); newGame(); this.go('main'); break;
      case 'noop': break;
      case 'dev': DevPanel.act(a); break;
      case 'hpull': {
        const btn = document.querySelector(`[data-act="hpull:${arg}"]`); if (btn) btn.classList.add('busy');
        this.banner = 'feat';
        Eco.act('summon', { banner: 'feat', count: +arg }).then(r => { this.show('gacha'); this.showPull(r.units); checkAchievements(null); })
          .catch(e => { if (btn) btn.classList.remove('busy'); sfx('error'); UI.toast('❌ ' + e.message); });
        break;
      }
      case 'mgo': this.ret = 'more'; this.go(arg); break;
      case 'mclaim': { const [, kind, id] = a.split(':'); this.eco('missionClaim', { kind, id }, r => '🎯 ' + this.rw(r)).then(() => this.show('missions', true)); break; }
      case 'pclaim': { const [, track, t] = a.split(':'); this.eco('passClaim', { track, tier: +t }, r => '🎫 ' + this.rw(r.claimed[0].got)).then(() => this.show('pass', true)); break; }
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

      case 'unit': this.unitSel = arg; this.rollArm = null; this.scrapArm = null; this.show('units', true); break;
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
        this.scrapArm = null; this.eco('scrap', { unitIds: [arg] }, r => `♻️ Didapat: ${['coins', 'crystals', 'stones'].filter(k => r[k]).map(k => ({ coins: '🪙', crystals: '✨', stones: '🔮' })[k] + ' ' + r[k]).join(' ')}`); break;
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
        Eco.act('summon', { banner: this.banner || 'std', count: +arg }).then(r => { this.show('gacha', true); this.showPull(r.units); checkAchievements(null); })
          .catch(e => { sfx('error'); UI.toast('❌ ' + e.message); });
        break;
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
  unitDetail(u) {
    const d = TOWERS[u.type], ev = EVOS[u.type], es = evoStatus(u), lv = unitLevel(u.xp), lo = unitXpFor(lv), hi = unitXpFor(lv + 1);
    const mpct = lv >= UNIT_MAX_LV ? 100 : Math.min(100, (u.xp - lo) / (hi - lo) * 100), tr = u.trait && TRAITS[u.trait];
    const inLo = PROFILE.loadout.includes(u.id), v = PROFILE.vault;
    const rows = d.levels.map((_, i) => { const L = computeL(u.type, i, u); return `<tr><td>${i}</td><td>${esc(L.name)}</td><td>$${Math.round(d.levels[i].cost * ((tr && tr.costMul) || 1))}</td><td>${
      L.dmg ? `${L.dmg} dmg • ${L.range}r • ${L.rate}s` : L.income ? `$${L.income}/wave` : `+${Math.round(L.buff * 100)}% • ${L.range}r`}${
      L.hidden ? ' • 👁' : ''}${L.pierceArmor ? ' • 🛡' : ''}${L.splash || L.splashHit ? ' • 💥' : ''}${L.slow ? ' • ❄' : ''}${L.chain ? ' • ⚡' + L.chain : ''}${L.dot ? ' • 🔥' : ''}${L.line ? ' • ➖' : ''}</td></tr>`; }).join('');
    const req = (ok, txt) => `<li class="${ok ? 'ok' : ''}">${ok ? '✅' : '⬜'} ${txt}</li>`;
    const sameType = PROFILE.loadout.map(unitById).find(x => x && x.type === u.type && x.id !== u.id);
    return `<div class="udetail">
      <div class="box">
        <div class="ph"><canvas width="72" height="72" data-icon="${u.type}" data-skin="${u.skin || 'default'}" data-evo="${u.evo ? 1 : 0}"></canvas>
          <div><h3>${this.unitName(u)} ${u.evo ? `<small class="dim">(${d.name})</small>` : ''}</h3>${this.rarityTag(u.type)} <span class="tag">${d.role}</span>
          ${u.tradable === false ? '<span class="tag gray" title="Unit awal/impor">⛔ Tidak bisa ditukar</span>' : ''}</div></div>
        <p>${u.evo ? '★ ' + ev.desc : d.desc}</p>
        <div class="mastery"><b>Mastery Lv ${lv}</b> <small class="dim">+${Math.round((lv - 1) * MASTERY_BONUS * 100)}% damage</small>
          <div class="mbar"><div style="width:${mpct}%"></div><span>${lv >= UNIT_MAX_LV ? 'MAKS' : `${u.xp - lo} / ${hi - lo} XP`}</span></div></div>
        <table><tr><th>Lv</th><th>Upgrade</th><th>Harga</th><th>Statistik</th></tr>${rows}</table>
        <div class="row2">
          ${inLo ? `<button class="btn red" data-act="unequip:${u.id}" ${PROFILE.loadout.length <= 1 ? 'disabled' : ''}>Lepas dari loadout</button>`
                 : `<button class="btn" data-act="equip:${u.id}">${sameType ? 'Ganti ' + this.unitName(sameType) : PROFILE.loadout.length >= LOADOUT_SIZE ? 'Loadout penuh' : 'Pasang ke loadout'}</button>`}
          <button class="btn sm gray" data-act="ulock:${u.id}">${u.lock ? '🔓 Buka kunci' : '🔒 Kunci'}</button>
          <button class="btn sm red" data-act="scrap:${u.id}" ${u.lock || inLo ? 'disabled' : ''} title="Hancurkan untuk material">♻️ ${this.scrapArm === u.id ? 'Yakin?' : 'Hancurkan'}</button>
        </div>
      </div>
      <div class="box2">
        <div class="box trait-box" style="${tr ? `border-color:${RARITY[tr.rarity].color}` : ''}">
          <h4>🎲 Trait</h4>
          <div class="trait-cur" id="traitCur">${tr ? `<span class="ticon">${tr.icon}</span><div><b style="color:${RARITY[tr.rarity].color}">${tr.name}</b> <span class="rar" style="background:${RARITY[tr.rarity].color}">${RARITY[tr.rarity].name}</span><small>${tr.desc}</small></div>` : '<span class="dim">Belum ada trait</span>'}</div>
          <button class="btn purple" data-act="roll:${u.id}" ${v.crystals < 1 ? 'disabled' : ''}>${this.rollArm === u.id ? '⚠️ Yakin? Trait ini akan hilang' : '🎲 Roll Trait — ✨ 1'}</button>
          <details><summary>Peluang trait</summary><div class="odds">${Object.entries(RARITY).map(([rk, r]) => {
            const list = Object.values(TRAITS).filter(t => t.rarity === rk), pct = list.reduce((a, t) => a + t.w, 0);
            return `<div><b style="color:${r.color}">${r.name} ${pct}%</b><small>${list.map(t => `${t.icon} ${t.name}: ${t.desc}`).join('<br>')}</small></div>`; }).join('')}</div></details>
        </div>
        <div class="box evo-box ${u.evo ? 'done' : ''}">
          <h4>🧬 Evolusi → ${ev.name}</h4>
          <p><small>${ev.desc}</small></p>
          ${u.evo ? '<div class="evo-ok">★ Sudah berevolusi</div>' : `<ul class="reqs">${req(es.lvOk, `Mastery Lv ${EVO_REQ.level} (sekarang ${lv})`)}${req(es.stonesOk, `🔮 ${EVO_REQ.stones} Batu Evolusi (punya ${v.stones})`)}${req(es.coinsOk, `🪙 ${EVO_REQ.coins} koin`)}</ul>
            <button class="btn gold" data-act="evo:${u.id}" ${es.lvOk && es.stonesOk && es.coinsOk ? '' : 'disabled'}>🧬 EVOLUSI</button>`}
        </div>
        <div class="box"><h4>🎨 Skin</h4><div class="skinpick">${v.skins.map(k => `<button class="skb ${u.skin === k || (!u.skin && k === 'default') ? 'on' : ''}" data-act="setskin:${u.id}:${k}" title="${SKINS[k].name}">${SKINS[k].icon}</button>`).join('')}
          <button class="skb more" data-act="shoptab:skin" title="Beli skin">＋</button></div></div>
      </div>
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
      <div class="back">?</div><div class="front"><canvas width="80" height="80" data-icon="${u.type}" data-skin="default" data-evo="0"></canvas><b>${TOWERS[u.type].name}</b>${this.rarityTag(u.type)}</div></div>`).join('')}</div>
      <small>Klik untuk menutup</small></div>`;
    this.drawIcons(el);
    units.forEach((u, i) => setTimeout(() => sfx(RARITY[UNIT_RARITY[u.type]].rank >= 3 ? 'win' : RARITY[UNIT_RARITY[u.type]].rank >= 2 ? 'achieve' : 'coin'), 300 + i * 180));
  },
  drawIcons(root) { (root || document).querySelectorAll('canvas[data-icon]').forEach(c => drawUnitIcon(c, c.dataset.icon, c.dataset.skin, c.dataset.evo === '1')); },
  async loadTrades() {
    try { this.tradeData = await Online.api('trade.list', null, 'GET'); if (this.screen === 'trade') this.show('trade', true); }
    catch (e) { UI.toast('❌ ' + e.message); }
  },
  /** Jalankan aksi ekonomi lalu tampilkan ulang layar */
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

function startGame(opts = {}) {
  sfx('click');
  SaveGame.clear();
  newGame(opts);
  PROFILE.stats.games++; saveProfile(); checkAchievements(null);
  Menu.close();
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
