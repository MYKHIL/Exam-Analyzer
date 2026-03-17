import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { Subject, Student } from './types';

export const downloadTemplate = async (subjects: Subject[], students: Student[] = []) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Template');

  // Define columns
  const columns = [
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Sex', key: 'sex', width: 10 },
    ...subjects.map(sub => ({ header: sub.name, key: sub.id, width: 15 }))
  ];

  worksheet.columns = columns;

  // Style Header Row
  const headerRow = worksheet.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' }, // Indigo-600
    };
    cell.font = {
      color: { argb: 'FFFFFFFF' },
      bold: true,
      size: 11
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Use provided students if available
  const rowData = students.map(s => ({
    name: s.name,
    sex: s.sex,
    ...subjects.reduce((acc, sub) => ({ ...acc, [sub.id]: s.scores[sub.id] ?? '' }), {})
  }));

  rowData.forEach(data => {
    const row = worksheet.addRow(data);
    row.eachCell((cell, colNumber) => {
      cell.alignment = { vertical: 'middle', horizontal: colNumber > 2 ? 'center' : 'left' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  // Generate and download file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'student_scores_template.xlsx';
  anchor.click();
  window.URL.revokeObjectURL(url);
};

export const processExcelFile = (
  file: File, 
  subjects: Subject[], 
  existingStudents: Student[], 
  schoolId: string,
  examId: string,
  onComplete: (students: Student[]) => void,
  allowedSubjectIds?: string[]
) => {
  const reader = new FileReader();
  reader.onload = (evt) => {
    const bstr = evt.target?.result;
    const wb = XLSX.read(bstr, { type: 'binary' });
    const wsname = wb.SheetNames[0];
    const ws = wb.Sheets[wsname];
    const data = XLSX.utils.sheet_to_json(ws) as any[];

    let newStudents = [...existingStudents];

    data.forEach(row => {
      const name = row['Name'] || row['name'] || row['Student Name'] || row['Student'];
      const sexRaw = row['Sex'] || row['sex'] || row['Gender'] || row['gender'];
      const sex = (sexRaw && sexRaw.toString().toUpperCase().startsWith('F')) ? 'F' : 'M';
      
      if (!name) return;

      // Find or create student
      let student = newStudents.find(s => s.name.toLowerCase() === name.toLowerCase());
      if (!student) {
        student = { 
          id: crypto.randomUUID(), 
          name: name, 
          sex: sex, 
          scores: {},
          schoolId,
          examId
        };
        newStudents.push(student);
      }

      // Grid format
      subjects.forEach(sub => {
        // If allowedSubjectIds is provided, only process subjects in that list
        if (allowedSubjectIds && !allowedSubjectIds.includes(sub.id)) return;

        const scoreVal = row[sub.name];
        if (scoreVal !== undefined) {
          const score = parseFloat(scoreVal);
          if (!isNaN(score)) {
            student!.scores[sub.id] = score;
          } else if (typeof scoreVal === 'string' && scoreVal.trim() !== '') {
            student!.scores[sub.id] = scoreVal.trim();
          }
        }
      });

      // Row format
      const subjectName = row['Subject'] || row['subject'];
      const scoreStr = row['Score'] || row['score'];
      if (subjectName && scoreStr !== undefined) {
        const subject = subjects.find(s => s.name.toLowerCase() === subjectName.toLowerCase());
        if (subject) {
          // If allowedSubjectIds is provided, only process subjects in that list
          if (allowedSubjectIds && !allowedSubjectIds.includes(subject.id)) return;

          const score = parseFloat(scoreStr);
          if (!isNaN(score)) {
            student.scores[subject.id] = score;
          } else if (typeof scoreStr === 'string' && scoreStr.trim() !== '') {
            student.scores[subject.id] = scoreStr.trim();
          }
        }
      }
    });

    onComplete(newStudents);
  };
  reader.readAsBinaryString(file);
};
