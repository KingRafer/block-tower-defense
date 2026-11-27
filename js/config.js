/* =========================================================
 * Block Tower Defense — konfigurasi data game
 * Semua angka balancing ada di file ini.
 * ========================================================= */
'use strict';

const VERSION = '7.2.0';
const { RARITY, RARITY_ORDER, UNIT_RARITY, UNIT_TYPES, STARTER_UNITS, UNIT_MAX_LV, unitXpFor, unitLevel, MASTERY_BONUS,
  TRAITS, EVO_REQ, MATERIALS, SKINS, SKILL_SHOP, TOPUP, GACHA, LUCKY, CURRENCY, ACH_REWARDS, ACH_DIAMONDS } = SHARED;
const T = 48, COLS = 20, ROWS = 12, W = COLS * T, H = ROWS * T;
const SELL_RATE = 0.6;
const LOADOUT_SIZE = 6;

/* ---------------- MAP ---------------- */
const MAPS = [
  { id:'grass', name:'Padang Rumput', stars:1, desc:'Jalur berliku sedang. Cocok untuk pemula.',
    path:[[-1,2],[4,2],[4,8],[9,8],[9,3],[14,3],[14,9],[18,9],[18,5],[21,5]],
    th:{g1:'#4caf50',g2:'#46a34a',p1:'#a1887f',p2:'#9c7f72',tree:'#2e7d32',rock:'#9e9e9e',bg:'#3e8e41'} },
  { id:'desert', name:'Gurun Pasir', stars:2, desc:'Jalur zig-zag panjang dengan sedikit ruang di tengah.',
    path:[[-1,9],[3,9],[3,2],[7,2],[7,10],[12,10],[12,1],[16,1],[16,7],[21,7]],
    th:{g1:'#e6c27a',g2:'#dfb96d',p1:'#b5835a',p2:'#ad7b52',tree:'#558b2f',rock:'#a1887f',bg:'#c9a35c',cactus:true} },
  { id:'snow', name:'Kutub Salju', stars:3, desc:'Jalur sempit dan rapat. Musuh cepat sampai ke base.',
    path:[[-1,5],[2,5],[2,1],[6,1],[6,10],[10,10],[10,5],[13,5],[13,1],[17,1],[17,10],[21,10]],
    th:{g1:'#eef3f7',g2:'#e1e9ef',p1:'#90a4ae',p2:'#869aa5',tree:'#1b5e20',rock:'#b0bec5',bg:'#cfd8dc',snow:true} },
  { id:'lava', name:'Gunung Lava', stars:4, desc:'Jalur pendek! Hanya untuk pemain berpengalaman.',
    path:[[-1,6],[5,6],[5,2],[10,2],[10,9],[15,9],[15,4],[21,4]],
    th:{g1:'#4e342e',g2:'#463029',p1:'#212121',p2:'#262626',tree:'#ff5722',rock:'#616161',bg:'#3e2723',lava:true} },
  { id:'frost', name:'Lembah Beku', stars:3, event:true, desc:'❄️ Map event Winter! Danau beku berliku. Kepingan Salju ×1,5.',
    path:[[-1,1],[3,1],[3,6],[1,6],[1,10],[7,10],[7,3],[11,3],[11,9],[15,9],[15,2],[18,2],[18,7],[21,7]],
    th:{g1:'#e8f4fa',g2:'#dbeef7',p1:'#8fb8cf',p2:'#84aec6',tree:'#2e6b4a',rock:'#a7c0cf',bg:'#bcdcea',snow:true,ice:true} },
];
const BASE_MAPS = MAPS.filter(m => !m.event).length;      // map biasa (map event selalu di akhir)
const mapOpen = m => !m.event || SHARED.limitedActive(Date.now());

/* ---------------- KESULITAN ---------------- */
const DIFFS = {
  easy:   { name:'Mudah',  cash:800, hp:150, hpMul:0.7, waves:20, reward:1.2,  coinMul:0.6, color:'#43a047' },
  normal: { name:'Normal', cash:600, hp:100, hpMul:1.0, waves:30, reward:1.0,  coinMul:1.0, color:'#fb8c00' },
  hard:   { name:'Sulit',  cash:500, hp:75,  hpMul:1.4, waves:40, reward:0.85, coinMul:1.8, color:'#e53935' },
};

/* ---------------- TOWER ----------------
 * Level: cost, dmg, range (tile), rate (detik antar tembakan)
 * Opsional: hidden, pierceArmor, splash, slow, income, buff, grantHidden, bossMul
 */
