import * as XLSX from 'xlsx';
import { Subject, Student } from './types';

export const downloadTemplate = (subjects: Subject[]) => {
  const templateData = [
    {
      'Name': 'John Doe',
      'Sex': 'M',
      ...subjects.reduce((acc, sub) => ({ ...acc, [sub.name]: 75 }), {})
    },
    {
      'Name': 'Jane Smith',
      'Sex': 'F',
      ...subjects.reduce((acc, sub) => ({ ...acc, [sub.name]: 82 }), {})
    }
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  
  // Set column widths
  const wscols = [
    { wch: 25 }, // Name
    { wch: 10 }, // Sex
    ...subjects.map(() => ({ wch: 15 })) // Subjects
  ];
  ws['!cols'] = wscols;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, "student_scores_template.xlsx");
};

export const processExcelFile = (
  file: File, 
  subjects: Subject[], 
  existingStudents: Student[], 
  onComplete: (students: Student[]) => void
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
        student = { id: crypto.randomUUID(), name: name, sex: sex, scores: {} };
        newStudents.push(student);
      }

      // Grid format
      subjects.forEach(sub => {
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
