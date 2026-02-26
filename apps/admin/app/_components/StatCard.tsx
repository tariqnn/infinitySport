type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  accent?: 'blue' | 'green' | 'teal';
};

const accentStyles = {
  blue: 'border-[var(--border-muted)] bg-white',
  green: 'border-[var(--border-muted)] bg-white',
  teal: 'border-[var(--border-muted)] bg-white',
} as const;

export function StatCard({ label, value, delta, accent = 'blue' }: StatCardProps) {
  return (
    <div className={`glass-card border ${accentStyles[accent]} p-5`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</p>
        {delta ? (
          <span className="rounded-full border border-[var(--border-muted)] bg-[var(--bg-card-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)]">
            {delta}
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-display text-3xl font-semibold text-[var(--text-primary)] sm:text-4xl">{value}</p>
    </div>
  );
}
