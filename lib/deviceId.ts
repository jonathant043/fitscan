// lib/deviceId.ts
// Stable device identifier for server-side metering + RevenueCat app user ID.
// Generated once on first launch, persisted in AsyncStorage.
// Reinstall resets it (acceptable — Play handles trial abuse via Google account).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './constants';

function generateUUID(): string {
  // RFC 4122 v4 UUID — no crypto dependency needed for a non-security identifier
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let cachedId: string | null = null;

/**
 * Get or create the device metering ID.
 * Returns a stable UUID persisted across app launches.
 */
export async function getDeviceId(): Promise<string> {
  if (cachedId) return cachedId;

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.deviceId);
    if (stored) {
      cachedId = stored;
      return stored;
    }
  } catch {
    // Fall through to create
  }

  const id = generateUUID();
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.deviceId, id);
  } catch {
    // Best effort — if storage fails, we still return an ID for this session
  }
  cachedId = id;
  return id;
}
