type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  accent?: 'blue' | 'green' | 'teal';
};

const accentStyles = {
  blue: 'border-l-[var(--primary)] bg-[var(--primary-light)]',
  green: 'border-l-[var(--accent-green)] bg-[rgba(34,197,94,0.08)]',
  teal: 'border-l-[var(--accent-teal)] bg-[rgba(20,184,166,0.08)]',
} as const;

export function StatCard({ label, value, delta, accent = 'blue' }: StatCardProps) {
  return (
    <div className={`glass-card border-l-4 ${accentStyles[accent]} p-5`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{label}</p>
        {delta ? (
          <span className="rounded-full bg-[var(--bg-card-strong)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)]">
            {delta}
          </span>
        ) : null}
      </div>
      <p className="mt-4 font-display text-3xl font-semibold text-[var(--text-primary)] sm:text-4xl">{value}</p>
    </div>
  );
}
