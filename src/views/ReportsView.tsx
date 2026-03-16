import { useState } from 'react';
import { Student, Subject, GradeScale } from '../types';
import { calculateStudentAggregate, resolveGrade, getSubjectSummaryData } from '../utils';
import { FileText, Download, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function ReportsView({ 
  students, subjects, gradeScales, subjRanges
}: { 
  students: Student[], subjects: Subject[], gradeScales: GradeScale[],
  subjRanges: {id: string, min: number, max: number}[]
}) {
  const [includeAggregates, setIncludeAggregates] = useState(true);
  const [includeSubjectPerf, setIncludeSubjectPerf] = useState(true);
  const [includeGradeDist, setIncludeGradeDist] = useState(true);

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text("Exam Analyzer Report", 14, 15);
    let yPos = 25;

    if (includeAggregates) {
      doc.setFontSize(14);
      doc.text("Student Aggregates", 14, yPos);
      
      const head = [['Student', 'Sex', ...subjects.map(s => s.name), 'Agg. Pts']];
      const body = students.map(s => {
        const agg = calculateStudentAggregate(s, subjects, gradeScales);
        const subjectGrades = subjects.map(sub => {
          const score = s.scores[sub.id];
          return resolveGrade(score, gradeScales)?.grade || '-';
        });
        return [s.name, s.sex, ...subjectGrades, agg.aggregatePoints];
      });

      autoTable(doc, {
        startY: yPos + 5,
        head: head,
        body: body,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] }
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    if (includeSubjectPerf) {
      if (yPos > 180) { doc.addPage(); yPos = 20; }
      doc.setFontSize(14);
      doc.text("Subject-wise Performance", 14, yPos);
      
      const summaryData = getSubjectSummaryData(students, subjects, gradeScales, subjRanges);
      
      const head = [
        [
          { content: 'Subject', rowSpan: 2 },
          ...gradeScales.map(g => ({ content: `Grade ${g.grade}`, colSpan: 2, styles: { halign: 'center' } })),
          { content: 'Total', colSpan: 2, styles: { halign: 'center' } },
          ...subjRanges.map(r => ({ content: `Range ${r.min}-${r.max}`, colSpan: 2, styles: { halign: 'center' } }))
        ],
        [
          ...gradeScales.flatMap(() => ['M', 'F']),
          'M', 'F',
          ...subjRanges.flatMap(() => ['M', 'F'])
        ]
      ];

      const body = summaryData.map(row => {
        return [
          row.subject,
          ...gradeScales.flatMap(g => [row.grades[g.grade].M, row.grades[g.grade].F]),
          row.total.M, row.total.F,
          ...subjRanges.flatMap(r => [row.ranges[r.id].M, row.ranges[r.id].F])
        ];
      });

      autoTable(doc, {
        startY: yPos + 5,
        head: head as any,
        body: body,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [16, 185, 129] }
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    if (includeGradeDist) {
      if (yPos > 180) { doc.addPage(); yPos = 20; }
      doc.setFontSize(14);
      doc.text("Overall Grade Distribution", 14, yPos);
      
      const distribution: Record<string, number> = {};
      gradeScales.forEach(g => distribution[g.grade] = 0);
      
      students.forEach(student => {
        subjects.forEach(subject => {
          const score = student.scores[subject.id];
          if (score !== undefined && score !== '') {
            const grade = resolveGrade(score, gradeScales);
            if (grade) {
              distribution[grade.grade] = (distribution[grade.grade] || 0) + 1;
            }
          }
        });
      });

      autoTable(doc, {
        startY: yPos + 5,
        head: [['Grade', 'Count']],
        body: Object.entries(distribution).filter(([_, count]) => count > 0),
        headStyles: { fillColor: [245, 158, 11] }
      });
    }

    doc.save("exam_report.pdf");
  };

  const handleExportExcel = () => {
    // Generate a comprehensive Excel of student aggregates
    const data = students.map(s => {
      const agg = calculateStudentAggregate(s, subjects, gradeScales);
      const row: any = {
        'Student Name': s.name,
        'Sex': s.sex,
        'Total Score': agg.totalScore,
        'Average Score': agg.averageScore.toFixed(1),
        'Aggregate Points': agg.aggregatePoints,
      };
      // Add individual subject scores
      subjects.forEach(sub => {
        row[sub.name] = s.scores[sub.id] !== undefined ? s.scores[sub.id] : '';
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Exam Report");
    XLSX.writeFile(wb, "exam_report.xlsx");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Reports & Export</h2>
        <p className="text-gray-500 mt-1">Generate customizable reports and export data.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Content</h3>
        
        <div className="space-y-4 mb-8">
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={includeAggregates}
              onChange={e => setIncludeAggregates(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-gray-700 font-medium">Individual Student Aggregates</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={includeSubjectPerf}
              onChange={e => setIncludeSubjectPerf(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-gray-700 font-medium">Subject-wise Performance</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={includeGradeDist}
              onChange={e => setIncludeGradeDist(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-gray-700 font-medium">Overall Grade Distribution</span>
          </label>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={handleExportPDF}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <FileText className="w-5 h-5" /> Export as PDF
          </button>
          <button 
            onClick={handleExportExcel}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <FileSpreadsheet className="w-5 h-5" /> Export as Excel
          </button>
        </div>
      </div>
    </div>
  );
}
