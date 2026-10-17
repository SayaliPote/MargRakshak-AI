/**
 * IndexedDB helper for mock offline hotspot storage
 */
const DB_NAME = "MargRakshakOffline";
const DB_VERSION = 1;
const STORE_NAME = "hotspots";

export function initIndexedDB(initialData = []) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      
      // If we have initial data, populate it if empty
      if (initialData.length > 0) {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        
        const countRequest = store.count();
        countRequest.onsuccess = () => {
          if (countRequest.result === 0) {
            initialData.forEach(item => {
              store.put(item);
            });
          }
        };
      }
      
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export function getOfflineHotspots() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => {
        resolve(getAllRequest.result);
      };

      getAllRequest.onerror = () => {
        reject(getAllRequest.error);
      };
    };
  });
}

export function saveOfflineHotspot(hotspot) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const putRequest = store.put(hotspot);

      putRequest.onsuccess = () => {
        resolve(true);
      };

      putRequest.onerror = () => {
        reject(putRequest.error);
      };
    };
  });
}
