export type GradeScale = {
  id: string;
  minScore: number;
  maxScore: number;
  grade: string;
  points: number;
};

export type Subject = {
  id: string;
  name: string;
  type: 'core' | 'elective';
};

export type Student = {
  id: string;
  name: string;
  sex: 'M' | 'F';
  scores: Record<string, number | string>; // subjectId -> score or grade
  schoolId: string;
  examId: string;
};

export type School = {
  id: string;
  name: string;
  adminUid: string;
  createdAt: string;
};

export type Exam = {
  id: string;
  name: string;
  schoolId: string;
  createdAt: string;
  subjects: Subject[];
  gradeScales: GradeScale[];
  subjRanges: { id: string; min: number; max: number }[];
};
