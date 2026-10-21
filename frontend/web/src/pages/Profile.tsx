import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, LogOut, UserCircle, User as UserIcon } from 'lucide-react';
import { api, onReportsChanged, type Report } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { formatDate } from '@/lib/format';
import { InlineError, LoadingState, StatusBadge } from '@/components/ui';

const SETTINGS_ITEMS = ['Notifications', 'Change Password', 'Help & Support'];

export default function Profile() {
  const { user, isAuthenticated, signOut } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);

  const loadReports = useCallback(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setLoadingReports(true);
    setReportsError(null);
    api.reports
      .mine()
      .then((data) => {
        if (!cancelled) setReports(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setReportsError(err instanceof Error ? err.message : 'Failed to load reports.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingReports(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadReports();
  }, [isAuthenticated, loadReports]);

  // Refresh the history as soon as a report is filed, even if this screen
  // stays mounted (for example the report was submitted in another tab).
  useEffect(() => {
    if (!isAuthenticated) return;
    return onReportsChanged(() => loadReports());
  }, [isAuthenticated, loadReports]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-slate-50 px-8 text-center">
        <UserCircle size={80} color="#cbd5e1" />
        <p className="mb-6 mt-4 text-lg text-slate-500">You are not signed in.</p>
        <Link
          to="/auth"
          className="rounded-xl bg-gh-green px-10 py-3.5 text-base font-bold text-white transition hover:bg-primary-dark"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in bg-slate-50">
      {/* Profile header */}
      <div className="mb-[15px] border-b-[3px] border-gh-red bg-white px-5 py-5 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center">
            <div className="mr-4 flex h-16 w-16 items-center justify-center rounded-full bg-gh-green">
              <UserIcon size={40} color="#fff" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gh-black">{user?.name ?? '—'}</h1>
              <p className="mt-1 text-sm text-slate-500">{user?.email ?? '—'}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              signOut();
            }}
            className="flex items-center justify-center rounded-lg border border-gh-red px-4 py-2.5 transition hover:bg-red-50"
          >
            <LogOut size={16} color="#dc2626" />
            <span className="ml-1.5 font-bold text-gh-red">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Settings menu */}
      <section className="mb-5 px-5 md:px-8">
        <h2 className="mb-3.5 text-lg font-bold text-gh-black">Account Settings</h2>
        <div className="overflow-hidden rounded-xl bg-white">
          {SETTINGS_ITEMS.map((item) => (
            <button
              key={item}
              type="button"
              className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-4 text-left transition last:border-b-0 hover:bg-slate-50"
            >
              <span className="text-base text-slate-700">{item}</span>
              <ChevronRight size={20} color="#94a3b8" />
            </button>
          ))}
        </div>
      </section>

      {/* Report history */}
      <section className="px-5 pb-6 md:px-8">
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gh-black">My Report History</h2>
          {!loadingReports && <span className="text-base text-slate-500">{reports.length}</span>}
        </div>

        {loadingReports ? (
          <LoadingState label="Loading your reports…" />
        ) : reportsError ? (
          <InlineError message={reportsError} />
        ) : reports.length === 0 ? (
          <p className="mt-4 text-center text-sm text-slate-400">
            No reports yet. Submit your first one!
          </p>
        ) : (
          <div className="space-y-2.5">
            {reports.map((report, idx) => (
              <Link
                key={report.id}
                to={`/dashboard/report/${report.id}`}
                className="flex items-center justify-between rounded-xl bg-white p-4 shadow-[0_2px_5px_rgba(0,0,0,0.05)] transition hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
              >
                <div className="pr-2.5">
                  <h3 className="mb-1 text-sm font-bold text-gh-black">
                    {idx + 1}) {report.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {report.category ?? 'General'} • {formatDate(report.createdAt)}
                  </p>
                </div>
                <StatusBadge status={report.status} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
