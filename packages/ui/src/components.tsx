 'use client';
 
import { Fragment, ReactNode, useEffect, useId, isValidElement } from 'react';
import { Dialog, Disclosure, Transition } from '@headlessui/react';
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Slot } from '@radix-ui/react-slot';
import clsx from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  asChild?: boolean;
}

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    'relative overflow-hidden bg-gradient-to-r from-primary-500 via-primary-400 to-secondary-500 text-white shadow-[0_8px_32px_rgba(79,132,255,0.4)] hover:shadow-[0_12px_48px_rgba(79,132,255,0.6)] hover:from-primary-400 hover:via-primary-300 hover:to-secondary-400 focus-visible:outline-primary-500 transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300',
  secondary:
    'bg-secondary-600 text-white hover:bg-secondary-500 focus-visible:outline-secondary-500 shadow-[0_8px_32px_rgba(152,96,255,0.3)] hover:shadow-[0_12px_48px_rgba(152,96,255,0.5)] transition-all duration-300 hover:scale-105',
  ghost: 'bg-white/5 text-white hover:bg-white/10 focus-visible:outline-primary-400 border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105',
  outline:
    'border-2 border-white/20 bg-white/5 text-white hover:border-primary-300 hover:text-primary-50 hover:bg-primary-500/10 focus-visible:outline-primary-400 transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_32px_rgba(79,132,255,0.3)]'
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-12 px-6 text-base font-semibold',
  lg: 'h-14 px-10 text-lg font-bold tracking-wide'
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading,
  leadingIcon,
  trailingIcon,
  children,
  className,
  disabled,
  asChild,
  ...props
}: ButtonProps) {
  const isSingleElementChild = isValidElement(children);
  if (asChild && isSingleElementChild) {
    return (
      <Slot
        className={clsx(
          'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50',
          buttonStyles[variant],
          buttonSizes[size],
          className
        )}
        {...props}
      >
        {isLoading ? 'Loading…' : children}
      </Slot>
    );
  }
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50',
        buttonStyles[variant],
        buttonSizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {leadingIcon ? <span className="flex items-center">{leadingIcon}</span> : null}
      <span>{isLoading ? 'Loading…' : children}</span>
      {trailingIcon ? <span className="flex items-center">{trailingIcon}</span> : null}
    </button>
  );
}

export interface BadgeProps {
  color?: 'primary' | 'secondary' | 'accent' | 'muted';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ color = 'primary', children, className }: BadgeProps) {
  const colorClasses: Record<NonNullable<BadgeProps['color']>, string> = {
    primary: 'bg-primary-500/20 text-primary-100 ring-1 ring-primary-400/40',
    secondary: 'bg-secondary-500/20 text-secondary-100 ring-1 ring-secondary-400/40',
    accent: 'bg-accent/20 text-accent ring-1 ring-accent/40',
    muted: 'bg-white/10 text-slate-100 ring-1 ring-white/20'
  };
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur',
        colorClasses[color],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className,
  title,
  description,
  action
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const hasHeader = title || description || action;

  return (
    <div
      className={clsx(
        'group relative overflow-hidden rounded-[28px] border border-white/12 bg-gradient-to-br from-white/18 via-white/8 to-white/4 px-8 py-10 sm:px-10 sm:py-12 shadow-[0_24px_80px_rgba(3,12,24,0.55)] backdrop-blur-2xl transition duration-500 hover:-translate-y-1 hover:border-primary-300/60 hover:shadow-[0_32px_90px_rgba(2,18,40,0.6)]',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_140%_at_-10%_-20%,rgba(13,123,255,0.22),transparent_70%),radial-gradient(90%_130%_at_110%_120%,rgba(192,77,255,0.15),transparent_65%)] opacity-80 transition duration-700 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-[1px] rounded-[calc(28px-1px)] border border-white/15" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/10 via-transparent to-transparent transition duration-700 group-hover:from-primary-500/10" />
      <div className="relative flex flex-col gap-8">
        {hasHeader ? (
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              {title ? <h3 className="text-2xl font-semibold text-white">{title}</h3> : null}
              {description ? <p className="text-sm leading-relaxed text-slate-200/90">{description}</p> : null}
            </div>
            {action ? <div className="flex flex-shrink-0 items-center gap-3">{action}</div> : null}
          </div>
        ) : null}
        <div className="space-y-6 text-slate-200">{children}</div>
      </div>
    </div>
  );
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const reactId = useId();
  const inputId = id ?? `input-${reactId}`;
  return (
    <label className="grid gap-2 text-sm text-slate-100" htmlFor={inputId}>
      {label}
      <input
        id={inputId}
        className={clsx(
          'h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white placeholder:text-slate-400 shadow-card transition focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500/40',
          className,
          error && 'border-rose-400 text-rose-200 focus:border-rose-400 focus:ring-rose-400/30'
        )}
        {...props}
      />
      {hint && !error ? <span className="text-xs text-slate-300">{hint}</span> : null}
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </label>
  );
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className, id, rows = 4, ...props }: TextareaProps) {
  const reactId = useId();
  const textareaId = id ?? `textarea-${reactId}`;
  return (
    <label className="grid gap-2 text-sm text-slate-100" htmlFor={textareaId}>
      {label}
      <textarea
        id={textareaId}
        rows={rows}
        className={clsx(
          'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-400 shadow-card transition focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500/40',
          className,
          error && 'border-rose-400 text-rose-200 focus:border-rose-400 focus:ring-rose-400/30'
        )}
        {...props}
      />
      {hint && !error ? <span className="text-xs text-slate-300">{hint}</span> : null}
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </label>
  );
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { label: string; value: string }[];
}

