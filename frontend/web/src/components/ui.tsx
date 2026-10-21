import type { ReactNode } from 'react';
import { AlertCircle, CloudOff, Inbox, Loader2 } from 'lucide-react';
import { GH_GOLD, GH_GREEN, GH_RED, STATUS_COLORS, STATUS_LABELS } from '@/lib/format';
import type { ReportStatus } from '@/lib/api';

/** The red / gold / green Ghana flag stripe used across the mobile screens. */
export function FlagBar({ className = '' }: { className?: string }) {
  return (
    <div className={`flex h-1.5 w-full ${className}`}>
      <div className="flex-1 bg-gh-red" />
      <div className="flex-1 bg-gh-gold" />
      <div className="flex-1 bg-gh-green" />
    </div>
  );
}

export function SectionTitle({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-[17px] font-extrabold text-gh-black">
      {icon}
      {children}
    </h2>
  );
}

export function StatCard({
  value,
  title,
  description,
  color,
  icon,
}: {
  value: number | string;
  title: string;
  description: string;
  color: string;
  icon: ReactNode;
}) {
  return (
    <div
      className="flex flex-1 flex-col items-center rounded-[14px] border border-slate-100 bg-white px-3 py-3.5 text-center shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
      style={{ borderTop: `3px solid ${color}` }}
    >
      {icon}
      <span className="mt-1.5 text-[26px] font-black leading-none" style={{ color }}>
        {value}
      </span>
      <span className="mt-1 text-[11px] font-bold text-gh-black">{title}</span>
      <span className="text-[11px] text-slate-400">{description}</span>
    </div>
  );
}

export function PriorityBadge({ priority }: { priority?: string | null }) {
  const label = (priority || 'MEDIUM').toUpperCase();
  const color =
    label === 'EMERGENCY' || label === 'CRITICAL'
      ? GH_RED
      : label === 'HIGH' || label === 'URGENT'
        ? GH_GOLD
        : label === 'MEDIUM'
          ? GH_GREEN
          : '#94a3b8';

  return (
    <span
      className="inline-block self-start rounded-full px-2.5 py-[3px] text-[10px] font-black tracking-[0.5px]"
      style={{ backgroundColor: color, color: label === 'HIGH' || label === 'URGENT' ? GH_RED : '#fff' }}
    >
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span
      className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold text-white"
      style={{ backgroundColor: STATUS_COLORS[status] ?? '#64748b' }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function SourceBadge({ name, color }: { name: string; color?: string | null }) {
  return (
    <span className="rounded-md bg-slate-200 px-2 py-[3px] text-[11px] font-extrabold uppercase tracking-[0.4px]">
      <span style={{ color: color || '#0284c7' }}>{name}</span>
    </span>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-8 py-16 text-center">
      <Loader2 className="animate-spin text-secondary" size={36} />
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-8 py-16 text-center">
      <CloudOff size={44} color="#dc2626" />
      <p className="text-sm text-gh-red">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-[10px] bg-gh-green px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-dark"
        >
          Tap to Retry
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  actionLabel,
  onAction,
  icon,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-8 py-16 text-center">
      {icon ?? <Inbox size={44} color="#94a3b8" />}
      <p className="text-[15px] text-slate-500">{title}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="rounded-[10px] bg-gh-green px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-dark"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-gh-red/30 bg-red-50 px-3 py-2.5">
      <AlertCircle size={16} color={GH_RED} className="shrink-0" />
      <p className="text-sm text-gh-red">{message}</p>
    </div>
  );
}
