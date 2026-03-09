// lib/api.ts
// Centralized API service layer

import { API_CONFIG } from './constants';

/**
 * Production backend URL — update this after your first Railway deploy.
 * Railway gives you a permanent URL like: https://fitscan-backend-production.up.railway.app
 */
const RAILWAY_BACKEND_URL = 'https://YOUR-APP.up.railway.app';

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

export interface RecognitionResponse {
  equipment_type: string;
  confidence: 'low' | 'medium' | 'high';
  exercises: Exercise[];
  recommended_exercises?: Exercise[];
  ai_used: boolean;
  from: 'openai' | 'fallback';
  note?: string;
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
    const response = await fetchWithTimeout(`${BACKEND_URL}/equipment/recognize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

    const data: RecognitionResponse = await response.json();

    if (!data.equipment_type || !data.exercises) {
      throw new ApiError('Invalid response from server', 500, data);
    }

    return data;
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
    const response = await fetchWithTimeout(
      `${BACKEND_URL}/workout/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

// ---------------------------------------------------------------------------
// Stripe subscription helpers
// ---------------------------------------------------------------------------

export type PlanId = "basic" | "pro" | "annual";

export interface SetupIntentResponse {
  clientSecret: string;
  customerId: string;
}

export interface ActivateSubscriptionResponse {
  subscriptionId: string;
  status: string;
  trialEnd: number | null;
  currentPeriodEnd: number;
}

/** Returns the Stripe publishable key from the backend. */
export async function getStripePublishableKey(): Promise<string> {
  const response = await fetchWithTimeout(`${BACKEND_URL}/subscriptions/publishable-key`);
  if (!response.ok) throw new ApiError("Failed to fetch Stripe key", response.status);
  const data = await response.json();
  return data.publishableKey;
}

/** Creates a Stripe Customer + SetupIntent. Returns the clientSecret for PaymentSheet. */
export async function createSetupIntent(
  planId: PlanId,
  email?: string
): Promise<SetupIntentResponse> {
  const response = await fetchWithTimeout(`${BACKEND_URL}/subscriptions/create-setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan_id: planId, email }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new ApiError(err.message || "Could not initialise payment", response.status);
  }
  return response.json();
}

/** Activates the subscription after the card is saved via PaymentSheet. */
export async function activateSubscription(
  customerId: string,
  paymentMethodId: string,
  planId: PlanId
): Promise<ActivateSubscriptionResponse> {
  const response = await fetchWithTimeout(`${BACKEND_URL}/subscriptions/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerId, paymentMethodId, plan_id: planId }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new ApiError(err.message || "Could not activate subscription", response.status);
  }
  return response.json();
}
