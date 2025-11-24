import { ReactNode } from 'react';
import clsx from 'clsx';

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  align?: 'start' | 'between';
};

export function PageHero({ eyebrow, title, description, actions, align = 'between' }: PageHeroProps) {
  return (
    <div className="rounded-3xl border border-[rgba(15,23,42,0.06)] bg-white px-6 py-7 shadow-panel">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className={clsx('space-y-3', align === 'start' && 'md:flex-1')}>
          <p className="text-xs uppercase tracking-[0.25em] text-brand-blue">{eyebrow}</p>
          <h2 className="font-display text-3xl font-bold text-[var(--text-primary)]">{title}</h2>
          <p className="text-sm text-[var(--text-muted)]">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}

