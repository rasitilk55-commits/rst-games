// Oyun ekonomisi: bağlılık döngüleri ve gelir ürünleri.
// Ödüller her zaman açıkça gösterilir; parayla rastgele ödül satılmaz (App Store / Google Play kuralları).
import { rng, hash, dayKey } from './util.js';

export const PASS_TIERS = 30;
export const XP_PER_TIER = 100;
export const CHEST_STARS = 15;
export const BOOSTER_PRICE = 120;
export const STARTER_HOURS = 48;
export const WHEEL_AD_SPINS = 2;
export const FREE_COIN_ADS = 5;
export const FREE_COIN_AMOUNT = 40;

/** Uygulama içi ürünler. `id` mağaza ürün kimliğidir (App Store Connect / Play Console / RevenueCat). */
export const PRODUCTS = {
  coins_s: { id: 'coins_small', kind: 'consumable', coins: 1000, price: { tr: '₺29,99', en: '$0.99' } },
  coins_m: { id: 'coins_medium', kind: 'consumable', coins: 3600, bonus: 20, tag: 'popular', price: { tr: '₺89,99', en: '$2.99' } },
  coins_l: { id: 'coins_large', kind: 'consumable', coins: 11200, bonus: 60, tag: 'best', price: { tr: '₺209,99', en: '$6.99' } },
  starter: { id: 'starter_pack', kind: 'once', coins: 1500, boosters: 3, price: { tr: '₺29,99', en: '$0.99' } },
  no_ads: { id: 'no_ads', kind: 'entitlement', entitlement: 'no_ads', coins: 1000, price: { tr: '₺49,99', en: '$1.99' } },
  pass: { id: 'golden_road_s1', kind: 'entitlement', entitlement: 'pass_s1', price: { tr: '₺99,99', en: '$3.99' } },
  vip_w: { id: 'vip_weekly', kind: 'sub', entitlement: 'vip', period: 'week', price: { tr: '₺59,99', en: '$1.99' } },
  vip_m: { id: 'vip_monthly', kind: 'sub', entitlement: 'vip', period: 'month', price: { tr: '₺149,99', en: '$4.99' } },
};

export function defaults(cfg) {
  return {
    level: 1, best: {}, coins: 0, owned: [cfg.skins[0].id], skin: cfg.skins[0].id,
    welcomed: false, daily: {}, streak: 0, lastDaily: '', prefs: { sound: true, vibration: true },
    ent: {}, // aktif yetkiler: no_ads, vip, pass_s1
    xp: 0, passClaimed: { free: [], prem: [] },
    chestStars: 0, chestsOpened: 0,
    boosters: Object.fromEntries((cfg.boosters || []).map((b) => [b.id, 1])),
    quests: null, calendar: { last: '', idx: 0 }, wheel: { day: '', free: 0, ad: 0 },
    offers: { starterAt: 0, starterBought: false, noAdsGranted: false },
    freeAds: { day: '', n: 0 },
    fails: {}, vipDay: '', notifAsked: false, lastOpenDay: '', wins: 0, attempts: 0,
  };
}

/** Eski kayıtları yeni alanlara taşır. */
export function migrate(S, cfg) {
  const d = defaults(cfg);
  for (const k of Object.keys(d)) if (S[k] === undefined || S[k] === null && d[k] !== null) S[k] = d[k];
  if (S.noAds) { S.ent.no_ads = true; delete S.noAds; }
  for (const b of cfg.boosters || []) if (S.boosters[b.id] === undefined) S.boosters[b.id] = 1;
  return S;
}

export const noAds = (S) => !!(S.ent.no_ads || S.ent.vip);
export const isVip = (S) => !!S.ent.vip;
export const hasPass = (S) => !!S.ent.pass_s1;

/* ---------- Altın Yol (sezon kartı) ---------- */
export function passRewards(cfg) {
  const ids = (cfg.boosters || []).map((b) => b.id);
  const passSkins = cfg.skins.filter((s) => s.pass);
  const free = [], prem = [];
  for (let t = 1; t <= PASS_TIERS; t++) {
    free.push(t % 5 === 0 && ids.length ? { type: 'booster', id: ids[(t / 5) % ids.length], n: 1 } : { type: 'coins', n: 30 + t * 5 });
    const skin = passSkins.find((s) => s.pass === t);
    if (skin) prem.push({ type: 'skin', id: skin.id });
    else if (t % 3 === 0 && ids.length) prem.push({ type: 'booster', id: ids[t % ids.length], n: 2 });
    else prem.push({ type: 'coins', n: 100 + t * 12 });
  }
  return { free, prem };
}
export const passTier = (S) => Math.min(PASS_TIERS, Math.floor(S.xp / XP_PER_TIER));

