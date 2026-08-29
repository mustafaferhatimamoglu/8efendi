import { Vector2D } from '../navigation/Vector2D.js';

export const UnitClasses = {
  WARRIOR: 'warrior',     // Tank/Melee
  GUARDIAN: 'guardian',   // Heavy Defense/Shield
  BERSERKER: 'berserker', // High Damage Melee
  ARCHER: 'archer',       // Ranged Physical
  MAGE: 'mage',           // Ranged Area Damage
  ASSASSIN: 'assassin',   // Fast & Burst
  HEALER: 'healer',       // Support/Heal
  TACTICIAN: 'tactician'  // Buffs & Control
};

export const EFENDI_DATA = [
  {
    id: 1,
    name: 'Alp Er (Savaşçı)',
    title: 'Öncü Akıncı',
    classType: UnitClasses.WARRIOR,
    color: '#e74c3c',
    radius: 14,
    maxHp: 250,
    maxEnergy: 100,
    speed: 3.2,
    attackPower: 25,
    attackRange: 35,
    attackSpeed: 1.1,
    description: 'Ön saflarda çarpışan cesur kılıç ustası.',
    skills: [{ id: 'whirlwind', name: 'Kasırga Vuruşu', cost: 30, cd: 6, range: 45 }]
  },
  {
    id: 2,
    name: 'Demir Bey (Muhafız)',
    title: 'Çelik Kalkan',
    classType: UnitClasses.GUARDIAN,
    color: '#34495e',
    radius: 16,
    maxHp: 350,
    maxEnergy: 100,
    speed: 2.5,
    attackPower: 15,
    attackRange: 30,
    attackSpeed: 0.9,
    description: 'Takımı koruyan, yüksek zırhlı savunma ustası.',
    skills: [{ id: 'shield_wall', name: 'Kalkan Duvarı', cost: 40, cd: 10, range: 0 }]
  },
  {
    id: 3,
    name: 'Batur (Bozkurt)',
    title: 'Vahşi Pençe',
    classType: UnitClasses.BERSERKER,
    color: '#d35400',
    radius: 13,
    maxHp: 220,
    maxEnergy: 100,
    speed: 3.5,
    attackPower: 35,
    attackRange: 32,
    attackSpeed: 1.4,
    description: 'Yüksek hasar ve saldırı hızına sahip öfke savaşçısı.',
    skills: [{ id: 'frenzy', name: 'Hiddet', cost: 25, cd: 8, range: 0 }]
  },
  {
    id: 4,
    name: 'Gökbörü (Okçu)',
    title: 'Keskin Nişancı',
    classType: UnitClasses.ARCHER,
    color: '#27ae60',
    radius: 12,
    maxHp: 160,
    maxEnergy: 100,
    speed: 3.4,
    attackPower: 22,
    attackRange: 160,
    attackSpeed: 1.3,
    description: 'Uzak mesafeden hedefleri avlayan usta okçu.',
    skills: [{ id: 'arrow_rain', name: 'Ok Yağmuru', cost: 45, cd: 9, range: 180 }]
  },
  {
    id: 5,
    name: 'Kam Bilge (Büyücü)',
    title: 'Gök Ateşi',
    classType: UnitClasses.MAGE,
    color: '#8e44ad',
    radius: 12,
    maxHp: 140,
    maxEnergy: 150,
    speed: 2.8,
    attackPower: 40,
    attackRange: 150,
    attackSpeed: 0.8,
    description: 'Kadim elementleri bükerek alan hasarı veren büyücü.',
    skills: [{ id: 'fireball', name: 'Ateş Topu', cost: 50, cd: 7, range: 160 }]
  },
  {
    id: 6,
    name: 'Karanlık Gölge (Suikastçı)',
    title: 'Sessiz Hançer',
    classType: UnitClasses.ASSASSIN,
    color: '#2c3e50',
    radius: 11,
    maxHp: 150,
    maxEnergy: 100,
    speed: 4.2,
    attackPower: 38,
    attackRange: 28,
    attackSpeed: 1.8,
    description: 'Hızlıca sızıp arka hatları etkisiz hale getiren suikastçı.',
    skills: [{ id: 'shadow_step', name: 'Gölge Adımı', cost: 35, cd: 5, range: 120 }]
  },
  {
    id: 7,
    name: 'Ay Hatun (Şifacı)',
    title: 'Ruh Dermanı',
    classType: UnitClasses.HEALER,
    color: '#16a085',
    radius: 12,
    maxHp: 170,
    maxEnergy: 140,
    speed: 3.0,
    attackPower: 12,
    attackRange: 110,
    attackSpeed: 1.0,
    description: 'Dost birimleri iyileştiren ve canlandıran kutlu şifacı.',
    skills: [{ id: 'holy_aura', name: 'Şifa Haleleri', cost: 40, cd: 6, range: 130 }]
  },
  {
    id: 8,
    name: 'Kutluk Han (Taktisyen)',
    title: 'Savaş Ozanı',
    classType: UnitClasses.TACTICIAN,
    color: '#f39c12',
    radius: 13,
    maxHp: 190,
    maxEnergy: 120,
    speed: 3.1,
    attackPower: 18,
    attackRange: 90,
    attackSpeed: 1.0,
    description: 'Bütün takımı hızlandıran ve moral veren bilge komutan.',
    skills: [{ id: 'war_cry', name: 'Cenk Çağrısı', cost: 35, cd: 12, range: 200 }]
  }
];
