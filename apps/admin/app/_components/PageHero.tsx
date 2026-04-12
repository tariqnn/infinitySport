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
    <div className="glass-card px-7 py-7 sm:px-8">
      <div className={clsx('flex flex-col gap-5 sm:flex-row sm:items-end', align === 'between' ? 'sm:justify-between' : 'sm:justify-start')}>
        <div className={clsx('space-y-3', align === 'start' && 'sm:flex-1')}>
          <p className="inline-flex items-center rounded-full bg-[var(--primary-light)] px-4 py-1.5 text-sm font-bold uppercase tracking-[0.1em] text-[var(--primary)]">
            {eyebrow}
          </p>
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">{title}</h2>
          <p className="max-w-2xl text-base leading-relaxed text-[var(--text-muted)]">{description}</p>
        </div>
        {actions ? <div className="flex flex-shrink-0 flex-wrap gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
