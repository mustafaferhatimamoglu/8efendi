export const CoOpPacketType = {
  HANDSHAKE: 'handshake',
  PEER_MOVE: 'peer_move',
  SYNC_SNAPSHOT: 'sync_snapshot',
  ENEMY_SNAPSHOT: 'enemy_snapshot',
  CHAT_MESSAGE: 'chat_message',
  RESTART_GAME: 'restart_game'
};

export class MultiplayerSync {
  constructor(engine, networkManager) {
    this.engine = engine;
    this.network = networkManager;
    this.snapshotTimer = 0;
    this.snapshotInterval = 0.12; // 120ms aralıklarla durum güncellemesi
    this.active = false;

    this.bindNetworkEvents();
  }

  bindNetworkEvents() {
    this.network.on('onConnect', ({ isHost, roomId, peerId }) => {
      this.active = true;
      console.log(`[Multiplayer] Bağlantı kuruldu. Rol: ${isHost ? 'Oda Kurucu (Host)' : 'Müttefik Oyuncu'}`);

      this.network.send({
        type: CoOpPacketType.HANDSHAKE,
        isHost: isHost,
        roomId: roomId,
        timestamp: Date.now()
      });
    });

    this.network.on('onPeerJoined', ({ peerId }) => {
      this.engine.partyManager.addPeerParty(peerId);
      if (this.engine.uiManager) {
        this.engine.uiManager.showToast(`Yeni bir müttefik ordu savaşa katıldı!`, 'success');
      }
    });

    this.network.on('onPeerLeft', ({ peerId }) => {
      this.engine.partyManager.removePeerParty(peerId);
    });

    this.network.on('onDisconnect', () => {
      this.active = false;
    });

    this.network.on('onData', ({ senderPeerId, data }) => {
      this.handlePacket(senderPeerId, data);
    });
  }

  handlePacket(senderPeerId, packet) {
    if (!packet || !packet.type) return;

    switch (packet.type) {
      case CoOpPacketType.HANDSHAKE:
        if (senderPeerId) {
          this.engine.partyManager.addPeerParty(senderPeerId);
        }
        break;

      case CoOpPacketType.PEER_MOVE:
        this.handlePeerMove(senderPeerId, packet);
        break;

      case CoOpPacketType.SYNC_SNAPSHOT:
        this.handlePeerSnapshot(senderPeerId, packet);
        break;

      case CoOpPacketType.ENEMY_SNAPSHOT:
        this.handleEnemySnapshot(packet);
        break;

      case CoOpPacketType.CHAT_MESSAGE:
        if (this.engine.uiManager) {
          this.engine.uiManager.showChatBubble(packet.sender || 'Müttefik', packet.text);
        }
        break;

      case CoOpPacketType.RESTART_GAME:
        this.engine.restartGame(true);
        break;
    }
  }

  sendMoveCommand(unitIds, targetPos, formation) {
    if (!this.active || !this.network.isConnected) return;
    this.network.send({
      type: CoOpPacketType.PEER_MOVE,
      unitIds: unitIds,
      target: { x: targetPos.x, y: targetPos.y },
      formation: formation,
      timestamp: Date.now()
    });
  }

  sendTaunt(text) {
    if (!this.active || !this.network.isConnected) return;
    this.network.send({
      type: CoOpPacketType.CHAT_MESSAGE,
      sender: this.network.isHost ? 'Ordu Komutanı' : 'Müttefik Beyi',
      text: text,
      timestamp: Date.now()
    });
  }

  handlePeerMove(peerId, packet) {
    const peerUnits = this.engine.partyManager.peerParties.get(peerId);
    if (!peerUnits) return;

    const targetPos = packet.target;
    peerUnits.forEach((unit, idx) => {
      if (!unit.isDead) {
        unit.moveTo({ x: targetPos.x + (idx % 4) * 36, y: targetPos.y + Math.floor(idx / 4) * 36 });
      }
    });
  }

  handlePeerSnapshot(peerId, packet) {
    const peerUnits = this.engine.partyManager.peerParties.get(peerId);
    if (!peerUnits || !packet.units) return;

    packet.units.forEach((uData, index) => {
      const unit = peerUnits[index];
      if (unit) {
        unit.targetInterpolation = {
          x: uData.x,
          y: uData.y,
          fsmState: uData.state
        };
        unit.hp = uData.hp;
        unit.isDead = uData.isDead;
        unit.facingAngle = uData.facing;
      }
    });
  }

  handleEnemySnapshot(packet) {
    // Sadece Client'lar Host'tan gelen düşman konumlarını senkronize eder
    if (this.network.isHost || !packet.enemies) return;

    const currentEnemies = this.engine.partyManager.enemyUnits;

    packet.enemies.forEach(eData => {
      let enemy = currentEnemies.find(e => e.id === eData.id);
      if (!enemy && !eData.isDead) {
        // Yeni düşman oluştur
        enemy = new Unit({
          id: eData.id,
          name: eData.name || 'Düşman',
          title: 'Canavar',
          classType: 'enemy_melee',
          color: '#7f8c8d',
          radius: 13,
          maxHp: eData.maxHp || 100,
          speed: 3.0,
          attackPower: 15,
          attackRange: 30,
          isEnemy: true,
          x: eData.x,
          y: eData.y,
          facingAngle: eData.facing || Math.PI
        });
        enemy.party = this.engine.partyManager;
        currentEnemies.push(enemy);
      }

      if (enemy) {
        enemy.targetInterpolation = { x: eData.x, y: eData.y };
        enemy.hp = eData.hp;
        enemy.isDead = eData.isDead;
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
    // 1. Kendi Birimlerimizi Gönder
    const localUnits = this.engine.partyManager.getAllUnits();
    const snapshot = localUnits.map(u => ({
      id: u.id,
      x: Math.round(u.position.x * 10) / 10,
      y: Math.round(u.position.y * 10) / 10,
      hp: Math.round(u.hp),
      state: u.fsm.getStateName(),
      facing: Math.round(u.facingAngle * 100) / 100,
      isDead: u.isDead
    }));

    this.network.send({
      type: CoOpPacketType.SYNC_SNAPSHOT,
      units: snapshot,
      timestamp: Date.now()
    });

    // 2. Eğer Host isek Düşmanları da Senkronize Et
    if (this.network.isHost) {
      const enemiesSnapshot = this.engine.partyManager.enemyUnits.map(e => ({
        id: e.id,
        name: e.name,
        x: Math.round(e.position.x * 10) / 10,
        y: Math.round(e.position.y * 10) / 10,
        hp: Math.round(e.hp),
        maxHp: e.maxHp,
        isDead: e.isDead,
        facing: Math.round(e.facingAngle * 100) / 100
      }));

      this.network.send({
        type: CoOpPacketType.ENEMY_SNAPSHOT,
        enemies: enemiesSnapshot,
        timestamp: Date.now()
      });
    }
  }
}
