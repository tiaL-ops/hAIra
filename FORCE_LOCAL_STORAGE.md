# Force localStorage Mode (No Firebase Service Account)

If you don't have a Firebase service account on the backend, you can force the app to use localStorage instead.

## Option 1: Browser Console (Quick & Easy)

1. Open your browser's Developer Console (F12)
2. Paste this command and press Enter:
```javascript
localStorage.setItem('__force_local_storage__', 'true'); location.reload();
```

The app will now use localStorage instead of Firebase!

## Option 2: Environment Variable (Permanent)

1. Create a `.env` file in the `haira-client` folder:
```bash
cd haira-client
echo "VITE_USE_LOCAL_STORAGE=true" > .env
```

2. Restart your dev server:
```bash
npm run dev
```

## To Switch Back to Firebase:

**Option 1:** Browser Console:
```javascript
localStorage.removeItem('__force_local_storage__'); location.reload();
```

**Option 2:** Remove or change the `.env` file:
```bash
# Delete the .env file or change the value to false
echo "VITE_USE_LOCAL_STORAGE=false" > .env
```

## How to Check Which Mode You're In:

Look at the browser console when the app loads:
- `🔥 Firebase initialized successfully` - Using Firebase
- `💾 Forced localStorage mode - Firebase disabled` - Using localStorage

## What This Does:

When localStorage mode is forced:
- ✅ All authentication happens in localStorage (no Firebase Auth)
- ✅ All data is stored in localStorage (no Firestore)
- ✅ No Firebase service account needed on backend
- ✅ Everything works offline
- ✅ Perfect for development without Firebase setup

