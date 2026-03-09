// lib/constants.ts
// Centralized constants for the FitScan app

/**
 * Color palette
 */
export const COLORS = {
  // Background colors
  background: '#020817',
  backgroundDark: '#0f172a',
  backgroundLight: '#1e293b',

  // Primary colors
  primary: '#38bdf8',
  primaryDark: '#0284c7',
  primaryLight: '#7dd3fc',

  // Text colors
  text: '#ffffff',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',

  // Status colors
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Difficulty colors
  beginner: '#22c55e',
  intermediate: '#f59e0b',
  advanced: '#ef4444',

  // UI elements
  border: '#334155',
  card: '#1e293b',
  overlay: 'rgba(0, 0, 0, 0.5)',
} as const;

/**
 * Equipment types
 */
export const EQUIPMENT_TYPES = [
  'dumbbell',
  'barbell',
  'kettlebell',
  'resistance_band',
  'bench',
  'pull_up_bar',
  'cable_machine',
  'exercise_ball',
  'mat',
  'foam_roller',
  'jump_rope',
  'bodyweight',
] as const;

export type EquipmentType = typeof EQUIPMENT_TYPES[number];

/**
 * Muscle groups
 */
export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'cardio',
] as const;

export type MuscleGroup = typeof MUSCLE_GROUPS[number];

/**
 * Experience levels
 */
export const EXPERIENCE_LEVELS = [
  'Beginner',
  'Intermediate',
  'Advanced',
] as const;

export type ExperienceLevel = typeof EXPERIENCE_LEVELS[number];

/**
 * Fitness goals
 */
export const FITNESS_GOALS = [
  'Build Muscle',
  'Lose Weight',
  'Get Stronger',
  'Improve Endurance',
  'General Fitness',
] as const;

export type FitnessGoal = typeof FITNESS_GOALS[number];

/**
 * Days per week options
 */
export const DAYS_PER_WEEK = [2, 3, 4, 5, 6] as const;

export type DaysPerWeek = typeof DAYS_PER_WEEK[number];

/**
 * API configuration
 */
export const API_CONFIG = {
  timeout: 60000, // 60 seconds — allows for slow mobile connections
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
} as const;

/**
 * Image compression settings
 */
export const IMAGE_CONFIG = {
  quality: 0.6,
  maxWidth: 1024,
  maxHeight: 1024,
  format: 'jpeg',
} as const;

/**
 * Storage keys
 */
export const STORAGE_KEYS = {
  userProfile: 'fitscan:userProfile',
  workoutHistory: 'fitscan:workoutHistory',
  favorites: 'fitscan:favorites',
  scanLimit: 'fitscan:scanLimit',
} as const;

export const SCAN_LIMIT = {
  free: 10,
} as const;
