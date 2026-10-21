import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { authStore } from '@/lib/auth-store';

type Tab = 'login' | 'register';

export default function Auth() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }
    if (tab === 'register' && !name.trim()) {
      setError('Name is required.');
      return;
    }

    setLoading(true);
    try {
      const result =
        tab === 'login'
          ? await api.auth.login(email.trim(), password)
          : await api.auth.register(name.trim(), email.trim(), password);

      authStore.signIn(result.token, result.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f5] px-6 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-9 text-center">
          <h1 className="text-[40px] font-bold tracking-[1px] text-secondary">FixGH</h1>
          <p className="mt-2 text-center text-sm text-slate-500">
            Report infrastructure issues in your community
          </p>
        </div>

        {/* Tab switcher */}
        <div className="mb-7 flex rounded-xl bg-slate-200 p-1">
          {(['login', 'register'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setError(null);
              }}
              className={`flex-1 rounded-[10px] py-2.5 text-center text-[15px] font-semibold transition ${
                tab === key ? 'bg-white text-secondary shadow-sm' : 'text-slate-500'
              }`}
            >
              {key === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-sm">
          {tab === 'register' && (
            <>
              <label className="mt-3 block text-sm font-semibold text-slate-700">Full Name</label>
              <input
                className="mt-1.5 w-full rounded-[10px] border border-slate-200 px-4 py-3 text-base text-secondary outline-none transition focus:border-gh-green"
                placeholder="e.g. Amara Kweku"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </>
          )}

          <label className="mt-3 block text-sm font-semibold text-slate-700">Email Address</label>
          <input
            className="mt-1.5 w-full rounded-[10px] border border-slate-200 px-4 py-3 text-base text-secondary outline-none transition focus:border-gh-green"
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label className="mt-4 block text-sm font-semibold text-slate-700">Password</label>
          <input
            className="mt-1.5 w-full rounded-[10px] border border-slate-200 px-4 py-3 text-base text-secondary outline-none transition focus:border-gh-green"
            placeholder="••••••••"
            type="password"
            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error ? <p className="mt-3 text-center text-sm text-gh-red">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-secondary py-4 text-[17px] font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? 'Please wait…' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link to="/" className="font-semibold text-gh-green hover:underline">
            ← Back to FixGH
          </Link>
        </p>
      </div>
    </div>
  );
}
