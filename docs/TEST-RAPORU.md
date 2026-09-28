# RST Games · Yayın Öncesi Test Raporu

Tarih: 2026-09-28 21:40 UTC · Mod: tam · Süre: 12.1 dk

**Sonuç: ✅ Bütün testler geçti**

| Test | Sonuç | Özet | Süre |
|---|---|---|---|
| Birim testleri (yardımcılar, ekonomi, ürünler, metinler, fizik, yerel ayar) | ✅ | 37/37 geçti | 0 sn |
| Kelebek Sarkaç: seviye çözülebilirliği (4 ekran × 40 seviye + 8 günlük) | ✅ | 192/192 geçti · isabet oranı %25 → %7 · en dar pencere 58 ms | 24 sn |
| Olay Ufku: 160 seviyenin bağımsız doğrulaması (+ sonsuz mod 101–400) | ✅ | Bütün testler geçti · Bölüm ortalamaları: 1:7.5%/100.0%  2:5.6%/100.0%  3:3.8%/100.0%  4:3.2%/100.0%  5:2.7%/93.4%  6:2.1%/99.5% | 6 sn |
| Google Play mağaza kontrolü | ✅ | 66 kontrol · 0 hata · 10 uyarı | 0 sn |
| Web çıktısı: kelebek-sarkac | ✅ | Hazır: dist-web/kelebek-sarkac | 0 sn |
| Web çıktısı: olay-ufku | ✅ | Hazır: dist-web/olay-ufku | 0 sn |
| Tarayıcı uçtan uca: 2 oyun × 4 ekran (+ satın alma kapalı, hareketi azalt, çevrimdışı) | ✅ | 200/200 geçti | 422 sn |
| Olay Ufku: 100 seviye + sonsuz mod gerçek sürükleme ile 3 yıldız | ✅ | 3 yıldız ile geçilen: 106 / 106 | 274 sn |

## Neler test ediliyor?

- **Birim:** rastgele sayı üreticisi, ürün kimlikleri (Play kuralları), fiyat tutarlılığı, ücretli ganimet kutusu olmadığı, kayıt taşıma, Altın Yol, takvim, çark oranları (200 bin çevirme), TR/EN metin eşliği ve değişkenler, fizik belirlenimciliği, aynalama, Capacitor 8 Android projesinin mağaza ayarları (targetSdk 36 zorunluluğu dahil).
- **Kelebek Sarkaç:** Her seviye 4 farklı ekran boyutunda kurulur; en geniş isabet penceresi ölçülür ve insanın yakalayabileceği sınırdan (ilk seviyeler 125 ms, orta 83 ms, ileri 58 ms) dar olan seviye kabul edilmez. Oyun döngüsü kare kare oynatılır: pencerenin ortasında ve %30 kaydırılmış iki anda dokunuş gerçekten kazanır.
- **Olay Ufku:** 160 seviye üreticiden bağımsız fizikle yeniden çözülür: kayıtlı çözüm kazanır, 3 yıldızlık çözüm tüm tozları toplar, insan hatası toleransı, doğrudan atışla geçilemezlik, bölüm mekaniği kullanımı; sonsuz mod 101–400 ve 60 günlük seviye.
- **Tarayıcı:** 360x640, 390x844, 412x915, 800x1280 ekranlarda yatay taşma, 40 px altı dokunma hedefi, kırpılan metin, seviye haritası, kilitli seviye, oynanış, mağaza sekmeleri, pencereler, dil kalıcılığı, çevrimdışı oynanış, konsol hataları; satın alma anahtarı yokken ücretli ürünlerin gizlenmesi; "hareketi azalt" ayarı.
- **Google Play:** ad ≤ 30, kısa açıklama ≤ 80, tam açıklama ≤ 4000 karakter, yasaklı ifadeler, simge 512x512, öne çıkan görsel 1024x500 alfasız, ekran görüntüsü boyut ve oranları, sürüm tutarlılığı, paket adı, yayın kimlikleri.

## Birim testleri (yardımcılar, ekonomi, ürünler, metinler, fizik, yerel ayar)

