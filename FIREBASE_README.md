# 🔑 How to Get Firebase API Keys & Credentials Guide

This guide walks you through **step-by-step** how to get all the required Firebase keys and credentials from the [Firebase Console](https://console.firebase.google.com/) for the **CampusPulse College Event Management System**.

---

## 📋 Overview of What You Need

| Target | Where to Put It | Keys / Credentials Needed | Purpose |
|---|---|---|---|
| **Backend** (Node.js Server) | Root `.env` or `server/.env` | • `FIREBASE_PROJECT_ID`<br>• `FIREBASE_CLIENT_EMAIL`<br>• `FIREBASE_PRIVATE_KEY`<br>• `FIREBASE_STORAGE_BUCKET` | Allows backend to verify auth tokens, perform atomic capacity transactions, score locking, and manage Firestore data. |
| **Frontend** (React Web App) | `client/.env` | • `VITE_FIREBASE_API_KEY`<br>• `VITE_FIREBASE_AUTH_DOMAIN`<br>• `VITE_FIREBASE_PROJECT_ID`<br>• `VITE_FIREBASE_STORAGE_BUCKET`<br>• `VITE_FIREBASE_MESSAGING_SENDER_ID`<br>• `VITE_FIREBASE_APP_ID` | Connects the user's browser to Firebase Authentication (login, password reset) and client storage. |

> [!TIP]
> **Don't want to set up Firebase right now?**
> Keep `USE_LOCAL_STORE=true` in your `.env`. The entire application will run offline with built-in in-memory Firestore and mock dev tokens (`dev-admin-token`, `dev-coord-a-token`, etc.). No keys or accounts needed!

---

## 🚀 Step 1: Create a Firebase Project

1. Open your browser and go to the [Firebase Console](https://console.firebase.google.com/).
2. Sign in with your Google account.
3. Click **Add project** (or **Create a project**).
4. Enter a project name (e.g., `campuspulse-event-mgmt`).
5. (Optional) Choose whether to enable Google Analytics, then click **Create project**.
6. Wait for the project setup to complete, then click **Continue**.

---

## 🛠️ Step 2: Enable the Required Firebase Services

Before copying keys, make sure these 3 services are activated in your new Firebase project:

### 1. Enable Firebase Authentication
1. In the left sidebar, expand **Build** and click **Authentication**.
2. Click the **Get started** button.
3. Under the **Sign-in method** tab, click **Email/Password**.
4. Toggle the **Enable** switch to ON, then click **Save**.

### 2. Enable Cloud Firestore
1. In the left sidebar under **Build**, click **Firestore Database**.
2. Click **Create database**.
3. Set the database type to **Firestore in Native mode** (do *not* use Datastore mode).
4. Select a Cloud Firestore location closest to your college (e.g., `asia-south1` for Mumbai/India or `us-central1`).
5. Choose **Start in production mode** (or test mode for dev) and click **Enable**.

### 3. Enable Firebase Storage (Optional for file uploads)
1. In the left sidebar under **Build**, click **Storage**.
2. Click **Get started**, accept default security rules in production mode, select your location, and click **Done**.

---

## 🔐 Step 3: Get Backend Admin SDK Keys (For Server)

The backend needs a **Service Account Private Key** to authenticate privileged administrative operations.

### Follow these steps:
1. Click the **⚙️ Gear Icon** (top-left near "Project Overview") and select **Project settings**.
2. Click on the **Service accounts** tab at the top.
3. Make sure **Firebase Admin SDK** is selected on the left side of that page.
4. Click the blue button labeled **Generate new private key**.
5. In the confirmation dialog, click **Generate key**.
6. A `.json` file will automatically download to your computer (e.g., `campuspulse-xxx-firebase-adminsdk-xxxxx.json`).

```
Firebase Console
 └── ⚙️ Project Settings
      └── 📑 Service accounts
           └── 🔘 Firebase Admin SDK
                └── [ Generate new private key ]  <-- CLICK HERE
```

### How to extract values from the downloaded JSON file:
Open the downloaded `.json` file in VS Code or any text editor. It looks like this:

```json
{
  "type": "service_account",
  "project_id": "campuspulse-12345",
  "private_key_id": "9a8b7c6d5e4f...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-abcde@campuspulse-12345.iam.gserviceaccount.com",
  "client_id": "109876543210987654321",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

Copy the corresponding values into your root `.env` or `server/.env`:

- `FIREBASE_PROJECT_ID` = value of `"project_id"`
- `FIREBASE_CLIENT_EMAIL` = value of `"client_email"`
- `FIREBASE_PRIVATE_KEY` = value of `"private_key"` (keep the quotation marks `"..."` and the `\n` characters)
- `FIREBASE_STORAGE_BUCKET` = `<project_id>.appspot.com` (or find this under **Storage** in the sidebar)

---

## 🌐 Step 4: Get Frontend Web App Keys (For Client React App)

The React web application needs the public Firebase Web App credentials.

### Follow these steps:
1. Click the **⚙️ Gear Icon** > **Project settings**.
2. Click on the **General** tab.
3. Scroll down to the bottom section called **Your apps**.
4. If you have not created a web app yet:
   - Click the **`</>` Web** icon.
   - Enter an App nickname (e.g., `CampusPulse Web`).
   - (Leave "Firebase Hosting" unchecked for now).
   - Click **Register app**.
5. You will see a code snippet called `firebaseConfig`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD-EXAMPLE_KEY_1234567890",
  authDomain: "campuspulse-12345.firebaseapp.com",
  projectId: "campuspulse-12345",
  storageBucket: "campuspulse-12345.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

```
Firebase Console
 └── ⚙️ Project Settings
      └── 📑 General
           └── 📱 Your apps
                └── [ </> Web Icon ]  <-- CLICK HERE
                     └── Copy firebaseConfig properties
```

Copy each field to the corresponding variable in `client/.env`:

| In `firebaseConfig` snippet | In `client/.env` |
|---|---|
| `apiKey` | `VITE_FIREBASE_API_KEY` |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `VITE_FIREBASE_PROJECT_ID` |
| `storageBucket` | `VITE_FIREBASE_STORAGE_BUCKET` |
| `messagingSenderId` | `VITE_FIREBASE_MESSAGING_SENDER_ID` |
| `appId` | `VITE_FIREBASE_APP_ID` |

---

## 📝 Step 5: Ready-to-Use `.env` File Templates

### 1. Root / Backend `.env` (`server/.env` or root `.env`)

Create or update your `.env` file with:

```env
# Server Port & Environment
PORT=5000
NODE_ENV=production

# Switch to 'false' to use your live Firebase project
USE_LOCAL_STORE=false

# Firebase Admin SDK Credentials (from the downloaded Service Account JSON)
FIREBASE_PROJECT_ID=campuspulse-12345
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abcde@campuspulse-12345.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=campuspulse-12345.appspot.com

# Client Origin (CORS Whitelist)
CLIENT_ORIGIN=http://localhost:5173
```

### 2. Frontend `.env` (`client/.env`)

Create a `client/.env` file with:

```env
# Backend REST API endpoint (Production on Render)
VITE_API_BASE_URL=https://campusepulse-api.onrender.com/api

# Firebase Web App Credentials (from firebaseConfig in Project Settings)
VITE_FIREBASE_API_KEY=AIzaSyD-EXAMPLE_KEY_1234567890
VITE_FIREBASE_AUTH_DOMAIN=campuspulse-12345.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=campuspulse-12345
VITE_FIREBASE_STORAGE_BUCKET=campuspulse-12345.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
```

---

## 🛡️ Step 6: Deploy Firestore Rules & Indexes

Once your Firebase project is configured, deploy the security rules and query indexes so your database is secured:

```bash
# 1. Install Firebase CLI globally (if not already installed)
npm install -g firebase-tools

# 2. Login to your Google account
firebase login

# 3. Connect to your Firebase project
firebase use --add campuspulse-12345

# 4. Deploy rules and indexes from this repository
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage
```

---

## ❓ Frequently Asked Questions & Troubleshooting

### Q: Why do I get `Error: Invalid PEM formatted message` or `Private key must be a string`?
- **Cause**: The `FIREBASE_PRIVATE_KEY` has multi-line line breaks that got mangled.
- **Solution**: Wrap the entire private key in double quotes (`"..."`) and ensure line breaks are written as `\n` literals, exactly as exported in the downloaded JSON file.

### Q: Are the `VITE_FIREBASE_*` keys in `client/.env` secret?
- **No**. In Firebase's architecture, web client keys are public identifiers used by browsers to access Firebase services. Security is maintained by:
  1. `firestore.rules` (which restrict who can read/write data).
  2. The Node.js backend middleware, which authoritatively checks roles and assignments before fulfilling requests.
  3. The backend `FIREBASE_PRIVATE_KEY` (which is kept strictly secret).

### Q: How do I switch back to offline development mode?
- Just set `USE_LOCAL_STORE=true` in your root `.env`. No Firebase connection or internet access will be required!
