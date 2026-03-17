import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, setDoc, or } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { School, Exam } from '../types';

interface AuthContextType {
  user: User | null;
  userData: any | null;
  loading: boolean;
  school: School | null;
  currentExam: Exam | null;
  logout: () => Promise<void>;
  setCurrentExam: (exam: Exam | null) => void;
  setSchool: (school: School | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<School | null>(null);
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);

  const logout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Listen to user document
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeUser = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            setUserData(doc.data());
          } else {
            // Create initial user doc if not exists
            setDoc(userRef, {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              lastLogin: new Date().toISOString(),
              role: 'staff' // Default role
            }, { merge: true });
          }
        }, (error) => {
          console.error('User document listener error:', error);
          setUserData(null);
        });

        // Fetch school where user is admin or authorized member
        const schoolsRef = collection(db, 'schools');
        
        const q = query(schoolsRef, or(
          where('adminUid', '==', user.uid),
          where('authorizedUids', 'array-contains', user.uid)
        ));
        
        const unsubscribeSchool = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            const schoolData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as School;
            setSchool(schoolData);
          } else {
            setSchool(null);
            setCurrentExam(null);
            // If user had a schoolId but now has no school access, they were likely revoked
            // We should clear their schoolId in the user document to stay in sync
            if (userData?.schoolId) {
              const userRef = doc(db, 'users', user.uid);
              setDoc(userRef, { schoolId: null, joinedWithCode: null }, { merge: true });
            }
          }
          setLoading(false);
        }, (error) => {
          console.error('School listener error:', error);
          if (error.code === 'permission-denied') {
            setSchool(null);
            setCurrentExam(null);
            // Force logout on permission denied to ensure they go back to AuthView
            auth.signOut();
          }
          setLoading(false);
        });

        return () => {
          unsubscribeUser();
          unsubscribeSchool();
        };
      } else {
        setUserData(null);
        setSchool(null);
        setCurrentExam(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading, school, currentExam, logout, setCurrentExam, setSchool }}>
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
