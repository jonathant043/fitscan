// lib/purchases.ts
// RevenueCat integration — wraps react-native-purchases for FitScan.
// Entitlement ID: "pro"
// Product IDs: fitscan_pro_monthly, fitscan_pro_annual

import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './constants';
import { getDeviceId } from './deviceId';

// RevenueCat API key — set in app config; founder creates project in RC dashboard
const RC_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '';

const ENTITLEMENT_ID = 'pro';

let initialized = false;
let initPromise: Promise<void> | null = null;

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Configure RevenueCat with the device metering ID as the app user ID.
 * Call once at app startup (in _layout.tsx).
 */
export async function initPurchases(): Promise<void> {
  if (!initPromise) {
    initPromise = doInit();
  }
  return initPromise;
}

async function doInit(): Promise<void> {
  if (initialized || !RC_API_KEY) return;

  const deviceId = await getDeviceId();

  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey: RC_API_KEY, appUserID: deviceId });

  initialized = true;

  // Seed the cached entitlement state
  try {
    const info = await Purchases.getCustomerInfo();
    await cacheProStatus(hasPro(info));
  } catch {
    // Offline — cached state from last launch will be used
  }
}

// ---------------------------------------------------------------------------
// Entitlement checks
// ---------------------------------------------------------------------------

function hasPro(info: CustomerInfo): boolean {
  return !!info.entitlements.active[ENTITLEMENT_ID];
}

/**
 * Check if the user has the "pro" entitlement.
 * Online: queries RevenueCat (source of truth) and updates cache.
 * Offline: falls back to cached value from last successful check.
 */
export async function checkProEntitlement(): Promise<boolean> {
  try {
    await initPurchases();
    if (!initialized) return getCachedProStatus();
    const info = await Purchases.getCustomerInfo();
    const isPro = hasPro(info);
    await cacheProStatus(isPro);
    return isPro;
  } catch {
    return getCachedProStatus();
  }
}

/**
 * Returns whether RevenueCat reports trial eligibility for the current offerings.
 * Used to decide CTA copy ("START 7-DAY FREE TRIAL" vs "GET PRO").
 */
export async function isTrialEligible(): Promise<boolean> {
  try {
    await initPurchases();
    if (!initialized) return true;
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return true;

    for (const pkg of current.availablePackages) {
      const product = pkg.product;
      if (product.introPrice && product.introPrice.price === 0) {
        return true;
      }
    }
    return false;
  } catch {
    return true;
  }
}

// ---------------------------------------------------------------------------
// Purchasing
// ---------------------------------------------------------------------------

/**
 * Get the current RevenueCat offering (contains available packages/products).
 */
export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  try {
    await initPurchases();
    if (!initialized) return null;
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch {
    return null;
  }
}

/**
 * Purchase a specific package. Returns true if purchase succeeded.
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
  try {
    await initPurchases();
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPro = hasPro(customerInfo);
    await cacheProStatus(isPro);
    return isPro;
  } catch (e: unknown) {
    const err = e as { userCancelled?: boolean };
    if (err.userCancelled) return false;
    throw e;
  }
}

/**
 * Restore previous purchases (Play policy requirement).
 */
export async function restorePurchases(): Promise<boolean> {
  try {
    await initPurchases();
    const info = await Purchases.restorePurchases();
    const isPro = hasPro(info);
    await cacheProStatus(isPro);
    return isPro;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Cache — advisory local mirror, RevenueCat is truth
// ---------------------------------------------------------------------------

async function cacheProStatus(isPro: boolean): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.scanLimit);
    const currentMonth = new Date().toISOString().slice(0, 7);
    const data = raw ? JSON.parse(raw) : { scansUsed: 0, periodStart: currentMonth, isPro: false, proActivatedAt: null };
    data.isPro = isPro;
    if (isPro && !data.proActivatedAt) data.proActivatedAt = Date.now();
    await AsyncStorage.setItem(STORAGE_KEYS.scanLimit, JSON.stringify(data));
  } catch {
    // Best effort
  }
}

async function getCachedProStatus(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.scanLimit);
    if (!raw) return false;
    return JSON.parse(raw).isPro === true;
  } catch {
    return false;
  }
}
