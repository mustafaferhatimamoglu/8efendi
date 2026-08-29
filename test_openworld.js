import { MapManager } from './src/world/MapManager.js';
import { Camera } from './src/core/Camera.js';
import { OpenWorldSpawner, OPENWORLD_SPAWNERS } from './src/combat/OpenWorldSpawner.js';
import { PartyManager } from './src/entities/PartyManager.js';
import { Vector2D } from './src/navigation/Vector2D.js';
import { Unit } from './src/entities/Unit.js';
import { Projectile } from './src/combat/ProjectileManager.js';

console.log('========================================================');
console.log('🧪 OPENWORLD MODU & MEKANİK DOĞRULAMA TESTLERİ BAŞLIYOR');
console.log('========================================================\n');

let failedTests = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ BAŞARISIZ: ${message}`);
    failedTests++;
  } else {
    console.log(`✅ BAŞARILI: ${message}`);
  }
}

// 1. HARİTA VE DUVAR TESTLERİ
console.log('--- 1. Harita ve Duvar Sistemi Testleri ---');
const map = new MapManager(2400, 1800);
assert(map.width === 2400 && map.height === 1800, 'Harita boyutları 2400x1800 olarak ayarlandı');
assert(map.walls.length >= 15, `Haritada yeterli sayıda (${map.walls.length}) duvar/engel tanımlı`);

// Duvar Çarpışma Testi (Karakter duvara giremez)
const testWall = map.walls[0]; // örn: base_left { x: 980, y: 1520, w: 24, h: 200 }
const unitPos = new Vector2D(testWall.x + 5, testWall.y + 50); // Duvarın tam içi
const unitRadius = 14;
map.resolveCircleCollision(unitPos, unitRadius);
const isStillInside = map.isPointInsideWall(unitPos.x, unitPos.y);
assert(!isStillInside, 'Duvarın içine girmeye çalışan karakter dışarı itildi (Yürüme Engeli)');

// Görüş Hattı (Line-of-Sight) Testi (Duvar arkası kontrolü)
const pLeft = new Vector2D(testWall.x - 50, testWall.y + 50);
const pRight = new Vector2D(testWall.x + testWall.w + 50, testWall.y + 50);
const hasSightAcrossWall = map.hasLineOfSight(pLeft, pRight);
assert(!hasSightAcrossWall, 'Duvar arkasındaki iki nokta arasında görüş hattı ENGELLENDİ (Line-of-Sight Engeli)');

const pClear1 = new Vector2D(100, 100);
const pClear2 = new Vector2D(150, 100);
const hasClearSight = map.hasLineOfSight(pClear1, pClear2);
assert(hasClearSight, 'Engelsiz açık alanda görüş hattı AÇIK');

// Mermi Duvar Çarpışması Testi
const hitPoint = map.checkProjectileWallHit(pLeft, pRight);
assert(hitPoint !== null, `Mermi yolu duvar ile kesiştiğinde çarpışma noktası tespit edildi (${hitPoint ? Math.round(hitPoint.x) + ',' + Math.round(hitPoint.y) : ''})`);


// 2. KAMERA SİSTEMİ TESTLERİ
console.log('\n--- 2. Kamera ve Navigasyon Testleri ---');
const camera = new Camera(800, 600);
camera.active = true;
camera.follow(new Vector2D(1200, 1600), map.width, map.height, 1.0); // Anında hedefe git
assert(camera.x >= 0 && camera.y >= 0, `Kamera harita sınırları içinde (${Math.round(camera.x)}, ${Math.round(camera.y)})`);

const worldPt = new Vector2D(1250, 1650);
const screenPt = camera.worldToScreen(worldPt);
const convertedBack = camera.screenToWorld(screenPt);
assert(Math.abs(convertedBack.x - worldPt.x) < 0.001 && Math.abs(convertedBack.y - worldPt.y) < 0.001, 'Kamera Ekran <-> Dünya koordinat dönüşümü hassas çalışıyor');


// 3. 5 ADET CANAVAR SPAWNER & 10 CANAVAR LİMİTİ TESTLERİ
console.log('\n--- 3. 5 Canavar Spawner ve Bölgesel Gezinme Testleri ---');
assert(OPENWORLD_SPAWNERS.length === 5, `Tam 5 adet canavar spawner tanımlı (${OPENWORLD_SPAWNERS.map(s => s.name).join(', ')})`);

const party = new PartyManager();
party.initParties(true, true, true); // OpenWorld olarak başlat

assert(party.gameMode === 'openworld', 'PartyManager OpenWorld modunda başlatıldı');
assert(party.mapManager !== null, 'OpenWorld için MapManager bağlandı');
assert(party.spawner instanceof OpenWorldSpawner, 'OpenWorldSpawner aktif edildi');
assert(party.getAllUnits().length === 8, '8 Efendi başarıyla haritada oluşturuldu');

// 5 Spawner'ın her birinde 10 aktif canavar kontrolü
assert(party.enemyUnits.length === 50, `5 Spawner x 10 = Toplam ${party.enemyUnits.length} canavar doğrulandı (Hedef: 50)`);

party.spawner.spawners.forEach((spawner, idx) => {
  assert(spawner.activeMonsters.length === 10, `Spawner #${idx + 1} (${spawner.name}) tam 10 aktif canavara sahip`);
});

