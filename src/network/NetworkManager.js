/**
 * NetworkManager - WebRTC P2P (PeerJS) Ağ Yöneticisi
 * 
 * Sunucusuz (Serverless / Netlify uyumlu) gerçek zamanlı eşler arası (Peer-to-Peer)
 * bağlantıyı ve oda yönetimini sağlar.
 */

export class NetworkManager {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.peerId = null;
    this.roomId = null;
    this.isHost = false;
    this.isConnected = false;
    this.ping = 0;
    this.lastPingSent = 0;
    this.pingInterval = null;

    this.callbacks = {
      onConnect: [],
      onDisconnect: [],
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

  /**
   * Benzersiz ve akılda kalıcı 5 haneli oda kodu üretir.
   */
  generateRoomId() {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `8E-${result}`;
  }

  /**
   * PeerJS nesnesini başlatır.
   */
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

      // PeerJS Cloud ve Google STUN yapılandırması
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
        // Gelen bağlantı (Host için)
        console.log('Yeni oyuncu bağlandı:', connection.peer);
        this.setupConnection(connection);
      });

      this.peer.on('error', err => {
        console.error('Peer hatası:', err);
        this.emit('onError', err.type || err.message);
      });

      this.peer.on('disconnected', () => {
        console.warn('Peer bağlantısı koptu, yeniden bağlanmaya çalışılıyor...');
        if (this.peer && !this.peer.destroyed) {
          this.peer.reconnect();
        }
      });
    });
  }

  /**
   * Yeni bir oyun odası kurar (Host)
   */
  async hostRoom() {
    this.isHost = true;
    const roomId = this.generateRoomId();
    this.roomId = roomId;

    const fullPeerId = `8efendi-${roomId.toLowerCase()}`;
    await this.initPeer(fullPeerId);
    return roomId;
  }

  /**
   * Var olan bir odaya katılır (Guest)
   */
  async joinRoom(roomId) {
    this.isHost = false;
    this.roomId = roomId.trim().toUpperCase();
    const targetPeerId = `8efendi-${this.roomId.toLowerCase()}`;

    await this.initPeer();

    return new Promise((resolve, reject) => {
      console.log('Odaya bağlanılıyor:', targetPeerId);
      const connection = this.peer.connect(targetPeerId, {
        reliable: true
      });

      const timeout = setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('Odaya bağlanırken zaman aşımı oluştu. Oda kodu doğru mu?'));
        }
      }, 10000);

      this.setupConnection(connection);

      this.on('onConnect', () => {
        clearTimeout(timeout);
        resolve(this.roomId);
      });
    });
  }

  /**
   * Veri kanalı ve olay dinleyicilerini ayarlar.
   */
  setupConnection(connection) {
    this.conn = connection;

    this.conn.on('open', () => {
      this.isConnected = true;
      console.log('P2P Veri Kanalı Açıldı!');
      this.startPingLoop();
      this.emit('onConnect', { isHost: this.isHost, roomId: this.roomId });
    });

    this.conn.on('data', data => {
      // Ping / Pong protokolü
      if (data && data._type === '__ping__') {
        this.send({ _type: '__pong__', timestamp: data.timestamp });
        return;
      }
      if (data && data._type === '__pong__') {
        const now = performance.now();
        this.ping = Math.round(now - data.timestamp);
        this.emit('onPing', this.ping);
        return;
      }

      this.emit('onData', data);
    });

    this.conn.on('close', () => {
      this.isConnected = false;
      this.stopPingLoop();
      console.warn('P2P Bağlantısı kapandı.');
      this.emit('onDisconnect');
    });

    this.conn.on('error', err => {
      console.error('Bağlantı hatası:', err);
      this.emit('onError', err);
    });
  }

  startPingLoop() {
    this.stopPingLoop();
    this.pingInterval = setInterval(() => {
      if (this.isConnected && this.conn) {
        this.send({ _type: '__ping__', timestamp: performance.now() });
      }
    }, 2000);
  }

  stopPingLoop() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Karşı tarafa veri paketi gönderir.
   */
  send(payload) {
    if (this.isConnected && this.conn && this.conn.open) {
      try {
        this.conn.send(payload);
      } catch (err) {
        console.error('Veri gönderme hatası:', err);
      }
    }
  }

  /**
   * Bağlantıyı güvenle sonlandırır.
   */
  disconnect() {
    this.stopPingLoop();
    this.isConnected = false;
    if (this.conn) {
      this.conn.close();
      this.conn = null;
    }
    if (this.peer && !this.peer.destroyed) {
      this.peer.destroy();
      this.peer = null;
    }
    this.emit('onDisconnect');
  }
}
