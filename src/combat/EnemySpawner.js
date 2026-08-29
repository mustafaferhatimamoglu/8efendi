import { Unit } from '../entities/Unit.js';
import { Vector2D } from '../navigation/Vector2D.js';

export const ENEMY_TYPES = [
  {
    name: 'Bozkır Kurdu',
    title: 'Hızlı Yırtıcı',
    color: '#7f8c8d',
    radius: 12,
    maxHp: 90,
    speed: 3.6,
    attackPower: 12,
    attackRange: 26,
    attackSpeed: 1.0
  },
  {
    name: 'Kara Akıncı',
    title: 'Melee Piyade',
    color: '#95a5a6',
    radius: 14,
    maxHp: 180,
    speed: 2.8,
    attackPower: 20,
    attackRange: 32,
    attackSpeed: 1.0
  },
  {
    name: 'Gölge İblisi',
    title: 'Zırhlı Yaratık',
    color: '#34495e',
    radius: 18,
    maxHp: 320,
    speed: 2.2,
    attackPower: 28,
    attackRange: 36,
    attackSpeed: 1.0
  }
];

export class EnemySpawner {
  constructor(partyManager) {
    this.party = partyManager;
    this.spawnTimer = 0;
    this.spawnInterval = 3.0; // Her 3 saniyede bir yeni düşman grubu
    this.waveNumber = 1;
    this.active = true;
    this.nextEnemyId = 1000;

    // Spawner merkezi: Ekranın sağ-orta bölgesi
    this.spawnerPosition = new Vector2D(900, 320);
    this.pulseAnim = 0;
  }

  setCanvasSize(width, height) {
    this.spawnerPosition.set(width - 70, height / 2);
  }

  update(deltaTime) {
    if (!this.active) return;

    this.pulseAnim += deltaTime * 3;
    this.spawnTimer += deltaTime;

    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnWave();
    }
  }

  spawnWave() {
    // Hem Host hem de Solo modunda spawner çalışır (Bağlı client'lar ise Host'tan senkronize alır veya fallback olarak çalışır)
    const isMultiplayerClient = this.party.sync && this.party.sync.active && !this.party.isHost;
    if (isMultiplayerClient) return;

    const count = Math.min(2 + Math.floor(this.waveNumber / 3), 6);

    for (let i = 0; i < count; i++) {
      const typeIndex = Math.min(
        Math.floor(Math.random() * (1 + Math.floor(this.waveNumber / 4))),
        ENEMY_TYPES.length - 1
      );
      const template = ENEMY_TYPES[typeIndex];

      // Spawner etrafında hafif dağılım
      const offsetX = (Math.random() - 0.5) * 40;
      const offsetY = (Math.random() - 0.5) * 70;

      const enemy = new Unit({
        id: this.nextEnemyId++,
        name: template.name,
        title: template.title,
        classType: 'enemy_melee',
        color: template.color,
        radius: template.radius,
        maxHp: template.maxHp + (this.waveNumber * 10),
        maxEnergy: 50,
        speed: template.speed,
        attackPower: template.attackPower + (this.waveNumber * 2),
        attackRange: template.attackRange,
        attackSpeed: template.attackSpeed,
        isEnemy: true,
        x: this.spawnerPosition.x + offsetX,
        y: this.spawnerPosition.y + offsetY,
        facingAngle: Math.PI
      });

      enemy.party = this.party;
      this.party.enemyUnits.push(enemy);
    }

    this.waveNumber++;
  }

  render(ctx) {
    // Spawner Kapısı / Portalı (Görsel Efekt)
    ctx.save();
    ctx.translate(this.spawnerPosition.x, this.spawnerPosition.y);

    const pulseScale = 1 + Math.sin(this.pulseAnim) * 0.15;

    // Dış portal parıltısı
    const gradient = ctx.createRadialGradient(0, 0, 10, 0, 0, 36 * pulseScale);
    gradient.addColorStop(0, 'rgba(231, 76, 60, 0.8)');
    gradient.addColorStop(0.5, 'rgba(192, 57, 43, 0.4)');
    gradient.addColorStop(1, 'rgba(192, 57, 43, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 36 * pulseScale, 0, Math.PI * 2);
    ctx.fill();

    // Portal İç Çekirdeği
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 30 * pulseScale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Spawner Etiketi
    ctx.fillStyle = '#ff7675';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('👹 DÜŞMAN KAPISI', 0, -36);
    ctx.fillText(`Dalga: ${this.waveNumber}`, 0, 44);

    ctx.restore();
  }
}
