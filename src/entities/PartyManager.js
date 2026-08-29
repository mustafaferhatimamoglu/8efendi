import { Unit } from './Unit.js';
import { EFENDI_DATA } from '../config/UnitDatabase.js';
import { FormationManager, FormationType } from '../navigation/FormationManager.js';
import { Vector2D } from '../navigation/Vector2D.js';
import { EventBus } from '../core/EventBus.js';
import { ProjectileManager } from '../combat/ProjectileManager.js';
import { EnemySpawner } from '../combat/EnemySpawner.js';

export class PartyManager {
  constructor() {
    this.units = []; // Yerel oyuncunun 8 Efendisi
    this.peerParties = new Map(); // Diğer bağlı oyuncuların partileri (peerId -> Unit[])
    this.enemyUnits = []; // Haritadaki tüm aktif düşmanlar
    this.selectedUnits = [];
    this.currentFormation = FormationType.BOX;
    this.targetMarker = null;
    this.targetMarkerTimer = 0;
    this.effects = [];
    this.sync = null; // MultiplayerSync referansı
    this.isSinglePlayerAI = true; // Solo PvE varsayılan
    this.isHost = true;
    this.matchFinished = false;

    // Savaş ve Spawner Alt Sistemleri
    this.projectiles = new ProjectileManager();
    this.spawner = new EnemySpawner(this);

    this.initParties(true, true);
  }

  setSync(sync) {
    this.sync = sync;
  }

  initParties(isHost = true, isSinglePlayer = true) {
    this.isHost = isHost;
    this.isSinglePlayerAI = isSinglePlayer;
    this.matchFinished = false;
    this.effects = [];
    this.enemyUnits = [];
    this.peerParties.clear();
    this.projectiles.clear();

    // Başlangıç konumu: Sol taraf (Savunma hattı)
    const myStartX = 180;
    const myStartY = 320;
    const myFacing = 0;

    // Yerel Takım slotları
    const localSlots = FormationManager.calculateFormationSlots(
      new Vector2D(myStartX, myStartY),
      myFacing,
      8,
      FormationType.BOX,
      44
    );

    // Yerel 8 Efendiyi oluştur
    this.units = EFENDI_DATA.map((data, index) => {
      const slot = localSlots[index] || new Vector2D(myStartX, myStartY);
      const unit = new Unit({
        ...data,
        teamId: 'player',
        isEnemy: false,
        x: slot.x,
        y: slot.y,
        facingAngle: myFacing
      });
      unit.party = this;
      return unit;
    });

    this.selectAll();
    EventBus.emit('units:initialized', { local: this.units, enemy: this.enemyUnits });
  }

  /**
   * Yeni bağlanan bir uzaktaki oyuncu için 8 Efendi ekler (Co-op 1-64 oyuncu).
   */
  addPeerParty(peerId, peerName = 'Müttefik') {
    if (this.peerParties.has(peerId)) return;

    const offsetIndex = this.peerParties.size + 1;
    const spawnX = 140 + (offsetIndex % 3) * 60;
    const spawnY = 180 + (offsetIndex * 70) % 400;

    const slots = FormationManager.calculateFormationSlots(
      new Vector2D(spawnX, spawnY),
      0,
      8,
      FormationType.BOX,
      38
    );

    const peerUnits = EFENDI_DATA.map((data, index) => {
      const slot = slots[index] || new Vector2D(spawnX, spawnY);
      const unit = new Unit({
        ...data,
        id: 10000 + (offsetIndex * 100) + data.id,
        teamId: `peer_${peerId}`,
        ownerPeerId: peerId,
        isEnemy: false,
        x: slot.x,
        y: slot.y,
        color: this.getPeerColor(offsetIndex),
        facingAngle: 0
      });
      unit.party = this;
      return unit;
    });

    this.peerParties.set(peerId, peerUnits);
    EventBus.emit('peer:joined', { peerId, peerUnits });
  }

  removePeerParty(peerId) {
    if (this.peerParties.has(peerId)) {
      this.peerParties.delete(peerId);
      EventBus.emit('peer:left', { peerId });
    }
  }

  getPeerColor(index) {
    const colors = ['#3498db', '#9b59b6', '#1abc9c', '#f39c12', '#e67e22', '#2ecc71'];
    return colors[index % colors.length];
  }

  getAllUnits() {
    return this.units;
  }

  getAlliedUnits() {
    const allAllies = [...this.units];
    for (const peerUnits of this.peerParties.values()) {
      allAllies.push(...peerUnits);
    }
    return allAllies;
  }

  getEnemyUnits() {
    return this.enemyUnits;
  }

  getAllFieldUnits() {
    return [...this.getAlliedUnits(), ...this.enemyUnits];
  }

