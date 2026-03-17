import express from 'express';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy initialization for Firebase Admin
let db: Firestore | null = null;
let auth: Auth | null = null;
let firebaseApp: App | null = null;

function getFirebaseAdmin() {
  console.log('Getting Firebase Admin instances...');
  if (!db || !auth) {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      console.error('Firebase config file not found at:', configPath);
      throw new Error('Firebase configuration missing. Please set up Firebase first.');
    }
    
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('Firebase config loaded for project:', firebaseConfig.projectId);
    
    if (getApps().length === 0) {
      console.log('Initializing new Firebase Admin app...');
      firebaseApp = initializeApp({
        projectId: firebaseConfig.projectId,
      });
    } else {
      console.log('Using existing Firebase Admin app.');
      firebaseApp = getApps()[0];
    }
    
    db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(firebaseApp);
    console.log('Firebase Admin instances initialized.');
  }
  return { db, auth };
}

async function startServer() {
  console.log('Starting server...');
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check route
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.post(['/api/admin/revoke-user', '/api/admin/revoke-user/'], async (req, res, next) => {
    const { targetUid, schoolId, requesterUid, resetCode } = req.body;

    if (!targetUid || !schoolId || !requesterUid) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const { db, auth } = getFirebaseAdmin();
      // 1. Verify requester is admin of the school
      const schoolDoc = await db.collection('schools').doc(schoolId).get();
      if (!schoolDoc.exists) {
        return res.status(404).json({ error: 'School not found' });
      }

      const schoolData = schoolDoc.data();
      const userDoc = await db.collection('users').doc(requesterUid).get();
      const userData = userDoc.data();

      const isPrimaryAdmin = schoolData?.adminUid === requesterUid;
      const isSecondaryAdmin = userData?.role === 'admin' && schoolData?.authorizedUids?.includes(requesterUid);

      if (!isPrimaryAdmin && !isSecondaryAdmin) {
        return res.status(403).json({ error: 'Unauthorized: Only admins can revoke users' });
      }

      // 2. Remove from school authorizedUids
      await db.collection('schools').doc(schoolId).update({
        authorizedUids: FieldValue.arrayRemove(targetUid)
      });

      // 3. Delete user document from Firestore
      await db.collection('users').doc(targetUid).delete();

      // 4. Delete user from Firebase Authentication
      try {
        await auth.deleteUser(targetUid);
        console.log(`Successfully deleted user ${targetUid} from Auth`);
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found') {
          console.log(`User ${targetUid} already deleted from Auth`);
        } else {
          throw authError;
        }
      }

      // 5. Cleanup or Reset any teacher codes used by this user
      const codesSnap = await db.collection('teacherCodes')
        .where('schoolId', '==', schoolId)
        .where('usedBy', '==', targetUid)
        .get();
      
      const batch = db.batch();
      codesSnap.docs.forEach(doc => {
        if (resetCode) {
          batch.update(doc.ref, {
            isUsed: false,
            usedBy: null,
            usedAt: null
          });
        } else {
          batch.delete(doc.ref);
        }
      });
      await batch.commit();

      res.json({ success: true, message: resetCode ? 'User revoked and code reset' : 'User revoked and deleted' });
    } catch (error: any) {
      next(error);
    }
  });

  app.post(['/api/admin/delete-school', '/api/admin/delete-school/'], async (req, res, next) => {
    const { schoolId, requesterUid } = req.body;

    if (!schoolId || !requesterUid) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const { db, auth } = getFirebaseAdmin();
      // 1. Verify requester is the primary admin of the school
      const schoolDoc = await db.collection('schools').doc(schoolId).get();
      if (!schoolDoc.exists) {
        return res.status(404).json({ error: 'School not found' });
      }

      const schoolData = schoolDoc.data();
      if (schoolData?.adminUid !== requesterUid) {
        return res.status(403).json({ error: 'Unauthorized: Only the school creator can delete the school' });
      }

      // 2. Get all authorized users to delete their accounts too (as requested by user)
      const uidsToDelete = [requesterUid, ...(schoolData?.authorizedUids || [])];

      // 3. Delete all related documents in Firestore
      const collectionsToCleanup = ['exams', 'teacherCodes', 'students', 'results'];
      for (const collName of collectionsToCleanup) {
        const snap = await db.collection(collName).where('schoolId', '==', schoolId).get();
        const batch = db.batch();
        snap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }

      // 4. Delete user documents
      const userBatch = db.batch();
      for (const uid of uidsToDelete) {
        userBatch.delete(db.collection('users').doc(uid));
      }
      await userBatch.commit();

      // 5. Delete Auth accounts
      for (const uid of uidsToDelete) {
        try {
          await auth.deleteUser(uid);
        } catch (e) {
          console.log(`User ${uid} already deleted or not found in Auth`);
        }
      }

      // 6. Delete the school document itself
      await db.collection('schools').doc(schoolId).delete();

      res.json({ success: true, message: 'School and all associated accounts deleted successfully' });
    } catch (error: any) {
      next(error);
    }
  });

  // Catch-all for API routes that don't exist
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    try {
      console.log('Initializing Vite server...');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('Vite middleware integrated.');
    } catch (viteError) {
      console.error('Failed to initialize Vite server:', viteError);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'An unexpected error occurred',
      details: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is listening on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Log all registered routes
    console.log('Registered Routes:');
    app._router.stack.forEach((r: any) => {
      if (r.route && r.route.path) {
        console.log(`${Object.keys(r.route.methods).join(',').toUpperCase()} ${r.route.path}`);
      }
    });
  });
}

startServer().catch(err => {
  console.error('CRITICAL: Failed to start server:', err);
  process.exit(1);
});
