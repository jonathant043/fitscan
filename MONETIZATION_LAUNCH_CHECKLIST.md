# Monetization v2 Launch Checklist

Step-by-step checklist to complete before enabling monetization in production.

---

## Play Console Setup

- [ ] Create subscription product: `fitscan_pro_monthly` -- $9.99/month, 7-day free trial
- [ ] Create subscription product: `fitscan_pro_annual` -- $79.99/year, 7-day free trial
- [ ] Activate Play Billing (linked to `com.fitscan.app`)
- [ ] Set up a license tester Google account for test purchases (Play Console > Settings > License testing)

## RevenueCat Setup

- [ ] Create RevenueCat project for Android
- [ ] Copy the Android API key
- [ ] Set `EXPO_PUBLIC_REVENUECAT_API_KEY` in `eas.json` under `preview` profile build env
- [ ] Set `EXPO_PUBLIC_REVENUECAT_API_KEY` in `eas.json` under `production` profile build env
- [ ] Create entitlement: `pro`
- [ ] Create offering: "default"
  - [ ] Add package for `fitscan_pro_monthly` (maps to Play product ID `fitscan_pro_monthly`)
  - [ ] Add package for `fitscan_pro_annual` (maps to Play product ID `fitscan_pro_annual`)
- [ ] Configure webhook URL: `https://web-production-a5aa3.up.railway.app/webhooks/revenuecat`
  - [ ] Set an Authorization header secret in RevenueCat
  - [ ] Set `REVENUECAT_WEBHOOK_SECRET` env var on Railway to match
- [ ] Verify sandbox purchases work end-to-end with license tester account

## Founder's Stripe Teardown

- [ ] Cancel your own Stripe subscription (if active)
- [ ] Deactivate Stripe API keys on Railway dashboard
- [ ] Remove the following env vars from Railway:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_BASIC`
  - `STRIPE_PRICE_PRO`
  - `STRIPE_PRICE_ANNUAL`

## Flag-Flip Procedure

- [ ] Set `MONETIZATION_ENABLED=true` on Railway dashboard
- [ ] `SCAN_CAP=10` is already the default -- only change if you want a different free-tier limit
- [ ] Verify: scan limit is enforced after 10 scans
- [ ] Verify: paywall appears when limit is reached
- [ ] Verify: purchase flow completes successfully

## End-to-End Test Purchase Verification

1. Install the app on a device signed in with the license tester Google account
2. Complete the onboarding quiz
3. Scan 10 items to exhaust the free tier
4. Verify the paywall appears with "SCAN_LIMIT" context
5. Purchase the annual plan
6. Verify the trial started and unlimited scans are available
7. Try multi-scan -- verify the 2nd item adds without a gate
8. Kill the app and reinstall
9. Restore purchases -- verify pro status is restored
10. Cancel the subscription (via Play Store)
11. Verify the scan limit returns after cancellation takes effect

## Rollback (Flag OFF)

If something goes wrong after launch:

- [ ] Set `MONETIZATION_ENABLED=false` on Railway dashboard
- No code deploy is needed
- Metering continues silently in the background, but the cap and paywall are disabled
- The app behaves as fully free immediately
