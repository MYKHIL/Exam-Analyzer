import { LayoutDashboard, Settings, Users, BarChart3, FileText, HelpCircle, BookOpen, LogOut, Copy, Check, Building2 } from 'lucide-react';
import { logOut } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function Sidebar({ 
  activeTab, 
  setActiveTab,
  onShowGuide,
  onSwitchExam
}: { 
  activeTab: string, 
  setActiveTab: (t: string) => void,
  onShowGuide: () => void,
  onSwitchExam: () => void
}) {
  const { school, currentExam, logout } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showMobileSchool, setShowMobileSchool] = useState(false);

  const copySchoolId = () => {
    if (!school?.id) return;
    navigator.clipboard.writeText(school.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students & Scores', icon: Users },
    { id: 'analysis', label: 'Analysis', icon: BarChart3 },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'config', label: 'Configuration', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col shrink-0">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Exam Analyzer
          </h1>
          <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">School</p>
            <p className="text-sm font-bold text-gray-700 truncate">{school?.name}</p>
            <button 
              onClick={copySchoolId}
              className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied ID!' : 'Copy School ID'}
            </button>
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Current Exam</p>
            <p className="text-sm font-medium text-gray-600 truncate">{currentExam?.name}</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === item.id 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-indigo-600' : 'text-gray-400'}`} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200 space-y-1">
          <button
            onClick={onSwitchExam}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <BookOpen className="w-5 h-5 text-gray-400" />
            Switch Exam
          </button>
          <button
            onClick={onShowGuide}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <HelpCircle className="w-5 h-5 text-gray-400" />
            How to use
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5 text-red-400" />
            Logout
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 px-2 py-1">
        <div className="flex justify-around items-center">
          {navItems.slice(0, 3).map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                activeTab === item.id 
                  ? 'text-indigo-600' 
                  : 'text-gray-500'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label.split(' ')[0]}</span>
            </button>
          ))}
          <button
            onClick={() => setShowMobileSchool(true)}
            className="flex flex-col items-center gap-1 p-2 rounded-lg text-gray-500"
          >
            <Building2 className="w-5 h-5" />
            <span className="text-[10px] font-medium">School</span>
          </button>
          <button
            onClick={onSwitchExam}
            className="flex flex-col items-center gap-1 p-2 rounded-lg text-gray-500"
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] font-medium">Exams</span>
          </button>
        </div>
      </div>

      {/* Mobile School Info Modal */}
      {showMobileSchool && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-[60] flex items-end">
          <div className="w-full bg-white rounded-t-[2rem] p-8 space-y-6 animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">School Information</h3>
              <button 
                onClick={() => setShowMobileSchool(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <Check className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">School Name</p>
                <p className="text-lg font-bold text-gray-900">{school?.name}</p>
              </div>
              
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">School ID</p>
                <p className="text-sm font-mono text-indigo-900 break-all mt-1">{school?.id}</p>
                <button 
                  onClick={copySchoolId}
                  className="mt-3 w-full py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy ID'}
                </button>
              </div>

              <button
                onClick={() => { setShowMobileSchool(false); logout(); }}
                className="w-full py-4 text-red-600 font-bold flex items-center justify-center gap-2 border border-red-100 rounded-2xl hover:bg-red-50"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
