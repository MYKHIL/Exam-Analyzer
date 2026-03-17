import { getFirebaseAdmin } from '../_lib/firebase-admin';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    // 2. Get all authorized users to delete their accounts too
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
        // Ignore if user not found
      }
    }

    // 6. Delete the school document itself
    await db.collection('schools').doc(schoolId).delete();

    return res.json({ success: true, message: 'School and all associated accounts deleted successfully' });
  } catch (error: any) {
    console.error('Delete school error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
