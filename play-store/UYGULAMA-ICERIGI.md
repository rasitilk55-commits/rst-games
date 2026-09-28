# Play Console · "Uygulama içeriği" ve form yanıtları

İki oyun için de aynıdır (Olay Ufku ve Kelebek Sarkaç). Play Console'da **Politika ve programlar > Uygulama içeriği** altındaki her bölümü aşağıdaki gibi doldur. Yanıtlar oyunların gerçekte ne yaptığına göre hazırlandı: hesap yok, sunucu yok, ilerleme cihazda; reklam için Google AdMob, satın alma için RevenueCat.

> Bu yanıtlar oyunun şu anki koduna göredir. Yeni bir SDK eklersen (analitik, çökme raporu, sosyal giriş vb.) Veri güvenliği formunu da güncelle.

---

## 1. Gizlilik politikası

- **Adres:** `yayin-ayarlari.json > gizlilikAdresi` (örn. `https://KULLANICIN.github.io/rst-games/gizlilik/olay-ufku.html`)
- Sayfalar `docs/gizlilik/` klasöründe hazır. GitHub'da **Settings > Pages > Branch: main, Folder: /docs** seçince yayına girer.

## 2. Uygulama erişimi

- **"Tüm işlevler özel erişim gerekmeden kullanılabilir"** seçeneğini seç. (Giriş, şifre, üyelik yok.)

## 3. Reklamlar

- **"Evet, uygulamam reklam içeriyor."**

## 4. İçerik derecelendirmesi (IARC anketi)

| Soru | Yanıt |
|---|---|
| E-posta adresi | yayin-ayarlari.json'daki e-posta |
| Kategori | **Oyun** |
| Şiddet (her tür) | Hayır |
| Korku / ürkütücü içerik | Hayır |
| Cinsellik, çıplaklık | Hayır |
| Küfür, kaba dil | Hayır |
| Uyuşturucu, alkol, tütün | Hayır |
| Kumar teması / simüle kumar (gerçek veya sanal parayla bahis, kumarhane oyunları) | **Hayır** (şans çarkı ücretsizdir ve yalnızca oyun içi ödül verir; parayla çevrilmez, para kazandırmaz) |
| Kullanıcılar birbiriyle etkileşebilir / içerik paylaşabilir | Hayır (paylaş düğmesi yalnızca cihazın kendi paylaşım menüsünü açar) |
| Kullanıcının konumunu paylaşır | Hayır |
| Dijital ürün satın alma | **Evet** |
| Rastgele ürün satın alma (ganimet kutusu vb.) | **Hayır** (satılan her ürünün içeriği önceden bellidir) |
| Web tarayıcısı / arama motoru | Hayır |

Beklenen sonuç: **PEGI 3 / ESRB Everyone / USK 0** ve "Uygulama İçi Satın Alma" etiketi.

## 5. Hedef kitle ve içerik

- **Hedef yaş grupları:** `13-15`, `16-17`, `18 ve üzeri` (13 yaş altını **seçme**).
  - Neden: Oyunlar kişiselleştirilmiş reklam ve satın alma içeriyor. 13 yaş altını seçmek Aile Politikası'nı, sertifikalı reklam ağı ve ek kısıtlamaları zorunlu kılar.
- **"Uygulama çocukların ilgisini çekebilir mi?"** → Kelebek Sarkaç'ın sevimli görselleri nedeniyle Google bunu sorabilir. Yanıt: *Hayır, hedef kitlemiz 13+; mağaza metinleri ve görseller çocuklara yönelik değildir.* (Mağaza metinlerinde "her yaşa uygun" gibi ifadeler bu yüzden kullanılmadı.)

## 6. Haber uygulaması

- **Hayır.**

## 7. Veri güvenliği (Data safety)

**Genel sorular**

| Soru | Yanıt |
|---|---|
| Uygulamanız gerekli kullanıcı veri türlerini topluyor veya paylaşıyor mu? | **Evet** |
| Toplanan tüm kullanıcı verileri aktarım sırasında şifreleniyor mu? | **Evet** |
| Kullanıcıların verilerinin silinmesini isteyebilecekleri bir yol sağlıyor musunuz? | **Evet** (gizlilik politikasındaki e-posta; cihazdaki veriler için Ayarlar > İlerlemeyi sıfırla) |
| Hesap oluşturma | Uygulama hesap oluşturmayı desteklemiyor |

**Veri türleri** (Google Mobile Ads SDK ve RevenueCat belgelerine göre)

| Kategori > Veri türü | Toplanır | Paylaşılır | Geçici mi? | Zorunlu mu? | Amaçlar |
|---|---|---|---|---|---|
| Konum > **Yaklaşık konum** (IP adresinden) | Evet | Evet | Hayır | Zorunlu | Reklam veya pazarlama, Analiz, Dolandırıcılığı önleme ve güvenlik |
| Uygulama etkinliği > **Uygulama etkileşimleri** | Evet | Evet | Hayır | Zorunlu | Reklam veya pazarlama, Analiz, Dolandırıcılığı önleme ve güvenlik |
| Uygulama bilgileri ve performansı > **Teşhis** | Evet | Evet | Hayır | Zorunlu | Reklam veya pazarlama, Analiz, Dolandırıcılığı önleme ve güvenlik |
| Cihaz veya diğer kimlikler > **Cihaz veya diğer kimlikler** (reklam kimliği, uygulama grubu kimliği) | Evet | Evet | Hayır | Zorunlu | Reklam veya pazarlama, Analiz, Dolandırıcılığı önleme ve güvenlik |
| Finansal bilgiler > **Satın alma geçmişi** (RevenueCat) | Evet | Hayır | Hayır | Zorunlu | Uygulama işlevselliği, Analiz |

Satın alma kapalıysa (RevenueCat anahtarı girilmediyse) son satırı işaretleme.

## 8. Reklam kimliği (Advertising ID)

- **"Uygulamanız reklam kimliği kullanıyor mu?"** → **Evet**
- Amaçlar: **Reklam veya pazarlama**, **Analiz**, **Dolandırıcılığı önleme, güvenlik ve uygunluk**
- `AD_ID` izni AdMob kütüphanesiyle otomatik eklenir.

## 9. Diğer beyanlar

| Bölüm | Yanıt |
|---|---|
| Devlet uygulamaları | Hayır |
| Finansal özellikler | Uygulamam finansal özellik sunmuyor |
| Sağlık | Sağlık özelliği yok |
| Ön plan hizmeti / tam ekran bildirim / tam konum izni | İstenmez (formda görünmez) |

## 10. Mağaza ayarları

| Alan | Olay Ufku | Kelebek Sarkaç |
|---|---|---|
| Uygulama türü | Oyun | Oyun |
| Kategori | Bulmaca (Puzzle) | Gündelik (Casual) |
| Etiketler | listing.json > tags | listing.json > tags |
| E-posta | yayin-ayarlari.json > gelistirici.eposta | aynı |
| Web sitesi | isteğe bağlı | isteğe bağlı |
| Fiyat | Ücretsiz | Ücretsiz |

Not: Bir uygulamayı **ücretsiz** yayınladıktan sonra ücretliye çeviremezsin (Google Play kuralı). Bu oyunlar ücretsiz + reklam + satın alma modeline göre tasarlandı.
