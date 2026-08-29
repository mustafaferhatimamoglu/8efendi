/**
 * NetworkManager - 1-64 Oyuncu Destekli WebRTC P2P Ağ Yöneticisi
 * 
 * Host yıldız (Star) topolojisinde çalışarak 1'den 64'e kadar oyuncunun
 * aynı lobiye bağlanmasını sağlar.
 */

export class NetworkManager {
  constructor() {
    this.peer = null;
    this.peerId = null;
    this.roomId = null;
    this.isHost = false;
    this.connections = new Map(); // peerId -> DataConnection (Host için çoklu, Client için tekli)
    this.clientHostConn = null; // Client'ın host ile olan bağlantısı
    this.isConnected = false;
    this.ping = 0;
    this.pingInterval = null;

    this.callbacks = {
      onConnect: [],
      onDisconnect: [],
      onPeerJoined: [],
      onPeerLeft: [],
      onData: [],
      onError: [],
      onPing: [],
      onPeerReady: []
    };
  }

  on(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event].push(callback);
    }
  }

  emit(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(cb => cb(data));
    }
  }

  generateRoomId() {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `8E-${result}`;
  }

  initPeer(customId = null) {
    return new Promise((resolve, reject) => {
      if (typeof window.Peer === 'undefined') {
        const errorMsg = 'PeerJS kütüphanesi yüklenemedi. Lütfen internet bağlantınızı kontrol edin.';
        console.error(errorMsg);
        this.emit('onError', errorMsg);
        return reject(new Error(errorMsg));
      }

      if (this.peer && !this.peer.destroyed) {
        this.peer.destroy();
      }

      const peerOptions = {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        }
      };

      try {
        this.peer = customId ? new window.Peer(customId, peerOptions) : new window.Peer(peerOptions);
      } catch (err) {
        return reject(err);
      }

      this.peer.on('open', id => {
        this.peerId = id;
        console.log('Peer açıldı, ID:', id);
        this.emit('onPeerReady', id);
        resolve(id);
      });

      this.peer.on('connection', connection => {
        console.log('Yeni oyuncu katıldı:', connection.peer);
        this.setupConnection(connection, true);
      });

      this.peer.on('error', err => {
        console.error('Peer hatası:', err);
        this.emit('onError', err.type || err.message);
      });

      this.peer.on('disconnected', () => {
        if (this.peer && !this.peer.destroyed) {
          this.peer.reconnect();
        }
      });
    });
  }

  async hostRoom() {
    this.isHost = true;
    this.roomId = this.generateRoomId();
    const fullPeerId = `8efendi-${this.roomId.toLowerCase()}`;
    await this.initPeer(fullPeerId);
    this.isConnected = true;
    return this.roomId;
  }

  async joinRoom(roomId) {
    this.isHost = false;
    this.roomId = roomId.trim().toUpperCase();
    const targetPeerId = `8efendi-${this.roomId.toLowerCase()}`;

    await this.initPeer();

    return new Promise((resolve, reject) => {
      console.log('Odaya bağlanılıyor:', targetPeerId);
      const connection = this.peer.connect(targetPeerId, { reliable: true });

      const timeout = setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('Odaya bağlanırken zaman aşımı oluştu. Oda kodu doğru mu?'));
        }
      }, 10000);

      this.setupConnection(connection, false);

      this.on('onConnect', () => {
        clearTimeout(timeout);
        resolve(this.roomId);
      });
    });
  }

  setupConnection(connection, isIncoming = false) {
    const peerId = connection.peer;
    this.connections.set(peerId, connection);

    if (!this.isHost && !isIncoming) {
      this.clientHostConn = connection;
    }

    connection.on('open', () => {
      this.isConnected = true;
      console.log(`[P2P] ${peerId} ile bağlantı kuruldu!`);
      this.startPingLoop();
      this.emit('onConnect', { isHost: this.isHost, roomId: this.roomId, peerId });
      this.emit('onPeerJoined', { peerId });
    });

    connection.on('data', data => {
      if (data && data._type === '__ping__') {
        this.sendToPeer(peerId, { _type: '__pong__', timestamp: data.timestamp });
        return;
      }
      if (data && data._type === '__pong__') {
        const now = performance.now();
        this.ping = Math.round(now - data.timestamp);
        this.emit('onPing', this.ping);
        return;
      }

      // Eğer Host isek, diğer tüm bağlı istemcilere veriyi broadcast et (Yıldız Topolojisi)
      if (this.isHost && data && !data._direct) {
        this.broadcastExcept(peerId, data);
      }

      this.emit('onData', { senderPeerId: peerId, data });
    });

    connection.on('close', () => {
      this.connections.delete(peerId);
      this.emit('onPeerLeft', { peerId });
      if (this.connections.size === 0 && !this.isHost) {
        this.isConnected = false;
        this.stopPingLoop();
        this.emit('onDisconnect');
      }
    });

    connection.on('error', err => {
      console.error(`[P2P] ${peerId} hatası:`, err);
      this.emit('onError', err);
    });
  }

  send(payload) {
    if (!this.isConnected) return;

    if (this.isHost) {
      // Host tüm bağlı oyunculara gönderir
      for (const conn of this.connections.values()) {
        if (conn.open) conn.send(payload);
      }
    } else if (this.clientHostConn && this.clientHostConn.open) {
      // Client sadece Host'a iletir (Host diğerlerine yayınlar)
      this.clientHostConn.send(payload);
    }
  }

  sendToPeer(peerId, payload) {
    const conn = this.connections.get(peerId);
    if (conn && conn.open) {
      conn.send({ ...payload, _direct: true });
    }
  }

  broadcastExcept(excludePeerId, payload) {
    for (const [id, conn] of this.connections.entries()) {
      if (id !== excludePeerId && conn.open) {
        conn.send(payload);
      }
    }
  }

  startPingLoop() {
    this.stopPingLoop();
    this.pingInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ _type: '__ping__', timestamp: performance.now() });
      }
    }, 2500);
  }

  stopPingLoop() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  disconnect() {
    this.stopPingLoop();
    this.isConnected = false;
    for (const conn of this.connections.values()) {
      conn.close();
    }
    this.connections.clear();
    if (this.peer && !this.peer.destroyed) {
      this.peer.destroy();
      this.peer = null;
    }
    this.emit('onDisconnect');
  }
}