| Durum | Grup | Kontrol |
|---|---|---|
| ✅ | yardımcılar | rng aynı tohumla aynı diziyi üretir ve [0,1) aralığında kalır |
| ✅ | yardımcılar | rng dağılımı dengeli (10 kutu, 100 bin örnek, ±%5) |
| ✅ | yardımcılar | hash kararlı ve farklı girdilerde farklı |
| ✅ | yardımcılar | dayKey YYYY-AA-GG biçiminde |
| ✅ | yardımcılar | translate: değişken, İngilizceye düşme, anahtara düşme |
| ✅ | yardımcılar | hexA doğru rgba üretir |
| ✅ | ürünler | ürün kimlikleri benzersiz ve Google Play kurallarına uygun (küçük harf, rakam, _ .) |
| ✅ | ürünler | her ürünün türü, TR ve EN fiyatı var; abonelik ve yetkilerin entitlement alanı var |
| ✅ | ürünler | büyük altın paketleri birim fiyatta daha avantajlı |
| ✅ | ürünler | ücretli rastgele ödül (loot box) yok: çark ücretsiz/ödüllü reklamla, oranlar tanımlı |
| ✅ | ekonomi | kelebek-sarkac: varsayılan kayıt ve eski kayıt taşıma (migrate) |
| ✅ | ekonomi | kelebek-sarkac: Altın Yol 30 kademe, sezon görünümleri ödüllerde |
| ✅ | ekonomi | kelebek-sarkac: 7 günlük takvim, ödüller geçerli |
| ✅ | ekonomi | kelebek-sarkac: çark oranları doğru uygulanır (200 bin çevirme, ±%10) |
| ✅ | ekonomi | kelebek-sarkac: görünümler geçerli (benzersiz kimlik, fiyat veya kaynak) |
| ✅ | ekonomi | olay-ufku: varsayılan kayıt ve eski kayıt taşıma (migrate) |
| ✅ | ekonomi | olay-ufku: Altın Yol 30 kademe, sezon görünümleri ödüllerde |
| ✅ | ekonomi | olay-ufku: 7 günlük takvim, ödüller geçerli |
| ✅ | ekonomi | olay-ufku: çark oranları doğru uygulanır (200 bin çevirme, ±%10) |
| ✅ | ekonomi | olay-ufku: görünümler geçerli (benzersiz kimlik, fiyat veya kaynak) |
| ✅ | ekonomi | günlük görevler: 3 farklı görev, ilerleme hedefte durur |
| ✅ | ekonomi | başlangıç paketi süresi 48 saat, satın alınınca 0 |
| ✅ | metinler | RST Kit: TR ve EN anahtarları aynı |
| ✅ | metinler | RST Kit: boş metin yok, değişkenler ({n} vb.) iki dilde aynı |
| ✅ | metinler | kelebek-sarkac: TR ve EN anahtarları aynı |
| ✅ | metinler | kelebek-sarkac: boş metin yok, değişkenler ({n} vb.) iki dilde aynı |
| ✅ | metinler | kelebek-sarkac: görünüm, güç adları ve açıklamaları iki dilde |
| ✅ | metinler | olay-ufku: TR ve EN anahtarları aynı |
| ✅ | metinler | olay-ufku: boş metin yok, değişkenler ({n} vb.) iki dilde aynı |
| ✅ | metinler | olay-ufku: görünüm, güç adları ve açıklamaları iki dilde |
| ✅ | metinler | Olay Ufku: her bölüm için ad ve giriş metni var |
| ✅ | fizik | simulate belirlenimci (aynı atış → aynı sonuç) |
| ✅ | fizik | aynalanmış seviye çözümüyle aynı sonucu verir; iki kez aynalama özdeş |
| ✅ | fizik | aimFromPull: kısa çekiş yok sayılır, açı yukarı yönle sınırlı, güç ≤ 1 |
| ✅ | fizik | segDist2: parça üzerindeki en yakın nokta |
| ✅ | fizik | 100 kampanya + 60 günlük seviye, hepsinin kayıtlı çözümü kazanır |
| ✅ | yerel ayar | configure-native: AdMob kimliği, bildirim izni, dikey ekran, density, imza, sürüm; iki kez çalıştırmak güvenli |

