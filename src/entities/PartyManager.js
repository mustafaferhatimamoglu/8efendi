import { Unit } from './Unit.js';
import { EFENDI_DATA } from '../config/UnitDatabase.js';
import { FormationManager, FormationType } from '../navigation/FormationManager.js';
import { Vector2D } from '../navigation/Vector2D.js';
import { EventBus } from '../core/EventBus.js';

export class PartyManager {
  constructor() {
    this.units = []; // Yerel oyuncunun birimleri
    this.enemyUnits = []; // Rakip oyuncunun (veya yapay zekanın) birimleri
    this.selectedUnits = [];
    this.currentFormation = FormationType.BOX;
    this.targetMarker = null;
    this.targetMarkerTimer = 0;
    this.effects = []; // Yetenek & büyü görsel efektleri
    this.sync = null; // MultiplayerSync referansı
    this.isSinglePlayerAI = false;
    this.aiTimer = 0;
    this.isHost = true;
    this.matchFinished = false;

    this.initParties(true);
  }

  setSync(sync) {
    this.sync = sync;
  }

  initParties(isHost = true, isSinglePlayer = false) {
    this.isHost = isHost;
    this.isSinglePlayerAI = isSinglePlayer;
    this.matchFinished = false;
    this.effects = [];

    // Başlangıç konumları: Host Solda, Guest/AI Sağda
    const hostStartX = 180;
    const hostStartY = 320;
    const guestStartX = 820;
    const guestStartY = 320;

    const myStartX = isHost ? hostStartX : guestStartX;
    const myStartY = isHost ? hostStartY : guestStartY;
    const enemyStartX = isHost ? guestStartX : hostStartX;
    const enemyStartY = isHost ? guestStartY : hostStartY;

    const myFacing = isHost ? 0 : Math.PI;
    const enemyFacing = isHost ? Math.PI : 0;

    // Yerel Takım slotları
    const localSlots = FormationManager.calculateFormationSlots(
      new Vector2D(myStartX, myStartY),
      myFacing,
      8,
      FormationType.BOX,
      44
    );

    // Düşman Takım slotları
    const enemySlots = FormationManager.calculateFormationSlots(
      new Vector2D(enemyStartX, enemyStartY),
      enemyFacing,
      8,
      FormationType.BOX,
      44
    );

    // Yerel 8 Efendi oluştur
    this.units = EFENDI_DATA.map((data, index) => {
      const slot = localSlots[index] || new Vector2D(myStartX, myStartY);
      const unit = new Unit({
        ...data,
        teamId: isHost ? 'red' : 'blue',
        isEnemy: false,
        x: slot.x,
        y: slot.y,
        facingAngle: myFacing
      });
      unit.party = this;
      return unit;
    });

    // Rakip 8 Efendi oluştur
    this.enemyUnits = EFENDI_DATA.map((data, index) => {
      const slot = enemySlots[index] || new Vector2D(enemyStartX, enemyStartY);
      const unit = new Unit({
        ...data,
        id: data.id + 100, // Düşman id çakışmasını önle
        teamId: isHost ? 'blue' : 'red',
        isEnemy: true,
        x: slot.x,
        y: slot.y,
        facingAngle: enemyFacing
      });
      unit.party = this;
      return unit;
    });

    // Başlangıçta tüm yerel takım seçili olsun
    this.selectAll();
    EventBus.emit('units:initialized', { local: this.units, enemy: this.enemyUnits });
  }

  getAllUnits() {
    return this.units;
  }

  getEnemyUnits() {
    return this.enemyUnits;
  }

  getAllFieldUnits() {
    return [...this.units, ...this.enemyUnits];
  }

  getLocalParty() {
    return { units: this.units };
  }

  getRemoteParty() {
    return {
      units: this.enemyUnits,
      applyRemoteMove: (unitIds, target, formation) => {
        this.applyRemoteMoveToEnemies(unitIds, target, formation);
      }
    };
  }

  getSelectedUnits() {
    return this.selectedUnits;
  }

  selectUnit(unit, multiSelect = false) {
    if (unit.isEnemy) {
      // Düşman birime tıklandıysa bilgi panelinde göster ama takıma seçme
      EventBus.emit('enemy:inspected', unit);
      return;
    }

    if (!multiSelect) {
      this.clearSelection();
    }
    unit.isSelected = true;
    if (!this.selectedUnits.includes(unit)) {
      this.selectedUnits.push(unit);
    }
    EventBus.emit('selection:changed', this.selectedUnits);
  }

  selectInRect(minX, minY, maxX, maxY) {
    this.clearSelection();
    this.units.forEach(unit => {
      if (
        unit.position.x >= minX &&
        unit.position.x <= maxX &&
        unit.position.y >= minY &&
        unit.position.y <= maxY &&
        !unit.isDead
      ) {
        unit.isSelected = true;
        this.selectedUnits.push(unit);
      }
    });
    EventBus.emit('selection:changed', this.selectedUnits);
  }

