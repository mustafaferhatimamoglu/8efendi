export const UnitClasses = {
  GUARDIAN: 'guardian',   // Yüksek Canlı Ağır Savunma / Yakın Dövüş
  ARCHER: 'archer',       // 5x Menzilli Fiziksel Saldırı (Ok)
  MAGE: 'mage',           // 5x Menzilli Büyü Saldırısı (Alev Topu)
  HEALER: 'healer'        // 5x Menzilli Otomatik Şifa
};

// Seçilebilir Tüm Efendi Şablonları
export const AVAILABLE_CLASSES = [
  {
    classType: UnitClasses.GUARDIAN,
    label: '🛡️ Muhafız (Tank)',
    color: '#34495e',
    radius: 16,
    maxHp: 650,
    speed: 2.6,
    attackPower: 22,
    attackRange: 45,
    description: '650 HP, geniş alan ittirmesi (Knockback), %50 can altında 5s %75 çelik kalkan (5s cooldown).'
  },
  {
    classType: UnitClasses.ARCHER,
    label: '🏹 Okçu (Ranger)',
    color: '#27ae60',
    radius: 12,
    maxHp: 200,
    speed: 3.3,
    attackPower: 26,
    attackRange: 800,
    description: '200 HP, 800px ok menzili, 10s\'de bir 5s boyunca 5x hızlı ok atışı.'
  },
  {
    classType: UnitClasses.MAGE,
    label: '🔥 Büyücü (Mage)',
    color: '#8e44ad',
    radius: 12,
    maxHp: 180,
    speed: 2.9,
    attackPower: 38,
    attackRange: 750,
    description: '180 HP, 750px alev topu, 10s\'de bir 5s boyunca 5x hızlı alev yağmuru.'
  },
  {
    classType: UnitClasses.HEALER,
    label: '💚 Şifacı (Healer)',
    color: '#16a085',
    radius: 13,
    maxHp: 220,
    speed: 3.0,
    attackPower: 0,
    attackRange: 650,
    description: '220 HP, 650px menzildeki en düşük canlı müttefike her 0.5s\'de 70 HP şifa.'
  }
];

// Varsayılan 8 Efendi Kadrosu
export const EFENDI_DATA = [
  { id: 1, name: 'Muhafız-1 (Demir Bey)', title: 'Çelik Kalkan', classType: UnitClasses.GUARDIAN, color: '#34495e', radius: 16, maxHp: 650, speed: 2.6, attackPower: 22, attackRange: 45 },
  { id: 2, name: 'Muhafız-2 (Kaya Han)', title: 'Taş Barikat', classType: UnitClasses.GUARDIAN, color: '#2c3e50', radius: 16, maxHp: 650, speed: 2.6, attackPower: 22, attackRange: 45 },
  { id: 3, name: 'Okçu-1 (Gökbörü)', title: 'Keskin Nişancı', classType: UnitClasses.ARCHER, color: '#27ae60', radius: 12, maxHp: 200, speed: 3.3, attackPower: 26, attackRange: 800 },
  { id: 4, name: 'Okçu-2 (Yıldırım Yay)', title: 'Fırtına Ozanı', classType: UnitClasses.ARCHER, color: '#2ecc71', radius: 12, maxHp: 200, speed: 3.3, attackPower: 26, attackRange: 800 },
  { id: 5, name: 'Büyücü-1 (Kam Bilge)', title: 'Gök Ateşi', classType: UnitClasses.MAGE, color: '#8e44ad', radius: 12, maxHp: 180, speed: 2.9, attackPower: 38, attackRange: 750 },
  { id: 6, name: 'Büyücü-2 (Kızıl Kam)', title: 'Köz Efendisi', classType: UnitClasses.MAGE, color: '#9b59b6', radius: 12, maxHp: 180, speed: 2.9, attackPower: 38, attackRange: 750 },
  { id: 7, name: 'Healer-1 (Ay Hatun)', title: 'Ruh Dermanı', classType: UnitClasses.HEALER, color: '#16a085', radius: 13, maxHp: 220, speed: 3.0, attackPower: 0, attackRange: 650 },
  { id: 8, name: 'Healer-2 (Gün Hatun)', title: 'Kutlu Hayat', classType: UnitClasses.HEALER, color: '#1abc9c', radius: 13, maxHp: 220, speed: 3.0, attackPower: 0, attackRange: 650 }
];
