# 🍽️ Bulaşık Dizme Ustası

Mobil dokunmatik cihazlar için tasarlanmış, tarayıcıda oynanan bir bulaşık makinesi
doldurma oyunu. Amaç, bulaşıkları doğru rafa (alt raf / üst raf / çatal-kaşık sepeti)
serbest fizik simülasyonuyla, birbirine değmeden ve aralıklı şekilde yerleştirerek en
yüksek puanı toplamak.

## Nasıl oynanır

- Alt taraftaki tepsiden bir bulaşığı sürükleyip makinenin içine bırak.
- Tabak, tencere ve tava **alt rafa**; kase, fincan ve bardak **üst rafa**;
  çatal, kaşık ve bıçak **sepete** gitmeli.
- Bulaşıklar gerçek bir fizik motoruyla (Matter.js) düşüp birbirinin üstüne yığılabilir —
  su akışı için aralarında boşluk bırakmak daha yüksek puan getirir.
- Süre dolmadan tüm bulaşıkları yerleştir. Puan = doğruluk (%70) + kalan süre (%30).
- Bölümler ilerledikçe bulaşık sayısı artar, süre kısalır, rafa engelleyici pimler
  eklenir ve (4. bölümden itibaren) ortaya bir püskürtme kolu çıkar — üstüne bulaşık
  koymak puan kırar.

## Çalıştırma

Herhangi bir build adımı gerekmez, sadece statik dosyalardır:

```bash
cd dishwasher-loading-game
python3 -m http.server 8080
# tarayıcıda http://localhost:8080 adresini aç (mobil görünüm için dev tools'tan
# telefon boyutu seçebilirsin)
```

## Teknik notlar

- Fizik: [Matter.js](https://brm.io/matter-js/) (`js/vendor/matter.min.js`, MIT lisanslı,
  harici bir CDN'e bağımlı olmaması için depoya gömülü).
- Görsel stil: Canvas 2D üzerine elle çizilmiş, hafif eğik (pseudo-izometrik) raf ve
  bulaşık sprite'ları — harici görsel/asset dosyası kullanılmıyor.
- Dosya yapısı:
  - `js/iso.js` — izometrik projeksiyon ve platform çizim yardımcıları
  - `js/items.js` — bulaşık türleri ve çizimleri
  - `js/zones.js` — raf/sepet bölgeleri, fizik sınırları, ekran düzeni
  - `js/levels.js` — bölüm tanımları
  - `js/game.js` — oyun durumu, sürükle-bırak, puanlama
  - `js/ui.js` — menü/tepsi/sonuç ekranı DOM render
  - `js/main.js` — canvas boyutlandırma ve oyun döngüsü
