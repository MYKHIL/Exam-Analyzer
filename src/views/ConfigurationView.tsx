import { useState } from 'react';
import { GradeScale, Subject } from '../types';
import { Plus, Trash2 } from 'lucide-react';

export default function ConfigurationView({ 
  gradeScales, setGradeScales, 
  subjects, setSubjects 
}: { 
  gradeScales: GradeScale[], setGradeScales: (g: GradeScale[]) => void,
  subjects: Subject[], setSubjects: (s: Subject[]) => void
}) {
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectType, setNewSubjectType] = useState<'core' | 'elective'>('core');

  const handleAddSubject = () => {
    if (!newSubjectName.trim()) return;
    setSubjects([...subjects, { id: crypto.randomUUID(), name: newSubjectName, type: newSubjectType }]);
    setNewSubjectName('');
  };

  const handleRemoveSubject = (id: string) => {
    setSubjects(subjects.filter(s => s.id !== id));
  };

  const handleAddGradeScale = () => {
    setGradeScales([...gradeScales, { id: crypto.randomUUID(), minScore: 0, maxScore: 0, grade: 'X', points: 0 }]);
  };

  const handleUpdateGradeScale = (id: string, field: keyof GradeScale, value: any) => {
    setGradeScales(gradeScales.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const handleRemoveGradeScale = (id: string) => {
    setGradeScales(gradeScales.filter(g => g.id !== id));
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configuration</h2>
        <p className="text-gray-500 mt-1">Manage grade scales and subjects.</p>
      </div>

      {/* Subjects Configuration */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Subjects</h3>
        
        <div className="flex gap-4 mb-6">
          <input 
            type="text" 
            placeholder="Subject Name" 
            value={newSubjectName}
            onChange={e => setNewSubjectName(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            onKeyDown={e => e.key === 'Enter' && handleAddSubject()}
          />
          <select 
            value={newSubjectType}
            onChange={e => setNewSubjectType(e.target.value as 'core' | 'elective')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
          >
            <option value="core">Core</option>
            <option value="elective">Elective</option>
          </select>
          <button 
            onClick={handleAddSubject}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Subject
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subjects.map(subject => (
            <div key={subject.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-gray-50">
              <div>
                <p className="font-medium text-gray-900">{subject.name}</p>
                <span className={`text-xs px-2 py-1 rounded-full font-medium mt-1 inline-block ${subject.type === 'core' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                  {subject.type.charAt(0).toUpperCase() + subject.type.slice(1)}
                </span>
              </div>
              <button onClick={() => handleRemoveSubject(subject.id)} className="text-gray-400 hover:text-red-500 transition-colors p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {subjects.length === 0 && <p className="text-gray-500 col-span-2">No subjects configured.</p>}
        </div>
      </div>

      {/* Grade Scales Configuration */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Grade Scales</h3>
          <button 
            onClick={handleAddGradeScale}
            className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 text-sm bg-indigo-50 px-3 py-1.5 rounded-lg"
          >
            <Plus className="w-4 h-4" /> Add Scale
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-sm text-gray-500">
                <th className="pb-3 font-medium">Grade</th>
                <th className="pb-3 font-medium">Min Score</th>
                <th className="pb-3 font-medium">Max Score</th>
                <th className="pb-3 font-medium">Points</th>
                <th className="pb-3 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {gradeScales.map(scale => (
                <tr key={scale.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-3 pr-4">
                    <input 
                      type="text" 
                      value={scale.grade}
                      onChange={e => handleUpdateGradeScale(scale.id, 'grade', e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <input 
                      type="number" 
                      value={scale.minScore}
                      onChange={e => handleUpdateGradeScale(scale.id, 'minScore', Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <input 
                      type="number" 
                      value={scale.maxScore}
                      onChange={e => handleUpdateGradeScale(scale.id, 'maxScore', Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <input 
                      type="number" 
                      value={scale.points}
                      onChange={e => handleUpdateGradeScale(scale.id, 'points', Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </td>
                  <td className="py-3">
                    <button onClick={() => handleRemoveGradeScale(scale.id)} className="text-gray-400 hover:text-red-500 p-1.5 bg-gray-50 hover:bg-red-50 rounded-md transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {gradeScales.length === 0 && <p className="text-gray-500 mt-4">No grade scales configured.</p>}
        </div>
      </div>
    </div>
  );
}
