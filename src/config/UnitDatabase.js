import { Vector2D } from '../navigation/Vector2D.js';

export const UnitClasses = {
  GUARDIAN: 'guardian',   // Yüksek Canlı Ağır Savunma / Yakın Dövüş
  ARCHER: 'archer',       // 5x Menzilli Fiziksel Saldırı (Ok)
  MAGE: 'mage',           // 5x Menzilli Büyü Saldırısı (Alev Topu)
  HEALER: 'healer'        // 5x Menzilli Otomatik Şifa
};

export const EFENDI_DATA = [
  // 1 & 2: Yüksek Canlı Muhafızlar
  {
    id: 1,
    name: 'Muhafız-1 (Demir Bey)',
    title: 'Çelik Kalkan',
    classType: UnitClasses.GUARDIAN,
    color: '#34495e',
    radius: 16,
    maxHp: 650, // Yüksek Can
    speed: 2.6,
    attackPower: 22,
    attackRange: 40,
    description: 'Ön saflarda gelen yaratıkları durduran yüksek zırhlı ve yüksek canlı muhafız.'
  },
  {
    id: 2,
    name: 'Muhafız-2 (Kaya Han)',
    title: 'Taş Barikat',
    classType: UnitClasses.GUARDIAN,
    color: '#2c3e50',
    radius: 16,
    maxHp: 650, // Yüksek Can
    speed: 2.6,
    attackPower: 22,
    attackRange: 40,
    description: 'Savunma hattının merkezini tutan yüksek canlı çelik zırhlı savaşçı.'
  },

  // 3 & 4: Ortalama Canlı Okçular (5x Menzil: 800px)
  {
    id: 3,
    name: 'Okçu-1 (Gökbörü)',
    title: 'Keskin Nişancı',
    classType: UnitClasses.ARCHER,
    color: '#27ae60',
    radius: 12,
    maxHp: 200, // Ortalama Can
    speed: 3.3,
    attackPower: 26,
    attackRange: 800, // 5 Kat Menzil
    description: 'Tüm haritayı kapsayan uzun menzilli ok atışlarıyla düşmanları avlar.'
  },
  {
    id: 4,
    name: 'Okçu-2 (Yıldırım Yay)',
    title: 'Fırtına Ozanı',
    classType: UnitClasses.ARCHER,
    color: '#2ecc71',
    radius: 12,
    maxHp: 200, // Ortalama Can
    speed: 3.3,
    attackPower: 26,
    attackRange: 800, // 5 Kat Menzil
    description: 'Uzak mesafeden yüksek isabetli seri ok yağmurları yağdıran usta okçu.'
  },

  // 5 & 6: Ortalama Canlı Büyücüler (5x Menzil: 750px)
  {
    id: 5,
    name: 'Büyücü-1 (Kam Bilge)',
    title: 'Gök Ateşi',
    classType: UnitClasses.MAGE,
    color: '#8e44ad',
    radius: 12,
    maxHp: 180, // Ortalama Can
    speed: 2.9,
    attackPower: 38,
    attackRange: 750, // 5 Kat Menzil
    description: 'Uzaktan dev alev topları fırlatarak yaratıkları küle çeviren kudretli bilge.'
  },
  {
    id: 6,
    name: 'Büyücü-2 (Kızıl Kam)',
    title: 'Köz Efendisi',
    classType: UnitClasses.MAGE,
    color: '#9b59b6',
    radius: 12,
    maxHp: 180, // Ortalama Can
    speed: 2.9,
    attackPower: 38,
    attackRange: 750, // 5 Kat Menzil
    description: 'Geniş menzilden yaratıklara yıkıcı ateş küreleri fırlatan büyücü.'
  },

  // 7 & 8: Ortalama Canlı Şifacılar (5x Menzil: 650px)
  {
    id: 7,
    name: 'Healer-1 (Ay Hatun)',
    title: 'Ruh Dermanı',
    classType: UnitClasses.HEALER,
    color: '#16a085',
    radius: 13,
    maxHp: 220, // Ortalama Can
    speed: 3.0,
    attackPower: 0,
    attackRange: 650, // 5 Kat Şifa Menzili
    description: 'Haritanın dört bir yanındaki yaralı müttefikleri uzaktan otomatik iyileştirir.'
  },
  {
    id: 8,
    name: 'Healer-2 (Gün Hatun)',
    title: 'Kutlu Hayat',
    classType: UnitClasses.HEALER,
    color: '#1abc9c',
    radius: 13,
    maxHp: 220, // Ortalama Can
    speed: 3.0,
    attackPower: 0,
    attackRange: 650, // 5 Kat Şifa Menzili
    description: 'Can yüzdesi en düşük takım arkadaşına kesintisiz hayat enerjisi aktarır.'
  }
];
