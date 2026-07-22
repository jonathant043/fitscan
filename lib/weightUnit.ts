// lib/weightUnit.ts
// Standalone weight-unit preference — persists independently of UserProfile
// so it works offline and before profile setup.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './constants';

export type WeightUnit = 'lbs' | 'kg';

const DEFAULT_UNIT: WeightUnit = 'lbs';

export async function getWeightUnit(): Promise<WeightUnit> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.weightUnit);
    if (raw === 'kg') return 'kg';
    return DEFAULT_UNIT;
  } catch {
    return DEFAULT_UNIT;
  }
}

export async function setWeightUnit(unit: WeightUnit): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.weightUnit, unit);
}

/** Convert lbs (canonical) → display unit */
export function toDisplay(lbs: number, unit: WeightUnit): number {
  if (unit === 'kg') return Math.round(lbs * 0.453592 * 10) / 10;
  return lbs;
}

/** Convert display unit → lbs (canonical) for storage */
export function toLbs(value: number, unit: WeightUnit): number {
  if (unit === 'kg') return Math.round(value / 0.453592 * 10) / 10;
  return value;
}
