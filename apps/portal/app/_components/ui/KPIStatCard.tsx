import { ReactNode } from 'react';
import { Card } from './Card';

export function KPIStatCard({
  label,
  value,
  caption,
  icon,
  trend,
  badge,
  badgeTone = 'neutral',
  iconTone = 'blue',
}: {
  label: string;
  value: string;
  caption?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  badge?: string;
  badgeTone?: 'neutral' | 'green' | 'amber' | 'red' | 'blue';
  iconTone?: 'blue' | 'green' | 'amber' | 'red' | 'slate';
}) {
  const badgeClass =
    badgeTone === 'green'
      ? 'bg-[#e8fff0] text-[#1c934e]'
      : badgeTone === 'amber'
      ? 'bg-[#fff8e6] text-[#b97700]'
      : badgeTone === 'red'
      ? 'bg-[#ffe8e8] text-[#d14343]'
      : badgeTone === 'blue'
      ? 'bg-[#f0f5ff] text-brand-primaryBlue'
      : 'bg-ui-softBg text-ui-textMuted';

  const iconClass =
    iconTone === 'green'
      ? 'bg-[#e8fff0] text-[#1c934e]'
      : iconTone === 'amber'
      ? 'bg-[#fff8e6] text-[#b97700]'
      : iconTone === 'red'
      ? 'bg-[#ffe8e8] text-[#d14343]'
      : iconTone === 'slate'
      ? 'bg-[#f1f5f9] text-[#0f172a]'
      : 'bg-[#f0f5ff] text-brand-primaryBlue';

  return (
    <Card hover>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {icon ? (
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${iconClass}`}>
                {icon}
              </div>
            ) : null}
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-ui-textMuted">
                {label}
              </p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-ui-textPrimary">
                {value}
              </p>
              {caption ? (
                <p
                  className={`mt-1 text-xs ${
                    trend === 'up'
                      ? 'text-brand-primaryGreen'
                      : trend === 'down'
                      ? 'text-ui-danger'
                      : 'text-ui-textMuted'
                  }`}
                >
                  {caption}
                </p>
              ) : null}
            </div>
          </div>

          {badge ? (
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>
              {badge}
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

