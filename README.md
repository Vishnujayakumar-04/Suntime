# ☀️ SUNTIME - Smart Sun Exposure Companion

<div align="center">

![Suntime Logo](./assets/icon.png)

**Safe sun exposure tracking for Vitamin D optimization**

[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?style=flat&logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?style=flat&logo=react)](https://reactnative.dev)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?style=flat&logo=firebase)](https://firebase.google.com)

</div>

---

## 📱 About

**SUNTIME** is a mobile health companion app that helps users optimize their Vitamin D intake through safe, measured sun exposure. The app calculates personalized safe exposure times based on:

- Current UV Index (fetched via GPS or manual input)
- User's Fitzpatrick Skin Type (I-VI)
- Sunscreen usage preferences
- Weather conditions

## ✨ Features

### 🌤️ Smart UV Tracking

- Real-time UV Index from Open-Meteo API
- GPS-based location detection
- Manual UV input option for offline use

### ⏱️ Intelligent Timer

- Personalized safe exposure countdown
- Background timer support
- Push notifications when session completes
- Session logging to Firebase

### 📊 Progress Analytics

- Daily, weekly, and monthly tracking
- Exposure history with charts
- Streak tracking for consistency

### 👤 Personalized Profiles

- Fitzpatrick skin type selection
- AI-powered skin scanner (camera-based)
- Synced across devices via Firebase

### 🔒 Secure Authentication

- Email/password authentication
- Persistent sessions
- Optional biometric login

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React Native (Expo SDK 54) |
| **Navigation** | React Navigation 6 |
| **Animations** | React Native Reanimated 4 |
| **Backend** | Firebase Auth + Firestore |
| **Styling** | Custom Theme System |
| **Icons** | Lucide React Native |
| **State** | React Context API |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo Go app (for testing) or EAS CLI (for builds)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/suntime.git
cd suntime

# Install dependencies
npm install

# Start the development server
npx expo start -c
```

### Running on Device

1. Install **Expo Go** on your phone
2. Scan the QR code from the terminal
3. The app will load on your device

### Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build Android APK
eas build --platform android --profile preview

# Build iOS (requires Apple Developer account)
eas build --platform ios --profile preview
```

## 📁 Project Structure

```
suntime/
├── App.js                 # Entry point
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── SunTimer.js    # Animated timer display
│   │   ├── MenuDrawer.js  # Side navigation drawer
│   │   └── common/        # Shared components
│   ├── screens/           # App screens
│   │   ├── HomeScreen.js  # Main timer screen
│   │   ├── ProfileScreen.js
│   │   ├── ProgressScreen.js
│   │   └── setup/         # Onboarding wizard
│   ├── navigation/        # Navigation configuration
│   ├── context/           # React Context providers
│   ├── services/          # Firebase services
│   ├── utils/             # Helper functions
│   └── constants/         # Theme & config
├── assets/                # Images & icons
└── firestore.rules        # Security rules
```

## 🔥 Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** (Email/Password)
3. Enable **Cloud Firestore**
4. Copy your config to `src/config/firebase.js`
5. Deploy Firestore indexes:

   ```bash
   firebase deploy --only firestore:indexes
   ```

## 🎨 Screenshots

| Home Screen | Progress | Profile |
|-------------|----------|---------|
| Timer with UV info | Session history | User settings |

## 📄 License

This project was created for educational purposes as part of a hackathon submission.

## 👥 Team

Built with ❤️ by the Suntime Team

---

<div align="center">

**🌞 Stay Safe. Get Your Vitamin D. 🌞**

</div>
