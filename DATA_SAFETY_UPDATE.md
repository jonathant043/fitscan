# DATA_SAFETY_UPDATE.md — Workout Companion Release

This document covers the Play Store Data Safety form changes required for the
"Workout Companion" release (per-set weight/rep logging, rest timer, in-app
review prompt).

---

## Summary of New Data Collected

| Data type | What changed | Storage | Shared? |
|-----------|-------------|---------|---------|
| **Fitness activity** (weight lifted, reps completed per set) | NEW — user manually enters per-set data | Device only (AsyncStorage) | No |
| **App interactions** (workout completion count for review prompt) | NEW — counter stored locally | Device only (AsyncStorage) | No |
| **Weight-unit preference** (lbs / kg) | NEW — user setting | Device only (AsyncStorage) | No |

No new data is sent to the backend. All workout companion data stays on-device.

---

## Play Console → Data Safety Form Updates

### 1. Data types — "What data does your app collect or share?"

**Fitness info → Fitness info**
- [x] **Collected**: Yes
- [x] **Shared**: No
- **Purpose**: App functionality
- **Is this data processed ephemerally?**: No (persisted in local storage for "last time" prefill)
- **Is this data required or can users choose whether it's collected?**: Optional — users can skip set logging and just tap "Finish Workout"
- **[VERIFY]** Google's "Fitness info" sub-type may list specific options. Select whichever covers "exercise / workout tracking data" — likely **"Fitness info"** under Health and Fitness.

**App activity → App interactions**
- [x] **Collected**: Yes (already declared — no change needed if previously declared for scan tracking)
- **[VERIFY]** If "App interactions" was not previously declared, add it now. The review-prompt flag (`reviewPromptShown`) and workout completion count both qualify.

### 2. Data handling — no changes

- **Encryption in transit**: Not applicable (data never leaves the device)
- **Deletion mechanism**: Existing "Clear History" in profile screen deletes all workout data including set logs. No change needed.
- **[VERIFY]** Confirm that your existing data deletion instructions URL covers "workout history and exercise logs" in the description.

### 3. Items that do NOT need updating

| Item | Reason |
|------|--------|
| Device or Other IDs | Already declared (Stripe SDK) — no change |
| Photos | Already declared (camera scan) — no change |
| Purchase history | Already declared (subscriptions) — no change |
| Location | Not collected — no change |
| Personal info | Not collected — no change |

---

## Privacy Policy Delta

Add the following to the "Information We Collect" section:

> **Workout Logging Data.** When you use the workout companion feature, you may
> optionally log the weight and repetitions for each set of each exercise. This
> data is stored exclusively on your device and is never transmitted to our
> servers. It is used solely to pre-fill your previous performance the next time
> you perform the same exercise. You can delete all workout data at any time
> from the Profile screen.

> **In-App Review.** After completing your second or third workout, we may
> prompt you to rate the app using the platform's native review dialog. No
> personal data is collected by this prompt — it is handled entirely by the
> App Store or Google Play.

**[VERIFY]** Review your existing privacy policy at fitscanfitness.com/privacy to confirm these paragraphs don't conflict with existing language. If the policy already has a "workout history" clause, amend it to mention "weight, reps, and set-level detail" rather than adding a new paragraph.

---

## Notifications

The rest timer schedules a local notification when the user starts a rest
period. Notification permission is requested **on first timer use**, not at
launch. This was already covered by the existing `expo-notifications` setup
and the `RECEIVE_BOOT_COMPLETED` / `SCHEDULE_EXACT_ALARM` Android permissions
in app.json.

**[VERIFY]** If your privacy policy does not already mention local notifications,
add: "We may send you local (on-device) notifications such as rest timer alerts
and workout reminders. These do not transmit data to any server."

---

## No Backend Changes

This release adds zero new backend endpoints. All set-log data is stored and
read from AsyncStorage on the device. The existing `POST /workout/generate`
and `POST /equipment/recognize` endpoints are unchanged.

---

## Checklist Before Submitting

- [ ] Update Data Safety form with Fitness info collection
- [ ] Verify "App interactions" is already declared or add it
- [ ] Update privacy policy text at fitscanfitness.com/privacy
- [ ] Verify deletion instructions URL mentions workout/exercise logs
- [ ] Verify local notification mention in privacy policy
- [ ] Submit Data Safety form update
- [ ] Upload new .aab (versionCode 10)
