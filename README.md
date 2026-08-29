# ⚔️ 8efendi - 2D Çok Oyunculu Strateji & Grup Yönetim Oyunu

8 farklı Türk/Bozkır temalı efendiden (**Alp Er, Demir Bey, Batur, Gökbörü, Kam Bilge, Karanlık Gölge, Ay Hatun, Kutluk Han**) oluşan bir ordunun gerçek zamanlı taktiksel yönetimini sağlayan, **WebRTC P2P (Sunucusuz / Dış IP'siz)** tabanlı **2D Çok Oyunculu (1v1 PvP / AI)** strateji oyunu.

---

## 🌟 Öne Çıkan Özellikler

- **🌐 Sıfır Sunucu & Dış IP'siz Çok Oyunculu (WebRTC P2P)**:
  - **Dış IP veya Port Yönlendirme GEREKMEZ:** PeerJS ve WebRTC DataChannel protokolü sayesinde oyuncuların tarayıcıları doğrudan birbirine bağlanır.
  - **Oda Sistemi:** Tek tıkla oda oluşturma, 5 haneli oda kodu veya doğrudan davet bağlantısı (`#oda=8E-XXXXX`) paylaşımı.
  - **Gerçek Zamanlı Senkronizasyon:** Birim konumları, formasyonlar, FSM durumları, saldırılar, HP/Enerji ve alan etkili yetenekler eşzamanlı aktarılır.
  - **Canlı Ağ Göstergeleri:** HUD üzerinde anlık gecikme süresi (Ping ms) ve skor tablosu.
- **⚔️ 1v1 PvP Meydan Savaşı**:
  - **Kızıl Bozkır (Ev Sahibi)** vs **Gök Orda (Misafir)** takımları.
  - Düşman birimlerini hedef alarak odaklanmış taarruz yapabilme.
  - Bir takımın tüm birimleri düştüğünde Zafer / Yenilgi ekranı ve tek tıkla Rövanş başlatma.
- **🤖 Akıllı Yapay Zeka (Tek Oyunculu Mod)**:
  - Çok oyunculu oynamak istemediğinizde akıllı bot takımına karşı antrenman yapabilme.
- **💬 Savaş Naraları & Hızlı Sohbet**:
  - Savaş esnasında rakibe hızlı naralar ve taktik mesajları fırlatabilme.
- **🛡️ Akıllı Formasyon & Flocking Sistemi**:
  - 4 Farklı Düzen: **Kutu (2x4)**, **V-Hücum (Wedge)**, **Hat (Line)**, **Çember (Circle)**.
  - Hedefe varışta yumuşama (`Arrive`) ve çarpışma önleme (`Separation`).
- **⚙️ Finite State Machine (FSM)**:
  - Her karakter bağımsız `Idle`, `Move`, `Attack`, `Skill` durumlarını yönetir.

---

## 🚀 Netlify Üzerinde Yayınlama Rehberi (1 Dakikada Yayında!)

Bu proje **%100 statik HTML/JS/CSS** ve **WebRTC P2P** mimarisi kullandığı için **Netlify üzerinde tamamen ücretsiz ve sıfır arka plan sunucu kurulumuyla** çalışır!

### Adım Adım Netlify Kurulumu:

1. **GitHub ile Bağlama (En Kolay Yol):**
   - GitHub deponuzu güncelleyin (`git push`).
   - [Netlify](https://www.netlify.com)'a giriş yapın ve **"Add new site" > "Import an existing project"** seçeneğini seçin.
   - GitHub hesabınızdan `8efendi` reposunu seçin.
   - **Publish directory:** `.` (veya boş bırakın).
   - **Deploy site** butonuna tıklayın.

2. **Sürükle-Bırak ile Yayınlama (Alternatif):**
   - Netlify paneline girin, **Sites** sekmesinde `8efendi` proje klasörünüzü doğrudan tarayıcıya sürükleyip bırakın.
   - Birkaç saniye içinde `https://projeniz.netlify.app` adresiniz hazır olacaktır!

3. **Arkadaşınızla Oynama:**
   - Netlify sitenize girin ve **"Oda Kur (Host Ol)"** butonuna tıklayın.
   - **"Davet Linkini Kopyala"** butonuna basarak arkadaşınıza WhatsApp/Discord üzerinden linki gönderin.
   - Arkadaşınız linke tıkladığı anda doğrudan sizin odanıza bağlanacak ve 1v1 savaş başlayacaktır!

---

## 🎮 Kontroller & Kısayollar

| Kontrol | Eylem |
|---|---|
| **Sol Tık + Sürükle** | Yeşil kutuyla alan seçimi (Box Select). |
| **Sol Tık (Birim)** | Tekil dost birim seçimi veya düşman birim inceleme. |
| **Sağ Tık (Zemin)** | Seçili birimleri akıllı formasyonla hedef noktaya yürüt. |
| **Sağ Tık (Düşman)** | Seçili birimlerin o düşmana odaklanıp saldırmasını sağla. |
| **1 - 8 Tuşları** | İlgili sıradaki efendiyi hızlıca seç. |
| **A Tuşu** | Bütün takımı aynı anda seç. |
| **Q Tuşu** | Seçili efendinin özel yeteneğini imlecin olduğu noktaya fırlat. |
| **Formasyon Butonları** | Üst menüden takım düzenini değiştir (Kutu, V, Hat, Çember). |

---

## 💻 Yerel Olarak Çalıştırma

Projeyi yerel bilgisayarınızda test etmek için:

```bash
# Node.js yerel sunucusu ile:
npm run dev
# veya
node server.js
```

Tarayıcınızda `http://localhost:3000` adresini açıp iki ayrı sekmede test edebilirsiniz.