  getLocalParty() {
    return { units: this.units };
  }

  getSelectedUnits() {
    return this.selectedUnits;
  }

  selectUnit(unit, multiSelect = false) {
    // Düşman birimler seçilemez (Friendly Fire yok)
    if (unit.isEnemy || unit.ownerPeerId) {
      EventBus.emit('unit:inspected', unit);
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

  selectGuardians() {
    this.clearSelection();
    this.units.forEach(unit => {
      // 1 ve 2 numaralı Muhafızlar (veya GUARDIAN sınıfı)
      if (!unit.isDead && (unit.classType === 'guardian' || unit.id === 1 || unit.id === 2)) {
        unit.isSelected = true;
        this.selectedUnits.push(unit);
      }
    });
    EventBus.emit('selection:changed', this.selectedUnits);
  }

  selectBackline() {
    this.clearSelection();
    this.units.forEach(unit => {
      // 3'ten 8'e kadar olan diğer karakterler (Okçular, Büyücüler, Şifacılar)
      if (!unit.isDead && unit.classType !== 'guardian' && unit.id !== 1 && unit.id !== 2) {
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

    let centerX = 0;
    let centerY = 0;
    this.selectedUnits.forEach(u => {
      centerX += u.position.x;
      centerY += u.position.y;
    });
    centerX /= this.selectedUnits.length;
    centerY /= this.selectedUnits.length;
    const groupCenter = new Vector2D(centerX, centerY);

    const moveDir = Vector2D.sub(targetPos, groupCenter);
    const facingAngle = moveDir.magSq() > 1 ? moveDir.heading() + Math.PI / 2 : 0;

    const slots = FormationManager.calculateFormationSlots(
      targetPos,
      facingAngle,
      this.selectedUnits.length,
      this.currentFormation,
      38
    );

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

    if (this.sync) {
      this.sync.sendMoveCommand(unitIds, targetPos, this.currentFormation);
    }
  }

  /**
   * Seçili birimlerin bir düşman hedefine odaklanmasını sağlar.
   */
  commandAttack(enemyUnit) {
    if (this.selectedUnits.length === 0 || !enemyUnit || enemyUnit.isDead) return;

    this.selectedUnits.forEach(unit => {
      if (!unit.isDead) {
        unit.attack(enemyUnit);
      }
    });
  }

  checkTeamStatus() {
    // Canlı oyuncu birimlerini kontrol et
    const aliveLocal = this.units.filter(u => !u.isDead).length;
    const totalAllies = this.getAlliedUnits().filter(u => !u.isDead).length;

    EventBus.emit('scores:updated', {
      aliveLocal,
      totalAllies,
      enemyCount: this.enemyUnits.filter(u => !u.isDead).length,
      wave: this.spawner.waveNumber
    });

    if (totalAllies === 0 && !this.matchFinished) {
      this.matchFinished = true;
      EventBus.emit('match:ended', { result: 'defeat' });
    }
  }

  update(deltaTime) {
    // 1. Yerel Birimleri Güncelle
    this.units.forEach(u => u.update(deltaTime));

    // 2. Müttefik Oyuncuları Güncelle
    for (const peerUnits of this.peerParties.values()) {
      peerUnits.forEach(u => u.update(deltaTime));
    }

    // 3. Düşmanları Güncelle ve Ölüleri Temizle
    for (let i = this.enemyUnits.length - 1; i >= 0; i--) {
      const enemy = this.enemyUnits[i];
      enemy.update(deltaTime);
      if (enemy.isDead && (!enemy.floatingTexts || enemy.floatingTexts.length === 0)) {
        this.enemyUnits.splice(i, 1);
      }
    }

    // 4. Mermiler ve Spawner
    this.projectiles.update(deltaTime);
    this.spawner.update(deltaTime);

    if (this.targetMarkerTimer > 0) {
      this.targetMarkerTimer -= deltaTime;
      if (this.targetMarkerTimer <= 0) this.targetMarker = null;
    }
  }

  render(ctx) {
    // Spawner Portalı
    this.spawner.render(ctx);

    // Tıklanan hedef bayrağı
    if (this.targetMarker) {
      ctx.save();
      ctx.strokeStyle = '#00d2d3';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.targetMarker.x, this.targetMarker.y, 8 + (1 - this.targetMarkerTimer) * 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Düşmanlar
    this.enemyUnits.forEach(u => u.render(ctx));

    // Müttefik Oyuncuların Birimleri
    for (const peerUnits of this.peerParties.values()) {
      peerUnits.forEach(u => u.render(ctx));
    }

    // Yerel Oyuncu Birimleri
    this.units.forEach(u => u.render(ctx));

    // Mermiler (Oklar ve Alev Topları)
    this.projectiles.render(ctx);
  }
}
