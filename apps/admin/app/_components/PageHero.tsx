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
    <div className="glass-card px-6 py-6 sm:px-7">
      <div className={clsx('flex flex-col gap-5 sm:flex-row sm:items-end', align === 'between' ? 'sm:justify-between' : 'sm:justify-start')}>
        <div className={clsx('space-y-3', align === 'start' && 'sm:flex-1')}>
          <p className="inline-flex items-center rounded-full bg-[var(--primary-light)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
            {eyebrow}
          </p>
          <h2 className="font-display text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{title}</h2>
          <p className="max-w-2xl text-sm text-[var(--text-muted)]">{description}</p>
        </div>
        {actions ? <div className="flex flex-shrink-0 flex-wrap gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
