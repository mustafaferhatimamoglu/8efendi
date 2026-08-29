import { Unit } from '../entities/Unit.js';
import { Vector2D } from '../navigation/Vector2D.js';
import { EventBus } from '../core/EventBus.js';

/**
 * Kullanıcının Belirttiği 5 Özel Canavar Listesi
 */
export const SILKROAD_MONSTERS = [
  {
    key: 'chackji',
    name: 'Chackji',
    level: 10,
    color: '#27ae60',
    radius: 16,
    maxHp: 450,
    speed: 3.6,
    attackPower: 26,
    attackRange: 45,
    description: 'Mızraklı Kertenkele Savaşçı'
  },
  {
    key: 'tiger_girl',
    name: 'TigerGirl',
    level: 20,
    color: '#e67e22',
    radius: 19,
    maxHp: 850,
    speed: 4.0,
    attackPower: 38,
    attackRange: 50,
    description: 'Beyaz Kaplan Süvarisi Kaplan Kadın'
  },
  {
    key: 'siren',
    name: 'Siren',
    level: 30,
    color: '#3498db',
    radius: 18,
    maxHp: 1200,
    speed: 3.5,
    attackPower: 48,
    attackRange: 350,
    description: 'Büyülü Deniz Kızı Siren'
  },
  {
    key: 'lord_yarkan',
    name: 'LordYarkan',
    level: 40,
    color: '#e74c3c',
    radius: 22,
    maxHp: 1800,
    speed: 3.4,
    attackPower: 58,
    attackRange: 55,
    description: 'Devasa Taş Heykel Lord Yarkan'
  },
  {
    key: 'medusa',
    name: 'Medusa',
    level: 50,
    color: '#9b59b6',
    radius: 26,
    maxHp: 2500,
    speed: 3.8,
    attackPower: 70,
    attackRange: 65,
    description: 'Yılan Tanrıçası Medusa'
  }
];

export const OPENWORLD_SPAWNERS = [
  {
    id: 'spawner_chackji',
    name: 'Chackji Camp',
    subName: 'Chackji Vadisi',
    icon: '🦎',
    x: 3700,
    y: 2500,
    radius: 260,
    monsterKey: 'chackji',
    color: '#27ae60'
  },
  {
    id: 'spawner_tiger_girl',
    name: 'TigerGirl Mountain',
    subName: 'Kaplan Kadın Dağı',
    icon: '🐯',
    x: 1160,
    y: 1360,
    radius: 300,
    monsterKey: 'tiger_girl',
    color: '#e67e22'
  },
  {
    id: 'spawner_siren',
    name: 'Siren Swamp',
    subName: 'Siren Bataklığı',
    icon: '🧜‍♀️',
    x: 4100,
    y: 520,
    radius: 280,
    monsterKey: 'siren',
    color: '#3498db'
  },
  {
    id: 'spawner_lord_yarkan',
    name: 'LordYarkan Stronghold',
    subName: 'Lord Yarkan Kalesi',
    icon: '🗿',
    x: 1840,
    y: 2800,
    radius: 280,
    monsterKey: 'lord_yarkan',
    color: '#e74c3c'
  },
  {
    id: 'spawner_medusa',
    name: 'Medusa Temple',
    subName: 'Medusa Antik Tapınağı',
    icon: '🐍',
    x: 4160,
    y: 3100,
    radius: 280,
    monsterKey: 'medusa',
    color: '#9b59b6'
  }
];

export class OpenWorldSpawner {
  constructor(partyManager) {
    this.party = partyManager;
    this.spawners = OPENWORLD_SPAWNERS.map(s => ({
      ...s,
      position: new Vector2D(s.x, s.y),
      spawnTimer: 0,
      spawnInterval: 1.5,
      maxActiveMonsters: 10,
      maxKills: 20, // 20 canavar öldürülünce kamp temizlenir ve bir daha canavar doğurmaz!
      killCount: 0,
      totalSpawned: 0,
      isCleared: false,
      activeMonsters: [],
      pulseAnim: Math.random() * Math.PI * 2
    }));

    this.nextEnemyId = 5000;
    this.bossSpawned = false;
  }

  /**
   * Oyun başında her spawner için anında 10 canavarı doğurur.
   */
  initialSpawn() {
    this.spawners.forEach(spawner => {
      spawner.activeMonsters = [];
      spawner.killCount = 0;
      spawner.totalSpawned = 0;
      spawner.isCleared = false;

      for (let i = 0; i < spawner.maxActiveMonsters; i++) {
        this.spawnSingleMonster(spawner, true);
      }
    });
  }

