// lib/scanLimit.ts
// Tracks monthly free scan usage and pro subscription status

import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS, SCAN_LIMIT } from "./constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScanLimitData {
  scansUsed: number;
  periodStart: string; // "YYYY-MM" — resets each calendar month
  isPro: boolean;
  proActivatedAt: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7); // "2026-03"
}

function daysUntilMonthEnd(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.getDate() - now.getDate() + 1;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

async function loadData(): Promise<ScanLimitData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.scanLimit);
    if (!raw) return freshData();
    const parsed = JSON.parse(raw) as ScanLimitData;
    // Reset if it's a new month
    if (parsed.periodStart !== currentMonth()) {
      return { ...parsed, scansUsed: 0, periodStart: currentMonth() };
    }
    return parsed;
  } catch {
    return freshData();
  }
}

function freshData(): ScanLimitData {
  return {
    scansUsed: 0,
    periodStart: currentMonth(),
    isPro: false,
    proActivatedAt: null,
  };
}

async function saveData(data: ScanLimitData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.scanLimit, JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** How many scans remain in the free tier this month (Infinity if Pro). */
export async function getScansRemaining(): Promise<number> {
  const data = await loadData();
  if (data.isPro) return Infinity;
  return Math.max(0, SCAN_LIMIT.free - data.scansUsed);
}

/** Total scans used this month (regardless of pro status). */
export async function getScansUsed(): Promise<number> {
  const data = await loadData();
  return data.scansUsed;
}

/** True if the free limit is hit and the user is not Pro. */
export async function isAtLimit(): Promise<boolean> {
  const data = await loadData();
  if (data.isPro) return false;
  return data.scansUsed >= SCAN_LIMIT.free;
}

/** Call this before every scan. Returns whether the scan is allowed. */
export async function consumeScan(): Promise<{ allowed: boolean; scansUsed: number; scansRemaining: number }> {
  const data = await loadData();
  if (data.isPro) {
    const updated = { ...data, scansUsed: data.scansUsed + 1 };
    await saveData(updated);
    return { allowed: true, scansUsed: updated.scansUsed, scansRemaining: Infinity };
  }
  if (data.scansUsed >= SCAN_LIMIT.free) {
    return { allowed: false, scansUsed: data.scansUsed, scansRemaining: 0 };
  }
  const updated = { ...data, scansUsed: data.scansUsed + 1 };
  await saveData(updated);
  const remaining = SCAN_LIMIT.free - updated.scansUsed;
  return { allowed: true, scansUsed: updated.scansUsed, scansRemaining: remaining };
}

/** Activate Pro (called after a successful purchase/trial). */
export async function activatePro(): Promise<void> {
  const data = await loadData();
  await saveData({ ...data, isPro: true, proActivatedAt: Date.now() });
}

/** Returns current subscription status for display. */
export async function getSubscriptionStatus(): Promise<{
  isPro: boolean;
  scansUsed: number;
  scansRemaining: number;
  daysUntilReset: number;
}> {
  const data = await loadData();
  const remaining = data.isPro ? Infinity : Math.max(0, SCAN_LIMIT.free - data.scansUsed);
  return {
    isPro: data.isPro,
    scansUsed: data.scansUsed,
    scansRemaining: remaining,
    daysUntilReset: daysUntilMonthEnd(),
  };
}
