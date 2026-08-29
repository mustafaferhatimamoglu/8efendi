# 8efendi (2D Strateji & Grup Yönetim Oyunu)

8 farklı Türk/Bozkır temalı savaşçı ve karakterden (Alp Er, Demir Bey, Batur, Gökbörü, Kam Bilge, Karanlık Gölge, Ay Hatun, Kutluk Han) oluşan bir takımın stratejik yönetimi, gerçek zamanlı formasyon hareketleri ve taktiksel FSM durumlarını yöneten 2D strateji oyunu.

---

## 🌟 Öne Çıkan Özellikler

- **Akıllı Formasyon & Flocking Sistemi**:
  - Tıklanan noktaya göre otomatik yönelim hesaplama.
  - 4 Farklı Formasyon Düzeni: **Kutu (2x4)**, **V-Hücum (Wedge)**, **Hat (Line)**, **Çember (Circle)**.
  - Hedefe varışta yumuşama (`Arrive`) ve birimlerin birbirini itip savurmasını engelleyen dinamik mesafe koruma (`Separation`).
- **Finite State Machine (FSM)**:
  - Her karakter bağımsız `Idle`, `Move`, `Attack`, `Skill` durumları arasında geçiş yapar.
  - Anlık durumlar karakterlerin başının üzerinde gerçek zamanlı olarak gösterilir.
- **Taktik Arayüz (HUD & Panel)**:
  - Yeşil sürükleme kutusuyla (Box Select) veya tıkla toplu/tekil birim seçimi.
  - 8 Efendinin anlık can ve enerji barlarını gösteren alt panel.
  - Seçili birimlerin statlarını ve yetenek detaylarını gösteren sağ bilgi paneli.

---

## 🎮 Kontroller

- **Sol Tık + Sürükle**: Yeşil kutuyla alan seçimi (Box Select).
- **Sağ Tık**: Seçili tüm birimleri formasyon düzeniyle hedefe yönlendir.
- **1 - 8 Tuşları**: İlgili numaralı efendiyi doğrudan seç.
- **A Tuşu**: Bütün takımı seç.
- **Q Tuşu**: Seçili efendinin yeteneğini tetikle.
- **Formasyon Butonları**: Üst panelden formasyon tipini değiştir.

---

## 🚀 Kurulum & Çalıştırma

Projeyi çalıştırmak için herhangi bir harici kütüphaneye ihtiyaç yoktur:
1. Depoyu klonlayın veya indirin.
2. `index.html` dosyasını tarayıcınızda açın veya yerel bir HTTP sunucusuyla çalıştırın.
