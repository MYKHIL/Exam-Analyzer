/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { GradeScale, Subject, Student, Exam } from './types';
import Sidebar from './components/Sidebar';
import ConfigurationView from './views/ConfigurationView';
import StudentsView from './views/StudentsView';
import AnalysisView from './views/AnalysisView';
import DashboardView from './views/DashboardView';
import ReportsView from './views/ReportsView';
import GuideModal from './components/GuideModal';
import AuthView from './views/AuthView';
import SchoolSetupView from './views/SchoolSetupView';
import ExamSelectorView from './views/ExamSelectorView';
import { downloadTemplate, processExcelFile } from './excelUtils';
import { AuthProvider, useAuth } from './context/AuthContext';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

function AppContent() {
  const { user, userData, loading, school, currentExam, setCurrentExam } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [gradeScales, setGradeScales] = useState<GradeScale[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [aggRangeMin, setAggRangeMin] = useState<number>(6);
  const [aggRangeMax, setAggRangeMax] = useState<number>(36);
  const [subjRanges, setSubjRanges] = useState<{id: string, min: number, max: number}[]>([{id: '1', min: 1, max: 6}]);

  // Sync Exam Config
  useEffect(() => {
    if (!currentExam) return;
    setGradeScales(currentExam.gradeScales);
    setSubjects(currentExam.subjects);
    setSubjRanges(currentExam.subjRanges);
  }, [currentExam]);

  // Sync Students from StudentBucket (Minimal Reads)
  useEffect(() => {
    if (!currentExam) return;

    const bucketId = `bucket_${currentExam.id}`;
    const bucketRef = doc(db, 'studentBuckets', bucketId);
    
    const unsubscribe = onSnapshot(bucketRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setStudents(data.students || []);
      } else {
        setStudents([]);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `studentBuckets/${bucketId}`);
    });

    return () => unsubscribe();
  }, [currentExam]);

  // Update Exam Config in Firestore
  const updateExamConfig = async (newSubjects: Subject[], newGradeScales: GradeScale[]) => {
    if (!currentExam) return;
    try {
      await updateDoc(doc(db, 'exams', currentExam.id), {
        subjects: newSubjects,
        gradeScales: newGradeScales
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `exams/${currentExam.id}`);
    }
  };

  // Update Students in StudentBucket (Minimal Writes)
  const handleSetStudents = async (newStudents: Student[]) => {
    if (!currentExam || !school) return;

    const bucketId = `bucket_${currentExam.id}`;
    const bucketRef = doc(db, 'studentBuckets', bucketId);

    try {
      await setDoc(bucketRef, {
        examId: currentExam.id,
        schoolId: school.id,
        students: newStudents,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `studentBuckets/${bucketId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-600">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!user) return <AuthView />;
  if (!school) return <SchoolSetupView />;
  if (!currentExam) return <ExamSelectorView />;

  const handleImportExcel = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processExcelFile(file, subjects, students, school.id, currentExam.id, (updatedStudents) => {
      handleSetStudents(updatedStudents);
      setIsGuideOpen(false);
      setActiveTab('students');
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onShowGuide={() => setIsGuideOpen(true)}
        onSwitchExam={() => setCurrentExam(null)}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
        {activeTab === 'dashboard' && (
          <DashboardView students={students} subjects={subjects} gradeScales={gradeScales} />
        )}
        {activeTab === 'config' && (
          <ConfigurationView 
            gradeScales={gradeScales} 
            setGradeScales={(gs) => { setGradeScales(gs); updateExamConfig(subjects, gs); }}
            subjects={subjects} 
            setSubjects={(subjs) => { setSubjects(subjs); updateExamConfig(subjs, gradeScales); }}
          />
        )}
        {activeTab === 'students' && (
          <StudentsView 
            students={students} setStudents={handleSetStudents}
            subjects={subjects} gradeScales={gradeScales}
          />
        )}
        {activeTab === 'analysis' && (
          <AnalysisView 
            students={students} subjects={subjects} gradeScales={gradeScales}
            aggRangeMin={aggRangeMin} setAggRangeMin={setAggRangeMin}
            aggRangeMax={aggRangeMax} setAggRangeMax={setAggRangeMax}
            subjRanges={subjRanges} setSubjRanges={setSubjRanges}
          />
        )}
        {activeTab === 'reports' && (
          <ReportsView 
            students={students} subjects={subjects} gradeScales={gradeScales}
            subjRanges={subjRanges}
          />
        )}
      </main>

      <input 
        type="file" 
        accept=".xlsx, .xls" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleImportExcel}
      />

      <GuideModal 
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onDownloadTemplate={() => {
          const filteredSubjects = userData?.role === 'staff' && userData?.assignedSubjects 
            ? subjects.filter(s => userData.assignedSubjects.includes(s.id))
            : subjects;
          downloadTemplate(filteredSubjects, students);
        }}
        onImportExcel={() => fileInputRef.current?.click()}
      />
    </div>
  );
}

import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
