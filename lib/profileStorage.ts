// lib/profileStorage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "./constants";

export type TrainingLocation = "Commercial gym" | "Home" | "Both";

export type UserProfile = {
  name: string;
  experienceLevel: "Beginner" | "Intermediate" | "Advanced";
  primaryGoal: string;
  daysPerWeek: number;
  equipmentAccess: string[];
  trainingLocation?: TrainingLocation;
  avoidAreas?: string[];
};

export async function loadProfile(): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.userProfile);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch (e) {
    console.warn("loadProfile error", e);
    return null;
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.userProfile, JSON.stringify(profile));
  } catch (e) {
    console.warn("saveProfile error", e);
  }
}

export async function clearProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.userProfile);
  } catch (e) {
    console.warn("clearProfile error", e);
  }
}

export async function profileExists(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.userProfile);
    return !!raw;
  } catch {
    return false;
  }
}
