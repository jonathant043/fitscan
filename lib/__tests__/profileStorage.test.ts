// lib/__tests__/profileStorage.test.ts
// Tests for profile storage functionality

import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveProfile, loadProfile, clearProfile } from '../profileStorage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('profileStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveProfile', () => {
    it('should save profile data to AsyncStorage', async () => {
      const mockProfile = {
        name: 'John Doe',
        experienceLevel: 'Intermediate' as const,
        primaryGoal: 'Build Muscle',
        daysPerWeek: 4,
        equipmentAccess: ['dumbbell', 'barbell'],
      };

      await saveProfile(mockProfile);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'fitscan:userProfile',
        JSON.stringify(mockProfile)
      );
    });

    it('should handle save errors gracefully', async () => {
      const mockProfile = { name: 'Test' };
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Save failed'));

      // Should not throw
      await expect(saveProfile(mockProfile)).resolves.not.toThrow();
    });
  });

  describe('loadProfile', () => {
    it('should load profile data from AsyncStorage', async () => {
      const mockProfile = {
        name: 'Jane Doe',
        experienceLevel: 'Advanced',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(mockProfile)
      );

      const result = await loadProfile();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('fitscan:userProfile');
      expect(result).toEqual(mockProfile);
    });

    it('should return null when no profile exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await loadProfile();

      expect(result).toBeNull();
    });

    it('should handle load errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Load failed'));

      const result = await loadProfile();

      expect(result).toBeNull();
    });
  });

  describe('clearProfile', () => {
    it('should remove profile data from AsyncStorage', async () => {
      await clearProfile();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('fitscan:userProfile');
    });

    it('should handle clear errors gracefully', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(new Error('Clear failed'));

      // Should not throw
      await expect(clearProfile()).resolves.not.toThrow();
    });
  });
});
