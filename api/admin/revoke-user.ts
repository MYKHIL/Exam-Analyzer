import { getFirebaseAdmin } from '../_lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
    } catch (authError: any) {
      console.warn('Auth deletion error (likely missing credentials on Vercel):', authError.message);
      // We continue because the Firestore data access is already revoked
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

    return res.json({ success: true, message: resetCode ? 'User revoked and code reset' : 'User revoked and deleted' });
  } catch (error: any) {
    console.error('Revoke user error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
