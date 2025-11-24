"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import clsx from "clsx";

type Toast = {
  id: number;
  message: string;
  type?: "success" | "error" | "info";
};

type ToastContextValue = {
  push: (toast: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    ({ message, type = "info" }: Omit<Toast, "id">) => {
      // Use a counter-based ID to avoid hydration issues
      const id = performance.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
      const timeout = setTimeout(() => dismiss(id), 3400);
      return () => clearTimeout(timeout);
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:justify-end sm:px-6">
        <ul className="flex w-full max-w-sm flex-col gap-3">
          {toasts.map((toast) => (
            <li
              key={toast.id}
              className={clsx(
                "glass-card pointer-events-auto flex items-start gap-3 px-4 py-3 text-sm shadow-panel",
                toast.type === "success" && "border-brand-green/50",
                toast.type === "error" && "border-red-200 text-red-900"
              )}
            >
              <span className="font-semibold text-slate-900">{toast.message}</span>
              <button
                type="button"
                className="ml-auto text-xs font-semibold text-slate-500"
                onClick={() => dismiss(toast.id)}
              >
                Close
              </button>
            </li>
          ))}
        </ul>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

