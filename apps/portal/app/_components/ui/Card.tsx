import { ReactNode } from 'react';
import clsx from 'clsx';

export function Card({
  children,
  className,
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={clsx(
        'rounded-portal-card border border-ui-border bg-ui-cardBg shadow-portal-card',
        hover && 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-portal-card-hover',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('border-b border-ui-border px-6 py-4', className)}>
      {children}
    </div>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={clsx('p-6', className)}>{children}</div>;
}

export function CardFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('border-t border-ui-border px-6 py-4', className)}>
      {children}
    </div>
  );
}

