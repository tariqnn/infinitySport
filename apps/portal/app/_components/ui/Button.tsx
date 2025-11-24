import { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className,
  isLoading,
  leadingIcon,
  trailingIcon,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        // Variants
        variant === 'primary' &&
          'bg-brand-gradient text-white shadow-brand-glow hover:scale-105 hover:shadow-lg',
        variant === 'secondary' &&
          'border-2 border-brand-primaryBlue text-brand-primaryBlue hover:bg-brand-primaryBlue/5',
        variant === 'ghost' &&
          'text-ui-textPrimary hover:bg-ui-softBg',
        variant === 'destructive' &&
          'bg-ui-danger text-white hover:bg-ui-danger/90',
        // Sizes
        size === 'sm' && 'rounded-portal-button px-3 py-1.5 text-sm',
        size === 'md' && 'rounded-portal-button px-4 py-2 text-sm',
        size === 'lg' && 'rounded-portal-button px-6 py-3 text-base',
        className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        <>
          {leadingIcon}
          {children}
          {trailingIcon}
        </>
      )}
    </button>
  );
}

