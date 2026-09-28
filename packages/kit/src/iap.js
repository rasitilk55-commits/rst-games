// Uygulama içi satın alma: RevenueCat (App Store + Google Play tek API).
// Ürünler economy.js > PRODUCTS içinde. Yetkiler (entitlement): no_ads, vip, pass_s1.
// Tüketilen ürünler (altın paketleri) ve tek seferlik başlangıç paketi satın alma anında verilir.
import { isNative, platform, loadPlugin } from './native.js';

/**
 * cfg: { revenuecat?: {ios, android} }
 * hooks: {
 *   products: { key: {id, kind, entitlement?, period?} },
 *   onEntitlements(activeIds: string[]),   // yetkiler değişti
 *   grant(key),                            // tüketilen / tek seferlik ürünü ver
 *   ownedOnce(key) -> boolean,             // tek seferlik ürün zaten verildi mi
 *   simulate(key) -> Promise<boolean>,     // tarayıcı önizlemesi
 * }
 */
export function createIap(cfg = {}, hooks) {
  const key = cfg.revenuecat && cfg.revenuecat[platform()];
  const enabled = () => isNative() && !!key;
  const P = hooks.products;
  let ready = null;
  let priceCache = null;

  function applyInfo(info) {
    if (!info) return;
    const active = Object.keys((info.entitlements && info.entitlements.active) || {});
    hooks.onEntitlements(active);
    const bought = new Set((info.nonSubscriptionTransactions || []).map((t) => t.productIdentifier));
    for (const [k, p] of Object.entries(P)) {
      if (p.kind === 'once' && bought.has(p.id) && !hooks.ownedOnce(k)) hooks.grant(k);
    }
  }

  function init() {
    if (!enabled()) return Promise.resolve();
    if (ready) return ready;
    ready = (async () => {
      const { Purchases } = await loadPlugin('purchases');
      await Purchases.configure({ apiKey: key });
      const { customerInfo } = await Purchases.getCustomerInfo();
      applyInfo(customerInfo);
    })().catch(() => {});
    return ready;
  }

  async function fetchProducts(ids, sub) {
    const { Purchases } = await loadPlugin('purchases');
    const res = await Purchases.getProducts({ productIdentifiers: ids, type: sub ? 'SUBSCRIPTION' : 'NON_SUBSCRIPTION' });
    return (res && res.products) || [];
  }

  /** Mağazadaki yerel fiyatlar: { key: '₺29,99' } */
  async function prices() {
    if (!enabled()) return {};
    if (priceCache) return priceCache;
    try {
      await init();
      const entries = Object.entries(P);
      const subs = entries.filter(([, p]) => p.kind === 'sub').map(([, p]) => p.id);
      const other = entries.filter(([, p]) => p.kind !== 'sub').map(([, p]) => p.id);
      const all = [...(await fetchProducts(other, false)), ...(await fetchProducts(subs, true))];
      priceCache = {};
      for (const [k, p] of entries) {
        const found = all.find((x) => x.identifier === p.id || (x.identifier || '').startsWith(p.id + ':'));
        if (found) priceCache[k] = found.priceString;
      }
      return priceCache;
    } catch (e) {
      return {};
    }
  }

  async function buy(k) {
    const p = P[k];
    if (!p) return false;
    if (!enabled()) {
      const ok = await hooks.simulate(k);
      if (!ok) return false;
      if (p.entitlement) hooks.onEntitlements([p.entitlement], true);
      else hooks.grant(k);
      return true;
    }
    try {
      await init();
      const { Purchases } = await loadPlugin('purchases');
      const [product] = await fetchProducts([p.id], p.kind === 'sub');
      if (!product) return false;
      const { customerInfo } = await Purchases.purchaseStoreProduct({ product });
      if (p.kind === 'consumable' || p.kind === 'once') hooks.grant(k);
      applyInfo(customerInfo);
      return true;
    } catch (e) {
      return false; // kullanıcı iptal etti veya mağaza hatası
    }
  }

  async function restore() {
    if (!enabled()) { await hooks.simulate('restore'); return false; }
    try {
      await init();
      const { Purchases } = await loadPlugin('purchases');
      const { customerInfo } = await Purchases.restorePurchases();
      applyInfo(customerInfo);
      return true;
    } catch (e) {
      return false;
    }
  }

  /** Satın alma kullanılabilir mi? Tarayıcıda simülasyon var; uygulamada RevenueCat anahtarı yoksa satın alma arayüzü gizlenir. */
  const available = () => !isNative() || !!key;

  return { init, prices, buy, restore, available };
}