  spawnSingleMonster(spawner, instantSpread = false) {
    // Eğer 20 canavar kotası bittiyse veya kamp temizlendiyse kesinlikle doğurma!
    if (spawner.isCleared || spawner.totalSpawned >= spawner.maxKills) {
      return;
    }

    const template = SILKROAD_MONSTERS.find(m => m.key === spawner.monsterKey) || SILKROAD_MONSTERS[0];

    // Spawner merkezi etrafında rastgele konum
    const angle = Math.random() * Math.PI * 2;
    const dist = instantSpread ? (Math.random() * (spawner.radius * 0.75)) : (Math.random() * 40);
    let spawnX = spawner.position.x + Math.cos(angle) * dist;
    let spawnY = spawner.position.y + Math.sin(angle) * dist;

    // Duvar içine doğmayı engelle
    if (this.party.mapManager && this.party.mapManager.isPointInsideWall(spawnX, spawnY, 15)) {
      spawnX = spawner.position.x;
      spawnY = spawner.position.y;
    }

    const isRanged = (template.attackRange > 200);

    const enemy = new Unit({
      id: this.nextEnemyId++,
      name: template.name,
      title: `[Lv.${template.level}] ${template.name}`,
      classType: isRanged ? 'mage' : 'enemy_melee',
      color: template.color,
      radius: template.radius,
      maxHp: template.maxHp,
      maxEnergy: 50,
      speed: template.speed,
      attackPower: template.attackPower,
      attackRange: template.attackRange,
      attackSpeed: 1.0,
      isEnemy: true,
      x: spawnX,
      y: spawnY,
      facingAngle: angle,
      spriteKey: template.key
    });

    // Açık Dünya Spawner ve Gezinme Bilgileri
    enemy.party = this.party;
    enemy.isOpenWorldMonster = true;
    enemy.spawnerId = spawner.id;
    enemy.homePosition = spawner.position.clone();
    enemy.territoryRadius = spawner.radius;
    enemy.wanderTarget = null;
    enemy.wanderWaitTimer = Math.random() * 2;
    enemy.monsterLevel = template.level;
    enemy.spriteKey = template.key;

    spawner.activeMonsters.push(enemy);
    spawner.totalSpawned++;
    this.party.enemyUnits.push(enemy);
  }

  onMonsterKilled(enemy) {
    if (!enemy || !enemy.spawnerId || enemy._killCounted) return;
    enemy._killCounted = true;

    const spawner = this.spawners.find(s => s.id === enemy.spawnerId);
    if (!spawner) return;

    spawner.killCount++;

    // 20 canavar öldürüldüyse bu kamp artık temizlenmiştir ve bir daha canavar doğurmaz!
    if (spawner.killCount >= spawner.maxKills && !spawner.isCleared) {
      spawner.isCleared = true;

      // Bildirim göster
      EventBus.emit('scores:updated', {
        aliveLocal: this.party.units.filter(u => !u.isDead).length,
        totalAllies: this.party.getAlliedUnits().filter(u => !u.isDead).length,
        enemyCount: this.party.enemyUnits.filter(u => !u.isDead).length,
        wave: `${this.getClearedCampsCount()}/5 Kamp`
      });

      if (window.engine && window.engine.uiManager) {
        window.engine.uiManager.showToast(`🎉 ${spawner.name} Kampı Temizlendi! (20/20 Canavar Yok Edildi)`, 'success');
      }

      // Bütün kamplar temizlendi mi?
      this.checkAllCampsCleared();
    }
  }

  getClearedCampsCount() {
    return this.spawners.filter(s => s.isCleared).length;
  }

  checkAllCampsCleared() {
    const allCleared = this.spawners.every(s => s.isCleared);
    if (allCleared && !this.bossSpawned) {
      this.bossSpawned = true;
      this.spawnWorldBoss();
    }
  }