const TOWERS = {
  scout: { name:'Scout', color:'#43a047', limit:8, unlock:0, role:'Serba guna',
    desc:'Tower murah dan cepat. Bagus di awal permainan.',
    levels:[
      {name:'Scout',          cost:200,  dmg:2,  range:3.0, rate:0.9},
      {name:'Bidikan Tajam',  cost:150,  dmg:3,  range:3.3, rate:0.8},
      {name:'Teropong',       cost:400,  dmg:4,  range:3.5, rate:0.6, hidden:true},
      {name:'Tembak Cepat',   cost:900,  dmg:7,  range:3.8, rate:0.5, hidden:true},
      {name:'Scout Elite',    cost:2000, dmg:12, range:4.2, rate:0.4, hidden:true}]},
  sniper: { name:'Sniper', color:'#6d4c41', limit:6, unlock:0, role:'Jarak jauh',
    desc:'Damage satu target sangat besar dengan jangkauan luas.',
    levels:[
      {name:'Sniper',         cost:350,  dmg:8,   range:7,  rate:2.5},
      {name:'Peluru Berat',   cost:300,  dmg:14,  range:8,  rate:2.3},
      {name:'Mata Elang',     cost:800,  dmg:25,  range:9,  rate:2.0, hidden:true},
      {name:'Peluru AP',      cost:1800, dmg:50,  range:10, rate:1.7, hidden:true, pierceArmor:true},
      {name:'Penembak Jitu',  cost:4000, dmg:110, range:11, rate:1.4, hidden:true, pierceArmor:true}]},
  demoman: { name:'Demoman', color:'#e53935', limit:6, unlock:0, role:'Area',
    desc:'Melempar roket yang meledak dan mengenai banyak musuh.',
    levels:[
      {name:'Demoman',        cost:450,  dmg:5,  range:3.2, rate:2.2, splash:1.1},
      {name:'Bubuk Mesiu',    cost:350,  dmg:8,  range:3.4, rate:2.0, splash:1.2},
      {name:'Ledakan Besar',  cost:900,  dmg:14, range:3.6, rate:1.8, splash:1.4},
      {name:'Hulu Ledak AP',  cost:2200, dmg:26, range:3.9, rate:1.5, splash:1.6, pierceArmor:true},
      {name:'Ahli Peledak',   cost:5000, dmg:55, range:4.3, rate:1.2, splash:1.9, pierceArmor:true}]},
  freezer: { name:'Freezer', color:'#29b6f6', limit:4, unlock:0, role:'Pendukung',
    desc:'Memperlambat musuh yang terkena tembakan es.',
    levels:[
      {name:'Freezer',        cost:400,  dmg:1, range:2.6, rate:1.2, slow:0.35},
      {name:'Es Tebal',       cost:300,  dmg:1, range:2.9, rate:1.0, slow:0.45},
      {name:'Radar Dingin',   cost:700,  dmg:2, range:3.2, rate:0.9, slow:0.55, hidden:true},
      {name:'Nol Mutlak',     cost:1500, dmg:4, range:3.5, rate:0.8, slow:0.62, hidden:true}]},
  farm: { name:'Farm', color:'#fdd835', limit:6, unlock:0, role:'Ekonomi',
    desc:'Tidak menyerang. Memberi uang setiap akhir wave.',
    levels:[
      {name:'Farm',           cost:250,  income:50},
      {name:'Pupuk',          cost:200,  income:100},
      {name:'Traktor',        cost:550,  income:250},
      {name:'Lumbung',        cost:1200, income:500},
      {name:'Perkebunan',     cost:2500, income:900}]},
  minigun: { name:'Minigunner', color:'#546e7a', limit:5, unlock:600, role:'DPS tinggi',
    desc:'Menembak sangat cepat. Mahal tapi sangat kuat.',
    levels:[
      {name:'Minigunner',     cost:1200, dmg:2,  range:3.5, rate:0.15},
      {name:'Laras Ganda',    cost:800,  dmg:3,  range:3.7, rate:0.13},
      {name:'Sensor Panas',   cost:2000, dmg:4,  range:4.0, rate:0.11, hidden:true},
      {name:'Amunisi Besar',  cost:4500, dmg:7,  range:4.3, rate:0.09, hidden:true},
      {name:'Penghancur',     cost:9000, dmg:12, range:4.6, rate:0.07, hidden:true, pierceArmor:true}]},
  commander: { name:'Commander', color:'#3949ab', limit:3, unlock:900, role:'Buff',
    desc:'Tidak menyerang. Mempercepat tembakan tower di sekitarnya.',
    levels:[
      {name:'Commander',      cost:650,  range:2.5, buff:0.10},
      {name:'Semangat',       cost:500,  range:2.8, buff:0.15},
      {name:'Radio Taktis',   cost:1400, range:3.1, buff:0.20, grantHidden:true},
      {name:'Jenderal',       cost:3500, range:3.5, buff:0.30, grantHidden:true}]},
  rocketeer: { name:'Rocketeer', color:'#8e24aa', limit:4, unlock:1400, role:'Anti-boss',
    desc:'Misil jarak jauh tembus armor. Damage ekstra ke boss.',
    levels:[
      {name:'Rocketeer',      cost:1500, dmg:30,  range:5.0, rate:3.0, splash:0.9, pierceArmor:true, bossMul:1.5},
      {name:'Misil Pintar',   cost:1200, dmg:50,  range:5.5, rate:2.8, splash:1.0, pierceArmor:true, bossMul:1.6},
      {name:'Pelacak',        cost:3000, dmg:90,  range:6.0, rate:2.5, splash:1.1, pierceArmor:true, bossMul:1.8, hidden:true},
      {name:'Peluncur Ganda', cost:7000, dmg:180, range:6.5, rate:2.0, splash:1.3, pierceArmor:true, bossMul:2.0, hidden:true}]},
};
Object.assign(TOWERS, {
  pistol: { name:'Gunslinger', color:'#8d6e63', limit:8, role:'Serba guna',
    desc:'Penembak cepat bersenjata ganda. Murah dan andal.',
    levels:[
      {name:'Gunslinger',     cost:150,  dmg:1.5, range:2.8, rate:0.5},
      {name:'Pistol Ganda',   cost:150,  dmg:2.5, range:3.0, rate:0.45},
      {name:'Peluru Perak',   cost:450,  dmg:4,   range:3.2, rate:0.4, hidden:true},
      {name:'Koboi',          cost:1000, dmg:7,   range:3.4, rate:0.33, hidden:true},
      {name:'Legenda Barat',  cost:2200, dmg:12,  range:3.7, rate:0.28, hidden:true}]},
  cannon: { name:'Meriam', color:'#455a64', limit:5, role:'Area',
    desc:'Peluru meriam berat dengan ledakan kecil.',
    levels:[
      {name:'Meriam',         cost:500,  dmg:9,  range:3.6, rate:2.4, splash:0.7},
      {name:'Laras Baja',     cost:400,  dmg:15, range:3.8, rate:2.2, splash:0.8},
      {name:'Peluru Inti',    cost:1000, dmg:26, range:4.0, rate:2.0, splash:0.9, pierceArmor:true},
      {name:'Meriam Kapal',   cost:2400, dmg:50, range:4.3, rate:1.8, splash:1.0, pierceArmor:true, hidden:true}]},
  flamer: { name:'Pembakar', color:'#ff7043', limit:5, role:'Area dekat',
    desc:'Menyemburkan api jarak dekat yang membakar musuh.',
    levels:[
      {name:'Pembakar',       cost:550,  dmg:1,   range:2.2, rate:0.25, splashHit:0.7, dot:{pct:0.6, dur:2, col:'burn'}},
      {name:'Bahan Bakar',    cost:450,  dmg:1.6, range:2.3, rate:0.22, splashHit:0.8, dot:{pct:0.6, dur:2.5, col:'burn'}},
      {name:'Api Biru',       cost:1100, dmg:2.6, range:2.5, rate:0.2,  splashHit:0.9, dot:{pct:0.7, dur:3, col:'burn'}, hidden:true},
      {name:'Neraka',         cost:2600, dmg:4.5, range:2.7, rate:0.18, splashHit:1.0, dot:{pct:0.8, dur:3, col:'burn'}, hidden:true, pierceArmor:true}]},
  mortar: { name:'Mortir', color:'#5d4037', limit:4, role:'Jarak jauh',
    desc:'Peluru melambung jarak jauh. Tidak bisa menembak terlalu dekat.',
    levels:[
      {name:'Mortir',         cost:600,  dmg:10, range:6,   rate:3.2, splash:1.3, minRange:1.8},
      {name:'Laras Panjang',  cost:500,  dmg:17, range:6.5, rate:3.0, splash:1.4, minRange:1.8},
      {name:'Peluru Cluster', cost:1300, dmg:30, range:7,   rate:2.7, splash:1.6, minRange:1.8, hidden:true},
      {name:'Artileri Berat', cost:3000, dmg:60, range:7.5, rate:2.4, splash:1.9, minRange:1.8, hidden:true, pierceArmor:true}]},
  tesla: { name:'Tesla', color:'#00bcd4', limit:4, role:'Berantai',
    desc:'Petir yang melompat ke beberapa musuh sekaligus.',
    levels:[
      {name:'Tesla',          cost:1100, dmg:5,  range:3.2, rate:1.3, chain:3, chainRange:1.6},
      {name:'Kumparan',       cost:800,  dmg:8,  range:3.4, rate:1.2, chain:4, chainRange:1.7},
      {name:'Tegangan Tinggi',cost:2000, dmg:13, range:3.6, rate:1.05,chain:5, chainRange:1.8, hidden:true},
      {name:'Badai Listrik',  cost:4500, dmg:24, range:3.9, rate:0.9, chain:7, chainRange:2.0, hidden:true, pierceArmor:true}]},
  laser: { name:'Laser', color:'#e53935', limit:4, role:'DPS tinggi',
    desc:'Sinar terus-menerus yang makin panas pada target yang sama.',
    levels:[
      {name:'Laser',          cost:1300, dmg:1.2, range:3.3, rate:0.1, beam:true, rampMax:1.5},
      {name:'Lensa Fokus',    cost:900,  dmg:2,   range:3.5, rate:0.1, beam:true, rampMax:1.8},
      {name:'Sinar Merah',    cost:2200, dmg:3.2, range:3.8, rate:0.1, beam:true, rampMax:2.1, hidden:true},
      {name:'Sinar Kematian', cost:5000, dmg:5.5, range:4.1, rate:0.1, beam:true, rampMax:2.5, hidden:true, pierceArmor:true}]},
  poison: { name:'Racun', color:'#7cb342', limit:4, role:'Pendukung',
    desc:'Racun yang memperlambat dan melukai musuh perlahan.',
    levels:[
      {name:'Racun',          cost:900,  dmg:2,  range:3.0, rate:1.4, splashHit:0.9, slow:0.2, dot:{pct:1.5, dur:4, col:'poison'}},
      {name:'Racun Pekat',    cost:700,  dmg:3.5,range:3.2, rate:1.3, splashHit:1.0, slow:0.25, dot:{pct:1.5, dur:4, col:'poison'}},
      {name:'Wabah',          cost:1800, dmg:6,  range:3.4, rate:1.2, splashHit:1.2, slow:0.3, dot:{pct:1.6, dur:5, col:'poison'}, hidden:true},
      {name:'Pandemi',        cost:4000, dmg:11, range:3.7, rate:1.0, splashHit:1.4, slow:0.35, dot:{pct:1.8, dur:5, col:'poison'}, hidden:true, pierceArmor:true}]},
  railgun: { name:'Railgun', color:'#3949ab', limit:3, role:'Tembus barisan',
    desc:'Proyektil elektromagnetik yang menembus semua musuh dalam satu garis.',
    levels:[
      {name:'Railgun',        cost:2000, dmg:30,  range:6,   rate:3.4, line:true, pierceArmor:true},
      {name:'Akselerator',    cost:1600, dmg:50,  range:6.5, rate:3.1, line:true, pierceArmor:true},
      {name:'Pemindai',       cost:3500, dmg:85,  range:7,   rate:2.8, line:true, pierceArmor:true, hidden:true},
      {name:'Meriam Gauss',   cost:8000, dmg:170, range:7.5, rate:2.4, line:true, pierceArmor:true, hidden:true}]},
  warden: { name:'Penjaga Waktu', color:'#26a69a', limit:2, role:'Aura',
    desc:'Aura yang memperlambat dan melukai semua musuh di sekitarnya.',
    levels:[
      {name:'Penjaga Waktu',  cost:1800, dmg:1,  range:2.4, rate:0.5, aura:true, slow:0.3},
      {name:'Jam Pasir',      cost:1400, dmg:2,  range:2.7, rate:0.5, aura:true, slow:0.38},
      {name:'Distorsi',       cost:3200, dmg:4,  range:3.0, rate:0.5, aura:true, slow:0.45, hidden:true},
      {name:'Penguasa Waktu', cost:7000, dmg:8,  range:3.4, rate:0.5, aura:true, slow:0.55, hidden:true, pierceArmor:true}]},
  nuke: { name:'Nuklir', color:'#827717', limit:1, role:'Penghancur',
    desc:'Hulu ledak nuklir: sangat lambat, ledakan raksasa.',
    levels:[
      {name:'Nuklir',         cost:3500,  dmg:120, range:7,   rate:9,   splash:2.6, pierceArmor:true, bossMul:1.3},
      {name:'Uranium',        cost:3000,  dmg:220, range:7.5, rate:8.5, splash:2.9, pierceArmor:true, bossMul:1.3, hidden:true},
      {name:'Plutonium',      cost:7000,  dmg:420, range:8,   rate:8,   splash:3.2, pierceArmor:true, bossMul:1.4, hidden:true},
      {name:'Hari Kiamat',    cost:15000, dmg:900, range:9,   rate:7,   splash:3.6, pierceArmor:true, bossMul:1.5, hidden:true}]},
  dragon: { name:'Naga Api', color:'#c62828', limit:1, role:'Mitos',
    desc:'Naga penyembur bola api yang membakar area luas.',
    levels:[
      {name:'Naga Api',       cost:3000,  dmg:14,  range:4.2, rate:0.7,  splash:1.1, dot:{pct:0.5, dur:3, col:'burn'}},
      {name:'Sisik Baja',     cost:2600,  dmg:24,  range:4.5, rate:0.65, splash:1.2, dot:{pct:0.5, dur:3, col:'burn'}, pierceArmor:true},
      {name:'Mata Naga',      cost:6000,  dmg:42,  range:4.8, rate:0.6,  splash:1.4, dot:{pct:0.6, dur:3, col:'burn'}, pierceArmor:true, hidden:true},
      {name:'Naga Purba',     cost:13000, dmg:85,  range:5.2, rate:0.5,  splash:1.6, dot:{pct:0.7, dur:3, col:'burn'}, pierceArmor:true, hidden:true}]},
});
/* ---------------- UNIT BARU v4.5 ---------------- */
Object.assign(TOWERS, {
  archer: { name:'Pemanah', color:'#2e7d32', limit:8, role:'Jarak jauh',
    desc:'Pemanah hutan dengan jangkauan panjang dan anak panah yang akurat.',
    levels:[
      {name:'Pemanah',        cost:250,  dmg:3,   range:3.8, rate:1.1},
      {name:'Busur Panjang',  cost:200,  dmg:4.5, range:4.2, rate:1.0},
      {name:'Panah Api',      cost:500,  dmg:7,   range:4.5, rate:0.9, hidden:true, dot:{pct:0.4, dur:2, col:'burn'}},
      {name:'Hujan Panah',    cost:1100, dmg:11,  range:4.8, rate:0.8, hidden:true, dot:{pct:0.5, dur:2, col:'burn'}, splashHit:0.6},
      {name:'Pemanah Elf',    cost:2400, dmg:20,  range:5.3, rate:0.7, hidden:true, dot:{pct:0.6, dur:2.5, col:'burn'}, splashHit:0.8}]},
  shotgun: { name:'Shotgunner', color:'#6d4c41', limit:6, role:'Area dekat',
    desc:'Tembakan pelet jarak dekat yang mengenai beberapa musuh sekaligus.',
    levels:[
      {name:'Shotgunner',     cost:600,  dmg:6,  range:2.3, rate:1.2, splashHit:0.8},
      {name:'Laras Ganda',    cost:500,  dmg:10, range:2.4, rate:1.1, splashHit:0.9},
      {name:'Peluru Slug',    cost:1200, dmg:17, range:2.6, rate:1.0, splashHit:1.0, hidden:true},
      {name:'Otomatis',       cost:2600, dmg:26, range:2.8, rate:0.7, splashHit:1.1, hidden:true, pierceArmor:true},
      {name:'Pemusnah',       cost:5200, dmg:44, range:3.0, rate:0.6, splashHit:1.2, hidden:true, pierceArmor:true}]},
  ninja: { name:'Ninja', color:'#263238', limit:4, role:'Berantai',
    desc:'Shuriken super cepat yang memantul ke musuh lain. Melihat musuh hidden sejak awal.',
    levels:[
      {name:'Ninja',          cost:1300, dmg:4,  range:3.4, rate:0.45, chain:2, chainRange:1.4, hidden:true},
      {name:'Shuriken Ganda', cost:1000, dmg:6,  range:3.6, rate:0.4,  chain:3, chainRange:1.5, hidden:true},
      {name:'Bayangan',       cost:2400, dmg:10, range:3.9, rate:0.35, chain:3, chainRange:1.7, hidden:true, pierceArmor:true},
      {name:'Jonin',          cost:5200, dmg:18, range:4.2, rate:0.3,  chain:4, chainRange:1.9, hidden:true, pierceArmor:true},
      {name:'Master Ninja',   cost:10000,dmg:30, range:4.5, rate:0.25, chain:5, chainRange:2.1, hidden:true, pierceArmor:true}]},
  samurai: { name:'Samurai', color:'#b71c1c', limit:3, role:'Jarak dekat',
    desc:'Tebasan katana jarak dekat dengan damage besar, menembus armor & mengenai sekitar.',
    levels:[
      {name:'Samurai',        cost:2200, dmg:40,  range:1.7, rate:1.0, splashHit:0.7, pierceArmor:true},
      {name:'Katana Baja',    cost:1800, dmg:65,  range:1.8, rate:0.95, splashHit:0.8, pierceArmor:true},
      {name:'Ronin',          cost:4000, dmg:110, range:1.9, rate:0.85, splashHit:0.9, pierceArmor:true, hidden:true, bossMul:1.3},
      {name:'Shogun',         cost:9000, dmg:210, range:2.1, rate:0.75, splashHit:1.1, pierceArmor:true, hidden:true, bossMul:1.6}]},
  wizard: { name:'Penyihir', color:'#5e35b1', limit:3, role:'Sihir',
    desc:'Bola sihir yang melompat ke banyak musuh dan memperlambat mereka.',
    levels:[
      {name:'Penyihir',       cost:2400, dmg:14, range:3.8, rate:1.4, chain:4, chainRange:1.8, slow:0.2},
      {name:'Tongkat Kristal',cost:1900, dmg:22, range:4.0, rate:1.3, chain:5, chainRange:1.9, slow:0.25},
      {name:'Archmage',       cost:4300, dmg:38, range:4.3, rate:1.15,chain:6, chainRange:2.1, slow:0.3, hidden:true},
      {name:'Penyihir Agung', cost:9500, dmg:70, range:4.7, rate:1.0, chain:8, chainRange:2.3, slow:0.35, hidden:true, pierceArmor:true}]},
  angel: { name:'Malaikat Agung', color:'#fff59d', limit:1, role:'Mitos',
    desc:'Sinar suci yang menembus seluruh barisan dan membakar musuh. Melihat semua musuh hidden.',
    levels:[
      {name:'Malaikat Agung', cost:5000,  dmg:60,  range:6.0, rate:2.2, line:true, pierceArmor:true, hidden:true, dot:{pct:0.5, dur:3, col:'burn'}},
      {name:'Sayap Cahaya',   cost:4000,  dmg:100, range:6.5, rate:2.0, line:true, pierceArmor:true, hidden:true, dot:{pct:0.6, dur:3, col:'burn'}},
      {name:'Penghakiman',    cost:9000,  dmg:180, range:7.0, rate:1.8, line:true, pierceArmor:true, hidden:true, dot:{pct:0.7, dur:3, col:'burn'}, bossMul:1.3},
      {name:'Serafim',        cost:18000, dmg:340, range:7.8, rate:1.5, line:true, pierceArmor:true, hidden:true, dot:{pct:0.8, dur:4, col:'burn'}, bossMul:1.6}]},
});
/* ---------------- UNIT RAHASIA (sangat langka) ---------------- */
Object.assign(TOWERS, {
  reaper: { name:'Malaikat Maut', color:'#311b92', limit:1, role:'Rahasia',
    desc:'Penuai jiwa dari kehampaan. Aura sabit mematikan yang melukai & memperlambat semua musuh di sekitarnya, menembus armor.',
    levels:[
      {name:'Malaikat Maut',  cost:6000,  dmg:30,  range:2.8, rate:0.6, aura:true, slow:0.35, hidden:true, pierceArmor:true},
      {name:'Sabit Kehampaan',cost:6000,  dmg:55,  range:3.1, rate:0.55,aura:true, slow:0.42, hidden:true, pierceArmor:true},
      {name:'Penuai Jiwa',    cost:12000, dmg:100, range:3.4, rate:0.5, aura:true, slow:0.5,  hidden:true, pierceArmor:true, bossMul:1.4},
      {name:'Raja Kematian',  cost:25000, dmg:190, range:3.8, rate:0.45,aura:true, slow:0.6,  hidden:true, pierceArmor:true, bossMul:1.8}]},
  cosmic: { name:'Kaisar Kosmik', color:'#1a237e', limit:1, role:'Rahasia',
    desc:'Penguasa galaksi. Bintang jatuh yang melompat ke banyak musuh, membakar & memperlambat mereka.',
    levels:[
      {name:'Kaisar Kosmik',  cost:7000,  dmg:80,  range:5.0, rate:1.5, chain:6,  chainRange:2.2, slow:0.3,  hidden:true, pierceArmor:true, dot:{pct:0.4, dur:3, col:'burn'}},
      {name:'Nebula',         cost:7000,  dmg:140, range:5.4, rate:1.4, chain:7,  chainRange:2.4, slow:0.35, hidden:true, pierceArmor:true, dot:{pct:0.5, dur:3, col:'burn'}},
      {name:'Supernova',      cost:14000, dmg:250, range:5.8, rate:1.25,chain:9,  chainRange:2.6, slow:0.4,  hidden:true, pierceArmor:true, dot:{pct:0.6, dur:3, col:'burn'}, bossMul:1.4},
      {name:'Lubang Hitam',   cost:28000, dmg:460, range:6.3, rate:1.1, chain:12, chainRange:2.9, slow:0.45, hidden:true, pierceArmor:true, dot:{pct:0.7, dur:4, col:'burn'}, bossMul:1.8}]},
});
/* ---------------- UNIT EKSKLUSIF BETA (kode EARLYACC) ---------------- */
Object.assign(TOWERS, {
  goldminer: { name:'Penambang Emas', color:'#ffb300', limit:2, role:'Ekonomi • Beta',
    desc:'Unit eksklusif pemain Beta. Setiap pukulan beliung menghasilkan emas — cocok untuk grinding di awal permainan.',
    levels:[
      {name:'Penambang Emas', cost:400,  dmg:2,  range:2.8, rate:0.8,  goldHit:4},
      {name:'Beliung Baja',   cost:450,  dmg:3,  range:3.0, rate:0.7,  goldHit:7},
      {name:'Lampu Tambang',  cost:900,  dmg:5,  range:3.2, rate:0.6,  goldHit:11, hidden:true},
      {name:'Urat Emas',      cost:1800, dmg:8,  range:3.4, rate:0.55, goldHit:16, hidden:true},
      {name:'Raja Tambang',   cost:3600, dmg:13, range:3.6, rate:0.5,  goldHit:24, hidden:true, pierceArmor:true}]},
});
/* ---------------- UNIT EKSKLUSIF WINTER (Banner Winter, selama event) ---------------- */
Object.assign(TOWERS, {
  snowman: { name:'Manusia Salju', color:'#e3f2fd', limit:3, role:'Winter • Kontrol',
    desc:'Eksklusif event Winter. Melempar bola salju yang meledak, memperlambat musuh di area.',
    levels:[
      {name:'Manusia Salju',  cost:900,  dmg:8,  range:3.4, rate:1.1, splash:0.9, slow:0.3},
      {name:'Bola Salju Besar',cost:800, dmg:14, range:3.6, rate:1.0, splash:1.0, slow:0.35},
      {name:'Badai Salju',    cost:1900, dmg:24, range:3.9, rate:0.9, splash:1.2, slow:0.4, hidden:true},
      {name:'Es Abadi',       cost:4200, dmg:42, range:4.2, rate:0.8, splash:1.3, slow:0.45, hidden:true, pierceArmor:true},
      {name:'Raja Salju',     cost:8500, dmg:72, range:4.5, rate:0.7, splash:1.5, slow:0.5,  hidden:true, pierceArmor:true}]},
  yeti: { name:'Yeti', color:'#90caf9', limit:1, role:'Winter • Penghancur',
    desc:'Eksklusif event Winter. Hentakan es raksasa yang melukai & memperlambat semua musuh di sekitarnya, kuat melawan boss.',
    levels:[
      {name:'Yeti',           cost:4000,  dmg:28,  range:2.4, rate:0.9,  aura:true, slow:0.35, pierceArmor:true, bossMul:1.3},
      {name:'Cakar Es',       cost:3800,  dmg:50,  range:2.6, rate:0.85, aura:true, slow:0.4,  pierceArmor:true, bossMul:1.4},
      {name:'Raungan Beku',   cost:8000,  dmg:95,  range:2.9, rate:0.8,  aura:true, slow:0.45, pierceArmor:true, bossMul:1.5, hidden:true},
      {name:'Yeti Purba',     cost:17000, dmg:180, range:3.2, rate:0.7,  aura:true, slow:0.55, pierceArmor:true, bossMul:1.8, hidden:true}]},
});
/* ---------------- UNIT BARU v5.4 ---------------- */
Object.assign(TOWERS, {
  pirate: { name:'Bajak Laut', color:'#6d4c41', limit:6, role:'Area',
    desc:'Meriam tangan bajak laut: peluru meledak mengenai beberapa musuh.',
    levels:[
      {name:'Bajak Laut',     cost:500,  dmg:7,  range:3.3, rate:1.6, splash:0.8},
      {name:'Mesiu Basah',    cost:400,  dmg:11, range:3.5, rate:1.5, splash:0.9},
      {name:'Kapten',         cost:1000, dmg:19, range:3.7, rate:1.4, splash:1.0, hidden:true},
      {name:'Meriam Galleon', cost:2300, dmg:34, range:4.0, rate:1.2, splash:1.1, hidden:true, pierceArmor:true},
      {name:'Raja Lautan',    cost:5000, dmg:60, range:4.3, rate:1.0, splash:1.3, hidden:true, pierceArmor:true}]},
  knight: { name:'Ksatria', color:'#9e9e9e', limit:4, role:'Jarak dekat',
    desc:'Ksatria berzirah dengan pedang besar: tebasan menembus armor & mengenai sekitar.',
    levels:[
      {name:'Ksatria',        cost:1200, dmg:18,  range:1.6, rate:1.0,  splashHit:0.6, pierceArmor:true},
      {name:'Zirah Baja',     cost:900,  dmg:28,  range:1.7, rate:0.95, splashHit:0.7, pierceArmor:true},
      {name:'Paladin',        cost:2200, dmg:46,  range:1.8, rate:0.85, splashHit:0.8, pierceArmor:true, hidden:true},
      {name:'Ksatria Agung',  cost:4800, dmg:80,  range:2.0, rate:0.75, splashHit:0.9, pierceArmor:true, hidden:true},
      {name:'Pahlawan Raja',  cost:9800, dmg:135, range:2.2, rate:0.65, splashHit:1.0, pierceArmor:true, hidden:true, bossMul:1.3}]},
  druid: { name:'Druid', color:'#33691e', limit:3, role:'Racun berantai',
    desc:'Penjaga hutan: sihir alam melompat ke beberapa musuh, meracuni & memperlambat.',
    levels:[
      {name:'Druid',          cost:2300, dmg:10, range:3.8, rate:1.3, chain:3, chainRange:1.7, slow:0.2,  dot:{pct:1.2, dur:4, col:'poison'}},
      {name:'Akar Berduri',   cost:1800, dmg:16, range:4.0, rate:1.2, chain:4, chainRange:1.8, slow:0.25, dot:{pct:1.3, dur:4, col:'poison'}},
      {name:'Roh Hutan',      cost:4000, dmg:28, range:4.3, rate:1.1, chain:5, chainRange:2.0, slow:0.3,  dot:{pct:1.4, dur:5, col:'poison'}, hidden:true},
      {name:'Penjaga Alam',   cost:9000, dmg:52, range:4.7, rate:1.0, chain:6, chainRange:2.2, slow:0.35, dot:{pct:1.6, dur:5, col:'poison'}, hidden:true, pierceArmor:true}]},
  firegod: { name:'Dewa Api', color:'#ff6d00', limit:1, role:'Ilahi',
    desc:'Tier tertinggi. Tombak matahari menembus seluruh barisan dan membakar habis musuh.',
    levels:[
      {name:'Dewa Api',       cost:9000,  dmg:150, range:7.0, rate:1.8, line:true, pierceArmor:true, hidden:true, dot:{pct:0.8, dur:3, col:'burn'}},
      {name:'Api Abadi',      cost:9000,  dmg:260, range:7.5, rate:1.6, line:true, pierceArmor:true, hidden:true, dot:{pct:0.9, dur:3, col:'burn'}},
      {name:'Matahari Murka', cost:18000, dmg:460, range:8.0, rate:1.4, line:true, pierceArmor:true, hidden:true, dot:{pct:1.0, dur:4, col:'burn'}, bossMul:1.5},
      {name:'Inti Bintang',   cost:36000, dmg:850, range:8.8, rate:1.2, line:true, pierceArmor:true, hidden:true, dot:{pct:1.2, dur:4, col:'burn'}, bossMul:2.0}]},
  thundergod: { name:'Dewa Petir', color:'#3949ab', limit:1, role:'Ilahi',
    desc:'Tier tertinggi. Petir ilahi melompat ke belasan musuh sekaligus.',
    levels:[
      {name:'Dewa Petir',     cost:9500,  dmg:110, range:5.5, rate:1.2, chain:10, chainRange:2.8, hidden:true, pierceArmor:true},
      {name:'Palu Guntur',    cost:9500,  dmg:190, range:5.9, rate:1.1, chain:12, chainRange:3.0, hidden:true, pierceArmor:true},
      {name:'Badai Surgawi',  cost:19000, dmg:340, range:6.3, rate:1.0, chain:14, chainRange:3.2, hidden:true, pierceArmor:true, bossMul:1.5},
      {name:'Raja Langit',    cost:38000, dmg:620, range:7.0, rate:0.9, chain:18, chainRange:3.5, hidden:true, pierceArmor:true, bossMul:2.0}]},
  /* --- unit event Winter --- */
  skier: { name:'Pemain Ski', color:'#e53935', limit:8, role:'Winter • Serba guna',
    desc:'Unit Winter. Tembakan cepat berlapis es yang sedikit memperlambat musuh.',
    levels:[
      {name:'Pemain Ski',     cost:220,  dmg:2.5, range:3.2, rate:0.8,  slow:0.15},
      {name:'Papan Cepat',    cost:180,  dmg:3.5, range:3.4, rate:0.75, slow:0.18},
      {name:'Kacamata Salju', cost:450,  dmg:5,   range:3.6, rate:0.65, slow:0.2,  hidden:true},
      {name:'Lereng Hitam',   cost:1000, dmg:8,   range:3.9, rate:0.55, slow:0.22, hidden:true},
      {name:'Juara Ski',      cost:2200, dmg:13,  range:4.2, rate:0.45, slow:0.25, hidden:true}]},
  icearcher: { name:'Pemanah Es', color:'#4fc3f7', limit:6, role:'Winter • Jarak jauh',
    desc:'Unit Winter. Panah es jarak jauh yang memperlambat target.',
    levels:[
      {name:'Pemanah Es',     cost:400,  dmg:5,  range:4.2, rate:1.1, slow:0.25},
      {name:'Busur Beku',     cost:350,  dmg:8,  range:4.5, rate:1.0, slow:0.3},
      {name:'Panah Kristal',  cost:850,  dmg:13, range:4.8, rate:0.9, slow:0.32, hidden:true},
      {name:'Pemburu Kutub',  cost:1900, dmg:22, range:5.2, rate:0.8, slow:0.35, hidden:true, pierceArmor:true},
      {name:'Bidikan Aurora', cost:4200, dmg:38, range:5.6, rate:0.7, slow:0.4,  hidden:true, pierceArmor:true}]},
  iceknight: { name:'Ksatria Es', color:'#90caf9', limit:4, role:'Winter • Jarak dekat',
    desc:'Unit Winter. Pedang es menebas musuh di sekitar, menembus armor & memperlambat.',
    levels:[
      {name:'Ksatria Es',     cost:1300,  dmg:14,  range:1.8, rate:0.9,  splashHit:0.7, slow:0.2,  pierceArmor:true},
      {name:'Zirah Beku',     cost:1000,  dmg:22,  range:1.9, rate:0.85, splashHit:0.8, slow:0.25, pierceArmor:true},
      {name:'Pedang Gletser', cost:2400,  dmg:36,  range:2.0, rate:0.8,  splashHit:0.9, slow:0.3,  pierceArmor:true, hidden:true},
      {name:'Penjaga Kutub',  cost:5200,  dmg:62,  range:2.2, rate:0.7,  splashHit:1.0, slow:0.35, pierceArmor:true, hidden:true},
      {name:'Raja Es',        cost:10500, dmg:105, range:2.4, rate:0.6,  splashHit:1.1, slow:0.4,  pierceArmor:true, hidden:true}]},
  frostmage: { name:'Penyihir Salju', color:'#4fc3f7', limit:3, role:'Winter • Sihir',
    desc:'Unit Winter. Sihir es yang melompat ke banyak musuh dan sangat memperlambat.',
    levels:[
      {name:'Penyihir Salju', cost:2600, dmg:16, range:4.0, rate:1.3, chain:4, chainRange:1.8, slow:0.3},
      {name:'Tongkat Beku',   cost:2000, dmg:25, range:4.2, rate:1.2, chain:5, chainRange:1.9, slow:0.35},
      {name:'Badai Kristal',  cost:4500, dmg:42, range:4.5, rate:1.1, chain:6, chainRange:2.1, slow:0.4,  hidden:true},
      {name:'Archmage Es',    cost:9800, dmg:78, range:4.9, rate:1.0, chain:8, chainRange:2.3, slow:0.45, hidden:true, pierceArmor:true}]},
  frostqueen: { name:'Ratu Es', color:'#b3e5fc', limit:1, role:'Winter • Rahasia',
    desc:'Unit Winter tertinggi. Bintang es abadi melompat ke banyak musuh dan hampir membekukan mereka.',
    levels:[
      {name:'Ratu Es',        cost:7500,  dmg:90,  range:5.2, rate:1.4,  chain:7,  chainRange:2.4, slow:0.45, hidden:true, pierceArmor:true},
      {name:'Mahkota Beku',   cost:7500,  dmg:150, range:5.6, rate:1.3,  chain:8,  chainRange:2.6, slow:0.5,  hidden:true, pierceArmor:true},
      {name:'Musim Abadi',    cost:15000, dmg:270, range:6.0, rate:1.2,  chain:10, chainRange:2.8, slow:0.55, hidden:true, pierceArmor:true, bossMul:1.4},
      {name:'Permaisuri Kutub',cost:30000,dmg:500, range:6.5, rate:1.05, chain:13, chainRange:3.0, slow:0.6,  hidden:true, pierceArmor:true, bossMul:1.8}]},
});
const TOWER_ORDER = [...UNIT_TYPES].sort((a, b) => RARITY[UNIT_RARITY[a]].rank - RARITY[UNIT_RARITY[b]].rank);
const DEFAULT_LOADOUT = [...STARTER_UNITS];
/* Jenis proyektil (tower lain memakai tembakan langsung) */
const PROJ = { pirate: 'shell', demoman: 'rocket', rocketeer: 'rocket', cannon: 'shell', mortar: 'shell', nuke: 'nuke', dragon: 'fire' };

