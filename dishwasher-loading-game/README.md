# 🍽️ Bulaşık Dizme Ustası

Mobil dokunmatik cihazlar için tasarlanmış, tarayıcıda oynanan bir **3D** bulaşık
makinesi doldurma oyunu. Amaç, bulaşıkları doğru rafa (alt raf / üst raf /
çatal-kaşık sepeti) gerçek fizik simülasyonuyla, birbirine değmeden ve aralıklı
şekilde yerleştirerek en yüksek puanı toplamak.

## Nasıl oynanır

- Alt taraftaki tepsiden bir bulaşığı sürükleyip makinenin içine bırak.
- Tabak, tencere ve tava **alt rafa**; kase, fincan ve bardak **üst rafa**;
  çatal, kaşık ve bıçak **sepete** gitmeli.
- Bulaşıklar gerçek bir fizikle düşüp birbirinin üstüne yığılabilir — su akışı
  için aralarında boşluk bırakmak daha yüksek puan getirir.
- Boş bir alana (bulaşık sürüklemiyorken) parmağını/imleci sürükleyerek
  **kamerayı 360° döndürebilirsin** — rafın arkasını/köşelerini görmek ve daha
  isabetli bırakmak için.
- Süre dolmadan tüm bulaşıkları yerleştir. Puan = doğruluk (%70) + kalan süre (%30).
- Bölümler ilerledikçe bulaşık sayısı artar, süre kısalır, rafa engelleyici pimler
  eklenir ve (4. bölümden itibaren) ortaya bir püskürtme kolu çıkar — üstüne bulaşık
  koymak puan kırar.
- Her bölüm grubu farklı bir **bulaşık makinesi markası/modeliyle** oynanır
  (bkz. aşağıda) — ilerledikçe yeni bir makine görünümü açılır.

## Markalar (kurgusal — reklam/sponsorluk için hazır altyapı)

`js/brands.js` içinde tanımlı **tamamen kurgusal** üç marka (Solvex, Fortina,
Nordlux) bölüm gruplarına otomatik atanır. Bunlar gerçek bir marka/logo
değildir — ileride gerçek bir sponsorluk anlaşması olursa, aynı yapıya (isim,
gövde/aksan rengi, kontrol paneli üzerindeki logo dokusu) gerçek marka
bilgileri kolayca geçirilebilir. Gerçek marka isim/logosu izinsiz
**kullanılmamalıdır**.

## Çalıştırma

Herhangi bir build adımı gerekmez, sadece statik dosyalardır:

```bash
cd dishwasher-loading-game
python3 -m http.server 8080
# tarayıcıda http://localhost:8080 adresini aç (mobil görünüm için dev tools'tan
# telefon boyutu seçebilirsin)
```

## Teknik notlar

- Render: [Three.js](https://threejs.org/) (`js/vendor/three.min.js`, MIT lisanslı,
  harici bir CDN'e bağımlı olmaması için depoya gömülü).
- Fizik: hazır bir kütüphane yerine, bu oyunun ihtiyacına göre elle yazılmış
  hafif bir 3D simülasyon (`js/physics3d.js`) — yerçekimi, zemin/duvar/pim
  çarpışması, gövdeler arası ayrıştırma.
- Görsel: gerçekçi "kesit" bir bulaşık makinesi gövdesi (gövde/kapak
  çerçevesi/kontrol paneli) içinde, Three.js primitifleriyle inşa edilmiş
  bulaşık modelleri — harici görsel/asset dosyası kullanılmıyor (marka
  logosu bir canvas dokusu olarak üretiliyor).
- Kamera: dokunarak 360° döndürülebilen özel bir "orbit" kontrolcüsü;
  bulaşık sürüklerken raycasting ile hedef rafa bırakma noktası hesaplanır.
- Dosya yapısı:
  - `js/brands.js` — kurgusal marka/model tanımları + bölüm grubu eşlemesi
  - `js/zones3d.js` — raf/sepet bölgeleri (3D hacim, fizik sınırları)
  - `js/items.js` — bulaşık türleri ve 3D mesh üreticileri
  - `js/physics3d.js` — hafif 3D fizik simülasyonu
  - `js/scene3d.js` — Three.js sahne/kamera/gövde/kontrol paneli kurulumu
  - `js/levels.js` — bölüm tanımları
  - `js/game.js` — oyun durumu, sürükle-bırak (raycast), puanlama
  - `js/ui.js` — menü/tepsi/sonuç ekranı DOM render
  - `js/main.js` — canvas boyutlandırma ve oyun döngüsü
