import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Navigation, 
  AlertTriangle, 
  TrendingUp, 
  History, 
  Settings, 
  LogOut,
  ShieldAlert,
  Menu,
  X
} from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';

export default function UserLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navigationItems = [
    { name: 'Navigation', path: '/user/navigation', icon: Navigation, isMock: false },
    { name: 'Alert Hub', path: '/user/alerts', icon: AlertTriangle, isMock: false },
    { name: 'Safe Routes', path: '/user/routes', icon: TrendingUp, isMock: false },
    { name: 'History', path: '/user/navigation', icon: History, isMock: true },
  ];

  const handleMockClick = (name) => {
    alert(`${name} will be connected to browser history tracking and client local database in later phases.`);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-slate-950 text-white flex-shrink-0">
        <div className="flex items-center h-16 px-6 border-b border-white/10">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-amber-400 text-slate-900 mr-3 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </span>
          <span className="font-display font-extrabold text-lg tracking-tight text-white">MargRakshak</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            if (item.isMock) {
              return (
                <button
                  key={item.name}
                  onClick={() => handleMockClick(item.name)}
                  className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg text-slate-300 hover:bg-white/5 hover:text-white transition-colors duration-200"
                >
                  <item.icon className="w-5 h-5 mr-3 text-slate-400" />
                  {item.name}
                </button>
              );
            }

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  isActive 
                    ? 'bg-amber-400 text-slate-900 shadow-md shadow-amber-400/20' 
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          <button 
            onClick={() => alert("User settings (vibration overrides, voice volume, mock route speed limits) will be saved in IndexedDB.")}
            className="flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-lg text-slate-300 hover:bg-white/5 hover:text-white transition-colors duration-200 mb-1"
          >
            <Settings className="w-5 h-5 mr-3 text-slate-400" />
            Settings
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-lg text-red-400 hover:bg-red-950/60 hover:text-red-300 transition-colors duration-200"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile menu toggle */}
      <div className="md:hidden fixed top-3 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-md bg-slate-950 text-white focus:outline-none"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Sidebar overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-slate-950 text-white h-full z-50">
            <div className="flex items-center h-16 px-6 border-b border-white/10">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-amber-400 text-slate-900 mr-3 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <span className="font-display font-extrabold text-lg text-white">MargRakshak</span>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.path;
                return item.isMock ? (
                  <button
                    key={item.name}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleMockClick(item.name);
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg text-slate-300 hover:bg-white/5 hover:text-white"
                  >
                    <item.icon className="w-5 h-5 mr-3 text-slate-400" />
                    {item.name}
                  </button>
                ) : (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                      isActive ? 'bg-amber-400 text-slate-900' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-white/10">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  alert("User settings will be saved in local storage.");
                }}
                className="flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-lg text-slate-300 hover:bg-white/5 hover:text-white mb-1"
              >
                <Settings className="w-5 h-5 mr-3 text-slate-400" />
                Settings
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate('/');
                }}
                className="flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-lg text-red-400 hover:bg-red-950/60 hover:text-red-300"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white/95 backdrop-blur dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-6 md:px-8 text-slate-900 dark:text-white z-10">
          <div className="flex items-center pl-10 md:pl-0">
            <span className="font-display text-lg md:text-xl font-bold tracking-tight flex items-center gap-2">
              🚗 Nashik Road Safety & Navigation
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 hidden sm:inline font-mono">LIVE TRIP MODE</span>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
            <ThemeToggle />
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
            <div className="flex items-center bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-lg border border-amber-100 dark:border-amber-900/40">
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">User Profile 👤</span>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-950 focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