// Canavarların Spawner Bölgesi ve Gezinme Bilgileri
const sampleEnemy = party.enemyUnits[0];
assert(sampleEnemy.isOpenWorldMonster === true, 'Canavar Açık Dünya bayrağına sahip');
assert(sampleEnemy.homePosition !== undefined, 'Canavar yuva (spawner) konumuna sahip');
assert(sampleEnemy.territoryRadius > 0, `Canavar bölge sınırına sahip (Yarıçap: ${sampleEnemy.territoryRadius}px)`);


// 4. DUVAR ARKASI ŞİFA & MERMİ SALDIRI KISITLARI TESTLERİ
console.log('\n--- 4. Duvar Arkası Savaş ve Şifa Kısıtlama Testleri ---');

// Şifacı birim oluştur (Duvarın solunda)
const healer = new Unit({
  id: 991,
  name: 'Kam Bilge',
  classType: 'healer',
  x: testWall.x - 30,
  y: testWall.y + 40,
  attackRange: 650,
  maxHp: 200
});
healer.party = party;

// Yaralı müttefik birim oluştur (Duvarın sağında)
const woundedAlly = new Unit({
  id: 992,
  name: 'Alp Er',
  classType: 'guardian',
  x: testWall.x + testWall.w + 30,
  y: testWall.y + 40,
  maxHp: 200
});
woundedAlly.hp = 50; // Canı az
woundedAlly.party = party;

party.units = [healer, woundedAlly];
healer.performAutoHeal();
assert(woundedAlly.hp === 50, 'Duvar arkasındaki yaralı müttefike ŞİFA ATILAMADI (Engellendi)');

// Açık alandaki yaralı müttefik testi
woundedAlly.position.set(testWall.x - 60, testWall.y + 40); // Healer ile aynı tarafta
healer.performAutoHeal();
assert(woundedAlly.hp > 50, `Açık alandaki yaralı müttefik şifa aldı (Can: ${woundedAlly.hp})`);

// Mermi Duvara Çarpma Testi
const proj = new Projectile({
  x: testWall.x - 20,
  y: testWall.y + 30,
  targetPos: new Vector2D(testWall.x + testWall.w + 40, testWall.y + 30),
  speed: 400
});
proj.update(0.1, party); // Duvar üzerinden geçmeye çalış
assert(proj.isDead === true, 'Mermi duvara çarptığında yok oldu (Duvar arkasına geçemedi)');

// 5. HEDEF ÖLDÜKTEN SONRA MERMİNİN DİĞER DÜŞMANLARA HASAR VERMESİ TESTİ
console.log('\n--- 5. Hedef Öldükten Sonra Karşılaşılan Düşmana Hasar Verme Testi ---');

const primaryEnemy = new Unit({
  id: 881,
  name: 'İlk Düşman (Ölecek)',
  isEnemy: true,
  x: 500,
  y: 500,
  maxHp: 100
});
primaryEnemy.party = party;

const secondaryEnemy = new Unit({
  id: 882,
  name: 'İkinci Düşman (Mermi Rotasında)',
  isEnemy: true,
  x: 560,
  y: 500,
  maxHp: 100
});
secondaryEnemy.party = party;

party.enemyUnits = [primaryEnemy, secondaryEnemy];

// Okçudan ilk düşmana doğru ok fırlat
const arrow = new Projectile({
  sourceUnit: healer,
  targetUnit: primaryEnemy,
  x: 400,
  y: 500,
  damage: 40,
  speed: 400
});

// İlk düşman hedefe ok varmadan öldü
primaryEnemy.isDead = true;
primaryEnemy.hp = 0;

// Ok uçmaya devam ediyor ve ikinci düşmanın bulunduğu noktaya doğru ilerliyor
arrow.update(0.5, party);

assert(arrow.isDead === true, 'Ok ikinci düşmana çarptı ve infilak etti');
assert(secondaryEnemy.hp === 60, `İkinci düşman mermiden hasar aldı (Can: ${secondaryEnemy.hp}/100, Beklenen: 60)`);

console.log('\n========================================================');
if (failedTests === 0) {
  console.log('🎉 TÜM OPENWORLD TESTLERİ BAŞARIYLA GEÇTİ! 100% ÇALIŞIYOR.');
} else {
  console.error(`❌ ${failedTests} ADET TEST BAŞARISIZ OLDU!`);
  process.exit(1);
}
console.log('========================================================\n');
