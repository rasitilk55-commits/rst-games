# Google Play'e Yükleme Rehberi (adım adım)

Bu rehber **Olay Ufku** ve **Kelebek Sarkaç** oyunlarını sıfırdan Google Play'de yayına almayı anlatır. Bilgisayarına Android Studio kurman gerekmez: uygulama dosyası (AAB) GitHub'ın bulut makinesinde üretilir. Sen yalnızca panellerde tıklayıp formları dolduracaksın; bütün metinler, görseller ve form yanıtları hazır.

**Hazır dosyalar**

| Ne | Nerede |
|---|---|
| Mağaza metinleri (TR + EN, kopyala-yapıştır) | `play-store/<oyun>/MAGAZA-METINLERI.md` |
| Simge 512, öne çıkan görsel 1024x500, telefon ve tablet ekran görüntüleri | `play-store/<oyun>/graphics/` |
| Uygulama içeriği formlarının yanıtları (veri güvenliği, yaş, reklam…) | `play-store/UYGULAMA-ICERIGI.md` |
| Uygulama içi ürünler ve abonelikler | `play-store/URUNLER.md` |
| Sürüm notları | `play-store/<oyun>/whatsnew/` |
| Gizlilik politikası sayfaları | `docs/gizlilik/<oyun>.html` |
| Tek ayar dosyası (kimlikler, sürüm, gizlilik adresi) | `yayin-ayarlari.json` |
| Yükleme anahtarı (sana ayrıca verildi) | `imza-anahtari/` (**GitHub'a yükleme**) |
| Test raporu | `docs/TEST-RAPORU.md` |

**Toplam süre:** Kurulum 2–3 saat. Yeni kişisel geliştirici hesabıysan buna **14 günlük kapalı test** eklenir (aşağıda Adım 9). Google'ın incelemesi genelde birkaç gün sürer.

---

## Adım 1 · Hesapları aç

1. **Google Play Console:** [play.google.com/console](https://play.google.com/console) → Kaydol → **Kişisel** (bireysel) veya **Kuruluş** (şirket) hesabı. Tek seferlik **25 USD**. Kimlik doğrulaması istenir (kimlik fotoğrafı, telefon, adres); onay birkaç gün sürebilir.
   - Kişisel hesaplarda geliştirici adı olarak mağazada görünecek adı seç (örn. "RST Games").
   - 13 Kasım 2023'ten sonra açılan **kişisel** hesaplarda üretime çıkmadan önce **en az 12 testçiyle 14 gün kesintisiz kapalı test** zorunlu. Şirket hesabında bu şart yok.
2. **Google AdMob:** [admob.google.com](https://admob.google.com) → aynı Google hesabıyla kaydol (ücretsiz). Ödeme bilgilerini sonra da girebilirsin.
3. **GitHub:** [github.com](https://github.com) → ücretsiz hesap.
4. *(İsteğe bağlı)* **RevenueCat:** yalnızca uygulama içi satın alma istiyorsan. İlk sürümü satın almasız, sadece reklamla çıkarmak daha hızlıdır; ürünler sonraki sürümde eklenebilir (Adım 11).

## Adım 2 · Projeyi GitHub'a yükle

1. GitHub → sağ üst **+** → **New repository** → ad: `rst-games` → **Private** (gizli) → Create.
2. Proje parçalar hâlinde geldi (dosya boyutu sınırı yüzünden): `rst-games-1-kod.zip` … `rst-games-5-ios-ekran-goruntuleri.zip`. **Hepsini aynı klasöre aç**; hepsi tek bir `rst-games` klasöründe birleşir. (1 numara şart; 2-4 Play görselleri; 5 yalnızca App Store için.)
3. En kolay yol **GitHub Desktop** ([desktop.github.com](https://desktop.github.com)): File → Add local repository → açtığın `rst-games` klasörü → "create a repository" → Publish. (Ya da GitHub web sayfasında **uploading an existing file** bağlantısıyla klasörleri sürükle-bırak.)
4. `imza-anahtari` klasörünü **yükleme**. (`.gitignore` bunu zaten engeller; web'den yüklüyorsan kendin dışarıda bırak.)

> Depo gizli olsa bile GitHub Pages ücretsiz planda **herkese açık depo** ister. Gizlilik sayfaları için iki yol var: depoyu herkese açık yap (kodda gizli bilgi yok; anahtarlar GitHub Secrets'ta durur) **veya** yalnızca `docs/gizlilik` klasörünü ayrı, herkese açık küçük bir depoda yayınla (Adım 4.3).

## Adım 3 · Yükleme anahtarını GitHub'a ekle

Google Play her sürümün aynı anahtarla imzalanmasını ister. Anahtar senin için üretildi: `imza-anahtari/`.

1. `imza-anahtari/BILGILER.txt` dosyasını aç.
2. GitHub deposu → **Settings → Secrets and variables → Actions → New repository secret**. Dört gizli değişken ekle:

| Name | Secret (değer) |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `upload.keystore.base64.txt` dosyasının **tamamı** (tek uzun satır) |
| `ANDROID_KEYSTORE_PASSWORD` | BILGILER.txt'deki şifre |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | BILGILER.txt'deki şifre (aynı) |

3. `imza-anahtari` klasörünü bir **şifre yöneticisine** veya harici diske yedekle. Kaybedersen Play Console'dan yeni yükleme anahtarı isteyebilirsin (Play Uygulama İmzalama sayesinde oyun kaybolmaz), ama bu birkaç gün sürer.

Kendi anahtarını üretmek istersen (Java gerekir): `bash tools/make-keystore.sh`

## Adım 4 · Yayın ayarlarını doldur (tek dosya)

`yayin-ayarlari.json` dosyasını GitHub'da aç (kalem simgesi) veya bilgisayarında düzenle.

### 4.1 Geliştirici bilgisi
```json
"gelistirici": { "ad": "RST Games", "eposta": "senin@adresin.com", "web": "" },
```
E-posta mağaza sayfasında ve gizlilik politikasında görünür; oyuncular buraya yazar.

### 4.2 AdMob kimlikleri (her oyun için)
1. AdMob → **Uygulamalar → Uygulama ekle** → Platform: **Android** → "Uygulama desteklenen bir mağazada listeleniyor mu?" → **Hayır** → Uygulama adı: `Olay Ufku` → Ekle.
2. Çıkan **Uygulama kimliği** (`ca-app-pub-1234567890123456~1234567890`, içinde `~` var) → `androidUygulamaKimligi`.
3. **Reklam birimleri → Reklam birimi ekle**:
   - **Ödüllü** (Rewarded) → ad: `odullu` → kimlik (`…/…`, içinde `/` var) → `androidOdulluReklam`
   - **Geçiş** (Interstitial) → ad: `gecis` → kimlik → `androidGecisReklami`
4. Aynısını **Kelebek Sarkaç** için tekrarla.
5. AdMob → **Gizlilik ve mesajlaşma → GDPR** → mesaj oluştur, iki uygulamayı seç, yayınla. (Avrupa'daki oyunculara onay formu bunun sayesinde çıkar; kod hazır.)
6. Oyunlar Play'de yayına girince AdMob'da uygulamayı mağaza sayfasına **bağla** (Uygulama ayarları → Mağaza bilgisi ekle).

> Boş bıraktığın kimlikler otomatik olarak Google'ın **test** kimliklerine düşer; oyun çalışır ama gelir gelmez.

### 4.3 Gizlilik politikası adresi
1. GitHub deposu → **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main`, Folder: **/docs** → Save.
2. Birkaç dakika sonra adres çıkar: `https://KULLANICIADIN.github.io/rst-games/`
3. `yayin-ayarlari.json` içinde:
   ```json
   "gizlilikAdresi": "https://KULLANICIADIN.github.io/rst-games/gizlilik/{oyun}.html",
   ```
   `{oyun}` otomatik olarak `olay-ufku` / `kelebek-sarkac` olur.
4. E-postayı yazdıktan sonra sayfaları yeniden üret: `node tools/make-privacy.mjs` (bilgisayarında Node.js varsa). Node yoksa `docs/gizlilik/*.html` içindeki `[E-POSTA ADRESİ]` yazısını GitHub'da elle değiştir.
5. Tarayıcıda `…/gizlilik/olay-ufku.html` adresini aç, sayfanın göründüğünü kontrol et.

### 4.4 Sürüm
`"surum": "1.0.0"` ilk yayın için doğru. Her güncellemede artır (1.0.1, 1.1.0…). Derleme numarasını (versionCode) GitHub her çalıştırmada kendisi artırır.

Değişiklikleri kaydet (commit). Derleme hattı `tools/apply-release.mjs` ile bu ayarları oyunlara kendisi uygular.

## Adım 5 · Uygulama dosyasını (AAB) üret

1. GitHub deposu → **Actions** sekmesi → (ilk seferde "I understand my workflows, enable them") → soldan **Android (Google Play)** → sağda **Run workflow**.
2. Seçenekler:

| Alan | İlk deneme | Kapalı test | Yayın (üretim) |
|---|---|---|---|
| Oyun | olay-ufku | olay-ufku | olay-ufku |
| Reklamlar | **test** | **test** | **live** |
| Play kanalı | none | none | none |

   > Kendi gerçek reklamlarına tıklamak AdMob hesabının kapatılmasına yol açabilir. Bu yüzden deneme ve test sürümleri **test** reklamıyla derlenir; **live** yalnızca herkese açık sürüm için.
3. Yeşil tik çıkınca (8–15 dk) çalıştırmaya tıkla → en altta **Artifacts** → zip'i indir. İçinde:
   - `olay-ufku-1.0.0-N-test.aab` → **Play Console'a yüklenecek dosya**
   - `olay-ufku-1.0.0-N-test.apk` → telefona doğrudan kurup denemek için (telefonda "bilinmeyen kaynaklardan yüklemeye izin ver")
4. Kırmızı çarpı çıkarsa: çalıştırmaya tıkla, kırmızı adımı aç. En sık nedenler en altta (**Sorun giderme**).

Derleme hattı önce bütün testleri çalıştırır (birim testleri, seviye doğrulama, mağaza kontrolü). **live** seçilince yayın kontrolü de yapılır: gizlilik adresi, e-posta ve gerçek AdMob kimlikleri eksikse derleme durur ve neyin eksik olduğunu yazar.

## Adım 6 · Play Console'da uygulamayı oluştur

Play Console → **Uygulama oluştur**:

| Alan | Olay Ufku | Kelebek Sarkaç |
|---|---|---|
| Uygulama adı | Olay Ufku: Kara Delik | Kelebek Sarkaç |
| Varsayılan dil | Türkçe – tr-TR | Türkçe – tr-TR |
| Uygulama mı, oyun mu? | **Oyun** | **Oyun** |
| Ücretsiz mi, ücretli mi? | **Ücretsiz** | **Ücretsiz** |
| Beyanlar | Geliştirici Program Politikaları ✔, ABD ihracat yasaları ✔ | aynı |

Paket adı ilk AAB yüklendiğinde otomatik belirlenir: `com.rstgames.olayufku` ve `com.rstgames.kelebeksarkac`. **Paket adı sonradan asla değiştirilemez.** Kendi alan adını kullanmak istersen (örn. `com.seninadin.olayufku`) ilk yüklemeden **önce** `apps/<oyun>/capacitor.config.json > appId` ve `play-store/<oyun>/listing.json > packageName` alanlarını değiştir.

## Adım 7 · "Uygulamanızı ayarlayın" görevleri

Kontrol panelinde (Dashboard) bir görev listesi çıkar. Hepsini `play-store/UYGULAMA-ICERIGI.md` dosyasındaki yanıtlarla doldur:

1. **Gizlilik politikası** → Adım 4.3'teki adres
2. **Uygulama erişimi** → Tüm işlevler özel erişim olmadan kullanılabilir
3. **Reklamlar** → Evet, reklam içeriyor
4. **İçerik derecelendirmesi** → IARC anketi (tablo hazır) → sonuç PEGI 3 / Herkes
5. **Hedef kitle** → 13-15, 16-17, 18+ (13 altını seçme)
6. **Haber uygulaması** → Hayır
7. **Veri güvenliği** → tablo hazır (AdMob ve RevenueCat verileri)
8. **Devlet uygulaması / Finansal özellikler / Sağlık** → Hayır / yok
9. **Reklam kimliği** → Evet; reklam, analiz, dolandırıcılığı önleme
10. **Uygulama kategorisi ve iletişim bilgileri** (Mağaza ayarları) → Oyun › Bulmaca (Olay Ufku) / Gündelik (Kelebek Sarkaç), e-posta

### Ana mağaza girişi (Mağazada varlık → Ana mağaza girişi)
`play-store/<oyun>/MAGAZA-METINLERI.md` dosyasını aç, alanlara kopyala:

| Alan | Kaynak |
|---|---|
| Uygulama adı, kısa açıklama, tam açıklama | MAGAZA-METINLERI.md → Türkçe |
| Uygulama simgesi | `graphics/icon-512.png` |
| Öne çıkan görsel | `graphics/feature-graphic-tr-TR.png` |
| Telefon ekran görüntüleri | `graphics/phone/tr-TR/01.png … 06.png` (sırayla) |
| 7 inç tablet | `graphics/tablet-7/tr-TR/` |
| 10 inç tablet | `graphics/tablet-10/tr-TR/` |
| Video | boş bırakılabilir |

**İngilizce çeviri:** Aynı sayfada **Çevirileri yönet → Çeviri ekle → İngilizce (ABD) – en-US** → MAGAZA-METINLERI.md → İngilizce bölümü ve `…/en-US/` görselleri.

## Adım 8 · İlk yükleme: dahili test

1. **Test et ve yayınla → Test → Dahili test → Testçiler** sekmesi → e-posta listesi oluştur → kendi Gmail adresini ekle → Kaydet.
2. **Sürümler → Yeni sürüm oluştur**.
3. **Uygulama imzalama:** "Google tarafından oluşturulan anahtarı kullan" (varsayılan) → Devam. *Bu, Play Uygulama İmzalama'dır; asıl anahtarı Google güvenle saklar, sen yükleme anahtarıyla (imza-anahtari) imzalarsın.*
4. **App Bundle'lar** → Adım 5'teki `.aab` dosyasını sürükle.
5. Sürüm adı otomatik gelir (`N (1.0.0)`). **Sürüm notları** kutusuna `play-store/<oyun>/whatsnew/` dosyalarındaki metni `<tr-TR>…</tr-TR>` ve `<en-US>…</en-US>` biçiminde yapıştır (kutudaki şablonu takip et).
6. **Sonraki → Kaydet → Yayına başla**.
7. **Testçiler** sekmesindeki **"Web'de katıl"** bağlantısını telefonunda aç → Testçi ol → Play Store'dan indir.

Telefonda kontrol et: açılış, ses, titreşim, ilk 5 seviye, günlük ödül, mağaza, bildirim izni sorusu, uygulamayı arka plana alıp geri dönme, uçak modunda oynama, geri tuşu (pencereleri kapatır, ana ekranda uygulamayı küçültür).

## Adım 9 · Kapalı test (yeni kişisel hesaplarda zorunlu)

1. **Test → Kapalı test → Parça oluştur** (veya hazır "Alfa" parçası) → **Ülkeler/bölgeler**: Türkiye (+ istediğin ülkeler).
2. **Testçiler** → e-posta listesi veya Google Grubu → **en az 12 kişi** (öneri: 15-20; bazıları vazgeçebilir). Herkesin Gmail adresi gerekir.
3. **Yeni sürüm** → Dahili testteki sürümü "Kitaplıktan ekle" ile seç veya yeni AAB yükle → Yayına başla.
4. Katılım bağlantısını testçilere gönder. Her testçi bağlantıdan **"Testçi ol"** demeli ve uygulamayı indirmeli.
5. **14 gün kesintisiz** bekle. Testçilerden en az birkaç gün oynamalarını ve geri bildirim yazmalarını iste (Google bunu soruyor). Testçi ayrılıp tekrar katılırsa onun süresi sıfırlanır.
6. 14 gün dolunca **Kontrol paneli → Üretime erişim başvurusu**. Örnek yanıtlar:
   - *Testçileri nasıl buldunuz?* "Arkadaş ve aile çevremden 15 kişi, katılım bağlantısıyla."
   - *Geri bildirim ve değişiklikler:* testçilerin söylediklerini ve yaptığın düzeltmeleri 2-3 cümleyle yaz (örn. "İlk seviyeler zor bulundu, öğretici el ve ipucu eklendi").
   - *Hedef kitle ve değer:* "13 yaş üstü gündelik oyuncular; tek parmakla oynanan fizik bulmacası, günlük seviye."
   - *İlk yıl beklenen indirme:* dürüst bir tahmin (örn. 10.000'den az).
7. Google genelde **7 gün içinde** e-postayla yanıt verir.

Kuruluş (şirket) hesabıysan bu adımı atlayıp doğrudan Adım 10'a geçebilirsin.

## Adım 10 · Üretim (herkese açık yayın)

1. Adım 5'i **Reklamlar: live** ile tekrar çalıştır (yayın kontrolü de geçmeli). Yeni `…-live.aab` dosyasını indir.
2. **Test et ve yayınla → Üretim → Ülkeler/bölgeler** → istediğin ülkeleri ekle (hepsi seçilebilir).
3. **Yeni sürüm oluştur** → `…-live.aab` → sürüm notları → **Kaydet → Sürümü incele**.
4. Uyarı varsa oku (çoğu bilgilendirmedir). **Kademeli dağıtım** öner: önce %20, sorun yoksa birkaç gün sonra %100.
5. **Yayına başla** → Google incelemesi (genelde 1-3 gün, ilk uygulamada daha uzun olabilir). Durumu **Yayınlama genel bakışı** sayfasında izle.
6. Yayına girince: AdMob'da uygulamayı mağaza sayfasına bağla (Adım 4.2-6).

## Adım 11 · Uygulama içi satın alma (isteğe bağlı)

Play, ürün oluşturabilmen için önce faturalandırma izni içeren bir AAB'nin yüklenmiş olmasını ister; oyunların AAB'si bu izni içerir (RevenueCat eklentisi).

1. Play Console → **Ödeme profili** oluştur (banka ve vergi bilgileri).
2. `play-store/URUNLER.md` → 6 tek seferlik ürün + 2 abonelik oluştur (kimlikler birebir aynı).
3. RevenueCat kurulumu (aynı dosyada C bölümü) → `goog_…` anahtarı → `yayin-ayarlari.json > revenuecat > android`.
4. Sürümü artır (`1.0.1`), yeni AAB üret, yükle. Anahtar girilene kadar oyun satın alma düğmelerini hiç göstermez; girildikten sonra mağaza sekmeleri, başlangıç paketi, VIP ve Altın Yol görünür.
5. **Ayarlar → Lisans testi** bölümüne kendi Gmail'ini ekle; satın almaları gerçek para ödemeden dene. "Satın alımları geri yükle" düğmesini de dene.

## Adım 12 · Güncelleme yayınlama

1. `yayin-ayarlari.json` → `surum` değerini artır (örn. `1.0.1`), `play-store/<oyun>/whatsnew/` metinlerini güncelle, kaydet.
2. Actions → Run workflow (Reklamlar: **live**) → AAB'yi indir → Üretim → Yeni sürüm → yükle → yayına başla.
3. **Otomatik yükleme** (isteğe bağlı): Play Console'da hizmet hesabı oluşturup JSON anahtarını GitHub'a `PLAY_SERVICE_ACCOUNT_JSON` gizli değişkeni olarak eklersen, Run workflow'da **Play kanalı** seçip AAB'yi doğrudan gönderebilirsin (uygulama ilk kez yayına girdikten sonra **Durum: completed** seç).

## Adım 13 · app-ads.txt (reklam gelirini korur)

AdMob, reklam dolandırıcılığına karşı geliştirici web sitende `app-ads.txt` dosyası ister; yoksa gelir düşebilir.
1. GitHub'da **KULLANICIADIN.github.io** adlı herkese açık bir depo oluştur, içine `app-ads.txt` dosyası koy. İçeriği: AdMob → **Uygulamalar → Tüm uygulamaları görüntüle → app-ads.txt** satırı (`google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`).
2. `yayin-ayarlari.json > gelistirici > web` ve Play Console → Mağaza ayarları → **Web sitesi** alanına `https://KULLANICIADIN.github.io` yaz.
3. AdMob birkaç gün içinde dosyayı doğrular.

---

## Sorun giderme

| Hata | Neden ve çözüm |
|---|---|
| Actions: "ANDROID_KEYSTORE_BASE64 gizli değişkeni yok" | Adım 3'teki dört gizli değişkeni ekle (adları birebir aynı). |
| Actions: `Keystore was tampered with, or password was incorrect` | Şifre yanlış kopyalandı veya base64 metni eksik. BILGILER.txt'den tekrar kopyala; base64 tek satır ve eksiksiz olmalı. |
| Actions: testlerde "HATA … gizlilik politikası adresi" (live) | `gizlilikAdresi` hâlâ `GITHUB-KULLANICI-ADIN` içeriyor ya da e-posta boş. |
| Actions: "AdMob … kimliği biçimi hatalı" | Uygulama kimliğinde `~`, reklam biriminde `/` olmalı; başında/sonunda boşluk olmamalı. |
| Play: "Sürüm kodu 1 zaten kullanıldı" | Aynı derlemeyi iki kez yükledin. Actions'ı yeniden çalıştır (numara artar). |
| Play: "APK veya App Bundle hata ayıklama modunda imzalandı" | İmza gizli değişkenleri boş. Adım 3. |
| Play: "Yükleme anahtarı yanlış" | Farklı bir anahtarla imzaladın. İlk yüklemede kullandığın `imza-anahtari` ile devam et; kaybettiysen Uygulama bütünlüğü → Yükleme anahtarını sıfırla. |
| Play: hedef API seviyesi uyarısı | Proje Capacitor 8 ile API 36'yı hedefler; `configure-native` API 36 altını kabul etmez. `package.json` içindeki Capacitor sürümlerini düşürme. |
| Play: "Reklam kimliği beyanı eksik" | Uygulama içeriği → Reklam kimliği → Evet. |
| Play: gizlilik politikası reddi | Sayfa açılmıyor, uygulama adı veya iletişim bilgisi yok. Adresi tarayıcıda kontrol et; `make-privacy.mjs`'i e-posta girildikten sonra çalıştır. |
| Play: meta veri politikası | Başlık/açıklamaya "en iyi", "ücretsiz", "#1", emoji ekleme. `node tools/playstore-check.mjs` bunları yakalar. |
| Telefonda reklam görünmüyor | Yeni AdMob hesaplarında gerçek reklamların gelmesi birkaç gün sürebilir; test derlemesinde test reklamları hemen görünür. |

## Kendi bilgisayarında derlemek (isteğe bağlı)

Node.js 22, JDK 21 ve Android Studio (Otter 2025.2.1 veya yenisi) gerekir.

```bash
npm install
node tools/apply-release.mjs
node tools/test/run-all.mjs --quick
cd apps/olay-ufku
npm run build
npx cap add android
node ../../tools/configure-native.mjs olay-ufku android
npx @capacitor/assets generate --android --iconBackgroundColor '#05060F' --splashBackgroundColor '#05060F'
npx cap sync android
cd android
RST_KEYSTORE=../../../imza-anahtari/upload.keystore RST_KEYSTORE_PASSWORD=… RST_KEY_ALIAS=upload RST_KEY_PASSWORD=… RST_VERSION_CODE=1 ./gradlew bundleRelease
# çıktı: app/build/outputs/bundle/release/app-release.aab
```
Gerçek reklamla derlemek için `npm run build` yerine `RST_LIVE_ADS=1 npm run build`.

## Son kontrol listesi

- [ ] `docs/TEST-RAPORU.md` tamamen yeşil (`node tools/test/run-all.mjs`)
- [ ] `node tools/playstore-check.mjs --release` hatasız
- [ ] Gizlilik sayfası tarayıcıda açılıyor, e-posta doğru
- [ ] AdMob GDPR mesajı yayınlandı
- [ ] Uygulama içeriği bölümündeki bütün görevler yeşil
- [ ] Mağaza girişi TR + EN, görseller yüklendi
- [ ] Dahili testte telefonda denendi (ses, titreşim, geri tuşu, uçak modu)
- [ ] Kapalı test 12+ testçi, 14 gün (kişisel hesap)
- [ ] Üretim AAB'si **live** reklamla derlendi
- [ ] `imza-anahtari` yedeklendi, GitHub'da değil
