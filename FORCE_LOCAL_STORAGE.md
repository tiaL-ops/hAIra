# Automatic Storage Mode (Firebase or localStorage)

The app **automatically detects** whether to use Firebase or localStorage based on the presence of Firebase credentials on the backend. No manual configuration needed!

## How It Works:

### Server Detection (Automatic)
The server automatically detects Firebase availability:
- **Firebase Mode**: If `serviceAccountKey.json` exists at `haira-server/config/serviceAccountKey.json` OR valid Firebase env variables are set
- **localStorage Mode**: If no Firebase credentials are found

### Client Detection (Automatic)
The client queries the server's `/api/config` endpoint on startup to determine which mode to use.

## Switching Modes:

### To Use Firebase:
Add your Firebase service account key:
```bash
# Place your serviceAccountKey.json at:
haira-server/config/serviceAccountKey.json
```

Then restart the server:
```bash
cd haira-server
npm start
```

### To Use localStorage:
Remove or rename the Firebase service account key:
```bash
# Rename the file (keep backup):
cd haira-server/config
mv serviceAccountKey.json serviceAccountKey.json.backup

# Or delete it:
rm serviceAccountKey.json
```

Then restart the server:
```bash
cd haira-server
npm start
```

## How to Check Which Mode You're Using:

### Server Console:
- `🔥 Firebase Admin SDK initialized successfully` - Using Firebase
- `💾 No Firebase credentials found - using localStorage fallback` - Using localStorage

### Client Console:
- `📡 Server storage mode: firebase` - Connected to Firebase
- `📡 Server storage mode: localStorage` - Using localStorage

### Browser Network Tab:
Check the response from `http://localhost:3002/api/config`:
```json
{
  "firebaseAvailable": true,
  "storageMode": "firebase"
}
```

## Benefits:

✅ **Automatic detection** - no manual env variables needed
✅ **Easy switching** - just add/remove the service key file
✅ **Full feature parity** - both modes support all features
✅ **Development friendly** - works offline with localStorage
✅ **Production ready** - automatically uses Firebase when configured

