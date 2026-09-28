// __TITLE_TR__ ayarları. Metinleri, temayı ve görünümleri oyununa göre düzenle.
import { createGame } from './game.js';
import { release } from './release.js'; // yayin-ayarlari.json → tools/apply-release.mjs

export const config = {
  id: '__SLUG__',
  version: release.version,
  createGame,
  dailyLevel: 8,
  shareEmoji: '🎯',
  privacyUrl: release.privacyUrl,
  termsUrl: release.termsUrl || undefined,
  theme: { '--bg': '__COLOR__', '--pill': 'rgba(255,255,255,.14)', '--pill-ink': '#F4F1EA', '--hud-sub': '#C9CCE0' },
  skins: [
    { id: 'klasik', name: { tr: 'Klasik', en: 'Classic' }, price: 0, a: '#F7F3EA', b: '#CFC8B8' },
    { id: 'mercan', name: { tr: 'Mercan', en: 'Coral' }, price: 120, a: '#FF6B5A', b: '#D9483A' },
    { id: 'nane', name: { tr: 'Nane', en: 'Mint' }, price: 200, a: '#3FCB8E', b: '#1E8A5E' },
    { id: 'altin', name: { tr: 'Altın', en: 'Gold' }, price: 600, a: '#F2C94C', b: '#C98A12' },
    { id: 'neon', name: { tr: 'Neon', en: 'Neon' }, pack: true, a: '#FF5FA2', b: '#6FD3FF' },
  ],
  ads: { units: release.adUnits || undefined, testing: typeof __RST_LIVE_ADS__ === 'undefined' || !__RST_LIVE_ADS__, interstitialEvery: 4, graceMs: 120000 },
  iap: { revenuecat: release.revenuecat },
  texts: {
    tr: {
      title: '__TITLE_TR__',
      canvasLabel: 'Oyun alanı',
      shopTitle: 'Görünümler',
      welcomeBody: 'Top yeşil bölgedeyken dokun.\n\nNe kadar ortaya yakınsa o kadar çok yıldız.',
      tip: 'Yeşildeyken dokun',
      sub: 'Tam ortayı yakala',
      dailySub: 'Bugünün görevi',
      win1: 'Oldu!', win2: 'Güzel!', win3: 'Kusursuz!',
      failTitle: 'Kaçtı',
      miss: 'Az kaldı!',
      missMsg: 'Ritmi izle ve tekrar dene.',
      hint: 'Yavaş çekim ipucu',
    },
    en: {
      title: '__TITLE_EN__',
      canvasLabel: 'Game area',
      shopTitle: 'Looks',
      welcomeBody: 'Tap while the ball is in the green zone.\n\nThe closer to the center, the more stars.',
      tip: 'Tap in the green',
      sub: 'Hit the exact center',
      dailySub: "Today's challenge",
      win1: 'Done!', win2: 'Nice!', win3: 'Perfect!',
      failTitle: 'Missed',
      miss: 'So close!',
      missMsg: 'Watch the rhythm and try again.',
      hint: 'Slow-motion hint',
    },
  },
};
