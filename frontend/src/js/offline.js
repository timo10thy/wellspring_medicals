const DB_NAME    = 'pharma_offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending_sales';
const PRODUCT_CACHE_KEY = 'pharma_product_cache';

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
export async function queueSale(txn_id, items) {
  const db    = await openDB();
  const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.put({ txn_id, items, queued_at: new Date().toISOString() });
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

// Get failed sales (stub — extend later with status tracking)
export async function getFailedSales() {
  return [];
}

// Discard a sale from the queue
export async function discardSale(txn_id) {
  await removePendingSale(txn_id);
}

// Sync all pending sales to backend (FIFO)
export async function syncPendingSales(apiPost, onProgress) {
  const pending = await getPendingSales();
  if (!pending.length) return { synced: 0, failed: 0 };

  // FIFO — sort by queued_at
  pending.sort((a, b) => (a.queued_at || '').localeCompare(b.queued_at || ''));

  let synced = 0;
  let failed = 0;

  for (const sale of pending) {
    try {
      await apiPost({ txn_id: sale.txn_id, items: sale.items });
      await removePendingSale(sale.txn_id);
      synced++;
      if (onProgress) onProgress(synced, pending.length);
    } catch (err) {
      // Already synced (duplicate txn_id) — remove cleanly
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

// ── Product cache (localStorage) ─────────────────────────────────────────────

// Call this when online to save all products+stock locally
export function cacheProducts(products) {
  try {
    localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify({
      cached_at: new Date().toISOString(),
      products,
    }));
  } catch (e) {
    console.warn('[offline] Failed to cache products:', e);
  }
}

// Search cached products by name (used when offline)
export function searchProductsOffline(query) {
  try {
    const raw = localStorage.getItem(PRODUCT_CACHE_KEY);
    if (!raw) return [];
    const { products } = JSON.parse(raw);
    const q = query.toLowerCase();
    return products.filter(p =>
      p.product_name.toLowerCase().includes(q) && p.total_quantity > 0
    );
  } catch (e) {
    console.warn('[offline] Failed to search product cache:', e);
    return [];
  }
}

// Get a single cached product by ID (for addToCart offline)
export function getCachedProduct(productId) {
  try {
    const raw = localStorage.getItem(PRODUCT_CACHE_KEY);
    if (!raw) return null;
    const { products } = JSON.parse(raw);
    return products.find(p => p.product_id === productId) || null;
  } catch {
    return null;
  }
}