im # 📋 Attendance Marker — Mobile App

A **React Native / Expo** mobile app to track daily attendance, view statistics, browse history, and export records. Authentication is handled via a Telegram bot that issues a unique dashboard URL per user.

---

## ✨ Features

| Feature | Details |
|---|---|
| **Mark Attendance** | One-tap Present / Absent / Holiday with optional absence reason |
| **Daily Reminder** | Scheduled push notification at **9:30 AM** with quick-action buttons (Present / Absent) |
| **Backend Keep-alive** | Silent ping at **9:29 AM** warms up the Render backend before the reminder fires |
| **Statistics** | Pie/bar charts of attendance percentages, streaks, and summaries |
| **Calendar View** | Month calendar colour-coded by attendance status |
| **History** | Scrollable list of all past records with filters |
| **CSV Export** | Export full attendance history as a CSV file via the system share sheet |
| **Biometric Lock** | Optional Face ID / Fingerprint lock on the profile screen |
| **Offline Cache** | Stale-while-revalidate cache so the app works without a network connection |
| **AI Summary** | Fetches an AI-generated attendance summary from the backend |

---

## 🗂️ Project Structure

```
mobile/
├── app/
│   ├── _layout.jsx          # Root layout — auth guard, notification setup
│   ├── index.jsx            # Entry redirect
│   ├── (auth)/
│   │   └── login.jsx        # UID URL login screen
│   └── (tabs)/
│       ├── _layout.jsx      # Floating bottom tab navigator
│       ├── home.jsx         # Today's attendance + mark actions
│       ├── stats.jsx        # Charts & statistics
│       ├── calendar.jsx     # Monthly calendar view
│       ├── history.jsx      # Full attendance history
│       └── profile.jsx      # Profile, export, biometric settings
├── lib/
│   ├── api.js               # Axios client + all API calls (with caching)
│   ├── biometric.js         # Face ID / fingerprint helpers
│   ├── cache.js             # AsyncStorage-based TTL cache
│   ├── export.js            # CSV generation & sharing
│   ├── notifications.js     # Push notifications, reminders, background task
│   └── storage.js           # Secure store helpers (UID, session, backend URL)
├── constants/
│   └── colors.js            # Centralised design tokens
├── assets/                  # Images, fonts, icons
├── .env                     # EXPO_PUBLIC_baseURL
├── app.json                 # Expo config (package name, icons, plugins)
└── eas.json                 # EAS Build profiles
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- [Bun](https://bun.sh/) (used as the package manager) **or** npm/yarn
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Android Studio / Xcode for native builds (or use a physical device with Expo Go)

### 1 — Clone & Install

```bash
git clone <repo-url>
cd "Attendance Marker/mobile"
bun install          # or: npm install
```

### 2 — Configure Environment

Create / update `.env` in the `mobile/` root:

```env
EXPO_PUBLIC_baseURL=https://your-backend-url.com/
```

> The default backend is `https://attendance-backend-hhkn.onrender.com/`

### 3 — Run

```bash
# Start Expo dev server
bun run start        # or: npx expo start

# Run directly on device/emulator
bun run android
bun run ios
```

---

## 🔐 Authentication

1. Register via the **Telegram bot** → [@Attendance009bot](https://t.me/Attendance009bot)
2. The bot returns a personal dashboard URL like:
   ```
   https://attendance-09.vercel.app/?uid=<YOUR_UID>
   ```
3. Paste this URL into the **Login** screen — the app extracts your UID and validates it against the backend.

---

## 🔔 Notifications

| Time | Type | Description |
|---|---|---|
| 9:29 AM | Silent ping | Wakes up the backend (Render free tier) |
| 9:30 AM | Reminder | "Mark Your Attendance" — quick-action Present / Absent buttons |

Notifications are scheduled automatically on first launch. You can re-schedule them from the **Profile** screen.

---

## 📡 API Overview

All calls live in `lib/api.js` and target the backend set in `.env`.

| Function | Method | Endpoint |
|---|---|---|
| `fetchUser(uid)` | GET | `/user?userId=` |
| `markAttendance(uid, status, reason)` | POST | `/attendance` |
| `markHoliday(uid)` | POST | `/holiday` |
| `fetchAllAttendance(uid)` | GET | `/attendance/all` |
| `fetchAISummary(uid)` | GET | `/attendance/summarize` |
| `refreshAttendance(uid)` | GET | `/attendance/all` (force) |

All GET calls are wrapped with a **5-minute TTL cache** (AsyncStorage). On network failure the app falls back to stale cached data.

---

## 🏗️ Build & Deploy (EAS)

```bash
# Install EAS CLI
npm install -g eas-cli

# Build APK (Android)
eas build --platform android --profile preview

# Build for production
eas build --platform android --profile production
eas build --platform ios     --profile production
```

EAS project ID: `57ed8b82-e4e7-44cd-9a4b-5b41ca047478`

---

## 🛠️ Tech Stack

| Library | Purpose |
|---|---|
| **Expo SDK 54** | App framework |
| **Expo Router v6** | File-based navigation |
| **React Native 0.81** | Core UI |
| **NativeWind v4** | Tailwind CSS utility classes |
| **Axios** | HTTP client |
| **expo-notifications** | Push notifications & quick actions |
| **expo-local-authentication** | Biometric (Face ID / Fingerprint) |
| **expo-secure-store** | Encrypted session storage |
| **expo-background-task** | Background keep-alive task |
| **expo-file-system + expo-sharing** | CSV export |
| **react-native-calendars** | Calendar view |
| **expo-linear-gradient** | UI gradients |
| **expo-haptics** | Haptic feedback on actions |

---

## 📄 License

Private project — all rights reserved.
