import { ReactNode } from 'react';
import clsx from 'clsx';

type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: 'up' | 'down' | 'neutral';
  description?: string;
  icon?: ReactNode;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-xs uppercase tracking-[0.35em] text-[#5c6475]">{eyebrow}</p>
        ) : null}
        <h2 className="text-2xl font-black text-[#0f1a2b]">{title}</h2>
        {description ? <p className="text-sm text-[#5c6475]">{description}</p> : null}
      </div>
      {actions ? <div className="flex gap-3">{actions}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, delta, deltaTone = 'neutral', description, icon }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-[#e3e8f2] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(15,23,42,0.16)]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#5c6475]">{label}</p>
        {icon ? <div className="text-[#1426ff]">{icon}</div> : null}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <p className="text-3xl font-black text-[#0f1a2b]">{value}</p>
        {delta ? (
          <span
            className={clsx(
              'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
              deltaTone === 'up' && 'bg-[#e8fff0] text-[#1c934e]',
              deltaTone === 'down' && 'bg-[#ffe8e8] text-[#d14343]',
              deltaTone === 'neutral' && 'bg-[#f0f5ff] text-[#1426ff]'
            )}
          >
            {delta}
          </span>
        ) : null}
      </div>
      {description ? <p className="mt-2 text-xs text-[#5c6475]">{description}</p> : null}
    </div>
  );
}

export function QuickAction({
  icon,
  title,
  description
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button className="flex items-start gap-3 rounded-2xl border border-[#e3e8f2] bg-[#f8fafc] px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-[#1426ff] hover:bg-white">
      <div className="rounded-2xl bg-[#1426ff10] p-2 text-[#1426ff]">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-[#0f1a2b]">{title}</p>
        <p className="text-xs text-[#5c6475]">{description}</p>
      </div>
    </button>
  );
}

export function DataCard({
  title,
  subtitle,
  children,
  actions
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-[#e3e8f2] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[#5c6475]">{subtitle}</p>
          <h3 className="text-xl font-black text-[#0f1a2b]">{title}</h3>
        </div>
        {actions}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

export function StatusBadge({ tone = 'default', children }: { tone?: 'default' | 'green' | 'blue' | 'amber'; children: ReactNode }) {
  return (
    <span
      className={clsx(
        'pill',
        tone === 'default' && 'bg-[#f0f5ff] text-[#1426ff]',
        tone === 'green' && 'bg-[#e8fff0] text-[#1c934e]',
        tone === 'blue' && 'bg-[#f0f5ff] text-[#1426ff]',
        tone === 'amber' && 'bg-[#fff8e6] text-[#b97700]'
      )}
    >
      {children}
    </span>
  );
}

