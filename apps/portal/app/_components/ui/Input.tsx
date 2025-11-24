import { InputHTMLAttributes, LabelHTMLAttributes } from 'react';
import clsx from 'clsx';

export function Input({
  label,
  error,
  hint,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
}) {
  const id = props.id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-ui-textPrimary mb-1.5"
        >
          {label}
          {props.required && <span className="text-ui-danger ml-1">*</span>}
        </label>
      )}
      <input
        id={id}
        className={clsx(
          'w-full rounded-lg border px-3 py-2 text-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-brand-primaryBlue/20 focus:border-brand-primaryBlue',
          error
            ? 'border-ui-danger bg-red-50'
            : 'border-ui-border bg-white text-ui-textPrimary',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-sm text-ui-danger">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-sm text-ui-textMuted">{hint}</p>}
    </div>
  );
}

export function Textarea({
  label,
  error,
  hint,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  hint?: string;
}) {
  const id = props.id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-ui-textPrimary mb-1.5"
        >
          {label}
          {props.required && <span className="text-ui-danger ml-1">*</span>}
        </label>
      )}
      <textarea
        id={id}
        className={clsx(
          'w-full rounded-lg border px-3 py-2 text-sm transition-colors resize-none',
          'focus:outline-none focus:ring-2 focus:ring-brand-primaryBlue/20 focus:border-brand-primaryBlue',
          error
            ? 'border-ui-danger bg-red-50'
            : 'border-ui-border bg-white text-ui-textPrimary',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-sm text-ui-danger">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-sm text-ui-textMuted">{hint}</p>}
    </div>
  );
}

export function Select({
  label,
  error,
  hint,
  className,
  options,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  hint?: string;
  options?: { value: string; label: string }[];
  children?: React.ReactNode;
}) {
  const id = props.id || `select-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-ui-textPrimary mb-1.5"
        >
          {label}
          {props.required && <span className="text-ui-danger ml-1">*</span>}
        </label>
      )}
      <select
        id={id}
        className={clsx(
          'w-full rounded-lg border px-3 py-2 text-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-brand-primaryBlue/20 focus:border-brand-primaryBlue',
          error
            ? 'border-ui-danger bg-red-50'
            : 'border-ui-border bg-white text-ui-textPrimary',
          className
        )}
        {...props}
      >
        {options
          ? options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          : children}
      </select>
      {error && <p className="mt-1.5 text-sm text-ui-danger">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-sm text-ui-textMuted">{hint}</p>}
    </div>
  );
}

