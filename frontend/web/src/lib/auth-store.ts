import { useSyncExternalStore } from 'react';
import { setToken, type AuthUser } from './api';

const STORAGE_KEY = 'fixgh.session';

type Session = { token: string; user: AuthUser } | null;

function readSession(): Session {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed?.token || !parsed?.user) return null;
    return parsed;
  } catch {
    return null;
  }
}

let _session: Session = readSession();
let _listeners: (() => void)[] = [];

if (_session) setToken(_session.token);

function notify() {
  _listeners.forEach((fn) => fn());
}

function persist() {
  if (typeof window === 'undefined') return;
  try {
    if (_session) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(_session));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Private-browsing quota errors must not break sign-in.
  }
}

export const authStore = {
  signIn(token: string, user: AuthUser) {
    _session = { token, user };
    setToken(token);
    persist();
    notify();
  },
  signOut() {
    _session = null;
    setToken(null);
    persist();
    notify();
  },
  getUser: () => _session?.user ?? null,
  getToken: () => _session?.token ?? null,
  isAuthenticated: () => _session !== null,
  subscribe: (fn: () => void) => {
    _listeners.push(fn);
    return () => {
      _listeners = _listeners.filter((l) => l !== fn);
    };
  },
};

/** React binding for the auth store — mirrors frontend/mobile/src/lib/auth-store.ts */
export function useAuth() {
  const session = useSyncExternalStore(
    (cb) => authStore.subscribe(cb),
    () => _session,
    () => null
  );

  return {
    user: session?.user ?? null,
    token: session?.token ?? null,
    isAuthenticated: session !== null,
    signIn: authStore.signIn.bind(authStore),
    signOut: authStore.signOut.bind(authStore),
  };
}
