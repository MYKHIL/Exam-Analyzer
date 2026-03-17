import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

let db: Firestore | null = null;
let auth: Auth | null = null;
let firebaseApp: App | null = null;

export function getFirebaseAdmin() {
  if (!db || !auth) {
    let firebaseConfig: any = {};
    
    // Try to load from environment variables first (best for Vercel)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        firebaseConfig = {
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id,
          firestoreDatabaseId: process.env.FIREBASE_FIRESTORE_DATABASE_ID || '(default)'
        };
      } catch (e) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT env var');
      }
    }

    if (!firebaseConfig.projectId) {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        firebaseConfig.projectId = fileConfig.projectId;
        firebaseConfig.firestoreDatabaseId = fileConfig.firestoreDatabaseId || '(default)';
      } else {
        firebaseConfig.projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        firebaseConfig.firestoreDatabaseId = process.env.FIREBASE_FIRESTORE_DATABASE_ID || '(default)';
      }
    }

    if (!firebaseConfig.projectId) {
      throw new Error('Firebase Project ID is missing. Please set FIREBASE_PROJECT_ID or provide firebase-applet-config.json');
    }

    if (getApps().length === 0) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApps()[0];
    }

    db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(firebaseApp);
  }
  return { db, auth };
}
