/* =========================================================
 * Penyimpanan: pengaturan & profil pemain (localStorage)
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

const defaultSettings = () => ({
  sound:true, music:true, sfxVol:0.5, musicVol:0.3,
  dmgNum:true, shake:true, range:true, grid:false, fps:false, autoPause:true, quality:'high',
});
const defaultProfile = () => ({
  coins:0, xp:0,
  unlocked:[...DEFAULT_LOADOUT], loadout:[...DEFAULT_LOADOUT],
  achievements:[], best:{}, mapsPlayed:{}, runs:[], tips:[], daily:{ date:'', won:false, best:0 },
  stats:{ games:0, wins:0, kills:0, bossKills:0, towersPlaced:0, cashEarned:0, maxed:0, playTime:0, abilities:0, skips:0, dailyWins:0 },
});

// Simpanan game yang sedang berjalan (lanjutkan nanti)
const SaveGame = {
  get() { try { return JSON.parse(localStorage.getItem('btd_save') || 'null'); } catch (e) { return null; } },
  set(v) { Storage.save('btd_save', v); },
  clear() { try { localStorage.removeItem('btd_save'); } catch (e) {} },
};

const SET = Storage.load('btd_settings', defaultSettings());
const PROFILE = Storage.load('btd_profile', defaultProfile());
const saveSettings = () => Storage.save('btd_settings', SET);
const saveProfile = () => Storage.save('btd_profile', PROFILE);

function resetAllData() {
  Object.assign(PROFILE, defaultProfile());
  saveProfile(); SaveGame.clear();
}
