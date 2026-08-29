import { Vector2D } from '../navigation/Vector2D.js';
import { StateMachine } from '../fsm/StateMachine.js';
import { IdleState } from '../fsm/states/IdleState.js';
import { MoveState } from '../fsm/states/MoveState.js';
import { AttackState } from '../fsm/states/AttackState.js';
import { SkillState } from '../fsm/states/SkillState.js';
import { UnitClasses } from '../config/UnitDatabase.js';
import { AssetManager } from '../core/AssetManager.js';
import { Pathfinder } from '../navigation/Pathfinder.js';

export class Unit {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.title = config.title;
    this.classType = config.classType || UnitClasses.WARRIOR;
    this.color = config.color || '#3498db';
    this.radius = config.radius || 14;
    this.spriteKey = config.spriteKey || null;
    this.monsterLevel = config.monsterLevel || null;
    this.waypoints = [];
    this.isAggroed = false;
    this.aggroTarget = null;
    this.aggroTable = new Map(); // Oyuncu ID -> Tehdit (Aggro) Puanı

    // Takım ve Sahiplik
    this.teamId = config.teamId || 'player';
    this.ownerPeerId = config.ownerPeerId || null;
    this.isEnemy = config.isEnemy || false;

    // Statlar
    this.maxHp = config.maxHp || 200;
    this.hp = this.maxHp;
    this.maxEnergy = config.maxEnergy || 100;
    this.energy = this.maxEnergy;
    this.speed = config.speed || 3.0;
    this.maxForce = 0.4;
    this.attackPower = config.attackPower || 20;

    // Sınıfa göre menzil (Uzaktan vuranlar için 5 katına çıkarıldı)
    if (this.classType === UnitClasses.ARCHER) {
      this.attackRange = config.attackRange || 800; // Okçu 5x Menzil
    } else if (this.classType === UnitClasses.MAGE) {
      this.attackRange = config.attackRange || 750; // Büyücü 5x Menzil
    } else if (this.classType === UnitClasses.HEALER) {
      this.attackRange = config.attackRange || 650; // Şifacı 5x Şifa Menzili
    } else {
      this.attackRange = config.attackRange || 45; // Yakın dövüş (Muhafız / Canavar)
    }

    this.attackSpeed = 1.0; // Saniyede 1 vuruş (1.0s cooldown)
    this.attackCooldown = 0;
    this.skills = config.skills || [];
    this.description = config.description || '';

    // Muhafız (Guardian) Kalkan Yeteneği: Can %50 altındayken 5s boyunca %75 hasar koruması, 10s cooldown
    this.shieldActiveTimer = 0;
    this.shieldCooldown = 0;

    // Okçu (Archer) & Büyücü (Mage) Hızlı Atış Yeteneği:
    // 10 saniyede bir saldırı hızını 5 katına çıkaran 5 saniyelik buff (Cooldown 1.0s -> 0.2s)
    this.rapidFireActiveTimer = 0;
    this.rapidFireCooldown = 0;

    // Pozisyon ve Fizik
    this.position = new Vector2D(config.x || 100, config.y || 100);
    this.velocity = new Vector2D(0, 0);
    this.acceleration = new Vector2D(0, 0);
    this.facingAngle = config.facingAngle || (this.isEnemy ? Math.PI : 0);

    // Ağ enterpolasyonu (Uzak birimler için)
    this.targetInterpolation = null;

    // Hedef ve Seçim
    this.targetPosition = null;
    this.attackTarget = null;
    this.isSelected = false;
    this.isTargetedByHover = false;
    this.isDead = false;
    this.party = null;

    // Görsel Efekt sayaçları
    this.isAttackingAnim = 0;
    this.meleeHitboxTimer = 0; // Yakın dövüş 0.5s kırmızı hitbox FX
    this.damageFlash = 0;
    this.healBeamTarget = null;
    this.healBeamTimer = 0;
    this.floatingTexts = []; // Uçuşan hasar/şifa sayıları

