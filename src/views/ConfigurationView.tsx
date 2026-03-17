import { useState, useEffect } from 'react';
import { GradeScale, Subject, School } from '../types';
import { Plus, Trash2, Users, UserPlus, ShieldCheck, Mail, Key, Copy, Check, BookOpen } from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove, addDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

export default function ConfigurationView({ 
  gradeScales, setGradeScales, 
  subjects, setSubjects 
}: { 
  gradeScales: GradeScale[], setGradeScales: (g: GradeScale[]) => void,
  subjects: Subject[], setSubjects: (s: Subject[]) => void
}) {
  const { school, user, userData } = useAuth();
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectType, setNewSubjectType] = useState<'core' | 'elective'>('core');
  const [inviteEmail, setInviteEmail] = useState('');
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [authorizedUsers, setAuthorizedUsers] = useState<{ uid: string, email: string, displayName: string, assignedSubjects?: string[], role?: string, joinedWithCode?: string }[]>([]);
  const [teacherCodes, setTeacherCodes] = useState<any[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const isSchoolAdmin = school?.adminUid === user?.uid || userData?.role === 'admin';

  useEffect(() => {
    if (!school?.id) return;

    const fetchAuthorizedUsers = async () => {
      if (!school) return;
      const usersRef = collection(db, 'users');
      const usersMap = new Map<string, any>();

      try {
        // 1. Fetch by schoolId (catches everyone linked to the school)
        const qBySchool = query(usersRef, where('schoolId', '==', school.id));
        const snapBySchool = await getDocs(qBySchool);
        snapBySchool.docs.forEach(doc => {
          const data = doc.data();
          if (data.uid !== school.adminUid) {
            usersMap.set(data.uid, { id: doc.id, ...data });
          }
        });

        // 2. Fetch by authorizedUids (catches those missing schoolId but in the access list)
        const uidsToFetch = (school.authorizedUids || []).filter(uid => !usersMap.has(uid) && uid !== school.adminUid);
        
        if (uidsToFetch.length > 0) {
          // Process in batches of 30 due to Firestore 'in' query limits
          for (let i = 0; i < uidsToFetch.length; i += 30) {
            const batch = uidsToFetch.slice(i, i + 30);
            const qByUid = query(usersRef, where('uid', 'in', batch));
            const snapByUid = await getDocs(qByUid);
            snapByUid.docs.forEach(doc => {
              const data = doc.data();
              usersMap.set(data.uid, { id: doc.id, ...data });
            });
          }
        }

        setAuthorizedUsers(Array.from(usersMap.values()));
      } catch (error) {
        console.error('Error fetching authorized users:', error);
      }
    };

    fetchAuthorizedUsers();

    // Listen to teacher codes
    const codesRef = collection(db, 'teacherCodes');
    const qCodes = query(codesRef, where('schoolId', '==', school.id));
    const unsubscribeCodes = onSnapshot(qCodes, (snapshot) => {
      setTeacherCodes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribeCodes();
  }, [school?.id, school?.authorizedUids]);

  const handleGenerateCode = async () => {
    if (!school || selectedSubjects.length === 0) {
      alert('Please select at least one subject.');
      return;
    }

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      await addDoc(collection(db, 'teacherCodes'), {
        code,
        schoolId: school.id,
        assignedSubjects: selectedSubjects,
        isUsed: false,
        createdAt: new Date().toISOString()
      });
      setSelectedSubjects([]);
    } catch (error) {
      console.error('Error generating code:', error);
    }
  };

  const handleDeleteCode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this code?')) return;
    try {
      await deleteDoc(doc(db, 'teacherCodes', id));
    } catch (error) {
      console.error('Error deleting code:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleAddMember = async () => {
    if (!inviteEmail.trim() || !school) return;
    setLoadingInvite(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', inviteEmail.trim()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        alert('User not found. They must sign in to the app at least once before they can be added to a school.');
        return;
      }

      const targetUserDoc = snapshot.docs[0];
      const targetUserData = targetUserDoc.data();
      const schoolRef = doc(db, 'schools', school.id);
      
      // 1. Add to school authorized list
      await updateDoc(schoolRef, {
        authorizedUids: arrayUnion(targetUserData.uid)
      });

      // 2. Update user document with schoolId and assigned subjects
      await updateDoc(doc(db, 'users', targetUserDoc.id), {
        schoolId: school.id,
        assignedSubjects: selectedSubjects,
        role: 'staff'
      });

      setInviteEmail('');
      setSelectedSubjects([]);
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
    if (!confirm('Are you sure you want to revoke access for this member?')) return;

    try {
      // 1. Remove from school authorized list
      const schoolRef = doc(db, 'schools', school.id);
      await updateDoc(schoolRef, {
        authorizedUids: arrayRemove(uid)
      });

      // 2. Clear user document fields
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', '==', uid));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        await updateDoc(doc(db, 'users', userDoc.id), {
          schoolId: null,
          role: 'staff',
          assignedSubjects: []
        });
      }

      // 3. Update local state
      setAuthorizedUsers(prev => prev.filter(u => u.uid !== uid));
      alert('Access revoked successfully!');
    } catch (error) {
      console.error('Error revoking access:', error);
      alert('Failed to revoke access.');
    }
  };

  const handleUpdateRole = async (uid: string, newRole: 'admin' | 'staff') => {
    if (!school) return;
    if (uid === school.adminUid) {
      alert("The school creator's role cannot be changed.");
      return;
    }

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', '==', uid));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        await updateDoc(doc(db, 'users', snapshot.docs[0].id), {
          role: newRole
        });
        
        // Update local state
        setAuthorizedUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
        alert(`Role updated to ${newRole}.`);
      }
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update role.');
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
    <div className="space-y-8 max-w-5xl pb-20">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configuration</h2>
        <p className="text-gray-500 mt-1">Manage grade scales, subjects, and team access.</p>
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

      {/* Teacher Access Codes - Only for Admins */}
      {isSchoolAdmin && (
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Key className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Teacher Access Codes</h3>
              <p className="text-sm text-gray-500">Generate codes for teachers with specific subject assignments.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h4 className="text-sm font-bold text-gray-700 mb-3">1. Select Subjects for Assignment</h4>
              <div className="flex flex-wrap gap-2">
                {subjects.map(subject => (
                  <button
                    key={subject.id}
                    onClick={() => {
                      if (selectedSubjects.includes(subject.id)) {
                        setSelectedSubjects(selectedSubjects.filter(id => id !== subject.id));
                      } else {
                        setSelectedSubjects([...selectedSubjects, subject.id]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      selectedSubjects.includes(subject.id)
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
                    }`}
                  >
                    {subject.name}
                  </button>
                ))}
                {subjects.length === 0 && <p className="text-xs text-gray-400">Add subjects above first.</p>}
              </div>
              
              <button
                onClick={handleGenerateCode}
                disabled={selectedSubjects.length === 0}
                className="mt-4 w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                Generate Teacher Access Code
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Active Access Codes</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teacherCodes.filter(c => !c.isUsed).map(code => (
                    <div key={code.id} className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-lg font-mono font-bold text-indigo-600 tracking-widest">{code.code}</span>
                          <button 
                            onClick={() => copyToClipboard(code.code)}
                            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                          >
                            {copiedCode === code.code ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {code.assignedSubjects.map((subId: string) => {
                            const sub = subjects.find(s => s.id === subId);
                            return (
                              <span key={subId} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                                {sub?.name || 'Unknown'}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteCode(code.id)}
                        className="mt-4 text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Revoke Code
                      </button>
                    </div>
                  ))}
                  {teacherCodes.filter(c => !c.isUsed).length === 0 && (
                    <p className="text-sm text-gray-500 italic col-span-2">No active codes. Generate one above.</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Used Access Codes (History)</h4>
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-bottom border-gray-200">
                        <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase">Code</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase">User</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase">Subjects</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {teacherCodes.filter(c => c.isUsed).map(code => {
                        const usedByMember = authorizedUsers.find(u => u.uid === code.usedBy);
                        return (
                          <tr key={code.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-mono text-sm font-bold text-gray-600">{code.code}</td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900">{usedByMember?.displayName || 'Unknown'}</span>
                                <span className="text-[10px] text-gray-500">{usedByMember?.email || code.usedBy}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {code.assignedSubjects.map((subId: string) => (
                                  <span key={subId} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                                    {subjects.find(s => s.id === subId)?.name || 'Unknown'}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-500">
                              {code.usedAt ? new Date(code.usedAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4">
                              <button 
                                onClick={() => handleDeleteCode(code.id)}
                                className="text-red-500 hover:text-red-700 p-1"
                                title="Remove record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {teacherCodes.filter(c => c.isUsed).length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 italic">
                            No codes have been used yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Management - Only for Admins */}
      {isSchoolAdmin && (
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
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full font-bold uppercase">Creator</span>
                    <span className="text-[10px] text-indigo-400 font-medium italic">Primary Admin</span>
                  </div>
                </div>

                {/* Other members */}
                {authorizedUsers.map(member => (
                  <div key={member.uid} className="flex flex-col p-4 border border-gray-200 rounded-xl bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          {member.role === 'admin' ? <ShieldCheck className="w-5 h-5 text-indigo-600" /> : <Users className="w-5 h-5 text-gray-400" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{member.displayName}</p>
                          <p className="text-xs text-gray-500">{member.email}</p>
                          {member.joinedWithCode && (
                            <p className="text-[10px] text-indigo-500 font-bold mt-0.5">Joined via code: {member.joinedWithCode}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={member.role || 'staff'}
                          onChange={(e) => handleUpdateRole(member.uid, e.target.value as 'admin' | 'staff')}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button 
                          onClick={() => handleRemoveMember(member.uid)}
                          className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="Revoke Access"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-50">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-3 h-3 text-gray-400" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assigned Subjects</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {member.assignedSubjects && member.assignedSubjects.length > 0 ? (
                          member.assignedSubjects.map((subId: string) => {
                            const sub = subjects.find(s => s.id === subId);
                            return (
                              <span key={subId} className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-medium border border-indigo-100">
                                {sub?.name || 'Unknown'}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">No subjects assigned. Full view access only.</span>
                        )}
                      </div>
                    </div>
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
