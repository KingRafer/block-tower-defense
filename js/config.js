/* =========================================================
 * Block Tower Defense — konfigurasi data game
 * Semua angka balancing ada di file ini.
 * ========================================================= */
'use strict';

const VERSION = '2.2.0';
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
];

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
const TOWER_ORDER = ['scout','sniper','demoman','freezer','farm','minigun','commander','rocketeer'];
const DEFAULT_LOADOUT = ['scout','sniper','demoman','freezer','farm'];

/* ---------------- MUSUH ---------------- */
const ENEMIES = {
  normal:   {name:'Zombie',       hp:6,   spd:1.2, reward:4,  color:'#7cb342', size:0.55},
  fast:     {name:'Pelari',       hp:4,   spd:2.4, reward:4,  color:'#fbc02d', size:0.45},
  tank:     {name:'Tank',         hp:30,  spd:0.8, reward:10, color:'#8d6e63', size:0.7, armor:0.25},
  hidden:   {name:'Hantu',        hp:10,  spd:1.6, reward:8,  color:'#b0bec5', size:0.5, hidden:true},
  regen:    {name:'Penyembuh',    hp:22,  spd:1.1, reward:10, color:'#26a69a', size:0.58, regen:0.04},
  armored:  {name:'Berzirah',     hp:45,  spd:1.0, reward:16, color:'#607d8b', size:0.65, armor:0.5},
  splitter: {name:'Pemecah',      hp:35,  spd:1.0, reward:12, color:'#ec407a', size:0.62, split:'mini'},
  mini:     {name:'Mini',         hp:8,   spd:2.0, reward:2,  color:'#f48fb1', size:0.38},
  boss:     {name:'Raja Zombie',  hp:700, spd:0.55,reward:300,color:'#6a1b9a', size:1.1, armor:0.2, boss:true},
};
const ENEMY_INTRO = { fast:3, tank:5, hidden:7, regen:9, armored:12, splitter:14 };

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
  { id:'all_maps',    name:'Penjelajah',       desc:'Menang di semua map',            coins:800, test:(p)=>MAPS.every(m=>Object.keys(DIFFS).some(d=>(p.best[m.id+'_'+d]||0)>=DIFFS[d].waves)) },
  { id:'collector',   name:'Kolektor',         desc:'Buka semua tower',               coins:300, test:(p)=>TOWER_ORDER.every(k=>p.unlocked.includes(k)) },
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
  { id:'airstrike', name:'Serangan Udara', icon:'✈️', key:'z', cd:45, level:1, color:'#ef6c00',
    desc:'Klik lokasi di peta untuk menjatuhkan 3 bom. Tembus armor & mengenai hidden.' },
  { id:'freeze',    name:'Badai Es',       icon:'🧊', key:'c', cd:60, level:3, color:'#0288d1',
    desc:'Memperlambat semua musuh 80% selama 4 detik (boss 40%).' },
  { id:'repair',    name:'Perbaikan Base', icon:'🔧', key:'v', cd:90, level:5, color:'#2e7d32',
    desc:'Memulihkan 30% nyawa base.' },
];

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
  ability: 'Gunakan skill di kiri bawah (Z) saat keadaan genting!',
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
const UNIT_MAX_LV = 20;
const unitXpFor = lv => 40 * (lv - 1) * (lv - 1);                  // total XP untuk level lv
const unitLevel = xp => Math.min(UNIT_MAX_LV, 1 + Math.floor(Math.sqrt(xp / 40)));
const MASTERY_BONUS = 0.02;                                          // +2% damage per level

