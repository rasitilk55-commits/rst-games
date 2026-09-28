// Uygulama App Store / Google Play içinde mi (Capacitor), yoksa tarayıcıda mı çalışıyor?
// Eklentiler yalnızca yerel uygulamada ve ilk ihtiyaç anında yüklenir; tarayıcıda hiç yüklenmez.

export function isNative() {
  try {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  } catch (e) {
    return false;
  }
}

export function platform() {
  try {
    return (window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform()) || 'web';
  } catch (e) {
    return 'web';
  }
}

const cache = {};
export function loadPlugin(name) {
  if (!cache[name]) {
    cache[name] = (() => {
      switch (name) {
        case 'admob': return import('@capacitor-community/admob');
        case 'haptics': return import('@capacitor/haptics');
        case 'preferences': return import('@capacitor/preferences');
        case 'share': return import('@capacitor/share');
        case 'purchases': return import('@revenuecat/purchases-capacitor');
        case 'app': return import('@capacitor/app');
        case 'notifications': return import('@capacitor/local-notifications');
        default: return Promise.reject(new Error('Bilinmeyen eklenti: ' + name));
      }
    })();
  }
  return cache[name];
}
