import { GradeScale, Subject, Student } from './types';

export const resolveGrade = (value: number | string | undefined, scales: GradeScale[]): GradeScale | null => {
  if (value === undefined || value === null || value === '') return null;
  
  // If it's a number (or a string that is a valid number)
  const numericValue = typeof value === 'number' ? value : parseFloat(value);
  if (!isNaN(numericValue) && typeof value !== 'string') {
    return scales.find(s => numericValue >= s.minScore && numericValue <= s.maxScore) || null;
  }

  // If it's a string, try to match the grade name exactly (case-insensitive)
  const stringValue = value.toString().trim().toLowerCase();
  // Check if the string is actually a number (e.g. "75")
  const isNumericString = /^\d+$/.test(stringValue);
  if (isNumericString) {
    const num = parseInt(stringValue, 10);
    return scales.find(s => num >= s.minScore && num <= s.maxScore) || null;
  }

  return scales.find(s => s.grade.toLowerCase() === stringValue) || null;
};

export const calculateStudentAggregate = (student: Student, subjects: Subject[], scales: GradeScale[], activeSubjectIds?: Set<string>) => {
  let totalScore = 0;
  let subjectsCount = 0;
  let scoreCount = 0;

  const coreGrades: {value: number | string, scale: GradeScale}[] = [];
  const electiveGrades: {value: number | string, scale: GradeScale}[] = [];

  // Find the worst possible grade (highest points)
  const worstGrade = scales.length > 0 ? scales.reduce((prev, current) => (prev.points > current.points) ? prev : current) : null;

  subjects.forEach(subject => {
    const value = student.scores[subject.id];
    const hasValue = value !== undefined && value !== '';
    const isActive = activeSubjectIds ? activeSubjectIds.has(subject.id) : false;

    if (hasValue) {
      subjectsCount++;
      if (typeof value === 'number') {
        totalScore += value;
        scoreCount++;
      } else {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          totalScore += num;
          scoreCount++;
        }
      }

      const scale = resolveGrade(value, scales);
      if (scale) {
        if (subject.type === 'core') {
          coreGrades.push({ value, scale });
        } else {
          electiveGrades.push({ value, scale });
        }
      }
    } else if (isActive && worstGrade) {
      // Penalize for missing score in an active subject
      if (subject.type === 'core') {
        coreGrades.push({ value: '', scale: worstGrade });
      } else {
        electiveGrades.push({ value: '', scale: worstGrade });
      }
    }
  });

  // Sort electives by "best" points (lowest points is better)
  electiveGrades.sort((a, b) => a.scale.points - b.scale.points);

  const bestTwoElectives = electiveGrades.slice(0, 2);

  let aggregatePoints = 0;
  coreGrades.forEach(g => aggregatePoints += g.scale.points);
  bestTwoElectives.forEach(g => aggregatePoints += g.scale.points);

  const averageScore = scoreCount > 0 ? totalScore / scoreCount : 0;

  return {
    totalScore,
    averageScore,
    aggregatePoints,
    corePoints: coreGrades.reduce((acc, g) => acc + g.scale.points, 0),
    electivePoints: bestTwoElectives.reduce((acc, g) => acc + g.scale.points, 0),
    subjectsCount
  };
};

export const getSubjectSummaryData = (students: Student[], subjects: Subject[], gradeScales: GradeScale[], subjRanges: {id: string, min: number, max: number}[]) => {
  return subjects.map(subject => {
    const row = {
      subject: subject.name,
      grades: {} as Record<string, { M: number, F: number }>,
      total: { M: 0, F: 0 },
      absent: { M: 0, F: 0 },
      ranges: {} as Record<string, { M: number, F: number }>
    };

    gradeScales.forEach(g => {
      row.grades[g.grade] = { M: 0, F: 0 };
    });

    subjRanges.forEach(r => {
      row.ranges[r.id] = { M: 0, F: 0 };
    });

    students.forEach(student => {
      const score = student.scores[subject.id];
      const sex = student.sex || 'M';
      
      if (score !== undefined && score !== '') {
        const gradeObj = resolveGrade(score, gradeScales);
        
        row.total[sex] += 1;

        if (gradeObj) {
          row.grades[gradeObj.grade][sex] += 1;
          
          const gradeNum = parseInt(gradeObj.grade, 10);
          if (!isNaN(gradeNum)) {
            subjRanges.forEach(r => {
              if (gradeNum >= r.min && gradeNum <= r.max) {
                row.ranges[r.id][sex] += 1;
              }
            });
          }
        }
      } else {
        row.absent[sex] += 1;
      }
    });

    return row;
  });
};
