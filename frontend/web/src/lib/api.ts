/**
 * FixGH Web — API client.
 *
 * Mirrors frontend/mobile/src/lib/api.ts so both clients talk to the same
 * backend contract (Prisma-backed Express API on :3000).
 */

const FALLBACK_PRODUCTION_API = 'https://fixgh-1.onrender.com';

/**
 * Resolves the backend API URL:
 * 1. `VITE_API_URL` — explicit override (build-time env var).
 * 2. Local dev — same hostname, port 3000 (works for `localhost` and LAN IPs).
 * 3. Deployed — the public Render backend.
 */
export function getBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:3000`;
    }
    return FALLBACK_PRODUCTION_API;
  }

  return 'http://localhost:3000';
}

let authToken: string | null = null;

export function setToken(token: string | null) {
  authToken = token || null;
}

export function getToken() {
  return authToken;
}

type RequestOptions = {
  method?: string;
  body?: object | FormData;
  isFormData?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, isFormData = false } = options;
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {};
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  let res: Response;
  try {
    if (isFormData && body) {
      // Never set Content-Type for FormData — the browser must add the boundary.
      res = await fetch(url, { method, headers, body: body as FormData });
    } else {
      if (body) headers['Content-Type'] = 'application/json';
      res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    }
  } catch (netErr) {
    console.error(`[API Network Error] Failed to reach ${url}:`, netErr);
    throw new Error(
      `Cannot connect to the FixGH backend at ${baseUrl}. Please check that the server is running.`
    );
  }

  const contentType = res.headers.get('content-type') || '';
  let data: any;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    data = { error: text || `Server returned status ${res.status}` };
  }

  if (!res.ok) {
    throw new Error(data.message || data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  auth: {
    register: (name: string, email: string, password: string) =>
      request<{ token: string; user: AuthUser }>('/api/auth/register', {
        method: 'POST',
        body: { name, email, password },
      }),
    login: (email: string, password: string) =>
      request<{ token: string; user: AuthUser }>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      }),
  },
  reports: {
    submit: async (formData: FormData) => {
      const result = await request<SubmitReportResponse>('/api/reports', {
        method: 'POST',
        body: formData,
        isFormData: true,
      });
      // Tell any mounted screen (Profile, Home) that the history changed.
      notifyReportsChanged();
      return result;
    },
    mine: () => request<Report[]>('/api/reports/me'),
    byId: (id: string) => request<Report>(`/api/reports/${id}`),
  },
  news: {
    list: (source?: string, refresh?: boolean) => {
      const params = new URLSearchParams();
      if (source && source !== 'all') params.append('source', source);
      if (refresh) params.append('refresh', 'true');
      const qs = params.toString() ? `?${params.toString()}` : '';
      return request<NewsItem[]>(`/api/news${qs}`);
    },
    sources: () => request<NewsSource[]>('/api/news/sources'),
  },
};

/**
 * Minimal pub/sub so a screen showing report history can refresh itself as
 * soon as a report is filed, without relying on a remount.
 */
const reportListeners = new Set<() => void>();

export function onReportsChanged(listener: () => void): () => void {
  reportListeners.add(listener);
  return () => {
    reportListeners.delete(listener);
  };
}

export function notifyReportsChanged(): void {
  reportListeners.forEach((listener) => listener());
}

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type ReportStatus = 'PENDING' | 'VERIFIED' | 'IN_PROGRESS' | 'COMPLETED';

export type Report = {
  id: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  /** True when the citizen attached a photo but storage rejected it. */
  imageUploadFailed?: boolean;
  category?: string;
  aiPriorityScore?: string;
  status: ReportStatus;
  latitude?: number;
  longitude?: number;
  locationText?: string;
  confidence?: number;
  filterStatus?: 'APPROVED' | 'SPAM' | 'REJECTED';
  assignedAuthorityName?: string;
  assignedAuthorityEmail?: string;
  /** Whether the assigned authority was actually alerted about this report. */
  authorityNotified?: boolean;
  createdAt: string;
};

export type SubmitReportResponse = {
  report: Report;
  imageUploadFailed: boolean;
  authorityNotified: boolean;
  authorityEmailError?: string | null;
};

export type NewsItem = {
  id: string;
  title: string;
  description?: string;
  link: string;
  imageUrl?: string | null;
  source: string;
  sourceKey: string;
  sourceColor: string;
  publishedAt: string;
};

export type NewsSource = {
  key: string;
  name: string;
  color: string;
};
