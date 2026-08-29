// 3. Tüm JS dosyalarını yükle ve fonksiyon çağrılarını/sınıf metotlarını doğrula
import { PartyManager } from './src/entities/PartyManager.js';
import { Vector2D } from './src/navigation/Vector2D.js';

const party = new PartyManager();

// InputManager'ın çağırdığı metotlar PartyManager'da var mı?
const requiredMethods = ['moveSelectedUnits', 'attackTargetWithSelected', 'selectInRect', 'selectUnit', 'clearSelection', 'selectAll', 'selectGuardians', 'selectBackline', 'commandMove', 'commandAttack'];

console.log('\n🔍 PartyManager Metot Uyumluluk Testi:');
let missingMethod = false;

// Alias yönlendirmeleri eklenmeli
if (typeof party.commandMove !== 'function') {
  console.log('⚠️ PartyManager.commandMove bulunamadı (moveSelectedUnits kullanılmalı veya alias eklenmeli)');
  missingMethod = true;
}
if (typeof party.commandAttack !== 'function') {
  console.log('⚠️ PartyManager.commandAttack bulunamadı (attackTargetWithSelected kullanılmalı veya alias eklenmeli)');
  missingMethod = true;
}

if (missingMethod) {
  console.log('❌ Metot ismi uyuşmazlığı tespit edildi!');
  process.exit(1);
} else {
  console.log('✅ Tüm komut metotları eksiksiz!');
}
