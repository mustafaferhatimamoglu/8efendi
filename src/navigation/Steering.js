import { Vector2D } from './Vector2D.js';

export class Steering {
  /**
   * Hedefe doğru gitme kuvveti (Seek)
   */
  static seek(unit, targetPos) {
    const desired = Vector2D.sub(targetPos, unit.position);
    desired.normalize();
    desired.mult(unit.speed);
    const steer = Vector2D.sub(desired, unit.velocity);
    steer.limit(unit.maxForce || 0.3);
    return steer;
  }

  /**
   * Hedefe yaklaştıkça yavaşlama kuvveti (Arrive)
   */
  static arrive(unit, targetPos, slowingRadius = 60) {
    const desired = Vector2D.sub(targetPos, unit.position);
    const dist = desired.mag();

    if (dist < 2) {
      unit.velocity.mult(0.5);
      return new Vector2D(0, 0);
    }

    desired.normalize();
    if (dist < slowingRadius) {
      const mappedSpeed = unit.speed * (dist / slowingRadius);
      desired.mult(mappedSpeed);
    } else {
      desired.mult(unit.speed);
    }

    const steer = Vector2D.sub(desired, unit.velocity);
    steer.limit(unit.maxForce || 0.4);
    return steer;
  }

  /**
   * Çarpışmayı önleme / Birimler arası itme (Separation)
   */
  static separation(unit, neighbors, desiredSeparation = 32) {
    const steer = new Vector2D(0, 0);
    let count = 0;

    for (const other of neighbors) {
      if (other === unit) continue;
      const d = unit.position.dist(other.position);
      const minDist = unit.radius + other.radius + 6;

      if (d > 0 && d < minDist) {
        const diff = Vector2D.sub(unit.position, other.position);
        diff.normalize();
        diff.div(d); // Yakın olan daha çok itsin
        steer.add(diff);
        count++;
      }
    }

    if (count > 0) {
      steer.div(count);
      steer.normalize();
      steer.mult(unit.speed * 1.2);
      steer.sub(unit.velocity);
      steer.limit(unit.maxForce * 1.5 || 0.6);
    }

    return steer;
  }

  /**
   * Hedef engelden sakınma (Obstacle Avoidance)
   */
  static avoidObstacle(unit, obstacle, avoidanceRadius = 40) {
    const steer = new Vector2D(0, 0);
    const dist = unit.position.dist(obstacle.position);
    const minDist = unit.radius + (obstacle.radius || 25) + avoidanceRadius;

    if (dist < minDist) {
      const diff = Vector2D.sub(unit.position, obstacle.position);
      diff.normalize();
      diff.mult(unit.speed);
      steer.add(diff).sub(unit.velocity).limit(0.5);
    }
    return steer;
  }
}
