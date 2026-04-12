'use client';

import { Fragment, ReactNode, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export interface ModalProps {
  title?: string;
  description?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function Modal({ title, description, open, onClose, children, footer, size = 'md' }: ModalProps) {
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

  const sizeClasses = {
    sm: 'w-full max-w-md',
    md: 'w-full max-w-lg',
    lg: 'w-full max-w-2xl',
    xl: 'w-full max-w-4xl',
    '2xl': 'w-full max-w-6xl',
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[9999]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-[#060a15]/55 backdrop-blur-[4px]" onClick={onClose} />
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
                className={clsx(
                  'relative z-[10001] transform overflow-hidden rounded-2xl border-2 border-ui-border bg-white p-7 text-left align-middle shadow-[0_24px_60px_rgba(7,16,35,0.34)] transition-all',
                  sizeClasses[size]
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-6 flex items-start justify-between gap-6">
                  <div>
                    {title && <Dialog.Title className="text-2xl font-bold text-ui-textPrimary">{title}</Dialog.Title>}
                    {description && <Dialog.Description className="mt-2 text-base text-ui-textMuted">{description}</Dialog.Description>}
                  </div>
                  <button
                    aria-label="Close modal"
                    className="rounded-xl border-2 border-ui-border p-2.5 text-ui-textMuted transition hover:bg-ui-softBg hover:text-ui-textPrimary"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <div className="max-h-[calc(100vh-200px)] overflow-y-auto">{children}</div>
                {footer && <div className="mt-6 flex justify-end gap-3 border-t-2 border-ui-border pt-5">{footer}</div>}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
