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
    this.facingAngle = 0;

    // Hedef ve Seçim
    this.targetPosition = null;
    this.attackTarget = null;
    this.isSelected = false;
    this.isDead = false;
    this.party = null;

    // Görsel Efekt sayaçları
    this.isAttackingAnim = 0;
    this.damageFlash = 0;

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
    if (this.isDead) return;

    // FSM durum güncellemesi
    this.fsm.update(deltaTime);

    // Fizik entegrasyonu
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.speed);
    this.position.add(this.velocity);
    this.acceleration.set(0, 0);

    // Yön açısı güncelleme
    if (this.velocity.magSq() > 0.05) {
      this.facingAngle = this.velocity.heading();
    }

    // Enerji yenilenmesi
    if (this.energy < this.maxEnergy) {
      this.energy = Math.min(this.maxEnergy, this.energy + 4 * deltaTime);
    }

    // Görsel efekt sayaçları
    if (this.isAttackingAnim > 0) this.isAttackingAnim -= deltaTime;
    if (this.damageFlash > 0) this.damageFlash -= deltaTime;
  }

  moveTo(targetPos) {
    this.targetPosition = targetPos.clone();
    this.attackTarget = null;
    if (this.fsm.getStateName() !== 'MOVE') {
      this.fsm.changeState('MOVE');
    }
  }

  attack(targetUnit) {
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

  takeDamage(amount, sourceUnit) {
    if (this.isDead) return;
    this.hp -= amount;
    this.damageFlash = 0.2;

    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      this.fsm.changeState('IDLE');
    }
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);

    // Seçim Halkası (Selection Circle)
    if (this.isSelected) {
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
      ctx.stroke();

      // Hedef çizgisi
      if (this.targetPosition) {
        ctx.save();
        ctx.restore();
      }
    }

    // Karakter Gövdesi
    ctx.fillStyle = this.damageFlash > 0 ? '#ffffff' : this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Dış Hat (Border)
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Yön Göstergesi (Directional Nose/Pointer)
    ctx.rotate(this.facingAngle);
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.moveTo(this.radius - 2, -3);
    ctx.lineTo(this.radius + 5, 0);
    ctx.lineTo(this.radius - 2, 3);
    ctx.closePath();
    ctx.fill();

    // Saldırı Animasyonu Efekti
    if (this.isAttackingAnim > 0) {
      ctx.strokeStyle = '#ffeb3b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, this.attackRange * 0.5, -0.4, 0.4);
      ctx.stroke();
    }

    ctx.restore();

    // Can & Enerji Barı (Karakterin Üstünde)
    this.renderHealthBar(ctx);
  }

  renderHealthBar(ctx) {
    if (this.isDead) return;
    const barWidth = 32;
    const barHeight = 4;
    const barX = this.position.x - barWidth / 2;
    const barY = this.position.y - this.radius - 12;

    // Arka plan
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

    // HP Barı
    const hpRatio = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = hpRatio > 0.5 ? '#2ecc71' : hpRatio > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

    // Durum Metni (State Name)
    ctx.fillStyle = '#ffffff';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.fsm.getStateName(), this.position.x, barY - 3);
  }
}
