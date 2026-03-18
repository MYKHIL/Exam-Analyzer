import React, { useState, useRef, useEffect } from 'react';
import { Student, Subject, GradeScale } from '../types';
import { resolveGrade, calculateStudentAggregate } from '../utils';
import { Plus, Trash2, Search, Download, FileSpreadsheet, Save, RotateCcw } from 'lucide-react';
import { downloadTemplate, processExcelFile } from '../excelUtils';
import { useAuth } from '../context/AuthContext';

export default function StudentsView({ 
  students: remoteStudents, setStudents: saveStudents, subjects, gradeScales 
}: { 
  students: Student[], setStudents: (s: Student[]) => void,
  subjects: Subject[], gradeScales: GradeScale[]
}) {
  const { school, currentExam, user, userData } = useAuth();
  const [localStudents, setLocalStudents] = useState<Student[]>(remoteStudents);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'name' | 'sex' | 'aggregate'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = school?.adminUid === user?.uid || userData?.role === 'admin';
  const assignedSubjects = userData?.assignedSubjects || [];

  const canEditSubject = (subjectId: string) => {
    if (isAdmin) return true;
    return assignedSubjects.includes(subjectId);
  };

  useEffect(() => {
    setLocalStudents(remoteStudents);
    setHasChanges(false);
  }, [remoteStudents]);

  const handleAddStudent = () => {
    if (!school || !currentExam) return;
    if (!isAdmin) {
      alert('Only administrators can add new students.');
      return;
    }
    const hasEmptyName = localStudents.some(s => !s.name.trim());
    if (hasEmptyName) {
      alert('Please enter a name for all existing students before adding a new one.');
      return;
    }
    setLocalStudents([...localStudents, { 
      id: crypto.randomUUID(), 
      name: '', 
      sex: 'M', 
      scores: {},
      schoolId: school.id,
      examId: currentExam.id
    }]);
    setHasChanges(true);
  };

  const handleRemoveStudent = (id: string) => {
    if (!isAdmin) {
      alert('Only administrators can remove students.');
      return;
    }
    setLocalStudents(localStudents.filter(s => s.id !== id));
    setHasChanges(true);
  };

  const handleUpdateStudentName = (id: string, newName: string) => {
    if (!isAdmin) return;
    setLocalStudents(localStudents.map(s => s.id === id ? { ...s, name: newName } : s));
    setHasChanges(true);
  };

  const handleUpdateStudentSex = (id: string, newSex: 'M' | 'F') => {
    if (!isAdmin) return;
    setLocalStudents(localStudents.map(s => s.id === id ? { ...s, sex: newSex } : s));
    setHasChanges(true);
  };

  const handleUpdateScore = (studentId: string, subjectId: string, valueStr: string) => {
    if (!canEditSubject(subjectId)) return;

    const numericValue = valueStr === '' ? undefined : Number(valueStr);
    const finalValue = (numericValue === undefined || isNaN(numericValue)) ? valueStr : numericValue;

    setLocalStudents(localStudents.map(s => {
      if (s.id === studentId) {
        const newScores = { ...s.scores };
        if (finalValue === '' || finalValue === undefined) {
          delete newScores[subjectId];
        } else {
          newScores[subjectId] = finalValue;
        }
        return { ...s, scores: newScores };
      }
      return s;
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await saveStudents(localStudents);
    setHasChanges(false);
  };

  const handleDiscard = () => {
    setLocalStudents(remoteStudents);
    setHasChanges(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent, studentIndex: number, subjectId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextInput = document.querySelector(`input[data-student-index="${studentIndex + 1}"][data-subject-id="${subjectId}"]`) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!school || !currentExam) return;
    const file = e.target.files?.[0];
    if (!file) return;
    processExcelFile(file, subjects, localStudents, school.id, currentExam.id, (updated) => {
      setLocalStudents(updated);
      setHasChanges(true);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredStudents = localStudents.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Identify active subjects (at least one student has a score)
  const activeSubjectIds = new Set<string>();
  subjects.forEach(subject => {
    const hasScore = localStudents.some(s => s.scores[subject.id] !== undefined && s.scores[subject.id] !== '');
    if (hasScore) {
      activeSubjectIds.add(subject.id);
    }
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (sortField === 'name') {
      return sortOrder === 'asc' 
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    }
    if (sortField === 'sex') {
      return sortOrder === 'asc'
        ? a.sex.localeCompare(b.sex)
        : b.sex.localeCompare(a.sex);
    }
    if (sortField === 'aggregate') {
      const aggA = calculateStudentAggregate(a, subjects, gradeScales, activeSubjectIds).aggregatePoints;
      const aggB = calculateStudentAggregate(b, subjects, gradeScales, activeSubjectIds).aggregatePoints;
      return sortOrder === 'asc' ? aggA - aggB : aggB - aggA;
    }
    return 0;
  });

  const toggleSort = (field: 'name' | 'sex' | 'aggregate') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }: { field: 'name' | 'sex' | 'aggregate' }) => {
    if (sortField !== field) return <span className="ml-1 opacity-20">↕</span>;
    return <span className="ml-1 text-indigo-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Students & Scores</h2>
          <p className="text-gray-500 mt-1">Fast entry grid for student scores.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {hasChanges && (
            <>
              <button 
                onClick={handleDiscard}
                className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Discard
              </button>
              <button 
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg shadow-green-100"
              >
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </>
          )}
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleImportExcel}
          />
          <button 
            onClick={() => downloadTemplate(subjects)}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" /> Template
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" /> Import Excel
          </button>
          <button 
            onClick={handleAddStudent}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Student
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search students..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2 md:hidden w-full">
          <span className="text-sm text-gray-500 font-medium">Sort by:</span>
          <select 
            value={sortField}
            onChange={(e) => setSortField(e.target.value as any)}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="name">Name</option>
            <option value="sex">Sex</option>
            <option value="aggregate">Aggregate Points</option>
          </select>
          <button 
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-indigo-600 font-bold"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                <th 
                  className="p-4 font-medium sticky left-0 bg-gray-50 z-10 border-r border-gray-200 min-w-[200px] cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleSort('name')}
                >
                  <div className="flex items-center">
                    Student Name <SortIcon field="name" />
                  </div>
                </th>
                <th 
                  className="p-4 font-medium sticky left-[200px] bg-gray-50 z-10 border-r border-gray-200 min-w-[80px] cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleSort('sex')}
                >
                  <div className="flex items-center">
                    Sex <SortIcon field="sex" />
                  </div>
                </th>
                <th 
                  className="p-4 font-medium text-center border-r border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleSort('aggregate')}
                >
                  <div className="flex items-center justify-center">
                    Agg. Pts <SortIcon field="aggregate" />
                  </div>
                </th>
                {subjects.map(subject => (
                  <th key={subject.id} className={`p-4 font-medium min-w-[120px] ${canEditSubject(subject.id) ? 'bg-indigo-50/50' : ''}`}>
                    <div className="flex flex-col">
                      <span className="text-gray-900">{subject.name}</span>
                      <span className={`text-[10px] uppercase tracking-wider ${subject.type === 'core' ? 'text-blue-600' : 'text-purple-600'}`}>
                        {subject.type}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="p-4 font-medium sticky right-0 bg-gray-50 z-10 border-l border-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedStudents.length === 0 ? (
                <tr>
                  <td colSpan={subjects.length + 3} className="p-8 text-center text-gray-500">
                    No students found.
                  </td>
                </tr>
              ) : (
                sortedStudents.map((student, studentIdx) => {
                  const aggregate = calculateStudentAggregate(student, subjects, gradeScales, activeSubjectIds);
                  return (
                    <tr key={student.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="p-0 sticky left-0 bg-white group-hover:bg-gray-50/50 z-10 border-r border-gray-200">
                        <input 
                          type="text"
                          value={student.name}
                          placeholder="Enter student name"
                          onChange={(e) => handleUpdateStudentName(student.id, e.target.value)}
                          disabled={!isAdmin}
                          className={`w-full h-full p-4 bg-transparent outline-none focus:bg-indigo-50 font-medium text-gray-900 ${!isAdmin ? 'cursor-not-allowed' : ''}`}
                        />
                      </td>
                      <td className="p-0 sticky left-[200px] bg-white group-hover:bg-gray-50/50 z-10 border-r border-gray-200">
                        <select
                          value={student.sex}
                          onChange={(e) => handleUpdateStudentSex(student.id, e.target.value as 'M' | 'F')}
                          disabled={!isAdmin}
                          className={`w-full h-full p-4 bg-transparent outline-none focus:bg-indigo-50 font-medium text-gray-900 ${!isAdmin ? 'cursor-not-allowed' : ''}`}
                        >
                          <option value="M">M</option>
                          <option value="F">F</option>
                        </select>
                      </td>
                      <td className="p-4 text-center font-bold text-indigo-600 border-r border-gray-200 bg-white group-hover:bg-gray-50/50">
                        {aggregate.aggregatePoints}
                      </td>
                      {subjects.map(subject => {
                        const score = student.scores[subject.id];
                        const grade = resolveGrade(score, gradeScales);
                        const isEditable = canEditSubject(subject.id);
                        return (
                          <td key={subject.id} className={`p-2 relative group/cell ${isEditable ? 'bg-indigo-50/20' : ''}`}>
                            <div className="flex items-center gap-2">
                              <input 
                                type="text"
                                value={score !== undefined ? score : ''}
                                onChange={(e) => handleUpdateScore(student.id, subject.id, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, studentIdx, subject.id)}
                                data-student-index={studentIdx}
                                data-subject-id={subject.id}
                                disabled={!isEditable}
                                className={`w-16 px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${!isEditable ? 'bg-gray-100 cursor-not-allowed text-gray-400' : ''}`}
                                placeholder="-"
                              />
                              {grade && (
                                <span className="text-xs font-bold text-gray-500 w-4">
                                  {grade.grade}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td className="p-4 sticky right-0 bg-white group-hover:bg-gray-50/50 z-10 border-l border-gray-200 text-center">
                        <button 
                          onClick={() => handleRemoveStudent(student.id)}
                          className="text-gray-400 hover:text-red-500 p-1.5 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-100">
          {sortedStudents.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No students found.</div>
          ) : (
            sortedStudents.map((student) => {
              const aggregate = calculateStudentAggregate(student, subjects, gradeScales, activeSubjectIds);
              return (
                <div key={student.id} className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 space-y-2">
                      <input 
                        type="text"
                        value={student.name}
                        placeholder="Enter student name"
                        onChange={(e) => handleUpdateStudentName(student.id, e.target.value)}
                        className="w-full text-lg font-bold text-gray-900 bg-transparent border-b border-transparent focus:border-indigo-500 outline-none"
                      />
                      <div className="flex items-center gap-3">
                        <select
                          value={student.sex}
                          onChange={(e) => handleUpdateStudentSex(student.id, e.target.value as 'M' | 'F')}
                          className="text-sm text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-200"
                        >
                          <option value="M">Male</option>
                          <option value="F">Female</option>
                        </select>
                        <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                          Agg: {aggregate.aggregatePoints}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveStudent(student.id)}
                      className="text-gray-400 hover:text-red-500 p-2"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {subjects.map(subject => {
                      const score = student.scores[subject.id];
                      const grade = resolveGrade(score, gradeScales);
                      const isEditable = canEditSubject(subject.id);
                      return (
                        <div key={subject.id} className={`p-2 rounded-lg border transition-colors ${isEditable ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-100' : 'bg-gray-50 border-gray-100'}`}>
                          <div className="flex justify-between items-center mb-1">
                            <span className={`text-[10px] font-bold uppercase truncate pr-1 ${isEditable ? 'text-indigo-700' : 'text-gray-500'}`}>
                              {subject.name}
                            </span>
                            {grade && (
                              <span className={`text-[10px] font-bold ${isEditable ? 'text-indigo-600' : 'text-gray-400'}`}>
                                {grade.grade}
                              </span>
                            )}
                          </div>
                          <input 
                            type="text"
                            inputMode="numeric"
                            value={score !== undefined ? score : ''}
                            onChange={(e) => handleUpdateScore(student.id, subject.id, e.target.value)}
                            disabled={!isEditable}
                            className={`w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${!isEditable ? 'bg-gray-100 cursor-not-allowed text-gray-400' : ''}`}
                            placeholder="Score"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
