import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Building2,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  FilePlus2,
  FolderKanban,
  ChevronDown,
  Moon,
  Sun,
  User as UserIcon,
  ShieldCheck,
  Home,
  Bell,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/ui/Skeleton';
import { RoleBadge } from '../components/ui/Badge';
import { getUnreadNotificationCount } from '../services/notificationService';

const navItemBase =
  'relative inline-flex items-center gap-1.5 px-3 py-2 rounded-md-plus text-sm font-semibold tracking-tight transition-colors';
const navLinkCls = ({ isActive }) =>
  `${navItemBase} ${
    isActive
      ? 'text-brand-900 dark:text-white after:absolute after:left-3 after:right-3 after:-bottom-[1px] after:h-0.5 after:rounded-full after:bg-accent-500 dark:after:bg-accent-400'
      : 'text-brand-600 hover:text-brand-900 hover:bg-brand-50 dark:text-paper-200 dark:hover:text-white dark:hover:bg-white/5'
  }`;
const mobileLinkCls = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-md-plus text-sm font-semibold transition-colors ${
    isActive
      ? 'bg-brand-50 text-brand-900 dark:bg-white/5 dark:text-white'
      : 'text-brand-700 hover:bg-brand-50 dark:text-paper-100 dark:hover:bg-white/5'
  }`;

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('cc_theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('cc_theme', dark ? 'dark' : 'light');
  }, [dark]);
  return { dark, toggle: () => setDark((v) => !v) };
}

function NotificationBell({ unreadCount }) {
  const countLabel = unreadCount > 4 ? '4+' : String(unreadCount);
  return (
    <Link
      to="/notifications"
      aria-label={`Notifications, ${unreadCount} unread`}
      title="Notifications"
      className="relative h-9 w-9 grid place-items-center rounded-md-plus text-brand-700 hover:bg-brand-50 dark:text-paper-100 dark:hover:bg-white/5 transition-colors"
    >
      <Bell className="h-4.5 w-4.5" />
      {unreadCount > 0 && (
        <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-red-600 px-1 text-center text-[9px] font-bold leading-4 text-white">
          {countLabel}
        </span>
      )}
    </Link>
  );
}

function AvatarDropdown({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);
  const initials = user?.name
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md-plus border border-paper-200 dark:border-white/10 bg-white dark:bg-brand-900 pl-1.5 pr-2 py-1 hover:bg-paper-50 dark:hover:bg-white/5 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar initials={initials} size="sm" />
        <span className="hidden sm:flex flex-col items-start leading-tight pr-0.5">
          <span className="text-[0.78rem] font-semibold text-brand-900 dark:text-white truncate max-w-[8rem]">
            {user?.name}
          </span>
          <RoleBadge role={user?.role} size="sm" />
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-brand-500 dark:text-paper-300 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 z-50 rounded-lg border border-paper-200 dark:border-white/10 bg-white dark:bg-brand-900 shadow-pop overflow-hidden animate-fade-in"
        >
          <div className="px-4 py-3 border-b border-paper-200 dark:border-white/10 flex items-center gap-3">
            <Avatar initials={initials} size="lg" />
            <div className="min-w-0">
              <p className="text-[0.9rem] font-semibold text-brand-900 dark:text-white truncate">
                {user?.name}
              </p>
              <p className="text-[0.76rem] text-brand-600 dark:text-paper-300 truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <div className="p-1.5">
            <button
              type="button"
              onClick={onLogout}
              role="menuitem"
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md-plus text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileDrawer({ open, onClose, user, isAuthenticated, hasRole, onLogout, unreadCount }) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-brand-950/50 backdrop-blur-[2px] transition-opacity sm:hidden ${
          open ? 'opacity-100 animate-fade-in' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-[82%] max-w-sm bg-white dark:bg-brand-900 border-r border-paper-200 dark:border-white/10 shadow-pop sm:hidden transition-transform duration-300 flex flex-col ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-paper-200 dark:border-white/10">
          <Link to="/" className="flex items-center gap-2" onClick={onClose}>
            <div className="h-8 w-8 rounded-md-plus grid place-items-center bg-brand-900 text-white dark:bg-brand-100 dark:text-brand-900">
              <Building2 className="h-4.5 w-4.5" strokeWidth={2.2} />
            </div>
            <span className="font-display tracking-tightest text-brand-950 dark:text-white font-bold text-[1.05rem]">
              CivicConnect
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="h-9 w-9 grid place-items-center rounded-md-plus text-brand-700 hover:bg-brand-50 dark:text-paper-100 dark:hover:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {isAuthenticated && user && (
          <div className="px-4 py-4 border-b border-paper-200 dark:border-white/10 flex items-center gap-3">
            <Avatar initials={user.name} size="lg" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-900 dark:text-white truncate">
                {user.name}
              </p>
              <RoleBadge role={user.role} size="sm" />
            </div>
          </div>
        )}
        <nav className="p-2.5 space-y-0.5 flex-1">
          <NavLink to="/" end onClick={onClose} className={mobileLinkCls}>
            <Home className="h-4.5 w-4.5" />
            Feed
          </NavLink>
          {user?.role === 'citizen' && (
            <>
              <NavLink to="/report" onClick={onClose} className={mobileLinkCls}>
                <FilePlus2 className="h-4.5 w-4.5" />
                Report Issue
              </NavLink>
              <NavLink to="/my-reports" onClick={onClose} className={mobileLinkCls}>
                <FolderKanban className="h-4.5 w-4.5" />
                My Reports
              </NavLink>
            </>
          )}
          {['officer', 'admin'].includes(user?.role) && (
            <NavLink to="/admin" onClick={onClose} className={mobileLinkCls}>
              <LayoutDashboard className="h-4.5 w-4.5" />
              Dashboard
            </NavLink>
          )}
        </nav>
        <div className="p-3 border-t border-paper-200 dark:border-white/10 space-y-2">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md-plus border border-red-200 bg-red-50 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-300 font-semibold text-sm hover:bg-red-100 dark:hover:bg-red-500/15"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/login"
                onClick={onClose}
                className="h-10 inline-flex items-center justify-center rounded-md-plus border border-paper-300 dark:border-white/10 text-sm font-semibold text-brand-800 dark:text-paper-100 hover:bg-paper-50 dark:hover:bg-white/5"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={onClose}
                className="h-10 inline-flex items-center justify-center rounded-md-plus bg-brand-900 text-white dark:bg-brand-100 dark:text-brand-900 text-sm font-semibold hover:bg-brand-800 dark:hover:bg-white"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default function Navbar() {
  const { isAuthenticated, user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { dark, toggle: toggleDark } = useDarkMode();

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return undefined;
    }

    let active = true;
    const refreshCount = async () => {
      try {
        const count = await getUnreadNotificationCount();
        if (active) setUnreadCount(count);
      } catch (error) {
        if (active) console.error('Unable to load unread notification count:', error.message);
      }
    };
    const onChanged = () => refreshCount();
    refreshCount();
    const intervalId = window.setInterval(refreshCount, 30000);
    window.addEventListener('civic-notifications-changed', onChanged);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('civic-notifications-changed', onChanged);
    };
  }, [isAuthenticated]);

  const onLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-brand-950/90 backdrop-blur border-b border-paper-200 dark:border-white/10">
      <div className="page-max">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              className="h-9 w-9 sm:hidden grid place-items-center rounded-md-plus text-brand-700 hover:bg-brand-50 dark:text-paper-100 dark:hover:bg-white/5"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md-plus grid place-items-center bg-brand-900 text-white dark:bg-brand-100 dark:text-brand-900 shadow-sm">
                <Building2 className="h-4.5 w-4.5" strokeWidth={2.2} />
              </div>
              <span className="font-display tracking-tightest text-brand-950 dark:text-white font-bold text-[1.05rem]">
                CivicConnect
              </span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" end className={navLinkCls}>
              <Home className="h-4 w-4" />
              Feed
            </NavLink>
            {user?.role === 'citizen' && (
              <>
                <NavLink to="/report" className={navLinkCls}>
                  <FilePlus2 className="h-4 w-4" />
                  Report Issue
                </NavLink>
                <NavLink to="/my-reports" className={navLinkCls}>
                  <FolderKanban className="h-4 w-4" />
                  My Reports
                </NavLink>
              </>
            )}
            {['officer', 'admin'].includes(user?.role) && (
              <NavLink to="/admin" className={navLinkCls}>
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {isAuthenticated && <NotificationBell unreadCount={unreadCount} />}
            <button
              type="button"
              onClick={toggleDark}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="h-9 w-9 grid place-items-center rounded-md-plus text-brand-700 hover:bg-brand-50 dark:text-paper-100 dark:hover:bg-white/5 transition-colors"
            >
              {dark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>
            {isAuthenticated ? (
              <AvatarDropdown user={user} onLogout={onLogout} />
            ) : (
              <div className="hidden sm:flex items-center gap-1.5">
                <Link
                  to="/login"
                  className="h-9 inline-flex items-center px-3.5 rounded-md-plus text-sm font-semibold text-brand-800 hover:bg-brand-50 dark:text-paper-100 dark:hover:bg-white/5"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="h-9 inline-flex items-center px-4 rounded-md-plus bg-brand-900 text-white dark:bg-brand-100 dark:text-brand-900 text-sm font-semibold shadow-sm hover:bg-brand-800 dark:hover:bg-white transition-colors"
                >
                  <UserIcon className="h-4 w-4 mr-1.5" />
                  Register
                </Link>
              </div>
            )}
            {!isAuthenticated && (
              <div className="sm:hidden flex items-center gap-1">
                <Link
                  to="/login"
                  aria-label="Login"
                  className="h-9 w-9 grid place-items-center rounded-md-plus text-brand-700 hover:bg-brand-50 dark:text-paper-100 dark:hover:bg-white/5"
                >
                  <UserIcon className="h-4.5 w-4.5" />
                </Link>
                <Link
                  to="/register"
                  aria-label="Register"
                  className="h-9 w-9 grid place-items-center rounded-md-plus bg-brand-900 text-white dark:bg-brand-100 dark:text-brand-900 shadow-sm"
                >
                  <ShieldCheck className="h-4.5 w-4.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={user}
        isAuthenticated={isAuthenticated}
        hasRole={hasRole}
        onLogout={onLogout}
        unreadCount={unreadCount}
      />
    </header>
  );
}
