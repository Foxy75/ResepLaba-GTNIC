"use client";

import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  block?: boolean;
  icon?: ReactNode;
};

const buttonBase =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition duration-200 active:scale-[.98] disabled:pointer-events-none disabled:opacity-70";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  secondary: "border border-line bg-sheet text-ink hover:bg-paper",
  ghost: "text-primary hover:bg-primary-soft",
  danger: "bg-critical text-white hover:bg-critical/90",
};

export function Button({
  variant = "primary",
  loading = false,
  block = false,
  icon,
  className = "",
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${buttonBase} ${buttonVariants[variant]} ${block ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

export function IconButton({
  label,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`flex size-12 shrink-0 items-center justify-center rounded-xl border border-line bg-sheet text-ink transition duration-200 hover:bg-paper active:scale-[.98] ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export const controlBase =
  "min-h-12 w-full rounded-xl border border-line bg-sheet px-3 text-sm text-ink transition placeholder:text-ink-soft/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:bg-paper disabled:text-ink-soft";

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${controlBase} ${className}`} {...rest} />;
}

export function Select({ className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${controlBase} ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full resize-y rounded-xl border border-line bg-sheet px-3 py-3 text-sm leading-6 text-ink transition placeholder:text-ink-soft/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${className}`}
      {...rest}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {hint && !error && <p className="mt-1.5 text-xs leading-5 text-ink-soft">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-semibold text-critical">
          {error}
        </p>
      )}
    </div>
  );
}

export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  return <Tag className={`rounded-2xl border border-line bg-sheet p-5 ${className}`}>{children}</Tag>;
}

export type BadgeTone = "critical" | "warning" | "healthy" | "neutral" | "gold";

const badgeTones: Record<BadgeTone, string> = {
  critical: "border-critical-border bg-critical-soft text-critical",
  warning: "border-warning-border bg-warning-soft text-warning",
  healthy: "border-healthy-border bg-healthy-soft text-healthy",
  neutral: "border-line bg-paper text-ink-soft",
  gold: "border-gold/30 bg-gold-soft text-gold-deep",
};

export function Badge({
  tone = "neutral",
  icon,
  children,
  className = "",
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${badgeTones[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "primary" | "critical" | "warning" | "healthy";
  icon?: ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: "border-line bg-sheet text-ink",
    primary: "border-transparent bg-primary text-white",
    critical: "border-critical-border bg-critical-soft text-critical",
    warning: "border-warning-border bg-warning-soft text-warning",
    healthy: "border-healthy-border bg-healthy-soft text-healthy",
  };
  return (
    <article className={`rounded-2xl border p-5 ${tones[tone]}`}>
      <div className="flex items-center gap-2">
        {icon}
        <p className={`text-sm ${tone === "primary" ? "text-white/80" : "text-ink-soft"}`}>{label}</p>
      </div>
      <p className="mt-3 text-2xl font-extrabold tabular">{value}</p>
      {hint && <p className={`mt-2 text-xs leading-5 ${tone === "primary" ? "text-white/80" : "text-ink-soft"}`}>{hint}</p>}
    </article>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-xl bg-line/70 ${className}`} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-paper px-5 py-10 text-center">
      {icon && <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-sheet text-primary">{icon}</div>}
      <p className="mt-4 text-sm font-bold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-soft">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export type TabItem<T extends string> = { id: T; label: string; count?: number };

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-2 overflow-x-auto pb-1">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`min-h-12 shrink-0 rounded-xl px-4 text-sm font-semibold transition ${
              active ? "bg-primary text-white" : "border border-line bg-sheet text-ink-soft hover:bg-paper"
            }`}
          >
            {item.label}
            {item.count !== undefined && (
              <span className={`ml-2 text-xs ${active ? "text-white/80" : "text-ink-soft"}`}>{item.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