## Kelebek Sarkaç: seviye çözülebilirliği (4 ekran × 40 seviye + 8 günlük)

| Seviye | İsabet oranı | En geniş pencere | Gereken | 3 dokunuş (orta, ±%30) |
|---|---|---|---|---|
| 1 | %26.5 | 517 ms | ≥ 125 ms | ✅ kazanır |
| 2 | %25.1 | 904 ms | ≥ 125 ms | ✅ kazanır |
| 3 | %30.5 | 942 ms | ≥ 125 ms | ✅ kazanır |
| 4 | %24.7 | 1017 ms | ≥ 125 ms | ✅ kazanır |
| 5 | %18.4 | 325 ms | ≥ 125 ms | ✅ kazanır |
| 6 | %29.1 | 888 ms | ≥ 83 ms | ✅ kazanır |
| 7 | %12.6 | 342 ms | ≥ 83 ms | ✅ kazanır |
| 8 | %21.6 | 888 ms | ≥ 83 ms | ✅ kazanır |
| 9 | %7.4 | 300 ms | ≥ 83 ms | ✅ kazanır |
| 10 | %12.6 | 350 ms | ≥ 83 ms | ✅ kazanır |
| 11 | %9.0 | 150 ms | ≥ 83 ms | ✅ kazanır |
| 12 | %8.5 | 163 ms | ≥ 83 ms | ✅ kazanır |
| 13 | %5.4 | 92 ms | ≥ 83 ms | ✅ kazanır |
| 14 | %10.7 | 308 ms | ≥ 83 ms | ✅ kazanır |
| 15 | %4.0 | 133 ms | ≥ 83 ms | ✅ kazanır |
| 16 | %9.1 | 288 ms | ≥ 58 ms | ✅ kazanır |
| 17 | %5.3 | 117 ms | ≥ 58 ms | ✅ kazanır |
| 18 | %7.4 | 250 ms | ≥ 58 ms | ✅ kazanır |
| 19 | %8.1 | 200 ms | ≥ 58 ms | ✅ kazanır |
| 20 | %5.4 | 171 ms | ≥ 58 ms | ✅ kazanır |
| 21 | %3.9 | 96 ms | ≥ 58 ms | ✅ kazanır |
| 22 | %3.7 | 108 ms | ≥ 58 ms | ✅ kazanır |
| 23 | %8.1 | 154 ms | ≥ 58 ms | ✅ kazanır |
| 24 | %7.3 | 158 ms | ≥ 58 ms | ✅ kazanır |
| 25 | %5.1 | 79 ms | ≥ 58 ms | ✅ kazanır |
| 26 | %6.7 | 117 ms | ≥ 58 ms | ✅ kazanır |
| 27 | %6.8 | 163 ms | ≥ 58 ms | ✅ kazanır |
| 28 | %5.1 | 92 ms | ≥ 58 ms | ✅ kazanır |
| 29 | %7.0 | 138 ms | ≥ 58 ms | ✅ kazanır |
| 30 | %4.2 | 113 ms | ≥ 58 ms | ✅ kazanır |
| 31 | %6.0 | 158 ms | ≥ 58 ms | ✅ kazanır |
| 32 | %6.5 | 275 ms | ≥ 58 ms | ✅ kazanır |
| 33 | %5.9 | 92 ms | ≥ 58 ms | ✅ kazanır |
| 34 | %4.8 | 100 ms | ≥ 58 ms | ✅ kazanır |
| 35 | %4.8 | 75 ms | ≥ 58 ms | ✅ kazanır |
| 36 | %4.3 | 63 ms | ≥ 58 ms | ✅ kazanır |
| 37 | %9.9 | 283 ms | ≥ 58 ms | ✅ kazanır |
| 38 | %8.4 | 242 ms | ≥ 58 ms | ✅ kazanır |
| 39 | %9.6 | 454 ms | ≥ 58 ms | ✅ kazanır |
| 40 | %10.1 | 321 ms | ≥ 58 ms | ✅ kazanır |
| G20260900 | %15.0 | 571 ms | ≥ 83 ms | ✅ kazanır |
| G20260937 | %13.3 | 329 ms | ≥ 83 ms | ✅ kazanır |
| G20260974 | %21.9 | 1000 ms | ≥ 83 ms | ✅ kazanır |
| G20261011 | %13.3 | 304 ms | ≥ 83 ms | ✅ kazanır |
| G20261048 | %11.6 | 354 ms | ≥ 83 ms | ✅ kazanır |
| G20261085 | %11.2 | 350 ms | ≥ 83 ms | ✅ kazanır |
| G20261122 | %16.0 | 538 ms | ≥ 83 ms | ✅ kazanır |
| G20261159 | %13.2 | 529 ms | ≥ 83 ms | ✅ kazanır |

