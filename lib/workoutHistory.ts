// lib/workoutHistory.ts
// Workout history persistence — drives streaks and retention features

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './constants';
import type { WorkoutPlan } from './api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SavedExercise {
  name: string;
  sets: string;
  reps: string;
  muscleGroups: string[];
  description?: string;
}

export interface HistoryEntry {
  id: string;
  date: string;          // ISO date string e.g. "2026-03-03"
  timestamp: number;     // Unix ms
  workout_title: string;
  equipment_used: string[];
  exercise_count: number;
  estimated_duration_minutes: number;
  muscle_groups: string[];  // canonical muscle groups trained in this workout
  exercises?: SavedExercise[];
  ai_used: boolean;
}

// Canonical muscle groups tracked for the heatmap
export const CANONICAL_MUSCLES = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Core', 'Legs', 'Glutes'] as const;

export interface WorkoutStats {
  totalWorkouts: number;
  totalScans: number;      // sum of equipment pieces scanned across all workouts
  currentStreak: number;   // consecutive days with at least one workout
  longestStreak: number;
  lastWorkoutDate: string | null;
  thisWeekCount: number;
  totalMinutes: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeMuscleGroup(mg: string): string | null {
  const s = mg.toLowerCase().trim();
  if (s.includes('chest') || s.includes('pec')) return 'Chest';
  if (s.includes('back') || s.includes('lat') || s.includes('rhomboid') || s.includes('trap') || s.includes('rear delt')) return 'Back';
  if (s.includes('shoulder') || s.includes('delt') || s.includes('rotator')) return 'Shoulders';
  if (s.includes('bicep')) return 'Biceps';
  if (s.includes('tricep')) return 'Triceps';
  if (s.includes('core') || s.includes('abs') || s.includes('abdominal') || s.includes('oblique')) return 'Core';
  if (s.includes('quad') || s.includes('hamstring') || s.includes('leg') || s.includes('calf') || s.includes('calve') || s.includes('lunge') || s.includes('squat')) return 'Legs';
  if (s.includes('glute') || s.includes('hip') || s.includes('butt')) return 'Glutes';
  return null;
}

function extractMuscleGroups(plan: import('./api').WorkoutPlan): string[] {
  const muscles = new Set<string>();
  for (const exercise of plan.exercises ?? []) {
    for (const mg of (exercise as { muscleGroups?: string[] }).muscleGroups ?? []) {
      const normalized = normalizeMuscleGroup(mg);
      if (normalized) muscles.add(normalized);
    }
  }
  return [...muscles];
}

// ---------------------------------------------------------------------------
// Core storage operations
// ---------------------------------------------------------------------------

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.workoutHistory);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveHistory(entries: HistoryEntry[]): Promise<void> {
  // Keep only the last 365 entries to bound storage
  const trimmed = entries.slice(-365);
  await AsyncStorage.setItem(STORAGE_KEYS.workoutHistory, JSON.stringify(trimmed));
}

/**
 * Append a completed WorkoutPlan to the history log.
 * Called fire-and-forget from the scanner screen.
 */
export async function saveWorkoutToHistory(plan: WorkoutPlan): Promise<void> {
  const history = await loadHistory();
  const entry: HistoryEntry = {
    id: makeId(),
    date: todayISO(),
    timestamp: Date.now(),
    workout_title: plan.workout_title,
    equipment_used: plan.equipment_used ?? [],
    exercise_count: plan.exercises?.length ?? 0,
    estimated_duration_minutes: plan.estimated_duration_minutes ?? 0,
    muscle_groups: extractMuscleGroups(plan),
    exercises: (plan.exercises ?? []).map((ex) => ({
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      muscleGroups: ex.muscleGroups ?? [],
      description: ex.description,
    })),
    ai_used: plan.ai_used ?? false,
  };
  await saveHistory([...history, entry]);
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.workoutHistory);
}

