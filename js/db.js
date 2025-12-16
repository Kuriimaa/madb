/**
 * IndexedDB utility for MADB (MagtanimAyDiBiro)
 * Replaces localStorage with IndexedDB for better storage and offline capabilities
 */

const DB_NAME = 'MADB';
const DB_VERSION = 1;

// Object stores
const STORES = {
  FARM_INFO: 'farmInfo',
  EXPENSES: 'expenses',
  SETTINGS: 'settings'
};

// IndexedDB connection promise
let dbPromise = null;

/**
 * Initialize IndexedDB connection
 */
function initDB() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[IndexedDB] Database error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log('[IndexedDB] Database opened successfully');
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      console.log('[IndexedDB] Database upgrade needed');

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.FARM_INFO)) {
        db.createObjectStore(STORES.FARM_INFO);
        console.log('[IndexedDB] Created farmInfo store');
      }

      if (!db.objectStoreNames.contains(STORES.EXPENSES)) {
        const expenseStore = db.createObjectStore(STORES.EXPENSES, { keyPath: 'id' });
        expenseStore.createIndex('date', 'date', { unique: false });
        expenseStore.createIndex('category', 'category', { unique: false });
        console.log('[IndexedDB] Created expenses store');
      }

      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS);
        console.log('[IndexedDB] Created settings store');
      }
    };
  });

  return dbPromise;
}

/**
 * Get database instance
 */
async function getDB() {
  if (!dbPromise) {
    await initDB();
  }
  return dbPromise;
}

/**
 * Store data in IndexedDB (replaces localStorage.setItem)
 * @param {string} key - The key to store data under
 * @param {*} value - The value to store (will be JSON serialized)
 */
