// Küçük yardımcılar: tohumlu rastgele sayı, gün anahtarı, dil ve metin çevirisi.

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(str) {
  let h = 2166136261;
  for (const c of String(str)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function dayKey(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
export const yesterdayKey = () => dayKey(new Date(Date.now() - 864e5));

export const lang = (() => {
  try {
    const forced = new URLSearchParams(location.search).get('lang');
    if (forced === 'tr' || forced === 'en') return forced;
  } catch (e) { /* yok say */ }
  try {
    const saved = localStorage.getItem('rst.lang'); // Ayarlar > Dil
    if (saved === 'tr' || saved === 'en') return saved;
  } catch (e) { /* yok say */ }
  const l = (navigator.language || 'en').toLowerCase();
  return l.startsWith('tr') ? 'tr' : 'en';
})();

/** dict: { tr: {...}, en: {...} } — eksik anahtar İngilizceye, o da yoksa anahtarın kendisine düşer. */
export function translate(dict, key, vars) {
  let s = dict?.[lang]?.[key] ?? dict?.en?.[key] ?? key;
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}

export const fmtSec = (s) => {
  const v = Math.abs(s).toFixed(2);
  return lang === 'tr' ? v.replace('.', ',') : v;
};

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const hexA = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
