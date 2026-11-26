/* =========================================================
 * Audio: efek suara & musik latar prosedural (WebAudio)
 * Tidak memerlukan file audio eksternal.
 * ========================================================= */
'use strict';

const Sound = (() => {
  let ctx = null, sfxGain = null, musicGain = null, musicTimer = null, step = 0;
  const last = {};

  function ensure() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      sfxGain = ctx.createGain(); musicGain = ctx.createGain();
      sfxGain.connect(ctx.destination); musicGain.connect(ctx.destination);
      applyVolume();
    } catch (e) { ctx = null; }
    return ctx;
  }
  function applyVolume() {
    if (!ctx) return;
    sfxGain.gain.value = SET.sound ? SET.sfxVol : 0;
    musicGain.gain.value = SET.music ? SET.musicVol * 0.35 : 0;
  }

  // [frekuensi, durasi, gelombang, gain, rasio akhir frekuensi]
  const PRESETS = {
    shoot:[880,0.04,'square',0.05,0.5], snipe:[220,0.14,'sawtooth',0.12,0.4], boom:[90,0.35,'sawtooth',0.22,0.4],
    rocket:[160,0.25,'square',0.12,2], place:[520,0.1,'triangle',0.2,0.6], upgrade:[660,0.2,'triangle',0.2,1.5],
    sell:[330,0.12,'triangle',0.2,0.5], leak:[120,0.3,'square',0.2,0.5], wave:[440,0.35,'triangle',0.2,1.5],
    click:[700,0.05,'triangle',0.12,0.8], error:[180,0.15,'square',0.12,0.8], freeze:[1200,0.06,'sine',0.08,0.6],
    win:[523,0.8,'triangle',0.25,2], lose:[110,0.9,'sawtooth',0.25,0.4], coin:[988,0.12,'square',0.1,1.4],
    stun:[300,0.4,'sawtooth',0.15,0.3], achieve:[784,0.5,'triangle',0.22,2],
  };

  function sfx(type) {
    if (!SET.sound || !ensure()) return;
    const now = performance.now();
    if (last[type] && now - last[type] < 55) return;
    last[type] = now;
    const p = PRESETS[type]; if (!p) return;
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = p[2];
    o.frequency.setValueAtTime(p[0], t);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, p[0] * p[4]), t + p[1]);
    g.gain.setValueAtTime(p[3], t);
    g.gain.exponentialRampToValueAtTime(0.001, t + p[1]);
    o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + p[1] + 0.02);
  }

  // Musik: progresi akor sederhana + bass, tempo 112 BPM
  const CHORDS = [[220,261.6,329.6],[174.6,220,261.6],[196,246.9,293.7],[164.8,207.7,246.9]];
  function note(freq, dur, type, vol, when) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(musicGain); o.start(when); o.stop(when + dur + 0.05);
  }
  function tick() {
    if (!ctx || !SET.music) return;
    const t = ctx.currentTime + 0.05, chord = CHORDS[Math.floor(step / 8) % CHORDS.length];
    if (step % 8 === 0) note(chord[0] / 2, 1.0, 'triangle', 0.35, t);
    if (step % 4 === 2) note(chord[0] / 2, 0.3, 'triangle', 0.25, t);
    note(chord[step % 3] * 2, 0.18, 'square', 0.06, t);
    step++;
  }
  function startMusic() {
    if (musicTimer || !ensure()) return;
    musicTimer = setInterval(tick, 60000 / 112 / 2);
  }
  function stopMusic() { clearInterval(musicTimer); musicTimer = null; }
  function unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); startMusic(); }

  return { sfx, startMusic, stopMusic, applyVolume, unlock };
})();
const sfx = Sound.sfx;
