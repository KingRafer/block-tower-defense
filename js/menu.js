/* =========================================================
 * Sistem menu: utama, pilih map, tower (toko & loadout),
 * pencapaian, statistik, pengaturan, cara main, pause, hasil
 * ========================================================= */
'use strict';

const Menu = {
  open: false, screen: null, back: 'main', endData: null, resetArm: false, shopSel: 'scout',

  show(scr) {
    this.open = true; this.screen = scr;
    const o = $('overlay');
    o.style.display = 'flex';
    o.innerHTML = `<div class="screen screen-${scr}">${this.screens[scr].call(this)}</div>`;
    if (this.after[scr]) this.after[scr].call(this);
    UI.tooltip(null);
  },
  go(scr) { sfx('click'); this.show(scr); },
  close() { this.open = false; this.screen = null; $('overlay').style.display = 'none'; },

  /* ---------- helper tampilan ---------- */
  profileBar() {
    const lv = levelFromXp(PROFILE.xp), lo = lv > 1 ? xpForLevel(lv - 1) : 0, hi = xpForLevel(lv);
    const pct = Math.min(100, (PROFILE.xp - lo) / (hi - lo) * 100);
    return `<div class="pbar"><div class="lvl">Lv ${lv}</div>
      <div class="xp"><div style="width:${pct}%"></div><span>${PROFILE.xp - lo} / ${hi - lo} XP</span></div>
      <div class="coins">🪙 ${PROFILE.coins.toLocaleString('id-ID')}</div></div>`;
  },
  header(title) { return `<div class="mhead"><button class="btn gray" data-act="back">← Kembali</button><h2>${title}</h2>${this.profileBar()}</div>`; },
  fmtTime(s) { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h}j ${m}m` : m ? `${m}m ${s % 60}d` : `${s}d`; },

  /* ---------- layar ---------- */
  screens: {
    main() {
      const achN = PROFILE.achievements.length;
      return `${this.profileBar()}
        <div class="logo"><span>🧱</span><h1>BLOCK<br>TOWER DEFENSE</h1><div class="sub">Pertahankan base dari gelombang zombie kotak!</div></div>
        <div class="mcol">
          <button class="btn big" data-act="go:play">▶ MAIN</button>
          <button class="btn purple big" data-act="go:towers">🗼 Tower & Loadout</button>
          <div class="mgrid">
            <button class="btn gold" data-act="go:achievements">🏅 Pencapaian <small>${achN}/${ACHIEVEMENTS.length}</small></button>
            <button class="btn gray" data-act="go:stats">📊 Statistik</button>
            <button class="btn blue" data-act="go:howto">📖 Cara Main</button>
            <button class="btn gray" data-act="settings:main">⚙️ Pengaturan</button>
          </div>
        </div>
        <div class="foot">v${VERSION} • ${MAPS.length} map • ${TOWER_ORDER.length} tower • ${Object.keys(ENEMIES).length - 1} musuh</div>`;
    },

    play() {
      return `${this.header('Pilih Map')}
        <div class="cards">${MAPS.map((m, i) => {
          const b = PROFILE.best[m.id + '_' + DIFF] || 0, won = b >= DIFFS[DIFF].waves;
          return `<div class="card ${MAP === m ? 'sel' : ''}" data-act="map:${i}">
            <canvas width="200" height="120" data-map="${i}"></canvas>
            <div class="nm">${m.name} ${won ? '🏆' : ''}</div>
            <div class="stars">${'★'.repeat(m.stars)}${'☆'.repeat(4 - m.stars)}</div>
            <small>${m.desc}</small><div class="best">Rekor: wave ${b}</div></div>`;
        }).join('')}</div>
        <h3>Kesulitan</h3>
        <div class="diffs">${Object.entries(DIFFS).map(([k, d]) => `<button class="btn ${DIFF === k ? 'sel' : ''}" style="background:${d.color}" data-act="diff:${k}">
          ${d.name}<small>${d.waves} wave • ❤️ ${d.hp} • $${d.cash} • 🪙×${d.coinMul}</small></button>`).join('')}</div>
        <div class="loadout-mini">Loadout: ${PROFILE.loadout.map(k => `<i title="${TOWERS[k].name}" style="background:${TOWERS[k].color}"></i>`).join('')}
          <button class="btn purple sm" data-act="go:towers">Ubah</button></div>
        <button class="btn big" data-act="start">MULAI ▶</button>`;
    },

    towers() {
      const sel = this.shopSel, d = TOWERS[sel], owned = PROFILE.unlocked.includes(sel), inLo = PROFILE.loadout.includes(sel);
      const rows = d.levels.map((L, i) => `<tr><td>${i}</td><td>${esc(L.name)}</td><td>$${L.cost}</td><td>${
        L.dmg ? `${L.dmg} dmg • ${L.range}r • ${L.rate}s` : L.income ? `$${L.income}/wave` : `+${L.buff * 100}% • ${L.range}r`}${
        L.hidden ? ' • 👁' : ''}${L.pierceArmor ? ' • 🛡' : ''}${L.splash ? ' • 💥' : ''}${L.slow ? ' • ❄' : ''}${L.grantHidden ? ' • 📡' : ''}</td></tr>`).join('');
      let action;
      if (!owned) action = `<button class="btn gold" data-act="buy:${sel}" ${PROFILE.coins < d.unlock ? 'disabled' : ''}>🔓 Buka — 🪙 ${d.unlock}</button>`;
      else if (inLo) action = `<button class="btn red" data-act="lo-rem:${sel}" ${PROFILE.loadout.length <= 1 ? 'disabled' : ''}>Keluarkan dari loadout</button>`;
      else action = `<button class="btn" data-act="lo-add:${sel}" ${PROFILE.loadout.length >= LOADOUT_SIZE ? 'disabled' : ''}>Masukkan ke loadout</button>`;
      return `${this.header('Tower & Loadout')}
        <div class="loadout">${Array.from({ length: LOADOUT_SIZE }, (_, i) => {
          const k = PROFILE.loadout[i];
          return k ? `<div class="lslot" data-act="shop:${k}"><div class="ico" style="background:${TOWERS[k].color}"></div>${TOWERS[k].name}</div>`
                   : `<div class="lslot empty">Kosong</div>`;
        }).join('')}</div>
        <div class="shop">
          <div class="tlist">${TOWER_ORDER.map(k => {
            const o = PROFILE.unlocked.includes(k);
            return `<div class="titem ${k === sel ? 'sel' : ''} ${o ? '' : 'locked'}" data-act="shop:${k}">
              <div class="ico" style="background:${TOWERS[k].color}">${o ? '' : '🔒'}</div>
              <div><b>${TOWERS[k].name}</b><small>${o ? (PROFILE.loadout.includes(k) ? '✔ Di loadout' : 'Dimiliki') : '🪙 ' + TOWERS[k].unlock}</small></div></div>`;
          }).join('')}</div>
          <div class="tdetail box">
            <div class="ph"><div class="pico" style="background:${d.color}"></div><div><h3>${d.name}</h3><span class="tag">${d.role}</span></div></div>
            <p>${d.desc}</p>
            <table><tr><th>Lv</th><th>Upgrade</th><th>Harga</th><th>Statistik</th></tr>${rows}</table>
            <small class="dim">👁 deteksi hidden • 🛡 tembus armor • 💥 area • ❄ slow • 📡 beri deteksi</small>
            ${action}
          </div>
        </div>`;
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
        <div class="box"><b>Rekor wave tertinggi</b>
          <table><tr><th>Map</th>${Object.values(DIFFS).map(d => `<th>${d.name}</th>`).join('')}</tr>
          ${MAPS.map(m => `<tr><td>${m.name}</td>${Object.entries(DIFFS).map(([k, d]) => {
            const b = PROFILE.best[m.id + '_' + k] || 0; return `<td>${b >= d.waves ? '🏆 ' : ''}${b}</td>`; }).join('')}</tr>`).join('')}</table></div>`;
    },

    howto() {
      return `${this.header('Cara Main')}
        <div class="box howto">
          <h4>🎯 Tujuan</h4><p>Zombie berjalan dari portal ungu menuju <b>BASE</b>. Pasang tower di rumput dekat jalur untuk menghentikannya. Musuh yang lolos mengurangi nyawa sebesar sisa HP-nya, sedangkan boss yang lolos langsung mengakhiri permainan. Bertahan sampai wave terakhir untuk menang.</p>
          <h4>💰 Ekonomi</h4><p>Dapatkan uang dari mengalahkan musuh, bonus akhir wave, dan tower <b>Farm</b>. Jual tower untuk mendapat kembali ${SELL_RATE * 100}% total biaya.</p>
          <h4>🧟 Musuh</h4>
          <table>${Object.entries(ENEMIES).filter(([k]) => k !== 'mini').map(([k, e]) => `<tr><td><i class="dot" style="background:${e.color}"></i> ${e.name}</td><td>${{
            normal: 'Musuh dasar', fast: 'Cepat tapi rapuh', tank: 'Lambat, HP besar, armor 25%', hidden: 'Hanya bisa diserang tower dengan deteksi hidden',
            regen: 'Memulihkan HP terus-menerus', armored: 'Armor 50%, gunakan tower tembus armor', splitter: 'Pecah menjadi 2 musuh kecil saat mati',
            boss: 'Muncul tiap 10 wave. Membuat tower di dekatnya pingsan (stun) dan memanggil pasukan' }[k]}${ENEMY_INTRO[k] ? ` <small class="dim">(mulai wave ${ENEMY_INTRO[k]})</small>` : ''}</td></tr>`).join('')}</table>
          <h4>📈 Progres</h4><p>Setiap selesai bermain kamu mendapat <b>🪙 koin</b> dan <b>XP</b>. Gunakan koin untuk membuka tower baru di menu <b>Tower & Loadout</b>, lalu pilih hingga ${LOADOUT_SIZE} tower untuk dibawa ke pertandingan. Kesulitan dan map yang lebih sulit memberi koin lebih banyak.</p>
          <h4>⌨️ Kontrol</h4>
          <table><tr><td><kbd>1</kbd>–<kbd>${LOADOUT_SIZE}</kbd></td><td>Pilih tower</td></tr><tr><td>Klik</td><td>Pasang / pilih tower</td></tr>
          <tr><td><kbd>Shift</kbd> + klik</td><td>Pasang berulang</td></tr><tr><td><kbd>Q</kbd> / <kbd>E</kbd></td><td>Upgrade tower terpilih</td></tr>
          <tr><td><kbd>X</kbd> / <kbd>Del</kbd></td><td>Jual tower terpilih</td></tr><tr><td><kbd>T</kbd></td><td>Ganti mode target</td></tr>
          <tr><td><kbd>Spasi</kbd></td><td>Mulai wave</td></tr><tr><td><kbd>F</kbd></td><td>Ganti kecepatan</td></tr>
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

    pause() {
      return `<h1>⏸ PAUSE</h1><div class="sub">${MAP.name} • ${DIFFS[S.diff].name} • Wave ${S.wave}/${S.maxWave}</div>
        <div class="mcol">
          <button class="btn big" data-act="resume">▶ Lanjutkan</button>
          <button class="btn blue big" data-act="start">🔄 Ulangi</button>
          <button class="btn gray big" data-act="settings:pause">⚙️ Pengaturan</button>
          <button class="btn red big" data-act="quit">🏠 Keluar ke Menu</button>
        </div><small class="dim">Keluar sekarang tidak memberi koin.</small>`;
    },

    end() {
      const d = this.endData;
      return `<h1 class="${d.won ? 'win' : 'lose'}">${d.won ? '🏆 MENANG!' : '💀 GAME OVER'}</h1>
        ${d.record ? '<span class="badge">⭐ REKOR BARU!</span>' : ''}${d.levelUp ? `<span class="badge purple">⬆ NAIK KE LEVEL ${d.levelUp}!</span>` : ''}
        <div class="box endbox"><table>
          <tr><td>Map</td><td><b>${MAP.name}</b> (${DIFFS[S.diff].name})</td></tr>
          <tr><td>Wave</td><td><b>${S.wave}/${S.maxWave}</b></td></tr>
          <tr><td>Musuh dikalahkan</td><td><b>${S.kills}</b> (boss ${S.bossKills})</td></tr>
          <tr><td>Uang didapat</td><td><b>$${S.earned.toLocaleString('id-ID')}</b></td></tr>
          <tr><td>Durasi</td><td><b>${this.fmtTime(S.time)}</b></td></tr>
          <tr><td>Hadiah</td><td><b class="gold">🪙 +${d.coins}</b> &nbsp; <b class="xpc">+${d.xp} XP</b></td></tr></table>
          ${d.ach.length ? `<div class="newach">${d.ach.map(a => `🏅 ${a.name}`).join('<br>')}</div>` : ''}</div>
        <div class="row2"><button class="btn big" data-act="start">🔄 Main Lagi</button>
          <button class="btn blue" data-act="go:play">🗺️ Pilih Map</button><button class="btn gray" data-act="quit">🏠 Menu</button></div>`;
    },
  },

  after: {
    play() { document.querySelectorAll('canvas[data-map]').forEach(c => drawPreview(c, MAPS[+c.dataset.map])); },
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
      case 'back': this.resetArm = false; this.go(this.screen === 'settings' ? this.back : 'main'); break;
      case 'settings': this.back = arg; this.go('settings'); break;
      case 'map': MAP = MAPS[+arg]; loadMap(MAP); this.go('play'); break;
      case 'diff': DIFF = arg; this.go('play'); break;
      case 'start': startGame(); break;
      case 'resume': sfx('click'); this.close(); break;
      case 'quit': newGame(); this.go('main'); break;
      case 'shop': this.shopSel = arg; this.go('towers'); break;
      case 'buy': {
        const d = TOWERS[arg];
        if (PROFILE.coins < d.unlock) { sfx('error'); break; }
        PROFILE.coins -= d.unlock; PROFILE.unlocked.push(arg);
        if (PROFILE.loadout.length < LOADOUT_SIZE) PROFILE.loadout.push(arg);
        saveProfile(); sfx('achieve'); UI.toast(`🔓 ${d.name} terbuka!`, 'gold');
        checkAchievements(null); this.show('towers'); break;
      }
      case 'lo-add': if (PROFILE.loadout.length < LOADOUT_SIZE) { PROFILE.loadout.push(arg); this.sortLoadout(); saveProfile(); } this.go('towers'); break;
      case 'lo-rem': if (PROFILE.loadout.length > 1) { PROFILE.loadout = PROFILE.loadout.filter(k => k !== arg); saveProfile(); } this.go('towers'); break;
      case 'tog': SET[arg] = !SET[arg]; saveSettings(); Sound.applyVolume(); if (arg === 'music' && SET.music) Sound.startMusic(); this.go('settings'); break;
      case 'quality': SET.quality = SET.quality === 'high' ? 'low' : 'high'; saveSettings(); this.go('settings'); break;
      case 'reset':
        if (!this.resetArm) { this.resetArm = true; this.go('settings'); break; }
        this.resetArm = false; resetAllData(); UI.toast('Semua data dihapus'); newGame(); this.go('settings'); break;
    }
  },
  sortLoadout() { PROFILE.loadout.sort((a, b) => TOWER_ORDER.indexOf(a) - TOWER_ORDER.indexOf(b)); },
};

function startGame() {
  sfx('click');
  newGame();
  PROFILE.stats.games++; saveProfile(); checkAchievements(null);
  Menu.close();
  UI.banner(`${MAP.name} • ${DIFFS[DIFF].name}`, '#fff', 1400);
}
