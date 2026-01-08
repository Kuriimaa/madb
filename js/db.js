/**
 * IndexedDB utility for MADB (MagtanimAyDiBiro)
 * Replaces localStorage with IndexedDB for better storage and offline capabilities
 */

const DB_NAME = 'MADB';
const DB_VERSION = 2; // v2: Multi-farm support

// Object stores
const STORES = {
  FARMS: 'farms',
  FARM_INFO: 'farmInfo', // Legacy - will migrate to 'farms'
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

      // Create farms store (multi-farm support)
      if (!db.objectStoreNames.contains(STORES.FARMS)) {
        const farmsStore = db.createObjectStore(STORES.FARMS, { keyPath: 'id' });
        farmsStore.createIndex('name', 'name', { unique: false });
        console.log('[IndexedDB] Created farms store');
      }

      // Keep legacy farmInfo store for migration
      if (!db.objectStoreNames.contains(STORES.FARM_INFO)) {
        db.createObjectStore(STORES.FARM_INFO);
        console.log('[IndexedDB] Created farmInfo store');
      }

      if (!db.objectStoreNames.contains(STORES.EXPENSES)) {
        const expenseStore = db.createObjectStore(STORES.EXPENSES, { keyPath: 'id' });
        expenseStore.createIndex('date', 'date', { unique: false });
        expenseStore.createIndex('category', 'category', { unique: false });
        expenseStore.createIndex('farmId', 'farmId', { unique: false });
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
 * Get all farms
 * @returns {Array} Array of farm objects
 */
async function getAllFarms() {
  try {
    const db = await getDB();
    const transaction = db.transaction([STORES.FARMS], 'readonly');
    const store = transaction.objectStore(STORES.FARMS);

    const results = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log(`[IndexedDB] Retrieved ${results.length} farms`);
    return results;
  } catch (error) {
    console.error('[IndexedDB] Error retrieving farms:', error);
    return [];
  }
}

/**
 * Get a single farm by ID
 * @param {string} farmId - The farm ID
 * @returns {Object|null} The farm object or null
 */
async function getFarm(farmId) {
  try {
    const db = await getDB();
    const transaction = db.transaction([STORES.FARMS], 'readonly');
    const store = transaction.objectStore(STORES.FARMS);

    const result = await new Promise((resolve, reject) => {
      const request = store.get(farmId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log(`[IndexedDB] Retrieved farm ${farmId}`);
    return result || null;
  } catch (error) {
    console.error(`[IndexedDB] Error retrieving farm ${farmId}:`, error);
    return null;
  }
}

/**
 * Save a farm (create or update)
 * @param {Object} farm - The farm object to store
 */
async function saveFarm(farm) {
  try {
    const db = await getDB();
    const transaction = db.transaction([STORES.FARMS], 'readwrite');
    const store = transaction.objectStore(STORES.FARMS);

    // Ensure farm has an ID
    if (!farm.id) {
      farm.id = `farm_${Date.now()}`;
    }

    await new Promise((resolve, reject) => {
      const request = store.put(farm);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log(`[IndexedDB] Saved farm ${farm.id}`);
    return farm.id;
  } catch (error) {
    console.error(`[IndexedDB] Error saving farm:`, error);
    throw error;
  }
}

/**
 * Delete a farm
 * @param {string} farmId - The ID of the farm to delete
 */
async function deleteFarm(farmId) {
  try {
    const db = await getDB();
    const transaction = db.transaction([STORES.FARMS], 'readwrite');
    const store = transaction.objectStore(STORES.FARMS);

    await new Promise((resolve, reject) => {
      const request = store.delete(farmId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log(`[IndexedDB] Deleted farm ${farmId}`);
  } catch (error) {
    console.error(`[IndexedDB] Error deleting farm:`, error);
    throw error;
  }
}

/**
 * Get the currently selected farm ID
 * @returns {string|null} The selected farm ID or null
 */
async function getSelectedFarmId() {
  try {
    const db = await getDB();
    const transaction = db.transaction([STORES.SETTINGS], 'readonly');
    const store = transaction.objectStore(STORES.SETTINGS);

    const result = await new Promise((resolve, reject) => {
      const request = store.get('selectedFarmId');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return result || null;
  } catch (error) {
    console.error('[IndexedDB] Error getting selected farm ID:', error);
    return null;
  }
}

/**
 * Set the currently selected farm ID
 * @param {string} farmId - The farm ID to select
 */
async function setSelectedFarmId(farmId) {
  try {
    const db = await getDB();
    const transaction = db.transaction([STORES.SETTINGS], 'readwrite');
    const store = transaction.objectStore(STORES.SETTINGS);

    await new Promise((resolve, reject) => {
      const request = store.put(farmId, 'selectedFarmId');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log(`[IndexedDB] Selected farm ${farmId}`);
  } catch (error) {
    console.error(`[IndexedDB] Error setting selected farm ID:`, error);
    throw error;
  }
}

/**
 * Get expenses for a specific farm
 * @param {string} farmId - The farm ID to filter by
 * @returns {Array} Array of expense objects for the farm
 */
async function getExpensesByFarm(farmId) {
  try {
    const db = await getDB();
    const transaction = db.transaction([STORES.EXPENSES], 'readonly');
    const store = transaction.objectStore(STORES.EXPENSES);
    const index = store.index('farmId');

    const results = await new Promise((resolve, reject) => {
      const request = index.getAll(farmId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log(`[IndexedDB] Retrieved ${results.length} expenses for farm ${farmId}`);
    return results;
  } catch (error) {
    console.error(`[IndexedDB] Error retrieving expenses for farm:`, error);
    return [];
  }
}

/**
 * Delete all expenses for a specific farm
 * @param {string} farmId - The farm ID
 */
async function deleteExpensesByFarm(farmId) {
  try {
    const expenses = await getExpensesByFarm(farmId);
    for (const expense of expenses) {
      await deleteExpense(expense.id);
    }
    console.log(`[IndexedDB] Deleted all expenses for farm ${farmId}`);
  } catch (error) {
    console.error(`[IndexedDB] Error deleting expenses for farm:`, error);
    throw error;
  }
}

/**
 * Migrate legacy single-farm data to multi-farm structure
 */
async function migrateLegacyData() {
  try {
    // Check if there's legacy farmInfo data
    const legacyFarm = await getItem('farmInfo');
    if (!legacyFarm) {
      console.log('[IndexedDB] No legacy farm data to migrate');
      return;
    }

    // Check if already migrated
    const farms = await getAllFarms();
    if (farms.length > 0) {
      console.log('[IndexedDB] Farms already exist, skipping migration');
      return;
    }

    // Create new farm from legacy data
    const newFarm = {
      id: `farm_${Date.now()}`,
      name: legacyFarm.name,
      size: legacyFarm.size,
      startDate: legacyFarm.startDate,
      cropping: legacyFarm.cropping,
      createdAt: new Date().toISOString()
    };

    await saveFarm(newFarm);
    await setSelectedFarmId(newFarm.id);

    // Migrate expenses to link to this farm
    const allExpenses = await getAllExpenses();
    for (const expense of allExpenses) {
      if (!expense.farmId) {
        expense.farmId = newFarm.id;
        await saveExpense(expense);
      }
    }

    console.log('[IndexedDB] Successfully migrated legacy data');
  } catch (error) {
    console.error('[IndexedDB] Error migrating legacy data:', error);
  }
}

/**
 * Mark a farm as completed
 * @param {string} farmId - The farm ID to mark as completed
 */
async function markFarmCompleted(farmId) {
  try {
    const farm = await getFarm(farmId);
    if (!farm) {
      throw new Error('Farm not found');
    }

    farm.completed = true;
    farm.completedDate = new Date().toISOString();
    farm.updatedAt = new Date().toISOString();

    await saveFarm(farm);
    console.log(`[IndexedDB] Marked farm ${farmId} as completed`);
  } catch (error) {
    console.error(`[IndexedDB] Error marking farm as completed:`, error);
    throw error;
  }
}

/**
 * Mark a farm as active (unmark completed)
 * @param {string} farmId - The farm ID to mark as active
 */
async function markFarmActive(farmId) {
  try {
    const farm = await getFarm(farmId);
    if (!farm) {
      throw new Error('Farm not found');
    }

    farm.completed = false;
    farm.completedDate = null;
    farm.updatedAt = new Date().toISOString();

    await saveFarm(farm);
    console.log(`[IndexedDB] Marked farm ${farmId} as active`);
  } catch (error) {
    console.error(`[IndexedDB] Error marking farm as active:`, error);
    throw error;
  }
}

/**
 * Get all active farms (not completed)
 * @returns {Array} Array of active farm objects
 */
async function getActiveFarms() {
  try {
    const allFarms = await getAllFarms();
    const activeFarms = allFarms.filter(farm => !farm.completed);
    console.log(`[IndexedDB] Retrieved ${activeFarms.length} active farms`);
    return activeFarms;
  } catch (error) {
    console.error('[IndexedDB] Error retrieving active farms:', error);
    return [];
  }
}

/**
 * Get all completed farms
 * @returns {Array} Array of completed farm objects
 */
async function getCompletedFarms() {
  try {
    const allFarms = await getAllFarms();
    const completedFarms = allFarms.filter(farm => farm.completed);
    console.log(`[IndexedDB] Retrieved ${completedFarms.length} completed farms`);
    return completedFarms;
  } catch (error) {
    console.error('[IndexedDB] Error retrieving completed farms:', error);
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
 * Export all data as JSON for backup
 * @returns {Object} All data including farms and expenses
 */
async function exportAllData() {
  try {
    const farms = await getAllFarms();
    const expenses = await getAllExpenses();
    const selectedFarmId = await getSelectedFarmId();
    
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      selectedFarmId: selectedFarmId,
      farms: farms,
      expenses: expenses
    };
    
    console.log(`[IndexedDB] Exported ${farms.length} farms and ${expenses.length} expenses`);
    return exportData;
  } catch (error) {
    console.error('[IndexedDB] Error exporting data:', error);
    throw error;
  }
}

/**
 * Import data from JSON backup
 * @param {Object} data - The backup data to import
 * @returns {Object} Import statistics
 */
async function importAllData(data) {
  try {
    if (!data || !data.version) {
      throw new Error('Invalid backup file format');
    }
    
    const db = await getDB();
    
    // Clear existing data
    const clearTransaction = db.transaction([STORES.FARMS, STORES.EXPENSES], 'readwrite');
    const farmsStore = clearTransaction.objectStore(STORES.FARMS);
    const expensesStore = clearTransaction.objectStore(STORES.EXPENSES);
    
    await Promise.all([
      new Promise((resolve, reject) => {
        const request = farmsStore.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise((resolve, reject) => {
        const request = expensesStore.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    ]);
    
    // Import farms
    if (data.farms && Array.isArray(data.farms)) {
      for (const farm of data.farms) {
        await saveFarm(farm);
      }
    }
    
    // Import expenses
    if (data.expenses && Array.isArray(data.expenses)) {
      for (const expense of data.expenses) {
        await saveExpense(expense);
      }
    }
    
    // Restore selected farm
    if (data.selectedFarmId) {
      await setSelectedFarmId(data.selectedFarmId);
    }
    
    const stats = {
      farmsImported: data.farms?.length || 0,
      expensesImported: data.expenses?.length || 0
    };
    
    console.log(`[IndexedDB] Imported ${stats.farmsImported} farms and ${stats.expensesImported} expenses`);
    return stats;
  } catch (error) {
    console.error('[IndexedDB] Error importing data:', error);
    throw error;
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
  getExpensesByFarm,
  deleteExpensesByFarm,
  getAllFarms,
  getFarm,
  saveFarm,
  deleteFarm,
  getSelectedFarmId,
  setSelectedFarmId,
  markFarmCompleted,
  markFarmActive,
  getActiveFarms,
  getCompletedFarms,
  migrateLegacyData,
  exportAllData,
  importAllData,
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
initDB()
  .then(() => {
    // Run data migration after DB is ready
    return migrateLegacyData();
  })
  .catch(error => {
    console.error('[IndexedDB] Failed to initialize database:', error);
  });
