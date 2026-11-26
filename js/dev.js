/* =========================================================
 * Panel Developer — hanya tampil untuk akun admin
 * (server tetap memeriksa hak akses di setiap permintaan).
 * ========================================================= */
'use strict';

const DevPanel = {
  tab: 'stats', data: {}, sel: null, user: null, q: '', busy: false,
  isAdmin: () => !!(Online.user && Online.user.isAdmin),

  async load(kind, force) {
    if (this.busy || (!force && this.data[kind])) return;
    this.busy = true;
    const req = { stats: ['admin.stats'], players: ['admin.search', { q: this.q }], global: ['admin.getGlobal'],
      pay: ['admin.payments'], trades: ['admin.trades'], lb: ['admin.lb', { mode: this.lbMode || 'classic' }], log: ['admin.log'] }[kind];
    try { this.data[kind] = await Online.api(req[0], null, 'GET', req[1] || {}); }
    catch (e) { UI.toast('❌ ' + e.message); this.data[kind] = { error: e.message }; }
    this.busy = false;
    if (Menu.screen === 'dev') Menu.show('dev', true);
  },
  async openUser(id) {
    this.sel = id; this.user = null; Menu.show('dev', true);
    try { this.user = await Online.api('admin.user', null, 'GET', { id }); } catch (e) { UI.toast('❌ ' + e.message); }
    if (Menu.screen === 'dev') Menu.show('dev', true);
  },
  async call(route, body, okMsg) {
    try {
      const r = await Online.api(route, body);
      if (okMsg) UI.toast('✅ ' + okMsg);
      if (r.vault && this.user) this.user.vault = r.vault;
      if (r.vault && body.id === Online.user.id) Eco.apply(r.vault);   // ubah akun sendiri → langsung terlihat
      return r;
    } catch (e) { UI.toast('❌ ' + e.message); return null; }
    finally { if (Menu.screen === 'dev') Menu.show('dev', true); }
  },
  v: id => { const el = $(id); return el ? (el.type === 'checkbox' ? el.checked : el.value) : ''; },

  render() {
    if (!this.isAdmin()) return `${Menu.header('🛠️ Developer')}<div class="box center-box"><div class="big-ic">🔒</div><h3>Khusus developer</h3></div>`;
    const tabs = [['stats', '📈 Ringkasan'], ['players', '👤 Pemain'], ['global', '🌐 Game Global'], ['pay', '💳 Transaksi'], ['trades', '🔁 Trading'], ['lb', '🏆 Skor'], ['log', '📜 Log'], ['tools', '🧪 Alat Uji']];
    const body = { stats: this.tStats, players: this.tPlayers, global: this.tGlobal, pay: this.tPay, trades: this.tTrades, lb: this.tLb, log: this.tLog, tools: this.tTools }[this.tab].call(this);
    return `${Menu.header('🛠️ Panel Developer')}<div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${this.tab === k ? 'on' : ''}" data-act="dev:tab:${k}">${l}</button>`).join('')}</div><div class="devwrap">${body}</div>`;
  },
  wait(kind) { this.load(kind); const d = this.data[kind]; return !d ? '<div class="box">⏳ Memuat…</div>' : d.error ? `<div class="box warn">❌ ${esc(d.error)}</div>` : null; },
  date: t => t ? new Date(t).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-',
  rp: n => 'Rp ' + (n || 0).toLocaleString('id-ID'),

  tStats() {
    const w = this.wait('stats'); if (w) return w;
    const s = this.data.stats, card = (ic, l, v) => `<div class="devstat"><span>${ic}</span><b>${v}</b><small>${l}</small></div>`;
    return `<div class="devstats">${card('👥', 'Total pemain', s.users)}${card('🟢', 'Online', s.online)}${card('🆕', 'Baru 24 jam', s.newToday)}
      ${card('🗼', 'Total unit', s.units)}${card('🔁', 'Trade selesai', s.trades)}${card('🏠', 'Room aktif', s.rooms)}${card('⛔', 'Diblokir', s.banned)}
      ${card('💳', 'Transaksi lunas', s.paidCount)}${card('💰', 'Pendapatan', this.rp(s.revenue))}${card('📅', 'Pendapatan 24 jam', this.rp(s.paidToday))}</div>
      <button class="btn sm gray" data-act="dev:reload:stats">🔄 Muat ulang</button>`;
  },

  tPlayers() {
    if (this.sel) return this.tUser();
    const w = this.wait('players');
    const rows = w ? w : `<div class="box"><table><tr><th></th><th>Nama</th><th>Email</th><th>Kode</th><th>Lv</th><th>Terakhir</th></tr>
      ${this.data.players.users.map(u => `<tr class="click" data-act="dev:user:${u.id}"><td>${u.online ? '🟢' : '⚪'}${u.banned ? '⛔' : ''}</td><td><b>${esc(u.name)}</b></td><td>${esc(u.email)}</td><td>${u.friendCode || ''}</td><td>${u.level}</td><td>${this.date(u.lastSeen)}</td></tr>`).join('') || '<tr><td colspan="6">Tidak ada</td></tr>'}</table></div>`;
    return `<div class="devrow"><input id="devQ" placeholder="Cari nama / email / kode teman" value="${esc(this.q)}"><button class="btn sm" data-act="dev:search">🔍 Cari</button></div>${rows}`;
  },

  tUser() {
    const d = this.user;
    if (!d) return `<button class="btn sm gray" data-act="dev:unsel">← Daftar pemain</button><div class="box">⏳ Memuat…</div>`;
    const u = d.user, v = d.vault, id = u.id;
    const cur = [['coins', '🪙 Koin'], ['diamonds', '💎 Diamond'], ['gems', '💠 Permata'], ['crystals', '✨ Kristal'], ['stones', '🔮 Batu Evo']];
    const opt = (o, sel) => o.map(([k, l]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${l}</option>`).join('');
    const unitOpts = SHARED.UNIT_TYPES.map(t => [t, `${TOWERS[t] ? TOWERS[t].name : t} (${RARITY[UNIT_RARITY[t]].name})`]);
    const traitOpts = [['', '— tanpa trait —'], ...Object.entries(TRAITS).map(([k, t]) => [k, t.name])];
    const skinOpts = Object.entries(SKINS).map(([k, s]) => [k, s.name]);
    return `<button class="btn sm gray" data-act="dev:unsel">← Daftar pemain</button>
      <div class="box"><h3>${esc(u.name)} ${u.banned ? '<span class="rar" style="background:#c62828">DIBLOKIR</span>' : ''}</h3>
        <small class="dim">${esc(u.email)} • ID ${id} • Kode ${u.friendCode} • Lv ${u.level} • Daftar ${this.date(u.createdAt)} • Terakhir ${this.date(u.lastSeen)}</small>
        <p>${cur.map(([k, l]) => `${l}: <b>${(v[k] || 0).toLocaleString('id-ID')}</b>`).join(' • ')} • Skill ${v.skills.length}/${Object.keys(SHARED.SKILL_PRICES).length} • Skin ${v.skins.length} • Pull ${v.pulls || 0}</p></div>
      <div class="box"><h4>💰 Beri / kurangi mata uang</h4><div class="devrow"><select id="dvCur">${opt(cur, 'diamonds')}</select><input id="dvAmt" type="number" value="1000" style="width:120px">
        <button class="btn sm green" data-act="dev:grant:${id}:1">＋ Tambah</button><button class="btn sm red" data-act="dev:grant:${id}:-1">－ Kurangi</button></div></div>
      <div class="box"><h4>🎁 Beri unit</h4><div class="devrow"><select id="dvType">${opt(unitOpts)}</select><select id="dvTrait">${opt(traitOpts)}</select><select id="dvSkin">${opt(skinOpts, 'default')}</select>
        <label><input type="checkbox" id="dvEvo"> Evo</label><input id="dvXp" type="number" placeholder="XP" value="0" style="width:90px"><input id="dvCnt" type="number" value="1" min="1" max="50" style="width:60px">
        <button class="btn sm green" data-act="dev:give:${id}">🎁 Beri</button></div>
        <div class="devrow"><button class="btn sm" data-act="dev:unlock:${id}:skills">⚡ Buka semua skill</button><button class="btn sm" data-act="dev:unlock:${id}:skins">🎨 Semua skin</button><button class="btn sm" data-act="dev:unlock:${id}:units">🗼 1 tiap unit</button></div></div>
      <div class="box"><h4>🗼 Unit (${v.units.length})</h4><div class="devunits"><table><tr><th>Unit</th><th>Trait</th><th>Evo</th><th>XP</th><th>Skin</th><th></th></tr>
        ${v.units.map(x => `<tr><td>${TOWERS[x.type] ? TOWERS[x.type].name : x.type}${x.lock ? ' 🔒' : ''}</td>
          <td><select data-dev-edit="${id}:${x.id}:trait">${opt(traitOpts, x.trait || '')}</select></td>
          <td><input type="checkbox" data-dev-edit="${id}:${x.id}:evo" ${x.evo ? 'checked' : ''}></td>
          <td><input type="number" data-dev-edit="${id}:${x.id}:xp" value="${x.xp || 0}" style="width:80px"></td>
          <td><select data-dev-edit="${id}:${x.id}:skin">${opt(skinOpts, x.skin || 'default')}</select></td>
          <td><button class="btn sm red" data-act="dev:udel:${id}:${x.id}">🗑</button></td></tr>`).join('')}</table></div></div>
      <div class="box"><h4>⚠️ Tindakan akun</h4><div class="devrow">
        ${u.banned ? `<button class="btn sm green" data-act="dev:ban:${id}:0">✅ Buka blokir</button>`
          : `<input id="dvReason" placeholder="Alasan blokir"><button class="btn sm red" data-act="dev:ban:${id}:1">⛔ Blokir</button>`}
        <button class="btn sm red" data-act="dev:reset:${id}">♻️ Reset inventori</button></div>
        <small class="dim">Statistik profil: ${d.profile.stats.games || 0} game • ${d.profile.stats.wins || 0} menang • ${d.profile.achievements} pencapaian • XP ${d.profile.xp}</small></div>`;
  },

  tGlobal() {
    const w = this.wait('global'); if (w) return w;
    const g = this.data.global.global, a = g.announcement || {}, e = g.event || {};
    const units = [['', '— otomatis (rotasi harian) —'], ...this.data.global.units.map(t => [t, TOWERS[t] ? TOWERS[t].name : t])];
    const J = o => esc(JSON.stringify(o));
    return `<div class="box"><h4>📢 Pengumuman (tampil di menu utama)</h4>
        <div class="devrow"><input id="dgAnn" style="flex:1" maxlength="300" value="${esc(a.text || '')}" placeholder="Teks pengumuman"><input id="dgAnnC" type="color" value="${a.color || '#ffcc33'}"><label><input type="checkbox" id="dgAnnOn" ${a.active ? 'checked' : ''}> Aktif</label></div></div>
      <div class="box"><h4>🚧 Server</h4>
        <div class="devrow"><label><input type="checkbox" id="dgMaint" ${g.maintenance ? 'checked' : ''}> Mode maintenance (pemain tidak bisa sinkron/mabar)</label><input id="dgMaintMsg" style="flex:1" value="${esc(g.maintenanceMsg || '')}" placeholder="Pesan maintenance"></div>
        <div class="devrow"><label><input type="checkbox" id="dgTopup" ${g.topupEnabled !== false ? 'checked' : ''}> Top up aktif</label></div></div>
      <div class="box"><h4>🎉 Event</h4><div class="devrow">
        <label>Pengali koin <input id="dgRew" type="number" step="0.1" value="${e.rewardMul}" style="width:70px"></label>
        <label>Pengali diamond <input id="dgDia" type="number" step="0.1" value="${e.diamondMul}" style="width:70px"></label>
        <label>Unit unggulan <select id="dgFeat">${units.map(([k, l]) => `<option value="${k}" ${k === (e.featured || '') ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div></div>
      <div class="box"><h4>🎰 Summon (💎 Diamond)</h4><div class="devrow">
        <label>1x <input id="dgG1" type="number" value="${g.gacha.cost1}" style="width:80px"></label><label>10x <input id="dgG10" type="number" value="${g.gacha.cost10}" style="width:80px"></label>
        <label>Pity <input id="dgGP" type="number" value="${g.gacha.pity}" style="width:70px"></label></div>
        <label>Rate (bobot per rarity) <textarea id="dgGR" rows="2">${J(g.gacha.rates)}</textarea></label></div>
      <div class="box"><h4>🍀 Lucky Summon (💠 Permata)</h4><div class="devrow">
        <label>1x <input id="dgL1" type="number" value="${g.lucky.cost1}" style="width:80px"></label><label>10x <input id="dgL10" type="number" value="${g.lucky.cost10}" style="width:80px"></label>
        <label>Pity <input id="dgLP" type="number" value="${g.lucky.pity}" style="width:70px"></label></div>
        <label>Rate <textarea id="dgLR" rows="2">${J(g.lucky.rates)}</textarea></label></div>
      <div class="box"><h4>📅 Hadiah login harian (7 hari, 💎)</h4><input id="dgDaily" style="width:100%" value="${g.dailyLogin.join(', ')}"></div>
      <div class="box"><h4>⚡ Harga buka skill</h4><small class="dim">Format: {"meteor":{"diamonds":300}} • null = gratis • mata uang: coins / diamonds / gems</small>
        <textarea id="dgSkill" rows="5">${J(g.skillPrices)}</textarea></div>
      <div class="devrow"><button class="btn green" data-act="dev:saveGlobal">💾 Simpan & terapkan</button><button class="btn gray" data-act="dev:resetGlobal">↺ Kembalikan default</button></div>`;
  },

  tPay() {
    const w = this.wait('pay'); if (w) return w;
    return `<div class="box devunits"><table><tr><th>Waktu</th><th>Pemain</th><th>Paket</th><th>Harga</th><th>Status</th><th></th></tr>
      ${this.data.pay.payments.map(p => `<tr><td>${this.date(p.at)}</td><td class="click" data-act="dev:user:${p.user}">${esc(p.name)}</td><td>💠 ${p.gems}</td><td>${this.rp(p.price)}</td>
        <td>${p.status}${p.credited ? ' ✅' : ''}</td><td>${p.credited ? '' : `<button class="btn sm" data-act="dev:credit:${p.id}">Kreditkan</button>`}</td></tr>`).join('') || '<tr><td colspan="6">Belum ada transaksi</td></tr>'}</table></div>
      <button class="btn sm gray" data-act="dev:reload:pay">🔄 Muat ulang</button>`;
  },
  tTrades() {
    const w = this.wait('trades'); if (w) return w;
    const n = a => (a || []).length + ' unit';
    return `<div class="box devunits"><table><tr><th>Waktu</th><th>Dari</th><th>Ke</th><th>Beri</th><th>Minta</th><th>Status</th></tr>
      ${this.data.trades.trades.map(t => `<tr><td>${this.date(t.at)}</td><td>${esc(t.from)}</td><td>${esc(t.to)}</td><td>${n(t.give && t.give.units || t.give)}</td><td>${n(t.want && t.want.units || t.want)}</td><td>${t.status}${t.reason ? ' (' + esc(t.reason) + ')' : ''}</td></tr>`).join('') || '<tr><td colspan="6">Belum ada</td></tr>'}</table></div>
      <button class="btn sm gray" data-act="dev:reload:trades">🔄 Muat ulang</button>`;
  },
  tLb() {
    const mode = this.lbMode || 'classic', w = this.wait('lb');
    const modes = ['classic', 'endless', 'daily'].map(m => `<button class="tab ${m === mode ? 'on' : ''}" data-act="dev:lbmode:${m}">${m}</button>`).join('');
    return `<div class="tabs">${modes}</div>${w || `<div class="box devunits"><table><tr><th>#</th><th>Nama</th><th>Skor</th><th>Wave</th><th>Waktu</th><th></th></tr>
      ${this.data.lb.runs.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.name)}</td><td>${r.score}</td><td>${r.wave}</td><td>${this.date(r.at)}</td><td><button class="btn sm red" data-act="dev:lbdel:${r.id}">🗑 Hapus</button></td></tr>`).join('') || '<tr><td colspan="6">Kosong</td></tr>'}</table></div>`}`;
  },
  tLog() {
    const w = this.wait('log'); if (w) return w;
    return `<div class="box devunits"><table><tr><th>Waktu</th><th>Aksi</th><th>Target</th><th>Detail</th></tr>
      ${this.data.log.log.map(l => `<tr><td>${this.date(l.at)}</td><td>${l.action}</td><td>${esc(l.target || '-')}</td><td><small>${esc(JSON.stringify(l.detail || ''))}</small></td></tr>`).join('') || '<tr><td colspan="4">Kosong</td></tr>'}</table></div>
      <button class="btn sm gray" data-act="dev:reload:log">🔄 Muat ulang</button>`;
  },
  tTools() {
    return `<div class="box"><h4>🧪 Alat uji di dalam permainan</h4><p class="dim">Mulai permainan solo, lalu buka menu ⏸ Pause — tombol alat uji muncul di sana (hanya akun developer).</p>
      <div class="devrow"><button class="btn sm" data-act="dev:self">👤 Kelola akun saya</button><button class="btn sm gray" data-act="dev:resync">🔄 Sinkron ulang inventori</button></div></div>`;
  },
  pauseTools() {
    if (!this.isAdmin() || isMP()) return '';
    return `<div class="box devtools"><b>🛠️ Alat Developer</b><div class="devrow">
      <button class="btn sm green" data-act="dev:cash">💵 +$10.000</button><button class="btn sm" data-act="dev:hp">❤️ HP penuh</button>
      <button class="btn sm" data-act="dev:god">${S.godMode ? '🛡️ God mode: ON' : '🛡️ God mode: OFF'}</button><button class="btn sm red" data-act="dev:kill">💥 Bunuh semua</button>
      <button class="btn sm" data-act="dev:wave">⏭ +5 wave</button><button class="btn sm red" data-act="dev:boss">👑 Spawn boss</button></div>
      <small class="dim">Permainan dengan alat uji tidak dikirim ke papan skor.</small></div>`;
  },

  act(a) {
    const p = a.split(':'), cmd = p[1];
    const cheat = () => { if (S) S.devUsed = true; };
    switch (cmd) {
      case 'tab': this.tab = p[2]; if (p[2] !== 'players') this.sel = null; if (['stats', 'pay', 'trades', 'log', 'lb'].includes(p[2])) delete this.data[p[2]]; Menu.show('dev', true); break;
      case 'reload': delete this.data[p[2]]; Menu.show('dev', true); break;
      case 'search': this.q = this.v('devQ'); delete this.data.players; Menu.show('dev', true); break;
      case 'user': this.tab = 'players'; this.openUser(p[2]); break;
      case 'self': this.tab = 'players'; this.openUser(Online.user.id); break;
      case 'unsel': this.sel = null; this.user = null; delete this.data.players; Menu.show('dev', true); break;
      case 'grant': this.call('admin.grant', { id: p[2], currency: this.v('dvCur'), amount: (+this.v('dvAmt') || 0) * +p[3] }, 'Saldo diperbarui'); break;
      case 'give': this.call('admin.unitGive', { id: p[2], type: this.v('dvType'), trait: this.v('dvTrait') || null, skin: this.v('dvSkin'), evo: this.v('dvEvo'), xp: +this.v('dvXp') || 0, count: +this.v('dvCnt') || 1 }, 'Unit diberikan'); break;
      case 'unlock': this.call('admin.unlockAll', { id: p[2], what: p[3] }, 'Terbuka'); break;
      case 'udel': if (confirm('Hapus unit ini?')) this.call('admin.unitDelete', { id: p[2], unitId: p[3] }, 'Unit dihapus'); break;
      case 'ban': this.call('admin.ban', { id: p[2], banned: p[3] === '1', reason: this.v('dvReason') }, p[3] === '1' ? 'Pemain diblokir' : 'Blokir dibuka').then(() => this.openUser(p[2])); break;
      case 'reset': if (confirm('Reset seluruh inventori pemain ini ke awal? Tidak bisa dibatalkan.')) this.call('admin.resetVault', { id: p[2] }, 'Inventori direset'); break;
      case 'credit': this.call('admin.credit', { orderId: p[2] }, 'Permata dikreditkan').then(() => { delete this.data.pay; Menu.show('dev', true); }); break;
      case 'lbmode': this.lbMode = p[2]; delete this.data.lb; Menu.show('dev', true); break;
      case 'lbdel': if (confirm('Hapus skor ini?')) this.call('admin.lbDelete', { id: p[2] }, 'Skor dihapus').then(() => { delete this.data.lb; Menu.show('dev', true); }); break;
      case 'saveGlobal': this.saveGlobal(); break;
      case 'resetGlobal': if (confirm('Kembalikan semua pengaturan game ke default?')) this.applyGlobal({}); break;
      case 'resync': Online.refreshVault().then(() => UI.toast('✅ Inventori disinkron')); break;
      // alat dalam permainan
      case 'cash': cheat(); addCash(S.me, 10000); UI.toast('💵 +$10.000'); break;
      case 'hp': cheat(); S.hp = S.maxHp || Math.max(S.hp, 100); UI.toast('❤️ HP dipulihkan'); break;
      case 'god': cheat(); S.godMode = !S.godMode; UI.toast(S.godMode ? '🛡️ God mode aktif' : 'God mode mati'); Menu.show('pause', true); break;
      case 'kill': cheat(); [...S.enemies].forEach(e => damage(e, e.hp + 1e9, {}, null, true)); UI.toast('💥 Semua musuh dibunuh'); break;
      case 'wave': cheat(); S.wave = Math.min(S.maxWave - 1, S.wave + 5); UI.toast('⏭ Wave sekarang ' + S.wave); Menu.show('pause', true); break;
      case 'boss': cheat(); spawn('boss'); UI.toast('👑 Boss muncul'); break;
    }
  },
  json(id, label) { try { return JSON.parse(this.v(id)); } catch (e) { throw new Error(label + ': format JSON salah'); } },
  saveGlobal() {
    let g;
    try {
      g = { announcement: { text: this.v('dgAnn'), color: this.v('dgAnnC'), active: this.v('dgAnnOn') },
        maintenance: this.v('dgMaint'), maintenanceMsg: this.v('dgMaintMsg'), topupEnabled: this.v('dgTopup'),
        event: { rewardMul: +this.v('dgRew'), diamondMul: +this.v('dgDia'), featured: this.v('dgFeat') || null },
        gacha: { cost1: +this.v('dgG1'), cost10: +this.v('dgG10'), pity: +this.v('dgGP'), rates: this.json('dgGR', 'Rate summon') },
        lucky: { cost1: +this.v('dgL1'), cost10: +this.v('dgL10'), pity: +this.v('dgLP'), rates: this.json('dgLR', 'Rate lucky') },
        dailyLogin: this.v('dgDaily').split(',').map(x => +x.trim()), skillPrices: this.json('dgSkill', 'Harga skill') };
      if (g.dailyLogin.length !== 7 || g.dailyLogin.some(isNaN)) throw new Error('Hadiah login harus 7 angka');
    } catch (e) { return UI.toast('❌ ' + e.message); }
    this.applyGlobal(g);
  },
  async applyGlobal(g) {
    const r = await this.call('admin.setGlobal', { global: g }, 'Pengaturan disimpan & langsung berlaku');
    if (r) { this.data.global.global = r.global; Online.cfg.global = r.global; SHARED.applyGlobal(r.global); Menu.show('dev', true); }
  },
};

/* ---------- integrasi ke menu ---------- */
Menu.screens.dev = function () { return DevPanel.render(); };
Menu.after.dev = function () {
  const q = $('devQ'); if (q) q.onkeydown = e => { if (e.key === 'Enter') DevPanel.act('dev:search'); };
  document.querySelectorAll('[data-dev-edit]').forEach(el => el.onchange = () => {
    const [id, unitId, field] = el.dataset.devEdit.split(':');
    const val = el.type === 'checkbox' ? el.checked : field === 'xp' ? +el.value : el.value || null;
    DevPanel.call('admin.unitEdit', { id, unitId, fields: { [field]: val } }, 'Unit diperbarui');
  });
};
