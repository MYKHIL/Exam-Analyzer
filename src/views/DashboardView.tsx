import { Student, Subject, GradeScale } from '../types';
import { calculateStudentAggregate } from '../utils';
import { Users, BookOpen, Award, TrendingUp } from 'lucide-react';

export default function DashboardView({ students, subjects, gradeScales }: { students: Student[], subjects: Subject[], gradeScales: GradeScale[] }) {
  const totalStudents = students.length;
  const totalSubjects = subjects.length;
  
  const aggregates = students.map(s => calculateStudentAggregate(s, subjects, gradeScales));
  const avgClassScore = aggregates.length > 0 ? aggregates.reduce((acc, curr) => acc + curr.averageScore, 0) / aggregates.length : 0;
  const avgClassAggregate = aggregates.length > 0 ? aggregates.reduce((acc, curr) => acc + curr.aggregatePoints, 0) / aggregates.length : 0;

  const topStudent = students.length > 0 ? students.reduce((prev, current) => {
    const prevAgg = calculateStudentAggregate(prev, subjects, gradeScales);
    const currAgg = calculateStudentAggregate(current, subjects, gradeScales);
    // Lower aggregate points is better in 1-9 system.
    // If aggregate points are equal, higher total score is better.
    if (prevAgg.aggregatePoints === currAgg.aggregatePoints) {
      return prevAgg.totalScore > currAgg.totalScore ? prev : current;
    }
    return prevAgg.aggregatePoints < currAgg.aggregatePoints ? prev : current;
  }) : null;

  const stats = [
    { label: 'Total Students', value: totalStudents, icon: Users, color: 'bg-blue-500' },
    { label: 'Total Subjects', value: totalSubjects, icon: BookOpen, color: 'bg-purple-500' },
    { label: 'Class Average', value: `${avgClassScore.toFixed(1)}%`, icon: TrendingUp, color: 'bg-emerald-500' },
    { label: 'Avg Aggregate', value: avgClassAggregate.toFixed(1), icon: Award, color: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-500 mt-1">High-level summary of exam performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`${stat.color} w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Student</h3>
          {topStudent ? (
            <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              <div>
                <p className="font-semibold text-indigo-900">{topStudent.name}</p>
                <p className="text-sm text-indigo-700 mt-1">
                  Score: {calculateStudentAggregate(topStudent, subjects, gradeScales).totalScore} | 
                  Aggregate: {calculateStudentAggregate(topStudent, subjects, gradeScales).aggregatePoints}
                </p>
              </div>
              <Award className="w-8 h-8 text-indigo-500" />
            </div>
          ) : (
            <p className="text-gray-500">No students added yet.</p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Students</h3>
          <div className="space-y-3">
            {students.slice(-3).reverse().map(student => (
              <div key={student.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                <span className="font-medium text-gray-700">{student.name}</span>
                <span className="text-sm text-gray-500">
                  {calculateStudentAggregate(student, subjects, gradeScales).subjectsCount} subjects
                </span>
              </div>
            ))}
            {students.length === 0 && <p className="text-gray-500">No students added yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
