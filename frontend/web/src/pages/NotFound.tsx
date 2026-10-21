import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-slate-50 px-8 text-center">
      <p className="text-[64px] font-black leading-none text-gh-green">404</p>
      <p className="mt-3 text-lg text-slate-600">This page could not be found.</p>
      <Link
        to="/"
        className="mt-6 rounded-xl bg-secondary px-8 py-3.5 text-base font-bold text-white transition hover:bg-slate-800"
      >
        Go Home
      </Link>
    </div>
  );
}
