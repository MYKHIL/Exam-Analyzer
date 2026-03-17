import React, { useState } from 'react';
import { collection, addDoc, doc, updateDoc, arrayUnion, getDoc, getDocs, query, where, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { School, Building2, ArrowRight, LogOut, UserPlus, Key } from 'lucide-react';

export default function SchoolSetupView() {
  const { user, logout } = useAuth();
  const [mode, setMode] = useState<'register' | 'code'>('register');
  const [schoolName, setSchoolName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !schoolName.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const schoolRef = await addDoc(collection(db, 'schools'), {
        name: schoolName.trim(),
        adminUid: user.uid,
        authorizedUids: [],
        createdAt: new Date().toISOString()
      });

      // Create/Update user document with schoolId
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        schoolId: schoolRef.id,
        role: 'admin',
        lastLogin: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error('Error creating school:', error);
      setError('Failed to create school. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !accessCode.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const codesRef = collection(db, 'teacherCodes');
      const q = query(codesRef, where('code', '==', accessCode.trim()), where('isUsed', '==', false));
      const querySnap = await getDocs(q);

      if (querySnap.empty) {
        setError('Invalid or already used access code.');
        setLoading(false);
        return;
      }

      const codeDoc = querySnap.docs[0];
      const codeData = codeDoc.data();

      // 1. Mark code as used
      await updateDoc(doc(db, 'teacherCodes', codeDoc.id), {
        isUsed: true,
        usedBy: user.uid,
        usedAt: new Date().toISOString()
      });

      // 2. Add user to school authorized list
      const schoolRef = doc(db, 'schools', codeData.schoolId);
      await updateDoc(schoolRef, {
        authorizedUids: arrayUnion(user.uid)
      });

      // 3. Create/Update user profile with assigned subjects and the code used
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        schoolId: codeData.schoolId,
        assignedSubjects: codeData.assignedSubjects,
        role: 'staff',
        joinedWithCode: codeData.code,
        lastLogin: new Date().toISOString()
      }, { merge: true });

    } catch (error) {
      console.error('Error joining with code:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-xl p-8 md:p-12 max-w-lg w-full space-y-8 relative">
        <button 
          onClick={logout}
          className="absolute top-8 right-8 p-2 text-gray-400 hover:text-red-600 transition-colors"
          title="Logout"
        >
          <LogOut className="w-6 h-6" />
        </button>

        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-2xl">
            {mode === 'register' ? (
              <Building2 className="w-8 h-8 text-indigo-600" />
            ) : (
              <Key className="w-8 h-8 text-indigo-600" />
            )}
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            {mode === 'register' ? 'Setup Your School' : 'Use Access Code'}
          </h2>
          <p className="text-gray-500">
            {mode === 'register' 
              ? "Welcome! Let's start by registering your school in the system."
              : "Enter the specialized access code provided by your administrator to join with assigned subjects."}
          </p>
        </div>

        <div className="flex p-1 bg-gray-100 rounded-2xl">
          <button
            onClick={() => { setMode('register'); setError(null); }}
            className={`flex-1 px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
              mode === 'register' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Register School
          </button>
          <button
            onClick={() => { setMode('code'); setError(null); }}
            className={`flex-1 px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
              mode === 'code' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Join with Code
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100">
            {error}
          </div>
        )}

        {mode === 'register' && (
          <form onSubmit={handleCreateSchool} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 ml-1">School Name</label>
              <input
                type="text"
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="e.g. St. Mary's International School"
                className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !schoolName.trim()}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-100"
            >
              {loading ? 'Creating...' : 'Register School'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        )}

        {mode === 'code' && (
          <form onSubmit={handleJoinWithCode} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 ml-1">Access Code</label>
              <input
                type="text"
                required
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Enter your special access code"
                className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !accessCode.trim()}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-100"
            >
              {loading ? 'Verifying...' : 'Use Access Code'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        )}
        
        <div className="text-center">
          <button 
            onClick={logout}
            className="text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            <LogOut className="w-4 h-4" />
            Sign out and use another account
          </button>
        </div>
      </div>
    </div>
  );
}
