import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle, Map as MapIcon, Sparkles, Timer } from 'lucide-react';
import { api, onReportsChanged, type Report } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { GH_GOLD, GH_GREEN, GH_RED, pickAlerts, summariseReports, timeAgo } from '@/lib/format';
import { FlagBar, PriorityBadge, SectionTitle, StatCard } from '@/components/ui';

const SAMPLE_ALERTS = [
  {
    title: 'Burst Water Pipe',
    location: 'Spintex Road, Accra',
    time: 'Reported: 1 hr ago',
    priority: 'EMERGENCY',
  },
  {
    title: 'Open Manhole',
    location: 'Liberation Road, Airport City',
    time: 'Reported: 2 hrs ago',
    priority: 'HIGH',
  },
  {
    title: 'Streetlight Out',
    location: 'Tema Motorway, Accra',
    time: 'Reported: 4 hrs ago',
    priority: 'MEDIUM',
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);

  const loadReports = useCallback(() => {
    if (!isAuthenticated) {
      setReports([]);
      return;
    }
    let cancelled = false;
    api.reports
      .mine()
      .then((data) => {
        if (!cancelled) setReports(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setReports([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Keep the dashboard counters in step with a freshly filed report.
  useEffect(() => {
    if (!isAuthenticated) return;
    return onReportsChanged(() => loadReports());
  }, [isAuthenticated, loadReports]);

  const stats = summariseReports(reports);
  const alerts = pickAlerts(reports, 3);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <FlagBar />
        <div className="px-5 pt-3.5 pb-4 md:px-8">
          <h1 className="text-[26px] font-black tracking-tight text-gh-black">FixGH 🇬🇭</h1>
          <p className="mt-1 text-sm text-slate-500">
            Report. Track. Fix Ghana&apos;s Infrastructure.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-2 px-4 pb-2 pt-4 md:px-8">
        <StatCard
          value={isAuthenticated ? stats.reported : 148}
          title="Issues Reported"
          description="This Month"
          color={GH_GREEN}
          icon={<AlertCircle size={22} color={GH_GREEN} />}
        />
        <StatCard
          value={isAuthenticated ? stats.resolved : 112}
          title="Issues Resolved"
          description="This Month"
          color={GH_RED}
          icon={<CheckCircle size={22} color={GH_RED} />}
        />
        <StatCard
          value={isAuthenticated ? stats.inProgress : 36}
          title="In Progress"
          description="Active"
          color={GH_GOLD}
          icon={<Timer size={22} color={GH_GOLD} />}
        />
      </div>

      {/* Map placeholder */}
      <section className="px-4 pt-2 md:px-8">
        <SectionTitle icon={<span>📍</span>}>Nearby Issues</SectionTitle>
        <div className="flex h-40 flex-col items-center justify-center rounded-[14px] border border-dashed border-green-200 bg-green-50">
          <MapIcon size={40} color="#94a3b8" />
          <p className="mt-2 text-[13px] text-slate-400">Map view coming soon</p>
        </div>
      </section>

      {/* Recent alerts */}
      <section className="px-4 pt-6 md:px-8">
        <SectionTitle icon={<span>⚡</span>}>Recent High-Priority Alerts</SectionTitle>

        {alerts.length > 0 ? (
          <div className="space-y-2.5">
            {alerts.map((report) => (
              <Link
                key={report.id}
                to={`/dashboard/report/${report.id}`}
                className="block rounded-[14px] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition hover:shadow-[0_4px_14px_rgba(0,0,0,0.09)]"
              >
                <PriorityBadge priority={report.aiPriorityScore} />
                <h3 className="text-[16px] font-bold text-gh-black">{report.title}</h3>
                <p className="mt-1 text-[13px] text-slate-500">
                  📍 {report.locationText || 'Location pending'}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Reported: {timeAgo(report.createdAt)}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {SAMPLE_ALERTS.map((alert) => (
              <div
                key={alert.title}
                className="rounded-[14px] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
              >
                <PriorityBadge priority={alert.priority} />
                <h3 className="text-[16px] font-bold text-gh-black">{alert.title}</h3>
                <p className="mt-1 text-[13px] text-slate-500">📍 {alert.location}</p>
                <p className="mt-0.5 text-xs text-slate-400">{alert.time}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Call to action */}
      <section className="px-4 pt-6 md:px-8">
        <div className="flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-4">
          <Sparkles size={20} color={GH_GOLD} className="shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-gh-black">Spot a problem?</p>
            <p className="text-xs text-slate-600">
              Our AI routes every report to the right authority automatically.
            </p>
          </div>
          <Link
            to="/report"
            className="shrink-0 rounded-xl bg-secondary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Report
          </Link>
        </div>
      </section>
    </div>
  );
}