/* ---------------- MUSUH ---------------- */
const ENEMIES = {
  normal:   {name:'Zombie',       hp:6,   spd:1.2, reward:4,  color:'#7cb342', size:0.55, desc:'Musuh dasar'},
  fast:     {name:'Pelari',       hp:4,   spd:2.4, reward:4,  color:'#fbc02d', size:0.45, desc:'Cepat tapi rapuh'},
  tank:     {name:'Tank',         hp:30,  spd:0.8, reward:10, color:'#8d6e63', size:0.7, armor:0.25, desc:'Lambat, HP besar, armor 25%'},
  hidden:   {name:'Hantu',        hp:10,  spd:1.6, reward:8,  color:'#b0bec5', size:0.5, hidden:true, desc:'Hanya bisa diserang tower dengan deteksi hidden'},
  regen:    {name:'Penyembuh',    hp:22,  spd:1.1, reward:10, color:'#26a69a', size:0.58, regen:0.04, desc:'Memulihkan HP sendiri terus-menerus'},
  armored:  {name:'Berzirah',     hp:45,  spd:1.0, reward:16, color:'#607d8b', size:0.65, armor:0.5, desc:'Armor 50%, gunakan tower tembus armor'},
  splitter: {name:'Pemecah',      hp:35,  spd:1.0, reward:12, color:'#ec407a', size:0.62, split:'mini', desc:'Pecah menjadi 2 musuh kecil saat mati'},
  mini:     {name:'Mini',         hp:8,   spd:2.0, reward:2,  color:'#f48fb1', size:0.38, desc:'Pecahan Pemecah', hide:true},
  flyer:    {name:'Kelelawar',    hp:7,   spd:1.9, reward:6,  color:'#4a148c', size:0.48, flying:true, desc:'Terbang — kebal Demoman, Meriam & Mortir'},
  thief:    {name:'Pencuri',      hp:12,  spd:2.1, reward:12, color:'#424242', size:0.5, thief:true, desc:'Jika lolos mencuri uang semua pemain'},
  shielded: {name:'Kesatria Perisai', hp:28, spd:0.95, reward:14, color:'#1565c0', size:0.64, shield:0.6, desc:'Perisai menyerap damage dulu (tembus armor = 2× ke perisai)'},
  berserk:  {name:'Pengamuk',     hp:36,  spd:1.0, reward:14, color:'#d84315', size:0.62, berserk:true, desc:'Jadi 2× lebih cepat saat HP di bawah 50%'},
  healer:   {name:'Dukun',        hp:26,  spd:0.9, reward:16, color:'#00897b', size:0.58, healer:true, desc:'Menyembuhkan musuh di sekitarnya'},
  stealth:  {name:'Bunglon',      hp:24,  spd:1.3, reward:14, color:'#9ccc65', size:0.55, stealth:true, desc:'Menghilang (hidden) secara berkala'},
  bomber:   {name:'Peledak',      hp:30,  spd:1.1, reward:14, color:'#ff6f00', size:0.6, bomber:true, desc:'Meledak saat mati dan membuat tower di dekatnya pingsan'},
  giant:    {name:'Raksasa',      hp:140, spd:0.6, reward:40, color:'#5d4037', size:0.95, armor:0.15, split:'normal', splitN:3, desc:'Sangat kuat; pecah jadi 3 zombie saat mati'},
  necro:    {name:'Nekromancer',  hp:60,  spd:0.8, reward:30, color:'#311b92', size:0.66, necro:true, desc:'Terus memanggil kerangka'},
  skeleton: {name:'Kerangka',     hp:9,   spd:1.6, reward:2,  color:'#eceff1', size:0.44, desc:'Panggilan Nekromancer', hide:true},
  golem:    {name:'Golem Batu',   hp:260, spd:0.45,reward:150,color:'#78909c', size:1.0, armor:0.4, noSlow:true, miniboss:true, desc:'Mini-boss tiap wave 15, 25, 35…: armor 40%, kebal efek lambat'},
  boss:     {name:'Raja Zombie',  hp:700, spd:0.55,reward:300,color:'#6a1b9a', size:1.1, armor:0.2, boss:true, desc:'Muncul tiap 10 wave: membuat tower pingsan & memanggil pasukan'},
};
const ENEMY_INTRO = { fast:3, flyer:4, tank:5, thief:6, hidden:7, shielded:8, regen:9, berserk:10, healer:11, armored:12, stealth:13, splitter:14, bomber:15, giant:17, necro:19, golem:15 };
/* Tower yang hanya bisa mengenai musuh darat */
const GROUND_ONLY = new Set(['demoman', 'cannon', 'mortar']);

