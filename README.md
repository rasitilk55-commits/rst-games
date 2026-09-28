# RST Games

Tek dokunuşluk fizik oyunlarından oluşan mobil oyun serisi. Her oyun aynı altyapıyı (RST Kit) kullanır ve tek kod tabanından **iOS, Android ve web** için derlenir (Capacitor).

## Klasörler

```
packages/kit/         Ortak altyapı: seviye akışı, altın, mağaza, günlük görev, reklam (AdMob),
                      satın alma (RevenueCat), titreşim, paylaşım, ayarlar, TR/EN
apps/kelebek-sarkac/  Oyun 1: kaotik sarkaçtan kelebeği doğru anda bırak
apps/olay-ufku/       Oyun 2: kuyruklu yıldızı kara deliklerin kütleçekimiyle bükerek portala ulaştır
                      (WebGL: gerçek zamanlı kütleçekimsel mercekleme, yığılma diski)
tools/                new-game (yeni oyun), configure-native (iOS/Android ayarı),
                      web-export (derlemesiz web çıktısı), make-icons, screenshots
tools/olay-ufku/      Seviye üretici (gen.mjs), çözücü, bağımsız doğrulayıcı (verify.mjs),
                      tarayıcıda gerçek dokunuşla oynatma testi (play-test.cjs)
tools/test/           Test paketi: birim, Kelebek seviye çözülebilirliği, tarayıcı uçtan uca, hepsini çalıştıran run-all
tools/playstore-*     Google Play görselleri (playstore-assets.cjs) ve yükleme öncesi kontrol (playstore-check.mjs)
play-store/           Google Play paketi: mağaza metinleri, simge, öne çıkan görsel, ekran görüntüleri, form yanıtları
docs/                 Play yükleme rehberi, yayın rehberi, test raporu, gizlilik sayfaları (docs/gizlilik)
yayin-ayarlari.json   Yayın için TEK ayar dosyası: AdMob, RevenueCat, gizlilik adresi, sürüm
.github/workflows/    Android derleme (AAB + APK), testler ve isteğe bağlı Google Play yükleme
codemagic.yaml        iOS derleme ve TestFlight yükleme (Mac gerekmez)
```

## Hızlı başlangıç

Gerekenler: Node.js 22+ (Capacitor 8).

```bash
npm install
npm run dev -w apps/kelebek-sarkac
node tools/test/run-all.mjs --quick     # hızlı testler (tarayıcısız)
node tools/test/run-all.mjs             # tam paket → docs/TEST-RAPORU.md
```

- Google Play'e yükleme, adım adım: **[docs/PLAY-STORE-YUKLEME.md](docs/PLAY-STORE-YUKLEME.md)**
- Genel yayın rehberi (iOS dahil): **[docs/YAYIN-REHBERI.md](docs/YAYIN-REHBERI.md)**
- Son test raporu: **[docs/TEST-RAPORU.md](docs/TEST-RAPORU.md)**

## Bir oyun modülü nasıl yazılır?

`createGame(api)` şu nesneyi döndürür:

| Metot | Görevi |
|---|---|
| `start({mode, level, seed, hint})` | Seviyeyi kur. `seed` günlük görevde dolu gelir. `hint` ödüllü reklamla açılan ipucudur. |
| `resize(w, h, dpr)` | Ekran boyutu değişti. |
| `pointer(type, x, y)` | `down`, `move`, `up`, `cancel`. |
| `frame(ctx, dt, t)` | Her karede güncelle ve çiz. |
| `drawSkin(ctx, w, h, skin, t)` | Mağazadaki görünüm önizlemesi. |

Seviye bitince `api.win({stars, base})` veya `api.fail({title, lead, msg, hintAvailable})` çağrılır; sonuç kartı, altın, reklam ve günlük seri işini altyapı yapar.

## Olay Ufku seviyeleri

100 kampanya seviyesi (6 bölüm) ve 60 günlük seviye önceden hesaplanır ve `apps/olay-ufku/src/levels.js` dosyasına yazılır. 100. seviyeden sonra doğrulanmış seviyeler aynalanarak sonsuz mod oluşur.

```bash
node tools/olay-ufku/gen.mjs      # seviyeleri üret (yaklaşık 3 dakika)
node tools/olay-ufku/verify.mjs   # bağımsız doğrulama → docs/olay-ufku-test-raporu.md
```

Fizik (`apps/olay-ufku/src/physics.js`) oyun, üretici ve testlerde aynı koddur. Seviye tasarımını değiştirmek için `gen.mjs` başındaki `CHAPTERS` tablosunu düzenle, sonra iki komutu yeniden çalıştır.
