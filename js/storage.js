/* =========================================================
 * Penyimpanan: pengaturan & profil pemain
 * Lokal (localStorage) untuk tamu & cadangan; untuk akun Google disinkron ke database:
 * profil (XP, statistik, pencapaian, loadout, rekor), pengaturan, dan permainan yang sedang berjalan.
 * ========================================================= */
'use strict';

const Storage = {
  load(key, def) {
    try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v ? deepMerge(def, v) : def; }
    catch (e) { return def; }
  },
  save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} },
};
function deepMerge(a, b) {
  for (const k in b) {
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') deepMerge(a[k], b[k]);
    else a[k] = b[k];
  }
  return a;
}

const defaultSettings = () => ({ view: 'iso',
  sound:true, music:true, sfxVol:0.5, musicVol:0.3,
  dmgNum:true, shake:true, range:true, grid:false, fps:false, autoPause:true, quality:'high', chatMin:false, autoFs:true, breakRemind:true,
});
const defaultProfile = () => {
  const vault = SHARED.newVault(Date.now(), Math.random);
  return {
    xp: 0, vault, loadout: vault.units.map(u => u.id), skillLoadout: [...DEFAULT_SKILLS],
    achievements: [], best: {}, mapsPlayed: {}, runs: [], tips: [], daily: { date: '', won: false, best: 0 },
    stats: { games: 0, wins: 0, kills: 0, bossKills: 0, towersPlaced: 0, cashEarned: 0, maxed: 0, playTime: 0, abilities: 0, skips: 0, dailyWins: 0, rolls: 0, trades: 0 },
  };
};

/** Migrasi profil versi lama (unit per jenis + koin lokal) ke inventaris unit */
function migrateProfile(p) {
  if (p.vault && Array.isArray(p.vault.units)) return p;
  const v = SHARED.newVault(Date.now(), Math.random);
  const legacyUnits = p.units || {}, owned = Array.isArray(p.unlocked) && p.unlocked.length ? p.unlocked : STARTER_UNITS;
  v.units = owned.filter(t => UNIT_RARITY[t]).map(t => SHARED.makeUnit(t, Math.random, Date.now(), {
    trait: (legacyUnits[t] || {}).trait || null, evo: !!(legacyUnits[t] || {}).evo, xp: (legacyUnits[t] || {}).xp || 0, tradable: false }));
  v.coins = p.coins || 0; v.crystals = Math.max(v.crystals, p.crystals || 0); v.stones = p.stones || 0;
  v.achClaimed = [...(p.achievements || [])];
  const ids = (p.loadout || []).map(t => (v.units.find(u => u.type === t) || {}).id).filter(Boolean);
  p.loadout = ids.length ? ids : v.units.map(u => u.id).slice(0, LOADOUT_SIZE);
  p.vault = v; p.skillLoadout = p.skillLoadout || [...DEFAULT_SKILLS];
  delete p.units; delete p.unlocked; delete p.coins; delete p.crystals; delete p.stones;
  return p;
}

// Simpanan game yang sedang berjalan (lanjutkan nanti)
const SaveGame = {
  get() { try { return JSON.parse(localStorage.getItem('btd_save') || 'null'); } catch (e) { return null; } },
  set(v, local) { Storage.save('btd_save', v); if (!local && typeof Online !== 'undefined') Online.markRun(); },
  clear(local) { try { localStorage.removeItem('btd_save'); } catch (e) {} if (!local && typeof Online !== 'undefined') Online.markRun(); },
};

const SET = Storage.load('btd_settings', defaultSettings());
const PROFILE = migrateProfile((() => {
  let raw = null; try { raw = JSON.parse(localStorage.getItem('btd_profile') || 'null'); } catch (e) {}
  if (!raw) return defaultProfile();
  if (!raw.vault) return deepMerge({ ...defaultProfile(), vault: undefined }, raw);
  return deepMerge(defaultProfile(), raw);
})());
const saveSettings = (local) => { if (!local) SET.updatedAt = Date.now(); Storage.save('btd_settings', SET); if (!local && typeof Online !== 'undefined') Online.queueSave(); };
const saveProfile = () => {
  PROFILE.updatedAt = Date.now();
  Storage.save('btd_profile', PROFILE);
  if (typeof Online !== 'undefined') Online.queueSave();
};

function resetAllData() {
  const owner = PROFILE.ownerId;
  for (const k of Object.keys(PROFILE)) delete PROFILE[k];
  Object.assign(PROFILE, defaultProfile(), { ownerId: owner });
  saveProfile(); SaveGame.clear();
}
