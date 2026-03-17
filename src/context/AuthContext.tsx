import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { School, Exam } from '../types';

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
        try {
          // Create/Update user document
          const userRef = doc(db, 'users', user.uid);
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            lastLogin: new Date().toISOString()
          }, { merge: true });
        } catch (error) {
          console.error('Error updating user doc:', error);
        }

        // Fetch school where user is admin or authorized member
        const schoolsRef = collection(db, 'schools');
        
        const qAdmin = query(schoolsRef, where('adminUid', '==', user.uid));
        const qMember = query(schoolsRef, where('authorizedUids', 'array-contains', user.uid));
        
        let unsubAdmin = () => {};
        let unsubMember = () => {};

        const handleSnapshot = (snapshot: any) => {
          if (!snapshot.empty) {
            const schoolData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as School;
            setSchool(schoolData);
            setLoading(false);
          }
        };

        unsubAdmin = onSnapshot(qAdmin, (snapshot) => {
          if (!snapshot.empty) {
            handleSnapshot(snapshot);
          } else {
            // If not admin, check if member
            unsubMember = onSnapshot(qMember, (memberSnapshot) => {
              if (!memberSnapshot.empty) {
                handleSnapshot(memberSnapshot);
              } else {
                setSchool(null);
                setLoading(false);
              }
            }, (error) => {
              handleFirestoreError(error, OperationType.LIST, 'schools');
            });
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'schools');
        });

        return () => {
          unsubAdmin();
          unsubMember();
        };
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
