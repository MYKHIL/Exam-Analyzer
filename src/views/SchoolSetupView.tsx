import React, { useState } from 'react';
import { collection, addDoc, doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { School, Building2, ArrowRight, LogOut, UserPlus } from 'lucide-react';

export default function SchoolSetupView() {
  const { user, logout } = useAuth();
  const [mode, setMode] = useState<'register' | 'join'>('register');
  const [schoolName, setSchoolName] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !schoolName.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await addDoc(collection(db, 'schools'), {
        name: schoolName.trim(),
        adminUid: user.uid,
        authorizedUids: [],
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error creating school:', error);
      setError('Failed to create school. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !schoolId.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const schoolRef = doc(db, 'schools', schoolId.trim());
      const schoolSnap = await getDoc(schoolRef);

      if (!schoolSnap.exists()) {
        setError('School not found. Please check the ID.');
        setLoading(false);
        return;
      }

      await updateDoc(schoolRef, {
        authorizedUids: arrayUnion(user.uid)
      });
      // The AuthContext listener will pick up the change
    } catch (error) {
      console.error('Error joining school:', error);
      setError('Failed to join school. You might not have permission or the ID is invalid.');
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
              <UserPlus className="w-8 h-8 text-indigo-600" />
            )}
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            {mode === 'register' ? 'Setup Your School' : 'Join a School'}
          </h2>
          <p className="text-gray-500">
            {mode === 'register' 
              ? "Welcome! Let's start by registering your school in the system."
              : "Enter the School ID provided by your administrator to join an existing school."}
          </p>
        </div>

        <div className="flex p-1 bg-gray-100 rounded-2xl">
          <button
            onClick={() => { setMode('register'); setError(null); }}
            className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${
              mode === 'register' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Register New
          </button>
          <button
            onClick={() => { setMode('join'); setError(null); }}
            className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${
              mode === 'join' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Join Existing
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100">
            {error}
          </div>
        )}

        {mode === 'register' ? (
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
        ) : (
          <form onSubmit={handleJoinSchool} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 ml-1">School ID</label>
              <input
                type="text"
                required
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                placeholder="Paste the School ID here"
                className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !schoolId.trim()}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-100"
            >
              {loading ? 'Joining...' : 'Join School'}
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
