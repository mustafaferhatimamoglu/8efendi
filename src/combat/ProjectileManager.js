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

  update(deltaTime, partyManager = null) {
    if (this.isDead) return;

    this.lifeTime -= deltaTime;
    if (this.lifeTime <= 0) {
      this.isDead = true;
      return;
    }

    // Hedefi takip et (homing) - Hedef hala canlı ise hedefe yönel
    if (this.targetUnit && !this.targetUnit.isDead) {
      const desired = Vector2D.sub(this.targetUnit.position, this.position);
      const dist = desired.mag();

      if (dist > 0.0001) {
        desired.normalize();
        desired.mult(this.speed);
        // Yumuşak yönelme
        this.velocity.x += (desired.x - this.velocity.x) * 0.2;
        this.velocity.y += (desired.y - this.velocity.y) * 0.2;
      }
    } else {
      // Hedef öldüyse veya yoksa takibi bırak, mevcut rotasında dümdüz uçmaya devam et
      this.targetUnit = null;
    }

    // Hız büyüklüğünü sabit tut
    const currentSpeed = this.velocity.mag();
    if (currentSpeed > 0.0001) {
      this.velocity.x = (this.velocity.x / currentSpeed) * this.speed;
      this.velocity.y = (this.velocity.y / currentSpeed) * this.speed;
    }

    const prevPos = this.position.clone();
    const nextPos = new Vector2D(
      this.position.x + this.velocity.x * deltaTime,
      this.position.y + this.velocity.y * deltaTime
    );

    // 1. Duvar Çarpışması Kontrolü (Mermiler duvardan geçemez!)
    const mapManager = partyManager ? partyManager.mapManager : null;
    if (mapManager) {
      const wallHit = mapManager.checkProjectileWallHit(prevPos, nextPos);
      if (wallHit) {
        this.position.set(wallHit.x, wallHit.y);
        this.hitWall();
        return;
      }
    }

    // 2. DÜŞMAN ÇARPIŞMA KONTROLÜ
    // Hedef ölmüş olsa dahi rota üzerinde karşılaşılan ilk geçerli düşmana çarpar ve hasar verir!
    if (partyManager) {
      const isSourceEnemy = this.sourceUnit && this.sourceUnit.isEnemy;
      const potentialTargets = isSourceEnemy
        ? partyManager.getAlliedUnits()
        : partyManager.getEnemyUnits();

      let hitTargetUnit = null;
      let closestDistSq = Infinity;

      for (const enemy of potentialTargets) {
        if (!enemy || enemy.isDead || enemy === this.sourceUnit) continue;

        const hitRadius = enemy.radius + this.radius + 6;
        const d = this.distToSegment(enemy.position, prevPos, nextPos);

        if (d <= hitRadius) {
          const dxStart = prevPos.x - enemy.position.x;
          const dyStart = prevPos.y - enemy.position.y;
          const distFromStart = dxStart * dxStart + dyStart * dyStart;
          if (distFromStart < closestDistSq) {
            closestDistSq = distFromStart;
            hitTargetUnit = enemy;
          }
        }
      }

      if (hitTargetUnit) {
        this.position.set(nextPos.x, nextPos.y);
        this.hitTarget(hitTargetUnit);
        return;
      }
    }

    this.position.set(nextPos.x, nextPos.y);
  }

  distToSegment(p, v, w) {
    const dxVW = w.x - v.x;
    const dyVW = w.y - v.y;
    const l2 = dxVW * dxVW + dyVW * dyVW;
    if (l2 === 0) {
      const dx = p.x - v.x;
      const dy = p.y - v.y;
      return Math.sqrt(dx * dx + dy * dy);
    }
    let t = ((p.x - v.x) * dxVW + (p.y - v.y) * dyVW) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = v.x + t * dxVW;
    const projY = v.y + t * dyVW;
    const dx = p.x - projX;
    const dy = p.y - projY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  hitWall() {
    this.isDead = true;
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

  update(deltaTime, partyManager = null) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(deltaTime, partyManager);
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