// ---------------------------------------------------------------------------
// Streak & stats computation
// ---------------------------------------------------------------------------

export function computeStats(history: HistoryEntry[]): WorkoutStats {
  if (history.length === 0) {
    return {
      totalWorkouts: 0,
      totalScans: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastWorkoutDate: null,
      thisWeekCount: 0,
      totalMinutes: 0,
    };
  }

  // Unique dates worked out (sorted descending)
  const dateSet = new Set(history.map((e) => e.date));
  const sortedDates = [...dateSet].sort().reverse();

  // Current streak
  let currentStreak = 0;
  let cursor = todayISO();
  for (const date of sortedDates) {
    if (date === cursor || date === daysAgoISO(currentStreak)) {
      currentStreak++;
      cursor = daysAgoISO(currentStreak);
    } else {
      break;
    }
  }

  // Longest streak
  const ascDates = [...dateSet].sort();
  let longest = 0;
  let run = 0;
  for (let i = 0; i < ascDates.length; i++) {
    if (i === 0) {
      run = 1;
    } else {
      const prev = new Date(ascDates[i - 1]);
      const curr = new Date(ascDates[i]);
      const diff = (curr.getTime() - prev.getTime()) / 86_400_000;
      run = diff === 1 ? run + 1 : 1;
    }
    if (run > longest) longest = run;
  }

  // This week count (Sun-Sat)
  const weekAgo = daysAgoISO(6);
  const thisWeekCount = history.filter((e) => e.date >= weekAgo).length;

  const totalMinutes = history.reduce((sum, e) => sum + (e.estimated_duration_minutes ?? 0), 0);
  const totalScans = history.reduce((sum, e) => sum + (e.equipment_used?.length ?? 0), 0);

  return {
    totalWorkouts: history.length,
    totalScans,
    currentStreak,
    longestStreak: Math.max(longest, currentStreak),
    lastWorkoutDate: sortedDates[0] ?? null,
    thisWeekCount,
    totalMinutes,
  };
}

/**
 * Convenience: load history and return computed stats in one call.
 */
export async function loadStats(): Promise<WorkoutStats> {
  const history = await loadHistory();
  return computeStats(history);
}

// ---------------------------------------------------------------------------
// Muscle group activity
// ---------------------------------------------------------------------------

/**
 * Returns days since each canonical muscle group was last trained.
 * null = never trained.
 */
export function getMuscleGroupActivity(history: HistoryEntry[]): Record<string, number | null> {
  const todayMs = new Date(todayISO()).getTime();
  const result: Record<string, number | null> = {};

  for (const muscle of CANONICAL_MUSCLES) {
    result[muscle] = null;
    for (let i = history.length - 1; i >= 0; i--) {
      const entry = history[i];
      if ((entry.muscle_groups ?? []).includes(muscle)) {
        const entryMs = new Date(entry.date).getTime();
        result[muscle] = Math.round((todayMs - entryMs) / 86_400_000);
        break;
      }
    }
  }

  return result;
}

/**
 * Returns a smart nudge string if a major muscle group hasn't been trained
 * in 5+ days, or null if everything looks well-balanced.
 */
export function getSmartNudge(history: HistoryEntry[]): string | null {
  if (history.length === 0) return null;

  const activity = getMuscleGroupActivity(history);
  const neglected: { muscle: string; days: number | null }[] = [];

  for (const [muscle, days] of Object.entries(activity)) {
    if (days === null || days >= 5) neglected.push({ muscle, days });
  }

  if (neglected.length === 0) return null;

  neglected.sort((a, b) => {
    if (a.days === null && b.days !== null) return -1;
    if (a.days !== null && b.days === null) return 1;
    return (b.days ?? 999) - (a.days ?? 999);
  });

  const { muscle, days } = neglected[0];
  if (days === null) return `You haven't trained ${muscle} yet — try it on your next scan!`;
  return `You haven't trained ${muscle} in ${days} days — time to hit it!`;
}
