import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Bell, Camera, MapPin, ShieldCheck } from 'lucide-react';
import { api, type Report } from '@/lib/api';
import { formatDate, GH_GOLD, GH_GREEN, GH_RED, isValidImageUrl } from '@/lib/format';
import { ErrorState, LoadingState, PriorityBadge, StatusBadge } from '@/components/ui';

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    api.reports
      .byId(id)
      .then((data) => setReport(data))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load this report.')
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="animate-fade-in bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-5 md:px-6 md:py-8">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gh-green hover:underline"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>

        {loading ? (
          <LoadingState label="Loading report…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !report ? (
          <ErrorState message="Report not found." />
        ) : (
          <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-4">
              <PriorityBadge priority={report.aiPriorityScore} />
              <StatusBadge status={report.status} />
              {report.authorityNotified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-bold text-gh-green">
                  <Bell size={11} />
                  Authority notified
                </span>
              ) : null}
            </div>

            <div className="px-5 py-5">
              <h1 className="text-xl font-black leading-snug text-gh-black">{report.title}</h1>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <MapPin size={14} color={GH_RED} />
                  {report.locationText || 'Location pending'}
                </span>
                <span>Reported {formatDate(report.createdAt)}</span>
                {report.category ? <span>{report.category}</span> : null}
              </div>

              {isValidImageUrl(report.imageUrl) ? (
                <img
                  src={report.imageUrl as string}
                  alt="Evidence for this report"
                  className="mt-4 w-full rounded-xl border border-slate-100 object-cover"
                />
              ) : report.imageUploadFailed ? (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-gh-red/30 bg-red-50 px-3 py-2.5">
                  <Camera size={16} color={GH_RED} />
                  <span className="text-sm text-gh-red">Photo could not be uploaded.</span>
                </div>
              ) : null}

              <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-slate-700">
                {report.description}
              </p>

              <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Assigned Authority
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-gh-black">
                    {report.assignedAuthorityName || 'Pending classification'}
                  </p>
                  {report.assignedAuthorityEmail ? (
                    <p className="text-xs text-slate-500">{report.assignedAuthorityEmail}</p>
                  ) : null}
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    AI Confidence
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-gh-black">
                    {report.confidence !== undefined && report.confidence !== null
                      ? `${Math.round(report.confidence * 100)}%`
                      : '—'}
                  </p>
                  <p className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <ShieldCheck size={12} color={GH_GREEN} />
                    Auto-categorised
                  </p>
                </div>
              </div>

              {report.latitude != null && report.longitude != null ? (
                <p className="mt-3 text-xs text-slate-400">
                  GPS: {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                </p>
              ) : null}

              <div className="mt-5 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3">
                <p className="text-[13px] text-slate-700">
                  <span className="font-bold" style={{ color: GH_GOLD }}>
                    ✨ AI categorisation:
                  </span>{' '}
                  {report.category || 'General'} • {report.aiPriorityScore || 'MEDIUM'} priority
                </p>
              </div>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
