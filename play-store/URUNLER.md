# Uygulama içi ürünler (Play Console + RevenueCat)

Kimlikler kodda `packages/kit/src/economy.js > PRODUCTS` içinde tanımlı. **Kimlikleri birebir aynı yaz**; bir kez oluşturulan ürün kimliği Play'de değiştirilemez ve silinse bile yeniden kullanılamaz. İki oyunda da aynı kimlikler kullanılır (ürünler uygulamaya özeldir, çakışmaz).

> Satın alma **isteğe bağlıdır**. RevenueCat anahtarı girmezsen oyun yalnızca reklamla para kazanır ve satın alma arayüzü tamamen gizlenir. İlk sürümü reklamla çıkarıp ürünleri sonra eklemek de mümkündür.

## A. Tek seferlik ürünler (Play Console > Para kazanma > Ürünler > Uygulama içi ürünler)

| Ürün kimliği | Ad (TR) | Açıklama (TR) | TR fiyatı | ABD fiyatı | RevenueCat türü |
|---|---|---|---|---|---|
| `coins_small` | 1.000 Altın | Güç ve görünüm almak için 1.000 altın. | ₺29,99 | $0.99 | Consumable |
| `coins_medium` | 3.600 Altın | %20 bonuslu 3.600 altın. En popüler paket. | ₺89,99 | $2.99 | Consumable |
| `coins_large` | 11.200 Altın | %60 bonuslu 11.200 altın. En iyi değer. | ₺209,99 | $6.99 | Consumable |
| `starter_pack` | Başlangıç Paketi | 1.500 altın, her güçten 3 tane ve özel görünüm. Yalnızca bir kez alınabilir. | ₺29,99 | $0.99 | Non-consumable |
| `no_ads` | Reklamsız Paket | Geçiş reklamlarını kalıcı olarak kaldırır ve 1.000 altın verir. | ₺49,99 | $1.99 | Non-consumable → yetki `no_ads` |
| `golden_road_s1` | Altın Yol · 1. Sezon | Altın Yol'daki 30 kademenin premium ödüllerini açar. | ₺99,99 | $3.99 | Non-consumable → yetki `pass_s1` |

İngilizce adlar: 1,000 Coins · 3,600 Coins · 11,200 Coins · Starter Pack · No-Ads Pack · Golden Road Season 1.

## B. Abonelikler (Play Console > Para kazanma > Ürünler > Abonelikler)

| Abonelik kimliği | Ad | Temel plan kimliği | Dönem | Yenileme | TR fiyatı | ABD fiyatı | Yetki |
|---|---|---|---|---|---|---|---|
| `vip_weekly` | VIP Kulüp (Haftalık) | `weekly` | 1 hafta | Otomatik yenilenen | ₺59,99 | $1.99 | `vip` |
| `vip_monthly` | VIP Kulüp (Aylık) | `monthly` | 1 ay | Otomatik yenilenen | ₺149,99 | $4.99 | `vip` |

Avantajlar (açıklamaya yaz): reklam yok, her gün 100 altın hediye, seviyelerden 2 kat altın, özel VIP görünümü.
Ek süre (grace period) için Play varsayılanını bırak. İlk sürümde deneme süresi veya teklif ekleme.

## C. RevenueCat ayarı (bir kez)

1. [app.revenuecat.com](https://app.revenuecat.com) > yeni proje > **Google Play** uygulaması ekle (paket adı: `com.rstgames.olayufku` veya `com.rstgames.kelebeksarkac`).
2. Play Console'da hizmet hesabı oluşturup RevenueCat'e bağla (RevenueCat ekranındaki "Service Account credentials" adımları).
3. **Products:** yukarıdaki 8 ürünü içe aktar (Import).
4. **Entitlements:** `no_ads`, `vip`, `pass_s1` oluştur; `no_ads` ← no_ads, `vip` ← vip_weekly + vip_monthly, `pass_s1` ← golden_road_s1.
5. **API keys** > Google Play genel anahtarı (`goog_…`) → `yayin-ayarlari.json > oyunlar > <oyun> > revenuecat > android`.
6. `node tools/apply-release.mjs` çalıştır, yeni sürüm derle.

## D. Test

Play Console > **Ayarlar > Lisans testi** bölümüne kendi Gmail adresini ekle. Dahili test kanalından yüklediğin sürümde satın almalar "Test kartı, her zaman onaylanır" ile ücretsiz denenir.
