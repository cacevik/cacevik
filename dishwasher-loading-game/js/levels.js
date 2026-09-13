// Bölüm tanımları: artan bulaşık sayısı, azalan süre, artan engel/sıkışıklık.

const LEVELS = [
  {
    id: 1, name: 'Bölüm 1 — Alıştırma',
    time: 60,
    items: ['plate', 'plate', 'cup', 'bowl'],
    pegs: { topRack: 0, bottomRack: 0 },
    sprayArm: false,
  },
  {
    id: 2, name: 'Bölüm 2 — Isınma',
    time: 55,
    items: ['plate', 'plate', 'bowl', 'cup', 'glass', 'pot'],
    pegs: { topRack: 0, bottomRack: 2 },
    sprayArm: false,
  },
  {
    id: 3, name: 'Bölüm 3 — Sıkışık Mutfak',
    time: 50,
    items: ['plate', 'plate', 'bigplate', 'bowl', 'bowl', 'cup', 'fork', 'spoon'],
    pegs: { topRack: 2, bottomRack: 3 },
    sprayArm: false,
  },
  {
    id: 4, name: 'Bölüm 4 — Yoğun Mesai',
    time: 45,
    items: ['plate', 'plate', 'bigplate', 'pot', 'pan', 'bowl', 'cup', 'glass', 'fork', 'knife'],
    pegs: { topRack: 3, bottomRack: 4 },
    sprayArm: true,
  },
  {
    id: 5, name: 'Bölüm 5 — Aile Yemeği',
    time: 42,
    items: ['plate', 'plate', 'plate', 'bigplate', 'pot', 'pan', 'bowl', 'bowl', 'cup', 'glass', 'fork', 'spoon'],
    pegs: { topRack: 3, bottomRack: 5 },
    sprayArm: true,
  },
  {
    id: 6, name: 'Bölüm 6 — Usta Seviyesi',
    time: 38,
    items: ['plate', 'plate', 'plate', 'bigplate', 'bigplate', 'pot', 'pan', 'bowl', 'bowl', 'cup', 'cup', 'glass', 'fork', 'spoon', 'knife'],
    pegs: { topRack: 4, bottomRack: 6 },
    sprayArm: true,
  },
];

function getLevel(id) {
  return LEVELS.find((l) => l.id === id);
}
