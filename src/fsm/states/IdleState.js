import { BaseState } from '../StateMachine.js';

export class IdleState extends BaseState {
  enter(prevState) {
    this.unit.velocity.mult(0.1);
  }

  update(deltaTime) {
    // Hafif sürtünme
    this.unit.velocity.mult(0.85);

    // Eğer bir hareket hedefi atanmışsa MoveState'e geç
    if (this.unit.targetPosition) {
      this.unit.fsm.changeState('MOVE');
    }
  }
}
