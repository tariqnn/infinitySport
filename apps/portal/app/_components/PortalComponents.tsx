import { ReactNode } from "react";
import clsx from "clsx";

type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
  description?: string;
  icon?: ReactNode;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="text-xs uppercase tracking-[0.16em] text-ui-textMuted">{eyebrow}</p> : null}
        <h2 className="text-2xl font-bold text-ui-textPrimary">{title}</h2>
        {description ? <p className="text-sm text-ui-textMuted">{description}</p> : null}
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, delta, deltaTone = "neutral", description, icon }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-ui-border bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ui-textMuted">{label}</p>
        {icon ? <div className="text-[#2558e8]">{icon}</div> : null}
      </div>
      <p className="mt-2 text-3xl font-bold text-ui-textPrimary">{value}</p>
      {delta ? (
        <p
          className={clsx(
            "mt-1 text-xs font-medium",
            deltaTone === "up" && "text-[#10b981]",
            deltaTone === "down" && "text-[#ef4444]",
            deltaTone === "neutral" && "text-ui-textMuted"
          )}
        >
          {delta}
        </p>
      ) : null}
      {description ? <p className="mt-2 text-xs text-ui-textMuted">{description}</p> : null}
    </div>
  );
}

export function QuickAction({
  icon,
  title,
  description,
  onClick,
  variant = "row",
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  variant?: "row" | "centered";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-2xl border border-ui-border bg-white p-4 text-left transition hover:bg-[#f8fafc]",
        variant === "row" && "flex items-start gap-3",
        variant === "centered" && "flex flex-col items-center justify-center text-center"
      )}
    >
      <div className={clsx("flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef4ff] text-brand-primaryBlue", variant === "centered" && "mb-2")}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-ui-textPrimary">{title}</p>
        <p className="mt-1 text-xs text-ui-textMuted">{description}</p>
      </div>
    </button>
  );
}

export function DataCard({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ui-border bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {subtitle ? <p className="text-xs uppercase tracking-[0.12em] text-ui-textMuted">{subtitle}</p> : null}
          <h3 className="text-xl font-semibold text-ui-textPrimary">{title}</h3>
        </div>
        {actions}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function StatusBadge({
  tone = "default",
  children,
}: {
  tone?: "default" | "green" | "blue" | "amber";
  children: ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        tone === "default" && "border-[#d8e0ec] bg-[#f8fafc] text-ui-textMuted",
        tone === "green" && "border-[#bde8ce] bg-[#ecfff3] text-[#17834a]",
        tone === "blue" && "border-[#c7d7ff] bg-[#f0f5ff] text-[#1e40af]",
        tone === "amber" && "border-[#ffdba8] bg-[#fff8ea] text-[#a16207]"
      )}
    >
      {children}
    </span>
  );
}
