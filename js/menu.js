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
      <div class="coins">🪙 ${PROFILE.coins.toLocaleString('id-ID')}</div>
      <div class="mat" title="Kristal Trait">💎 ${PROFILE.crystals}</div><div class="mat" title="Batu Evolusi">🔮 ${PROFILE.stones}</div></div>`;
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
          ${this.saveButton()}
          <button class="btn big" data-act="go:play">▶ MAIN</button>
          <button class="btn red big" data-act="go:daily">📅 Tantangan Harian ${dailyState().won ? '✅' : ''}</button>
          <button class="btn purple big" data-act="go:towers">🗼 Tower & Loadout</button>
          <div class="mgrid">
            <button class="btn gold" data-act="go:achievements">🏅 Pencapaian <small>${achN}/${ACHIEVEMENTS.length}</small></button>
            <button class="btn gray" data-act="go:stats">📊 Statistik</button>
            <button class="btn purple" data-act="go:scores">🏆 Papan Skor</button>
            <button class="btn gray" data-act="go:skills">⚡ Skill</button>
            <button class="btn blue" data-act="go:howto">📖 Cara Main</button>
            <button class="btn gray" data-act="settings:main">⚙️ Pengaturan</button>
          </div>
        </div>
        <div class="foot">v${VERSION} • ${MAPS.length} map • ${TOWER_ORDER.length} tower • ${Object.keys(ENEMIES).length - 1} musuh</div>`;
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
        <div class="loadout-mini">Loadout: ${PROFILE.loadout.map(k => `<i title="${TOWERS[k].name}" style="background:${TOWERS[k].color}"></i>`).join('')}
          <button class="btn purple sm" data-act="go:towers">Ubah</button></div>
        <button class="btn big" data-act="start">MULAI ▶</button>`;
    },

    towers() {
      const sel = this.shopSel, d = TOWERS[sel], u = unitOf(sel), owned = PROFILE.unlocked.includes(sel), inLo = PROFILE.loadout.includes(sel);
      const lv = unitLevel(u.xp), lo = unitXpFor(lv), hi = unitXpFor(lv + 1);
      const mpct = lv >= UNIT_MAX_LV ? 100 : Math.min(100, (u.xp - lo) / (hi - lo) * 100);
      const tr = u.trait && TRAITS[u.trait], ev = EVOS[sel], es = evoStatus(sel);
      const rows = d.levels.map((_, i) => { const L = computeL(sel, i); return `<tr><td>${i}</td><td>${esc(L.name)}</td><td>$${costOf(sel, i)}</td><td>${
        L.dmg ? `${L.dmg} dmg • ${L.range}r • ${L.rate}s` : L.income ? `$${L.income}/wave` : `+${Math.round(L.buff * 100)}% • ${L.range}r`}${
        L.hidden ? ' • 👁' : ''}${L.pierceArmor ? ' • 🛡' : ''}${L.splash ? ' • 💥' : ''}${L.slow ? ' • ❄' : ''}${L.grantHidden ? ' • 📡' : ''}</td></tr>`; }).join('');
      let action;
      if (!owned) action = `<button class="btn gold" data-act="buy:${sel}" ${PROFILE.coins < d.unlock ? 'disabled' : ''}>🔓 Buka — 🪙 ${d.unlock}</button>`;
      else if (inLo) action = `<button class="btn red" data-act="lo-rem:${sel}" ${PROFILE.loadout.length <= 1 ? 'disabled' : ''}>Keluarkan dari loadout</button>`;
      else action = `<button class="btn" data-act="lo-add:${sel}" ${PROFILE.loadout.length >= LOADOUT_SIZE ? 'disabled' : ''}>Masukkan ke loadout</button>`;
      const req = (ok, txt) => `<li class="${ok ? 'ok' : ''}">${ok ? '✅' : '⬜'} ${txt}</li>`;
      const rollArmed = this.rollArm === sel;
      return `${this.header('Tower & Loadout')}
        <div class="loadout">${Array.from({ length: LOADOUT_SIZE }, (_, i) => {
          const k = PROFILE.loadout[i];
          return k ? `<div class="lslot ${unitOf(k).evo ? 'evo' : ''}" data-act="shop:${k}"><div class="ico" style="background:${towerColor(k)}">${unitOf(k).evo ? '★' : ''}</div>${towerName(k)}</div>`
                   : `<div class="lslot empty">Kosong</div>`;
        }).join('')}</div>
        <div class="shop">
          <div class="tlist">${TOWER_ORDER.map(k => {
            const o = PROFILE.unlocked.includes(k), uk = unitOf(k), tk = uk.trait && TRAITS[uk.trait];
            return `<div class="titem ${k === sel ? 'sel' : ''} ${o ? '' : 'locked'}" data-act="shop:${k}">
              <div class="ico" style="background:${towerColor(k)}">${o ? (uk.evo ? '★' : '') : '🔒'}</div>
              <div><b>${towerName(k)}</b><small>${o ? `M${unitLevel(uk.xp)}${tk ? ` • <span style="color:${RARITY[tk.rarity].color}">${tk.icon} ${tk.name}</span>` : ''}${PROFILE.loadout.includes(k) ? ' • ✔' : ''}` : '🪙 ' + TOWERS[k].unlock}</small></div></div>`;
          }).join('')}<button class="btn gold" data-act="go:shop">🛒 Toko Material</button></div>
          <div class="tdetail">
            <div class="box">
              <div class="ph"><div class="pico" style="background:${towerColor(sel)}">${u.evo ? '★' : ''}</div>
                <div><h3>${towerName(sel)} ${u.evo ? `<small class="dim">(${d.name})</small>` : ''}</h3><span class="tag">${d.role}</span></div></div>
              <p>${d.desc}</p>
              <div class="mastery"><b>Mastery Lv ${lv}</b>${lv >= UNIT_MAX_LV ? ' (MAKS)' : ''} <small class="dim">+${Math.round((lv - 1) * MASTERY_BONUS * 100)}% damage</small>
                <div class="mbar"><div style="width:${mpct}%"></div><span>${lv >= UNIT_MAX_LV ? 'MAKS' : `${u.xp - lo} / ${hi - lo} XP`}</span></div>
                <small class="dim">XP didapat dari damage & kill tower ini saat bermain.</small></div>
              <table><tr><th>Lv</th><th>Upgrade</th><th>Harga</th><th>Statistik (efektif)</th></tr>${rows}</table>
              <small class="dim">👁 deteksi hidden • 🛡 tembus armor • 💥 area • ❄ slow • 📡 beri deteksi</small>
              ${action}
            </div>
            <div class="box2">
              <div class="box trait-box" style="${tr ? `border-color:${RARITY[tr.rarity].color}` : ''}">
                <h4>🎲 Trait</h4>
                <div class="trait-cur" id="traitCur">${tr ? `<span class="ticon">${tr.icon}</span><div><b style="color:${RARITY[tr.rarity].color}">${tr.name}</b> <span class="rar" style="background:${RARITY[tr.rarity].color}">${RARITY[tr.rarity].name}</span><small>${tr.desc}</small></div>` : '<span class="dim">Belum ada trait</span>'}</div>
                <button class="btn purple" data-act="roll:${sel}" ${!owned || PROFILE.crystals < 1 ? 'disabled' : ''}>${rollArmed ? '⚠️ Yakin? Trait ini akan hilang' : `🎲 Roll Trait — 💎 1`} </button>
                <details><summary>Peluang trait</summary><div class="odds">${Object.entries(RARITY).map(([rk, r]) => {
                  const list = Object.values(TRAITS).filter(t => t.rarity === rk), pct = list.reduce((a, t) => a + t.w, 0);
                  return `<div><b style="color:${r.color}">${r.name} ${pct}%</b><small>${list.map(t => `${t.icon} ${t.name}: ${t.desc}`).join('<br>')}</small></div>`; }).join('')}</div></details>
              </div>
              <div class="box evo-box ${u.evo ? 'done' : ''}">
                <h4>🧬 Evolusi → ${ev.name}</h4>
                <div class="evo-prev"><div class="pico" style="background:${d.color}"></div><span>➜</span><div class="pico" style="background:${ev.color}">★</div>
                  <div><b>${ev.name}</b><small>${ev.desc}</small><small class="dim">${Object.entries(ev.mul).map(([k, v]) => ({ dmg: `Damage ×${v}`, range: `Range ×${v}`, splash: `Splash ×${v}`, income: `Pendapatan ×${v}`, buffAdd: `Buff +${v * 100}%` })[k]).join(' • ')}</small></div></div>
                ${u.evo ? '<div class="evo-ok">★ Sudah berevolusi</div>' : `<ul class="reqs">
                  ${req(es.owned, 'Tower dimiliki')}${req(es.lvOk, `Mastery Lv ${EVO_REQ.level} (sekarang ${lv})`)}
                  ${req(es.stonesOk, `🔮 ${EVO_REQ.stones} Batu Evolusi (punya ${PROFILE.stones})`)}${req(es.coinsOk, `🪙 ${EVO_REQ.coins} koin`)}</ul>
                  <button class="btn gold" data-act="evo:${sel}" ${es.owned && es.lvOk && es.stonesOk && es.coinsOk ? '' : 'disabled'}>🧬 EVOLUSI</button>`}
              </div>
            </div>
          </div>
        </div>`;
    },

    shop() {
      return `${this.header('Toko Material')}
        <div class="cards">${Object.entries(MATERIALS).map(([k, m]) => `<div class="card shopc">
          <div class="big-ic">${m.icon}</div><div class="nm">${m.name}</div><small>${m.desc}</small>
          <div class="best">Dimiliki: ${PROFILE[k]}</div>
          <div class="row2"><button class="btn gold sm" data-act="mat:${k}:1" ${PROFILE.coins < m.price ? 'disabled' : ''}>1× — 🪙 ${m.price}</button>
          <button class="btn gold sm" data-act="mat:${k}:5" ${PROFILE.coins < m.price * 5 ? 'disabled' : ''}>5× — 🪙 ${m.price * 5}</button></div></div>`).join('')}</div>
        <div class="box"><h4>Cara mendapatkan gratis</h4>
          <p>💎 <b>Kristal Trait</b>: setiap boss dikalahkan, setiap 10 wave yang diselesaikan, menang (+2), Tantangan Harian (+3).</p>
          <p>🔮 <b>Batu Evolusi</b>: menang di kesulitan Sulit, menang Tantangan Harian, wave 30+ di Endless, atau kalahkan 3+ boss dalam satu game.</p></div>
        <button class="btn gray" data-act="go:towers">← Ke Tower & Loadout</button>`;
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
          <table>${Object.entries(ENEMIES).filter(([k]) => k !== 'mini').map(([k, e]) => `<tr><td><i class="dot" style="background:${e.color}"></i> ${e.name}</td><td>${{
            normal: 'Musuh dasar', fast: 'Cepat tapi rapuh', tank: 'Lambat, HP besar, armor 25%', hidden: 'Hanya bisa diserang tower dengan deteksi hidden',
            regen: 'Memulihkan HP terus-menerus', armored: 'Armor 50%, gunakan tower tembus armor', splitter: 'Pecah menjadi 2 musuh kecil saat mati',
            boss: 'Muncul tiap 10 wave. Membuat tower di dekatnya pingsan (stun) dan memanggil pasukan' }[k]}${ENEMY_INTRO[k] ? ` <small class="dim">(mulai wave ${ENEMY_INTRO[k]})</small>` : ''}</td></tr>`).join('')}</table>
          <h4>⚡ Skill & Skip</h4><p>Skill pemain (Serangan Udara, Badai Es, Perbaikan Base) terbuka saat level naik. Gunakan dengan tombol di kiri hotbar atau <kbd>Z</kbd> <kbd>C</kbd> <kbd>V</kbd>. Jika semua musuh wave sudah keluar, tekan <b>Skip</b> untuk memulai wave berikutnya lebih cepat dan dapat bonus uang.</p>
          <h4>📅 Mode</h4><p><b>Klasik</b>: menang di wave terakhir. <b>Endless</b>: wave tanpa batas, kejar skor tertinggi. <b>Tantangan Harian</b>: map, kesulitan, dan modifier berganti tiap hari. Selesaikan untuk bonus 🪙 ${DAILY_REWARD}.</p>
          <h4>🧬 Trait, Mastery & Evolusi</h4><p>Setiap tower punya <b>Mastery</b> (Lv 1–${UNIT_MAX_LV}, +2% damage per level) yang naik saat tower dipakai. Roll <b>Trait</b> dengan 💎 Kristal untuk bonus acak dari Biasa sampai Mitos. Setelah Mastery Lv ${EVO_REQ.level}, <b>Evolusikan</b> tower dengan 🔮 ${EVO_REQ.stones} Batu Evolusi + 🪙 ${EVO_REQ.coins} untuk bentuk baru dengan kemampuan unik.</p>
          <h4>📈 Progres</h4><p>Setiap selesai bermain kamu mendapat <b>🪙 koin</b> dan <b>XP</b>. Gunakan koin untuk membuka tower baru di menu <b>Tower & Loadout</b>, lalu pilih hingga ${LOADOUT_SIZE} tower untuk dibawa ke pertandingan. Kesulitan dan map yang lebih sulit memberi koin lebih banyak.</p>
          <h4>⌨️ Kontrol</h4>
          <table><tr><td><kbd>1</kbd>–<kbd>${LOADOUT_SIZE}</kbd></td><td>Pilih tower</td></tr><tr><td>Klik</td><td>Pasang / pilih tower</td></tr>
          <tr><td><kbd>Shift</kbd> + klik</td><td>Pasang berulang</td></tr><tr><td><kbd>Q</kbd> / <kbd>E</kbd></td><td>Upgrade tower terpilih</td></tr>
          <tr><td><kbd>X</kbd> / <kbd>Del</kbd></td><td>Jual tower terpilih</td></tr><tr><td><kbd>T</kbd></td><td>Ganti mode target</td></tr>
          <tr><td><kbd>Spasi</kbd></td><td>Mulai / skip wave</td></tr><tr><td><kbd>Z</kbd> <kbd>C</kbd> <kbd>V</kbd></td><td>Skill pemain</td></tr><tr><td><kbd>F</kbd></td><td>Ganti kecepatan</td></tr>
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
      const runs = PROFILE.runs, medal = i => ['🥇', '🥈', '🥉'][i] || '#' + (i + 1);
      return `${this.header('Papan Skor')}
        <div class="box">${runs.length ? `<table><tr><th>#</th><th>Skor</th><th>Map</th><th>Mode</th><th>Wave</th><th>Hasil</th><th>Tanggal</th></tr>
          ${runs.map((r, i) => `<tr><td>${medal(i)}</td><td><b>${r.score.toLocaleString('id-ID')}</b></td>
            <td>${(MAPS.find(m => m.id === r.map) || {}).name || r.map}</td>
            <td>${r.daily ? '📅 Harian' : MODES[r.mode].name} • ${DIFFS[r.diff].name}</td><td>${r.wave}</td>
            <td>${r.won ? '🏆' : '💀'}</td><td class="dim">${r.date}</td></tr>`).join('')}</table>`
          : '<p class="dim" style="text-align:center">Belum ada permainan. Ayo main!</p>'}</div>
        <small class="dim">Skor = wave × 500 + kill × 5 + nyawa × 10 + boss × 1000 + bonus menang, dikali kesulitan & map.</small>`;
    },

    skills() {
      const lv = playerLevel();
      return `${this.header('Skill Pemain')}
        <div class="achs">${ABILITIES.map(a => `<div class="ach ${lv >= a.level ? 'got' : ''}">
          <div class="medal">${lv >= a.level ? a.icon : '🔒'}</div>
          <div><b>${a.name}</b> <kbd>${a.key.toUpperCase()}</kbd><small>${a.desc}</small><small>Cooldown ${a.cd} detik</small></div>
          <div class="rw">Lv ${a.level}</div></div>`).join('')}</div>
        <small class="dim">Naikkan level dengan bermain. XP didapat dari wave yang diselesaikan dan musuh yang dikalahkan.</small>`;
    },

    pause() {
      return `<h1>⏸ PAUSE</h1><div class="sub">${MAP.name} • ${DIFFS[S.diff].name} • ${S.daily ? 'Harian' : MODES[S.mode].name} • Wave ${S.wave}${S.maxWave === Infinity ? '' : '/' + S.maxWave}</div>
        <div class="mcol">
          <button class="btn big" data-act="resume">▶ Lanjutkan</button>
          <button class="btn blue big" data-act="${S.daily ? 'daily' : 'start'}">🔄 Ulangi</button>
          <button class="btn gray big" data-act="settings:pause">⚙️ Pengaturan</button>
          <button class="btn red big" data-act="quit">🏠 ${S.wave > 0 ? 'Simpan & Keluar' : 'Keluar ke Menu'}</button>
        </div><small class="dim">${S.wave > 0 ? `Progres tersimpan di awal wave ${S.state === 'ready' ? S.wave + 1 : S.wave}. Lanjutkan dari menu utama.` : ''}</small>`;
    },

    end() {
      const d = this.endData;
      return `<h1 class="${d.won ? 'win' : 'lose'}">${d.won ? '🏆 MENANG!' : '💀 GAME OVER'}</h1>
        <div class="score">${d.score.toLocaleString('id-ID')} <small>poin • peringkat #${d.rank}</small></div>
        ${d.record ? '<span class="badge">⭐ REKOR BARU!</span>' : ''}${d.dailyReward ? `<span class="badge">📅 Tantangan harian selesai! +${d.dailyReward} 🪙</span>` : ''}
        ${d.unlockedSkill ? `<span class="badge purple">⚡ Skill baru: ${d.unlockedSkill.icon} ${d.unlockedSkill.name}</span>` : ''}${d.levelUp ? `<span class="badge purple">⬆ NAIK KE LEVEL ${d.levelUp}!</span>` : ''}
        <div class="box endbox"><table>
          <tr><td>Map</td><td><b>${MAP.name}</b> (${DIFFS[S.diff].name})</td></tr>
          <tr><td>Mode</td><td><b>${S.daily ? '📅 Tantangan Harian' : MODES[S.mode].name}</b></td></tr>
          <tr><td>Wave</td><td><b>${S.wave}${S.maxWave === Infinity ? '' : '/' + S.maxWave}</b></td></tr>
          <tr><td>Musuh dikalahkan</td><td><b>${S.kills}</b> (boss ${S.bossKills})</td></tr>
          <tr><td>Uang didapat</td><td><b>$${S.earned.toLocaleString('id-ID')}</b></td></tr>
          <tr><td>Durasi</td><td><b>${this.fmtTime(S.time)}</b></td></tr>
          <tr><td>Hadiah</td><td><b class="gold">🪙 +${d.coins}</b> &nbsp; <b class="xpc">+${d.xp} XP</b>${d.crystals ? ` &nbsp; <b>💎 +${d.crystals}</b>` : ''}${d.stones ? ` &nbsp; <b>🔮 +${d.stones}</b>` : ''}</td></tr></table>
          ${d.mastery.length ? `<div class="mlist"><b>Mastery tower</b>${d.mastery.slice(0, 6).map(m => `<div><span>${towerName(m.type)}</span><span>+${m.gain} XP • M${m.lv} ${m.up ? '<b class="up">⬆ NAIK!</b>' : ''}</span></div>`).join('')}</div>` : ''}
          ${d.ach.length ? `<div class="newach">${d.ach.map(a => `🏅 ${a.name}`).join('<br>')}</div>` : ''}</div>
        <div class="row2"><button class="btn big" data-act="${S.daily ? 'daily' : 'start'}">🔄 Main Lagi</button>
          <button class="btn blue" data-act="go:play">🗺️ Pilih Map</button><button class="btn gray" data-act="quit">🏠 Menu</button></div>`;
    },
  },

  after: {
    play() { document.querySelectorAll('canvas[data-map]').forEach(c => drawPreview(c, MAPS[+c.dataset.map])); },
    daily() { this.after.play(); },
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
      case 'mode': MODE = arg; this.go('play'); break;
      case 'daily': startGame({ daily: dailyChallenge() }); break;
      case 'continue': sfx('click'); if (loadSavedGame()) { this.close(); UI.banner(`Lanjut: Wave ${S.wave + 1}`, '#fff', 1400); } break;
      case 'discard': SaveGame.clear(); this.go('main'); break;
      case 'start': startGame(); break;
      case 'resume': sfx('click'); this.close(); break;
      case 'quit': newGame(); this.go('main'); break;
      case 'shop': this.shopSel = arg; this.rollArm = null; this.go('towers'); break;
      case 'roll': {
        const u = unitOf(arg);
        if (u.trait && RARITY[TRAITS[u.trait].rarity].rank >= 2 && this.rollArm !== arg) { this.rollArm = arg; this.go('towers'); break; }
        this.rollArm = null;
        const id = rollTrait(arg);
        if (!id) { sfx('error'); break; }
        this.show('towers'); this.animateRoll(id); break;
      }
      case 'evo':
        if (evolve(arg)) { sfx('win'); UI.toast(`🧬 ${TOWERS[arg].name} berevolusi menjadi ${EVOS[arg].name}!`, 'gold', 4000); this.show('towers'); $('overlay').querySelector('.evo-box').classList.add('flash'); }
        else sfx('error');
        break;
      case 'mat': {
        const k = arg, n = +a.split(':')[2], cost = MATERIALS[k].price * n;
        if (PROFILE.coins < cost) { sfx('error'); break; }
        PROFILE.coins -= cost; PROFILE[k] += n; saveProfile(); sfx('coin');
        UI.toast(`${MATERIALS[k].icon} +${n} ${MATERIALS[k].name}`, 'gold'); this.show('shop'); break;
      }
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
  sortLoadout() { PROFILE.loadout.sort((a, b) => TOWER_ORDER.indexOf(a) - TOWER_ORDER.indexOf(b)); },
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
