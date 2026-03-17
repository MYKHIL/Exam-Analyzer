import { useState, useEffect } from 'react';
import { GradeScale, Subject, School } from '../types';
import { Plus, Trash2, Users, UserPlus, ShieldCheck, Mail } from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

export default function ConfigurationView({ 
  gradeScales, setGradeScales, 
  subjects, setSubjects 
}: { 
  gradeScales: GradeScale[], setGradeScales: (g: GradeScale[]) => void,
  subjects: Subject[], setSubjects: (s: Subject[]) => void
}) {
  const { school, user } = useAuth();
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectType, setNewSubjectType] = useState<'core' | 'elective'>('core');
  const [inviteEmail, setInviteEmail] = useState('');
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [authorizedUsers, setAuthorizedUsers] = useState<{ uid: string, email: string, displayName: string }[]>([]);

  const isAdmin = school?.adminUid === user?.uid;

  useEffect(() => {
    const fetchAuthorizedUsers = async () => {
      if (!school?.authorizedUids || school.authorizedUids.length === 0) {
        setAuthorizedUsers([]);
        return;
      }

      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', 'in', school.authorizedUids));
      const snapshot = await getDocs(q);
      const users = snapshot.docs.map(doc => doc.data() as { uid: string, email: string, displayName: string });
      setAuthorizedUsers(users);
    };

    fetchAuthorizedUsers();
  }, [school?.authorizedUids]);

  const handleAddMember = async () => {
    if (!inviteEmail.trim() || !school) return;
    setLoadingInvite(true);
    try {
      // Find user by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', inviteEmail.trim()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        alert('User not found. They must sign in to the app at least once before they can be added to a school.');
        return;
      }

      const targetUser = snapshot.docs[0].data();
      const schoolRef = doc(db, 'schools', school.id);
      
      await updateDoc(schoolRef, {
        authorizedUids: arrayUnion(targetUser.uid)
      });

      setInviteEmail('');
      alert('Member added successfully!');
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Failed to add member.');
    } finally {
      setLoadingInvite(false);
    }
  };

  const handleRemoveMember = async (uid: string) => {
    if (!school) return;
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const schoolRef = doc(db, 'schools', school.id);
      await updateDoc(schoolRef, {
        authorizedUids: arrayRemove(uid)
      });
      alert('Member removed successfully!');
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member.');
    }
  };

  const handleAddSubject = () => {
    if (!newSubjectName.trim()) return;
    setSubjects([...subjects, { id: crypto.randomUUID(), name: newSubjectName, type: newSubjectType }]);
    setNewSubjectName('');
  };

  const handleRemoveSubject = (id: string) => {
    setSubjects(subjects.filter(s => s.id !== id));
  };

  const handleAddGradeScale = () => {
    setGradeScales([...gradeScales, { id: crypto.randomUUID(), minScore: 0, maxScore: 0, grade: 'X', points: 0 }]);
  };

  const handleUpdateGradeScale = (id: string, field: keyof GradeScale, value: any) => {
    setGradeScales(gradeScales.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const handleRemoveGradeScale = (id: string) => {
    setGradeScales(gradeScales.filter(g => g.id !== id));
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configuration</h2>
        <p className="text-gray-500 mt-1">Manage grade scales and subjects.</p>
      </div>

      {/* Subjects Configuration */}
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Subjects</h3>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input 
            type="text" 
            placeholder="Subject Name" 
            value={newSubjectName}
            onChange={e => setNewSubjectName(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            onKeyDown={e => e.key === 'Enter' && handleAddSubject()}
          />
          <div className="flex gap-2">
            <select 
              value={newSubjectType}
              onChange={e => setNewSubjectType(e.target.value as 'core' | 'elective')}
              className="flex-1 md:flex-none px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
            >
              <option value="core">Core</option>
              <option value="elective">Elective</option>
            </select>
            <button 
              onClick={handleAddSubject}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subjects.map(subject => (
            <div key={subject.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-gray-50">
              <div>
                <p className="font-medium text-gray-900">{subject.name}</p>
                <span className={`text-xs px-2 py-1 rounded-full font-medium mt-1 inline-block ${subject.type === 'core' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                  {subject.type.charAt(0).toUpperCase() + subject.type.slice(1)}
                </span>
              </div>
              <button onClick={() => handleRemoveSubject(subject.id)} className="text-gray-400 hover:text-red-500 transition-colors p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {subjects.length === 0 && <p className="text-gray-500 col-span-2">No subjects configured.</p>}
        </div>
      </div>

      {/* Grade Scales Configuration */}
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Grade Scales</h3>
          <button 
            onClick={handleAddGradeScale}
            className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 text-sm bg-indigo-50 px-3 py-1.5 rounded-lg"
          >
            <Plus className="w-4 h-4" /> Add Scale
          </button>
        </div>

        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-gray-200 text-sm text-gray-500">
                <th className="pb-3 font-medium">Grade</th>
                <th className="pb-3 font-medium">Min Score</th>
                <th className="pb-3 font-medium">Max Score</th>
                <th className="pb-3 font-medium">Points</th>
                <th className="pb-3 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {gradeScales.map(scale => (
                <tr key={scale.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-3 pr-4">
                    <input 
                      type="text" 
                      value={scale.grade}
                      onChange={e => handleUpdateGradeScale(scale.id, 'grade', e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <input 
                      type="number" 
                      value={scale.minScore}
                      onChange={e => handleUpdateGradeScale(scale.id, 'minScore', Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <input 
                      type="number" 
                      value={scale.maxScore}
                      onChange={e => handleUpdateGradeScale(scale.id, 'maxScore', Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <input 
                      type="number" 
                      value={scale.points}
                      onChange={e => handleUpdateGradeScale(scale.id, 'points', Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </td>
                  <td className="py-3">
                    <button onClick={() => handleRemoveGradeScale(scale.id)} className="text-gray-400 hover:text-red-500 p-1.5 bg-gray-50 hover:bg-red-50 rounded-md transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {gradeScales.length === 0 && <p className="text-gray-500 mt-4">No grade scales configured.</p>}
        </div>
      </div>

      {/* Team Management - Only for Admins */}
      {isAdmin && (
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Team Management</h3>
              <p className="text-sm text-gray-500">Manage who can access and edit school data.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="email" 
                  placeholder="Member's Google Email" 
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <button 
                onClick={handleAddMember}
                disabled={loadingInvite || !inviteEmail.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                {loadingInvite ? 'Adding...' : 'Add Member'}
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Authorized Members</h4>
              <div className="grid grid-cols-1 gap-3">
                {/* Admin is always authorized */}
                <div className="flex items-center justify-between p-4 border border-indigo-100 rounded-xl bg-indigo-50/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user?.displayName} (You)</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full font-bold uppercase">Admin</span>
                </div>

                {/* Other members */}
                {authorizedUsers.map(member => (
                  <div key={member.uid} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.displayName}</p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveMember(member.uid)}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                
                {authorizedUsers.length === 0 && (
                  <p className="text-sm text-gray-500 italic py-2">No additional members added yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
