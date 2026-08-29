import { BaseState } from '../StateMachine.js';
import { Steering } from '../../navigation/Steering.js';

export class MoveState extends BaseState {
  enter(prevState, params) {
    this.stoppingThreshold = 4;
  }

  update(deltaTime) {
    if (!this.unit.targetPosition) {
      this.unit.fsm.changeState('IDLE');
      return;
    }

    const dist = this.unit.position.dist(this.unit.targetPosition);

    if (dist <= this.stoppingThreshold) {
      this.unit.targetPosition = null;
      this.unit.velocity.mult(0.2);
      this.unit.fsm.changeState('IDLE');
      return;
    }

    // 1. Hedefe varış kuvveti (Arrive)
    const arriveForce = Steering.arrive(this.unit, this.unit.targetPosition, 60);

    // 2. Birimler arası itme (Separation)
    const allUnits = this.unit.party ? this.unit.party.getAllUnits() : [];
    const separationForce = Steering.separation(this.unit, allUnits, this.unit.radius * 2.2);

    // Kuvvetleri birleştir
    arriveForce.mult(1.0);
    separationForce.mult(1.4);

    this.unit.applyForce(arriveForce);
    this.unit.applyForce(separationForce);
  }
}
