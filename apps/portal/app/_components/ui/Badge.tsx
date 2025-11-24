import { ReactNode } from 'react';
import clsx from 'clsx';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

export function Badge({
  variant = 'neutral',
  children,
  className,
}: {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        variant === 'success' && 'bg-green-50 text-green-700',
        variant === 'warning' && 'bg-orange-50 text-orange-700',
        variant === 'danger' && 'bg-red-50 text-red-700',
        variant === 'neutral' && 'bg-ui-softBg text-ui-textMuted',
        variant === 'info' && 'bg-blue-50 text-brand-primaryBlue',
        className
      )}
    >
      {children}
    </span>
  );
}

