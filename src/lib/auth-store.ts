import { useState, useEffect } from 'react';
import { setToken } from './api';

type User = { id: string; name: string; email: string; role: string };

type AuthStore = {
  user: User | null;
  token: string | null;
  signIn: (token: string, user: User) => void;
  signOut: () => void;
  isAuthenticated: boolean;
};

let _user: User | null = null;
let _token: string | null = null;
let _listeners: (() => void)[] = [];

function notify() {
  _listeners.forEach(fn => fn());
}

export const authStore = {
  signIn(token: string, user: User) {
    _token = token;
    _user = user;
    setToken(token);
    notify();
  },
  signOut() {
    _token = null;
    _user = null;
    setToken('');
    notify();
  },
  getUser: () => _user,
  getToken: () => _token,
  isAuthenticated: () => _token !== null,
  subscribe: (fn: () => void) => {
    _listeners.push(fn);
    return () => {
      _listeners = _listeners.filter(l => l !== fn);
    };
  },
};

export function useAuth(): AuthStore {
  const [, rerender] = useState(0);

  useEffect(() => {
    const unsub = authStore.subscribe(() => rerender(n => n + 1));
    return unsub;
  }, []);

  return {
    user: authStore.getUser(),
    token: authStore.getToken(),
    signIn: authStore.signIn.bind(authStore),
    signOut: authStore.signOut.bind(authStore),
    isAuthenticated: authStore.isAuthenticated(),
  };
}
