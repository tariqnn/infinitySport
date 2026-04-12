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
    <div className={`glass-card border-2 ${accentStyles[accent]} p-6`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">{label}</p>
        {delta ? (
          <span className="rounded-full border-2 border-[var(--border-muted)] bg-[var(--bg-card-muted)] px-3 py-1 text-sm font-bold text-[var(--text-muted)]">
            {delta}
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-display text-4xl font-bold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