/* ---------------- PROGRESI ---------------- */
const xpForLevel = lv => 100 * lv * lv;               // total XP untuk mencapai level lv+1
const levelFromXp = xp => { let lv = 1; while (xp >= xpForLevel(lv)) lv++; return lv; };

/* ---------------- PENCAPAIAN ---------------- */
const ACHIEVEMENTS = [
  { id:'first_game',  name:'Langkah Pertama',  desc:'Mainkan game pertama',           coins:50,  test:(p)=>p.stats.games>=1 },
  { id:'first_win',   name:'Pembela Base',     desc:'Menangkan satu game',            coins:200, test:(p)=>p.stats.wins>=1 },
  { id:'kills_100',   name:'Pemburu Zombie',   desc:'Kalahkan 100 musuh',             coins:100, test:(p)=>p.stats.kills>=100 },
  { id:'kills_2000',  name:'Pembasmi',         desc:'Kalahkan 2.000 musuh',           coins:400, test:(p)=>p.stats.kills>=2000 },
  { id:'boss_1',      name:'Penakluk Raja',    desc:'Kalahkan boss',                  coins:150, test:(p)=>p.stats.bossKills>=1 },
  { id:'boss_10',     name:'Pemburu Raja',     desc:'Kalahkan 10 boss',               coins:500, test:(p)=>p.stats.bossKills>=10 },
  { id:'wave_20',     name:'Bertahan Lama',    desc:'Capai wave 20',                  coins:150, test:(p,g)=>g && g.wave>=20 },
  { id:'max_tower',   name:'Maksimal!',        desc:'Upgrade tower sampai level max', coins:150, test:(p)=>p.stats.maxed>=1 },
  { id:'towers_100',  name:'Arsitek',          desc:'Pasang 100 tower',               coins:200, test:(p)=>p.stats.towersPlaced>=100 },
  { id:'perfect',     name:'Tanpa Cela',       desc:'Menang tanpa kehilangan nyawa',  coins:500, test:(p,g)=>g && g.won && g.hp>=g.maxHp },
  { id:'hard_win',    name:'Legenda',          desc:'Menang di kesulitan Sulit',      coins:1000,test:(p,g)=>g && g.won && g.diff==='hard' },
  { id:'all_maps',    name:'Penjelajah',       desc:'Menang di semua map',            coins:800, test:(p)=>MAPS.filter(m=>!m.event).every(m=>Object.keys(DIFFS).some(d=>(p.best[m.id+'_'+d]||0)>=DIFFS[d].waves)) },
  { id:'collector',   name:'Kolektor',         desc:'Miliki semua jenis unit',               coins:300, test:(p)=>UNIT_TYPES.every(k=>p.vault.units.some(u=>u.type===k)) },
  { id:'rich',        name:'Sultan',           desc:'Dapatkan $50.000 dalam satu game', coins:300, test:(p,g)=>g && g.earned>=50000 },
];

