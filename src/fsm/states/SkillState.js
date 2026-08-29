import { BaseState } from '../StateMachine.js';

export class SkillState extends BaseState {
  enter(prevState, params) {
    this.skill = params.skill;
    this.castTarget = params.target || this.unit.position.clone();
    this.castTimer = 0.4; // 0.4 saniye yetenek uygulama animasyonu
    this.unit.velocity.mult(0.1);
  }

  update(deltaTime) {
    this.castTimer -= deltaTime;
    if (this.castTimer <= 0) {
      if (this.unit.party) {
        if (typeof this.unit.party.applySkillEffect === 'function') {
          this.unit.party.applySkillEffect(this.unit, this.skill, this.castTarget);
        } else if (typeof this.unit.party.triggerSkillEffect === 'function') {
          this.unit.party.triggerSkillEffect(this.unit, this.skill, this.castTarget);
        }
      }
      this.unit.fsm.changeState('IDLE');
    }
  }
}