  selectAll() {
    this.clearSelection();
    this.units.forEach(unit => {
      if (!unit.isDead) {
        unit.isSelected = true;
        this.selectedUnits.push(unit);
      }
    });
    EventBus.emit('selection:changed', this.selectedUnits);
  }

  clearSelection() {
    this.units.forEach(u => (u.isSelected = false));
    this.selectedUnits = [];
    EventBus.emit('selection:changed', this.selectedUnits);
  }

  setFormation(type) {
    this.currentFormation = type;
    EventBus.emit('formation:changed', type);
  }

  /**
   * Seçili birimleri akıllı formasyon ile hedef noktaya yönlendirir.
   */
  commandMove(targetPos) {
    if (this.selectedUnits.length === 0) return;

    this.targetMarker = targetPos.clone();
    this.targetMarkerTimer = 1.0;

    // Seçili birimlerin merkez noktasını hesapla
    let centerX = 0;
    let centerY = 0;
    this.selectedUnits.forEach(u => {
      centerX += u.position.x;
      centerY += u.position.y;
    });
    centerX /= this.selectedUnits.length;
    centerY /= this.selectedUnits.length;
    const groupCenter = new Vector2D(centerX, centerY);

    // Hareket yönü açısı
    const moveDir = Vector2D.sub(targetPos, groupCenter);
    const facingAngle = moveDir.magSq() > 1 ? moveDir.heading() + Math.PI / 2 : 0;

    // Formasyon slotlarını hesapla
    const slots = FormationManager.calculateFormationSlots(
      targetPos,
      facingAngle,
      this.selectedUnits.length,
      this.currentFormation,
      38
    );

    // Slotları en yakın birimlere ata
    const availableSlots = [...slots];
    const unitIds = [];

    this.selectedUnits.forEach(unit => {
      unitIds.push(unit.id);
      let closestSlotIndex = 0;
      let minDistance = Infinity;

      availableSlots.forEach((slot, index) => {
        const d = unit.position.dist(slot);
        if (d < minDistance) {
          minDistance = d;
          closestSlotIndex = index;
        }
      });

      const assignedSlot = availableSlots.splice(closestSlotIndex, 1)[0] || targetPos;
      unit.moveTo(assignedSlot);
    });

    // Ağ üzerinden karşı tarafa bildir
    if (this.sync) {
      this.sync.sendMoveCommand(unitIds, targetPos, this.currentFormation);
    }
  }

  /**
   * Seçili birimlerin bir düşman birimine topluca saldırmasını sağlar.
   */
  commandAttack(enemyUnit) {
    if (this.selectedUnits.length === 0 || !enemyUnit || enemyUnit.isDead) return;

    const attackerIds = [];
    this.selectedUnits.forEach(unit => {
      if (!unit.isDead) {
        attackerIds.push(unit.id);
        unit.attack(enemyUnit);
      }
    });

    if (this.sync) {
      this.sync.sendAttackCommand(attackerIds, enemyUnit.id);
    }
  }

  /**
   * Ağdan gelen rakip hareket komutunu düşman birimlere uygular.
   */
  applyRemoteMoveToEnemies(unitIds, targetPosData, formation) {
    const targetPos = new Vector2D(targetPosData.x, targetPosData.y);
    const activeEnemies = this.enemyUnits.filter(u => unitIds.includes(u.id) && !u.isDead);
    if (activeEnemies.length === 0) return;

    let centerX = 0;
    let centerY = 0;
    activeEnemies.forEach(u => {
      centerX += u.position.x;
      centerY += u.position.y;
    });
    centerX /= activeEnemies.length;
    centerY /= activeEnemies.length;

    const moveDir = Vector2D.sub(targetPos, new Vector2D(centerX, centerY));
    const facingAngle = moveDir.magSq() > 1 ? moveDir.heading() + Math.PI / 2 : 0;

    const slots = FormationManager.calculateFormationSlots(
      targetPos,
      facingAngle,
      activeEnemies.length,
      formation || FormationType.BOX,
      38
    );

    const availableSlots = [...slots];
    activeEnemies.forEach(unit => {
      let closestSlotIndex = 0;
      let minDistance = Infinity;

      availableSlots.forEach((slot, index) => {
        const d = unit.position.dist(slot);
        if (d < minDistance) {
          minDistance = d;
          closestSlotIndex = index;
        }
      });

      const assignedSlot = availableSlots.splice(closestSlotIndex, 1)[0] || targetPos;
      unit.moveTo(assignedSlot);
    });
  }

