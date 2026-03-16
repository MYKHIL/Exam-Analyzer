/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { GradeScale, Subject, Student } from './types';
import { DEFAULT_GRADE_SCALES, DEFAULT_SUBJECTS, DEFAULT_STUDENTS } from './constants';
import Sidebar from './components/Sidebar';
import ConfigurationView from './views/ConfigurationView';
import StudentsView from './views/StudentsView';
import AnalysisView from './views/AnalysisView';
import DashboardView from './views/DashboardView';
import ReportsView from './views/ReportsView';
import GuideModal from './components/GuideModal';
import { downloadTemplate, processExcelFile } from './excelUtils';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [gradeScales, setGradeScales] = useState<GradeScale[]>(DEFAULT_GRADE_SCALES);
  const [subjects, setSubjects] = useState<Subject[]>(DEFAULT_SUBJECTS);
  const [students, setStudents] = useState<Student[]>(DEFAULT_STUDENTS);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [aggRangeMin, setAggRangeMin] = useState<number>(6);
  const [aggRangeMax, setAggRangeMax] = useState<number>(36);
  const [subjRanges, setSubjRanges] = useState<{id: string, min: number, max: number}[]>([{id: '1', min: 1, max: 6}]);

  useEffect(() => {
    // Show guide on first open if no students
    if (students.length === 0) {
      setIsGuideOpen(true);
    }
  }, []);

  const handleImportExcel = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processExcelFile(file, subjects, students, (updatedStudents) => {
      setStudents(updatedStudents);
      setIsGuideOpen(false);
      setActiveTab('students');
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onShowGuide={() => setIsGuideOpen(true)} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
        {activeTab === 'dashboard' && (
          <DashboardView students={students} subjects={subjects} gradeScales={gradeScales} />
        )}
        {activeTab === 'config' && (
          <ConfigurationView 
            gradeScales={gradeScales} setGradeScales={setGradeScales}
            subjects={subjects} setSubjects={setSubjects}
          />
        )}
        {activeTab === 'students' && (
          <StudentsView 
            students={students} setStudents={setStudents}
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
        onDownloadTemplate={() => downloadTemplate(subjects)}
        onImportExcel={() => fileInputRef.current?.click()}
      />
    </div>
  );
}
