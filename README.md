# FitScan 💪📱

AI-powered fitness companion app that uses computer vision to identify gym equipment and suggest personalized exercises.

## Features

- 📷 **Equipment Scanner**: Point your camera at gym equipment and get instant exercise recommendations
- 🤖 **AI-Powered Recognition**: Uses OpenAI GPT-4o-mini vision to identify equipment
- 📚 **Exercise Library**: Browse 24+ exercises across 6 muscle groups
- 👤 **Personalized Profiles**: Save your fitness goals, experience level, and equipment access
- 🌐 **Offline Support**: Get notified when you're offline with graceful degradation
- 🎨 **Modern UI**: Clean, dark-themed interface with smooth animations

## Tech Stack

### Frontend
- **Framework**: React Native 0.81 with Expo 54
- **Routing**: Expo Router (file-based)
- **Language**: TypeScript 5.9
- **Storage**: AsyncStorage for local persistence
- **Camera**: Expo Camera for equipment scanning
- **State**: React hooks (no Redux/MobX)

### Backend
- **Runtime**: Node.js with Express 5
- **AI**: OpenAI SDK (GPT-4o-mini vision)
- **Validation**: Zod for input validation
- **Security**: Helmet, CORS, rate limiting, optional authentication
- **Testing**: Jest + Supertest

## Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))

## Getting Started

### 1. Backend Setup

```bash
cd fitscan-backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env and add your OpenAI API key
# OPENAI_API_KEY=your_key_here

# Start backend server
npm start
```

The backend will run on `http://localhost:3001`

### 2. Frontend Setup

```bash
cd fitscan

# Install dependencies
npm install --legacy-peer-deps

# Copy environment template
cp .env.example .env

# Edit .env and set your local IP (find with: ipconfig getifaddr en0)
# EXPO_PUBLIC_BACKEND_URL=http://YOUR_LOCAL_IP:3001

# Start Expo
npx expo start
```

Then press:
- `i` for iOS simulator
- `a` for Android emulator
- Scan QR code with Expo Go app for physical device

## Project Structure

```
fitscan/
├── app/                      # Screens (file-based routing)
│   ├── index.tsx            # Home/Welcome
│   ├── equipment-scanner.tsx # Camera scanner
│   ├── exercises.tsx        # Exercise library
│   ├── profile.tsx          # User profile
│   └── _layout.tsx          # Tab navigation
├── components/              # Reusable components
│   ├── ErrorBoundary.tsx   # Error handling
│   ├── OfflineNotice.tsx   # Network status
│   └── LoadingSkeleton.tsx # Loading states
├── lib/                     # Core logic
│   ├── api.ts              # API service layer
│   ├── constants.ts        # App constants
│   ├── profileStorage.ts   # AsyncStorage wrapper
│   └── __tests__/          # Unit tests
└── hooks/                   # Custom React hooks

fitscan-backend/
├── index.js                 # Express server
├── config.js               # Configuration management
├── middleware/             # Express middleware
│   ├── auth.js            # Authentication
│   └── validation.js      # Input validation
└── __tests__/             # API tests
```

## Environment Variables

### Frontend (.env)
```env
EXPO_PUBLIC_BACKEND_URL=http://YOUR_LOCAL_IP:3001
```

### Backend (.env)
```env
# Required
OPENAI_API_KEY=your_openai_api_key

# Optional
PORT=3001
CORS_ORIGIN=http://localhost:8081
AUTH_ENABLED=false
API_SECRET_KEY=your_secret_key
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Available Scripts

### Frontend
```bash
npm start          # Start Expo dev server
npm run android    # Open on Android
npm run ios        # Open on iOS
npm run web        # Open on web
npm test           # Run tests
```

### Backend
```bash
npm start          # Start production server
npm run dev        # Start development server
npm test           # Run tests
npm run test:watch # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

## API Documentation

### Health Check
```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "openaiConfigured": true,
  "authEnabled": false
}
```

### Recognize Equipment
```
POST /equipment/recognize
Content-Type: application/json
```

**Request:**
```json
{
  "image_base64": "base64_encoded_image",
  "profile": {
    "name": "John Doe",
    "experienceLevel": "Intermediate",
    "primaryGoal": "Build Muscle",
    "daysPerWeek": 4,
    "equipmentAccess": ["dumbbell", "barbell"]
  }
}
```

**Response:**
```json
{
  "equipment_type": "Dumbbell",
  "confidence": "high",
  "exercises": [
    {
      "name": "Dumbbell Bicep Curls",
      "sets": "3-4",
      "reps": "10-12",
      "intensity": "Beginner",
      "muscleGroups": ["Biceps", "Forearms"],
      "description": "Curl the dumbbell toward your shoulders..."
    }
  ],
  "ai_used": true,
  "from": "openai"
}
```

## Testing

```bash
# Frontend tests
cd fitscan
npm test

# Backend tests
cd fitscan-backend
npm test

# With coverage
npm run test:coverage
```

## Security Notes

⚠️ **Important Security Measures Implemented:**

1. ✅ API key stored in `.env` (never commit)
2. ✅ `.gitignore` properly excludes `.env` files
3. ✅ Rate limiting (100 requests per 15 minutes)
4. ✅ Input validation with Zod
5. ✅ Helmet security headers
6. ✅ CORS configuration
7. ✅ Optional API authentication

## Deployment

### Backend Deployment (Railway/Render)

1. Create account on [Railway](https://railway.app) or [Render](https://render.com)
2. Connect your GitHub repository
3. Set environment variables in dashboard
4. Deploy!

### Frontend Deployment (App Stores)

```bash
# Build for production
eas build --platform ios
eas build --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

See [Expo Application Services](https://expo.dev/eas) for details.

## Troubleshooting

### Backend won't start
- Check that port 3001 is not in use
- Verify `OPENAI_API_KEY` is set in `.env`
- Run `npm install` to ensure dependencies are installed

### Frontend can't connect to backend
- Verify backend is running on port 3001
- Check `EXPO_PUBLIC_BACKEND_URL` matches your local IP
- Ensure phone/emulator is on same network as computer
- Try `ipconfig getifaddr en0` (Mac) or `ipconfig` (Windows) to find your IP

### Camera not working
- Grant camera permissions when prompted
- On iOS simulator, camera won't work (use physical device)
- On Android emulator, enable virtual camera in settings

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC

## Support

For issues and questions:
- Create an issue on GitHub
- Email: [your-email]

---

Built with ❤️ using Expo and OpenAI
