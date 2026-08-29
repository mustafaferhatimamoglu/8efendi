import { Vector2D } from './Vector2D.js';

export const FormationType = {
  BOX: 'box',         // 2x4 ya da 4x2 Düzenli Kutu
  WEDGE: 'wedge',     // V-Formasyonu (Hücum)
  LINE: 'line',       // Yatay / Dikey Hat
  CIRCLE: 'circle'    // Dairesel Koruma Çemberi
};

export class FormationManager {
  /**
   * 8 birim için hedef noktası ve yönelim açısına göre slot ofsetlerini hesaplar.
   */
  static calculateFormationSlots(centerTarget, facingAngle, unitCount = 8, type = FormationType.BOX, spacing = 36) {
    const slots = [];
    const cos = Math.cos(facingAngle);
    const sin = Math.sin(facingAngle);

    // Formasyon ofsetlerini yerel koordinatta hesaplayıp dünya koordinatına çevir
    const rotateOffset = (ox, oy) => {
      const rx = ox * cos - oy * sin;
      const ry = ox * sin + oy * cos;
      return new Vector2D(centerTarget.x + rx, centerTarget.y + ry);
    };

    switch (type) {
      case FormationType.BOX: {
        // 4 sütun genişlik (yan yana / dikine), 2 sıra derinlik (ön ve arka hat)
        const cols = 4;
        const rows = Math.ceil(unitCount / cols);
        let index = 0;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (index >= unitCount) break;
            const ox = ((rows - 1) / 2 - r) * spacing; // Ön hat (r=0) ve Arka hat (r=1)
            const oy = (c - (cols - 1) / 2) * spacing; // Yan yana genişlik
            slots.push(rotateOffset(ox, oy));
            index++;
          }
        }
        break;
      }

      case FormationType.WEDGE: {
        // V Formasyonu (Öncü lider okun baktığı en uçta, kanatlar arkaya doğru açılır)
        slots.push(rotateOffset(spacing * 0.8, 0)); // Öncü lider
        for (let i = 1; i < unitCount; i++) {
          const side = (i % 2 === 1) ? 1 : -1;
          const tier = Math.ceil(i / 2);
          const ox = spacing * 0.8 - tier * spacing * 0.7; // Arkaya doğru
          const oy = side * tier * spacing * 0.75;          // Kanatlar yanlara doğru
          slots.push(rotateOffset(ox, oy));
        }
        break;
      }

      case FormationType.CIRCLE: {
        // Dairesel koruma halkası
        const radius = (unitCount * spacing) / (2 * Math.PI);
        for (let i = 0; i < unitCount; i++) {
          const angle = facingAngle + (i / unitCount) * Math.PI * 2;
          const ox = Math.cos(angle) * radius;
          const oy = Math.sin(angle) * radius;
          slots.push(new Vector2D(centerTarget.x + ox, centerTarget.y + oy));
        }
        break;
      }

      case FormationType.LINE:
      default: {
        // Çizgi / Hat Düzeni: Okun baktığı yöne tam DİKİNE (yan yana dizilmiş savunma hattı)
        for (let i = 0; i < unitCount; i++) {
          const oy = (i - (unitCount - 1) / 2) * spacing;
          slots.push(rotateOffset(0, oy));
        }
        break;
      }
    }

    return slots;
  }

  /**
   * Birimleri en yakın slotlara eşleştirir.
   */
  static assignSlotsOptimally(units, slots) {
    const assignments = [];
    const availableSlots = [...slots];

    units.forEach(unit => {
      let closestSlot = null;
      let minDistance = Infinity;
      let closestIndex = -1;

      availableSlots.forEach((slot, index) => {
        const dist = unit.position.dist(slot);
        if (dist < minDistance) {
          minDistance = dist;
          closestSlot = slot;
          closestIndex = index;
        }
      });

      if (closestSlot) {
        assignments.push({ unit, slot: closestSlot });
        availableSlots.splice(closestIndex, 1);
      } else {
        // Slot kalmadıysa hedef pozisyonu doğrudan ver
        assignments.push({ unit, slot: unit.position });
      }
    });

    return assignments;
  }
}
