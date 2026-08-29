import { Vector2D } from '../navigation/Vector2D.js';

export class Projectile {
  constructor(config) {
    this.id = Math.random().toString(36).substring(2, 9);
    this.sourceUnit = config.sourceUnit;
    this.targetUnit = config.targetUnit;
    this.type = config.type || 'arrow'; // 'arrow' | 'fireball'
    this.position = new Vector2D(config.x, config.y);
    this.damage = config.damage || 20;
    this.speed = config.speed || (this.type === 'fireball' ? 320 : 420);
    this.radius = this.type === 'fireball' ? 6 : 3;
    this.color = this.type === 'fireball' ? '#e67e22' : '#f1c40f';
    this.velocity = new Vector2D(0, 0);
    this.isDead = false;
    this.lifeTime = 3.0; // Maksimum yaşam süresi (sn)

    // Hedef başlangıç koordinatı
    const targetPos = this.targetUnit && !this.targetUnit.isDead
      ? this.targetUnit.position
      : (config.targetPos || this.position);

    const dir = Vector2D.sub(targetPos, this.position);
    dir.normalize();
    this.velocity = dir.mult(this.speed);
  }

  update(deltaTime) {
    if (this.isDead) return;

    this.lifeTime -= deltaTime;
    if (this.lifeTime <= 0) {
      this.isDead = true;
      return;
    }

    // Hedefi takip et (homing)
    if (this.targetUnit && !this.targetUnit.isDead) {
      const desired = Vector2D.sub(this.targetUnit.position, this.position);
      const dist = desired.mag();

      // Çarpışma kontrolü
      if (dist <= this.targetUnit.radius + this.radius + 4) {
        this.hitTarget(this.targetUnit);
        return;
      }

      desired.normalize();
      desired.mult(this.speed);
      // Yumuşak yönelme
      this.velocity.x += (desired.x - this.velocity.x) * 0.15;
      this.velocity.y += (desired.y - this.velocity.y) * 0.15;
    }

    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
  }

  hitTarget(target) {
    if (this.isDead) return;
    this.isDead = true;

    // Hasar uygula
    if (typeof target.takeDamage === 'function') {
      target.takeDamage(this.damage, this.sourceUnit, true);
    }
  }

  render(ctx) {
    if (this.isDead) return;

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    const angle = this.velocity.heading();
    ctx.rotate(angle);

    if (this.type === 'arrow') {
      // Ok Gövdesi ve Ucu
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(6, 0);
      ctx.stroke();

      // Ok Ucu
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(2, -3);
      ctx.lineTo(2, 3);
      ctx.closePath();
      ctx.fill();

      // Ok Tüyü
      ctx.strokeStyle = '#e74c3c';
      ctx.beginPath();
      ctx.moveTo(-10, -2);
      ctx.lineTo(-7, 0);
      ctx.lineTo(-10, 2);
      ctx.stroke();
    } else if (this.type === 'fireball') {
      // Alev Topu ve Kor Halesi
      const gradient = ctx.createRadialGradient(0, 0, 1, 0, 0, 8);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.4, '#f39c12');
      gradient.addColorStop(0.8, '#e74c3c');
      gradient.addColorStop(1, 'rgba(231, 76, 60, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();

      // Kuyruk Parıltısı
      ctx.fillStyle = 'rgba(243, 156, 18, 0.4)';
      ctx.beginPath();
      ctx.moveTo(-4, -4);
      ctx.lineTo(-12, 0);
      ctx.lineTo(-4, 4);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}

export class ProjectileManager {
  constructor() {
    this.projectiles = [];
  }

  spawnArrow(sourceUnit, targetUnit, damage) {
    this.projectiles.push(new Projectile({
      sourceUnit,
      targetUnit,
      type: 'arrow',
      x: sourceUnit.position.x,
      y: sourceUnit.position.y,
      damage: damage || sourceUnit.attackPower,
      speed: 420
    }));
  }

  spawnFireball(sourceUnit, targetUnit, damage) {
    this.projectiles.push(new Projectile({
      sourceUnit,
      targetUnit,
      type: 'fireball',
      x: sourceUnit.position.x,
      y: sourceUnit.position.y,
      damage: damage || sourceUnit.attackPower,
      speed: 320
    }));
  }

  update(deltaTime) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(deltaTime);
      if (p.isDead) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  render(ctx) {
    this.projectiles.forEach(p => p.render(ctx));
  }

  clear() {
    this.projectiles = [];
  }
}
