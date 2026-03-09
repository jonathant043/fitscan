# FitScan

AI fitness app — point your camera at gym equipment and get a personalized workout instantly.

Built with React Native + Expo. Backend lives at [fitscan-backend](https://github.com/jonathant043/fitscan-backend).

---

## What it does

1. **Scan** — open the camera, point at any piece of gym equipment
2. **Identify** — OpenAI GPT-4o-mini recognizes what it is
3. **Workout** — get 5 tailored exercises with sets, reps, and coaching cues
4. **Multi-scan** — queue multiple pieces of equipment to generate one full workout

---

## Screens

| Screen | Description |
|---|---|
| Home | Stats, current streak, recent workout history |
| Scanner | Live camera with AI equipment recognition |
| Exercises | Browse 100+ exercises by muscle group |
| Profile | Set experience level, goal, and available equipment |
| Paywall | Stripe subscription — Basic / Pro / Annual |

---

## Tech Stack

- **React Native** 0.81 + **Expo** 54
- **TypeScript** 5.9
- **expo-router** — file-based navigation
- **@stripe/stripe-react-native** — subscription payments
- **AsyncStorage** — local persistence (no database)
- **OpenAI GPT-4o-mini** — equipment recognition (via backend)

---

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Backend running (see [fitscan-backend](https://github.com/jonathant043/fitscan-backend))

### Install

```bash
git clone https://github.com/jonathant043/fitscan.git
cd fitscan
npm install
```

### Configure

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```env
# Simulator
EXPO_PUBLIC_BACKEND_URL=http://localhost:3001

# Physical device — find your IP: ipconfig getifaddr en0
EXPO_PUBLIC_BACKEND_URL=http://YOUR_LOCAL_IP:3001

# Stripe publishable key (from dashboard.stripe.com/apikeys)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Run

```bash
npx expo start
# Press i for iOS simulator
# Scan QR code for physical device (Expo Go)
```

---

## Project Structure

```
app/
  _layout.tsx            # Root layout — StripeProvider, tab nav, splash screen
  index.tsx              # Home screen
  equipment-scanner.tsx  # Camera + AI scan screen
  exercises.tsx          # Exercise library
  profile.tsx            # User profile setup
  paywall.tsx            # Stripe subscription modal

lib/
  api.ts                 # All API calls — update RAILWAY_BACKEND_URL after deploy
  constants.ts           # Colors, equipment types, API config
  scanLimit.ts           # Monthly scan tracking + pro status
  workoutHistory.ts      # Workout history + streak calculation
  profileStorage.ts      # AsyncStorage wrapper for user profile

components/
  ErrorBoundary.tsx
  OfflineNotice.tsx
  LoadingSkeleton.tsx
```

---

## Deployment

The backend deploys to [Railway](https://railway.app). After your first deploy:

1. Copy your Railway URL (e.g. `fitscan-backend-production.up.railway.app`)
2. Paste it into `lib/api.ts` line 10:
   ```ts
   const RAILWAY_BACKEND_URL = 'https://fitscan-backend-production.up.railway.app';
   ```
3. Commit and push

In production builds `__DEV__` is `false`, so the app automatically hits Railway instead of localhost.

---

## Subscription Plans

| Plan | Price | Scans |
|---|---|---|
| Free | $0 | 10 / month |
| Basic | $4.99 / month | 30 / month |
| Pro | $9.99 / month | Unlimited |
| Annual | $79.99 / year | Unlimited |

7-day free trial on monthly plans.

---

## License

MIT