  spawnWorldBoss() {
    // Supreme World Boss: Medusa Jangan Kalesi Batı Kapısı Önünde Belirir
    const boss = new Unit({
      id: 9999,
      name: 'Medusa',
      title: '👑 [Lv.50 Supreme Boss] Medusa',
      classType: 'mage',
      color: '#9b59b6',
      radius: 32,
      maxHp: 8000,
      maxEnergy: 500,
      speed: 4.5,
      attackPower: 80,
      attackRange: 450,
      attackSpeed: 1.2,
      isEnemy: true,
      x: 3680,
      y: 1520, // Jangan Kalesi Batı Kapısı Önü
      facingAngle: Math.PI,
      spriteKey: 'medusa'
    });

    boss.party = this.party;
    boss.isOpenWorldMonster = true;
    boss.homePosition = new Vector2D(3680, 1520);
    boss.territoryRadius = 500;
    boss.monsterLevel = 50;
    boss.spriteKey = 'medusa';

    this.party.enemyUnits.push(boss);

    if (window.engine && window.engine.uiManager) {
      window.engine.uiManager.showToast('👑 DİKKAT: Bütün 5 Kamp Temizlendi! Yılan Kraliçesi Medusa Jangan Kapısında Belirdi!', 'error');
    }
  }

  update(deltaTime) {
    this.spawners.forEach(spawner => {
      spawner.pulseAnim += deltaTime * 2.5;

      // Ölü canavarları listeden temizle
      spawner.activeMonsters = spawner.activeMonsters.filter(m => !m.isDead);

      // Eğer kamp temizlendiyse veya 20 canavar tamamlandıysa kesinlikle doğurma yapma!
      if (spawner.isCleared || spawner.killCount >= spawner.maxKills || spawner.totalSpawned >= spawner.maxKills) {
        spawner.spawnTimer = 0;
        return;
      }

      // Eğer 10'dan az aktif canavar varsa ve toplam 20 kotası dolmadıysa periyodik olarak yenisini doğur
      if (spawner.activeMonsters.length < spawner.maxActiveMonsters) {
        spawner.spawnTimer += deltaTime;
        if (spawner.spawnTimer >= spawner.spawnInterval) {
          spawner.spawnTimer = 0;
          this.spawnSingleMonster(spawner, false);
        }
      } else {
        spawner.spawnTimer = 0;
      }
    });
  }

  render(ctx) {
    this.spawners.forEach(spawner => {
      ctx.save();
      ctx.translate(spawner.position.x, spawner.position.y);

      const pulse = 1 + Math.sin(spawner.pulseAnim) * 0.12;

      // 1. Spawner Bölge Sınır Çemberi
      ctx.strokeStyle = spawner.isCleared ? '#2ecc7188' : `${spawner.color}55`;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, spawner.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Bölge Zemin Gölgelendirmesi
      const zoneGrad = ctx.createRadialGradient(0, 0, 20, 0, 0, spawner.radius);
      zoneGrad.addColorStop(0, spawner.isCleared ? 'rgba(46, 204, 113, 0.15)' : `${spawner.color}1c`);
      zoneGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = zoneGrad;
      ctx.beginPath();
      ctx.arc(0, 0, spawner.radius, 0, Math.PI * 2);
      ctx.fill();

      // 3. Merkez Portal Parıltısı
      const portalGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 45 * pulse);
      portalGrad.addColorStop(0, spawner.isCleared ? '#2ecc71dd' : `${spawner.color}dd`);
      portalGrad.addColorStop(0.5, spawner.isCleared ? '#2ecc7166' : `${spawner.color}66`);
      portalGrad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = portalGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 45 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // 4. Portal Çekirdeği
      ctx.fillStyle = spawner.isCleared ? '#2ecc71' : spawner.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 36 * pulse, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = spawner.isCleared ? '#ffffff' : '#f1c40f';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 5. Spawner Başlığı ve 20 Canavar Durumu
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 4;
      ctx.fillText(`${spawner.icon} ${spawner.name}`, 0, -45);

      if (spawner.isCleared) {
        ctx.fillStyle = '#2ecc71';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('✅ BÖLGE TEMİZLENDİ (20/20 Öldürüldü)', 0, 52);
      } else {
        const remainingKills = Math.max(0, spawner.maxKills - spawner.killCount);
        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`⚔️ Kalan Canavar: ${remainingKills} (${spawner.killCount}/20)`, 0, 48);

        ctx.fillStyle = spawner.activeMonsters.length >= spawner.maxActiveMonsters ? '#e74c3c' : '#2ecc71';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(`👹 ${spawner.activeMonsters.length} / 10 Aktif`, 0, 62);
      }

      ctx.restore();
    });
  }
}