export function Select({ label, error, hint, className, id, options, ...props }: SelectProps) {
  const reactId = useId();
  const selectId = id ?? `select-${reactId}`;
  return (
    <label className="grid gap-2 text-sm text-slate-100" htmlFor={selectId}>
      {label}
      <select
        id={selectId}
        className={clsx(
          'h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white shadow-card transition focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500/40',
          className,
          error && 'border-rose-400 text-rose-200 focus:border-rose-400 focus:ring-rose-400/30'
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && !error ? <span className="text-xs text-slate-300">{hint}</span> : null}
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </label>
  );
}

export interface ModalProps {
  title?: string;
  description?: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ title, description, open, onClose, children, footer }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[9999]" onClose={() => onClose()}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        </Transition.Child>

        <div className="fixed inset-0 z-[10000] overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel 
                className="relative z-[10001] w-full max-w-xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-2xl transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-6 mb-6">
                  <div>
                    {title ? <Dialog.Title className="text-xl font-semibold text-slate-900">{title}</Dialog.Title> : null}
                    {description ? <Dialog.Description className="mt-2 text-sm text-slate-600">{description}</Dialog.Description> : null}
                  </div>
                  <button 
                    aria-label="Close modal" 
                    className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" 
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                <div>{children}</div>
                {footer ? <div className="mt-6 flex justify-end gap-3">{footer}</div> : null}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  position?: 'left' | 'right';
}

export function Drawer({ open, onClose, title, description, children, position = 'right' }: DrawerProps) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <Transition show={open} as={Fragment}>
      <div className="fixed inset-0 z-50 flex">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <button aria-label="Close drawer" className="fixed inset-0 bg-slate-900/50" onClick={onClose} />
        </Transition.Child>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom={clsx(position === 'right' ? 'translate-x-full' : '-translate-x-full')}
          enterTo="translate-x-0"
          leave="ease-in duration-200"
          leaveFrom="translate-x-0"
          leaveTo={clsx(position === 'right' ? 'translate-x-full' : '-translate-x-full')}
        >
          <aside className={clsx('relative ml-auto flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl', position === 'left' && 'ml-0 mr-auto border-l-0 border-r')}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                {title ? <h2 className="text-lg font-semibold text-slate-900">{title}</h2> : null}
                {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
              </div>
              <button aria-label="Close drawer" className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" onClick={onClose}>
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </aside>
        </Transition.Child>
      </div>
    </Transition>
  );
}

