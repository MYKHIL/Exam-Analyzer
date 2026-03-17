import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { School, Building2, ArrowRight } from 'lucide-react';

export default function SchoolSetupView() {
  const { user } = useAuth();
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !schoolName.trim()) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'schools'), {
        name: schoolName.trim(),
        adminUid: user.uid,
        authorizedUids: [],
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error creating school:', error);
      alert('Failed to create school. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-xl p-8 md:p-12 max-w-lg w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-2xl">
            <Building2 className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Setup Your School</h2>
          <p className="text-gray-500">Welcome! Let's start by registering your school in the system.</p>
        </div>

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
      </div>
    </div>
  );
}
