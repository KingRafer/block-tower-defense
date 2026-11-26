/* =========================================================
 * Aplikasi (PWA): service worker + tombol pasang aplikasi
 * ========================================================= */
'use strict';

const PWA = {
  prompt: null,
  installed: () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
  isIOS: () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  canPrompt() { return !!this.prompt; },
  async install() {
    if (!this.prompt) { Menu.show('download', true); return; }
    this.prompt.prompt();
    const { outcome } = await this.prompt.userChoice.catch(() => ({}));
    this.prompt = null;
    if (outcome === 'accepted') UI.toast('📲 Aplikasi dipasang!');
  },
  init() {
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); this.prompt = e; if (Menu.screen === 'download') Menu.show('download', true); });
    window.addEventListener('appinstalled', () => { this.prompt = null; UI.toast('✅ Block Tower Defense terpasang'); if (Menu.screen === 'main') Menu.show('main', true); });
    if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  },
};
PWA.init();

/* =========================================================
 * Refresh / bersihkan cache dari developer (admin.forceRefresh)
 * Klien mengecek /api?r=config berkala; bila versi refresh naik,
 * permainan disimpan dulu lalu halaman dimuat ulang.
 * ========================================================= */
const CacheCtl = {
  KEY: 'btd_refresh_v', pending: null, timer: null,
  stored() { try { return +localStorage.getItem(this.KEY) || 0; } catch (e) { return 0; } },
  store(v) { try { localStorage.setItem(this.KEY, String(v)); } catch (e) {} },
  /** Dipanggil setiap konfigurasi server diterima */
  check(g, initial) {
    const r = g && g.refresh; if (!r || !r.v) return;
    const cur = this.stored();
    if (!cur) { this.store(r.v); return; }            // pengunjung baru: tidak perlu dimuat ulang
    if (r.v <= cur || this.pending) return;
    // baru membuka game: file sudah terbaru dari jaringan → cukup bersihkan cache diam-diam tanpa memuat ulang
    if (initial) { this.store(r.v); if (r.mode === 'clear') this.clearCaches(true); return; }
    this.trigger(r);
  },
  async clearCaches(keepSw) {
    try { if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } } catch (e) {}
    if (!keepSw) try { if (navigator.serviceWorker) { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(x => x.unregister())); } } catch (e) {}
    try { sessionStorage.clear(); } catch (e) {}
  },
  inMatch() { return typeof S !== 'undefined' && S && S.wave > 0 && S.state !== 'win' && S.state !== 'lose'; },
  trigger(r) {
    this.pending = r;
    const go = () => {
      // tunggu sampai pemain keluar dari permainan mabar agar teman tidak terputus
      if (typeof isMP === 'function' && isMP() && this.inMatch()) { UI.toast('🔄 Pembaruan dari developer menunggu permainan mabar selesai…', '', 4000); this.timer = setTimeout(go, 15000); return; }
      // permainan solo sedang di tengah wave: tunggu wave selesai (maks 90 dtk) agar progres tersimpan
      if (this.inMatch() && S.state === 'wave' && (this.waited = (this.waited || 0) + 3) <= 90) {
        if (this.waited === 3) UI.toast('🔄 Pembaruan dari developer — game dimuat ulang setelah wave ini selesai', 'gold', 4000);
        this.timer = setTimeout(go, 3000); return;
      }
      this.store(r.v);
      let n = 5;
      const tick = () => {
        UI.toast(`🔄 ${r.msg || (r.mode === 'clear' ? 'Developer membersihkan cache game' : 'Developer memperbarui game')} — memuat ulang dalam ${n}…`, 'gold', 1100);
        if (n-- > 0) { this.timer = setTimeout(tick, 1000); return; }
        this.apply(r);
      };
      tick();
    };
    go();
  },
  async apply(r) {
    try { if (this.inMatch() && !isMP()) saveGameState(); } catch (e) {}
    try { if (typeof saveProfile === 'function') saveProfile(); } catch (e) {}
    if (r.mode === 'clear') await this.clearCaches(false);
    location.replace(location.pathname + '?v=' + r.v);
  },
  /** Ambil konfigurasi terbaru (juga memperbarui pengumuman, event & harga secara langsung) */
  async poll() {
    if (location.protocol === 'file:' || document.hidden) return;
    try {
      const res = await fetch(API_BASE + '?r=config&t=' + Date.now(), { cache: 'no-store' }); if (!res.ok) return;
      const cfg = await res.json();
      if (cfg.global) { Online.cfg.global = cfg.global; SHARED.applyGlobal(cfg.global); this.check(cfg.global); }
    } catch (e) {}
  },
  start() {
    setInterval(() => this.poll(), 45000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.poll(); });
  },
};
CacheCtl.start();
