import { GradeScale, Subject, Student } from './types';

export const DEFAULT_GRADE_SCALES: GradeScale[] = [
  { id: '1', minScore: 90, maxScore: 100, grade: '1', points: 1 },
  { id: '2', minScore: 80, maxScore: 89, grade: '2', points: 2 },
  { id: '3', minScore: 70, maxScore: 79, grade: '3', points: 3 },
  { id: '4', minScore: 65, maxScore: 69, grade: '4', points: 4 },
  { id: '5', minScore: 60, maxScore: 64, grade: '5', points: 5 },
  { id: '6', minScore: 55, maxScore: 59, grade: '6', points: 6 },
  { id: '7', minScore: 50, maxScore: 54, grade: '7', points: 7 },
  { id: '8', minScore: 40, maxScore: 49, grade: '8', points: 8 },
  { id: '9', minScore: 0, maxScore: 39, grade: '9', points: 9 },
];

export const DEFAULT_SUBJECTS: Subject[] = [
  { id: 's1', name: 'English Language (Core)', type: 'core' },
  { id: 's2', name: 'Mathematics (Core)', type: 'core' },
  { id: 's3', name: 'Science (Core)', type: 'core' },
  { id: 's4', name: 'Social Studies (Core)', type: 'core' },
  { id: 's5', name: 'Religious & Moral Education', type: 'elective' },
  { id: 's6', name: 'Computing', type: 'elective' },
  { id: 's7', name: 'Ghanaian Language', type: 'elective' },
  { id: 's8', name: 'Career Technology', type: 'elective' },
  { id: 's9', name: 'Creative Arts & Design', type: 'elective' },
  { id: 's10', name: 'French', type: 'elective' },
];

export const DEFAULT_STUDENTS: Student[] = [
  { 
    id: 'st1', 
    name: 'Alice Johnson', 
    sex: 'F', 
    scores: { 
      's1': 85, 's2': 78, 's3': 92, 's4': 80, 
      's5': 88, 's6': 95, 's7': 70, 's8': 82, 's9': 90, 's10': 75 
    } 
  },
  { 
    id: 'st2', 
    name: 'Bob Smith', 
    sex: 'M', 
    scores: { 
      's1': 62, 's2': 55, 's3': 70, 's4': 65, 
      's5': 45, 's6': 60, 's7': 58, 's8': 72, 's9': 68, 's10': 50 
    } 
  },
  { 
    id: 'st3', 
    name: 'Charlie Brown', 
    sex: 'M', 
    scores: { 
      's1': 45, 's2': 60, 's3': 58, 's4': 55, 
      's5': 90, 's6': 85, 's7': 92, 's8': 88, 's9': 80, 's10': 95 
    } 
  },
];
