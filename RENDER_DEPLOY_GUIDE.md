# 🚀 Render Deployment Guide for CampusePulse-API

This guide provides step-by-step instructions for deploying the backend REST API (**CampusePulse-API**) to [Render](https://render.com/).

---

## 📋 Overview

* **Service Type**: Web Service
* **Runtime**: Node.js
* **Root / Base Directory**: *(Leave Blank / Empty)*
* **Build Command**: `npm install && npm run build`
* **Start Command**: `npm start`
* **Health Check Path**: `/api/health`
* **Port**: Handled automatically by Render (defaults to port assigned by Render)

---

## 🛠️ Method 1: Deploying via Render Dashboard (Recommended)

### Step 1: Push your Code to GitHub

Render deploys directly from GitHub or GitLab.

1. Create a new repository on [GitHub](https://github.com/new) (e.g., `campus-pulse`).
2. Run the following commands in your project terminal:

```bash
# Stage and commit your code
git add .
git commit -m "feat: complete CampusPulse system ready for deployment"

# Rename branch to main
git branch -M main

# Link to your GitHub repository and push
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPOSITORY_NAME>.git
git push -u origin main
```

---

### Step 2: Create a Web Service on Render

1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click the **New +** button in the top-right corner and select **Web Service**.
3. Select **Build and deploy from a Git repository** and click **Next**.
4. Connect your GitHub account (if not already connected) and select your repository.

---

### Step 3: Configure the Web Service Settings

Fill in the fields on the creation page:

| Setting | Value to Enter | Notes |
|---|---|---|
| **Name** | `campusepulse-api` | Your unique service name |
| **Region** | Choose closest to you (e.g., *Singapore* or *Oregon*) | Match your Firestore region if possible |
| **Branch** | `main` | Default production branch |
| **Root Directory** | *(LEAVE BLANK)* | **CRITICAL**: Leave this completely empty! The `CampusePulse-API` repo already has `package.json` at its root. Do **NOT** put `src` or `CampusePulse-API`. |
| **Runtime** | `Node` | Native Node.js environment |
| **Build Command** | `npm install && npm run build` | Compiles TypeScript into `dist/` |
| **Start Command** | `npm start` | Runs `node dist/index.js` (Do NOT enter `node src/dist/...`) |
| **Instance Type** | `Free` | Free tier includes 750 free hours/month |

---

### Step 4: Add Environment Variables in Render

Scroll down to the **Environment Variables** section and click **Add Environment Variable** for each:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `USE_LOCAL_STORE` | `false` |
| `FIREBASE_PROJECT_ID` | `campus-pulse-f8d7a` |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-fbsvc@campus-pulse-f8d7a.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | *(Paste your full private key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)* |
| `FIREBASE_STORAGE_BUCKET` | `campus-pulse-f8d7a.firebasestorage.app` |
| `CORS_ORIGIN` | `https://campus-pulse-f8d7a.web.app,https://campus-pulse-f8d7a.firebaseapp.com` |

> [!TIP]
> In the Render dashboard, you can paste the `FIREBASE_PRIVATE_KEY` with actual newlines or escaped `\n` characters — Render handles multi-line strings cleanly in the environment variable textarea.

---

### Step 5: Configure Health Check

1. Click **Advanced Settings**.
2. In the **Health Check Path** field, enter:
   ```
   /api/health
   ```
3. Click **Create Web Service**.

Render will now pull your repository, run the build, and start the service!

---

### ⚠️ Troubleshooting: `Cannot find module .../src/src/dist/index.js`

If you encounter:
```
Error: Cannot find module '/opt/render/project/src/src/dist/index.js'
```
* **Cause**: In Render **Settings**, the **Root Directory** was set to `src`, or **Start Command** was set to `node src/dist/index.js`. Because Render clones your repo into `/opt/render/project/src/`, entering `src` creates the duplicate path `/opt/render/project/src/src/`.
* **Fix**:
  1. Go to your Render Dashboard ➔ select `campusepulse-api` ➔ **Settings**.
  2. Clear the **Root Directory** field completely (**Leave it blank**).
  3. Ensure **Build Command** is: `npm install && npm run build`
  4. Ensure **Start Command** is: `npm start`
  5. Click **Save Changes**, then click **Manual Deploy** ➔ **Clear build cache & deploy**.

---

## ⚡ Method 2: Deploying via Render Blueprint (`render.yaml`)

A pre-configured [render.yaml](file:///home/narashima/Desktop/event%20management/render.yaml) file is included in your repository root.

1. Push your repository to GitHub.
2. In Render, click **New +** > **Blueprint**.
3. Connect your repository.
4. Render will read `render.yaml` and configure all settings automatically.
5. Fill in the prompted secret variables (`FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, etc.) and click **Apply**.

---

## 🔗 Step 6: Connect Your Live Frontend to the Render Backend

Once Render finishes deploying, it gives you a public URL (e.g., `https://campusepulse-api.onrender.com`):

1. Open [campusPulse-ui/.env](file:///home/narashima/Desktop/event%20management/campusPulse-ui/.env).
2. Update line 6 with your Render URL:
   ```env
   VITE_API_BASE_URL=https://campusepulse-api.onrender.com/api
   ```
3. Rebuild and redeploy your Firebase frontend:
   ```bash
   npm run build --workspace=campusPulse-ui
   npx -y firebase-tools deploy --only hosting --project campus-pulse-f8d7a
   ```

Your entire stack will now be live in production:
* **Frontend**: Hosted on Google's CDN via Firebase Hosting (`https://campus-pulse-f8d7a.web.app`)
* **Backend**: Hosted on Render Cloud (`https://campusepulse-api.onrender.com`)
* **Database & Auth**: Live Cloud Firestore and Firebase Auth (`campus-pulse-f8d7a`)
