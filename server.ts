import express from 'express';
import { createServer as createViteServer } from 'vite';
import * as admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));

admin.initializeApp({
  projectId: firebaseConfig.projectId,
});

const db = admin.firestore();
const auth = admin.auth();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post('/api/admin/revoke-user', async (req, res) => {
    const { targetUid, schoolId, requesterUid, resetCode } = req.body;

    if (!targetUid || !schoolId || !requesterUid) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
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
        authorizedUids: admin.firestore.FieldValue.arrayRemove(targetUid)
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
      console.error('Error revoking user:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/delete-school', async (req, res) => {
    const { schoolId, requesterUid } = req.body;

    if (!schoolId || !requesterUid) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
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
      console.error('Error deleting school:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
