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
      const id = performance.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
      const timeout = setTimeout(() => dismiss(id), 5000);
      return () => clearTimeout(timeout);
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-5 z-50 flex justify-center px-5 sm:justify-end sm:px-7">
        <ul className="flex w-full max-w-md flex-col gap-3">
          {toasts.map((toast) => (
            <li
              key={toast.id}
              className={clsx(
                "glass-card pointer-events-auto flex items-center gap-4 px-5 py-4 text-base shadow-strong",
                toast.type === "success" && "border-green-400/60",
                toast.type === "error" && "border-red-300 text-red-900"
              )}
            >
              {toast.type === "success" && (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 text-lg">&#10003;</span>
              )}
              {toast.type === "error" && (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 text-lg">!</span>
              )}
              <span className="flex-1 font-semibold text-slate-900">{toast.message}</span>
              <button
                type="button"
                className="shrink-0 rounded-lg px-3 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100"
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