  /**
   * Yetenek kullanımı ve alan etkileri.
   */
  applySkillEffect(casterUnit, skill, targetPos) {
    const isFriendlyCaster = !casterUnit.isEnemy;

    // Görsel Efekt Kaydı
    this.effects.push({
      x: targetPos.x,
      y: targetPos.y,
      radius: skill.range || 50,
      color: casterUnit.color,
      timer: 0.6,
      maxTimer: 0.6,
      name: skill.name
    });

    const targetCenter = new Vector2D(targetPos.x, targetPos.y);
    const areaRadius = Math.max(50, skill.range || 50);

    // Büyü tipine göre etki hesapla
    if (skill.id === 'holy_aura') {
      // Şifa: Dost birimleri iyileştir
      const allies = isFriendlyCaster ? this.units : this.enemyUnits;
      allies.forEach(ally => {
        if (!ally.isDead && ally.position.dist(targetCenter) <= areaRadius) {
          ally.heal(60);
        }
      });
    } else {
      // Saldırı / Alan Hasarı: Düşmanlara hasar ver
      const enemies = isFriendlyCaster ? this.enemyUnits : this.units;
      enemies.forEach(enemy => {
        if (!enemy.isDead && enemy.position.dist(targetCenter) <= areaRadius) {
          const dmg = casterUnit.attackPower * 1.6;
          enemy.takeDamage(dmg, casterUnit, isFriendlyCaster);
        }
      });
    }

    // Ağ üzerinden yetenek komutunu ilet
    if (isFriendlyCaster && this.sync) {
      this.sync.sendSkillCommand(casterUnit.id, 0, targetPos);
    }
  }

  checkTeamStatus() {
    if (this.matchFinished) return;

    const aliveLocal = this.units.filter(u => !u.isDead).length;
    const aliveEnemy = this.enemyUnits.filter(u => !u.isDead).length;

    EventBus.emit('scores:updated', { aliveLocal, aliveEnemy });

    if (aliveLocal === 0) {
      this.matchFinished = true;
      EventBus.emit('match:ended', { result: 'defeat' });
    } else if (aliveEnemy === 0) {
      this.matchFinished = true;
      EventBus.emit('match:ended', { result: 'victory' });
    }
  }

  update(deltaTime) {
    this.units.forEach(u => u.update(deltaTime));
    this.enemyUnits.forEach(u => u.update(deltaTime));

    // Tek kişilik modda yapay zeka davranışları
    if (this.isSinglePlayerAI && !this.matchFinished) {
      this.updateSinglePlayerAI(deltaTime);
    }

    // Hedef işaretçisi sayacı
    if (this.targetMarkerTimer > 0) {
      this.targetMarkerTimer -= deltaTime;
      if (this.targetMarkerTimer <= 0) this.targetMarker = null;
    }

    // Efektleri güncelle
    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].timer -= deltaTime;
      if (this.effects[i].timer <= 0) {
        this.effects.splice(i, 1);
      }
    }
  }

  updateSinglePlayerAI(deltaTime) {
    this.aiTimer += deltaTime;
    if (this.aiTimer < 2.0) return; // Her 2 saniyede bir karar al
    this.aiTimer = 0;

    const activeEnemies = this.enemyUnits.filter(u => !u.isDead);
    const activeAllies = this.units.filter(u => !u.isDead);

    if (activeEnemies.length === 0 || activeAllies.length === 0) return;

    // AI Stratejisi: En yakın oyuncu birimine yaklaş ve saldır veya yetenek kullan
    const randomEnemy = activeEnemies[Math.floor(Math.random() * activeEnemies.length)];
    const targetAlly = activeAllies[Math.floor(Math.random() * activeAllies.length)];

    if (randomEnemy && targetAlly) {
      const dist = randomEnemy.position.dist(targetAlly.position);
      if (dist > randomEnemy.attackRange) {
        // Formasyonla oyuncuya doğru ilerle
        const targetPos = targetAlly.position.clone();
        this.applyRemoteMoveToEnemies(activeEnemies.map(u => u.id), targetPos, FormationType.WEDGE);
      } else {
        // Saldır veya yetenek tetikle
        if (randomEnemy.energy >= 40 && Math.random() > 0.5) {
          randomEnemy.useSkill(0, targetAlly.position);
        } else {
          randomEnemy.attack(targetAlly);
        }
      }
    }
  }

  render(ctx) {
    // Tıklanan hedef bayrağı / göstergesi
    if (this.targetMarker) {
      ctx.save();
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.targetMarker.x, this.targetMarker.y, 8 + (1 - this.targetMarkerTimer) * 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Yetenek Efektleri
    this.effects.forEach(eff => {
      ctx.save();
      const alpha = Math.max(0, eff.timer / eff.maxTimer);
      ctx.fillStyle = eff.color;
      ctx.strokeStyle = eff.color;
      ctx.globalAlpha = alpha * 0.4;
      ctx.beginPath();
      ctx.arc(eff.x, eff.y, eff.radius * (2 - alpha * 0.8), 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    });

    // Rakip Birimler
    this.enemyUnits.forEach(u => u.render(ctx));

    // Yerel Birimler
    this.units.forEach(u => u.render(ctx));
  }
}
