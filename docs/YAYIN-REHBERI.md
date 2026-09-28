# RST Games — Mağazalara Yayın Rehberi

Bu rehber, serideki oyunları App Store ve Google Play'e çıkarmak için gereken adımların genel haritasıdır. Kod tarafı hazır; adımların çoğu hesap açma ve panel ayarlarıdır.

> **Google Play için tıklama tıklama anlatım: [PLAY-STORE-YUKLEME.md](PLAY-STORE-YUKLEME.md).** Yayın kimlikleri (AdMob, RevenueCat, gizlilik adresi, sürüm) artık tek dosyada toplanır: kök klasördeki `yayin-ayarlari.json`. Doldurduktan sonra `node tools/apply-release.mjs` çalıştır.

## 0. Ne hazır, ne eksik?

| Hazır | Senin yapman gereken |
|---|---|
| Ortak altyapı (RST Kit): seviye akışı, altın, mağaza, günlük görev, seri, paylaşım, ayarlar, TR/EN dil | Apple ve Google geliştirici hesaplarını açmak |
| AdMob reklam kodu (ödüllü + geçiş), izin formları (ATT, GDPR) | AdMob'da uygulama ve reklam birimlerini oluşturup kimlikleri yazmak |
| RevenueCat satın alma kodu (Reklamsız Paket + geri yükleme) | RevenueCat'te ürünü tanımlamak |
| 2 oyun: Kelebek Sarkaç, Olay Ufku | Gizlilik politikasını doldurup yayınlamak |
| İkonlar, açılış ekranları, TR/EN ekran görüntüleri, mağaza metinleri | Panellere yüklemek, formları doldurmak |
| Android derleme hattı (GitHub Actions), iOS derleme hattı (Codemagic, Mac gerekmez) | İmza anahtarlarını oluşturup gizli değişkenlere eklemek |
| Yeni oyun şablonu: `npm run new-game` | Kalan 8 oyunun mekaniklerini yazmak (birlikte yapacağız) |

## 1. Hesaplar ve maliyetler

| Hesap | Ücret | Not |
|---|---|---|
| Apple Developer Program | Yıllık 99 USD | Bireysel ya da şirket olarak açılır. Şirket için D-U-N-S numarası gerekir. |
| Google Play Console | Tek seferlik 25 USD | **Yeni kişisel hesaplarda** üretime çıkmadan önce en az **12 test kullanıcısıyla 14 gün kesintisiz kapalı test** zorunlu. Kuruluş (şirket) hesaplarında bu şart yok. |
| Google AdMob | Ücretsiz | Ödeme için vergi ve banka bilgisi istenir. |
| RevenueCat | Başlangıçta ücretsiz | Belirli bir gelir eşiğine kadar ücretsiz. |
| GitHub | Ücretsiz | Kodun ve Android derleme hattı burada çalışır. |
| Codemagic | Aylık ücretsiz dakika kotası var | iOS derlemesi için bulut Mac'i sağlar. |

> İpucu: Kapalı test şartı yüzünden ilk oyunu Google Play'de **erken** kapalı teste sok. 14 günlük süre işlerken diğer oyunlar üzerinde çalışabilirsin. Test kullanıcıları için arkadaş/aile listesi hazırla (Gmail adresleri).

## 2. Bilgisayarında çalıştırma

Gerekenler: Node.js 22 veya üstü (Capacitor 8 şartı). Android için JDK 21 ve Android Studio (Otter veya yenisi), iOS için Xcode 26.

```bash
npm install                                   # bütün oyunların paketlerini kurar
npm run dev -w apps/kelebek-sarkac            # tarayıcıda canlı önizleme
npm run build -w apps/olay-ufku            # mağaza için web derlemesi
```

