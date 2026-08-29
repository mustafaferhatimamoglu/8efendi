import { Unit } from './Unit.js';
import { EFENDI_DATA } from '../config/UnitDatabase.js';
import { FormationManager, FormationType } from '../navigation/FormationManager.js';
import { Vector2D } from '../navigation/Vector2D.js';
import { EventBus } from '../core/EventBus.js';

export class PartyManager {
  constructor() {
    this.units = [];
    this.selectedUnits = [];
    this.currentFormation = FormationType.BOX;
    this.targetMarker = null; // Tıklanan hedef görseli
    this.targetMarkerTimer = 0;
    this.effects = []; // Yetenek efektleri
    this.initParty();
  }

  initParty() {
    // 8 efendiyi başlangıç konumlarına yerleştir
    const startX = 220;
    const startY = 320;
    const initialSlots = FormationManager.calculateFormationSlots(
      new Vector2D(startX, startY),
      0,
      8,
      FormationType.BOX,
      44
    );

    this.units = EFENDI_DATA.map((data, index) => {
      const slot = initialSlots[index];
      const unit = new Unit({
        ...data,
        x: slot.x,
        y: slot.y
      });
      unit.party = this;
      return unit;
    });

    // Başlangıçta tüm takım seçili olsun
    this.selectAll();
  }

  getAllUnits() {
    return this.units;
  }

  getSelectedUnits() {
    return this.selectedUnits;
  }

  selectUnit(unit, multiSelect = false) {
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

    // Her birime en yakın slotu optimal ata (Basit mesafe eşleme)
    const availableSlots = [...slots];
    this.selectedUnits.forEach(unit => {
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

  triggerSkillEffect(unit, skill, targetPos) {
    this.effects.push({
      x: targetPos.x,
      y: targetPos.y,
      radius: skill.range || 40,
      color: unit.color,
      timer: 0.5,
      maxTimer: 0.5
    });
  }

  update(deltaTime) {
    this.units.forEach(u => u.update(deltaTime));

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
      const alpha = eff.timer / eff.maxTimer;
      ctx.fillStyle = eff.color;
      ctx.globalAlpha = alpha * 0.4;
      ctx.beginPath();
      ctx.arc(eff.x, eff.y, eff.radius * (2 - alpha), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Birimler
    this.units.forEach(u => u.render(ctx));
  }
}
