import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Dynamically resolves the backend API URL across:
 * - Web browsers (http://localhost:3000)
 * - Physical mobile devices via Expo Go (auto-detects computer's LAN IP e.g. http://10.228.91.230:3000)
 * - Android Emulators (http://10.0.2.2:3000)
 * - Custom EXPO_PUBLIC_API_URL overrides
 */
export function getBaseUrl(): string {
  // 1. Web browser: localhost connects directly to the backend
  if (Platform.OS === 'web') {
    if (process.env.EXPO_PUBLIC_API_URL && process.env.EXPO_PUBLIC_API_URL.startsWith('https://')) {
      return process.env.EXPO_PUBLIC_API_URL;
    }
    if (typeof window !== 'undefined' && window.location?.hostname) {
      return `http://${window.location.hostname}:3000`;
    }
    return 'http://localhost:3000';
  }

  // 2. Physical mobile phone with Expo Go: dynamically extract PC's current IP from Metro connection
  const hostUri = Constants.expoConfig?.hostUri ?? (Constants as any).linkingUri;
  if (typeof hostUri === 'string') {
    const cleaned = hostUri.replace(/^[a-z]+:\/\//i, '');
    const ip = cleaned.split(':')[0]?.split('/')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:3000`;
    }
  }

  // 3. Explicit override via .env if configured
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 4. Android Emulator loopback alias to host machine
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }

  // 5. Default fallback
  return Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3000';
}

let authToken: string | null = null;

export function setToken(token: string) {
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

function uploadWithXHR<T>(
  url: string,
  formData: FormData,
  token: string | null,
  method: string = 'POST'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.timeout = 60000;

    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.onload = () => {
      let data: any;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = { error: xhr.responseText || `Server returned status ${xhr.status}` };
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        reject(new Error(data.message || data.error || `Request failed (${xhr.status})`));
      }
    };

    xhr.onerror = (e: any) => {
      console.error(`[Upload Network Error] Failed to reach ${url}:`, e);
      reject(
        new Error(`Cannot connect to FixGH backend server at ${url}. Please ensure your backend is running.`)
      );
    };

    xhr.ontimeout = () => {
      reject(new Error('Upload timed out. Please check your network connection.'));
    };

    xhr.send(formData);
  });
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, isFormData = false } = options;
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;

  // Use XMLHttpRequest for FormData uploads — Expo's fetch throws "Unsupported FormDataPart implementation"
  // on React Native file objects with { uri, name, type }, whereas XMLHttpRequest handles them natively.
  if (isFormData && body) {
    return uploadWithXHR<T>(url, body as FormData, authToken, method);
  }

  const headers: Record<string, string> = {};

  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  if (body) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (netErr: any) {
    // Retry once after a brief pause to handle transient socket resets / nodemon restarts
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      console.error(`[API Network Error] Failed to reach ${url}:`, netErr.message);
      throw new Error(
        `Cannot connect to FixGH backend server at ${baseUrl}. Please ensure your backend is running.`
      );
    }
  }

  let data: any;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    data = { error: text || `Server returned status ${res.status}` };
  }

  if (!res.ok) {
    throw new Error(data.message || data.error || `Request failed (${res.status})`);
  }
  return data;
}

// Auth & API Endpoints
export const api = {
  auth: {
    register: (name: string, email: string, password: string) =>
      request<{ token: string; user: { id: string; name: string; email: string; role: string } }>('/api/auth/register', {
        method: 'POST',
        body: { name, email, password },
      }),
    login: (email: string, password: string) =>
      request<{ token: string; user: { id: string; name: string; email: string; role: string } }>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      }),
  },
  reports: {
    submit: (formData: FormData) =>
      request<SubmitReportResponse>('/api/reports', {
        method: 'POST',
        body: formData,
        isFormData: true,
      }),
    mine: () => request<Report[]>('/api/reports/me'),
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

export type Report = {
  id: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  /** True when the citizen attached a photo but storage rejected it. */
  imageUploadFailed?: boolean;
  category?: string;
  aiPriorityScore?: string;
  status: 'PENDING' | 'VERIFIED' | 'IN_PROGRESS' | 'COMPLETED';
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
