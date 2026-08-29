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
        // 2 sıra, 4 sütun
        const cols = 4;
        const rows = Math.ceil(unitCount / cols);
        let index = 0;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (index >= unitCount) break;
            const ox = (c - (cols - 1) / 2) * spacing;
            const oy = (r - (rows - 1) / 2) * spacing;
            slots.push(rotateOffset(ox, oy));
            index++;
          }
        }
        break;
      }

      case FormationType.WEDGE: {
        // V Formasyonu (Öncü merkezde, kanatlar arkaya doğru)
        slots.push(rotateOffset(0, -spacing * 0.5)); // Lider
        for (let i = 1; i < unitCount; i++) {
          const side = (i % 2 === 1) ? 1 : -1;
          const tier = Math.ceil(i / 2);
          const ox = side * tier * spacing;
          const oy = tier * spacing * 0.8;
          slots.push(rotateOffset(ox, oy));
        }
        break;
      }

      case FormationType.CIRCLE: {
        // Dairesel koruma halkası
        const radius = (unitCount * spacing) / (2 * Math.PI);
        for (let i = 0; i < unitCount; i++) {
          const angle = (i / unitCount) * Math.PI * 2;
          const ox = Math.cos(angle) * radius;
          const oy = Math.sin(angle) * radius;
          slots.push(new Vector2D(centerTarget.x + ox, centerTarget.y + oy));
        }
        break;
      }

      case FormationType.LINE:
      default: {
        // Yan yana sıra
        for (let i = 0; i < unitCount; i++) {
          const ox = (i - (unitCount - 1) / 2) * spacing;
          slots.push(rotateOffset(ox, 0));
        }
        break;
      }
    }

    return slots;
  }
}
