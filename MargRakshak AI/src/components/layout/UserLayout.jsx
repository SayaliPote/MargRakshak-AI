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
  X,
  UserCircle2,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';
import Dropdown from '../common/Dropdown';
import LanguageSelector from '../common/LanguageSelector';
import NotificationBell from '../common/NotificationBell';
import { useLanguage } from '../../context/LanguageContext';
import { driverNotifications } from '../../data/notifications';

export default function UserLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(() => {
    try {
      return localStorage.getItem('margrakshak_user_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('margrakshak_user_sidebar_collapsed', String(next));
      } catch (e) {}
      setTimeout(() => window.dispatchEvent(new Event('resize')), 310);
      return next;
    });
  };

  const navigationItems = [
    { name: t('sidebar.navigation'), path: '/user/navigation', icon: Navigation, isMock: false },
    { name: t('sidebar.alertHub'), path: '/user/alerts', icon: AlertTriangle, isMock: false },
    { name: t('sidebar.safeRoutes'), path: '/user/routes', icon: TrendingUp, isMock: false },
    { name: t('sidebar.history'), path: '/user/navigation', icon: History, isMock: true },
    { name: t('sidebar.viewProfile'), path: '/user/profile', icon: UserCircle2, isMock: false },
  ];

  // Mobile bottom nav – 4 primary items
  const mobileNavItems = [
    { name: t('sidebar.navigation'), path: '/user/navigation', icon: Navigation },
    { name: t('sidebar.alertHub'), path: '/user/alerts', icon: AlertTriangle },
    { name: t('sidebar.safeRoutes'), path: '/user/routes', icon: TrendingUp },
    { name: t('sidebar.viewProfile'), path: '/user/profile', icon: UserCircle2 },
  ];

  const handleMockClick = (name) => {
    alert(`${name}\n\n${t('common.comingSoon')}`);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden font-sans">
      {/* ─── Desktop Sidebar ─── */}
      <aside 
        className={`hidden md:flex md:flex-col bg-slate-950 text-white flex-shrink-0 transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'md:w-[72px]' : 'md:w-64'
        }`}
      >
        <div className={`flex items-center h-16 border-b border-white/10 shrink-0 ${
          isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-5'
        }`}>
          <div className="flex items-center min-w-0 overflow-hidden">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-amber-400 text-slate-900 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </span>
            {!isSidebarCollapsed && (
              <span className="font-display font-extrabold text-lg tracking-tight text-white ml-3 truncate">
                {t('common.appName')}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 px-2.5 py-5 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.path && !item.isMock;
            
            if (item.isMock) {
              return (
                <button
                  key={item.name}
                  onClick={() => handleMockClick(item.name)}
                  title={isSidebarCollapsed ? item.name : undefined}
                  className={`flex items-center w-full py-2.5 text-sm font-medium rounded-xl text-slate-400 hover:bg-white/8 hover:text-white transition-colors duration-150 ${
                    isSidebarCollapsed ? 'justify-center px-2' : 'px-3.5'
                  }`}
                >
                  <item.icon className={`w-5 h-5 shrink-0 ${isSidebarCollapsed ? '' : 'mr-3'}`} />
                  {!isSidebarCollapsed && (
                    <span className="truncate flex items-center gap-2">
                      {item.name}
                      <span className="text-[10px] font-bold bg-white/10 px-1.5 py-0.5 rounded-full">Soon</span>
                    </span>
                  )}
                </button>
              );
            }

            return (
              <Link
                key={item.name}
                to={item.path}
                title={isSidebarCollapsed ? item.name : undefined}
                className={`flex items-center py-2.5 text-sm font-medium rounded-xl transition-colors duration-150 group ${
                  isSidebarCollapsed ? 'justify-center px-2' : 'px-3.5'
                } ${
                  isActive 
                    ? 'bg-amber-400 text-slate-900' 
                    : 'text-slate-300 hover:bg-white/8 hover:text-white'
                }`}
              >
                <item.icon className={`w-5 h-5 shrink-0 ${
                  isActive ? 'text-slate-900' : 'text-slate-400 group-hover:text-white'
                } ${isSidebarCollapsed ? '' : 'mr-3'}`} />
                {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="px-2.5 py-3 border-t border-white/10 space-y-1 shrink-0">
          <Link
            to="/user/profile"
            title={isSidebarCollapsed ? t('sidebar.settings') : undefined}
            className={`flex items-center w-full py-2.5 text-sm font-medium rounded-xl transition-colors duration-150 ${
              isSidebarCollapsed ? 'justify-center px-2' : 'px-3.5'
            } ${
              location.pathname === '/user/profile'
                ? 'bg-amber-400 text-slate-900'
                : 'text-slate-300 hover:bg-white/8 hover:text-white'
            }`}
          >
            <Settings className={`w-5 h-5 shrink-0 ${
              location.pathname === '/user/profile' ? 'text-slate-900' : 'text-slate-400'
            } ${isSidebarCollapsed ? '' : 'mr-3'}`} />
            {!isSidebarCollapsed && <span className="truncate">{t('sidebar.settings')}</span>}
          </Link>
          <button
            onClick={() => navigate('/')}
            title={isSidebarCollapsed ? t('sidebar.logout') : undefined}
            className={`flex items-center w-full py-2.5 text-sm font-medium rounded-xl text-red-400 hover:bg-red-950/50 hover:text-red-300 transition-colors duration-150 ${
              isSidebarCollapsed ? 'justify-center px-2' : 'px-3.5'
            }`}
          >
            <LogOut className={`w-5 h-5 shrink-0 ${isSidebarCollapsed ? '' : 'mr-3'}`} />
            {!isSidebarCollapsed && <span className="truncate">{t('sidebar.logout')}</span>}
          </button>
        </div>
      </aside>

      {/* ─── Mobile Sidebar Drawer ─── */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setIsMobileMenuOpen(false)} 
            aria-hidden="true"
          />
          <aside className="relative flex flex-col w-[280px] bg-slate-950 text-white h-full z-50 shadow-2xl animate-slide-in-left">
            <div className="flex items-center justify-between h-16 px-5 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-amber-400 text-slate-900 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <span className="font-display font-extrabold text-lg text-white">{t('common.appName')}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.path && !item.isMock;
                return item.isMock ? (
                  <button
                    key={item.name}
                    onClick={() => { setIsMobileMenuOpen(false); handleMockClick(item.name); }}
                    className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-xl text-slate-400 hover:bg-white/8"
                  >
                    <item.icon className="w-5 h-5 mr-3 shrink-0" />
                    <span>{item.name}</span>
                    <span className="ml-auto text-[10px] font-bold bg-white/10 px-1.5 py-0.5 rounded-full">Soon</span>
                  </button>
                ) : (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl ${
                      isActive ? 'bg-amber-400 text-slate-900' : 'text-slate-300 hover:bg-white/8 hover:text-white'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 mr-3 shrink-0 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="px-3 py-4 border-t border-white/10 space-y-1 shrink-0">
              <button
                onClick={() => { setIsMobileMenuOpen(false); navigate('/user/profile'); }}
                className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-xl text-slate-300 hover:bg-white/8 hover:text-white"
              >
                <Settings className="w-5 h-5 mr-3 shrink-0 text-slate-400" />
                {t('sidebar.settings')}
              </button>
              <button
                onClick={() => { setIsMobileMenuOpen(false); navigate('/'); }}
                className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-xl text-red-400 hover:bg-red-950/50 hover:text-red-300 transition-colors"
              >
                <LogOut className="w-5 h-5 mr-3 shrink-0" />
                {t('sidebar.logout')}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-16 bg-slate-950 border-b border-white/10 flex items-center justify-between px-4 md:px-6 text-white z-20 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0 hidden sm:block">
              <span className="font-display text-sm md:text-base font-bold tracking-tight block truncate">
                {t('header.driverAppTitle')}
              </span>
              <span className="text-[11px] font-mono font-medium text-slate-400 block truncate">
                {t('header.liveTripMode')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <div className="hidden sm:block">
              <LanguageSelector variant="dark" />
            </div>
            <ThemeToggle />
            <NotificationBell notifications={driverNotifications} />
            <div className="h-6 w-px bg-white/10 hidden sm:block" />
            <Dropdown
              align="right"
              trigger={
                <div className="flex items-center gap-2 cursor-pointer group px-2 py-1.5 rounded-xl hover:bg-white/8 transition-colors">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-400 text-slate-900 shrink-0 font-bold text-sm">
                    D
                  </span>
                  <span className="text-sm font-semibold text-white hidden md:inline">
                    {t('header.driverUser')}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400 hidden md:inline shrink-0" />
                </div>
              }
              items={[
                { label: t('sidebar.viewProfile'), icon: UserCircle2, onClick: () => navigate('/user/profile') },
                { divider: true },
                { label: t('sidebar.logout'), icon: LogOut, danger: true, onClick: () => navigate('/') },
              ]}
            />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-slate-950 pb-16 md:pb-0 focus:outline-none" tabIndex={-1}>
          {children}
        </main>

        {/* ─── Mobile Bottom Navigation ─── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-950/95 backdrop-blur border-t border-white/10 pb-safe" aria-label="Mobile navigation">
          <div className="flex items-stretch justify-around">
            {mobileNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-label={item.name}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex flex-col items-center justify-center py-2 px-1 flex-1 gap-0.5 transition-colors min-h-[52px] ${
                    isActive ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-amber-400' : ''}`} />
                  <span className="text-[10px] font-semibold truncate max-w-full px-0.5 leading-tight">
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
