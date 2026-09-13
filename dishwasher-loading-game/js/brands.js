// Kurgusal bulaşık makinesi markaları/modelleri. Gerçek marka isim/logosu
// KULLANILMAZ (marka hakkı) — burada tanımlı markalar tamamen uydurmadır ve
// ileride gerçek bir sponsorluk anlaşması olduğunda bu tanımların yerine
// gerçek marka renk/logo/adı kolayca geçirilebilecek şekilde tasarlanmıştır.
// Bölüm grupları otomatik olarak bir markaya eşlenir (oyuncu ilerledikçe
// yeni marka/model görünümü açılır).

const BRANDS = {
  solvex: {
    id: 'solvex', name: 'Solvex', model: 'Aqua 500',
    bodyColor: 0xe8ebee, accentColor: 0x2f9bd6, panelColor: 0xd7dbdf, doorTrim: 0xbfc5ca,
    metalness: 0.25, roughness: 0.55,
  },
  fortina: {
    id: 'fortina', name: 'Fortina', model: 'Steel Pro',
    bodyColor: 0xb9bfc4, accentColor: 0xe0433d, panelColor: 0x8f979c, doorTrim: 0x6d757a,
    metalness: 0.75, roughness: 0.3,
  },
  nordlux: {
    id: 'nordlux', name: 'Nordlux', model: 'Onyx X1',
    bodyColor: 0x2b2f34, accentColor: 0x4fd6c4, panelColor: 0x1c1f22, doorTrim: 0x101214,
    metalness: 0.55, roughness: 0.35,
  },
};

// Bölüm grubu -> marka eşlemesi: her 2 bölüm bir markayı kullanır.
function getBrandForLevel(levelId) {
  if (levelId <= 2) return BRANDS.solvex;
  if (levelId <= 4) return BRANDS.fortina;
  return BRANDS.nordlux;
}
