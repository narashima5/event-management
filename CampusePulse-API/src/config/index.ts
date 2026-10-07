import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'college-event-mgmt',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    useEmulator: process.env.USE_FIREBASE_EMULATOR === 'true',
    emulatorHost: process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080',
  },
  // If USE_LOCAL_STORE is true or no service account key is supplied, run in local store mode
  useLocalStore: process.env.USE_LOCAL_STORE === 'true' || !process.env.FIREBASE_PRIVATE_KEY,
};