const RARITY = {
  common:    { name:'Biasa',      color:'#9e9e9e', rank:0 },
  rare:      { name:'Langka',     color:'#42a5f5', rank:1 },
  epic:      { name:'Epik',       color:'#ab47bc', rank:2 },
  legendary: { name:'Legendaris', color:'#ffb300', rank:3 },
  mythic:    { name:'Mitos',      color:'#ff1744', rank:4 },
};
/* w = bobot peluang (total 100). dmgMul juga berlaku untuk pendapatan Farm & buff Commander. */
const TRAITS = {
  kuat1:     { name:'Kuat I',        icon:'💪', rarity:'common',    w:20,  dmgMul:1.05,  desc:'+5% damage' },
  cepat1:    { name:'Cepat I',       icon:'⚡', rarity:'common',    w:20,  rateMul:0.95, desc:'Cooldown −5%' },
  jangkau1:  { name:'Jangkauan I',   icon:'🎯', rarity:'common',    w:20,  rangeMul:1.05,desc:'+5% range' },
  kuat2:     { name:'Kuat II',       icon:'💪', rarity:'rare',      w:8,   dmgMul:1.12,  desc:'+12% damage' },
  cepat2:    { name:'Cepat II',      icon:'⚡', rarity:'rare',      w:8,   rateMul:0.9,  desc:'Cooldown −10%' },
  jangkau2:  { name:'Jangkauan II',  icon:'🎯', rarity:'rare',      w:5,   rangeMul:1.12,desc:'+12% range' },
  hemat:     { name:'Hemat',         icon:'🏷️', rarity:'rare',      w:4,   costMul:0.85, desc:'Harga pasang & upgrade −15%' },
  kuat3:     { name:'Kuat III',      icon:'💪', rarity:'epic',      w:3,   dmgMul:1.2,   desc:'+20% damage' },
  mataelang: { name:'Mata Elang',    icon:'👁️', rarity:'epic',      w:3,   rangeMul:1.08, hidden:true, desc:'Deteksi hidden sejak Lv 0, +8% range' },
  penembus:  { name:'Penembus',      icon:'🛡️', rarity:'epic',      w:2.5, dmgMul:1.08, pierce:true, desc:'Tembus armor, +8% damage' },
  pemburu:   { name:'Pemburu Raja',  icon:'👑', rarity:'epic',      w:2.5, bossMul:1.35, desc:'+35% damage ke boss' },
  midas:     { name:'Midas',         icon:'💰', rarity:'legendary', w:1.5, dmgMul:1.1, rewardMul:1.3, desc:'Hadiah kill +30%, +10% damage' },
  berserker: { name:'Berserker',     icon:'🔥', rarity:'legendary', w:2,   dmgMul:1.25, rateMul:0.85, desc:'+25% damage, cooldown −15%' },
  dewa:      { name:'Dewa Perang',   icon:'🌟', rarity:'mythic',    w:0.5, dmgMul:1.4, rateMul:0.8, rangeMul:1.15, hidden:true, desc:'+40% damage, cooldown −20%, +15% range, deteksi hidden' },
};

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
};
const EVO_REQ = { level:10, stones:3, coins:1000 };

const MATERIALS = {
  crystals: { name:'Kristal Trait', icon:'💎', price:200, desc:'Dipakai untuk roll trait tower.' },
  stones:   { name:'Batu Evolusi',  icon:'🔮', price:900, desc:'Dipakai untuk evolusi tower.' },
};

ACHIEVEMENTS.push(
  { id:'trait_1',    name:'Coba Peruntungan', desc:'Roll trait pertama kali',          coins:50,  test:(p)=>p.stats.rolls>=1 },
  { id:'trait_leg',  name:'Hoki Besar',       desc:'Dapatkan trait Legendaris/Mitos',  coins:400, test:(p)=>Object.values(p.units).some(u=>u.trait && RARITY[TRAITS[u.trait].rarity].rank>=3) },
  { id:'evo_1',      name:'Evolusi!',         desc:'Evolusikan sebuah tower',          coins:300, test:(p)=>Object.values(p.units).some(u=>u.evo) },
  { id:'mastery_20', name:'Ahli Sejati',      desc:'Capai mastery Lv 20 pada tower',   coins:500, test:(p)=>Object.values(p.units).some(u=>unitLevel(u.xp)>=UNIT_MAX_LV) },
);
