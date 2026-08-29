import { Vector2D } from '../navigation/Vector2D.js';
import { StateMachine } from '../fsm/StateMachine.js';
import { IdleState } from '../fsm/states/IdleState.js';
import { MoveState } from '../fsm/states/MoveState.js';
import { AttackState } from '../fsm/states/AttackState.js';
import { SkillState } from '../fsm/states/SkillState.js';
import { UnitClasses } from '../config/UnitDatabase.js';

export class Unit {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.title = config.title;
    this.classType = config.classType || UnitClasses.WARRIOR;
    this.color = config.color || '#3498db';
    this.radius = config.radius || 14;

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
    this.shieldCooldown = 10.0;   // 10 saniye bekleme süresi
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
    if (this.attackCooldown <= 0) {
      if (this.isEnemy) {
        this.performEnemyAttack();
      } else {
        this.performPlayerAttack();
      }
    }
  }

  performAutoHeal() {
    const allies = this.party.getAlliedUnits();
    let lowestAlly = null;
    let lowestHpPercent = 1.0;

    allies.forEach(ally => {
      if (!ally.isDead) {
        const dist = this.position.dist(ally.position);
        if (dist <= this.attackRange) {
          const hpPercent = ally.hp / ally.maxHp;
          if (hpPercent < lowestHpPercent && hpPercent < 0.95) {
            lowestHpPercent = hpPercent;
            lowestAlly = ally;
          }
        }
      }
    });

    if (lowestAlly) {
      const healAmount = 70;
      lowestAlly.heal(healAmount);
      this.healBeamTarget = lowestAlly;
      this.healBeamTimer = 0.3;
      this.attackCooldown = 0.5; // 0.5s Cooldown
      this.facingAngle = Vector2D.sub(lowestAlly.position, this.position).heading();
    }
  }

  performPlayerAttack() {
    const enemies = this.party.getEnemyUnits();
    let closestEnemy = null;
    let minDist = this.attackRange;

    // Eğer manuel hedef seçilmişse onu önceliklendir
    if (this.attackTarget && !this.attackTarget.isDead && this.position.dist(this.attackTarget.position) <= this.attackRange) {
      closestEnemy = this.attackTarget;
    } else {
      enemies.forEach(enemy => {
        if (!enemy.isDead) {
          const d = this.position.dist(enemy.position);
          if (d <= minDist) {
            minDist = d;
            closestEnemy = enemy;
          }
        }
      });
    }

    if (closestEnemy) {
      this.executeClassAttack(closestEnemy);

      // Saldırı bekleme süresi hesaplama:
      // Okçu veya Büyücü Seri Atış (Rapid Fire) modundaysa saldırı hızı 5 kat artar (1.0s / 5 = 0.2s)
      if ((this.classType === UnitClasses.ARCHER || this.classType === UnitClasses.MAGE) && this.rapidFireActiveTimer > 0) {
        this.attackCooldown = 0.2; // 5x Saldırı Hızı
      } else {
        this.attackCooldown = 1.0; // Normal Hız
      }
    }
  }

  performEnemyAttack() {
    const allies = this.party.getAlliedUnits();
    let closestAlly = null;
    let minDist = Infinity;

    allies.forEach(ally => {
      if (!ally.isDead) {
        const d = this.position.dist(ally.position);
        if (d < minDist) {
          minDist = d;
          closestAlly = ally;
        }
      }
    });

    if (closestAlly) {
      if (minDist <= this.attackRange) {
        this.executeClassAttack(closestAlly);
        this.attackCooldown = 1.0;
        this.velocity.mult(0.2);
      } else {
        const dir = Vector2D.sub(closestAlly.position, this.position);
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
    this.targetPosition = targetPos.clone();
    this.attackTarget = null;
    this.targetInterpolation = null;
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

    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      this.fsm.changeState('IDLE');
      if (this.party) {
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

    // Şifacı Işını (Healing Beam FX)
    if (this.healBeamTarget && !this.healBeamTarget.isDead && this.healBeamTimer > 0) {
      ctx.save();
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 3 * (this.healBeamTimer / 0.3);
      ctx.beginPath();
      ctx.moveTo(this.position.x, this.position.y);
      ctx.lineTo(this.healBeamTarget.position.x, this.healBeamTarget.position.y);
      ctx.stroke();
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
    ctx.strokeStyle = this.isEnemy ? 'rgba(231, 76, 60, 0.8)' : 'rgba(52, 152, 219, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 1, 0, Math.PI * 2);
    ctx.stroke();

    // Karakter Gövdesi
    ctx.fillStyle = this.damageFlash > 0 ? '#ffffff' : this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Dış Hat
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;
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

    // Can Barı
    this.renderHealthBar(ctx);
  }

  renderHealthBar(ctx) {
    if (this.isDead) return;
    const barWidth = 32;
    const barHeight = 4;
    const barX = this.position.x - barWidth / 2;
    const barY = this.position.y - this.radius - 12;

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
