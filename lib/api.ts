// lib/api.ts
// Centralized API service layer

import { API_CONFIG } from './constants';
import { getDeviceId } from './deviceId';

async function getDeviceIdHeader(): Promise<Record<string, string>> {
  try {
    const id = await getDeviceId();
    return { 'x-device-id': id };
  } catch {}
  return {};
}

/**
 * Production backend URL — update this after your first Railway deploy.
 * Railway gives you a permanent URL like: https://fitscan-backend-production.up.railway.app
 */
const RAILWAY_BACKEND_URL = 'https://web-production-a5aa3.up.railway.app';

/**
 * Get the backend URL.
 * Priority: EXPO_PUBLIC_BACKEND_URL env var → Railway URL (prod) → localhost (dev)
 */
const getBackendUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (envUrl) return envUrl;

  // In production builds __DEV__ is false — use the live Railway server
  if (!__DEV__) return RAILWAY_BACKEND_URL;

  // Local development fallback (simulator uses localhost; physical device needs local IP in .env)
  return 'http://localhost:3001';
};

const BACKEND_URL = getBackendUrl();

/**
 * API Error class for better error handling
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Generic fetch wrapper with error handling and timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = API_CONFIG.timeout
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Request timeout - please try again', 408);
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecognitionRequest {
  image_base64: string;
  profile?: UserProfile;
}

export interface UserProfile {
  name?: string;
  experienceLevel?: string;
  primaryGoal?: string;
  daysPerWeek?: number;
  equipmentAccess?: string[];
}

export interface Exercise {
  name: string;
  sets: string;
  reps: string;
  intensity: string;
  muscleGroups: string[];
  description: string;
}

export interface ScanUsage {
  used: number;
  limit: number;
}

export interface ScanLimitResponse {
  code: 'SCAN_LIMIT';
  used: number;
  limit: number;
  resetsOn: string;
}

export interface RecognitionResponse {
  equipment_type: string;
  confidence: 'low' | 'medium' | 'high';
  exercises: Exercise[];
  recommended_exercises?: Exercise[];
  ai_used: boolean;
  from: 'openai' | 'fallback';
  note?: string;
  scanUsage?: ScanUsage;
}

/** A single scanned piece of equipment held in multi-scan state */
export interface ScannedItem {
  id: string;
  equipment_type: string;
  exercises: Exercise[];
  photoUri?: string;
  confidence: 'low' | 'medium' | 'high';
}

/** Request to generate a full workout from multiple equipment types */
export interface WorkoutGenerateRequest {
  equipment_types: string[];
  profile?: UserProfile;
}

/** A single exercise inside a multi-equipment workout plan */
export interface WorkoutExercise extends Exercise {
  equipment: string;
  rest_seconds: number;
}

/** Full workout plan returned by /workout/generate */
export interface WorkoutPlan {
  workout_title: string;
  workout_description: string;
  equipment_used: string[];
  estimated_duration_minutes: number;
  exercises: WorkoutExercise[];
  ai_used: boolean;
  from: 'openai' | 'fallback';
  note?: string;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Check if the backend is healthy
 */
export async function checkHealth(): Promise<{
  status: string;
  openaiConfigured: boolean;
  authEnabled: boolean;
  monetizationEnabled?: boolean;
  scanCap?: number;
}> {
  try {
    const response = await fetchWithTimeout(`${BACKEND_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new ApiError('Health check failed', response.status);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Unable to connect to backend. Please check your connection.', 0);
  }
}

/**
 * Recognize a single piece of equipment from a base64-encoded image
 */
export async function recognizeEquipment(
  request: RecognitionRequest
): Promise<RecognitionResponse> {
  try {
    const customerHeader = await getDeviceIdHeader();
    const response = await fetchWithTimeout(`${BACKEND_URL}/equipment/recognize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...customerHeader },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        (errorData as { message?: string }).message || 'Failed to recognize equipment',
        response.status,
        errorData
      );
    }

    const data = await response.json();

    // Server-side scan limit hit — structured response, not an error
    if (data.code === 'SCAN_LIMIT') {
      throw new ApiError('SCAN_LIMIT', 200, data as ScanLimitResponse);
    }

    if (!data.equipment_type || !data.exercises) {
      throw new ApiError('Invalid response from server', 500, data);
    }

    return data as RecognitionResponse;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error) throw new ApiError(`Network error: ${error.message}`, 0);
    throw new ApiError('An unexpected error occurred', 0);
  }
}

/**
 * Generate a full workout plan from multiple scanned equipment types
 */
export async function generateWorkout(
  request: WorkoutGenerateRequest
): Promise<WorkoutPlan> {
  try {
    const customerHeader = await getDeviceIdHeader();
    const response = await fetchWithTimeout(
      `${BACKEND_URL}/workout/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...customerHeader },
        body: JSON.stringify(request),
      },
      // Allow extra time for multi-exercise AI generation
      API_CONFIG.timeout * 1.5
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        (errorData as { message?: string }).message || 'Failed to generate workout',
        response.status,
        errorData
      );
    }

    const data: WorkoutPlan = await response.json();

    if (!data.exercises || !Array.isArray(data.exercises)) {
      throw new ApiError('Invalid workout response from server', 500, data);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error) throw new ApiError(`Network error: ${error.message}`, 0);
    throw new ApiError('An unexpected error occurred', 0);
  }
}

// Email capture removed — re-add when cloud sync ships

/**
 * Fetch an exercise demo GIF URL by name.
 * Returns null if not found or if the backend has no API key configured.
 * Never throws — designed to be called without breaking any UI flow.
 */
export async function getExerciseGif(name: string): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(
      `${BACKEND_URL}/exercises/gif?name=${encodeURIComponent(name)}`,
      { method: 'GET' },
      8_000
    );
    if (!response.ok) return null;
    const data = await response.json();
    return (data.gifUrl as string) || null;
  } catch {
    return null;
  }
}

/**
 * Track an analytics event (fire-and-forget).
 * Automatically includes the device metering ID.
 */
export async function trackEvent(event: string, _deviceId?: string, metadata?: Record<string, unknown>): Promise<void> {
  try {
    const autoDeviceId = await getDeviceId().catch(() => _deviceId);
    await fetchWithTimeout(`${BACKEND_URL}/events/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, deviceId: autoDeviceId ?? _deviceId, metadata }),
    }, 5_000);
  } catch {
    // Never block UX for analytics
  }
}

/**
 * Delete all server-side data for this device (GDPR / Play Data Safety).
 * Purges events, workouts, and scan_meters rows keyed on x-device-id.
 */
export async function deleteMyData(): Promise<{ deleted: Record<string, number> }> {
  const deviceHeader = await getDeviceIdHeader();
  const response = await fetchWithTimeout(`${BACKEND_URL}/users/data`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...deviceHeader },
  }, 15_000);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      (errorData as { message?: string }).message || 'Failed to delete data',
      response.status,
      errorData
    );
  }

  return await response.json();
}

/**
 * Retry wrapper for API calls
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts: number = API_CONFIG.retryAttempts,
  delay: number = API_CONFIG.retryDelay
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on client errors (4xx) except timeout
      if (error instanceof ApiError && error.statusCode) {
        if (error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 408) {
          throw error;
        }
      }

      if (i < attempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}

/**
 * Check if the backend is reachable
 */
export async function isBackendReachable(): Promise<boolean> {
  try {
    await checkHealth();
    return true;
  } catch {
    return false;
  }
}