/* ---------------- MODE ---------------- */
const MODES = {
  classic: { name:'Klasik',  desc:'Bertahan sampai wave terakhir untuk menang.' },
  endless: { name:'Endless', desc:'Wave tanpa batas. Seberapa lama kamu bisa bertahan?' },
};

/* ---------------- SKILL PEMAIN ----------------
 * Terbuka berdasarkan level pemain. Dipakai saat bermain dengan tombol Z / C / V.
 */
const ABILITIES = [
  { id:'airstrike', name:'Serangan Udara', icon:'✈️', cd:45, color:'#ef6c00', target:true, desc:'Klik lokasi untuk menjatuhkan 3 bom. Tembus armor & mengenai hidden.' },
  { id:'freeze',    name:'Badai Es',       icon:'🧊', cd:60, color:'#0288d1', desc:'Memperlambat semua musuh 80% selama 4 detik (boss 40%).' },
  { id:'repair',    name:'Perbaikan Base', icon:'🔧', cd:90, color:'#2e7d32', desc:'Memulihkan 30% nyawa base.' },
  { id:'cash',      name:'Dana Darurat',   icon:'💰', cd:60, color:'#f9a825', desc:'Langsung mendapat $300 + $40 per wave.' },
  { id:'radar',     name:'Radar',          icon:'📡', cd:60, color:'#5e35b1', desc:'Semua tower bisa melihat musuh hidden selama 15 detik.' },
  { id:'overclock', name:'Overclock',      icon:'⚡', cd:75, color:'#fbc02d', desc:'Semua tower menembak 2× lebih cepat selama 8 detik.' },
  { id:'shield',    name:'Perisai Base',   icon:'🛡️', cd:90, color:'#1565c0', desc:'Base kebal dari musuh yang lolos selama 8 detik.' },
  { id:'meteor',    name:'Meteor',         icon:'☄️', cd:60, color:'#d84315', target:true, desc:'Klik lokasi: meteor raksasa dengan damage sangat besar.' },
  { id:'rewind',    name:'Putar Waktu',    icon:'🌀', cd:80, color:'#00897b', desc:'Mendorong semua musuh (kecuali boss) mundur 3 petak.' },
  { id:'storm',     name:'Badai Petir',    icon:'⛈️', cd:70, color:'#283593', desc:'12 sambaran petir ke musuh acak.' },
];
const SKILL_KEYS = ['z', 'c', 'v', 'b'];
const SKILL_SLOTS = 4;
const DEFAULT_SKILLS = ['airstrike', 'freeze', 'repair'];