## Google Play mağaza kontrolü

| Durum | Grup | Kontrol |
|---|---|---|
| ✅ | olay-ufku | paket adı listing.json ile capacitor.config.json aynı |
| ✅ | olay-ufku | paket adı biçimi (com.şirket.oyun, küçük harf) |
| ✅ | olay-ufku | sürüm 1.2.3 biçiminde ve her yerde aynı |
| ✅ | olay-ufku | Capacitor 8 (Android API 36 hedefi için) |
| ✅ | olay-ufku | tr-TR uygulama adı ≤ 30 karakter |
| ✅ | olay-ufku | tr-TR kısa açıklama ≤ 80 karakter |
| ✅ | olay-ufku | tr-TR tam açıklama ≤ 4000 karakter |
| ✅ | olay-ufku | tr-TR ad ve kısa açıklamada yasaklı ifade/emoji yok (ücretsiz, en iyi, #1, indirim…) |
| ✅ | olay-ufku | tr-TR adda tamamı büyük harf kelime yok |
| ✅ | olay-ufku | tr-TR açıklama abonelik ve reklam bilgisini içeriyor |
| ✅ | olay-ufku | tr-TR sürüm notu ≤ 500 karakter |
| ✅ | olay-ufku | en-US uygulama adı ≤ 30 karakter |
| ✅ | olay-ufku | en-US kısa açıklama ≤ 80 karakter |
| ✅ | olay-ufku | en-US tam açıklama ≤ 4000 karakter |
| ✅ | olay-ufku | en-US ad ve kısa açıklamada yasaklı ifade/emoji yok (ücretsiz, en iyi, #1, indirim…) |
| ✅ | olay-ufku | en-US adda tamamı büyük harf kelime yok |
| ✅ | olay-ufku | en-US açıklama abonelik ve reklam bilgisini içeriyor |
| ✅ | olay-ufku | en-US sürüm notu ≤ 500 karakter |
| ✅ | olay-ufku | simge 512x512, 32 bit PNG (alfa kanallı), ≤ 1 MB |
| ✅ | olay-ufku | tr-TR öne çıkan görsel 1024x500, alfa kanalı yok, ≤ 15 MB |
| ✅ | olay-ufku | tr-TR phone: 2–8 ekran görüntüsü, 320–3840 px, en-boy ≤ 2:1 |
| ✅ | olay-ufku | tr-TR tablet-7: 2–8 ekran görüntüsü, 320–3840 px, en-boy ≤ 2:1 |
| ✅ | olay-ufku | tr-TR tablet-10: 2–8 ekran görüntüsü, 320–3840 px, en-boy ≤ 2:1 |
| ✅ | olay-ufku | en-US öne çıkan görsel 1024x500, alfa kanalı yok, ≤ 15 MB |
| ✅ | olay-ufku | en-US phone: 2–8 ekran görüntüsü, 320–3840 px, en-boy ≤ 2:1 |
| ✅ | olay-ufku | en-US tablet-7: 2–8 ekran görüntüsü, 320–3840 px, en-boy ≤ 2:1 |
| ✅ | olay-ufku | en-US tablet-10: 2–8 ekran görüntüsü, 320–3840 px, en-boy ≤ 2:1 |
| ⚠️ | olay-ufku | gizlilik politikası adresi gerçek bir https adresi · https://GITHUB-KULLANICI-ADIN.github.io/rst-games/gizlilik/olay-ufku.html |
| ✅ | olay-ufku | gizlilik politikası sayfası üretildi (docs/gizlilik) |
| ⚠️ | olay-ufku | iletişim e-postası girildi (yayin-ayarlari.json > gelistirici.eposta) |
| ⚠️ | olay-ufku | AdMob Android uygulama kimliği gerçek (test değil) · ca-app-pub-3940256099942544~3347511713 |
| ⚠️ | olay-ufku | AdMob Android reklam birimleri gerçek (test değil) · boş → test reklamları |
| ⚠️ | olay-ufku | RevenueCat Android anahtarı (yoksa satın alma arayüzü gizlenir, yalnızca reklam geliri) · boş |
| ✅ | kelebek-sarkac | paket adı listing.json ile capacitor.config.json aynı |
| ✅ | kelebek-sarkac | paket adı biçimi (com.şirket.oyun, küçük harf) |
| ✅ | kelebek-sarkac | sürüm 1.2.3 biçiminde ve her yerde aynı |
| ✅ | kelebek-sarkac | Capacitor 8 (Android API 36 hedefi için) |
| ✅ | kelebek-sarkac | tr-TR uygulama adı ≤ 30 karakter |
| ✅ | kelebek-sarkac | tr-TR kısa açıklama ≤ 80 karakter |
| ✅ | kelebek-sarkac | tr-TR tam açıklama ≤ 4000 karakter |
| ✅ | kelebek-sarkac | tr-TR ad ve kısa açıklamada yasaklı ifade/emoji yok (ücretsiz, en iyi, #1, indirim…) |
| ✅ | kelebek-sarkac | tr-TR adda tamamı büyük harf kelime yok |
| ✅ | kelebek-sarkac | tr-TR açıklama abonelik ve reklam bilgisini içeriyor |
| ✅ | kelebek-sarkac | tr-TR sürüm notu ≤ 500 karakter |
| ✅ | kelebek-sarkac | en-US uygulama adı ≤ 30 karakter |
| ✅ | kelebek-sarkac | en-US kısa açıklama ≤ 80 karakter |
| ✅ | kelebek-sarkac | en-US tam açıklama ≤ 4000 karakter |
| ✅ | kelebek-sarkac | en-US ad ve kısa açıklamada yasaklı ifade/emoji yok (ücretsiz, en iyi, #1, indirim…) |
| ✅ | kelebek-sarkac | en-US adda tamamı büyük harf kelime yok |
| ✅ | kelebek-sarkac | en-US açıklama abonelik ve reklam bilgisini içeriyor |
| ✅ | kelebek-sarkac | en-US sürüm notu ≤ 500 karakter |
| ✅ | kelebek-sarkac | simge 512x512, 32 bit PNG (alfa kanallı), ≤ 1 MB |
| ✅ | kelebek-sarkac | tr-TR öne çıkan görsel 1024x500, alfa kanalı yok, ≤ 15 MB |
| ✅ | kelebek-sarkac | tr-TR phone: 2–8 ekran görüntüsü, 320–3840 px, en-boy ≤ 2:1 |
| ✅ | kelebek-sarkac | tr-TR tablet-7: 2–8 ekran görüntüsü, 320–3840 px, en-boy ≤ 2:1 |
| ✅ | kelebek-sarkac | tr-TR tablet-10: 2–8 ekran görüntüsü, 320–3840 px, en-boy ≤ 2:1 |
| ✅ | kelebek-sarkac | en-US öne çıkan görsel 1024x500, alfa kanalı yok, ≤ 15 MB |
| ✅ | kelebek-sarkac | en-US phone: 2–8 ekran görüntüsü, 320–3840 px, en-boy ≤ 2:1 |
| ✅ | kelebek-sarkac | en-US tablet-7: 2–8 ekran görüntüsü, 320–3840 px, en-boy ≤ 2:1 |
| ✅ | kelebek-sarkac | en-US tablet-10: 2–8 ekran görüntüsü, 320–3840 px, en-boy ≤ 2:1 |
| ⚠️ | kelebek-sarkac | gizlilik politikası adresi gerçek bir https adresi · https://GITHUB-KULLANICI-ADIN.github.io/rst-games/gizlilik/kelebek-sarkac.html |
| ✅ | kelebek-sarkac | gizlilik politikası sayfası üretildi (docs/gizlilik) |
| ⚠️ | kelebek-sarkac | iletişim e-postası girildi (yayin-ayarlari.json > gelistirici.eposta) |
| ⚠️ | kelebek-sarkac | AdMob Android uygulama kimliği gerçek (test değil) · ca-app-pub-3940256099942544~3347511713 |
| ⚠️ | kelebek-sarkac | AdMob Android reklam birimleri gerçek (test değil) · boş → test reklamları |
| ⚠️ | kelebek-sarkac | RevenueCat Android anahtarı (yoksa satın alma arayüzü gizlenir, yalnızca reklam geliri) · boş |

## Tarayıcı uçtan uca: 2 oyun × 4 ekran (+ satın alma kapalı, hareketi azalt, çevrimdışı)

| Kontrol | kelebek-sarkac kucuk-360x640 | kelebek-sarkac telefon-390x844 | kelebek-sarkac buyuk-412x915 | kelebek-sarkac tablet-800x1280 | olay-ufku kucuk-360x640 | olay-ufku telefon-390x844 | olay-ufku buyuk-412x915 | olay-ufku tablet-800x1280 |
|---|---|---|---|---|---|---|---|---|
| açılış ekranı | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| açılış: yatay taşma yok | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| açılış: dokunma hedefleri ≥40px | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| oyun ekranı: taşma yok | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| oyun ekranı: dokunma hedefleri ≥40px | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| oyun ekranı: kırpılan öğe yok | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| seviye haritası açılıyor | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| kilitli seviye uyarısı | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| haritadan seviye başlatma | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| dokunuş sonuç kartı açar | ✅ | ✅ | ✅ | ✅ | · | · | · | · |
| sonuç kartı: dokunma hedefleri ≥40px | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ipucu / tekrar düğmesi | ✅ | ✅ | ✅ | ✅ | · | · | · | · |
| mağaza açılıyor | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| mağaza sekmesi offers: taşma yok, hedefler ≥40px | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| mağaza sekmesi coins: taşma yok, hedefler ≥40px | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| mağaza sekmesi boosters: taşma yok, hedefler ≥40px | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| mağaza sekmesi looks: taşma yok, hedefler ≥40px | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| satın alma arayüzü (tarayıcıda simülasyon) görünür | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| günlük penceresi: açılır, taşma yok, hedefler ≥40px | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| altın yol penceresi: açılır, taşma yok, hedefler ≥40px | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ayarlar penceresi: açılır, taşma yok, hedefler ≥40px | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| dil ayarı (İngilizce) kalıcı | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| çevrimdışıyken oynanır | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| konsolda hata yok | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| satın alma kapalıyken ücretli ürün gösterilmez | · | ✅ | · | · | · | ✅ | · | · |
| satın alma kapalıyken ücretsiz altın (reklam) duruyor | · | ✅ | · | · | · | ✅ | · | · |
| satın alma kapalı: hata yok | · | ✅ | · | · | · | ✅ | · | · |
| doğrulanmış anda bırakış tarayıcıda kazanır (4 seviye) | · | ✅ | · | · | · | · | · | · |
| çözüm atışı 3 yıldızla kazanır | · | · | · | · | ✅ | ✅ | ✅ | ✅ |
| sonraki seviyeye geçiş | · | · | · | · | ✅ | ✅ | ✅ | ✅ |
| hareketi azalt: sarsıntı/parlama kapalı | · | · | · | · | · | ✅ | · | · |

Olay Ufku seviye ayrıntıları: [olay-ufku-test-raporu.md](olay-ufku-test-raporu.md) · Ekran görüntüleri: `docs/qa/`
