// lib/notifications.ts
// Push notification registration and local scheduling for engagement/retention nudges.

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadStats } from "./workoutHistory";

const PUSH_TOKEN_KEY = "fitscan:pushToken";

// How the app handles notifications while it's foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Request notification permission and store the Expo push token.
 * Safe to call multiple times — no-ops if already granted.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return null;

    // Android requires a notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("fitscan-reminders", {
        name: "Workout Reminders",
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    return token;
  } catch {
    return null;
  }
}

export async function getStoredPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Scheduling helpers
// ---------------------------------------------------------------------------

const DORMANCY_ID = "fitscan-dormancy-nudge";
const STREAK_ID = "fitscan-streak-risk";

/**
 * Cancel all FitScan scheduled notifications.
 */
export async function cancelAllScheduled(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DORMANCY_ID).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(STREAK_ID).catch(() => {});
}

/**
 * Called every time the user completes a workout.
 * Cancels any existing reminders then re-schedules:
 *  - 3-day dormancy nudge ("Haven't scanned in a while...")
 *  - Streak-at-risk nudge if streak >= 2 (fires after 23 h so it shows before the day ends)
 */
export async function schedulePostWorkoutNotifications(): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;

    // Cancel stale reminders before rescheduling
    await cancelAllScheduled();

    const stats = await loadStats();

    // --- 3-day dormancy nudge ---
    const nudges = [
      "Your gym equipment is calling 📣 — scan to get your next workout!",
      "3 days since your last workout. Time to get back at it!",
      "Your streak is waiting — scan any equipment to keep it alive!",
    ];
    const nudgeBody = nudges[Math.floor(Math.random() * nudges.length)];

    await Notifications.scheduleNotificationAsync({
      identifier: DORMANCY_ID,
      content: {
        title: "FitScan",
        body: nudgeBody,
        data: { type: "dormancy" },
        ...(Platform.OS === "android" && { channelId: "fitscan-reminders" }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3 * 24 * 60 * 60, // 3 days
        repeats: false,
      },
    });

    // --- Streak-at-risk nudge (only meaningful if they have a streak) ---
    if (stats.currentStreak >= 2) {
      await Notifications.scheduleNotificationAsync({
        identifier: STREAK_ID,
        content: {
          title: `🔥 ${stats.currentStreak}-day streak at risk!`,
          body: "Scan any equipment today to keep your streak alive.",
          data: { type: "streak" },
          ...(Platform.OS === "android" && { channelId: "fitscan-reminders" }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 23 * 60 * 60, // 23 hours — fires before the streak breaks
          repeats: false,
        },
      });
    }
  } catch {
    // Never crash UX for notifications
  }
}
