// Reklamlar: uygulamada AdMob (ödüllü + geçiş), tarayıcıda simülasyon.
// Birim kimlikleri verilmezse Google'ın resmi TEST kimlikleri kullanılır; yayından önce gerçekleriyle değiştir.
import { isNative, platform, loadPlugin } from './native.js';

const TEST_UNITS = {
  android: {
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
  },
  ios: {
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
  },
};

/**
 * cfg: { units?: {android:{rewarded,interstitial}, ios:{...}}, testing?: boolean,
 *        interstitialEvery?: number, graceMs?: number }
 * hooks: { noAds: () => boolean, simulate: (kind) => Promise<boolean> }
 */
export function createAds(cfg = {}, hooks) {
  const plat = platform();
  const units = (cfg.units && cfg.units[plat]) || TEST_UNITS[plat] || {};
  const testing = cfg.testing !== false;
  const every = cfg.interstitialEvery || 4;
  const graceMs = cfg.graceMs ?? 120000;
  const startedAt = Date.now();
  let levels = 0;
  let initPromise = null;

  function init() {
    if (!isNative()) return Promise.resolve();
    if (initPromise) return initPromise;
    initPromise = (async () => {
      const { AdMob } = await loadPlugin('admob');
      await AdMob.initialize({ initializeForTesting: testing });
      try {
        if (plat === 'ios') {
          const st = await AdMob.trackingAuthorizationStatus();
          if (st && st.status === 'notDetermined') await AdMob.requestTrackingAuthorization();
        }
      } catch (e) { /* ATT yoksa devam */ }
      try {
        const info = await AdMob.requestConsentInfo();
        if (info && info.isConsentFormAvailable && info.status === 'REQUIRED') await AdMob.showConsentForm();
      } catch (e) { /* onay formu gerekmiyorsa devam */ }
    })().catch(() => {});
    return initPromise;
  }

  async function rewarded() {
    if (!isNative()) return hooks.simulate('rewarded');
    try {
      await init();
      const { AdMob } = await loadPlugin('admob');
      let earned = false;
      const handle = await AdMob.addListener('onRewardedVideoAdReward', () => { earned = true; });
      await AdMob.prepareRewardVideoAd({ adId: units.rewarded, isTesting: testing });
      const item = await AdMob.showRewardVideoAd();
      if (item && typeof item.amount !== 'undefined') earned = true;
      try { handle.remove(); } catch (e) { /* yok say */ }
      return earned;
    } catch (e) {
      return false;
    }
  }

  /** Her seviye geçişinde çağrılır; her `every` seviyede bir geçiş reklamı gösterir. */
  async function levelDone() {
    levels++;
    if (hooks.noAds()) return;
    if (levels % every !== 0) return;
    if (Date.now() - startedAt < graceMs) return;
    if (!isNative()) { hooks.simulate('interstitial'); return; }
    try {
      await init();
      const { AdMob } = await loadPlugin('admob');
      await AdMob.prepareInterstitial({ adId: units.interstitial, isTesting: testing });
      await AdMob.showInterstitial();
    } catch (e) { /* reklam yüklenemezse oyunu bekletme */ }
  }

  return { init, rewarded, levelDone };
}
