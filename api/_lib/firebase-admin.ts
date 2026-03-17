import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

let db: Firestore | null = null;
let auth: Auth | null = null;
let firebaseApp: App | null = null;

export function getFirebaseAdmin() {
  if (!db || !auth) {
    // In Vercel, we might need to look in different places for the config
    // or use environment variables.
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    let firebaseConfig;

    if (fs.existsSync(configPath)) {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } else {
      // Fallback to env vars if file is missing (common in CI/CD)
      firebaseConfig = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        firestoreDatabaseId: process.env.FIREBASE_FIRESTORE_DATABASE_ID || '(default)'
      };
    }

    if (!firebaseConfig.projectId) {
      throw new Error('Firebase configuration missing. Please set up Firebase first.');
    }

    if (getApps().length === 0) {
      firebaseApp = initializeApp({
        projectId: firebaseConfig.projectId,
      });
    } else {
      firebaseApp = getApps()[0];
    }

    db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(firebaseApp);
  }
  return { db, auth };
}
