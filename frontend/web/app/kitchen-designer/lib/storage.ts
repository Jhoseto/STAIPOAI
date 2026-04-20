// Професионално IndexedDB хранилище за CAD чертежи
// Световно ниво 2026 - архитектурна прецизност

const DB_NAME = 'staipo-cad-storage';
const DB_VERSION = 1;
const STORE_NAME = 'drawings';

interface StorageData {
  id: string;
  name: string;
  data: any;
  timestamp: number;
  thumbnail?: string;
}

class CADStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('name', 'name', { unique: false });
        }
      };
    });
  }

  async saveDrawing(id: string, name: string, data: any, thumbnail?: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const storageData: StorageData = {
        id,
        name,
        data,
        timestamp: Date.now(),
        thumbnail,
      };

      const request = store.put(storageData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async loadDrawing(id: string): Promise<StorageData | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async loadAllDrawings(): Promise<StorageData[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');

      const drawings: StorageData[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          drawings.push(cursor.value);
          cursor.continue();
        } else {
          resolve(drawings);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async deleteDrawing(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Автоматично запазване с дебаунс
  private saveTimeout: NodeJS.Timeout | null = null;

  autoSave(id: string, name: string, data: any, thumbnail?: string, delay: number = 1000): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.saveDrawing(id, name, data, thumbnail)
        .then(() => console.log('✅ Автоматично запазено:', name))
        .catch(err => console.error('❌ Грешка при запазване:', err));
    }, delay);
  }
}

export const cadStorage = new CADStorage();
export type { StorageData };
