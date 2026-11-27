/* =========================================================
 * Latar lobby pixel-art: padang rumput + kerajaan di kejauhan
 * + perkemahan (tenda, api unggun, panji). Digambar di kanvas
 * resolusi rendah (tinggi 324px) lalu diperbesar "pixelated".
 * Warna berganti sesuai jam WIB (pagi/siang/senja/malam).
 * ========================================================= */
'use strict';

const LobbyScene = {
  img: null, cv: null, ctx: null, base: null, W: 0, H: 0, ox: 0, oy: 0, sky: 'day', timer: 0, t: 0, ready: false,

  mount(el) {
    if (!this.cv) {
      this.cv = document.createElement('canvas'); this.cv.className = 'pxscene';
      this.ctx = this.cv.getContext('2d');
      this.img = new Image(); this.img.onload = () => { this.ready = true; this.build(); };
      this.img.src = 'assets/lobby-bg.png';
      addEventListener('resize', () => { if (this.timer) this.build(); });
    }
    if (this.cv.parentNode !== el) { el.innerHTML = ''; el.appendChild(this.cv); }
    const hour = new Date(Date.now() + 7 * 3600e3).getUTCHours();
    const sky = hour >= 5 && hour < 8 ? 'dawn' : hour < 16 ? 'day' : hour < 19 ? 'dusk' : 'night';
    if (sky !== this.sky) { this.sky = sky; this.base = null; }
    this.build(); this.start();
  },
  start() { if (!this.timer) this.timer = setInterval(() => this.frame(), 110); },
  stop() { clearInterval(this.timer); this.timer = 0; },

  /** Ukuran kanvas mengikuti rasio layar; gambar dipotong (cover) */
  build() {
    if (!this.ready) return;
    const asp = innerWidth / Math.max(1, innerHeight);
    let W, H;
    if (asp >= 576 / 324) { W = 576; H = Math.round(576 / asp); } else { H = 324; W = Math.max(120, Math.round(324 * asp)); }
    const key = W + 'x' + H + this.sky;
    if (this.base && this.base.key === key) return this.frame();
    this.W = W; this.H = H;
    this.ox = Math.round((576 - W) * 0.4); this.oy = Math.round((324 - H) * 0.55);
    this.cv.width = W; this.cv.height = H;
    const b = document.createElement('canvas'); b.width = W; b.height = H; b.key = key;
    const g = b.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(this.img, -this.ox, -this.oy);
    this.g = g; this.drawStatic();
    this.tint(g);
    this.base = b; this.frame();
  },
  /** x relatif lebar tampilan, y koordinat gambar asli */
  X(f) { return Math.round(this.W * f); },
  Y(y) { return y - this.oy; },
  r(x, y, w, h, c) { const g = this.g; g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); },
  tri(x, y, w, h, c, c2) { // atap/tenda segitiga (x,y = puncak kiri bawah)
    for (let i = 0; i < h; i++) { const hw = Math.round((i + 1) * (w / 2) / h); const cx = x + w / 2;
      this.r(cx - hw, y - h + i, hw, 1, c); this.r(cx, y - h + i, hw, 1, c2 || c); }
  },

  positions() {
    const narrow = this.W < 300;
    return narrow
      ? { castle: 0.62, tents: [[0.14, 'red'], [0.38, 'pav'], [0.86, 'blue']], fire: 0.26, banner: 0.52, crates: 0.74 }
      : { castle: 0.80, tents: [[0.05, 'blue'], [0.16, 'pav'], [0.29, 'red'], [0.94, 'red']], fire: 0.235, banner: 0.345, crates: 0.885 };
  },

  drawStatic() {
    const P = this.positions(), hy = this.Y(231); this.flags = [];
    this.castle(this.X(P.castle), hy);
    // jalan tanah dari kemah ke kerajaan
    const x0 = this.X(P.fire), x1 = this.X(P.castle) - 2;
    for (let y = this.Y(232); y < this.H; y++) {
      const k = (y - this.Y(232)) / Math.max(1, this.H - this.Y(232));
      const cx = x1 + (x0 - x1) * Math.min(1, k * 1.6) + Math.sin(k * 5) * 6 * k, w = 1 + k * 12;
      this.r(cx - w / 2, y, w, 1, k < 0.15 ? '#a9b47c' : '#c9b27a');
      if (w > 4) this.r(cx - w / 2, y, 1, 1, '#a48e5a');
    }
    for (const [f, kind] of P.tents) this.tent(this.X(f), this.Y(kind === 'pav' ? 276 : 272), kind);
    this.crates(this.X(P.crates), this.Y(279));
    this.bannerPole(this.X(P.banner), this.Y(282));
    this.firePit(this.X(P.fire), this.Y(288));
  },

  castle(cx, by) {
    const L = '#c3d0d4', M = '#9fb2ba', D = '#77909c', K = '#4c6170', RF = '#b8574a', RD = '#86403a', WN = '#3e4c58';
    // bukit tempat kastil berdiri
    for (let i = 0; i < 9; i++) { const w = 56 + i * 9; this.r(cx - w / 2, by - 9 + i, w, 1, i < 2 ? '#86c08e' : '#78b885'); }
    const block = (x, y, w, h) => { this.r(x, y, w, h, M); this.r(x, y, Math.max(1, Math.round(w * .35)), h, L); this.r(x + w - Math.max(1, Math.round(w * .25)), y, Math.max(1, Math.round(w * .25)), h, D); };
    const cren = (x, y, w) => { for (let i = 0; i < w; i += 3) this.r(x + i, y - 2, 2, 2, i < w * .4 ? L : M); };
    const by2 = by - 8;
    // tembok luar
    block(cx - 36, by2 - 11, 72, 11); cren(cx - 36, by2 - 11, 72);
    // menara pojok
    for (const tx of [cx - 40, cx + 32]) { block(tx, by2 - 24, 8, 24); this.tri(tx - 1, by2 - 24, 10, 9, RF, RD); this.r(tx + 3, by2 - 18, 2, 3, WN); }
    // keep utama
    block(cx - 13, by2 - 30, 26, 30); cren(cx - 13, by2 - 30, 26);
    for (const wx of [cx - 8, cx - 1, cx + 6]) this.r(wx, by2 - 24, 2, 4, WN);
    // menara tengah tinggi
    block(cx - 5, by2 - 46, 10, 16); this.tri(cx - 6, by2 - 46, 12, 12, RF, RD); this.r(cx - 1, by2 - 41, 2, 4, WN);
    // menara samping keep
    for (const tx of [cx - 19, cx + 13]) { block(tx, by2 - 36, 6, 22); this.tri(tx - 1, by2 - 36, 8, 7, RF, RD); }
    // gerbang
    this.r(cx - 4, by2 - 8, 8, 8, K); this.r(cx - 3, by2 - 9, 6, 1, K); this.r(cx - 3, by2 - 6, 1, 6, '#5d4a36'); this.r(cx + 2, by2 - 6, 1, 6, '#5d4a36');
    // rumah desa di kaki kastil
    for (const [dx, dy] of [[-50, 2], [-44, 4], [40, 3], [47, 1], [-30, 6], [28, 6]]) {
      const hx = cx + dx, hy = by2 + dy; this.r(hx, hy - 3, 6, 3, '#e7dcc0'); this.r(hx + 4, hy - 3, 2, 3, '#c9bc9c'); this.tri(hx - 1, hy - 3, 8, 3, '#a9574a', '#80403a');
    }
    this.castleAt = { cx, by2 };
  },

  tent(x, by, kind) {
    const pal = { red: ['#c9533f', '#f0e2bd', '#9b3b2e', '#c9b994'], blue: ['#3f6fa6', '#ece4c6', '#2d5180', '#c4b991'], pav: ['#d8a84a', '#f3e8c8', '#a67a2e', '#cbbd95'] }[kind];
    const w = kind === 'pav' ? 40 : 28, h = kind === 'pav' ? 24 : 19, x0 = x - w / 2;
    this.r(x0 - 1, by, w + 4, 2, 'rgba(20,60,30,.35)'); // bayangan
    for (let i = 0; i < h; i++) {
      const hw = Math.round((i + 1) * (w / 2) / h), y = by - h + i, cx = x;
      for (let k = -hw; k < hw; k++) {
        const stripe = Math.floor((k + 40) / 4) % 2 === 0, right = k >= 0;
        this.g.fillStyle = right ? (stripe ? pal[2] : pal[3]) : (stripe ? pal[0] : pal[1]);
        this.g.fillRect(cx + k, y, 1, 1);
      }
    }
    if (kind === 'pav') { this.r(x0 - 2, by - 8, w + 4, 2, pal[2]); for (let i = 0; i < w + 4; i += 4) this.r(x0 - 2 + i, by - 6, 2, 2, pal[0]); }
    // pintu
    const dh = Math.round(h * .55); for (let i = 0; i < dh; i++) { const hw = Math.round((i + 1) * 4 / dh); this.r(x - hw, by - dh + i, hw * 2, 1, '#2a1f1a'); }
    this.r(x, by - h - 6, 1, 6, '#5b4532');
    this.flags = this.flags || []; this.flags.push({ x, y: by - h - 6, c: kind === 'blue' ? '#e9c34a' : kind === 'pav' ? '#3f6fa6' : '#f0e2bd' });
  },

  bannerPole(x, by) {
    this.r(x, by - 34, 2, 34, '#5b4532'); this.r(x - 1, by - 35, 4, 1, '#d9b552');
    this.r(x - 1, by, 4, 1, 'rgba(20,60,30,.4)');
    this.banner = { x: x + 2, y: by - 32 };
  },
  crates(x, by) {
    const box = (bx, y) => { this.r(bx, y - 7, 8, 7, '#a77b45'); this.r(bx, y - 7, 8, 1, '#c99a5a'); this.r(bx + 6, y - 7, 2, 7, '#7d5a31'); this.r(bx + 3, y - 7, 1, 7, '#7d5a31'); };
    box(x - 8, by); box(x, by); box(x - 4, by - 7);
    this.r(x + 10, by - 9, 6, 9, '#8a5a32'); this.r(x + 10, by - 7, 6, 1, '#5b3c22'); this.r(x + 10, by - 3, 6, 1, '#5b3c22'); this.r(x + 14, by - 9, 2, 9, '#6d4626');
    // rak senjata
    this.r(x - 16, by - 10, 1, 10, '#5b4532'); this.r(x - 10, by - 10, 1, 10, '#5b4532'); this.r(x - 16, by - 8, 7, 1, '#5b4532');
    this.r(x - 15, by - 15, 1, 14, '#c9ced4'); this.r(x - 13, by - 14, 1, 13, '#c9ced4'); this.r(x - 11, by - 13, 1, 12, '#c9ced4');
  },
  firePit(x, by) {
    for (const [dx, c] of [[-5, '#7b7f86'], [-3, '#9aa0a8'], [2, '#7b7f86'], [4, '#9aa0a8']]) this.r(x + dx, by - 1, 2, 2, c);
    this.r(x - 4, by - 3, 9, 2, '#6b4426'); this.r(x - 3, by - 4, 7, 1, '#8a5a32');
    // batang kayu tempat duduk
    this.r(x - 16, by - 2, 8, 3, '#7a5130'); this.r(x - 16, by - 2, 8, 1, '#9a6a40'); this.r(x + 10, by, 8, 3, '#7a5130'); this.r(x + 10, by, 8, 1, '#9a6a40');
    this.fire = { x, y: by - 4 };
  },

  tint(g) {
    const T = { dawn: ['#ffd2b0', 'rgba(255,150,120,.10)'], dusk: ['#e9a48c', 'rgba(120,40,110,.16)'], night: ['#4a5b96', 'rgba(10,15,45,.25)'] }[this.sky];
    if (!T) return;
    g.globalCompositeOperation = 'multiply'; g.fillStyle = T[0]; g.fillRect(0, 0, this.W, this.H);
    g.globalCompositeOperation = 'source-over'; g.fillStyle = T[1]; g.fillRect(0, 0, this.W, this.H);
    if (this.sky === 'night') {
      let s = 11; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
      for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,230,${0.35 + rnd() * 0.5})`; g.fillRect(Math.floor(rnd() * this.W), Math.floor(rnd() * this.Y(200)), 1, 1); }
    }
  },

  frame() {
    if (!this.base || !this.cv.isConnected || this.cv.parentNode.style.display === 'none' || document.hidden) return;
    const c = this.ctx, t = (this.t += 1), dark = this.sky === 'night' || this.sky === 'dusk';
    c.imageSmoothingEnabled = false; c.drawImage(this.base, 0, 0);
    const px = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
    // panji di puncak tenda (berkibar)
    for (const f of this.flags || []) { const a = (t + f.x) % 6 < 3; px(f.x + 1, f.y, 4, 2, f.c); px(f.x + 5, f.y + (a ? 0 : 1), 2, 1, f.c); }
    // bendera kerajaan
    if (this.castleAt) { const { cx, by2 } = this.castleAt; px(cx, by2 - 64, 1, 7, '#4c3a2a'); const a = t % 8 < 4; px(cx + 1, by2 - 64, 5, 3, '#c9533f'); px(cx + 6, by2 - 63 + (a ? 0 : 1), 2, 2, '#c9533f');
      if (dark) for (const [wx, wy] of [[-8, -24], [-1, -24], [6, -24], [-1, -41]]) px(cx + wx, by2 + wy, 2, (wy === -41 ? 4 : 4), (t + wx) % 23 < 21 ? '#ffd56b' : '#d9a640'); }
    // spanduk panjang
    if (this.banner) { const { x, y } = this.banner; for (let i = 0; i < 14; i++) { const off = Math.round(Math.sin(t * 0.5 + i * 0.5) * (i / 14) * 1.5); px(x + off, y + i, 7, 1, i % 6 === 2 ? '#e9c34a' : '#3f6fa6'); } px(x + 2, y + 4, 3, 3, '#e9c34a'); }
    // api unggun
    if (this.fire) {
      const { x, y } = this.fire, fl = [[0, 0, '#ff7a1a'], [-2, 1, '#e8501a'], [2, 1, '#e8501a'], [0, -2, '#ffb02e'], [-1, -4, '#ffd65a'], [1, -3, '#ffd65a'], [0, -6, '#ffe9a0']];
      if (dark) { c.globalCompositeOperation = 'lighter'; for (const [r, a] of [[16, .05], [10, .07], [5, .1]]) { c.fillStyle = `rgba(255,140,40,${a})`; c.beginPath(); c.arc(x, y, r + (t % 3), 0, 7); c.fill(); } c.globalCompositeOperation = 'source-over'; }
      for (const [dx, dy, col] of fl) { const j = ((t * 7 + dx * 13 + dy * 5) % 3) - 1; px(x + dx + (dy < -2 ? j : 0), y + dy - (j > 0 ? 1 : 0), 2, 3, col); }
      for (let i = 0; i < 5; i++) { const k = (t + i * 7) % 35; px(x + Math.sin((t + i * 9) * 0.25) * 2 + k * 0.15, y - 8 - k, 1 + (k > 15 ? 1 : 0), 1, `rgba(220,225,230,${0.55 - k / 70})`); }
    }
    // burung lewat
    if (!dark || this.sky === 'dusk') for (let i = 0; i < 3; i++) {
      const bx = ((t * (0.6 + i * 0.15) + i * 190) % (this.W + 60)) - 30, by = this.Y(60 + i * 22) + Math.sin(t * 0.2 + i) * 2, up = (t + i * 2) % 4 < 2;
      px(bx, by, 1, 1, '#24343f'); px(bx - 1, by - (up ? 1 : 0), 1, 1, '#24343f'); px(bx + 1, by - (up ? 1 : 0), 1, 1, '#24343f');
      px(bx - 2, by - (up ? 2 : -1) , 1, 1, '#24343f'); px(bx + 2, by - (up ? 2 : -1), 1, 1, '#24343f');
    }
  },
};

/* ---------- ikon pixel 12×12 (pengganti emoji di lobby) ----------
 * Baris 6 karakter = dicerminkan horizontal; daftar 6 baris = dicerminkan vertikal. */
const PXI_PAL = { k: '#1c1712', w: '#fff4d6', y: '#f2c14e', Y: '#b8862b', r: '#d0503e', R: '#8f2f25', b: '#5a9ad8', B: '#2f5f99',
  s: '#c6ccd1', S: '#8b969e', o: '#a8703e', O: '#6e4524', g: '#6cc04a', G: '#3d7f2c', p: '#a77ad8', P: '#6a3fa0', c: '#8ee6ff', C: '#2fa3d6' };
const PXI = {
  chest: ['......', '.kkkkk', 'kooooo', 'kOOOOO', 'kkkkky', 'kyoooy', 'kooook', 'kOOOOO', 'kooooo', 'kOOOOO', 'kkkkkk', '......'],
  tower: ['.....k', '....kr', '...krr', '..krrr', '.kRRRR', '..ksss', '..kssk', '..ksss', '..ksSs', '.kssss', 'kSSSSS', 'kkkkkk'],
  bolt: ['......kkkk..', '.....kyyyk..', '....kyyyk...', '...kyyyk....', '..kyyyykkk..', '..kyyyyyyk..', '..kkkkyyk...', '....kyyk....', '...kyyk.....', '..kyyk......', '..kyk.......', '..kk........'],
  bag: ['....kk', '...kyy', '....kk', '...koo', '..kooo', '.kooyy', 'kooyky', 'kooyyy', 'kooooo', 'kOoooo', '.kOOOO', '..kkkk'],
  target: ['...kkk', '.kkrrr', '.krrww', 'krrwww', 'krwwrr', 'krwwry'],
  ticket: ['......', '......', 'kkkkkk', 'kyyyyy', '.kyyyY', '..kyyk'],
  friend: ['....kk', '...kww', '..kwww', '..kwww', '...kww', '....kk', '..kkbb', '.kbbbb', 'kbbbbb', 'kbBbbb', 'kkkkkk', '......'],
  menu: ['......', 'kkkkkk', 'kwwwww', 'kkkkkk', '......', 'kkkkkk', 'kwwwww', 'kkkkkk', '......', 'kkkkkk', 'kwwwww', 'kkkkkk'],
  gear: ['....kk', '.kk.ks', '.ksksS', '..ksSS', 'kksSkk', 'ksSk..'],
  help: ['....kkkk....', '...kwwwwk...', '..kwwkkwwk..', '..kkk..kwwk.', '.......kwwk.', '......kwwk..', '.....kwwk...', '.....kwwk...', '.....kkkk...', '............', '.....kwwk...', '.....kkkk...'],
  down: ['....kk', '....kw', '....kw', '....kw', '..kkkw', '...kww', '....kw', '.....k', '......', 'kw....', 'kwwwww', 'kkkkkk'],
  cal: ['..kk..', 'kkkkkk', 'krrrrr', 'kRRRRR', 'kkkkkk', 'kwwwww', 'kwkwkw', 'kwwwww', 'kwkwkw', 'kwwwww', 'kkkkkk', '......'],
  gift: ['..kk..', '.kyyk.', '..kkyk', 'kkkkky', 'krrrry', 'kkkkky', '.krrry', '.krrry', '.kRrry', '.kRRRy', '.kkkkk', '......'],
  swords: ['k..........k', '.kw......wk.', '..kw....wk..', '...kw..wk...', '....kwwk....', '.....kk.....', '....kwwk....', '...kw..wk...', '.okk....kko.', 'oo........oo', 'o..........o', '............'],
  star: ['.....k', '....ky', '....ky', 'kkkkyy', '.kyyyy', '..kyyy', '...kyy', '..kyyy', '..kyyk', '.kyk.k', '.kk...', '......'],
  coin: ['....kkkk....', '..kkyyyykk..', '.kwwyyyyyYk.', '.kwyyYYyyYk.', 'kwyyyYYyyyYk', 'kyyyyYYyyyYk', 'kyyyyYYyyyYk', 'kyyyyYYyyyYk', '.kyyyYYyyYk.', '.kYyyyyyyYk.', '..kkYYYYkk..', '....kkkk....'],
  orb: ['....kkkk....', '..kkppppkk..', '.kwwppppppk.', '.kwppppppPk.', 'kwpppppppPPk', 'kpppppppppPk', 'kpppppppppPk', 'kppppppppPPk', '.kpppppppPk.', '.kPpppppPPk.', '..kkPPPPkk..', '....kkkk....'],
  dia: ['............', '...kkkkkk...', '..kwwccCCk..', '.kwccccCCCk.', 'kkkkkkkkkkkk', '.kccccCCCCk.', '..kcccCCCk..', '...kccCCk...', '....kcCk....', '.....kk.....', '............', '............'],
  gem: ['.....kk.....', '....kwbk....', '...kwbbBk...', '..kwbbbbBk..', '.kwbbwwbbBk.', 'kbbbwwwwbBBk', 'kbbbbwwbbBBk', '.kbbbbbbBBk.', '..kbbbbBBk..', '...kbbBBk...', '....kbBk....', '.....kk.....'],
  cry: ['....k.......', '...kyk......', '...kyk......', '.kkyyykk....', 'kyyywyyyk...', '.kkyyykk....', '...kyk...k..', '...kyk..kyk.', '....k..kyyyk', '........kyk.', '.........k..', '............'],
  tok: ['......', '......', 'kkkkkk', 'krrrrr', '.krrrR', '..krrk'],
  paint: ['...kkkkk....', '..koooookk..', '.koroooobok.', 'koooooooooOk', 'kogookkooyok', 'koooOkkOoooO', 'kooooOOoooOk', '.koooooooOk.', '..kkooooOk..', '....kkkk....', '............', '............'],
  lock: ['......', '...kkk', '..kS..', '..kS..', '.kkkkk', '.kyyyy', '.kyyyk', '.kyyyk', '.kyyyy', '.kYYYY', '.kkkkk', '......'],
  check: ['............', '.kkkkkkkkkk.', '.kggggggggk.', '.kgggggggwk.', '.kggggggwgk.', '.kgwgggwggk.', '.kgwwgwgggk.', '.kggwwggggk.', '.kgggwggggk.', '.kGGGGGGGGk.', '.kkkkkkkkkk.', '............'],
  lantern: ['.....k', '....kk', '..kYYY', '.krrrr', 'krwrrr', 'krwrrr', 'krrrrr', 'kRrrrr', '.kRRRR', '..kYYY', '...kky', '....ky'],
  snow: ['.....kk.....', '..k.kwwk.k..', '.kwkkwwkkwk.', '..kwkwwkwk..', '.kkkwwwwkkk.', 'kwwwwbbwwwwk', 'kwwwwbbwwwwk', '.kkkwwwwkkk.', '..kwkwwkwk..', '.kwkkwwkkwk.', '..k.kwwk.k..', '.....kk.....'],
  play: ['..kk........', '..kwk.......', '..kwwk......', '..kwwwk.....', '..kwwwwk....', '..kwwwwwk...', '..kwwwwwk...', '..kwwwwk....', '..kwwwk.....', '..kwwk......', '..kwk.......', '..kk........'],
};
/* varian warna peti */
for (const [nm, map] of [['chestS', { o: 's', O: 'S', y: 'w' }], ['chestG', { o: 'y', O: 'Y', y: 'w' }], ['chestM', { o: 'p', O: 'P', y: 'c' }]])
  PXI[nm] = PXI.chest.map(r => [...r].map(ch => map[ch] || ch).join(''));
PXI.pick = ['..........kk', '.........kSk', '..kkkk..kSk.', '.kSSSSkkSk..', 'kSk..kSSk...', 'kk..kSSok...', '....kSkook..', '...kSk..ook.', '..kSk....ook', '.kSk......ok', 'kSk........k', 'kk..........'];
PXI.trophy = ['kkkkkk', 'kyyyyy', 'kykyyy', '.kyyyy', '..kyyy', '...kyy', '....ky', '....ky', '...kYY', '..kYYY', '..kkkk', '......'];
function pxiRows(name) {
  let rows = PXI[name] || PXI.star;
  if (rows.length === 6) rows = rows.concat(rows.slice().reverse());
  return rows.map(r => r.length === 6 ? r + [...r].reverse().join('') : r);
}
function pxi(name, cls = '') { return `<canvas class="pxi ${cls}" data-pxi="${name}" width="12" height="12"></canvas>`; }
function drawPxi(c) {
  const g = c.getContext('2d'), rows = pxiRows(c.dataset.pxi); g.clearRect(0, 0, 12, 12);
  rows.forEach((row, y) => [...row].forEach((ch, x) => { const col = PXI_PAL[ch]; if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } }));
}

/* Emoji → ikon pixel (otomatis di semua menu, popup & notifikasi) */
const PXE = { '🪙': 'coin', '💎': 'dia', '💠': 'gem', '✨': 'cry', '🔮': 'orb', '🎟': 'tok', '🎫': 'ticket', '🗼': 'tower', '🎨': 'paint', '🎁': 'gift',
  '🎯': 'target', '⚡': 'bolt', '📅': 'cal', '⚙': 'gear', '⭐': 'star', '🔒': 'lock', '✅': 'check', '🏮': 'lantern', '❄': 'snow' };
const PXE_RE = new RegExp('(' + Object.keys(PXE).join('|') + ')\uFE0F?', 'g');
const pxUrls = {};
function pxUrl(name) {
  if (!pxUrls[name]) { const c = document.createElement('canvas'); c.width = c.height = 12; c.dataset.pxi = name; drawPxi(c); pxUrls[name] = c.toDataURL(); }
  return pxUrls[name];
}
function pxImg(name, cls = '') { return `<img class="pxe ${cls}" src="${pxUrl(name)}" alt="">`; }
function pxText(root) {
  if (!root) return;
  if (root.nodeType === 3) root = root.parentNode;
  if (!root || !root.ownerDocument && root !== document) return;
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => {
    const p = n.parentNode; if (!p || /^(SCRIPT|STYLE|TEXTAREA|OPTION|TITLE)$/.test(p.nodeName) || p.closest && p.closest('[data-nopx]')) return 2;
    PXE_RE.lastIndex = 0; return PXE_RE.test(n.nodeValue) ? 1 : 2; } });
  const list = []; while (tw.nextNode()) list.push(tw.currentNode);
  for (const n of list) {
    const f = document.createDocumentFragment(); let last = 0; const t = n.nodeValue; PXE_RE.lastIndex = 0; let m;
    while ((m = PXE_RE.exec(t))) {
      if (m.index > last) f.appendChild(document.createTextNode(t.slice(last, m.index)));
      const im = document.createElement('img'); im.className = 'pxe'; im.alt = m[1]; im.src = pxUrl(PXE[m[1]]); f.appendChild(im); last = m.index + m[0].length;
    }
    if (last < t.length) f.appendChild(document.createTextNode(t.slice(last)));
    n.parentNode.replaceChild(f, n);
  }
}
if (typeof document !== 'undefined') {
  const startPx = () => {
    pxText(document.body);
    new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') pxText(m.target); else m.addedNodes.forEach(n => pxText(n)); } })
      .observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.body) startPx(); else addEventListener('DOMContentLoaded', startPx);
}
