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