/* ---------------- MODIFIER (Tantangan Harian) ---------------- */
const MODIFIERS = {
  fast:    { name:'Musuh Gesit',    icon:'💨', desc:'Musuh 30% lebih cepat',          spdMul:1.3 },
  tanky:   { name:'Kulit Baja',     icon:'🛡️', desc:'HP musuh +40%',                  hpMul:1.4 },
  rich:    { name:'Modal Besar',    icon:'💰', desc:'Uang awal 2×',                   cashMul:2 },
  poor:    { name:'Krisis',         icon:'📉', desc:'Hadiah kill −30%',               rewardMul:0.7 },
  nofarm:  { name:'Tanpa Farm',     icon:'🚫', desc:'Farm tidak bisa dipasang',        ban:['farm'] },
  nosnipe: { name:'Jarak Dekat',    icon:'🔭', desc:'Sniper & Rocketeer dilarang',     ban:['sniper','rocketeer'] },
  fragile: { name:'Base Rapuh',     icon:'💔', desc:'Nyawa base setengah',             hpBaseMul:0.5 },
  ghosts:  { name:'Malam Berkabut', icon:'👻', desc:'Musuh hantu muncul sejak wave 2', earlyHidden:true },
};
const DAILY_WAVES = 20, DAILY_REWARD = 500;

