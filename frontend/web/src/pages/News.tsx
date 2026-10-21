import { useCallback, useEffect, useState } from 'react';
import { FileText, ExternalLink, Newspaper, RefreshCw } from 'lucide-react';
import { api, type NewsItem, type NewsSource } from '@/lib/api';
import { GH_GREEN, isValidImageUrl, timeAgo } from '@/lib/format';
import { EmptyState, ErrorState, LoadingState, SourceBadge } from '@/components/ui';

const FALLBACK_SOURCES: NewsSource[] = [
  { key: 'myjoyonline', name: 'MyJoyOnline', color: '#dc2626' },
  { key: 'citinewsroom', name: 'Citi Newsroom', color: '#0284c7' },
  { key: 'ghanaiantimes', name: 'Ghanaian Times', color: '#16a34a' },
  { key: 'graphiconline', name: 'Graphic Online', color: '#ea580c' },
  { key: 'modernghana', name: 'Modern Ghana', color: '#d97706' },
  { key: 'ghanaweb', name: 'GhanaWeb', color: '#2563eb' },
  { key: 'peacefm', name: 'Peace FM', color: '#9333ea' },
  { key: 'adomonline', name: 'Adom Online', color: '#e11d48' },
  { key: 'accramail', name: 'Accra Mail', color: '#0d9488' },
];

export default function News() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch the source list once.
  useEffect(() => {
    let mounted = true;
    api.news
      .sources()
      .then((srcs) => {
        if (mounted && Array.isArray(srcs) && srcs.length > 0) setSources(srcs);
      })
      .catch(() => {
        if (mounted) setSources(FALLBACK_SOURCES);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const loadArticles = useCallback(
    async (sourceKey = selectedSource, isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      setError(null);
      try {
        const items = await api.news.list(sourceKey === 'all' ? undefined : sourceKey, isRefresh);
        setNews(Array.isArray(items) ? items : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to connect to live news stream.');
        setNews([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedSource]
  );

  useEffect(() => {
    loadArticles(selectedSource, false);
  }, [selectedSource, loadArticles]);

  const onRefresh = () => {
    setRefreshing(true);
    loadArticles(selectedSource, true);
  };

  const chips = sources.length > 0 ? sources : FALLBACK_SOURCES;

  return (
    <div className="animate-fade-in bg-slate-50">
      {/* Header */}
      <div className="border-b-[3px] border-gh-red bg-white pt-2">
        <div className="flex items-center justify-between px-[18px] pb-2.5 pt-3">
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-gh-black">Ghana News Desk</h1>
            <p className="mt-0.5 text-[13px] text-slate-500">Live updates &amp; infrastructure coverage</p>
          </div>

          <div className="ml-2 flex items-center gap-2">
            <span className="flex items-center rounded-xl border border-gh-red bg-red-50 px-2 py-1">
              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-gh-red" />
              <span className="text-[11px] font-extrabold tracking-[0.5px] text-gh-red">LIVE</span>
            </span>
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing || loading}
              aria-label="Refresh news"
              className="rounded-lg border border-gh-green bg-green-50 p-1.5 transition hover:bg-green-100 disabled:opacity-60"
            >
              <RefreshCw
                size={18}
                color="#0f172a"
                className={refreshing ? 'animate-spin' : undefined}
              />
            </button>
          </div>
        </div>

        {/* Source filter chips */}
        <div className="scrollbar-hide flex gap-2 overflow-x-auto px-3.5 pb-3 pt-1">
          <button
            type="button"
            onClick={() => setSelectedSource('all')}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
              selectedSource === 'all'
                ? 'border-gh-green bg-gh-green text-white'
                : 'border-slate-200 bg-slate-100 text-slate-600 hover:border-slate-300'
            }`}
          >
            All Outlets
          </button>

          {chips.map((s) => {
            const isSelected = selectedSource === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSelectedSource(s.key)}
                style={
                  isSelected
                    ? { backgroundColor: s.color, borderColor: s.color }
                    : undefined
                }
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                  isSelected
                    ? 'text-white'
                    : 'border-slate-200 bg-slate-100 text-slate-600 hover:border-slate-300'
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body */}
      {loading && !refreshing ? (
        <LoadingState label="Fetching live Ghana feeds..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadArticles(selectedSource, true)} />
      ) : news.length === 0 ? (
        <EmptyState
          title="No news articles found for this source."
          actionLabel="View All Outlets"
          onAction={() => setSelectedSource('all')}
          icon={<FileText size={44} color="#94a3b8" />}
        />
      ) : (
        <div className="space-y-4 px-4 py-4 md:px-6">
          {news.map((item) => {
            const hasValidImage = isValidImageUrl(item.imageUrl);
            const sourceColor = typeof item.sourceColor === 'string' ? item.sourceColor : '#0284c7';

            return (
              <a
                key={item.id}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_3px_8px_rgba(0,107,63,0.08)] transition hover:shadow-[0_6px_16px_rgba(0,107,63,0.12)]"
              >
                {hasValidImage ? (
                  <img
                    src={item.imageUrl as string}
                    alt=""
                    loading="lazy"
                    className="h-44 w-full bg-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-44 w-full items-center justify-center bg-green-50">
                    <Newspaper size={40} color="#94a3b8" />
                  </div>
                )}

                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <SourceBadge name={item.source} color={sourceColor} />
                    <span className="text-xs font-medium text-slate-400">
                      {timeAgo(item.publishedAt)}
                    </span>
                  </div>

                  <h2 className="mb-1.5 text-base font-bold leading-snug text-gh-black">
                    {item.title}
                  </h2>

                  {item.description ? (
                    <p className="mb-3 line-clamp-2 text-[13px] leading-relaxed text-slate-600">
                      {item.description}
                    </p>
                  ) : null}

                  <div className="mt-1 flex items-center border-t border-green-50 pt-2">
                    <span className="mr-1 text-[13px] font-bold" style={{ color: GH_GREEN }}>
                      Read full story
                    </span>
                    <ExternalLink size={14} color={GH_GREEN} />
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
