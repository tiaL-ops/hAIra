# Firebase Setup Guide

## Get Your Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create one)
3. Click the gear icon ⚙️ → **Project Settings**
4. Go to the **Service Accounts** tab
5. Click **Generate New Private Key**
6. Download the JSON file

## Add the Key to Your Project

1. Rename the downloaded file to `serviceAccountKey.json`
2. Move it to: `haira-server/config/serviceAccountKey.json`

```bash
mv ~/Downloads/your-project-firebase-adminsdk-xxxxx.json haira-server/config/serviceAccountKey.json
```

## Create Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click **Create Database**
3. Choose **Start in test mode** (for development)
4. Select a location
5. Click **Enable**

## Verify Setup

Restart your server:
```bash
npm run dev
```

You should see: `✅ Firebase initialized successfully`

## Security Notes

- ⚠️ Never commit `serviceAccountKey.json` to git
- ⚠️ The file is already in `.gitignore`
- ⚠️ For production, use environment variables or secret managers