async function setItem(key, value) {
  try {
    const db = await getDB();
    const transaction = db.transaction([getStoreName(key)], 'readwrite');
    const store = transaction.objectStore(getStoreName(key));

    const serializedValue = JSON.stringify(value);
    await new Promise((resolve, reject) => {
      const request = store.put(serializedValue, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log(`[IndexedDB] Stored ${key}`);
  } catch (error) {
    console.error(`[IndexedDB] Error storing ${key}:`, error);
    throw error;
  }
}

/**
 * Retrieve data from IndexedDB (replaces localStorage.getItem)
 * @param {string} key - The key to retrieve
 * @returns {*} The stored value (JSON parsed) or null if not found
 */
async function getItem(key) {
  try {
    const db = await getDB();
    const transaction = db.transaction([getStoreName(key)], 'readonly');
    const store = transaction.objectStore(getStoreName(key));

    const result = await new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (result === undefined) {
      return null;
    }

    const parsedValue = JSON.parse(result);
    console.log(`[IndexedDB] Retrieved ${key}`);
    return parsedValue;
  } catch (error) {
    console.error(`[IndexedDB] Error retrieving ${key}:`, error);
    return null;
  }
}

/**
 * Remove data from IndexedDB (replaces localStorage.removeItem)
 * @param {string} key - The key to remove
 */
async function removeItem(key) {
  try {
    const db = await getDB();
    const transaction = db.transaction([getStoreName(key)], 'readwrite');
    const store = transaction.objectStore(getStoreName(key));

    await new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log(`[IndexedDB] Removed ${key}`);
  } catch (error) {
    console.error(`[IndexedDB] Error removing ${key}:`, error);
    throw error;
  }
}

/**
 * Clear all data from a store (replaces localStorage.clear for specific stores)
 * @param {string} storeName - The store to clear
 */
async function clearStore(storeName) {
  try {
    const db = await getDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    await new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log(`[IndexedDB] Cleared store ${storeName}`);
  } catch (error) {
    console.error(`[IndexedDB] Error clearing store ${storeName}:`, error);
    throw error;
  }
}

/**
 * Get all expense entries
 * @returns {Array} Array of expense objects
 */
async function getAllExpenses() {
  try {
    const db = await getDB();
    const transaction = db.transaction([STORES.EXPENSES], 'readonly');
    const store = transaction.objectStore(STORES.EXPENSES);

    const results = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log(`[IndexedDB] Retrieved ${results.length} expenses`);
    return results;
  } catch (error) {
    console.error('[IndexedDB] Error retrieving expenses:', error);
    return [];
  }
}

/**
 * Add or update an expense entry
 * @param {Object} expense - The expense object to store
 */
async function saveExpense(expense) {
  try {
    const db = await getDB();
    const transaction = db.transaction([STORES.EXPENSES], 'readwrite');
    const store = transaction.objectStore(STORES.EXPENSES);

    await new Promise((resolve, reject) => {
      const request = store.put(expense);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log(`[IndexedDB] Saved expense ${expense.id}`);
  } catch (error) {
    console.error(`[IndexedDB] Error saving expense:`, error);
    throw error;
  }
}

/**
 * Delete an expense entry
 * @param {string} expenseId - The ID of the expense to delete
 */
async function deleteExpense(expenseId) {
  try {
    const db = await getDB();
    const transaction = db.transaction([STORES.EXPENSES], 'readwrite');
    const store = transaction.objectStore(STORES.EXPENSES);

    await new Promise((resolve, reject) => {
      const request = store.delete(expenseId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log(`[IndexedDB] Deleted expense ${expenseId}`);
  } catch (error) {
    console.error(`[IndexedDB] Error deleting expense:`, error);
    throw error;
  }
}

/**
 * Get expenses by category
 * @param {string} category - The category to filter by
 * @returns {Array} Array of expense objects in the category
 */
async function getExpensesByCategory(category) {
  try {
    const db = await getDB();
    const transaction = db.transaction([STORES.EXPENSES], 'readonly');
    const store = transaction.objectStore(STORES.EXPENSES);
    const index = store.index('category');

    const results = await new Promise((resolve, reject) => {
      const request = index.getAll(category);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log(`[IndexedDB] Retrieved ${results.length} expenses for category ${category}`);
    return results;
  } catch (error) {
    console.error(`[IndexedDB] Error retrieving expenses by category:`, error);
    return [];
  }
}

/**
 * Get expenses within a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} Array of expense objects within the date range
 */
async function getExpensesByDateRange(startDate, endDate) {
  try {
    const db = await getDB();
    const transaction = db.transaction([STORES.EXPENSES], 'readonly');
    const store = transaction.objectStore(STORES.EXPENSES);
    const index = store.index('date');

    const range = IDBKeyRange.bound(startDate.toISOString(), endDate.toISOString());
    const results = await new Promise((resolve, reject) => {
      const request = index.getAll(range);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log(`[IndexedDB] Retrieved ${results.length} expenses between ${startDate.toISOString()} and ${endDate.toISOString()}`);
    return results;
  } catch (error) {
    console.error(`[IndexedDB] Error retrieving expenses by date range:`, error);
    return [];
  }
}

/**
 * Determine which store to use based on the key
 * @param {string} key - The key being accessed
 * @returns {string} The store name
 */
function getStoreName(key) {
  if (key === 'farmInfo') {
    return STORES.FARM_INFO;
  } else if (key === 'expenseData' || key.startsWith('expense')) {
    return STORES.EXPENSES;
  } else {
    return STORES.SETTINGS;
  }
}

/**
 * Export IndexedDB API that mimics localStorage but uses IndexedDB
 */
const IndexedDBStorage = {
  setItem,
  getItem,
  removeItem,
  clearStore,
  getAllExpenses,
  saveExpense,
  deleteExpense,
  getExpensesByCategory,
  getExpensesByDateRange,
  initDB
};

// Export for use in other scripts
window.IndexedDBStorage = IndexedDBStorage;

// Also provide a localStorage-like API for easier migration
window.MADBStorage = {
  async getItem(key) {
    return IndexedDBStorage.getItem(key);
  },
  async setItem(key, value) {
    return IndexedDBStorage.setItem(key, value);
  },
  async removeItem(key) {
    return IndexedDBStorage.removeItem(key);
  }
};

console.log('[IndexedDB] MADBStorage helper available');

// Initialize the database when the script loads
initDB().catch(error => {
  console.error('[IndexedDB] Failed to initialize database:', error);
});
