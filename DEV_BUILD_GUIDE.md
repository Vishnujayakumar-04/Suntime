# SUNTIME - Development Build Setup Guide

## Why Development Build?

Starting with **Expo SDK 53**, push notifications (`expo-notifications`) are **not supported in Expo Go**. You need a Development Build to:
- Enable full push notifications (local & remote)
- Use background tasks
- Access native modules that require custom native code

---

## Step 1: Install expo-dev-client

```bash
npx expo install expo-dev-client
```

---

## Step 2: Update app.json

Add `expo-dev-client` to plugins (already configured plugins are preserved):

```json
{
  "expo": {
    "plugins": [
      "expo-dev-client",
      // ... existing plugins
    ]
  }
}
```

---

## Step 3: Create Development Build

### Option A: Build Locally (Requires Android Studio / Xcode)

```bash
# For Android
npx expo run:android

# For iOS (Mac only)
npx expo run:ios
```

### Option B: Build with EAS (Recommended - No local setup needed)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS (first time only)
eas build:configure

# Create development build for Android
eas build --profile development --platform android

# Or for iOS
eas build --profile development --platform ios
```

---

## Step 4: Install the Build

1. After build completes, download the APK/IPA from the link provided
2. Install on your device
3. Run the app using:
   ```bash
   npx expo start --dev-client
   ```

---

## Step 5: Deploy Firestore Indexes

To fix "The query requires an index" error:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy indexes (from project root)
firebase deploy --only firestore:indexes
```

Or manually create the index in Firebase Console:
1. Go to: https://console.firebase.google.com/
2. Select your project → Firestore Database → Indexes
3. Click "Add Index" (Composite)
4. Collection: `sessions`
5. Fields:
   - `userId` (Ascending)
   - `date` (Descending)
6. Query scope: Collection
7. Click "Create"

---

## Troubleshooting

### Notifications still not working?
1. Ensure the app was built with `expo-dev-client`
2. Check that `POST_NOTIFICATIONS` permission is granted (Android 13+)
3. Verify `app.json` has `expo-notifications` in plugins

### Firestore index error persists?
- Wait 5-10 minutes for index to build
- Check Firebase Console for index status
- Use the fallback query (already implemented in code)

---

## Quick Commands Reference

```bash
# Start with dev client
npx expo start --dev-client

# Clear cache and start
npx expo start --dev-client --clear

# Build development APK locally
npx expo run:android

# Build with EAS
eas build --profile development --platform android
```
