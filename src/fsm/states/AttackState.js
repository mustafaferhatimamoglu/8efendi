import { BaseState } from '../StateMachine.js';

export class AttackState extends BaseState {
  enter(prevState, params) {
    this.target = params.target || this.unit.attackTarget;
    this.attackCooldown = 0;
  }

  update(deltaTime) {
    if (!this.target || this.target.isDead) {
      this.unit.attackTarget = null;
      this.unit.fsm.changeState('IDLE');
      return;
    }

    const dist = this.unit.position.dist(this.target.position);

    // Eğer menzilden çıktıysa hedefe yaklaş
    if (dist > this.unit.attackRange) {
      this.unit.targetPosition = this.target.position.clone();
      this.unit.fsm.changeState('MOVE');
      return;
    }

    // Menzilde ise dur ve saldır
    this.unit.velocity.mult(0.5);
    this.attackCooldown -= deltaTime;

    if (this.attackCooldown <= 0) {
      this.performAttack();
      this.attackCooldown = 1 / (this.unit.attackSpeed || 1);
    }
  }

  performAttack() {
    if (this.target && !this.target.isDead) {
      this.target.takeDamage(this.unit.attackPower, this.unit);
      // Görsel efekt tetiklemesi
      this.unit.isAttackingAnim = 0.2;
    }
  }
}
