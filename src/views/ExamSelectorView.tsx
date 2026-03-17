import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Exam } from '../types';
import { Plus, BookOpen, Calendar, Trash2, ArrowRight, LogOut } from 'lucide-react';
import { logOut } from '../firebase';
import { DEFAULT_GRADE_SCALES, DEFAULT_SUBJECTS } from '../constants';

export default function ExamSelectorView() {
  const { school, setCurrentExam } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newExamName, setNewExamName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!school) return;

    const q = query(collection(db, 'exams'), where('schoolId', '==', school.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const examData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
      setExams(examData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [school]);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !newExamName.trim()) return;

    try {
      await addDoc(collection(db, 'exams'), {
        name: newExamName.trim(),
        schoolId: school.id,
        createdAt: new Date().toISOString(),
        subjects: DEFAULT_SUBJECTS,
        gradeScales: DEFAULT_GRADE_SCALES,
        subjRanges: [{ id: '1', min: 1, max: 6 }]
      });
      setNewExamName('');
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating exam:', error);
      alert('Failed to create exam.');
    }
  };

  const handleDeleteExam = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this exam and all its data?')) return;
    
    try {
      await deleteDoc(doc(db, 'exams', id));
    } catch (error) {
      console.error('Error deleting exam:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{school?.name}</h1>
            <p className="text-gray-500">Select an exam to manage or create a new one.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsCreating(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-100"
            >
              <Plus className="w-5 h-5" /> New Exam
            </button>
            <button
              onClick={() => logOut()}
              className="bg-white border border-gray-200 text-gray-600 px-4 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-50 transition-all"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isCreating && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-indigo-100 animate-in slide-in-from-top duration-300">
            <form onSubmit={handleCreateExam} className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                autoFocus
                required
                value={newExamName}
                onChange={(e) => setNewExamName(e.target.value)}
                placeholder="Exam Name (e.g. Term 1 2024 Final)"
                className="flex-1 px-6 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="bg-gray-100 text-gray-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <div
              key={exam.id}
              onClick={() => setCurrentExam(exam)}
              className="group bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handleDeleteExam(e, exam.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <BookOpen className="w-6 h-6" />
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{exam.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(exam.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="pt-4 flex items-center text-indigo-600 font-bold text-sm gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                  Open Analysis <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}

          {exams.length === 0 && !isCreating && (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full">
                <BookOpen className="w-10 h-10 text-gray-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-gray-900">No exams yet</h3>
                <p className="text-gray-500">Create your first exam to start analyzing results.</p>
              </div>
              <button
                onClick={() => setIsCreating(true)}
                className="text-indigo-600 font-bold hover:underline"
              >
                Create Exam Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
