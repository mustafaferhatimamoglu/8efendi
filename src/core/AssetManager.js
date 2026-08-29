/**
 * AssetManager - Sadece Kullanıcının Belirttiği 5 Canavar Resmini Yöneten Sistem
 */
export class AssetManager {
  constructor() {
    this.images = new Map();
    this.loaded = false;
    this.totalImages = 0;
    this.loadedImages = 0;
  }

  static getInstance() {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }

  preloadAssets() {
    const assetList = [
      // Kullanıcının Sağladığı 5 Özel Canavar Resmi:
      { key: 'medusa', src: 'assets/monsters/medusa.png' },
      { key: 'lord_yarkan', src: 'assets/monsters/lord_yarkan.png' },
      { key: 'tiger_girl', src: 'assets/monsters/tiger_girl.png' },
      { key: 'chackji', src: 'assets/monsters/chackji.png' },
      { key: 'siren', src: 'assets/monsters/siren.png' }
    ];

    this.totalImages = assetList.length;

    assetList.forEach(item => {
      const img = new Image();
      img.src = item.src;
      img.onload = () => {
        this.loadedImages++;
        if (this.loadedImages >= this.totalImages) {
          this.loaded = true;
        }
      };
      img.onerror = () => {
        console.warn(`[AssetManager] Resim yüklenemedi: ${item.src}`);
      };
      this.images.set(item.key, img);
    });
  }

  getImage(key) {
    return this.images.get(key) || null;
  }
}
