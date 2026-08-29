import { BaseState } from '../StateMachine.js';
import { Steering } from '../../navigation/Steering.js';

export class MoveState extends BaseState {
  enter(prevState, params) {
    this.stoppingThreshold = 6;
  }

  update(deltaTime) {
    if (!this.unit.targetPosition) {
      this.unit.fsm.changeState('IDLE');
      return;
    }

    const dist = this.unit.position.dist(this.unit.targetPosition);

    // 1. Çoklu Ara Nokta (Waypoints) Takibi
    if (this.unit.waypoints && this.unit.waypoints.length > 1) {
      // Ara noktaya yaklaşıldıysa bir sonraki noktaya geç
      if (dist <= 22) {
        this.unit.waypoints.shift();
        this.unit.targetPosition = this.unit.waypoints[0];
      } else {
        // Dinamik Kısayol Kontrolü: Eğer son hedefe doğrudan görüş açıldıysa ara noktaları atla
        const finalGoal = this.unit.waypoints[this.unit.waypoints.length - 1];
        const mapManager = this.unit.party ? this.unit.party.mapManager : null;
        if (mapManager && mapManager.hasLineOfSight(this.unit.position, finalGoal, this.unit.radius + 6)) {
          this.unit.waypoints = [finalGoal];
          this.unit.targetPosition = finalGoal;
        }
      }
    } else {
      // Son Hedefe Ulaşıldı mı?
      if (dist <= this.stoppingThreshold) {
        this.unit.targetPosition = null;
        this.unit.waypoints = [];
        this.unit.velocity.mult(0.2);
        this.unit.fsm.changeState('IDLE');
        return;
      }
    }

    // 2. Hareket Kuvveti: Ara noktalarda akıcı dönüş (Seek), son noktada yavaşlama (Arrive)
    const isFinalGoal = !this.unit.waypoints || this.unit.waypoints.length <= 1;
    const moveForce = isFinalGoal
      ? Steering.arrive(this.unit, this.unit.targetPosition, 55)
      : Steering.seek(this.unit, this.unit.targetPosition);

    // 3. Birimler arası itme (Separation)
    const allUnits = this.unit.party ? this.unit.party.getAllUnits() : [];
    const separationForce = Steering.separation(this.unit, allUnits, this.unit.radius * 2.2);

    // Kuvvetleri birleştir ve uygula
    moveForce.mult(1.1);
    separationForce.mult(1.2);

    this.unit.applyForce(moveForce);
    this.unit.applyForce(separationForce);
  }
}
