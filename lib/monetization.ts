// lib/monetization.ts
// Caches the server-side MONETIZATION_ENABLED flag.
// Fetched once at startup from /health — defaults to false (hidden) if unreachable.

import { checkHealth } from './api';

let _enabled: boolean = false;
let _fetched: boolean = false;

/**
 * Fetch and cache the monetization flag from the backend.
 * Call once at app startup. Non-throwing — defaults to false on error.
 */
export async function fetchMonetizationFlag(): Promise<void> {
  try {
    const health = await checkHealth();
    _enabled = health.monetizationEnabled === true;
  } catch {
    _enabled = false;
  }
  _fetched = true;
}

/**
 * Returns true if monetization UI should be shown.
 * Returns false until fetchMonetizationFlag() completes, or if the flag is off.
 */
export function isMonetizationEnabled(): boolean {
  return _fetched && _enabled;
}
