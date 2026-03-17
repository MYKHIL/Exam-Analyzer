import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { School, Exam, Student } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  school: School | null;
  currentExam: Exam | null;
  setCurrentExam: (exam: Exam | null) => void;
  setSchool: (school: School | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<School | null>(null);
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Fetch school associated with user
        const schoolsRef = collection(db, 'schools');
        const q = query(schoolsRef, where('adminUid', '==', user.uid));
        
        const unsubscribeSchool = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            const schoolData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as School;
            setSchool(schoolData);
          } else {
            setSchool(null);
          }
          setLoading(false);
        });

        return () => unsubscribeSchool();
      } else {
        setSchool(null);
        setCurrentExam(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, school, currentExam, setCurrentExam, setSchool }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
