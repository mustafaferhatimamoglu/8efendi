/**
 * LobbyUI - Çok Oyunculu Lobi ve Oda Yönetim Arayüzü
 */
import { EventBus } from '../core/EventBus.js';

export class LobbyUI {
  constructor(engine, networkManager) {
    this.engine = engine;
    this.network = networkManager;

    this.modal = document.getElementById('lobby-modal');
    this.hostBtn = document.getElementById('btn-lobby-host');
    this.joinBtn = document.getElementById('btn-lobby-join');
    this.soloBtn = document.getElementById('btn-lobby-solo');
    this.roomInput = document.getElementById('lobby-room-code');
    this.hostSection = document.getElementById('lobby-host-section');
    this.hostRoomDisplay = document.getElementById('host-room-code-display');
    this.copyCodeBtn = document.getElementById('btn-copy-code');
    this.copyLinkBtn = document.getElementById('btn-copy-link');
    this.lobbyStatus = document.getElementById('lobby-status');
    this.openLobbyBtn = document.getElementById('btn-open-lobby');

    this.bindEvents();
    this.checkUrlAutoJoin();
  }

  bindEvents() {
    // Oda Kur Butonu
    if (this.hostBtn) {
      this.hostBtn.addEventListener('click', async () => {
        try {
          this.setStatus('Oda oluşturuluyor, lütfen bekleyin...', 'info');
          const roomId = await this.engine.hostMultiplayerGame();
          this.hostRoomDisplay.textContent = roomId;
          this.hostSection.style.display = 'block';
          this.setStatus('Oda açıldı! Arkadaşına davet kodunu veya bağlantısını gönder.', 'success');
        } catch (err) {
          this.setStatus(`Oda kurulamadı: ${err.message}`, 'error');
        }
      });
    }

    // Odaya Katıl Butonu
    if (this.joinBtn) {
      this.joinBtn.addEventListener('click', async () => {
        const code = this.roomInput ? this.roomInput.value.trim() : '';
        if (!code) {
          this.setStatus('Lütfen geçerli bir oda kodu girin.', 'error');
          return;
        }
        try {
          this.setStatus('Odaya bağlanılıyor...', 'info');
          await this.engine.joinMultiplayerGame(code);
          this.setStatus('Odaya bağlanıldı! Oyun başlıyor...', 'success');
          setTimeout(() => this.hideModal(), 1000);
        } catch (err) {
          this.setStatus(`Bağlantı hatası: ${err.message}`, 'error');
        }
      });
    }

    // Tek Oyunculu Oyna
    if (this.soloBtn) {
      this.soloBtn.addEventListener('click', () => {
        this.engine.startSoloGame();
        this.hideModal();
      });
    }

    // Kodu Kopyala
    if (this.copyCodeBtn) {
      this.copyCodeBtn.addEventListener('click', () => {
        const code = this.hostRoomDisplay.textContent;
        navigator.clipboard.writeText(code);
        this.copyCodeBtn.textContent = '✅ Kopyalandı!';
        setTimeout(() => (this.copyCodeBtn.textContent = 'Kodu Kopyala'), 2000);
      });
    }

    // Davet Bağlantısını Kopyala
    if (this.copyLinkBtn) {
      this.copyLinkBtn.addEventListener('click', () => {
        const code = this.hostRoomDisplay.textContent;
        const link = `${window.location.origin}${window.location.pathname}#oda=${code}`;
        navigator.clipboard.writeText(link);
        this.copyLinkBtn.textContent = '✅ Link Kopyalandı!';
        setTimeout(() => (this.copyLinkBtn.textContent = 'Davet Linkini Kopyala'), 2000);
      });
    }

    // Üst menüden lobiyi tekrar aç
    if (this.openLobbyBtn) {
      this.openLobbyBtn.addEventListener('click', () => {
        this.showModal();
      });
    }

    // Ağ olayları
    this.network.on('onConnect', () => {
      this.setStatus('Rakip bağlandı! Savaş başlıyor...', 'success');
      setTimeout(() => this.hideModal(), 1000);
    });

    this.network.on('onDisconnect', () => {
      this.setStatus('Rakibin bağlantısı koptu.', 'error');
    });
  }

  checkUrlAutoJoin() {
    const hash = window.location.hash;
    const match = hash.match(/#(?:oda|room)=([a-zA-Z0-9_-]+)/i);
    if (match && match[1]) {
      const roomCode = match[1];
      if (this.roomInput) {
        this.roomInput.value = roomCode;
      }
      this.setStatus(`URL'den oda kodu algılandı: ${roomCode}. Bağlanılıyor...`, 'info');
      setTimeout(() => {
        this.engine.joinMultiplayerGame(roomCode)
          .then(() => {
            this.setStatus('Bağlantı başarılı!', 'success');
            setTimeout(() => this.hideModal(), 800);
          })
          .catch(err => {
            this.setStatus(`Odaya otomatik katılamadı: ${err.message}`, 'error');
          });
      }, 500);
    }
  }

  showModal() {
    if (this.modal) this.modal.style.display = 'flex';
  }

  hideModal() {
    if (this.modal) this.modal.style.display = 'none';
  }

  setStatus(msg, type = 'info') {
    if (!this.lobbyStatus) return;
    this.lobbyStatus.textContent = msg;
    this.lobbyStatus.className = `lobby-status status-${type}`;
  }
}
