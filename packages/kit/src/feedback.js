// Ses efektleri (WebAudio, dosya gerekmez) ve titreşim (uygulamada Capacitor Haptics).
import { isNative, loadPlugin } from './native.js';

export function createFeedback(getPrefs) {
  let AC = null;

  function unlock() {
    try {
      if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === 'suspended') AC.resume();
    } catch (e) { /* ses yok */ }
  }

  function notes(freqs, type = 'sine', gap = 0.09, vol = 0.08, dur = 0.5) {
    if (!AC || !getPrefs().sound) return;
    const t = AC.currentTime;
    freqs.forEach((f, i) => {
      const o = AC.createOscillator();
      const g = AC.createGain();
      o.type = type;
      o.frequency.value = f;
      const s = t + i * gap;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(vol, s + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
      o.connect(g);
      g.connect(AC.destination);
      o.start(s);
      o.stop(s + dur + 0.05);
    });
  }

  const SFX = {
    tap: () => notes([520, 780], 'triangle', 0.05, 0.05, 0.25),
    pop: () => notes([880, 1320], 'sine', 0.03, 0.06, 0.18),
    hit: () => notes([300 + Math.random() * 200], 'triangle', 0, 0.04, 0.12),
    coin: () => notes([988, 1319], 'square', 0.06, 0.03, 0.25),
    win: () => notes([523, 659, 784], 'sine', 0.08, 0.09, 0.6),
    win3: () => notes([523, 659, 784, 1047], 'sine', 0.08, 0.09, 0.7),
    fail: () => notes([196, 147], 'triangle', 0.1, 0.07, 0.35),
    buy: () => notes([660, 880], 'sine', 0.07, 0.07, 0.4),
  };

  function sfx(name) {
    const f = SFX[name];
    if (f) f();
  }

  async function haptic(kind = 'light') {
    if (!getPrefs().vibration) return;
    if (isNative()) {
      try {
        const { Haptics } = await loadPlugin('haptics');
        if (kind === 'success' || kind === 'error' || kind === 'warning') {
          await Haptics.notification({ type: kind.toUpperCase() });
        } else {
          await Haptics.impact({ style: kind === 'heavy' ? 'HEAVY' : kind === 'medium' ? 'MEDIUM' : 'LIGHT' });
        }
      } catch (e) { /* yok say */ }
      return;
    }
    const pat = { light: 10, medium: 25, heavy: 45, success: [20, 40, 20], error: [60, 40, 60], warning: 40 }[kind] || 10;
    try { navigator.vibrate && navigator.vibrate(pat); } catch (e) { /* yok say */ }
  }

  const suspend = () => { try { if (AC && AC.state === 'running') AC.suspend(); } catch (e) { /* yok say */ } };
  const resume = () => { try { if (AC && AC.state === 'suspended') AC.resume(); } catch (e) { /* yok say */ } };

  return { unlock, sfx, haptic, notes, suspend, resume };
}

export async function shareText(text, title) {
  if (isNative()) {
    try {
      const { Share } = await loadPlugin('share');
      await Share.share({ text, dialogTitle: title });
      return 'shared';
    } catch (e) { /* kopyalamaya düş */ }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch (e) {
    return 'failed';
  }
}
