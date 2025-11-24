import { ReactNode } from 'react';
import { Card } from './Card';

export function KPIStatCard({
  label,
  value,
  caption,
  icon,
  trend,
}: {
  label: string;
  value: string;
  caption?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <Card hover>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-ui-textMuted">{label}</p>
            <p className="mt-2 text-3xl font-bold text-ui-textPrimary">{value}</p>
            {caption && (
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
            )}
          </div>
          {icon && (
            <div className="ml-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient/10 text-brand-primaryBlue">
              {icon}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

