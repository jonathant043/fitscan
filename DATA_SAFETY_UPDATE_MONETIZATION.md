# Data Safety Update — Monetization v2

Play Store Data Safety form declarations for the Monetization v2 release.

This release replaces Stripe with RevenueCat + Google Play Billing and adds
server-side scan metering. The privacy posture changes: data that was previously
on-device only (scan counts, usage events) is now transmitted to and stored on
the backend server.

---

## Declared Data Types

### Device or other IDs

- **Collected**: Yes
- **Shared**: No
- **Purpose**: App functionality, Analytics
- **Details**: A random UUID is generated on first launch, stored locally, and
  sent with every scan request as the `x-device-id` header. It keys the
  server-side scan meter (monthly usage tracking) and analytics events. It is
  not linked to any Google account, name, email, or other PII. It resets on
  reinstall.
- **Note**: This declaration existed previously for Stripe SDK fingerprinting.
  Stripe is removed, but the metering UUID re-introduces a device identifier
  that is transmitted off-device and stored. **Keep this declared — do not
  remove.**

### App activity → App interactions

- **Collected**: Yes
- **Shared**: No
- **Purpose**: Analytics, App functionality
- **Details**: Scan counts (per-month usage for free-tier metering), quiz
  completion (with non-sensitive selections: goal, experience level, training
  days), paywall views, and subscription conversion events. All events are
  keyed by the device UUID only. No health, injury, or fitness data is included
  in analytics payloads.

### Financial info → Purchase history

- **Collected**: Yes
- **Shared**: Yes — RevenueCat (payment/subscription processor)
- **Purpose**: App functionality, Account management
- **Details**: Subscription purchases are processed through Google Play Billing.
  RevenueCat receives the Google Play purchase token and subscription status to
  manage entitlements. We do not receive or store payment card details.
  Subscription status (active, trialing, expired) is mirrored on our server to
  gate premium features. RevenueCat processes data on our behalf and does not
  use it for their own purposes.

### Photos (Camera)

- **Collected**: Yes (unchanged from previous release)
- **Shared**: No
- **Purpose**: App functionality
- **Details**: Equipment photos are captured, resized, and sent to the backend
  for AI recognition. Photos are not stored server-side after processing.

---

## Not Declared

- **Health info / Fitness info**: Injury selections (`avoidAreas`) from the quiz
  are stored on-device only and sent per-request to the workout generation
  endpoint. They are injected into the AI prompt and discarded — never persisted
  in any server database. The OpenAI transfer is transient (30-day abuse
  monitoring retention, not used for training, processor relationship). Since
  injury data is never retained server-side, it does not meet the "collected"
  threshold.
- **Email**: The email capture feature is currently disabled. If re-enabled,
  declare Personal info → Email address as Collected.

---

## Data Handling

### Encryption in transit

All data is transmitted over HTTPS (TLS). The production backend is hosted on
Railway, which serves HTTP/2 over TLS by default. The app hardcodes `https://`
for the production URL. **Attest "Yes" for encryption in transit.**

### Data deletion

Users can delete their server-side data via:

- **In-app**: Profile screen → "Delete my data" button (two-step confirmation)
- **Endpoint**: `DELETE /users/data` with `x-device-id` header

This purges all rows from `events`, `workouts`, `scan_meters`, and
`captured_emails` for the given device identifier. Purchase/subscription records
managed by RevenueCat and Google Play are retained as required by financial
record-keeping obligations and are managed through Google Play's subscription
management.

**Declare on the form**: "Users can request data deletion" → Yes, via in-app
mechanism.

### Data retention

- Analytics events, workout history, and scan meters: deleted on user request
  via the in-app deletion mechanism, or retained indefinitely if no request is
  made.
- Purchase/subscription records: retained by RevenueCat and Google Play as
  required by applicable financial regulations.

---

## Removals from Previous Declaration

- **Stripe SDK fingerprinting**: Stripe SDK is no longer bundled. Any
  Stripe-specific data collection declarations should be removed. Note that
  the Device IDs declaration remains (see above) — it now covers the metering
  UUID rather than Stripe fingerprinting.

---

## Related

See [PRIVACY_POLICY_DELTA.md](./PRIVACY_POLICY_DELTA.md) for privacy policy
text updates.
