import type { Report, ReportStatus } from './api';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Mirrors the mobile `timeAgo` helper — never throws on odd input. */
export function timeAgo(iso?: string | null): string {
  if (!iso || typeof iso !== 'string') return 'Recent';
  try {
    const timestamp = Date.parse(iso);
    if (isNaN(timestamp)) return 'Recent';

    const diffMs = Date.now() - timestamp;
    if (isNaN(diffMs) || diffMs < 0) return 'Just now';

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return 'Recent';
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()] || ''}`;
  } catch {
    return 'Recent';
  }
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/** Ghana flag palette — mirrors frontend/mobile/src/app/(tabs)/*.tsx */
export const GH_RED = '#CE1126';
export const GH_GOLD = '#FCD116';
export const GH_GREEN = '#006B3F';
export const GH_BLACK = '#1A1A1A';

export const STATUS_COLORS: Record<ReportStatus, string> = {
  PENDING: '#64748b',
  VERIFIED: GH_GOLD,
  IN_PROGRESS: GH_RED,
  COMPLETED: GH_GREEN,
};

export const STATUS_LABELS: Record<ReportStatus, string> = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  IN_PROGRESS: 'IN PROGRESS',
  COMPLETED: 'COMPLETED',
};

/** Maps the AI priority score to the flag colours used by the alert cards. */
export function priorityColor(priority?: string | null): string {
  switch ((priority || '').toUpperCase()) {
    case 'EMERGENCY':
    case 'CRITICAL':
      return GH_RED;
    case 'HIGH':
    case 'URGENT':
      return GH_GOLD;
    case 'MEDIUM':
      return GH_GREEN;
    default:
      return '#94a3b8';
  }
}

export function isValidImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return (
    (trimmed.startsWith('http://') || trimmed.startsWith('https://')) &&
    !trimmed.includes('<') &&
    !trimmed.includes('>')
  );
}

/** Counts a citizen's monthly activity for the home dashboard stat cards. */
export function summariseReports(reports: Report[]) {
  const now = new Date();
  const thisMonth = reports.filter((r) => {
    const d = new Date(r.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  return {
    reported: thisMonth.length,
    resolved: thisMonth.filter((r) => r.status === 'COMPLETED').length,
    inProgress: thisMonth.filter((r) => r.status === 'IN_PROGRESS' || r.status === 'VERIFIED')
      .length,
    total: reports.length,
  };
}

/** Highest-priority reports first — used for the "Recent High-Priority Alerts" list. */
export function pickAlerts(reports: Report[], limit = 3): Report[] {
  const rank: Record<string, number> = { EMERGENCY: 0, CRITICAL: 0, HIGH: 1, URGENT: 1, MEDIUM: 2 };
  return [...reports]
    .filter((r) => r.filterStatus !== 'SPAM')
    .sort((a, b) => {
      const diff = (rank[a.aiPriorityScore || ''] ?? 3) - (rank[b.aiPriorityScore || ''] ?? 3);
      if (diff !== 0) return diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, limit);
}
