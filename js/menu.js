/* =========================================================
 * Sistem menu: utama, pilih map, tower (toko & loadout),
 * pencapaian, statistik, pengaturan, cara main, pause, hasil
 * ========================================================= */
'use strict';

const Menu = {
  open: false, screen: null, back: 'main', endData: null, resetArm: false, shopSel: 'scout',

  show(scr, quiet) {
    this.open = true; this.screen = scr;
    const o = $('overlay');
    o.style.display = 'flex';
    o.classList.toggle('home-bg', scr === 'main');
    o.innerHTML = `<div class="screen screen-${scr} ${quiet ? 'noanim' : ''}">${this.screens[scr].call(this)}</div>`;
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
  header(title) { return `<div class="mhead"><button class="btn gray" data-act="back">← Kembali</button><h2>${title}</h2>${this.profileBar()}</div>`; },
  fmtTime(s) { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h}j ${m}m` : m ? `${m}m ${s % 60}d` : `${s}d`; },

  /* ---------- layar ---------- */
  screens: {
    main() {
      const u = Online.user, lv = levelFromXp(PROFILE.xp), lo = lv > 1 ? xpForLevel(lv - 1) : 0, hi = xpForLevel(lv);
      const pct = Math.min(100, (PROFILE.xp - lo) / (hi - lo) * 100);
      const tile = (act, icon, label, sub, cls = '', badge = '') =>
        `<button class="tile ${cls}" data-act="${act}"><span class="ti">${icon}</span><b>${label}</b><small>${sub}</small>${badge}</button>`;
      const reqBadge = `<span class="badge-dot" data-badge="friends">${Online.requests || ''}</span>`;
      return `<div class="cubes">${Array.from({ length: 14 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
        <div class="home">
          <div class="home-top">
            <button class="pcard" data-act="go:account">
              ${this.avatar(u, 52)}
              <div class="pinfo"><b>${esc(u ? u.name : 'Tamu')}</b>
                <div class="lvrow"><span class="lvl">Lv ${lv}</span><div class="xpbar"><div style="width:${pct}%"></div></div></div>
                <small>${u ? '☁️ Tersinkron' : Online.available ? '🔑 Masuk dengan Google' : '💾 Mode offline'}</small></div>
            </button>
            <div class="chips">
              <span class="chip-c" title="Koin">🪙 ${PROFILE.coins.toLocaleString('id-ID')}</span>
              <span class="chip-c" title="Kristal Trait">💎 ${PROFILE.crystals}</span>
              <span class="chip-c" title="Batu Evolusi">🔮 ${PROFILE.stones}</span>
              <button class="icon-btn" data-act="settings:main" title="Pengaturan">⚙️</button>
            </div>
          </div>
          <div class="home-mid">
            <div class="hero">
              <div class="logo3d"><span>🧱</span><h1>BLOCK<br><em>TOWER DEFENSE</em></h1></div>
              <p class="sub">Bangun tower, kumpulkan trait, evolusikan unit, dan bertahan bersama teman!</p>
              ${this.saveButton()}
            </div>
            <div class="playcol">
              <button class="play-btn solo" data-act="go:play"><span>▶</span><div><b>MAIN SOLO</b><small>${MAPS.length} map • Klasik & Endless</small></div></button>
              <button class="play-btn coop" data-act="go:mabar"><span>🤝</span><div><b>MABAR</b><small>Co-op 2–4 pemain bersama teman</small></div></button>
              <button class="play-btn daily" data-act="go:daily"><span>📅</span><div><b>TANTANGAN HARIAN</b><small>${dailyState().won ? '✅ Selesai hari ini' : 'Hadiah 🪙 ' + DAILY_REWARD}</small></div></button>
            </div>
          </div>
          <div class="tiles">
            ${tile('go:towers', '🗼', 'Tower', 'Loadout • Trait • Evolusi', 't-purple')}
            ${tile('go:friends', '👥', 'Teman', u ? 'Undang & gabung' : 'Perlu login', 't-blue', reqBadge)}
            ${tile('go:scores', '🏆', 'Papan Skor', 'Lokal & global', 't-gold')}
            ${tile('go:achievements', '🏅', 'Pencapaian', `${PROFILE.achievements.length}/${ACHIEVEMENTS.length}`, 't-orange')}
            ${tile('go:skills', '⚡', 'Skill', 'Z • C • V', 't-teal')}
            ${tile('go:stats', '📊', 'Statistik', PROFILE.stats.games + ' game', 't-gray')}
            ${tile('go:shop', '🛒', 'Toko', 'Material', 't-pink')}
            ${tile('go:howto', '📖', 'Cara Main', 'Panduan', 't-green')}
          </div>
          <div class="foot">v${VERSION} • ${Online.available ? '🟢 Server online' : '⚪ Offline'} • ${TOWER_ORDER.length} tower • ${Object.keys(ENEMIES).length - 1} musuh</div>
        </div>`;
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
      const lv = playerLevel();
      return `${this.header('Skill Pemain')}
        <div class="achs">${ABILITIES.map(a => `<div class="ach ${lv >= a.level ? 'got' : ''}">
          <div class="medal">${lv >= a.level ? a.icon : '🔒'}</div>
          <div><b>${a.name}</b> <kbd>${a.key.toUpperCase()}</kbd><small>${a.desc}</small><small>Cooldown ${a.cd} detik</small></div>
          <div class="rw">Lv ${a.level}</div></div>`).join('')}</div>
        <small class="dim">Naikkan level dengan bermain. XP didapat dari wave yang diselesaikan dan musuh yang dikalahkan.</small>`;
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
          <tr><td>Mode</td><td><b>${isMP() ? '🤝 Mabar • ' + MODES[S.mode].name : S.daily ? '📅 Tantangan Harian' : MODES[S.mode].name}</b></td></tr>
          <tr><td>Wave</td><td><b>${S.wave}${S.maxWave === Infinity ? '' : '/' + S.maxWave}</b></td></tr>
          <tr><td>Musuh dikalahkan</td><td><b>${S.kills}</b> (boss ${S.bossKills})</td></tr>
          <tr><td>Uang didapat</td><td><b>$${S.earned.toLocaleString('id-ID')}</b></td></tr>
          <tr><td>Durasi</td><td><b>${this.fmtTime(S.time)}</b></td></tr>
          <tr><td>Hadiah</td><td><b class="gold">🪙 +${d.coins}</b> &nbsp; <b class="xpc">+${d.xp} XP</b>${d.crystals ? ` &nbsp; <b>💎 +${d.crystals}</b>` : ''}${d.stones ? ` &nbsp; <b>🔮 +${d.stones}</b>` : ''}</td></tr></table>
          ${d.mastery.length ? `<div class="mlist"><b>Mastery tower</b>${d.mastery.slice(0, 6).map(m => `<div><span>${towerName(m.type)}</span><span>+${m.gain} XP • M${m.lv} ${m.up ? '<b class="up">⬆ NAIK!</b>' : ''}</span></div>`).join('')}</div>` : ''}
          ${d.ach.length ? `<div class="newach">${d.ach.map(a => `🏅 ${a.name}`).join('<br>')}</div>` : ''}</div>
        ${isMP() ? `<div class="row2"><button class="btn big" data-act="go:mabar">🤝 Mabar Lagi</button><button class="btn gray" data-act="quit">🏠 Menu</button></div>`
        : `<div class="row2"><button class="btn big" data-act="${S.daily ? 'daily' : 'start'}">🔄 Main Lagi</button>
          <button class="btn blue" data-act="go:play">🗺️ Pilih Map</button><button class="btn gray" data-act="quit">🏠 Menu</button></div>`}`;
    },
  },

  after: {
    play() { document.querySelectorAll('canvas[data-map]').forEach(c => drawPreview(c, MAPS[+c.dataset.map])); },
    daily() { this.after.play(); },
    main() { Online.refreshBadge && Online.refreshBadge(); },
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
      case 'quit': if (isMP()) MP.cleanup(); newGame(); this.go('main'); break;
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
  async loadFriends() {
    if (!Online.loggedIn) return;
    this.loadingF = true;
    try {
      this.friendsData = await Online.api('friends.list', null, 'GET'); this.friendsAt = Date.now();
      Online.requests = this.friendsData.incoming.length; Online.refreshUi && document.querySelectorAll('[data-badge="friends"]').forEach(b => b.textContent = Online.requests || '');
      if (['friends', 'mabar', 'lobby'].includes(this.screen)) this.show(this.screen, true);
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