    // FSM Kurulumu
    this.fsm = new StateMachine(this);
    this.fsm.addState('IDLE', new IdleState(this));
    this.fsm.addState('MOVE', new MoveState(this));
    this.fsm.addState('ATTACK', new AttackState(this));
    this.fsm.addState('SKILL', new SkillState(this));
    this.fsm.changeState('IDLE');
  }

  applyForce(force) {
    this.acceleration.add(force);
  }

  update(deltaTime) {
    // Uçuşan metinleri güncelle
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 25 * deltaTime;
      ft.alpha -= 1.2 * deltaTime;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    if (this.isDead) return;

    // Ağdan gelen uzak birim ise yumuşak pozisyon yaklaştırması yap
    if (this.targetInterpolation) {
      const dx = this.targetInterpolation.x - this.position.x;
      const dy = this.targetInterpolation.y - this.position.y;
      this.position.x += dx * Math.min(1, 15 * deltaTime);
      this.position.y += dy * Math.min(1, 15 * deltaTime);

      if (this.targetInterpolation.fsmState && this.fsm.getStateName() !== this.targetInterpolation.fsmState) {
        this.fsm.changeState(this.targetInterpolation.fsmState);
      }
    } else {
      // Yerel birim fizik simülasyonu
      this.fsm.update(deltaTime);

      this.velocity.add(this.acceleration);
      this.velocity.limit(this.speed);
      this.position.add(this.velocity);
      this.acceleration.set(0, 0);

      // Duvarlarla Çarpışma Çözümlemesi (Karakterler duvarların içinden geçemez!)
      if (this.party && this.party.mapManager) {
        this.party.mapManager.resolveCircleCollision(this.position, this.radius);
      }

      // Yön açısı güncelleme
      if (this.velocity.magSq() > 0.05) {
        this.facingAngle = this.velocity.heading();
      }
    }

    // Muhafız Kalkan Sürelerini Güncelle
    if (this.shieldActiveTimer > 0) {
      this.shieldActiveTimer -= deltaTime;
    }
    if (this.shieldCooldown > 0) {
      this.shieldCooldown -= deltaTime;
    }

    // Okçu & Büyücü Seri Atış Sürelerini Güncelle
    if (this.rapidFireActiveTimer > 0) {
      this.rapidFireActiveTimer -= deltaTime;
    }
    if (this.rapidFireCooldown > 0) {
      this.rapidFireCooldown -= deltaTime;
    }

    // Muhafız Can Kontrolü (%50 altına indiğinde otomatik kalkan tetikleme)
    if (this.classType === UnitClasses.GUARDIAN && !this.isDead) {
      if (this.hp <= this.maxHp * 0.5 && this.shieldCooldown <= 0) {
        this.activateGuardianShield();
      }
    }

    // Okçu & Büyücü 10 saniyede bir otomatik Seri Saldırı Skill Kontrolü
    if ((this.classType === UnitClasses.ARCHER || this.classType === UnitClasses.MAGE) && !this.isDead && !this.isEnemy) {
      if (this.rapidFireCooldown <= 0) {
        this.activateRapidFire();
      }
    }

    // Otomatik Savaş & Şifacı Döngüsü
    this.updateCombatLoop(deltaTime);

    // Görsel efekt sayaçları
    if (this.isAttackingAnim > 0) this.isAttackingAnim -= deltaTime;
    if (this.meleeHitboxTimer > 0) this.meleeHitboxTimer -= deltaTime;
    if (this.damageFlash > 0) this.damageFlash -= deltaTime;
    if (this.healBeamTimer > 0) {
      this.healBeamTimer -= deltaTime;
      if (this.healBeamTimer <= 0) this.healBeamTarget = null;
    }
  }

  activateGuardianShield() {
    this.shieldActiveTimer = 5.0; // 5 saniye boyunca %75 hasar koruması
    this.shieldCooldown = 5.0;    // 5 saniye bekleme süresi (5s cooldown)
    this.floatingTexts.push({
      text: '🛡️ ÇELİK KALKAN!',
      color: '#f1c40f',
      x: this.position.x,
      y: this.position.y - this.radius - 22,
      alpha: 1.2
    });
  }

  activateRapidFire() {
    this.rapidFireActiveTimer = 5.0; // 5 saniye boyunca saldırı hızı 5 katına çıkar
    this.rapidFireCooldown = 10.0;   // 10 saniye bekleme süresi
    const skillName = this.classType === UnitClasses.ARCHER ? '🏹 SERİ OK YAĞMURU (5x HIZ)!' : '🔥 KIZIL KASIRGA (5x HIZ)!';
    this.floatingTexts.push({
      text: skillName,
      color: this.classType === UnitClasses.ARCHER ? '#2ecc71' : '#e67e22',
      x: this.position.x,
      y: this.position.y - this.radius - 22,
      alpha: 1.2
    });
  }

  /**
   * Otomatik Saldırı ve Şifa Döngüsü
   */
  updateCombatLoop(deltaTime) {
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime;
    }

    if (!this.party) return;

    // Şifacı Sınıfı: Otomatik Canı En Düşük Takım Arkadaşını İyileştirme
    if (this.classType === UnitClasses.HEALER) {
      if (this.attackCooldown <= 0) {
        this.performAutoHeal();
      }
      return;
    }

    // Saldırı Sınıfları: Düşman Tarama ve Otomatik Saldırı (Menzilde ise)
    if (this.isEnemy) {
      this.performEnemyBehavior(deltaTime);
    } else {
      if (this.attackCooldown <= 0) {
        this.performPlayerAttack();
      }
    }
  }

  /**
   * Şifacı: Kendini ve müttefiklerini otomatik iyileştirir.
   */
  performAutoHeal() {
    const allies = this.party.getAlliedUnits();
    let lowestTarget = null;
    let lowestHpPercent = 1.0;

    allies.forEach(ally => {
      if (!ally.isDead) {
        const isSelf = (ally === this);
        const dist = isSelf ? 0 : this.position.dist(ally.position);

        if (dist <= this.attackRange) {
          // Duvar arkası kontrolü (kendi için LoS kontrolüne gerek yok)
          if (!isSelf && this.party.mapManager && !this.party.mapManager.hasLineOfSight(this.position, ally.position)) {
            return;
          }

          const hpPercent = ally.hp / ally.maxHp;
          if (hpPercent < lowestHpPercent && hpPercent < 0.95) {
            lowestHpPercent = hpPercent;
            lowestTarget = ally;
          }
        }
      }
    });

    if (lowestTarget) {
      const healAmount = 70;
      lowestTarget.heal(healAmount);
      this.healBeamTarget = lowestTarget;
      this.healBeamTimer = 0.3;
      this.attackCooldown = 0.5; // 0.5s Cooldown
      if (lowestTarget !== this) {
        this.facingAngle = Vector2D.sub(lowestTarget.position, this.position).heading();
      }
    }
  }

  /**
   * Oyuncu Birimi Saldırısı: Duvar arkasındaki hedeflere ateş edilemez!
   */
  performPlayerAttack() {
    const enemies = this.party.getEnemyUnits();
    let closestEnemy = null;
    let minDist = this.attackRange;

    // Manuel hedef seçilmişse ve duvar arkasında değilse
    if (this.attackTarget && !this.attackTarget.isDead) {
      const d = this.position.dist(this.attackTarget.position);
      const hasLOS = !this.party.mapManager || this.party.mapManager.hasLineOfSight(this.position, this.attackTarget.position);
      if (d <= this.attackRange && hasLOS) {
        closestEnemy = this.attackTarget;
      }
    }

    if (!closestEnemy) {
      enemies.forEach(enemy => {
        if (!enemy.isDead) {
          const d = this.position.dist(enemy.position);
          if (d <= minDist) {
            // Duvar arkasında mı kontrol et
            if (this.party.mapManager && !this.party.mapManager.hasLineOfSight(this.position, enemy.position)) {
              return; // Duvar arkasındaki düşmana ateş edilemez!
            }
            minDist = d;
            closestEnemy = enemy;
          }
        }
      });
    }

    if (closestEnemy) {
      this.executeClassAttack(closestEnemy);

      // Saldırı bekleme süresi hesaplama:
      if ((this.classType === UnitClasses.ARCHER || this.classType === UnitClasses.MAGE) && this.rapidFireActiveTimer > 0) {
        this.attackCooldown = 0.2; // 5x Saldırı Hızı
      } else {
        this.attackCooldown = 1.0; // Normal Hız
      }
    }
  }

  /**
   * Düşman Canavar Davranışı (OpenWorld Gezinme & Standart Saldırı)
   */
  performEnemyBehavior(deltaTime) {
    // 1. Açık Dünya Canavarı ise: Kendi Spawner Bölgesinde Gezinme (Wander) & Bölge Koruma
    if (this.isOpenWorldMonster && this.homePosition) {
      this.performOpenWorldMonsterAI(deltaTime);
      return;
    }

    // 2. Standart Dalga Modu Canavar Saldırısı
    if (this.attackCooldown <= 0) {
      this.performEnemyAttack();
    }
  }

  /**
   * En yüksek tehdit (aggro) üreten canlı oyuncu karakterini seçer.
   */
  getHighestAggroTarget(allies) {
    let highestTarget = null;
    let maxAggro = -1;

    for (const [unitId, aggro] of this.aggroTable.entries()) {
      const ally = allies.find(a => a.id === unitId && !a.isDead);
      if (ally && aggro > maxAggro) {
        maxAggro = aggro;
        highestTarget = ally;
      }
    }

    return highestTarget;
  }

  /**
   * Açık Dünya Canavarı Yapay Zekası:
   * - En çok aggro üreten oyuncu karakterini hedefler ve kovalar (No Area Limit).
   * - Hasar almamışken kendi spawner bölgesinde gezinir (Wander).
   */
  performOpenWorldMonsterAI(deltaTime) {
    const allies = this.party.getAlliedUnits().filter(a => !a.isDead);
    if (allies.length === 0) {
      this.velocity.mult(0.2);
      return;
    }

    // 1. HASAR ALMIŞ / AGGRO OLMUŞ CANAVAR:
    // Canavar kendisine en çok hasar/tehdit (aggro) üreten oyuncuya saldırır!
    if (this.isAggroed) {
      const highestAggroUnit = this.getHighestAggroTarget(allies);

      if (highestAggroUnit) {
        this.aggroTarget = highestAggroUnit;
      } else if (!this.aggroTarget || this.aggroTarget.isDead) {
        let closestAlly = null;
        let minDistSq = Infinity;
        allies.forEach(ally => {
          const dSq = this.position.distSq(ally.position);
          if (dSq < minDistSq) {
            minDistSq = dSq;
            closestAlly = ally;
          }
        });
        this.aggroTarget = closestAlly;
      }

      if (this.aggroTarget && !this.aggroTarget.isDead) {
        const dist = this.position.dist(this.aggroTarget.position);

        if (dist <= this.attackRange) {
          if (this.attackCooldown <= 0) {
            this.executeClassAttack(this.aggroTarget);
            this.attackCooldown = 1.0;
          }
          this.velocity.mult(0.2);
        } else {
          // Alan sınırı olmaksızın en yüksek aggro'ya sahip oyuncuyu kovalar!
          const dir = Vector2D.sub(this.aggroTarget.position, this.position);
          dir.normalize();
          this.velocity = dir.mult(this.speed);
          this.facingAngle = dir.heading();
        }
        return;
      }
    }

    // 2. HASAR ALMAMIŞ SAKİN MOD (Bölge koruma & gezinme)
    let targetAlly = null;
    let minDist = 300; // Görüş menzili

    allies.forEach(ally => {
      const d = this.position.dist(ally.position);
      if (d < minDist) {
        if (!this.party.mapManager || this.party.mapManager.hasLineOfSight(this.position, ally.position)) {
          minDist = d;
          targetAlly = ally;
        }
      }
    });

    const distFromHome = this.position.dist(this.homePosition);
    if (targetAlly && distFromHome < this.territoryRadius + 150) {
      if (minDist <= this.attackRange) {
        if (this.attackCooldown <= 0) {
          this.executeClassAttack(targetAlly);
          this.attackCooldown = 1.0;
        }
        this.velocity.mult(0.2);
      } else {
        const dir = Vector2D.sub(targetAlly.position, this.position);
        dir.normalize();
        this.velocity = dir.mult(this.speed);
        this.facingAngle = dir.heading();
      }
      return;
    }

    // Bölgesine geri dön
    if (distFromHome > this.territoryRadius) {
      const returnDir = Vector2D.sub(this.homePosition, this.position);
      returnDir.normalize();
      this.velocity = returnDir.mult(this.speed * 0.7);
      this.facingAngle = returnDir.heading();
      return;
    }

    // Sakin Gezinme (Wander)
    if (this.wanderWaitTimer > 0) {
      this.wanderWaitTimer -= deltaTime;
      this.velocity.mult(0.4);
      return;
    }

    if (!this.wanderTarget || this.position.dist(this.wanderTarget) < 20) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * (this.territoryRadius * 0.85);
      const wx = this.homePosition.x + Math.cos(angle) * r;
      const wy = this.homePosition.y + Math.sin(angle) * r;

      if (!this.party.mapManager || !this.party.mapManager.isPointInsideWall(wx, wy, 20)) {
        this.wanderTarget = new Vector2D(wx, wy);
      } else {
        this.wanderTarget = this.homePosition.clone();
      }
      this.wanderWaitTimer = 1.5 + Math.random() * 2.5;
    } else {
      const dir = Vector2D.sub(this.wanderTarget, this.position);
      dir.normalize();
      this.velocity = dir.mult(this.speed * 0.45);
      this.facingAngle = dir.heading();
    }
  }

  performEnemyAttack() {
    const allies = this.party.getAlliedUnits().filter(a => !a.isDead);
    if (allies.length === 0) return;

    let target = this.getHighestAggroTarget(allies);
    let minDist = Infinity;

    if (!target) {
      allies.forEach(ally => {
        const d = this.position.dist(ally.position);
        if (d < minDist) {
          minDist = d;
          target = ally;
        }
      });
    } else {
      minDist = this.position.dist(target.position);
    }

    if (target) {
      if (minDist <= this.attackRange) {
        this.executeClassAttack(target);
        this.attackCooldown = 1.0;
        this.velocity.mult(0.2);
      } else {
        const dir = Vector2D.sub(target.position, this.position);
        dir.normalize();
        this.velocity = dir.mult(this.speed);
        this.facingAngle = dir.heading();
      }
    }
  }

  executeClassAttack(target) {
    if (!target || target.isDead) return;

    this.facingAngle = Vector2D.sub(target.position, this.position).heading();
    this.isAttackingAnim = 0.2;

    if (this.classType === UnitClasses.ARCHER) {
      // Okçu: Görünür Ok Fırlat
      if (this.party && this.party.projectiles) {
        this.party.projectiles.spawnArrow(this, target, this.attackPower);
      }
    } else if (this.classType === UnitClasses.MAGE) {
      // Büyücü: Alev Topu Fırlat
      if (this.party && this.party.projectiles) {
        this.party.projectiles.spawnFireball(this, target, this.attackPower);
      }
    } else {
      // Yakın Dövüşçüler (Muhafız / Canavar):
      this.meleeHitboxTimer = 0.5;

      if (this.classType === UnitClasses.GUARDIAN) {
        // Muhafız: Vurduğu etki alanındaki (menzildeki) BÜTÜN düşmanlara hasar ver ve hepsini ittir!
        const enemies = this.party.getEnemyUnits();
        const areaRadius = this.attackRange + 15; // Hitbox alanı içindeki tüm düşmanlar

        enemies.forEach(enemy => {
          if (!enemy.isDead && this.position.dist(enemy.position) <= areaRadius) {
            enemy.takeDamage(this.attackPower, this, true);

            // Bütün düşmanları geriye fırlat / ittir
            const knockbackDir = Vector2D.sub(enemy.position, this.position);
            knockbackDir.normalize();
            const knockbackDist = 55; // 55px güçlü geri savurma
            enemy.position.x += knockbackDir.x * knockbackDist;
            enemy.position.y += knockbackDir.y * knockbackDist;
            enemy.velocity.set(knockbackDir.x * 7, knockbackDir.y * 7);
          }
        });
      } else {
        target.takeDamage(this.attackPower, this, true);
      }
    }
  }

  moveTo(targetPos) {
    this.attackTarget = null;
    this.targetInterpolation = null;

    // Duvarların etrafından dolaşan en kısa yol noktalarını (Waypoints) hesapla
    if (this.party && this.party.mapManager) {
      this.waypoints = Pathfinder.findPath(this.position, targetPos, this.party.mapManager, this.radius);
    } else {
      this.waypoints = [targetPos.clone()];
    }

    this.targetPosition = this.waypoints.length > 0 ? this.waypoints[0] : targetPos.clone();

    if (this.fsm.getStateName() !== 'MOVE') {
      this.fsm.changeState('MOVE');
    }
  }

  attack(targetUnit) {
    if (!targetUnit || targetUnit.isDead) return;
    this.attackTarget = targetUnit;
    this.fsm.changeState('ATTACK', { target: targetUnit });
  }

  takeDamage(amount, sourceUnit = null, broadcast = true) {
    if (this.isDead) return;

    // Muhafız Kalkanı Aktifse Hasarı %75 Azalt (Sadece %25 Hasar Alır)
    let finalDamage = amount;
    if (this.classType === UnitClasses.GUARDIAN && this.shieldActiveTimer > 0) {
      finalDamage = amount * 0.25;
    }

    this.hp = Math.max(0, this.hp - finalDamage);
    this.damageFlash = 0.25;

    // Uçuşan hasar yazısı
    this.floatingTexts.push({
      text: `-${Math.round(finalDamage)}${this.shieldActiveTimer > 0 ? ' (Zırh)' : ''}`,
      color: this.shieldActiveTimer > 0 ? '#f39c12' : '#ff4757',
      x: this.position.x + (Math.random() * 14 - 7),
      y: this.position.y - this.radius - 16,
      alpha: 1.0
    });

    // Bir canavar oyuncudan hasar aldığında (Tehdit / Aggro Hesabı):
    // 1 Hasar = 1 Aggro
    // Tank / Muhafız (Guardian) karakterler verdikleri hasarın 10 katı (10x) aggro üretir!
    if (this.isEnemy && sourceUnit && !sourceUnit.isEnemy) {
      this.isAggroed = true;

      const isTank = (sourceUnit.classType === UnitClasses.GUARDIAN);
      const aggroGenerated = finalDamage * (isTank ? 10 : 1);

      const currentAggro = (this.aggroTable.get(sourceUnit.id) || 0) + aggroGenerated;
      this.aggroTable.set(sourceUnit.id, currentAggro);

      // O kamptaki BÜTÜN canavarları anında uyar ve oyuncuya saldırt!
      if (this.spawnerId && this.party && this.party.enemyUnits) {
        const campMonsters = this.party.enemyUnits.filter(e => e.spawnerId === this.spawnerId && !e.isDead);
        campMonsters.forEach(e => {
          e.isAggroed = true;
          if (!e.aggroTable.has(sourceUnit.id)) {
            e.aggroTable.set(sourceUnit.id, aggroGenerated * 0.5);
          }
          e.wanderTarget = null;
          e.wanderWaitTimer = 0;
        });
      }
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      this.fsm.changeState('IDLE');
      if (this.party) {
        if (this.isEnemy && this.party.spawner && typeof this.party.spawner.onMonsterKilled === 'function') {
          this.party.spawner.onMonsterKilled(this);
        }
        this.party.checkTeamStatus();
      }
    }
  }

  heal(amount) {
    if (this.isDead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.floatingTexts.push({
      text: `+${Math.round(amount)}`,
      color: '#2ed573',
      x: this.position.x,
      y: this.position.y - this.radius - 16,
      alpha: 1.0
    });
  }

  render(ctx) {
    // Uçuşan hasar/şifa sayıları
    this.floatingTexts.forEach(ft => {
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });

    // Şifacı Işını ve Kendini İyileştirme Halesi (Healing Beam & Self-Heal Aura FX)
    if (this.healBeamTarget && !this.healBeamTarget.isDead && this.healBeamTimer > 0) {
      ctx.save();
      const alpha = Math.max(0, this.healBeamTimer / 0.3);
      if (this.healBeamTarget === this) {
        ctx.strokeStyle = `rgba(46, 204, 113, ${alpha})`;
        ctx.fillStyle = `rgba(46, 204, 113, ${alpha * 0.25})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius + 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.strokeStyle = `rgba(46, 204, 113, ${alpha})`;
        ctx.lineWidth = 3 * alpha;
        ctx.beginPath();
        ctx.moveTo(this.position.x, this.position.y);
        ctx.lineTo(this.healBeamTarget.position.x, this.healBeamTarget.position.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (this.isDead) {
      // Ölü birim simgesi
      ctx.save();
      ctx.translate(this.position.x, this.position.y);
      ctx.fillStyle = 'rgba(80, 80, 80, 0.4)';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.8, 0, Math.PI * 2);
      ctx.fill();

      // X işareti
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-5, -5);
      ctx.lineTo(5, 5);
      ctx.moveTo(5, -5);
      ctx.lineTo(-5, 5);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Muhafız Kalkan Efekti (Altın Sarısı Koruma Çemberi)
    if (this.shieldActiveTimer > 0) {
      ctx.save();
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.radius + 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(241, 196, 15, 0.18)';
      ctx.fill();
      ctx.restore();
    }

    // Okçu & Büyücü Hızlı Atış Efekti (Yeşil/Ateş Işıltısı Çemberi)
    if (this.rapidFireActiveTimer > 0) {
      ctx.save();
      ctx.strokeStyle = this.classType === UnitClasses.ARCHER ? '#2ecc71' : '#e67e22';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.radius + 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Yakın Dövüş Hitbox FX (0.5 sn boyunca hafif saydam kırmızı etki alanı)
    if (this.meleeHitboxTimer > 0) {
      ctx.save();
      ctx.translate(this.position.x, this.position.y);
      ctx.rotate(this.facingAngle);

      const alpha = (this.meleeHitboxTimer / 0.5) * 0.35;
      ctx.fillStyle = `rgba(231, 76, 60, ${alpha})`;
      ctx.strokeStyle = `rgba(231, 76, 60, ${alpha * 2})`;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, this.attackRange + 15, -0.65, 0.65);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.position.x, this.position.y);

    // Seçim Halkası (Dost birimler için yeşil)
    if (this.isSelected) {
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Takım Rozeti / Dış Halka
    ctx.strokeStyle = this.isEnemy ? (this.color || 'rgba(231, 76, 60, 0.8)') : 'rgba(52, 152, 219, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 1, 0, Math.PI * 2);
    ctx.stroke();

    // Canavar Resim Render'ı (Silkroad Monster Sprite)
    let spriteRendered = false;
    if (this.isEnemy && this.spriteKey) {
      const spriteImg = AssetManager.getInstance().getImage(this.spriteKey);
      if (spriteImg && spriteImg.complete && spriteImg.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(spriteImg, -this.radius, -this.radius, this.radius * 2, this.radius * 2);

        if (this.damageFlash > 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.fill();
        }
        ctx.restore();
        spriteRendered = true;
      }
    }

    if (!spriteRendered) {
      // Standart Karakter Gövdesi
      ctx.fillStyle = this.damageFlash > 0 ? '#ffffff' : this.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dış Hat
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Yön Göstergesi
    ctx.rotate(this.facingAngle);
    ctx.fillStyle = this.isEnemy ? '#e74c3c' : '#f1c40f';
    ctx.beginPath();
    ctx.moveTo(this.radius - 2, -3);
    ctx.lineTo(this.radius + 5, 0);
    ctx.lineTo(this.radius - 2, 3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Can Barı ve İsim/Seviye Etiketi
    this.renderHealthBar(ctx);
  }

  renderHealthBar(ctx) {
    if (this.isDead) return;
    const barWidth = this.isEnemy ? 38 : 32;
    const barHeight = 4;
    const barX = this.position.x - barWidth / 2;
    const barY = this.position.y - this.radius - 10;

    // Düşman İsim & Seviye Etiketi (Silkroad MMO Stili)
    if (this.isEnemy && this.name) {
      ctx.save();
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      const labelText = this.monsterLevel ? `[Lv.${this.monsterLevel}] ${this.name}` : this.name;
      
      // Yazı arka plan gölgesi
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      const textWidth = ctx.measureText(labelText).width;
      ctx.fillRect(this.position.x - textWidth / 2 - 3, barY - 14, textWidth + 6, 11);

      ctx.fillStyle = this.color || '#ff4757';
      ctx.fillText(labelText, this.position.x, barY - 5);
      ctx.restore();
    }

    // Arka plan
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

    // HP Barı
    const hpRatio = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = this.isEnemy
      ? '#e74c3c'
      : (this.shieldActiveTimer > 0 ? '#f1c40f' : (hpRatio > 0.5 ? '#2ecc71' : hpRatio > 0.25 ? '#f39c12' : '#e74c3c'));
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
  }
}
