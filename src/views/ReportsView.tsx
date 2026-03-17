import { useState } from 'react';
import { Student, Subject, GradeScale } from '../types';
import { calculateStudentAggregate, resolveGrade, getSubjectSummaryData } from '../utils';
import { FileText, Download, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

export default function ReportsView({ 
  students, subjects, gradeScales, subjRanges
}: { 
  students: Student[], subjects: Subject[], gradeScales: GradeScale[],
  subjRanges: {id: string, min: number, max: number}[]
}) {
  const [includeAggregates, setIncludeAggregates] = useState(true);
  const [includeSubjectPerf, setIncludeSubjectPerf] = useState(true);
  const [includeGradeDist, setIncludeGradeDist] = useState(true);

  // Identify active subjects (at least one student has a score)
  const activeSubjectIds = new Set<string>();
  subjects.forEach(subject => {
    const hasScore = students.some(s => s.scores[subject.id] !== undefined && s.scores[subject.id] !== '');
    if (hasScore) {
      activeSubjectIds.add(subject.id);
    }
  });

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text("Exam Analyzer Report", 14, 15);
    let yPos = 25;

    if (includeAggregates) {
      doc.setFontSize(14);
      doc.text("Student Aggregates", 14, yPos);
      
      const head = [['Student', 'Sex', ...subjects.map(s => s.name), 'Agg. Pts']];
      const body = students.map(s => {
        const agg = calculateStudentAggregate(s, subjects, gradeScales, activeSubjectIds);
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

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    
    if (includeAggregates) {
      const ws = workbook.addWorksheet('Student Aggregates');
      const columns = [
        { header: 'Student Name', key: 'name', width: 30 },
        { header: 'Sex', key: 'sex', width: 10 },
        { header: 'Total Score', key: 'totalScore', width: 15 },
        { header: 'Average Score', key: 'averageScore', width: 15 },
        { header: 'Aggregate Points', key: 'aggregatePoints', width: 15 },
        ...subjects.map(sub => ({ header: sub.name, key: sub.id, width: 15 }))
      ];
      ws.columns = columns;

      // Style Header
      const headerRow = ws.getRow(1);
      headerRow.height = 30;
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });

      // Add Data
      students.forEach(s => {
        const agg = calculateStudentAggregate(s, subjects, gradeScales, activeSubjectIds);
        const rowData = {
          name: s.name,
          sex: s.sex,
          totalScore: agg.totalScore,
          averageScore: agg.averageScore.toFixed(1),
          aggregatePoints: agg.aggregatePoints,
          ...subjects.reduce((acc, sub) => ({ ...acc, [sub.id]: s.scores[sub.id] || '' }), {})
        };
        const row = ws.addRow(rowData);
        row.eachCell((cell, colNumber) => {
          cell.alignment = { vertical: 'middle', horizontal: colNumber > 2 ? 'center' : 'left' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          
          // Color coding important columns
          if (colNumber === 5) { // Aggregate Points
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
            cell.font = { bold: true };
          } else if (colNumber === 3 || colNumber === 4) { // Total and Average Scores
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
          }
        });
      });
    }

    if (includeSubjectPerf) {
      const ws = workbook.addWorksheet('Subject Performance');
      const summaryData = getSubjectSummaryData(students, subjects, gradeScales, subjRanges);
      
      const header1 = ['Subject'];
      const header2 = [''];
      
      gradeScales.forEach(g => {
        header1.push(`Grade ${g.grade}`, '');
        header2.push('M', 'F');
      });
      header1.push('Total', '');
      header2.push('M', 'F');
      subjRanges.forEach(r => {
        header1.push(`Range ${r.min}-${r.max}`, '');
        header2.push('M', 'F');
      });

      ws.addRow(header1);
      ws.addRow(header2);

      // Merge cells for header1
      let colIdx = 2;
      gradeScales.forEach(() => {
        ws.mergeCells(1, colIdx, 1, colIdx + 1);
        colIdx += 2;
      });
      ws.mergeCells(1, colIdx, 1, colIdx + 1); // Total
      colIdx += 2;
      subjRanges.forEach(() => {
        ws.mergeCells(1, colIdx, 1, colIdx + 1);
        colIdx += 2;
      });
      ws.mergeCells(1, 1, 2, 1); // Subject

      // Style Headers
      [ws.getRow(1), ws.getRow(2)].forEach(row => {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
          cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
      });

      // Add Data
      summaryData.forEach(row => {
        const rowData = [
          row.subject,
          ...gradeScales.flatMap(g => [row.grades[g.grade].M, row.grades[g.grade].F]),
          row.total.M, row.total.F,
          ...subjRanges.flatMap(r => [row.ranges[r.id].M, row.ranges[r.id].F])
        ];
        const excelRow = ws.addRow(rowData);
        excelRow.eachCell((cell, colNumber) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

          // Color coding important columns
          const totalStartCol = 1 + (gradeScales.length * 2) + 1;
          const rangeStartCol = totalStartCol + 2;

          if (colNumber >= totalStartCol && colNumber < rangeStartCol) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
            cell.font = { bold: true };
          } else if (colNumber >= rangeStartCol) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
            cell.font = { bold: true };
          }
        });
      });

      ws.getColumn(1).width = 25;
      for (let i = 2; i <= header1.length; i++) ws.getColumn(i).width = 8;
    }

    if (includeGradeDist) {
      const ws = workbook.addWorksheet('Grade Distribution');
      const distribution: Record<string, number> = {};
      gradeScales.forEach(g => distribution[g.grade] = 0);
      
      students.forEach(student => {
        subjects.forEach(subject => {
          const score = student.scores[subject.id];
          if (score !== undefined && score !== '') {
            const grade = resolveGrade(score, gradeScales);
            if (grade) distribution[grade.grade]++;
          }
        });
      });

      ws.columns = [
        { header: 'Grade', key: 'grade', width: 15 },
        { header: 'Count', key: 'count', width: 15 }
      ];

      const headerRow = ws.getRow(1);
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });

      Object.entries(distribution).filter(([_, count]) => count > 0).forEach(([grade, count]) => {
        const row = ws.addRow({ grade, count });
        row.eachCell((cell, colNumber) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          
          if (colNumber === 2) { // Count column
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
            cell.font = { bold: true };
          }
        });
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'exam_report.xlsx';
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Reports & Export</h2>
        <p className="text-gray-500 mt-1">Generate customizable reports and export data.</p>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
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

        <div className="flex flex-col md:flex-row gap-4">
          <button 
            onClick={handleExportPDF}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <FileText className="w-5 h-5" /> PDF
          </button>
          <button 
            onClick={handleExportExcel}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <FileSpreadsheet className="w-5 h-5" /> Excel
          </button>
        </div>
      </div>
    </div>
  );
}