/* ---------- 7 günlük ödül takvimi ---------- */
export function calendar(cfg) {
  const ids = (cfg.boosters || []).map((b) => b.id);
  const b1 = ids[0], b2 = ids[1] || ids[0];
  const skin = cfg.skins.find((s) => s.calendar);
  return [
    { type: 'coins', n: 50 },
    b1 ? { type: 'booster', id: b1, n: 1 } : { type: 'coins', n: 80 },
    { type: 'coins', n: 100 },
    b2 ? { type: 'booster', id: b2, n: 1 } : { type: 'coins', n: 120 },
    { type: 'coins', n: 200 },
    b1 ? { type: 'booster', id: b1, n: 2 } : { type: 'coins', n: 250 },
    skin ? { type: 'skin', id: skin.id } : { type: 'coins', n: 500 },
  ];
}
export const calendarReady = (S) => S.calendar.last !== dayKey();

/* ---------- Günlük görevler ---------- */
const QUEST_POOL = [
  { type: 'win', target: 3, reward: 80 },
  { type: 'win', target: 6, reward: 140 },
  { type: 'stars3', target: 2, reward: 120 },
  { type: 'daily', target: 1, reward: 90 },
  { type: 'booster', target: 1, reward: 70 },
  { type: 'ad', target: 1, reward: 60 },
  { type: 'play', target: 10, reward: 80 },
  { type: 'chest', target: 1, reward: 100 },
];
export function ensureQuests(S) {
  const day = dayKey();
  if (S.quests && S.quests.day === day) return S.quests;
  const r = rng(hash('quests-' + day));
  const pool = QUEST_POOL.slice();
  const list = [];
  const used = new Set();
  while (list.length < 3 && pool.length) {
    const q = pool.splice(Math.floor(r() * pool.length), 1)[0];
    if (used.has(q.type)) continue;
    used.add(q.type);
    list.push({ ...q, progress: 0, claimed: false });
  }
  S.quests = { day, list, bonus: false };
  return S.quests;
}
export function questEvent(S, type, n = 1) {
  const Q = ensureQuests(S);
  let done = false;
  for (const q of Q.list) {
    if (q.type !== type || q.claimed || q.progress >= q.target) continue;
    q.progress = Math.min(q.target, q.progress + n);
    if (q.progress >= q.target) done = true;
  }
  return done;
}
export const questsClaimable = (S) => {
  const Q = ensureQuests(S);
  return Q.list.some((q) => q.progress >= q.target && !q.claimed) || (!Q.bonus && Q.list.every((q) => q.claimed));
};

/* ---------- Şans çarkı (yalnızca ücretsiz ve reklamla; parayla çevrilmez) ---------- */
export function wheel(cfg) {
  const ids = (cfg.boosters || []).map((b) => b.id);
  const b1 = ids[0], b2 = ids[1] || ids[0];
  return [
    { type: 'coins', n: 20, w: 24 },
    { type: 'coins', n: 50, w: 20 },
    b1 ? { type: 'booster', id: b1, n: 1, w: 14 } : { type: 'coins', n: 60, w: 14 },
    { type: 'coins', n: 100, w: 14 },
    b2 ? { type: 'booster', id: b2, n: 1, w: 14 } : { type: 'coins', n: 60, w: 14 },
    { type: 'coins', n: 30, w: 8 },
    { type: 'coins', n: 250, w: 4 },
    b1 ? { type: 'booster', id: b1, n: 3, w: 2 } : { type: 'coins', n: 400, w: 2 },
  ];
}
export function wheelState(S) {
  const day = dayKey();
  if (S.wheel.day !== day) S.wheel = { day, free: 0, ad: 0 };
  return S.wheel;
}
export function pickWheel(segs, rand = Math.random) {
  const total = segs.reduce((s, x) => s + x.w, 0);
  let v = rand() * total;
  for (let i = 0; i < segs.length; i++) { v -= segs[i].w; if (v < 0) return i; }
  return segs.length - 1;
}

/* ---------- Başlangıç paketi (gerçek süre; sayaç sıfırlanmaz) ---------- */
export function starterLeftMs(S) {
  if (S.offers.starterBought || !S.offers.starterAt) return 0;
  return Math.max(0, S.offers.starterAt + STARTER_HOURS * 3600e3 - Date.now());
}
