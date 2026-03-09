// lib/profileStorage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export type UserProfile = {
  name: string;
  experienceLevel: "Beginner" | "Intermediate" | "Advanced";
  primaryGoal: string;
  daysPerWeek: number;
  equipmentAccess: string[];
};

const STORAGE_KEY = "fitscan:userProfile";

export async function loadProfile(): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch (e) {
    console.warn("loadProfile error", e);
    return null;
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn("saveProfile error", e);
  }
}

export async function clearProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn("clearProfile error", e);
  }
}

export async function profileExists(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return !!raw;
  } catch {
    return false;
  }
}
