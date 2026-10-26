"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, Info, TriangleAlert } from "lucide-react";

export type ToastTone = "success" | "danger" | "info";

export type ToastItem = { id: number; message: string; tone: ToastTone };

type ToastContextValue = {
  toasts: ToastItem[];
  push: (message: string, tone?: ToastTone) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let toastSequence = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      dismiss: (id) => setToasts((items) => items.filter((item) => item.id !== id)),
      push: (message, tone = "success") => {
        toastSequence += 1;
        const id = toastSequence;
        setToasts((items) => [...items.slice(-2), { id, message, tone }]);
        window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 4000);
      },
    }),
    [toasts],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}

export function ToastViewport() {
  const { toasts, dismiss } = useToast();

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-[84px] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:right-6 lg:left-auto lg:items-end"
    >
      {toasts.map((toast) => {
        const tone =
          toast.tone === "danger"
            ? "border-critical-border bg-critical-soft text-critical"
            : toast.tone === "info"
              ? "border-line bg-sheet text-ink"
              : "border-healthy-border bg-healthy-soft text-healthy";
        const Icon = toast.tone === "danger" ? TriangleAlert : toast.tone === "info" ? Info : CheckCircle2;
        return (
          <button
            key={toast.id}
            type="button"
            onClick={() => dismiss(toast.id)}
            className={`pointer-events-auto flex max-w-md items-start gap-2 rounded-xl border px-4 py-3 text-left text-sm font-semibold shadow-sm ${tone}`}
          >
            <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
            <span>{toast.message}</span>
          </button>
        );
      })}
    </div>
  );
}
