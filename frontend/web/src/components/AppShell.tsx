import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, LogIn, Newspaper, PlusCircle, User } from 'lucide-react';
import { useAuth } from '@/lib/auth-store';

const TABS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/report', label: 'Report', icon: PlusCircle, end: false },
  { to: '/news', label: 'News', icon: Newspaper, end: false },
  { to: '/profile', label: 'Profile', icon: User, end: false },
] as const;

function Brand() {
  return (
    <span className="flex items-center gap-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-gh-red"
      >
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
        <path d="m16.5 16-1.5 1.5" />
        <path d="M15 21h4" />
      </svg>
      <span className="text-xl font-black tracking-tight text-secondary">FixGH</span>
    </span>
  );
}

export default function AppShell() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // The dashboard deep link (/dashboard/report/:id) is a standalone page.
  const isStandalone = location.pathname.startsWith('/dashboard/');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop navigation — the mobile app relies on per-screen headers instead */}
      <header className="sticky top-0 z-30 hidden border-b border-slate-200 bg-white/95 backdrop-blur md:block">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3.5">
          <NavLink to="/" className="flex items-center gap-3">
            <Brand />
            <span className="hidden text-xs text-slate-400 lg:inline">
              Report. Track. Fix Ghana&apos;s Infrastructure.
            </span>
          </NavLink>

          <nav className="flex items-center gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-emerald-50 text-gh-green'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                    }`
                  }
                >
                  <Icon size={17} />
                  {tab.label}
                </NavLink>
              );
            })}
          </nav>

          {isAuthenticated ? (
            <NavLink
              to="/profile"
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gh-green text-[11px] font-black text-white">
                {(user?.name || '?').charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-[10rem] truncate lg:inline">{user?.name}</span>
            </NavLink>
          ) : (
            <NavLink
              to="/auth"
              className="flex items-center gap-2 rounded-lg bg-secondary px-3.5 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              <LogIn size={16} />
              Sign In
            </NavLink>
          )}
        </div>
      </header>

      <main className={`mx-auto w-full max-w-5xl ${isStandalone ? 'py-0' : 'pb-28 md:pb-14'}`}>
        <Outlet />
      </main>

      {/* Bottom tab bar — identical to the mobile tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-slate-200 bg-white p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex flex-col items-center rounded-lg px-3 py-1.5 transition-colors ${
                  isActive ? 'bg-emerald-50 text-gh-green' : 'text-slate-400 hover:text-slate-600'
                }`
              }
            >
              <Icon size={22} />
              <span className="mt-0.5 text-[10px] font-medium">{tab.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
