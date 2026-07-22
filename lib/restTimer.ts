// lib/restTimer.ts
// Rest timer with local-notification support so the alert fires even when
// the app is backgrounded.  Notification permission is requested lazily on
// first timer use — never at launch.

import * as Notifications from 'expo-notifications';
import { Platform, Vibration } from 'react-native';

const REST_TIMER_NOTIFICATION_ID = 'fitscan-rest-timer';

let permissionRequested = false;

/**
 * Ensure notification permission is granted.
 * Called once on first timer start — never at app launch.
 */
async function ensurePermission(): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    if (permissionRequested) return false; // already asked this session
    permissionRequested = true;

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return false;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('fitscan-rest-timer', {
        name: 'Rest Timer',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 200, 500],
        sound: 'default',
      });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Schedule a local notification that fires after `seconds`.
 * Returns true if the notification was scheduled.
 */
export async function scheduleRestTimerNotification(seconds: number): Promise<boolean> {
  const granted = await ensurePermission();
  if (!granted) return false;

  try {
    // Cancel any previous rest timer notification
    await Notifications.cancelScheduledNotificationAsync(REST_TIMER_NOTIFICATION_ID).catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: REST_TIMER_NOTIFICATION_ID,
      content: {
        title: 'Rest Complete',
        body: 'Time for your next set!',
        sound: 'default',
        ...(Platform.OS === 'android' && { channelId: 'fitscan-rest-timer' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Cancel a previously scheduled rest timer notification.
 * Called when the user returns to the app or skips rest early.
 */
export async function cancelRestTimerNotification(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REST_TIMER_NOTIFICATION_ID);
  } catch {
    // noop
  }
}

/**
 * Trigger a haptic buzz when the in-app timer reaches zero.
 */
export function vibrateOnTimerComplete(): void {
  Vibration.vibrate([0, 400, 200, 400]);
}
