import { LayoutDashboard, Settings, Users, BarChart3, FileText } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students & Scores', icon: Users },
    { id: 'analysis', label: 'Analysis', icon: BarChart3 },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'config', label: 'Configuration', icon: Settings },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Exam Analyzer
        </h1>
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
    </div>
  );
}
