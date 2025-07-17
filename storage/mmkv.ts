// storage/mmkv.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create a storage interface that mimics MMKV's API but uses AsyncStorage
export const storage = {
  set: (key: string, value: string): void => {
    AsyncStorage.setItem(key, value);
  },
  
  getString: (key: string): string | undefined => {
    // MMKV is sync but AsyncStorage is async
    // This method throws to prevent accidental sync usage
    throw new Error('Use getStringAsync instead - AsyncStorage is async');
  },
  
  getStringAsync: async (key: string): Promise<string | null> => {
    return await AsyncStorage.getItem(key);
  },
  
  delete: (key: string): void => {
    AsyncStorage.removeItem(key);
  },
  
  clearAll: (): void => {
    AsyncStorage.clear();
  },
  
  getAllKeys: async (): Promise<string[]> => {
    return await AsyncStorage.getAllKeys();
  }
};

// Helper functions for easier object storage
export const storageHelpers = {
  // Store objects as JSON
  setObject: <T>(key: string, value: T): void => {
    AsyncStorage.setItem(key, JSON.stringify(value));
  },

  // Get objects from JSON (async version)
  getObjectAsync: async <T>(key: string): Promise<T | null> => {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      console.error(`Error parsing stored object for key ${key}:`, error);
      return null;
    }
  },

  // Get object with default value (async version)
  getObjectWithDefaultAsync: async <T>(key: string, defaultValue: T): Promise<T> => {
    const value = await storageHelpers.getObjectAsync<T>(key);
    return value !== null ? value : defaultValue;
  },

  // Synchronous version that returns default (for compatibility)
  getObjectWithDefault: <T>(key: string, defaultValue: T): T => {
    // Since we can't do sync with AsyncStorage, return default
    // This prevents crashes but data won't be loaded immediately
    console.warn(`getObjectWithDefault called for ${key} - returning default value. Use getObjectWithDefaultAsync instead.`);
    return defaultValue;
  },

  // Check if key exists
  contains: async (key: string): Promise<boolean> => {
    const value = await AsyncStorage.getItem(key);
    return value !== null;
  },

  // Delete key
  delete: (key: string): void => {
    AsyncStorage.removeItem(key);
  },

  // Clear all storage
  clearAll: (): void => {
    AsyncStorage.clear();
  },
};

// Export both for flexibility
export default storage;