export interface Tab {
  id: string;
  label: string;
  description?: string;
  content: React.ReactNode;
}

export function Tabs({ tabs, activeTab, onChange }: { tabs: Tab[]; activeTab: string; onChange: (tabId: string) => void }) {
  return (
    <div>
      <div className="flex flex-wrap gap-2 rounded-3xl border border-white/10 bg-white/5 p-2 backdrop-blur">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              className={clsx(
                'flex flex-col rounded-2xl px-5 py-3 text-left text-sm font-medium text-slate-200 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400',
                isActive ? 'bg-gradient-to-r from-primary-500/30 to-secondary-500/30 text-white shadow-card' : 'hover:bg-white/10'
              )}
              onClick={() => onChange(tab.id)}
            >
              <span className="text-sm font-semibold">{tab.label}</span>
              {tab.description ? <span className="text-xs text-slate-400">{tab.description}</span> : null}
            </button>
          );
        })}
      </div>
      <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-card backdrop-blur">
        {tabs.find((tab) => tab.id === activeTab)?.content}
      </div>
    </div>
  );
}

export interface Column<T> {
  id: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export function Table<T extends { id: string }>({
  rows,
  columns,
  emptyMessage,
  className
}: {
  rows: T[];
  columns: Column<T>[];
  emptyMessage?: string;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-white/18 via-white/8 to-white/4 p-6 sm:p-8 shadow-[0_18px_60px_rgba(2,10,24,0.55),inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-2xl',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-[2px] rounded-[calc(theme(borderRadius.3xl)-2px)] border border-white/12" />
      <div className="relative overflow-x-auto rounded-2xl border border-white/12 bg-white/6 px-6 py-5 sm:px-8 sm:py-6">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-white/8">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  className={clsx(
                    'px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.26em] text-slate-200/80',
                    column.align === 'right' && 'text-right',
                    column.align === 'center' && 'text-center'
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.length === 0 ? (
              <tr>
                <td className="px-6 py-8 text-center text-sm text-slate-400" colSpan={columns.length}>
                  {emptyMessage ?? 'No data to display'}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-white/10">
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={clsx(
                        'px-6 py-4 align-middle text-sm font-medium text-white/95',
                        column.align === 'right' && 'text-right',
                        column.align === 'center' && 'text-center'
                      )}
                    >
                      {column.render ? column.render(row) : (row as Record<string, React.ReactNode>)[column.id]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/30 bg-gradient-to-br from-white/10 via-white/4 to-white/0 p-12 text-center text-white shadow-[0_18px_60px_rgba(2,10,24,0.5)] backdrop-blur-2xl">
      {icon}
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {description ? <p className="mt-2 text-sm text-slate-200">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Pagination({
  page,
  pageCount,
  onPageChange
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  return (
    <div className="flex items-center justify-between gap-4 text-white">
      <Button variant="outline" disabled={page === 1} onClick={() => onPageChange(Math.max(1, page - 1))}>
        Previous
      </Button>
      <div className="flex items-center gap-2">
        {pages.map((p) => (
          <button
            key={p}
            className={clsx(
              'inline-flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold transition',
              p === page
                ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-card'
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            )}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
      </div>
      <Button variant="outline" disabled={page === pageCount} onClick={() => onPageChange(Math.min(pageCount, page + 1))}>
        Next
      </Button>
    </div>
  );
}

export interface NavLink {
  label: string;
  href: string;
}

export function Navbar({
  links,
  cta
}: {
  links: NavLink[];
  cta?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-br from-midnight-900/95 via-midnight-800/80 to-primary-900/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-8">
          <a className="flex items-center gap-3 text-lg font-semibold text-white" href="/">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 font-display text-lg text-white shadow-card">
              IS
            </span>
            Infinity Sports Academy
          </a>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-200 md:flex">
            {links.map((link) => (
              <a key={link.href} className="transition hover:text-white hover:underline underline-offset-8" href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="hidden md:block">{cta}</div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl pl-4 pr-6 py-12 sm:pl-6 lg:pl-8 lg:pr-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 lg:grid-cols-4">
          {/* Brand Section */}
          <div className="space-y-4 -ml-2 sm:ml-0">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-blue-primary to-brand-green-primary font-display text-xl font-bold text-white shadow-lg">
                IS
              </span>
              <span className="text-xl font-bold text-black">Infinity Sports</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-600">
              Empowering athletes and teams across the region with elite coaching, sport science, and world-class facilities.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-black">Quick Links</h3>
            <nav className="flex flex-col space-y-3">
              <a href="/sports" className="text-sm text-gray-600 transition-colors hover:text-brand-blue-primary">
                Programs
              </a>
              <a href="/offers" className="text-sm text-gray-600 transition-colors hover:text-brand-blue-primary">
                Memberships
              </a>
              <a href="/events" className="text-sm text-gray-600 transition-colors hover:text-brand-blue-primary">
                Events
              </a>
              <a href="/facilities" className="text-sm text-gray-600 transition-colors hover:text-brand-blue-primary">
                Facilities
              </a>
            </nav>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-black">Legal</h3>
            <nav className="flex flex-col space-y-3">
              <a href="/privacy" className="text-sm text-gray-600 transition-colors hover:text-brand-blue-primary">
                Privacy Policy
              </a>
              <a href="/terms" className="text-sm text-gray-600 transition-colors hover:text-brand-blue-primary">
                Terms of Service
              </a>
              <a href="/contact" className="text-sm text-gray-600 transition-colors hover:text-brand-blue-primary">
                Contact Us
              </a>
            </nav>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-black">Get in Touch</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p className="leading-relaxed">
                Infinity Campus<br />
                Airport Road, Amman, Jordan
              </p>
              <p>
                <a href="mailto:hello@infinitysports.jo" className="transition-colors hover:text-brand-blue-primary">
                  hello@infinitysports.jo
                </a>
              </p>
              <p>
                <a href="tel:+96265558899" className="transition-colors hover:text-brand-blue-primary">
                  +962 6 555 8899
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-gray-200 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Infinity Sports. All rights reserved.
            </p>
            <p className="text-sm text-gray-500">
              Created by{' '}
              <a
                href="https://www.creativnetworks.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-black transition-colors hover:text-brand-blue-primary"
              >
                Creative Networks
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function Hero({
  eyebrow,
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  media
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  media?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-midnight-900 via-midnight-800 to-primary-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_-10%_20%,rgba(79,132,255,0.4),transparent_65%),radial-gradient(60%_120%_at_110%_60%,rgba(106,61,255,0.3),transparent_70%)]" />
      <div className="mx-auto grid max-w-7xl gap-16 px-4 py-32 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-40">
        <div className="relative space-y-10">
          {eyebrow ? (
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.4em] text-primary-200 backdrop-blur-xl shadow-card">
              {eyebrow}
            </span>
          ) : null}
          <h1 className="font-display text-5xl font-bold leading-tight sm:text-6xl lg:text-7xl">{title}</h1>
          <p className="text-xl leading-relaxed text-slate-200 sm:text-2xl">{subtitle}</p>
          <div className="flex flex-wrap items-center gap-5">
            {primaryAction}
            {secondaryAction}
          </div>
        </div>
        {media ? (
          <div className="relative">
            <div className="absolute -inset-8 rounded-3xl bg-gradient-to-br from-primary-500/50 via-secondary-500/40 to-transparent blur-3xl" />
            <div className="relative overflow-hidden rounded-3xl border border-white/25 bg-gradient-to-br from-white/10 via-white/5 to-white/10 p-2 shadow-[0_20px_60px_rgba(4,17,39,0.6),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl">
              <div className="pointer-events-none absolute inset-[2px] rounded-[calc(theme(borderRadius.3xl)-2px)] border border-white/10" />
              <div className="relative overflow-hidden rounded-2xl">{media}</div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function Section({
  id,
  title,
  eyebrow,
  description,
  children,
  background = 'midnight',
}: {
  id?: string;
  title: string;
  eyebrow?: string;
  description?: string;
  children: React.ReactNode;
  background?: 'midnight' | 'light';
}) {
  const backgroundClasses = {
    midnight:
      'relative overflow-hidden bg-gradient-to-br from-midnight-900 via-midnight-800/90 to-primary-950 text-white',
    light: 'bg-gradient-to-br from-slate-50 via-white to-slate-50 text-slate-900'
  };

  return (
    <section id={id} className={clsx(backgroundClasses[background], 'py-28 sm:py-32')}>
      {background === 'midnight' ? (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(100%_100%_at_0%_0%,rgba(95,132,255,0.3),transparent_60%),radial-gradient(90%_120%_at_100%_100%,rgba(106,61,255,0.22),transparent_60%)]" />
      ) : null}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {eyebrow ? (
            <p
              className={clsx(
                'text-xs font-bold uppercase tracking-[0.4em]',
                background === 'midnight' ? 'text-primary-300' : 'text-primary-600'
              )}
            >
              {eyebrow}
            </p>
          ) : null}
          <h2
            className={clsx(
              'mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl',
              background === 'midnight' ? 'text-white' : 'text-slate-900'
            )}
          >
            {title}
          </h2>
          {description ? (
            <p
              className={clsx(
                'mt-6 text-lg leading-relaxed sm:text-xl',
                background === 'midnight' ? 'text-slate-200' : 'text-slate-600'
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
        <div className="mt-20">{children}</div>
      </div>
    </section>
  );
}

export interface TimelineItem {
  id: string;
  title: string;
  time: string;
  description: string;
  cta?: React.ReactNode;
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-0 h-full w-px bg-gradient-to-b from-primary-200 via-primary-400 to-primary-600 sm:left-1/2" />
      <div className="space-y-12">
        {items.map((item, index) => {
          const isLeft = index % 2 === 0;
          return (
            <div key={item.id} className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className={clsx('absolute left-4 top-0 -translate-y-1/2 rounded-full border-4 border-white bg-primary-600 p-2 shadow-lg sm:left-1/2 sm:-translate-x-1/2')}>
                <span className="block h-4 w-4 rounded-full bg-primary-100" />
              </div>
              <div className={clsx('sm:w-1/2', isLeft ? 'sm:pl-4 sm:text-right' : 'sm:ml-auto sm:pr-4')}>
                <Card title={item.title} description={item.time}>
                  <p className="text-sm text-slate-600">{item.description}</p>
                  {item.cta ? <div className={clsx('mt-4', isLeft ? 'flex justify-end' : 'flex justify-start')}>{item.cta}</div> : null}
                </Card>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface Stat {
  id: string;
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative';
}

export function StatsGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.id}
          className="group relative overflow-hidden rounded-[26px] border border-white/14 bg-gradient-to-br from-white/15 via-white/6 to-white/2 px-6 py-8 text-white shadow-[0_22px_70px_rgba(2,12,26,0.55)] backdrop-blur-2xl transition duration-500 hover:-translate-y-1 hover:border-primary-300/60 hover:shadow-[0_30px_100px_rgba(3,18,45,0.6)] sm:px-8 sm:py-10"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_150%_at_-10%_-30%,rgba(13,123,255,0.25),transparent_70%),radial-gradient(120%_140%_at_120%_130%,rgba(192,77,255,0.2),transparent_70%)] opacity-60 transition duration-700 group-hover:opacity-100" />
          <div className="pointer-events-none absolute inset-[1px] rounded-[calc(26px-1px)] border border-white/12" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/20 via-transparent to-transparent transition duration-700 group-hover:from-primary-500/20" />
          <div className="relative flex flex-col gap-4">
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.5em] text-slate-200/80">{stat.label}</span>
            <span className="text-4xl font-semibold sm:text-5xl">{stat.value}</span>
            {stat.change ? (
              <span
                className={clsx(
                  'inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition',
                  stat.changeType === 'positive'
                    ? 'bg-emerald-500/15 text-emerald-200'
                    : 'bg-rose-500/15 text-rose-200'
                )}
              >
                <span className="text-base leading-none">{stat.changeType === 'positive' ? '▲' : '▼'}</span>
                {stat.change}
              </span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ContactForm({
  onSubmit
}: {
  onSubmit?: (data: { name: string; email: string; phone?: string; message: string }) => void;
}) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      phone: formData.get('phone') ? String(formData.get('phone')) : undefined,
      message: String(formData.get('message') ?? '')
    };
    if (onSubmit) {
      onSubmit(payload);
    } else {
      console.info('Contact form submission (mock):', payload);
    }
    event.currentTarget.reset();
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input name="name" label="Full name" placeholder="Your name" required />
        <Input name="email" type="email" label="Email" placeholder="you@club.com" required />
      </div>
      <Input name="phone" type="tel" label="Phone number" placeholder="+962" />
      <Textarea name="message" label="How can we help?" placeholder="Tell us about your goals…" rows={5} required />
      <div className="flex justify-end">
        <Button type="submit">Send message</Button>
      </div>
    </form>
  );
}

export interface SidebarLink {
  icon?: React.ReactNode;
  label: string;
  href: string;
  badge?: string;
  children?: SidebarLink[];
}

export function AppSidebar({ items, footer }: { items: SidebarLink[]; footer?: React.ReactNode }) {
  return (
    <aside className="hidden h-full w-72 flex-col border-r border-white/10 bg-gradient-to-b from-white/15 via-white/8 to-white/0 px-4 py-6 text-white backdrop-blur-2xl lg:flex">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/15 px-3 py-4 shadow-[0_10px_40px_rgba(4,17,39,0.35)]">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 font-display text-lg text-white shadow-card">
          IS
        </span>
        <div>
          <p className="text-sm font-semibold text-white">Infinity Sports</p>
          <p className="text-xs text-slate-200">High-performance teams</p>
        </div>
      </div>
      <nav className="mt-8 space-y-1">
        {items.map((item) => (
          <SidebarDisclosure key={item.href} item={item} />
        ))}
      </nav>
      {footer ? <div className="mt-auto border-t border-white/10 pt-4 text-slate-200">{footer}</div> : null}
    </aside>
  );
}

function SidebarDisclosure({ item }: { item: SidebarLink }) {
  if (item.children?.length) {
    return (
      <Disclosure defaultOpen>
        {({ open }: { open: boolean }) => (
          <div className="rounded-xl">
            <Disclosure.Button className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10">
              <span className="flex items-center gap-2">
                {item.icon}
                {item.label}
              </span>
              <ChevronDownIcon className={clsx('h-4 w-4 transition', open && 'rotate-180')} />
            </Disclosure.Button>
            <Disclosure.Panel className="mt-1 space-y-1 pl-3">
              {item.children?.map((child) => (
                <a
                  key={child.href}
                  className="flex items-center justify-between gap-2 rounded-2xl px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
                  href={child.href}
                >
                  <span>{child.label}</span>
                  {child.badge ? (
                    <span className="rounded-full bg-primary-500/20 px-2 py-0.5 text-xs font-semibold text-primary-100">
                      {child.badge}
                    </span>
                  ) : null}
                </a>
              ))}
            </Disclosure.Panel>
          </div>
        )}
      </Disclosure>
    );
  }

  return (
    <a
      className="flex items-center justify-between gap-2 rounded-2xl px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
      href={item.href}
    >
      <span className="flex items-center gap-2">
        {item.icon}
        {item.label}
      </span>
      {item.badge ? (
        <span className="rounded-full bg-primary-500/20 px-2 py-0.5 text-xs font-semibold text-primary-100">{item.badge}</span>
      ) : null}
    </a>
  );
}

export function AppHeader({
  title,
  description,
  actions,
  breadcrumbs
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}) {
  return (
    <header className="border-b border-white/10 bg-gradient-to-r from-white/12 via-white/6 to-transparent px-6 py-6 text-white shadow-[0_10px_40px_rgba(2,12,24,0.4)] backdrop-blur-xl">
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <Breadcrumbs items={breadcrumbs} />
      ) : null}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">{title}</h1>
          {description ? <p className="mt-1 text-sm text-slate-200">{description}</p> : null}
        </div>
        {actions}
      </div>
    </header>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="flex items-center gap-2 text-xs font-medium text-slate-300">
      {items.map((item, index) => (
        <Fragment key={`${item.label}-${index}`}>
          {item.href ? (
            <a className="transition hover:text-white" href={item.href}>
              {item.label}
            </a>
          ) : (
            <span className="text-slate-400">{item.label}</span>
          )}
          {index < items.length - 1 ? <span className="text-slate-500">/</span> : null}
        </Fragment>
      ))}
    </nav>
  );
}

export function DashboardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-6 lg:grid-cols-2">{children}</div>;
}

export function QuickLinkCard({
  title,
  description,
  href,
  icon
}: {
  title: string;
  description: string;
  href: string;
  icon?: React.ReactNode;
}) {
  return (
    <a
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-white/18 via-white/8 to-white/3 p-8 sm:p-10 shadow-[0_20px_70px_rgba(2,12,28,0.55),inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-2xl transition-all hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/12 hover:shadow-[0_26px_90px_rgba(3,18,40,0.6),inset_0_1px_0_rgba(255,255,255,0.26)]"
      href={href}
    >
      <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_0%_0%,rgba(79,165,255,0.12),transparent_65%)] opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-[2px] rounded-[calc(theme(borderRadius.3xl)-2px)] border border-white/12" />
      <div className="relative space-y-6">
        <div className="flex items-center gap-4 text-white">
          {icon ?? <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/25 bg-white/18 text-lg font-semibold transition group-hover:bg-white/28">→</span>}
          <h3 className="text-xl font-semibold">{title}</h3>
        </div>
        <p className="text-sm leading-relaxed text-slate-200/90">{description}</p>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary-200 transition group-hover:text-primary-100">
          View
          <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
        </span>
      </div>
    </a>
  );
}

export function StatWidget({
  title,
  value,
  delta,
  trend,
  icon,
  accent = 'primary',
  className
}: {
  title: string;
  value: string;
  delta?: string;
  trend?: 'up' | 'down';
  icon?: React.ReactNode;
  accent?: 'primary' | 'emerald' | 'sky' | 'amber';
  className?: string;
}) {
  const accentBackground: Record<'primary' | 'emerald' | 'sky' | 'amber', string> = {
    primary: 'from-primary-500/25 via-secondary-500/12 to-primary-500/6',
    emerald: 'from-emerald-400/25 via-emerald-500/12 to-emerald-400/6',
    sky: 'from-sky-400/25 via-sky-500/12 to-sky-400/6',
    amber: 'from-amber-400/25 via-amber-500/12 to-amber-400/6'
  };

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-white/18 via-white/8 to-white/3 p-8 sm:p-10 text-white shadow-[0_22px_70px_rgba(2,12,30,0.6),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-2xl transition-all hover:border-white/35 hover:shadow-[0_30px_110px_rgba(2,18,40,0.65),inset_0_1px_0_rgba(255,255,255,0.25)]',
        className
      )}
    >
      <div className={clsx('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-55', accentBackground[accent])} />
      <div className="pointer-events-none absolute inset-[2px] rounded-[calc(theme(borderRadius.3xl)-2px)] border border-white/12" />
      <div className="relative space-y-6">
        <div className="flex items-start justify-between gap-5">
          <p className="text-xs font-semibold uppercase tracking-[0.42em] text-slate-200/85">{title}</p>
          {icon ? (
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/30 bg-white/15 text-white shadow-inner">
              {icon}
            </span>
          ) : null}
        </div>
        <p className="text-4xl font-bold tracking-tight text-white sm:text-5xl">{value}</p>
        {delta ? (
          <p className={clsx('text-sm font-semibold', trend === 'down' ? 'text-rose-300' : 'text-emerald-300')}>
            {trend === 'down' ? '▼' : '▲'} {delta}
          </p>
        ) : null}
      </div>
    </div>
  );
}