/* ---------------- TIPS TUTORIAL ---------------- */
const TIPS = {
  start:   'Pilih tower di bawah (atau tekan 1) lalu klik rumput di dekat jalur.',
  placed:  'Bagus! Tekan "Mulai Wave" atau Spasi untuk memulai.',
  wave1:   'Klik tower untuk melihat statistik, upgrade (Q), atau jual (X).',
  ability: 'Gunakan skill di kiri bawah (Z/C/V/B) saat keadaan genting! Ganti skill di menu Skill.',
  skip:    'Semua musuh sudah keluar? Tekan "Skip" untuk lanjut lebih cepat dan dapat bonus uang.',
  hidden:  'Wave berikutnya ada musuh Hantu! Pastikan ada tower dengan deteksi hidden (👁).',
  boss:    'Boss datang! Boss bisa membuat tower di dekatnya pingsan. Jangan biarkan dia lolos.',
};

/* ---------------- PENCAPAIAN TAMBAHAN ---------------- */
ACHIEVEMENTS.push(
  { id:'endless_40', name:'Tak Terbatas',    desc:'Capai wave 40 di mode Endless', coins:800, test:(p,g)=>g && g.mode==='endless' && g.wave>=40 },
  { id:'daily_1',    name:'Penantang',       desc:'Selesaikan Tantangan Harian',   coins:300, test:(p)=>p.stats.dailyWins>=1 },
  { id:'skills_25',  name:'Komandan Taktis', desc:'Gunakan skill 25 kali',         coins:200, test:(p)=>p.stats.abilities>=25 },
  { id:'skipper',    name:'Tak Sabaran',     desc:'Skip 20 wave',                  coins:150, test:(p)=>p.stats.skips>=20 },
);

/* =========================================================
 * SISTEM UNIT: mastery, trait, evolusi, material
 * ========================================================= */


