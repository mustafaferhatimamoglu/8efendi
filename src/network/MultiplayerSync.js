/**
 * MultiplayerSync - Çok Oyunculu Durum ve Eylem Senkronizasyonu
 * 
 * Oyuncu hareketlerini, FSM durumlarını, saldırıları, yetenekleri ve
 * anlık HP/Enerji durumlarını eşler arasında senkronize eder.
 */

export const PacketType = {
  HANDSHAKE: 'handshake',
  MOVE_COMMAND: 'move_command',
  ATTACK_COMMAND: 'attack_command',
  SKILL_COMMAND: 'skill_command',
  SYNC_SNAPSHOT: 'sync_snapshot',
  DAMAGE_EVENT: 'damage_event',
  CHAT_TAUNT: 'chat_taunt',
  REMATCH_REQUEST: 'rematch_request',
  REMATCH_START: 'rematch_start'
};

export class MultiplayerSync {
  constructor(engine, networkManager) {
    this.engine = engine;
    this.network = networkManager;
    this.snapshotTimer = 0;
    this.snapshotInterval = 0.1; // 100ms aralıklarla tam durum senkronizasyonu
    this.active = false;

    this.bindNetworkEvents();
  }

  bindNetworkEvents() {
    this.network.on('onConnect', ({ isHost, roomId }) => {
      this.active = true;
      console.log(`Çok oyunculu mod aktif. Rol: ${isHost ? 'Ev Sahibi (Kızıl Takım)' : 'Misafir (Gök Takım)'}`);
      
      // İlk el sıkışma paketini gönder
      this.network.send({
        type: PacketType.HANDSHAKE,
        isHost: isHost,
        roomId: roomId,
        timestamp: Date.now()
      });
    });

    this.network.on('onDisconnect', () => {
      this.active = false;
    });

    this.network.on('onData', data => {
      this.handlePacket(data);
    });
  }

  handlePacket(packet) {
    if (!packet || !packet.type) return;

    switch (packet.type) {
      case PacketType.HANDSHAKE:
        console.log('Rakip el sıkışma paketi alındı:', packet);
        this.engine.onMultiplayerReady(packet);
        break;

      case PacketType.MOVE_COMMAND:
        this.handleRemoteMove(packet);
        break;

      case PacketType.ATTACK_COMMAND:
        this.handleRemoteAttack(packet);
        break;

      case PacketType.SKILL_COMMAND:
        this.handleRemoteSkill(packet);
        break;

      case PacketType.SYNC_SNAPSHOT:
        this.handleSnapshot(packet);
        break;

      case PacketType.DAMAGE_EVENT:
        this.handleDamageEvent(packet);
        break;

      case PacketType.CHAT_TAUNT:
        if (this.engine.uiManager) {
          this.engine.uiManager.showChatBubble(packet.sender, packet.text);
        }
        break;

      case PacketType.REMATCH_REQUEST:
        if (this.engine.uiManager) {
          this.engine.uiManager.showRematchNotification();
        }
        break;

      case PacketType.REMATCH_START:
        this.engine.restartGame(true);
        break;
    }
  }

  /**
   * Yerel hareket komutunu karşı tarafa bildirir.
   */
  sendMoveCommand(unitIds, targetPos, formation) {
    if (!this.active || !this.network.isConnected) return;
    this.network.send({
      type: PacketType.MOVE_COMMAND,
      unitIds: unitIds,
      target: { x: targetPos.x, y: targetPos.y },
      formation: formation,
      timestamp: Date.now()
    });
  }

  /**
   * Yerel saldırı komutunu karşı tarafa bildirir.
   */
  sendAttackCommand(attackerIds, targetUnitId) {
    if (!this.active || !this.network.isConnected) return;
    this.network.send({
      type: PacketType.ATTACK_COMMAND,
      attackerIds: attackerIds,
      targetUnitId: targetUnitId,
      timestamp: Date.now()
    });
  }

  /**
   * Yetenek kullanımını karşı tarafa bildirir.
   */
  sendSkillCommand(unitId, skillIndex, targetPos) {
    if (!this.active || !this.network.isConnected) return;
    this.network.send({
      type: PacketType.SKILL_COMMAND,
      unitId: unitId,
      skillIndex: skillIndex,
      target: { x: targetPos.x, y: targetPos.y },
      timestamp: Date.now()
    });
  }

