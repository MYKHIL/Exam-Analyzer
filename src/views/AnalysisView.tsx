import React, { useState, useMemo } from 'react';
import { Student, Subject, GradeScale } from '../types';
import { calculateStudentAggregate, resolveGrade, getSubjectSummaryData } from '../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Plus, Trash2 } from 'lucide-react';

export default function AnalysisView({ 
  students, subjects, gradeScales,
  aggRangeMin, setAggRangeMin,
  aggRangeMax, setAggRangeMax,
  subjRanges, setSubjRanges
}: { 
  students: Student[], subjects: Subject[], gradeScales: GradeScale[],
  aggRangeMin: number, setAggRangeMin: (n: number) => void,
  aggRangeMax: number, setAggRangeMax: (n: number) => void,
  subjRanges: {id: string, min: number, max: number}[], setSubjRanges: (r: {id: string, min: number, max: number}[]) => void
}) {
  const [analysisType, setAnalysisType] = useState<'aggregate' | 'subject' | 'class'>('aggregate');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');

  const [classAnalysisMetric, setClassAnalysisMetric] = useState<'grade' | 'score'>('grade');

  const addSubjRange = () => {
    setSubjRanges([...subjRanges, { id: Date.now().toString(), min: 1, max: 6 }]);
  };

  const updateSubjRange = (id: string, field: 'min' | 'max', value: number) => {
    setSubjRanges(subjRanges.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeSubjRange = (id: string) => {
    setSubjRanges(subjRanges.filter(r => r.id !== id));
  };

  // Aggregate Analysis Data
  const aggregateAnalysisData = useMemo(() => {
    const data = {
      M: { total: 0, counts: {} as Record<number, number> },
      F: { total: 0, counts: {} as Record<number, number> }
    };

    for (let i = aggRangeMin; i <= aggRangeMax; i++) {
      data.M.counts[i] = 0;
      data.F.counts[i] = 0;
    }

    students.forEach(student => {
      const agg = calculateStudentAggregate(student, subjects, gradeScales);
      const pts = agg.aggregatePoints;
      const sex = student.sex || 'M';
      
      data[sex].total += 1;
      
      if (pts >= aggRangeMin && pts <= aggRangeMax) {
        data[sex].counts[pts] = (data[sex].counts[pts] || 0) + 1;
      }
    });

    return data;
  }, [students, subjects, gradeScales, aggRangeMin, aggRangeMax]);

  // Subject Summary Table Data
  const subjectSummaryData = useMemo(() => {
    return getSubjectSummaryData(students, subjects, gradeScales, subjRanges);
  }, [students, subjects, gradeScales, subjRanges]);

  // Subject Analysis Data
  const subjectAnalysisData = useMemo(() => {
    const subject = subjects.find(s => s.id === selectedSubjectId);
    if (!subject) return { gradeDistribution: [], averageScore: 0, highestScore: 0, lowestScore: 0 };
    
    const scores = students.map(s => s.scores[subject.id]).filter(s => s !== undefined && s !== '');
    
    // Grade distribution
    const distribution: Record<string, number> = {};
    gradeScales.forEach(g => distribution[g.grade] = 0);
    
    scores.forEach(score => {
      const grade = resolveGrade(score, gradeScales);
      if (grade) {
        distribution[grade.grade] = (distribution[grade.grade] || 0) + 1;
      }
    });

    const gradeDistribution = Object.entries(distribution).map(([grade, count]) => ({
      name: `Grade ${grade}`,
      value: count
    })).filter(d => d.value > 0);

    const numericScores = scores.map(s => typeof s === 'number' ? s : parseFloat(s)).filter(s => !isNaN(s));
    const averageScore = numericScores.length > 0 ? numericScores.reduce((a, b) => a + b, 0) / numericScores.length : 0;
    const highestScore = numericScores.length > 0 ? Math.max(...numericScores) : 0;
    const lowestScore = numericScores.length > 0 ? Math.min(...numericScores) : 0;

    return { gradeDistribution, averageScore, highestScore, lowestScore };
  }, [selectedSubjectId, students, subjects, gradeScales]);

  // Class Analysis Data
  const classAnalysisData = useMemo(() => {
    return subjects.map(sub => {
      const scores = students.map(s => s.scores[sub.id]).filter(s => s !== undefined && s !== '');
      
      if (classAnalysisMetric === 'score') {
        const numericScores = scores.map(s => typeof s === 'number' ? s : parseFloat(s)).filter(s => !isNaN(s));
        const classAvg = numericScores.length > 0 ? numericScores.reduce((a, b) => a + b, 0) / numericScores.length : 0;
        return {
          subject: sub.name,
          value: Number(classAvg.toFixed(1)),
        };
      } else {
        // Based on grades (average points)
        const points = scores.map(s => resolveGrade(s, gradeScales)?.points).filter(p => p !== undefined) as number[];
        const avgPoints = points.length > 0 ? points.reduce((a, b) => a + b, 0) / points.length : 0;
        return {
          subject: sub.name,
          value: Number(avgPoints.toFixed(1)),
        };
      }
    });
  }, [students, subjects, classAnalysisMetric, gradeScales]);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Performance Analysis</h2>
        <p className="text-gray-500 mt-1">Deep dive into student and subject metrics.</p>
      </div>

      <div className="flex flex-wrap gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        <button 
          onClick={() => setAnalysisType('aggregate')}
          className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${analysisType === 'aggregate' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Aggregate
        </button>
        <button 
          onClick={() => setAnalysisType('subject')}
          className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${analysisType === 'subject' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Subject
        </button>
        <button 
          onClick={() => setAnalysisType('class')}
          className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${analysisType === 'class' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Class
        </button>
      </div>

      {analysisType === 'aggregate' && (
        <div className="space-y-6">
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Aggregate Analysis</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Range:</span>
                <input 
                  type="number" 
                  value={aggRangeMin} 
                  onChange={e => setAggRangeMin(Number(e.target.value))}
                  className="w-16 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
                <span className="text-sm text-gray-500">to</span>
                <input 
                  type="number" 
                  value={aggRangeMax} 
                  onChange={e => setAggRangeMax(Number(e.target.value))}
                  className="w-16 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                    <th className="p-4 font-medium border-r border-gray-200">Sex</th>
                    {Array.from({ length: aggRangeMax - aggRangeMin + 1 }, (_, i) => aggRangeMin + i).map(agg => (
                      <th key={agg} className="p-4 font-medium text-center border-r border-gray-200">Agg {agg}</th>
                    ))}
                    <th className="p-4 font-medium text-center">% Pass ({aggRangeMin}-{aggRangeMax})</th>
                    <th className="p-4 font-medium text-center">Above Agg {aggRangeMax}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {['M', 'F'].map(sex => {
                    const data = aggregateAnalysisData[sex as 'M' | 'F'];
                    const passCount = Object.values(data.counts).reduce((a: number, b: number) => a + b, 0) as number;
                    const passPercentage = data.total > 0 ? ((passCount / data.total) * 100).toFixed(1) : '0.0';
                    const aboveAggCount = data.total - passCount;
                    
                    return (
                      <tr key={sex} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 font-medium text-gray-900 border-r border-gray-200">{sex === 'M' ? 'Male' : 'Female'}</td>
                        {Array.from({ length: aggRangeMax - aggRangeMin + 1 }, (_, i) => aggRangeMin + i).map(agg => (
                          <td key={agg} className="p-4 text-center border-r border-gray-200">{data.counts[agg]}</td>
                        ))}
                        <td className="p-4 text-center font-bold text-indigo-600">{passPercentage}%</td>
                        <td className="p-4 text-center font-bold text-rose-600">{aboveAggCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {['M', 'F'].map(sex => {
                const data = aggregateAnalysisData[sex as 'M' | 'F'];
                const passCount = Object.values(data.counts).reduce((a: number, b: number) => a + b, 0) as number;
                const passPercentage = data.total > 0 ? ((passCount / data.total) * 100).toFixed(1) : '0.0';
                const aboveAggCount = data.total - passCount;

                return (
                  <div key={sex} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-gray-900">{sex === 'M' ? 'Male' : 'Female'}</span>
                      <span className="text-xs text-gray-500">Total: {data.total}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-white p-2 rounded-lg border border-gray-100 text-center">
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Pass %</p>
                        <p className="text-lg font-bold text-indigo-600">{passPercentage}%</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-gray-100 text-center">
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Above {aggRangeMax}</p>
                        <p className="text-lg font-bold text-rose-600">{aboveAggCount}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-gray-700">Aggregate Distribution:</p>
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: aggRangeMax - aggRangeMin + 1 }, (_, i) => aggRangeMin + i).map(agg => (
                          <div key={agg} className="flex flex-col items-center bg-white px-2 py-1 rounded border border-gray-100 min-w-[40px]">
                            <span className="text-[9px] text-gray-400">Agg {agg}</span>
                            <span className="text-xs font-bold">{data.counts[agg]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {analysisType === 'subject' && (
        <div className="space-y-6">
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Subject Summary</h3>
              <div className="flex flex-wrap items-center gap-2">
                {subjRanges.map((range, idx) => (
                  <div key={range.id} className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                    <span className="text-[10px] font-medium text-gray-500">R{idx + 1}:</span>
                    <input 
                      type="number" 
                      value={range.min} 
                      onChange={e => updateSubjRange(range.id, 'min', Number(e.target.value))}
                      className="w-10 px-1 py-0.5 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-[10px]"
                    />
                    <span className="text-[10px] text-gray-500">-</span>
                    <input 
                      type="number" 
                      value={range.max} 
                      onChange={e => updateSubjRange(range.id, 'max', Number(e.target.value))}
                      className="w-10 px-1 py-0.5 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-[10px]"
                    />
                    {subjRanges.length > 1 && (
                      <button onClick={() => removeSubjRange(range.id)} className="text-rose-500 hover:text-rose-700">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  onClick={addSubjRange}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 bg-indigo-50 rounded-lg"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                    <th rowSpan={2} className="p-4 font-medium border-r border-gray-200 sticky left-0 bg-gray-50 z-10 align-bottom">Subject</th>
                    {gradeScales.map(g => (
                      <th key={g.id} colSpan={2} className="p-2 font-medium text-center border-r border-gray-200 border-b border-gray-200">Grade {g.grade}</th>
                    ))}
                    <th colSpan={2} className="p-2 font-medium text-center border-r border-gray-200 border-b border-gray-200">Total</th>
                    {subjRanges.map((r, idx) => (
                      <th key={r.id} colSpan={2} className="p-2 font-medium text-center border-r border-gray-200 border-b border-gray-200">Range {idx + 1} ({r.min}-{r.max})</th>
                    ))}
                  </tr>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
                    {gradeScales.map(g => (
                      <React.Fragment key={g.id}>
                        <th className="p-2 font-medium text-center border-r border-gray-200">M</th>
                        <th className="p-2 font-medium text-center border-r border-gray-200">F</th>
                      </React.Fragment>
                    ))}
                    <th className="p-2 font-medium text-center border-r border-gray-200">M</th>
                    <th className="p-2 font-medium text-center border-r border-gray-200">F</th>
                    {subjRanges.map(r => (
                      <React.Fragment key={r.id}>
                        <th className="p-2 font-medium text-center border-r border-gray-200 text-indigo-600">M</th>
                        <th className="p-2 font-medium text-center border-r border-gray-200 text-indigo-600">F</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {subjectSummaryData.map(row => (
                    <tr key={row.subject} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-medium text-gray-900 border-r border-gray-200 sticky left-0 bg-white z-10">{row.subject}</td>
                      {gradeScales.map(g => (
                        <React.Fragment key={g.id}>
                          <td className="p-2 text-center border-r border-gray-200">{row.grades[g.grade].M}</td>
                          <td className="p-2 text-center border-r border-gray-200">{row.grades[g.grade].F}</td>
                        </React.Fragment>
                      ))}
                      <td className="p-2 text-center border-r border-gray-200 font-semibold bg-gray-50/50">{row.total.M}</td>
                      <td className="p-2 text-center border-r border-gray-200 font-semibold bg-gray-50/50">{row.total.F}</td>
                      {subjRanges.map(r => (
                        <React.Fragment key={r.id}>
                          <td className="p-2 text-center border-r border-gray-200 font-bold text-indigo-600 bg-indigo-50/30">{row.ranges[r.id].M}</td>
                          <td className="p-2 text-center border-r border-gray-200 font-bold text-indigo-600 bg-indigo-50/30">{row.ranges[r.id].F}</td>
                        </React.Fragment>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {subjectSummaryData.map(row => (
                <div key={row.subject} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h4 className="font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">{row.subject}</h4>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white p-2 rounded-lg border border-gray-100">
                      <p className="text-[10px] text-gray-500 uppercase font-bold text-center mb-1">Total</p>
                      <div className="flex justify-around">
                        <div className="text-center"><span className="text-[9px] text-gray-400 block">M</span><span className="font-bold">{row.total.M}</span></div>
                        <div className="text-center"><span className="text-[9px] text-gray-400 block">F</span><span className="font-bold">{row.total.F}</span></div>
                      </div>
                    </div>
                    {subjRanges.map((r, idx) => (
                      <div key={r.id} className="bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                        <p className="text-[10px] text-indigo-600 uppercase font-bold text-center mb-1">Range {idx + 1}</p>
                        <div className="flex justify-around">
                          <div className="text-center"><span className="text-[9px] text-indigo-400 block">M</span><span className="font-bold text-indigo-700">{row.ranges[r.id].M}</span></div>
                          <div className="text-center"><span className="text-[9px] text-indigo-400 block">F</span><span className="font-bold text-indigo-700">{row.ranges[r.id].F}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Grade Distribution:</p>
                    <div className="flex flex-wrap gap-2">
                      {gradeScales.map(g => (
                        <div key={g.id} className="bg-white px-2 py-1 rounded border border-gray-100 min-w-[60px]">
                          <p className="text-[9px] text-gray-400 text-center border-b border-gray-50 mb-1">G{g.grade}</p>
                          <div className="flex justify-between gap-2">
                            <span className="text-[10px] font-medium text-blue-600">M:{row.grades[g.grade].M}</span>
                            <span className="text-[10px] font-medium text-pink-600">F:{row.grades[g.grade].F}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mt-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Subject Performance Profile</h3>
              <select 
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white min-w-[200px]"
              >
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {selectedSubjectId && subjects.find(s => s.id === selectedSubjectId) ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <p className="text-sm text-emerald-600 font-medium mb-1">Highest Score</p>
                    <p className="text-3xl font-bold text-emerald-700">{subjectAnalysisData.highestScore}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-sm text-blue-600 font-medium mb-1">Average Score</p>
                    <p className="text-3xl font-bold text-blue-700">{subjectAnalysisData.averageScore.toFixed(1)}</p>
                  </div>
                  <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                    <p className="text-sm text-rose-600 font-medium mb-1">Lowest Score</p>
                    <p className="text-3xl font-bold text-rose-700">{subjectAnalysisData.lowestScore}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-md font-medium text-gray-700 mb-4 text-center">Grade Distribution</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={subjectAnalysisData.gradeDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {subjectAnalysisData.gradeDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-md font-medium text-gray-700 mb-4 text-center">Top 2 Performers</h4>
                      <div className="space-y-3">
                        {students
                          .filter(s => s.scores[selectedSubjectId] !== undefined && s.scores[selectedSubjectId] !== '')
                          .sort((a, b) => {
                            const valA = typeof a.scores[selectedSubjectId] === 'number' ? a.scores[selectedSubjectId] as number : parseFloat(a.scores[selectedSubjectId] as string);
                            const valB = typeof b.scores[selectedSubjectId] === 'number' ? b.scores[selectedSubjectId] as number : parseFloat(b.scores[selectedSubjectId] as string);
                            return (valB || 0) - (valA || 0);
                          })
                          .slice(0, 2)
                          .map((student, idx) => (
                            <div key={student.id} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-xs font-bold">
                                  {idx + 1}
                                </span>
                                <span className="font-medium text-gray-900">{student.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-gray-900">{student.scores[selectedSubjectId]}</span>
                                <span className="text-xs font-bold px-2 py-1 bg-emerald-200 text-emerald-800 rounded">
                                  {resolveGrade(student.scores[selectedSubjectId], gradeScales)?.grade || '-'}
                                </span>
                              </div>
                            </div>
                          ))}
                        {students.filter(s => s.scores[selectedSubjectId] !== undefined && s.scores[selectedSubjectId] !== '').length === 0 && (
                          <p className="text-gray-500 text-sm text-center">No scores recorded.</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-md font-medium text-gray-700 mb-4 text-center">Bottom 2 Performers</h4>
                      <div className="space-y-3">
                        {students
                          .filter(s => s.scores[selectedSubjectId] !== undefined && s.scores[selectedSubjectId] !== '')
                          .sort((a, b) => {
                            const valA = typeof a.scores[selectedSubjectId] === 'number' ? a.scores[selectedSubjectId] as number : parseFloat(a.scores[selectedSubjectId] as string);
                            const valB = typeof b.scores[selectedSubjectId] === 'number' ? b.scores[selectedSubjectId] as number : parseFloat(b.scores[selectedSubjectId] as string);
                            return (valA || 0) - (valB || 0);
                          })
                          .slice(0, 2)
                          .map((student, idx) => (
                            <div key={student.id} className="flex items-center justify-between p-3 bg-rose-50 rounded-lg border border-rose-100">
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center text-xs font-bold">
                                  {idx + 1}
                                </span>
                                <span className="font-medium text-gray-900">{student.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-gray-900">{student.scores[selectedSubjectId]}</span>
                                <span className="text-xs font-bold px-2 py-1 bg-rose-200 text-rose-800 rounded">
                                  {resolveGrade(student.scores[selectedSubjectId], gradeScales)?.grade || '-'}
                                </span>
                              </div>
                            </div>
                          ))}
                        {students.filter(s => s.scores[selectedSubjectId] !== undefined && s.scores[selectedSubjectId] !== '').length === 0 && (
                          <p className="text-gray-500 text-sm text-center">No scores recorded.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-500">Select a subject to view analysis.</p>
            )}
          </div>
        </div>
      )}

      {analysisType === 'class' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Subject Comparison</h3>
              <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                <button 
                  onClick={() => setClassAnalysisMetric('grade')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${classAnalysisMetric === 'grade' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Grade Points
                </button>
                <button 
                  onClick={() => setClassAnalysisMetric('score')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${classAnalysisMetric === 'score' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Raw Scores
                </button>
              </div>
            </div>
            <div className="h-64 md:h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classAnalysisData} margin={{ top: 20, right: 30, left: 0, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="subject" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6b7280', fontSize: 12 }} 
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                  <Tooltip 
                    cursor={{ fill: '#f3f4f6' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" name={classAnalysisMetric === 'grade' ? 'Avg Grade Points' : 'Avg Raw Score'} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-gray-500 mt-4 text-center">
              {classAnalysisMetric === 'grade' 
                ? 'This chart shows the average grade points per subject. Lower points usually indicate better performance.'
                : 'This chart shows the average raw scores per subject.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
