# CampusePulse-API

Standalone Node.js Express REST API backend for CampusPulse Event Management System.

## Render Deployment Settings

When deploying this repository on [Render](https://render.com/):

| Setting | Value |
|---|---|
| **Root Directory** | *(Leave blank / empty)* |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Health Check Path** | `/api/health` |

> ⚠️ **Important**: Do **not** set Root Directory to `src` or `CampusePulse-API`. The repository root already contains `package.json`. Setting Root Directory to `src` causes `MODULE_NOT_FOUND` on `/opt/render/project/src/src/dist/index.js`.

## Required Environment Variables

Configure these in Render's **Environment** tab:

- `NODE_ENV`: `production`
- `USE_LOCAL_STORE`: `false`
- `FIREBASE_PROJECT_ID`: `campus-pulse-f8d7a`
- `FIREBASE_CLIENT_EMAIL`: `firebase-adminsdk-fbsvc@campus-pulse-f8d7a.iam.gserviceaccount.com`
- `FIREBASE_PRIVATE_KEY`: *(Your private service account key)*
- `FIREBASE_STORAGE_BUCKET`: `campus-pulse-f8d7a.firebasestorage.app`
- `CORS_ORIGIN`: `https://campus-pulse-f8d7a.web.app,https://campus-pulse-f8d7a.firebaseapp.com`
