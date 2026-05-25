const DB_NAME    = 'pharma_offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending_sales';

// Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'txn_id' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

// Generate unique transaction ID
export function generateTxnId() {
  return `txn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Save a pending sale to IndexedDB
export async function queueSale(salePayload) {
  const db    = await openDB();
  const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.put(salePayload);
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}

// Get all pending sales
export async function getPendingSales() {
  const db    = await openDB();
  const store = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

// Remove a synced sale from IndexedDB
export async function removePendingSale(txn_id) {
  const db    = await openDB();
  const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.delete(txn_id);
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}

// Count pending sales
export async function getPendingCount() {
  const sales = await getPendingSales();
  return sales.length;
}

// Sync all pending sales to backend
export async function syncPendingSales(apiPost, onProgress) {
  const pending = await getPendingSales();
  if (!pending.length) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const sale of pending) {
    try {
      await apiPost('/sales/create', sale);
      await removePendingSale(sale.txn_id);
      synced++;
      if (onProgress) onProgress(synced, pending.length);
    } catch (err) {
      // If duplicate (already synced before) — remove it
      if (err.message?.includes('duplicate') || err.message?.includes('txn_id')) {
        await removePendingSale(sale.txn_id);
        synced++;
      } else {
        failed++;
      }
    }
  }

  return { synced, failed };
}