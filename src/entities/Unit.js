import { Vector2D } from '../navigation/Vector2D.js';
import { StateMachine } from '../fsm/StateMachine.js';
import { IdleState } from '../fsm/states/IdleState.js';
import { MoveState } from '../fsm/states/MoveState.js';
import { AttackState } from '../fsm/states/AttackState.js';
import { SkillState } from '../fsm/states/SkillState.js';

export class Unit {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.title = config.title;
    this.classType = config.classType;
    this.color = config.color || '#3498db';
    this.radius = config.radius || 14;

    // Takım bilgisi
    this.teamId = config.teamId || 'red'; // 'red' (Kızıl Bozkır) veya 'blue' (Gök Orda)
    this.isEnemy = config.isEnemy || false;

    // Statlar
    this.maxHp = config.maxHp || 200;
    this.hp = this.maxHp;
    this.maxEnergy = config.maxEnergy || 100;
    this.energy = this.maxEnergy;
    this.speed = config.speed || 3.0;
    this.maxForce = 0.4;
    this.attackPower = config.attackPower || 20;
    this.attackRange = config.attackRange || 40;
    this.attackSpeed = config.attackSpeed || 1.0;
    this.skills = config.skills || [];
    this.description = config.description || '';

    // Pozisyon ve Fizik
    this.position = new Vector2D(config.x || 100, config.y || 100);
    this.velocity = new Vector2D(0, 0);
    this.acceleration = new Vector2D(0, 0);
    this.facingAngle = config.facingAngle || (this.teamId === 'blue' ? Math.PI : 0);

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
    this.damageFlash = 0;
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

    // Enerji yenilenmesi
    if (this.energy < this.maxEnergy) {
      this.energy = Math.min(this.maxEnergy, this.energy + 5 * deltaTime);
    }

    // Görsel efekt sayaçları
    if (this.isAttackingAnim > 0) this.isAttackingAnim -= deltaTime;
    if (this.damageFlash > 0) this.damageFlash -= deltaTime;
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

  useSkill(skillIndex, targetPos) {
    const skill = this.skills[skillIndex];
    if (!skill || this.energy < skill.cost) return false;

    this.energy -= skill.cost;
    this.fsm.changeState('SKILL', { skill, target: targetPos });
    return true;
  }

  takeDamage(amount, sourceUnit = null, broadcast = true) {
    if (this.isDead) return;
    this.hp = Math.max(0, this.hp - amount);
    this.damageFlash = 0.25;

    // Uçuşan hasar yazısı ekle
    this.floatingTexts.push({
      text: `-${Math.round(amount)}`,
      color: '#ff4757',
      x: this.position.x + (Math.random() * 14 - 7),
      y: this.position.y - this.radius - 16,
      alpha: 1.0
    });

    // Ağ üzerinden hasarı ilet
    if (broadcast && this.party && this.party.sync) {
      this.party.sync.sendDamageEvent(this.id, amount, this.isEnemy);
    }

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

    if (this.isDead) {
      // Ölü birim mezar/düşmüş simgesi
      ctx.save();
      ctx.translate(this.position.x, this.position.y);
      ctx.fillStyle = 'rgba(100, 100, 100, 0.4)';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Mezar / X işareti
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-6, -6);
      ctx.lineTo(6, 6);
      ctx.moveTo(6, -6);
      ctx.lineTo(-6, 6);
      ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(this.position.x, this.position.y);

    // Seçim Halkası (Dost birimler için yeşil, Düşman hedefleme için kırmızı)
    if (this.isSelected) {
      ctx.strokeStyle = this.isEnemy ? '#ff4757' : '#2ecc71';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Fare ile üzerine gelindiğinde hedefleme halkası
    if (this.isTargetedByHover && this.isEnemy) {
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Takım Rozeti / Dış Halka Glow
    ctx.strokeStyle = this.teamId === 'red' ? 'rgba(231, 76, 60, 0.5)' : 'rgba(52, 152, 219, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 1, 0, Math.PI * 2);
    ctx.stroke();

    // Karakter Gövdesi
    ctx.fillStyle = this.damageFlash > 0 ? '#ffffff' : this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Dış Hat (Border)
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Yön Göstergesi (Directional Arrow)
    ctx.rotate(this.facingAngle);
    ctx.fillStyle = this.teamId === 'red' ? '#f1c40f' : '#00d2d3';
    ctx.beginPath();
    ctx.moveTo(this.radius - 2, -3);
    ctx.lineTo(this.radius + 5, 0);
    ctx.lineTo(this.radius - 2, 3);
    ctx.closePath();
    ctx.fill();

    // Saldırı Animasyonu Efekti (Kılıç savurma veya menzilli atış)
    if (this.isAttackingAnim > 0) {
      ctx.strokeStyle = this.attackRange > 60 ? '#f39c12' : '#ffeb3b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (this.attackRange > 60) {
        // Menzilli ok/büyü çizgisi
        ctx.moveTo(this.radius, 0);
        ctx.lineTo(this.attackRange * 0.7, 0);
      } else {
        // Yakın dövüş savurması
        ctx.arc(0, 0, this.attackRange * 0.6, -0.6, 0.6);
      }
      ctx.stroke();
    }

    ctx.restore();

    // Can & Enerji Barı
    this.renderHealthBar(ctx);
  }

  renderHealthBar(ctx) {
    if (this.isDead) return;
    const barWidth = 34;
    const barHeight = 4;
    const barX = this.position.x - barWidth / 2;
    const barY = this.position.y - this.radius - 13;

    // Arka plan
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

    // HP Barı
    const hpRatio = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = this.isEnemy
      ? (hpRatio > 0.5 ? '#e74c3c' : '#c0392b')
      : (hpRatio > 0.5 ? '#2ecc71' : hpRatio > 0.25 ? '#f39c12' : '#e74c3c');
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

    // Takım ve Durum Etiketi
    ctx.fillStyle = this.isEnemy ? '#ff7675' : '#74b9ff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    const stateText = `${this.fsm.getStateName()}`;
    ctx.fillText(stateText, this.position.x, barY - 3);
  }
}
