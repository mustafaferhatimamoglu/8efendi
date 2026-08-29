import fs from 'fs';
import path from 'path';

console.log('--- 8EFENDİ SİSTEM VE MODÜL SAĞLIK TESTİ BAŞLIYOR ---');

const srcDir = './src';

// 1. Tüm JS dosyalarını tara ve Sözdizimi / Dairesel İçe Aktarma Hatalarını Kontrol Et
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.js')) {
      arrayOfFiles.push(fullPath);
    }
  });
  return arrayOfFiles;
}

const jsFiles = getAllFiles(srcDir);
let hasError = false;

jsFiles.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);

  // Kendi kendini import etme kontrolü
  const selfImportRegex = new RegExp(`from\\s+['"]\\.\\/${fileName}['"]`, 'i');
  if (selfImportRegex.test(content)) {
    console.error(`❌ HATA: [${filePath}] kendi kendini içe aktarıyor (Self-Import Hatası)!`);
    hasError = true;
  }

  // İçe aktarılan dosyaların varlık kontrolü
  const importRegex = /from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importedRelPath = match[1];
    if (importedRelPath.startsWith('.')) {
      const resolvedPath = path.resolve(path.dirname(filePath), importedRelPath);
      if (!fs.existsSync(resolvedPath)) {
        console.error(`❌ HATA: [${filePath}] bulunamayan bir modülü çağırıyor: ${importedRelPath}`);
        hasError = true;
      }
    }
  }
});

// 2. Modülleri Dinamik İçe Aktararak Çalıştırılabilirlik Testi (Smoke Test)
async function testModuleImports() {
  console.log('\n📦 Modül Yükleme ve Başlatma Testleri:');
  try {
    const { Vector2D } = await import('./src/navigation/Vector2D.js');
    const v = new Vector2D(10, 20);
    if (v.x !== 10 || v.y !== 20) throw new Error('Vector2D matematik hatası');
    console.log('  ✅ Vector2D: Tamam');

    const { EFENDI_DATA, UnitClasses } = await import('./src/config/UnitDatabase.js');
    if (!EFENDI_DATA || EFENDI_DATA.length !== 8) throw new Error('EFENDI_DATA 8 karakter içermiyor');
    console.log('  ✅ UnitDatabase (8 Karakter): Tamam');

    const { ProjectileManager } = await import('./src/combat/ProjectileManager.js');
    const pm = new ProjectileManager();
    if (!pm.projectiles) throw new Error('ProjectileManager başlatılamadı');
    console.log('  ✅ ProjectileManager: Tamam');

    const { EnemySpawner } = await import('./src/combat/EnemySpawner.js');
    console.log('  ✅ EnemySpawner: Tamam');

    const { MultiplayerSync } = await import('./src/network/MultiplayerSync.js');
    console.log('  ✅ MultiplayerSync: Tamam');

    const { NetworkManager } = await import('./src/network/NetworkManager.js');
    console.log('  ✅ NetworkManager: Tamam');

    const { Unit } = await import('./src/entities/Unit.js');
    const testUnit = new Unit(EFENDI_DATA[0]);
    if (!testUnit.fsm) throw new Error('Unit FSM başlatılamadı');
    console.log('  ✅ Unit & FSM: Tamam');

    const { PartyManager } = await import('./src/entities/PartyManager.js');
    const party = new PartyManager();
    if (party.getAllUnits().length !== 8) throw new Error('Party 8 efendi oluşturamadı');
    console.log('  ✅ PartyManager: Tamam');

  } catch (err) {
    console.error(`\n❌ MODÜL TESTİNDE ÇÖKME OLUŞTU:`, err);
    process.exit(1);
  }
}

testModuleImports().then(() => {
  if (hasError) {
    console.error('\n❌ TESTLER BAŞARISIZ OLDU! Lütfen hataları giderin.');
    process.exit(1);
  } else {
    console.log('\n🎉 TÜM TESTLER BAŞARIYLA GEÇTİ! Sistem hatasız çalışıyor.\n');
  }
});
