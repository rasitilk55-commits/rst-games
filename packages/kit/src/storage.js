// Oyuncu ilerlemesi: tarayıcıda localStorage, uygulamada ayrıca Capacitor Preferences
// (iOS'un web depolamasını temizlemesine karşı kalıcı kopya).
import { isNative, loadPlugin } from './native.js';

const clone = (o) => JSON.parse(JSON.stringify(o));

export async function createStore(id, defaults) {
  const KEY = 'rst.' + id + '.v1';
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { /* depolama kapalı olabilir */ }
  if (isNative()) {
    try {
      const { Preferences } = await loadPlugin('preferences');
      const r = await Preferences.get({ key: KEY });
      if (r && r.value) raw = r.value;
    } catch (e) { /* yerel kopya yoksa devam */ }
  }
  let data = clone(defaults);
  if (raw) {
    try { data = Object.assign(clone(defaults), JSON.parse(raw)); } catch (e) { /* bozuk kayıt: sıfırdan başla */ }
  }

  let timer = 0, pending = null;
  async function writeNative() {
    const s = pending;
    pending = null;
    if (s == null) return;
    try {
      const { Preferences } = await loadPlugin('preferences');
      await Preferences.set({ key: KEY, value: s });
    } catch (e) { /* yok say */ }
  }
  function save() {
    const s = JSON.stringify(data);
    try { localStorage.setItem(KEY, s); } catch (e) { /* yok say */ }
    if (isNative()) {
      pending = s;
      clearTimeout(timer);
      timer = setTimeout(writeNative, 300);
    }
  }
  /** Uygulama arka plana geçerken bekleyen kaydı hemen yaz (sistem uygulamayı kapatabilir). */
  function flush() { clearTimeout(timer); return writeNative(); }
  function reset() {
    data = clone(defaults);
    save();
    return data;
  }
  return { get data() { return data; }, save, reset, flush };
}