Capacitor paketleri `^8.0.0` sürümüne sabitlendi (Google Play'in istediği Android API 36 hedefi). İlk `npm install` sonrası oluşan `package-lock.json` dosyasını depoya ekle; sonraki derlemeler aynı sürümleri kullanır. Kök klasördeki `.npmrc` (`legacy-peer-deps=true`), eklentilerden biri Capacitor 8'i henüz resmi olarak listelemese bile kurulumun durmamasını sağlar.

Android Studio (Android) veya Xcode (yalnızca Mac, iOS) kuruluysa yerelde de deneyebilirsin:

```bash
cd apps/kelebek-sarkac
npx cap add android
node ../../tools/configure-native.mjs kelebek-sarkac android
npm run assets
npm run android        # Android Studio'yu açar, telefona kurup dene
```

## 3. AdMob kurulumu

1. [admob.google.com](https://admob.google.com) → **Uygulamalar > Uygulama ekle**. Her oyun için Android ve iOS ayrı ayrı eklenir (oyun başına 2 uygulama).
2. Her uygulamada iki reklam birimi oluştur: **Ödüllü (Rewarded)** ve **Geçiş (Interstitial)**.
3. Kimlikleri `yayin-ayarlari.json > oyunlar > <oyun> > admob` alanlarına yaz (`~` içeren uygulama kimliği, `/` içeren birim kimlikleri), sonra `node tools/apply-release.mjs`.
   Gerçek reklamlar yalnızca **ads = live** ile derlenen sürümde açılır (GitHub Actions'ta seçenek; yerelde `RST_LIVE_ADS=1 npm run build`). Diğer bütün derlemeler Google'ın test reklamlarını gösterir.
4. Geliştirici web sitene `app-ads.txt` dosyası koy (AdMob panelindeki satırı kopyala). Mağaza sayfasındaki "geliştirici web sitesi" alanı bu siteyi göstermeli.
5. **Uyarı:** Kendi gerçek reklamlarına asla tıklama (AdMob hesabın kapatılabilir). Deneme sürümlerini **ads = test** ile derle.

## 4. Uygulama içi satın almalar (RevenueCat)

Her oyun için aşağıdaki ürünleri **App Store Connect** (Uygulama İçi Satın Almalar + Abonelikler) ve **Play Console** (Uygulama içi ürünler + Abonelikler) içinde aynı kimliklerle oluştur. Fiyatlar öneridir; mağazanın fiyat basamaklarından en yakınını seç.

| Kimlik | Tür | İçerik | Önerilen fiyat |
|---|---|---|---|
| `coins_small` | Tüketilen | 1.000 altın | ₺29,99 / $0.99 |
| `coins_medium` | Tüketilen | 3.600 altın (+%20, "En popüler") | ₺89,99 / $2.99 |
| `coins_large` | Tüketilen | 11.200 altın (+%60, "En iyi değer") | ₺209,99 / $6.99 |
| `starter_pack` | Tüketilmeyen | 1.500 altın + her güçten 3 + özel görünüm (48 saat, bir kez) | ₺29,99 / $0.99 |
| `no_ads` | Tüketilmeyen → yetki `no_ads` | Reklamsız + özel görünüm + 1.000 altın | ₺49,99 / $1.99 |
| `golden_road_s1` | Tüketilmeyen → yetki `pass_s1` | Altın Yol (sezon kartı) premium şeridi | ₺99,99 / $3.99 |
| `vip_weekly` | Otomatik yenilenen abonelik → yetki `vip` | Reklamsız, günlük 100 altın, 2 kat altın, VIP görünümü | ₺59,99 / $1.99 |
| `vip_monthly` | Otomatik yenilenen abonelik → yetki `vip` | Aynı ayrıcalıklar | ₺149,99 / $4.99 |

İki VIP aboneliğini App Store Connect'te **aynı abonelik grubuna** koy. İstersen haftalık aboneliğe 3 günlük ücretsiz deneme ekle (dönüşümü genelde artırır).

**RevenueCat kurulumu:**

1. [RevenueCat](https://www.revenuecat.com) → proje oluştur → App Store ve Google Play uygulamalarını bağla, ürünleri içe aktar.
2. **Entitlements**: `no_ads`, `pass_s1`, `vip` oluştur ve tablodaki ürünleri bağla. Altın paketleri ve başlangıç paketi yetkiye bağlanmaz; oyun onları satın alma anında verir.
3. Uygulama anahtarlarını `yayin-ayarlari.json > oyunlar > <oyun> > revenuecat` alanına yaz (`goog_…`, `appl_…`), sonra `node tools/apply-release.mjs`. Anahtar yoksa oyun satın alma arayüzünü tamamen gizler ve yalnızca reklamla çalışır.
4. Test: iOS'ta Sandbox hesabı, Android'de lisans test kullanıcıları ile satın alma ve **geri yükleme** dene.

Tarayıcı önizlemesinde satın almalar "Test satın alması" penceresiyle simüle edilir; gerçek ödeme alınmaz.

## 4b. Gelir ve bağlılık tasarımı

Oyuncuyu her gün geri getiren ve harcamayı doğal hale getiren döngü:

| Sistem | Ne yapar | Gelire etkisi |
|---|---|---|
| **7 günlük hediye** | Her gün artan ödül, 7. gün özel görünüm | Günlük dönüş (D1/D7 tutunma) |
| **Günlük görevler** (3 adet + bonus) | "3 seviye geç", "bir güç kullan", "bir reklam izle" gibi | Güç kullanımını ve reklam izlemeyi alışkanlık yapar |
| **Günün seviyesi + seri** | Herkes aynı seviye, paylaşılabilir sonuç, seri uyarısı bildirimi | Viral büyüme, günlük dönüş |
| **Şans çarkı** | Günde 1 ücretsiz + 2 reklamlı çevirme, olasılıklar açıkça yazılı | Günlük ödüllü reklam izlenmesi |
| **Yıldız sandığı** | 15 yeni yıldızda altın + güç | 3 yıldız için tekrar oynatır |
| **Altın Yol** (30 kademe) | Oynadıkça ilerler; premium şerit bol ödül ve 2 özel görünüm | Sezon kartı satışı (casual oyunların en güçlü gelirlerinden) |
| **Güçler** | Seviye başında seçilir, altınla alınır | Altın tüketir → altın paketi satışı |
| **Bağlama uygun öneri** | 2. başarısızlıkta "Yavaş Çekim ile dene" düğmesi | Tam takıldığı anda teklif: en yüksek dönüşüm |
| **Seviye atlama** | 3. başarısızlıktan sonra reklamla | Oyuncuyu kaybetmeden reklam izletir |
| **Başlangıç paketi** | 3. seviyeden sonra bir kez, gerçek 48 saat | İlk ödeme: ödeyen oyuncu sonra tekrar öder |
| **VIP abonelik** | Reklamsız + günlük altın + 2 kat altın | Düzenli, öngörülebilir gelir |
| **Geçiş reklamı** | Her 4 seviyede bir, ilk 2 dakika yok, VIP/reklamsızda yok | Ödemeyen oyuncudan gelir |

**Bilerek koymadıklarımız** (mağaza reddi, yasal risk ve oyuncu kaybı riski yüzünden): parayla rastgele ödül (ücretli kutu), sıfırlanan sahte geri sayımlar, gizli abonelik koşulları, çocuklara yönelik hedefleme. Çark yalnızca ücretsiz ve reklamla çevrilir, olasılıkları oyunda yazar.

**İzlenecek sayılar** (AdMob + RevenueCat panelleri): D1 ve D7 tutunma, oyuncu başına günlük ödüllü reklam, ödeme yapan oyuncu oranı, ARPDAU (günlük aktif oyuncu başına gelir). Fiyatları ve reklam sıklığını bu sayılara bakarak ayarla.

## 5. Gizlilik politikası

`yayin-ayarlari.json > gelistirici` alanını (ad, e-posta) doldur ve `node tools/make-privacy.mjs` çalıştır: her oyun için `docs/gizlilik/<oyun>.html` üretilir. GitHub Pages'i `/docs` klasöründen aç; adres kalıbını `gizlilikAdresi` alanına yaz (`{oyun}` otomatik değişir). Aynı adresi mağazaların gizlilik politikası alanına da gir.

## 6. Android (Google Play)

Adım adım anlatım, form yanıtları ve hazır görseller: **[PLAY-STORE-YUKLEME.md](PLAY-STORE-YUKLEME.md)**, `play-store/` klasörü.

Kısaca: imza anahtarı (`bash tools/make-keystore.sh`) → GitHub gizli değişkenleri → Actions > **Android (Google Play)** → AAB'yi indir → Play Console'da uygulamayı oluştur, formları `play-store/UYGULAMA-ICERIGI.md` ile doldur → kapalı test (yeni kişisel hesaplarda 12 testçi, 14 gün) → üretim.

## 7. iOS (App Store) — Mac gerekmez

1. [App Store Connect](https://appstoreconnect.apple.com) → **Uygulamalar > +** → paket kimliği `capacitor.config.json > appId` ile aynı.
2. **Kullanıcılar ve Erişim > Entegrasyonlar > App Store Connect API** → "App Manager" rolünde bir anahtar oluştur (.p8 dosyasını indir).
3. [Codemagic](https://codemagic.io) → GitHub deposunu bağla → **Teams > Integrations > App Store Connect** → anahtarı `RST_ASC` adıyla ekle.
4. Codemagic → **Code signing identities** → "Fetch from App Store" ile sertifika ve profili otomatik oluştur.
5. Depodaki `codemagic.yaml` hazır. Codemagic'te **Start new build** → `kelebek-sarkac-ios` iş akışını seç. Derleme bitince TestFlight'a otomatik yüklenir.
6. App Store Connect formları:
   - **App Privacy:** Identifiers (Device ID) → Third-Party Advertising, "Used to track you: Yes"; Purchases → App Functionality; Usage Data (Advertising Data) → Third-Party Advertising.
   - **Abonelik incelemesi:** VIP abonelik ekranında fiyat, dönem, otomatik yenileme metni ve Kullanım Koşulları + Gizlilik bağlantıları hazır (Apple bunları zorunlu tutuyor). App Store açıklamasının sonuna da aynı iki bağlantıyı ekle.
   - **Yaş sınırı:** 4+ (reklamlar yaş sınırını yükseltmez, ama reklam içeriği uygun filtrelenmeli: AdMob > Engelleme kontrolleri > içerik derecelendirmesi G/PG).
   - **Ekran görüntüleri:** `store/screenshots/<dil>/ios-6.9-*.png` (1290×2796).
7. **Gönder**: İlk incelemede 1–3 gün beklenebilir.

## 8. Mağaza metinleri ve görseller

Her oyunda:

- `apps/<oyun>/store/listing.md` → ad, alt başlık, kısa/uzun açıklama, anahtar kelimeler (TR + EN)
- `apps/<oyun>/assets/` → ikon (1024×1024), Android uyarlanabilir ikon katmanları, açılış ekranları
- `apps/<oyun>/store/screenshots/` → TR ve EN, iPhone 6.9" ve Android telefon boyutlarında

İkonları yeniden üretmek: `python3 tools/make-icons.py`. Ekran görüntülerini yeniden üretmek: `tools/screenshots.cjs` dosyasının başındaki adımlar (yerelde yazı tipleri de yüklenir, görüntüler daha güzel çıkar).

## 9. Yeni oyun ekleme

```bash
npm run new-game -- kum-cigi "Kum Çığı" "Sand Avalanche" "#2B2140"
```

Bu komut çalışan bir şablon oyun oluşturur. `apps/kum-cigi/src/game.js` içindeki mekaniği değiştir, `config.js` içindeki metinleri ve görünümleri düzenle. Mağaza, günlük görev, reklam ve satın alma otomatik gelir. iOS için `codemagic.yaml` içindeki bir iş akışı bloğunu kopyalayıp `GAME` ve `bundle_identifier` değerlerini değiştir; `tools/make-icons.py` içine oyunun ikon çizimini ekle.

Web portallarında (itch.io, CrazyGames, Poki) ek gelir için: `node tools/web-export.mjs <oyun>` → `dist-web/<oyun>` klasörünü zip'leyip yükle. (Portalların kendi reklam SDK'sı ayrıca eklenir.)

## 10. Yayın öncesi kontrol listesi

- [ ] `yayin-ayarlari.json` dolduruldu, `node tools/apply-release.mjs` hatasız
- [ ] `node tools/playstore-check.mjs --release` hatasız
- [ ] Yayın derlemesi **ads = live** ile alındı; deneme derlemeleri **ads = test**
- [ ] Gizlilik sayfası açılıyor (`docs/gizlilik/<oyun>.html`)
- [ ] `node tools/test/run-all.mjs` → docs/TEST-RAPORU.md tamamen yeşil
- [ ] 8 ürün iki mağazada da aynı kimliklerle oluşturuldu, RevenueCat yetkileri bağlandı
- [ ] Test satın almaları (sandbox) ve geri yükleme çalıştı; VIP alınca reklamlar kayboluyor
- [ ] Bildirim izni ve akşam hatırlatmaları telefonda denendi
- [ ] Telefonda en az 20 seviye oynandı, günlük görev ve paylaşım denendi
- [ ] Uçak modunda oyun açılıyor ve oynanıyor
- [ ] `package-lock.json` depoda
- [ ] Android: imza anahtarı yedeklendi
- [ ] Mağaza formları (veri güvenliği, gizlilik, yaş, reklam beyanı) dolduruldu

## 11. Seri yol haritası

| # | Oyun | Durum |
|---|---|---|
| 1 | Kelebek Sarkaç | Hazır |
| 2 | Olay Ufku | Hazır |
| 3 | Tek Kanat (zincirleme reaksiyon) | Sırada |
| 4 | Kum Çığı | Planlandı |
| 5 | Dalga | Planlandı |
| 6 | Işık Prizması | Planlandı |
| 7 | Yaylı Kule | Planlandı |
| 8 | Mıknatıs | Planlandı |
| 9 | Balon | Planlandı |
| 10 | Domino Günlük | Planlandı |

Öneri: İlk iki oyunu mağazaya çıkar, ilk 2 haftanın verisine (günlük dönüş oranı, reklam izleme oranı) bak, en iyi tutan mekaniğin yönünde devam et.
