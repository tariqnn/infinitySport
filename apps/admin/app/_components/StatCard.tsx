type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  accent?: 'blue' | 'green' | 'teal';
};

const accentMap = {
  blue: 'from-[#1426FF1a] to-transparent',
  green: 'from-[#61FF451a] to-transparent',
  teal: 'from-[#69FFDB1a] to-transparent'
} as const;

export function StatCard({ label, value, delta, accent = 'blue' }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[rgba(15,23,42,0.08)] bg-white p-5 shadow-panel">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accentMap[accent]}`} />
      <div className="relative space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-blue">{label}</p>
        <p className="font-display text-3xl font-bold text-[var(--text-primary)]">{value}</p>
        {delta ? <p className="text-sm text-[var(--text-muted)]">{delta}</p> : null}
      </div>
    </div>
  );
}

