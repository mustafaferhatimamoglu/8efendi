import { FormationManager, FormationType } from '../navigation/FormationManager.js';
import { Vector2D } from '../navigation/Vector2D.js';
import { Unit } from './Unit.js';
import { EFENDI_DATA, AVAILABLE_CLASSES } from '../config/UnitDatabase.js';
import { EventBus } from '../core/EventBus.js';
import { ProjectileManager } from '../combat/ProjectileManager.js';
import { EnemySpawner } from '../combat/EnemySpawner.js';

export class PartyManager {
  constructor() {
    this.units = [];
    this.peerParties = new Map(); // peerId -> Unit[]
    this.enemyUnits = [];
    this.selectedUnits = [];
    this.currentFormation = FormationType.BOX;
    this.targetMarker = null;
    this.targetMarkerTimer = 0;
    this.effects = [];
    this.sync = null; // MultiplayerSync referansı
    this.isSinglePlayerAI = true; // Solo PvE varsayılan
    this.isHost = true;
    this.matchFinished = false;

    // Özel Seçilmiş 8 Karakter Konfigürasyonu
    this.customRoster = [...EFENDI_DATA];

    // Savaş ve Spawner Alt Sistemleri
    this.projectiles = new ProjectileManager();
    this.spawner = new EnemySpawner(this);

    this.initParties(true, true);
  }

  setCustomRoster(roster) {
    if (roster && roster.length === 8) {
      this.customRoster = roster;
    }
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

    // Seçilmiş 8 Efendiyi oluştur
    this.units = this.customRoster.map((data, index) => {
      const slot = localSlots[index] || new Vector2D(myStartX, myStartY);
      const unit = new Unit({
        ...data,
        id: index + 1,
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
  addPeerParty(peerId, peerName = 'Müttefik', customUnits = null) {
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

    const rosterToUse = customUnits || EFENDI_DATA;
    const peerUnits = rosterToUse.map((data, index) => {
      const slot = slots[index] || new Vector2D(spawnX, spawnY);
      const unit = new Unit({
        ...data,
        id: 10000 + (offsetIndex * 100) + (index + 1),
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

  getPeerColor(index) {
    const colors = ['#3498db', '#9b59b6', '#e67e22', '#1abc9c', '#e84393', '#fdcb6e'];
    return colors[index % colors.length];
  }

  removePeerParty(peerId) {
    if (this.peerParties.has(peerId)) {
      this.peerParties.delete(peerId);
      EventBus.emit('peer:left', { peerId });
    }
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
      // SADECE sınıfı Muhafız (guardian) olarak atanan karakterleri seç
      if (!unit.isDead && unit.classType === 'guardian') {
        unit.isSelected = true;
        this.selectedUnits.push(unit);
      }
    });
    EventBus.emit('selection:changed', this.selectedUnits);
  }

  selectBackline() {
    this.clearSelection();
    this.units.forEach(unit => {
      // Muhafız OLMAYAN diğer tüm atanmış karakterleri seç (Okçu, Büyücü, Şifacı)
      if (!unit.isDead && unit.classType !== 'guardian') {
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

  moveSelectedUnits(targetPos) {
    const selected = this.selectedUnits.filter(u => !u.isDead);
    if (selected.length === 0) return;

    this.targetMarker = targetPos.clone();
    this.targetMarkerTimer = 0.8;

    let center = new Vector2D(0, 0);
    selected.forEach(u => center.add(u.position));
    center.div(selected.length);

    let facingAngle = Vector2D.sub(targetPos, center).heading();
    if (isNaN(facingAngle)) facingAngle = 0;

    const slots = FormationManager.calculateFormationSlots(
      targetPos,
      facingAngle,
      selected.length,
      this.currentFormation,
      38
    );

    const assignments = FormationManager.assignSlotsOptimally(selected, slots);
    assignments.forEach(({ unit, slot }) => {
      unit.moveTo(slot);
    });

    if (this.sync && this.sync.active) {
      const selectedIds = selected.map(u => u.id);
      this.sync.sendMoveCommand(selectedIds, targetPos, this.currentFormation);
    }
  }

  attackTargetWithSelected(targetUnit) {
    const selected = this.selectedUnits.filter(u => !u.isDead);
    if (selected.length === 0 || !targetUnit || targetUnit.isDead) return;

    this.targetMarker = targetUnit.position.clone();
    this.targetMarkerTimer = 0.8;

    selected.forEach(unit => {
      unit.attack(targetUnit);
    });
  }

  handleRemoteMove(peerId, unitIds, targetPos, formation) {
    const peerUnits = this.peerParties.get(peerId);
    if (!peerUnits) return;

    const targetVector = new Vector2D(targetPos.x, targetPos.y);
    const movingUnits = peerUnits.filter(u => unitIds.includes(u.id) && !u.isDead);
    if (movingUnits.length === 0) return;

    let center = new Vector2D(0, 0);
    movingUnits.forEach(u => center.add(u.position));
    center.div(movingUnits.length);

    let facingAngle = Vector2D.sub(targetVector, center).heading();
    if (isNaN(facingAngle)) facingAngle = 0;

    const slots = FormationManager.calculateFormationSlots(
      targetVector,
      facingAngle,
      movingUnits.length,
      formation || FormationType.BOX,
      38
    );

    const assignments = FormationManager.assignSlotsOptimally(movingUnits, slots);
    assignments.forEach(({ unit, slot }) => {
      unit.moveTo(slot);
    });
  }

  checkTeamStatus() {
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
    this.projectiles.update(deltaTime, this);
    this.spawner.update(deltaTime);

    // 5. Hedef İşaretçisi Süresi
    if (this.targetMarkerTimer > 0) {
      this.targetMarkerTimer -= deltaTime;
      if (this.targetMarkerTimer <= 0) {
        this.targetMarker = null;
      }
    }
  }

  render(ctx) {
    // Hedef tıklama halkası (Yeşil dalga)
    if (this.targetMarker && this.targetMarkerTimer > 0) {
      ctx.save();
      const progress = 1 - (this.targetMarkerTimer / 0.8);
      ctx.strokeStyle = `rgba(46, 204, 113, ${1 - progress})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.targetMarker.x, this.targetMarker.y, 8 + progress * 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Spawner Kapısı (Portal)
    this.spawner.render(ctx);

    // Mermiler (Oklar ve Alev Topları)
    this.projectiles.render(ctx);

    // Düşmanlar
    this.enemyUnits.forEach(enemy => enemy.render(ctx));

    // Müttefik Diğer Oyuncuların Orduları
    for (const peerUnits of this.peerParties.values()) {
      peerUnits.forEach(u => u.render(ctx));
    }

    // Yerel Oyuncunun 8 Efendisi
    this.units.forEach(u => u.render(ctx));
  }
}
