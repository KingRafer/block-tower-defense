/* =========================================================
 * Fitur online: akun Google, cloud save, teman, lobby,
 * jaringan (WebRTC + relay) dan sinkronisasi mabar co-op.
 * Backend: /api (Vercel) + MongoDB. Jika API tidak tersedia,
 * game tetap bisa dimainkan offline.
 * ========================================================= */
'use strict';

const API_BASE = window.BTD_API || '/api';
const ICE_SERVERS = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

/* ======================= AKUN & API ======================= */
const Online = {
  available: false, cfg: {}, user: null, token: null,
  syncing: false, lastSync: 0, requests: 0, presenceT: null, saveT: null, gisReady: false,

  async init() {
    try { this.token = localStorage.getItem('btd_token'); } catch (e) {}
    if (location.protocol === 'file:') return this.refreshUi();
    try {
      const r = await fetch(API_BASE + '?r=config', { cache: 'no-store' });
      if (!r.ok) throw new Error('no api');
      this.cfg = await r.json(); this.available = true;
      if (this.cfg.global) { SHARED.applyGlobal(this.cfg.global); CacheCtl.check(this.cfg.global, true); }   // harga/rate/event + perintah refresh dari panel developer
    } catch (e) { this.available = false; return this.refreshUi(); }
    this.initGoogle();
    if (this.token) {
      try { const r = await this.api('me', null, 'GET'); this.user = r.user; await this.syncOnLogin(); this.startPresence(); }
      catch (e) { if (e.status === 401) this.setToken(null); }
    }
    this.refreshUi();
  },

  async api(route, body, method = 'POST', query = {}, keepalive = false) {
    const qs = new URLSearchParams({ r: route, ...query }).toString();
    const opt = { method, headers: { 'Content-Type': 'application/json' }, keepalive };
    if (this.token) opt.headers.Authorization = 'Bearer ' + this.token;
    if (body && method !== 'GET') opt.body = JSON.stringify(body);
    let r;
    try { r = await fetch(API_BASE + '?' + qs, opt); }
    catch (e) { throw Object.assign(new Error('Tidak bisa terhubung ke server'), { status: 0 }); }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data.error || 'Gagal (' + r.status + ')'), { status: r.status });
    return data;
  },
  setToken(t) { this.token = t; try { t ? localStorage.setItem('btd_token', t) : localStorage.removeItem('btd_token'); } catch (e) {} },
  get loggedIn() { return !!this.user; },

  /* ---------- Google Identity Services ---------- */
  initGoogle() {
    if (!this.cfg.googleClientId) return;
    const go = () => {
      if (!(window.google && google.accounts && google.accounts.id)) return setTimeout(go, 300);
      google.accounts.id.initialize({ client_id: this.cfg.googleClientId, callback: r => this.onGoogle(r.credential), ux_mode: 'popup', auto_select: false });
      this.gisReady = true;
      document.querySelectorAll('.gbtn').forEach(el => this.renderGoogleButton(el));
    };
    go();
  },
  renderGoogleButton(el) {
    if (!el) return;
    if (!this.gisReady) { el.innerHTML = this.cfg.googleClientId ? '<small class="dim">Memuat tombol Google…</small>' : ''; return; }
    el.innerHTML = '';
    google.accounts.id.renderButton(el, { theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with', locale: 'id', width: 280 });
  },
  async onGoogle(credential) {
    try {
      const r = await this.api('auth.google', { credential });
      await this.afterLogin(r);
    } catch (e) { UI.toast('❌ Login gagal: ' + e.message); }
  },
  async devLogin(name) {
    try { await this.afterLogin(await this.api('auth.dev', { name })); }
    catch (e) { UI.toast('❌ ' + e.message); }
  },
  async afterLogin(r) {
    this.setToken(r.token); this.user = r.user;
    await this.syncOnLogin();
    this.startPresence();
    sfx('achieve'); UI.toast(`👋 Halo, ${r.user.name}! Progres tersinkron ke cloud.`, 'gold', 3500);
    this.refreshUi();
    Menu.show(r.isNew ? 'account' : (Menu.screen && Menu.screen !== 'end' ? Menu.screen : 'main'));
  },
  logout() {
    clearInterval(this.presenceT); this.presenceT = null;
    if (this.user) this.pushProfile();
    this.setToken(null); this.user = null; this.vaultReady = false;
    try { google.accounts.id.disableAutoSelect(); } catch (e) {}
    replaceProfile(defaultProfile()); Storage.save('btd_profile', PROFILE); SaveGame.clear(true);
    UI.toast('Kamu sudah keluar. Progres aman tersimpan di akunmu.');
    this.refreshUi(); Menu.show('main');
  },
  async rename(name) {
    const r = await this.api('me.update', { name });
    this.user = r.user; this.refreshUi(); return r.user;
  },

  /* ---------- Cloud save ---------- */
  async syncOnLogin() {
    if (!this.user) return;
    this.syncing = true;
    try {
      const { profile: cloud, updatedAt, settings: cSet, settingsAt, run: cRun } = await this.api('profile.get', null, 'GET');
      const localFresh = !PROFILE.stats.games && !PROFILE.xp;
      const sameOwner = PROFILE.ownerId === this.user.id;
      if (PROFILE.ownerId && !sameOwner) SaveGame.clear(true);           // simpanan permainan milik akun lain
      // pengaturan: pakai yang paling baru diubah
      if (cSet && (settingsAt || 0) > (SET.updatedAt || 0)) { Object.assign(SET, cSet, { updatedAt: settingsAt }); saveSettings(true); try { Sound.applyVolume(); } catch (e) {} }
      // permainan yang sedang berjalan: pakai yang paling baru disimpan
      const lRun = SaveGame.get();
      if (cRun && (!lRun || (cRun.saved || 0) > (lRun.saved || 0))) SaveGame.set(cRun, true);
      else if (lRun && (!cRun || (lRun.saved || 0) > (cRun.saved || 0))) this.runDirty = true;
      let useCloud = false;
      if (cloud) {
        if (localFresh) useCloud = true;
        else if (sameOwner) useCloud = updatedAt > (PROFILE.updatedAt || 0);
        else if (PROFILE.ownerId) useCloud = true;                       // data lokal milik akun lain
        else useCloud = (cloud.xp || 0) >= (PROFILE.xp || 0);            // data tamu → pakai yang progresnya lebih besar
      } else if (PROFILE.ownerId && !sameOwner) replaceProfile(defaultProfile());
      if (useCloud) replaceProfile(cloud);
      PROFILE.ownerId = this.user.id;
      Storage.save('btd_profile', PROFILE);
      if (!useCloud || this.runDirty || !cSet) await this.pushProfile();
      await this.loadVault();
      this.lastSync = Date.now();
    } catch (e) { UI.toast('⚠️ Sinkronisasi gagal: ' + e.message); }
    this.syncing = false;
  },
  /** Muat ekonomi dari server; progres tamu diimpor sekali saat akun baru dibuat */
  async loadVault() {
    const guestData = PROFILE.vaultOwner !== this.user.id ? PROFILE.vault : null;
    const r = await this.api('eco.init', { import: guestData });
    this.vaultReady = true;
    PROFILE.vaultOwner = this.user.id;
    Eco.apply(r.vault);
    if (r.created && guestData) UI.toast('📦 Unit & item dari perangkat ini dipindahkan ke akunmu', 'gold', 4000);
    Eco.act('dailyLogin', {}).then(d => { if (d && d.diamonds) UI.toast(`🎁 Hadiah login hari ke-${d.streak}: +${d.diamonds} 💎`, 'gold', 4000); }).catch(() => {});
  },
  async refreshVault() { if (!this.vaultReady) return; try { const r = await this.api('eco.state', null, 'GET'); Eco.apply(r.vault); } catch (e) {} },
  queueSave() {
    if (!this.user) return;
    clearTimeout(this.saveT);
    this.saveT = setTimeout(() => { this.saveT = null; this.pushProfile(); }, 4000);
  },
  /** Simpanan permainan berubah → ikut dikirim ke cloud */
  markRun() { this.runDirty = true; this.queueSave(); },
  /** Profil untuk cloud: tanpa inventori (sudah disimpan server) & data khusus perangkat */
  cloudProfile() { const { vault, ownerId, vaultOwner, ...rest } = PROFILE; return rest; },
  async pushProfile(keepalive) {
    if (!this.user) return;
    const body = { profile: this.cloudProfile(), updatedAt: PROFILE.updatedAt || Date.now(), level: levelFromXp(PROFILE.xp), settings: SET, settingsAt: SET.updatedAt || 0 };
    const sendRun = this.runDirty; if (sendRun) body.run = SaveGame.get();
    try {
      await this.api('profile.save', body, 'POST', {}, keepalive);
      if (sendRun) this.runDirty = false;
      this.lastSync = Date.now();
    } catch (e) { if (e.status === 401) { this.setToken(null); this.user = null; this.refreshUi(); } }
  },
  /** Tab ditutup / disembunyikan: kirim perubahan yang belum tersimpan */
  flush() { if (this.user && this.saveT) { clearTimeout(this.saveT); this.saveT = null; this.pushProfile(true); } },
  submitRun(run) { if (this.user) this.api('lb.submit', run).catch(() => {}); },

  /* ---------- Presence, undangan, notifikasi ---------- */
  startPresence() {
    clearInterval(this.presenceT);
    const beat = async () => {
      if (!this.user) return;
      try {
        const r = await this.api('presence', { roomCode: Lobby.room ? Lobby.room.code : null });
        if (r.requests !== this.requests) { if (r.requests > this.requests) UI.toast('👥 Ada permintaan pertemanan baru'); this.requests = r.requests; this.refreshUi(); }
        r.invites.forEach(inv => UI.invitePopup(inv));
      } catch (e) {}
    };
    beat(); this.presenceT = setInterval(beat, 25000);
  },
  refreshUi() {
    const b = document.querySelector('[data-badge="friends"]');
    if (b) b.textContent = this.requests || '';
    if (Menu.open && Menu.screen === 'main') Menu.show('main');
  },
};

/** Ganti seluruh isi PROFILE (objek tetap sama agar referensi lain aman) */
function replaceProfile(obj) {
  const src = JSON.parse(JSON.stringify(obj || {})), base = defaultProfile();
  if (!src.vault && PROFILE.vault) src.vault = JSON.parse(JSON.stringify(PROFILE.vault));   // profil cloud tidak membawa inventori
  if (!src.vault) delete base.vault;
  const fresh = migrateProfile(deepMerge(base, src));
  for (const k of Object.keys(PROFILE)) delete PROFILE[k];
  Object.assign(PROFILE, fresh);
}

/* ======================= LOBBY (ROOM) ======================= */
const Lobby = {
  room: null, pollT: null, busy: false,

  async create() {
    try { const r = await Online.api('room.create', { map: MAPS.indexOf(MAP), diff: DIFF, mode: MODE }); this.enter(r.room); }
    catch (e) { UI.toast('❌ ' + e.message); }
  },
  async join(code) {
    code = String(code || '').trim().toUpperCase();
    if (code.length < 4) return UI.toast('Masukkan kode room');
    try { const r = await Online.api('room.join', { code }); this.enter(r.room); }
    catch (e) { UI.toast('❌ ' + e.message); }
  },
  enter(room) {
    this.room = room; sfx('place');
    clearInterval(this.pollT); this.pollT = setInterval(() => this.refresh(), 1500);
    Menu.show('lobby');
  },
  async refresh() {
    if (!this.room || this.busy) return;
    this.busy = true;
    try {
      const r = await Online.api('room.get', null, 'GET', { code: this.room.code });
      this.room = r.room;
      if (this.room.state === 'playing' && !isMP()) { this.stopPoll(); MP.start(this.room); }
      else if (this.room.state === 'closed') { this.room = null; this.stopPoll(); UI.toast('Room ditutup oleh host'); Menu.show('mabar'); }
      else if (Menu.screen === 'lobby') Menu.updateLobby();
    } catch (e) {
      if (e.status === 403 || e.status === 404) { this.room = null; this.stopPoll(); UI.toast('Kamu sudah tidak ada di room'); if (!isMP()) Menu.show('mabar'); }
    }
    this.busy = false;
  },
  stopPoll() { clearInterval(this.pollT); this.pollT = null; },
  async leave() {
    const code = this.room && this.room.code;
    this.stopPoll(); this.room = null;
    if (code) await Online.api('room.leave', { code }).catch(() => {});
  },
  isHost() { return !!(this.room && Online.user && this.room.host === Online.user.id); },
  async update(fields) {
    if (!this.isHost()) return;
    Object.assign(this.room, fields); Menu.updateLobby();
    await Online.api('room.update', { code: this.room.code, ...fields }).catch(e => UI.toast('❌ ' + e.message));
  },
  async chat(text) {
    if (!text.trim() || !this.room) return;
    this.room.chat = [...(this.room.chat || []), { n: Online.user.name, t: text.trim().slice(0, 140), at: Date.now() }];
    Menu.updateLobby();
    await Online.api('room.chat', { code: this.room.code, text }).catch(() => {});
  },
  async start() {
    if (!this.isHost()) return;
    try { await Online.api('room.start', { code: this.room.code }); this.room.state = 'playing'; this.stopPoll(); MP.start(this.room); }
    catch (e) { UI.toast('❌ ' + e.message); }
  },
  async invite(friendId, name) {
    try { await Online.api('invite.send', { to: friendId, room: this.room.code }); UI.toast(`📨 Undangan dikirim ke ${name}`); }
    catch (e) { UI.toast('❌ ' + e.message); }
  },
};

/* ======================= JARINGAN ======================= */
/* Pesan dikirim langsung lewat WebRTC DataChannel bila tersambung (latensi rendah),
 * selain itu lewat relay server (Vercel + MongoDB). Relay juga dipakai untuk signaling. */
const Net = {
  code: null, me: null, peers: {}, out: [], onMessage: null, flushT: null, pollT: null, flushing: false, polling: false, lastPoll: 0,

  open(code, me, onMessage) {
    this.close();
    this.code = code; this.me = me; this.onMessage = onMessage;
    this.flushT = setInterval(() => this.flush(), 60);
    this.pollT = setInterval(() => this.maybePoll(), 120);
  },
  close() {
    clearInterval(this.flushT); clearInterval(this.pollT);
    for (const p of Object.values(this.peers)) { try { p.dc && p.dc.close(); p.pc && p.pc.close(); } catch (e) {} }
    this.peers = {}; this.out = []; this.code = null;
  },
  peer(pid) { return this.peers[pid] || (this.peers[pid] = { pid, pc: null, dc: null, iceQ: [], lastRecv: 0, tried: false }); },
  isDirect(pid) { const p = this.peers[pid]; return !!(p && p.dc && p.dc.readyState === 'open'); },
  allDirect() { const ps = Object.values(this.peers); return ps.length > 0 && ps.every(p => this.isDirect(p.pid)); },

  send(pid, msg, key) {
    if (this.isDirect(pid)) { try { this.peers[pid].dc.send(JSON.stringify(msg)); return; } catch (e) {} }
    this.queueRelay(pid, msg, key);
  },
  queueRelay(pid, msg, key) {
    if (key) {
      const old = this.out.find(o => o.to === pid && o.key === key);
      if (old) { if (msg.fx && old.d.fx) msg.fx = old.d.fx.concat(msg.fx).slice(-150); old.d = msg; return; }
    }
    this.out.push({ to: pid, d: msg, key });
  },
  async flush() {
    if (!this.code || !this.out.length || this.flushing) return;
    this.flushing = true;
    const batch = this.out.splice(0, 30);
    try { await Online.api('relay.send', { room: this.code, msgs: batch.map(o => ({ to: o.to, d: o.d })) }); }
    catch (e) { if (e.status !== 403 && e.status !== 404) this.out.unshift(...batch.filter(o => o.key !== 'snap')); }
    this.flushing = false;
  },
  async maybePoll() {
    if (!this.code || this.polling) return;
    const gap = this.allDirect() ? 2500 : 300;
    if (Date.now() - this.lastPoll < gap) return;
    this.polling = true; this.lastPoll = Date.now();
    try {
      const r = await Online.api('relay.poll', null, 'GET', { room: this.code });
      for (const m of r.msgs) this.recv(m.from, m.d);
    } catch (e) {}
    this.polling = false;
  },
  recv(from, d) {
    if (!d) return;
    this.peer(from).lastRecv = Date.now();
    if (d.t === 'sig' || d.t === 'ice') return this.onSignal(from, d);
    if (this.onMessage) this.onMessage(from, d);
  },

  /* ---------- WebRTC ---------- */
  makePc(pid) {
    const p = this.peer(pid);
    if (typeof RTCPeerConnection === 'undefined') return null;
    try { p.pc && p.pc.close(); } catch (e) {}
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = e => { if (e.candidate) this.queueRelay(pid, { t: 'ice', c: e.candidate.toJSON() }); };
    pc.ondatachannel = e => this.setupDc(pid, e.channel);
    pc.onconnectionstatechange = () => { if (['failed', 'closed'].includes(pc.connectionState)) p.dc = null; };
    p.pc = pc; p.iceQ = [];
    return pc;
  },
  setupDc(pid, dc) {
    const p = this.peer(pid); p.dc = dc;
    dc.onmessage = e => { try { this.recv(pid, JSON.parse(e.data)); } catch (err) {} };
    dc.onopen = () => { if (this.onMessage) this.onMessage(pid, { t: '_direct' }); };
    dc.onclose = () => { if (p.dc === dc) p.dc = null; };
  },
  async connect(pid) {
    const p = this.peer(pid); p.tried = true;
    const pc = this.makePc(pid); if (!pc) return;
    this.setupDc(pid, pc.createDataChannel('game'));
    try {
      await pc.setLocalDescription(await pc.createOffer());
      this.queueRelay(pid, { t: 'sig', sdp: pc.localDescription.toJSON() });
    } catch (e) {}
  },
  async onSignal(from, d) {
    const p = this.peer(from);
    try {
      if (d.t === 'sig' && d.sdp.type === 'offer') {
        const pc = this.makePc(from); if (!pc) return;
        await pc.setRemoteDescription(d.sdp);
        await pc.setLocalDescription(await pc.createAnswer());
        this.queueRelay(from, { t: 'sig', sdp: pc.localDescription.toJSON() });
        for (const c of p.iceQ) await pc.addIceCandidate(c).catch(() => {});
        p.iceQ = [];
      } else if (d.t === 'sig' && d.sdp.type === 'answer' && p.pc) {
        await p.pc.setRemoteDescription(d.sdp);
        for (const c of p.iceQ) await p.pc.addIceCandidate(c).catch(() => {});
        p.iceQ = [];
      } else if (d.t === 'ice') {
        if (p.pc && p.pc.remoteDescription) await p.pc.addIceCandidate(d.c).catch(() => {});
        else p.iceQ.push(d.c);
      }
    } catch (e) {}
  },
};

/* ======================= MABAR CO-OP ======================= */
/* Host menjalankan simulasi penuh dan mengirim snapshot; tamu mengirim aksi. */
const MP = {
  room: null, lastQ: 0, sendT: 0, seq: 0, helloT: 0, gotInit: false, lastSnapAt: 0, warned: false, roomCheckT: 0, chatLog: [],

  start(room) {
    const me = Online.user.id;
    this.room = room; this.lastQ = 0; this.seq = 0; this.gotInit = false; this.warned = false; this.chatLog = [];
    MAP = MAPS[room.map] || MAPS[0]; DIFF = room.diff; MODE = room.mode;
    const role = room.host === me ? 'host' : 'guest';
    newGame({ mp: { role, me, room: room.code, hostId: room.host } });
    room.players.forEach((p, i) => {
      S.players[p.id] = { name: p.name, cash: S.cash, earned: 0, units: p.id === me ? myUnitsMap() : null,
        color: PLAYER_COLORS[i % PLAYER_COLORS.length], abilityCd: p.id === me ? S.abilityCd : {}, online: p.id === me, level: p.level };
    });
    Net.open(room.code, me, (from, msg) => this.onMessage(from, msg));
    if (role === 'guest') { Net.connect(room.host); this.sayHello(); }
    this.lastSnapAt = performance.now();
    PROFILE.stats.games++; saveProfile();
    Menu.close(); UI.refreshAll();
    UI.banner(`🤝 Mabar • ${MAP.name}`, '#fff', 1600);
    this.sysChat(`Room ${room.code} • ${room.players.length} pemain`);
  },
  sayHello() { Net.send(S.mp.hostId, { t: 'hello', units: myUnitsMap(), name: Online.user.name, level: levelFromXp(PROFILE.xp) }); },
  act(a) { if (isGuest()) Net.send(S.mp.hostId, { t: 'act', ...a }); },
  guests() { return Object.keys(S.players).filter(id => id !== S.me); },

  /* ---------- pesan masuk ---------- */
  onMessage(from, m) {
    if (!S || !S.mp) return;
    const p = S.players[from];
    if (p) { p.online = true; p.lastSeen = Date.now(); }
    if (m.t === '_direct') { UI.toast(`⚡ Terhubung langsung dengan ${p ? p.name : 'pemain'}`); return; }
    if (m.t === 'chat') { this.addChat(m.n, m.m); if (isHost()) for (const id of this.guests()) if (id !== from) Net.send(id, m); return; }
    if (isHost()) {
      if (!p) return;
      if (m.t === 'hello') {
        p.units = m.units || {}; p.level = m.level; p.online = true;
        S.towers.filter(t => t.owner === from).forEach(t => { t.L = computeL(t.type, t.level, unitFor(t.type, from)); });
        const meta = {};
        for (const [id, q] of Object.entries(S.players)) meta[id] = { name: q.name, color: q.color, units: id === S.me ? myUnitsMap() : q.units, level: q.level };
        for (const id of this.guests()) Net.send(id, { t: 'init', players: meta, map: MAPS.indexOf(MAP), diff: S.diff, mode: S.mode });
        return;
      }
      if (m.t === 'act') return this.applyAction(from, m);
    } else {
      if (m.t === 'init') {
        this.gotInit = true;
        for (const [id, q] of Object.entries(m.players)) {
          const cur = S.players[id] || (S.players[id] = { cash: S.cash, earned: 0, abilityCd: {} });
          Object.assign(cur, { name: q.name, color: q.color, level: q.level, units: id === S.me ? myUnitsMap() : q.units });
        }
        return;
      }
      if (m.t === 'snap') return this.applySnap(m);
      if (m.t === 'end') return this.onEnd(m);
    }
  },

  applyAction(pid, m) {
    const tw = id => S.towers.find(t => t.id === id);
    switch (m.a) {
      case 'place': if (TOWERS[m.type]) placeTower(m.type, m.c | 0, m.r | 0, pid); break;
      case 'upgrade': upgradeTower(tw(m.id), pid); break;
      case 'sell': sellTower(tw(m.id), pid); break;
      case 'skill': Skills.use(tw(m.id), pid); break;
      case 'target': { const t = tw(m.id); if (t && t.owner === pid && TARGET_MODES.includes(m.mode)) t.target = m.mode; break; }
      case 'start': startWave(); break;
      case 'skip': skipWave(); break;
      case 'ability': execAbility(m.id, pid, +m.x || 0, +m.y || 0); break;
    }
  },

  /* ---------- host: kirim snapshot ---------- */
  hostTick(dt) {
    this.sendT += dt;
    const guests = this.guests();
    for (const id of guests) {   // tandai pemain yang tidak merespons
      const p = S.players[id];
      if (p.online && p.lastSeen && Date.now() - p.lastSeen > 20000) { p.online = false; this.sysChat(`${p.name} terputus`); }
    }
    const fast = guests.some(id => Net.isDirect(id));
    if (this.sendT < (fast ? 0.1 : 0.3)) return;
    this.sendT = 0;
    const fx = S.fxOut; S.fxOut = [];
    const snap = this.buildSnap();
    for (const id of guests) {
      const p = S.players[id];
      if (!Net.isDirect(id) && this.seq % 3 !== 0 && fast) { p.fxQ = (p.fxQ || []).concat(fx); continue; }
      const myFx = (p.fxQ || []).concat(fx).slice(-150); p.fxQ = [];
      Net.send(id, { ...snap, fx: myFx }, 'snap');
    }
    this.seq++;
  },
  buildSnap() {
    const pl = {};
    for (const [id, p] of Object.entries(S.players)) pl[id] = { c: Math.floor(pcash(id)), e: Math.floor(id === S.me ? S.earned : p.earned), cd: id === S.me ? S.abilityCd : p.abilityCd, on: id === S.me ? 1 : p.online ? 1 : 0, d: Net.isDirect(id) ? 1 : 0 };
    const r1 = v => Math.round(v * 10) / 10;
    return {
      t: 'snap', q: ++this.lastQ, w: S.wave, mw: S.maxWave === Infinity ? -1 : S.maxWave, st: S.state, hp: Math.ceil(S.hp), mhp: S.maxHp,
      tm: r1(S.time), fz: r1(S.freezeT), oc: r1(S.overclockT), sh: r1(S.shieldT), rd: r1(S.radarT), sq: S.spawnQ.length, k: S.kills, bk: S.bossKills, sp: S.speed, pl,
      tw: S.towers.map(t => [t.id, t.type, t.c, t.r, t.level, r1(t.angle), t.owner, t.evo ? 1 : 0, t.trait || 0, S.time < t.stunUntil ? 1 : 0, t.target, t.buff > 0 ? 1 : 0, Math.round(t.dmg), t.kills, t.spent, t.recoil > 0.5 ? 1 : 0, t.skin || 'default', Skills.left(t)]),
      en: S.enemies.map(e => [e.id, e.type, Math.round(e.x), Math.round(e.y), Math.ceil(e.hp), Math.ceil(e.maxHp),
        (S.time < e.slowUntil ? 1 : 0) | (e.dot && S.time < e.dot.until ? (e.dot.col === 'poison' ? 16 : 2) : 0) | (e.frozenUntil > S.time ? 4 : 0) | (e.hitT > 0 ? 8 : 0) | (e.hidden ? 32 : 0), e.maxShield ? Math.round(e.shieldHp / e.maxShield * 100) : 0]),
      pr: S.projectiles.map(p => [Math.round(p.x), Math.round(p.y), r1(p.a || 0), p.big ? 1 : 0]),
      sk: S.strikes.map(s => [Math.round(s.x), Math.round(s.y), r1(s.t), s.max, s.r || 1.4, s.big ? 1 : 0]),
      pk: S.projectiles.map(p => p.kind || ''),
    };
  },
  broadcastEnd(won) {
    for (const id of this.guests()) {
      const p = S.players[id];
      const msg = { t: 'end', won, w: S.wave, k: S.kills, bk: S.bossKills, uxp: S.uxpBy[id] || {}, e: p.earned };
      Net.send(id, msg); Net.queueRelay(id, msg);   // kirim lewat dua jalur agar pasti sampai
    }
    Net.flush();
    setTimeout(() => this.cleanup(), 4000);
  },

  /* ---------- tamu: terapkan snapshot ---------- */
  applySnap(m) {
    if (m.q <= this.lastQ) { this.applyFx(m.fx || []); return; }
    this.lastQ = m.q; this.lastSnapAt = performance.now(); this.warned = false;
    if (S.state !== 'win' && S.state !== 'lose') S.state = m.st === 'win' || m.st === 'lose' ? S.state : m.st;
    Object.assign(S, { wave: m.w, maxWave: m.mw < 0 ? Infinity : m.mw, hp: m.hp, maxHp: m.mhp, time: m.tm, freezeT: m.fz, overclockT: m.oc || 0, shieldT: m.sh || 0, radarT: m.rd || 0, kills: m.k, bossKills: m.bk, speed: m.sp });
    S.spawnQ = new Array(m.sq);
    for (const [id, q] of Object.entries(m.pl)) {
      if (id === S.me) { S.cash = q.c; S.earned = q.e; S.abilityCd = q.cd || {}; }
      const p = S.players[id] || (S.players[id] = { name: 'Pemain', color: PLAYER_COLORS[Object.keys(S.players).length % 4], units: null });
      p.cash = q.c; p.earned = q.e; p.abilityCd = q.cd || {}; p.online = !!q.on; p.direct = !!q.d;
    }
    // tower
    const old = Object.fromEntries(S.towers.map(t => [t.id, t]));
    S.towers = m.tw.map(a => {
      const [id, type, c, r, level, angle, owner, evo, trait, stun, target, buff, dmg, kills, spent, shot, skin, skLeft] = a;
      let t = old[id];
      if (!t) t = { id, type, c, r, x: (c + 0.5) * T, y: (r + 0.5) * T, recoil: 0, cd: 0, shots: 0, ramp: 0 };
      if (t.level !== level || t.owner !== owner || !t.L) t.L = computeL(type, level, unitFor(type, owner));
      Object.assign(t, { skLeft: skLeft || 0, skCd: S.time + (skLeft || 0), level, angle, owner, evo: !!evo, skin: skin || 'default', trait: trait || null, stunUntil: stun ? S.time + 0.3 : 0, target, buff: buff ? 0.1 : 0, dmg, kills, spent });
      if (shot) t.recoil = 1;
      return t;
    });
    if (S.selected && !S.towers.includes(S.selected)) { S.selected = S.towers.find(t => t.id === S.selected.id) || null; if (!S.selected) UI.hidePanel(); }
    // musuh
    const oldE = Object.fromEntries(S.enemies.map(e => [e.id, e]));
    S.enemies = m.en.map(([id, type, x, y, hp, maxHp, f, sh]) => {
      let e = oldE[id];
      if (!e) e = { ...ENEMIES[type], id, type, x, y, wob: Math.random() * 6, hitT: 0 };
      Object.assign(e, { tx: x, ty: y, hp, maxHp, slowUntil: f & 1 ? S.time + 0.4 : 0, dot: f & 18 ? { until: S.time + 0.4, col: f & 16 ? 'poison' : 'burn' } : null, frozenUntil: f & 4 ? S.time + 0.4 : 0 });
      if (f & 8) e.hitT = 0.1;
      e.hidden = !!(f & 32); e.maxShield = sh ? 100 : 0; e.shieldHp = sh || 0;
      return e;
    });
    for (const id in oldE) if (!S.enemies.some(e => e.id === +id)) puff(oldE[id].x, oldE[id].y, oldE[id].color, oldE[id].boss ? 20 : 6);
    S.projectiles = m.pr.map(([x, y, a, big], i) => ({ x, y, a, big: !!big, kind: (m.pk || [])[i] || '' }));
    S.strikes = m.sk.map(([x, y, t, max, r, big]) => ({ x, y, t, max, r, big: !!big }));
    this.applyFx(m.fx || []);
  },
  applyFx(list) {
    for (const f of list) {
      switch (f[0]) {
        case 't': atkFx(f[1], f[2], f[3], f[4], f[5], f[6], f[7], f[8]); sfx(f[8] === 'sniper' ? 'snipe' : f[8] === 'freezer' ? 'freeze' : 'shoot'); break;
        case 'b': S.effects.push({ kind: 'boom', x: f[1], y: f[2], r: f[3], life: f[4], max: f[4] }); sfx('boom'); break;
        case 's': S.effects.push({ kind: 'shock', x: f[1], y: f[2], r: f[3], col: f[4], life: f[5], max: f[5] }); sfx('stun'); break;
        case 'p': puff(f[1], f[2], f[3], f[4]); if (f[5]) sfx(f[5]); break;
        case 'x': addText(f[1], f[2], f[3], f[4], f[5]); break;
        case 'n': UI.banner(f[1], f[2], f[3]); if (f[4]) sfx(f[4]); break;
        case 'k': PROFILE.stats.bossKills++; UI.toast('👑 Boss dikalahkan!'); break;
      }
    }
  },
  guestTick(dt) {
    S.time += dt;
    const k = Math.min(1, dt * 12);
    for (const e of S.enemies) if (e.tx !== undefined) { e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; e.hitT = Math.max(0, (e.hitT || 0) - dt); }
    for (const t of S.towers) t.recoil = Math.max(0, t.recoil - dt * 6);
    updateEffects(dt);
    this.helloT -= dt;
    if (!this.gotInit && this.helloT <= 0) { this.helloT = 2; this.sayHello(); }
    if (!this.warned && performance.now() - this.lastSnapAt > 12000) { this.warned = true; UI.toast('⚠️ Koneksi ke host terputus… menunggu', '', 5000); }
    this.roomCheckT -= dt;
    if (this.roomCheckT <= 0) { this.roomCheckT = 5; this.checkRoom(); }
    if (this.warned && performance.now() - this.lastSnapAt > 40000 && S.state !== 'lose' && S.state !== 'win') this.hostGone();
  },
  async checkRoom() {
    try { const r = await Online.api('room.get', null, 'GET', { code: S.mp.room }); if (r.room.state === 'closed' || r.room.host !== S.mp.hostId) this.hostGone(); }
    catch (e) { if (e.status === 404 || e.status === 403) this.hostGone(); }
  },
  hostGone() {
    if (!S || !S.mp || S.recorded) return;
    UI.toast('🚪 Host meninggalkan permainan', '', 4000);
    S.state = 'lose'; finishGame(false); this.cleanup();
  },
  onEnd(m) {
    if (S.recorded) return;
    Object.assign(S, { wave: m.w, kills: m.k, bossKills: m.bk, uxp: m.uxp || {}, earned: m.e || S.earned });
    S.state = m.won ? 'win' : 'lose';
    finishGame(m.won); this.cleanup();
  },
  tick(dt) { if (!S || !S.mp || S.recorded) return; if (isHost()) this.hostTick(dt); },
  async cleanup() { Net.close(); await Lobby.leave(); },
  async leave() {
    if (!S || !S.mp) return;
    if (isHost()) for (const id of this.guests()) Net.queueRelay(id, { t: 'end', won: false, w: S.wave, k: S.kills, bk: S.bossKills, uxp: S.uxpBy[id] || {}, e: S.players[id].earned });
    await Net.flush();
    await this.cleanup();
  },

  /* ---------- chat dalam game ---------- */
  chat(text) {
    text = String(text || '').replace(/[<>]/g, '').trim().slice(0, 140);
    if (!text || !S || !S.mp) return;
    const msg = { t: 'chat', n: Online.user.name, m: text };
    this.addChat(msg.n, msg.m);
    if (isHost()) for (const id of this.guests()) Net.send(id, msg); else Net.send(S.mp.hostId, msg);
  },
  addChat(n, m) { this.chatLog.push({ n, m, at: Date.now() }); this.chatLog = this.chatLog.slice(-40); UI.renderChat(); },
  sysChat(m) { this.addChat('', m); },
};