/* Evolusi: bentuk baru dengan pengali statistik dan perk unik */
const EVOS = {
  scout:     { name:'Ranger',        color:'#1b5e20', perk:'triple',   mul:{ dmg:1.5, range:1.1 },  desc:'Setiap tembakan ke-4 memberi damage 3×.' },
  sniper:    { name:'Deadeye',       color:'#3e2723', perk:'crit',     mul:{ dmg:1.4, range:1.1 },  desc:'25% peluang critical hit 3× damage.' },
  demoman:   { name:'Bombardier',    color:'#b71c1c', perk:'burn',     mul:{ dmg:1.4, splash:1.25 },desc:'Ledakan membakar musuh: 30% damage/detik selama 3 detik.' },
  freezer:   { name:'Cryomancer',    color:'#01579b', perk:'freeze',   mul:{ dmg:2, range:1.15 },   desc:'20% peluang membekukan musuh 1 detik (bukan boss).' },
  farm:      { name:'Bank',          color:'#f57f17', perk:'interest', mul:{ income:1.5 },          desc:'Pendapatan +50% dan bunga 2% dari uangmu tiap wave (maks $400).' },
  minigun:   { name:'Gatling Titan', color:'#212121', perk:'ramp',     mul:{ dmg:1.3, range:1.1 },  desc:'Damage naik bertahap hingga +80% selama terus menembak.' },
  commander: { name:'Panglima',      color:'#1a237e', perk:'marshal',  mul:{ buffAdd:0.1, range:1.2 }, desc:'Buff +10% lebih kuat dan jangkauan +20%.' },
  rocketeer: { name:'Warlord',       color:'#4a148c', perk:'double',   mul:{ dmg:1.25, range:1.1 }, desc:'Meluncurkan 2 misil sekaligus.' },
  pistol:    { name:'Desperado',     color:'#4e342e', perk:'crit',     mul:{ dmg:1.5, range:1.1 },  desc:'25% peluang critical hit 3× damage.' },
  cannon:    { name:'Meriam Kepung', color:'#263238', perk:'burn',     mul:{ dmg:1.4, splash:1.3 }, desc:'Ledakan membakar musuh.' },
  flamer:    { name:'Infernal',      color:'#bf360c', perk:'ramp',     mul:{ dmg:1.5, range:1.15 }, desc:'Api makin panas selama terus menyembur (hingga +80%).' },
  mortar:    { name:'Artileri',      color:'#3e2723', perk:'double',   mul:{ dmg:1.3, range:1.1 },  desc:'Menembakkan 2 peluru sekaligus.' },
  tesla:     { name:'Raja Petir',    color:'#006064', perk:null,       mul:{ dmg:1.4, chainAdd:3 }, desc:'Petir melompat ke 3 musuh tambahan.' },
  laser:     { name:'Prisma',        color:'#b71c1c', perk:null,       mul:{ dmg:1.3, rampAdd:1.0 },desc:'Sinar bisa memanas hingga +100% lebih tinggi.' },
  poison:    { name:'Wabah Hitam',   color:'#33691e', perk:null,       mul:{ dmg:1.3, dotMul:2 },   desc:'Racun 2× lebih mematikan.' },
  railgun:   { name:'Gauss Prime',   color:'#1a237e', perk:'crit',     mul:{ dmg:1.3, range:1.1 },  desc:'25% peluang critical hit 3× damage.' },
  warden:    { name:'Chronos',       color:'#004d40', perk:null,       mul:{ dmg:1.5, slowAdd:0.15, range:1.2 }, desc:'Perlambatan +15% dan jangkauan +20%.' },
  nuke:      { name:'Tsar Bomba',    color:'#33691e', perk:null,       mul:{ dmg:1.5, splash:1.3 }, desc:'Ledakan 50% lebih kuat dan 30% lebih luas.' },
  dragon:    { name:'Naga Purbakala',color:'#4a0000', perk:'double',   mul:{ dmg:1.3, range:1.1 },  desc:'Menyemburkan 2 bola api sekaligus.' },
  archer:    { name:'Pemburu Elf',   color:'#1b5e20', perk:'crit',     mul:{ dmg:1.4, range:1.15 }, desc:'25% peluang critical hit 3× damage.' },
  shotgun:   { name:'Penjagal',      color:'#3e2723', perk:'triple',   mul:{ dmg:1.4, range:1.1 },  desc:'Setiap tembakan ke-4 memberi damage 3×.' },
  ninja:     { name:'Kage',          color:'#000000', perk:'crit',     mul:{ dmg:1.35, chainAdd:2 }, desc:'Shuriken memantul +2 dan 25% critical.' },
  samurai:   { name:'Shogun Naga',   color:'#7f0000', perk:'crit',     mul:{ dmg:1.45, range:1.1 }, desc:'25% peluang tebasan critical 3× damage.' },
  wizard:    { name:'Penyihir Waktu',color:'#311b92', perk:'freeze',   mul:{ dmg:1.35, chainAdd:2 }, desc:'Sihir 20% membekukan musuh 1 detik, +2 lompatan.' },
  reaper:    { name:'Dewa Kematian', color:'#000000', perk:null,       mul:{ dmg:1.5, slowAdd:0.1, range:1.15 }, desc:'Aura +50% damage, +10% perlambatan, +15% jangkauan.' },
  cosmic:    { name:'Pencipta Semesta', color:'#000051', perk:'crit', mul:{ dmg:1.45, chainAdd:3 }, desc:'Bintang melompat +3 dan 25% critical.' },
  snowman:   { name:'Raja Es',       color:'#81d4fa', perk:'freeze',   mul:{ dmg:1.4, splash:1.2 }, desc:'20% peluang membekukan musuh 1 detik, ledakan salju lebih luas.' },
  yeti:      { name:'Yeti Purbakala',color:'#4fc3f7', perk:null,       mul:{ dmg:1.5, slowAdd:0.1, range:1.15 }, desc:'Hentakan +50% damage, +10% perlambatan, +15% jangkauan.' },
  pirate:    { name:'Laksamana',     color:'#3e2723', perk:'burn',     mul:{ dmg:1.4, splash:1.25 }, desc:'Ledakan membakar musuh.' },
  knight:    { name:'Ksatria Suci',  color:'#616161', perk:'crit',     mul:{ dmg:1.45, range:1.1 }, desc:'25% peluang tebasan critical 3× damage.' },
  druid:     { name:'Druid Agung',   color:'#1b5e20', perk:null,       mul:{ dmg:1.35, dotMul:2, chainAdd:2 }, desc:'Racun 2× lebih kuat, +2 lompatan.' },
  firegod:   { name:'Dewa Matahari', color:'#e65100', perk:'crit',     mul:{ dmg:1.5, range:1.1 },  desc:'25% peluang critical 3× damage.' },
  thundergod:{ name:'Zeus',          color:'#1a237e', perk:'crit',     mul:{ dmg:1.45, chainAdd:4 }, desc:'Petir melompat +4 dan 25% critical.' },
  skier:     { name:'Atlet Olimpiade',color:'#b71c1c', perk:'triple',  mul:{ dmg:1.5, range:1.1 },  desc:'Setiap tembakan ke-4 memberi damage 3×.' },
  icearcher: { name:'Pemanah Aurora',color:'#0288d1', perk:'freeze',   mul:{ dmg:1.4, range:1.15 }, desc:'20% peluang membekukan musuh 1 detik.' },
  iceknight: { name:'Jenderal Es',   color:'#1565c0', perk:'freeze',   mul:{ dmg:1.45, range:1.1 }, desc:'20% peluang membekukan musuh 1 detik.' },
  frostmage: { name:'Penyihir Kutub',color:'#0277bd', perk:'freeze',   mul:{ dmg:1.35, chainAdd:2 }, desc:'Sihir 20% membekukan musuh 1 detik, +2 lompatan.' },
  frostqueen:{ name:'Dewi Musim Dingin', color:'#81d4fa', perk:'freeze', mul:{ dmg:1.45, chainAdd:3 }, desc:'Membekukan musuh (20%), +3 lompatan.' },
  goldminer: { name:'Juragan Emas',  color:'#ff6f00', perk:null,       mul:{ dmg:1.3, goldHit:1.5 }, desc:'Emas per pukulan +50%.' },
  angel:     { name:'Serafim Emas',  color:'#ffd54f', perk:'crit',     mul:{ dmg:1.4, range:1.1 },  desc:'25% peluang sinar critical 3× damage.' },
};



ACHIEVEMENTS.push(
  { id:'trait_1',    name:'Coba Peruntungan', desc:'Roll trait pertama kali',          coins:50,  test:(p)=>p.stats.rolls>=1 },
  { id:'trait_leg',  name:'Hoki Besar',       desc:'Dapatkan trait Legendaris/Mitos',  coins:400, test:(p)=>p.vault.units.some(u=>u.trait && RARITY[TRAITS[u.trait].rarity].rank>=3) },
  { id:'evo_1',      name:'Evolusi!',         desc:'Evolusikan sebuah unit',          coins:300, test:(p)=>p.vault.units.some(u=>u.evo) },
  { id:'mastery_20', name:'Ahli Sejati',      desc:'Capai mastery Lv 20 pada tower',   coins:500, test:(p)=>p.vault.units.some(u=>unitLevel(u.xp)>=UNIT_MAX_LV) },
  { id:'gacha_10',   name:'Penarik Nasib',    desc:'Lakukan 10 summon',                coins:150, test:(p)=>(p.vault.pulls||0)>=10 },
  { id:'trade_1',    name:'Pedagang',         desc:'Selesaikan 1 trading',             coins:200, test:(p)=>(p.stats.trades||0)>=1 },
);

/* Hadiah pencapaian diambil dari modul bersama agar sama dengan server */
ACHIEVEMENTS.forEach(a => { a.coins = ACH_REWARDS[a.id] || a.coins; a.diamonds = ACH_DIAMONDS; });