  /**
   * Hasar olayını senkronize eder.
   */
  sendDamageEvent(targetId, damageAmount, isEnemyTarget) {
    if (!this.active || !this.network.isConnected) return;
    this.network.send({
      type: PacketType.DAMAGE_EVENT,
      targetId: targetId,
      amount: damageAmount,
      isEnemyTarget: isEnemyTarget,
      timestamp: Date.now()
    });
  }

  /**
   * Hızlı savaş narası / sohbet mesajı gönderir.
   */
  sendTaunt(text) {
    if (!this.active || !this.network.isConnected) return;
    this.network.send({
      type: PacketType.CHAT_TAUNT,
      sender: this.network.isHost ? 'Kızıl Bozkır' : 'Gök Orda',
      text: text,
      timestamp: Date.now()
    });
  }

  sendRematchRequest() {
    if (!this.active || !this.network.isConnected) return;
    this.network.send({
      type: PacketType.REMATCH_REQUEST,
      timestamp: Date.now()
    });
  }

  sendRematchAccept() {
    if (!this.active || !this.network.isConnected) return;
    this.network.send({
      type: PacketType.REMATCH_START,
      timestamp: Date.now()
    });
  }

  // --- Gelen Paketleri Uygulama Fonksiyonları ---

  handleRemoteMove(packet) {
    const enemyParty = this.engine.partyManager.getRemoteParty();
    if (!enemyParty) return;

    enemyParty.applyRemoteMove(packet.unitIds, packet.target, packet.formation);
  }

  handleRemoteAttack(packet) {
    const enemyParty = this.engine.partyManager.getRemoteParty();
    const localParty = this.engine.partyManager.getLocalParty();
    if (!enemyParty || !localParty) return;

    const targetUnit = localParty.units.find(u => u.id === packet.targetUnitId);
    if (!targetUnit) return;

    packet.attackerIds.forEach(id => {
      const attacker = enemyParty.units.find(u => u.id === id);
      if (attacker && !attacker.isDead) {
        attacker.attack(targetUnit);
      }
    });
  }

  handleRemoteSkill(packet) {
    const enemyParty = this.engine.partyManager.getRemoteParty();
    if (!enemyParty) return;

    const unit = enemyParty.units.find(u => u.id === packet.unitId);
    if (unit && !unit.isDead) {
      unit.useSkill(packet.skillIndex, packet.target);
    }
  }

  handleDamageEvent(packet) {
    // Hasarı doğru birime uygula
    const targetParty = packet.isEnemyTarget
      ? this.engine.partyManager.getLocalParty()
      : this.engine.partyManager.getRemoteParty();

    if (!targetParty) return;
    const unit = targetParty.units.find(u => u.id === packet.targetId);
    if (unit && !unit.isDead) {
      unit.takeDamage(packet.amount, null, false); // false = tekrar ağa hasar paketi gönderme
    }
  }

  handleSnapshot(packet) {
    const enemyParty = this.engine.partyManager.getRemoteParty();
    if (!enemyParty || !packet.units) return;

    packet.units.forEach(unitData => {
      const unit = enemyParty.units.find(u => u.id === unitData.id);
      if (unit) {
        // Yumuşak pozisyon interpolasyonu
        unit.targetInterpolation = {
          x: unitData.x,
          y: unitData.y,
          fsmState: unitData.state
        };
        unit.hp = unitData.hp;
        unit.energy = unitData.energy;
        unit.isDead = unitData.isDead;
        unit.facingAngle = unitData.facing;
      }
    });
  }

  update(deltaTime) {
    if (!this.active || !this.network.isConnected) return;

    this.snapshotTimer += deltaTime;
    if (this.snapshotTimer >= this.snapshotInterval) {
      this.snapshotTimer = 0;
      this.sendSnapshot();
    }
  }

  sendSnapshot() {
    const localParty = this.engine.partyManager.getLocalParty();
    if (!localParty) return;

    const unitsSnapshot = localParty.units.map(u => ({
      id: u.id,
      x: Math.round(u.position.x * 10) / 10,
      y: Math.round(u.position.y * 10) / 10,
      hp: Math.round(u.hp),
      energy: Math.round(u.energy),
      state: u.fsm.getStateName(),
      facing: Math.round(u.facingAngle * 100) / 100,
      isDead: u.isDead
    }));

    this.network.send({
      type: PacketType.SYNC_SNAPSHOT,
      units: unitsSnapshot,
      timestamp: Date.now()
    });
  }
}
