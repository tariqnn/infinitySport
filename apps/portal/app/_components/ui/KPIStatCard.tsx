import { ReactNode } from "react";
import clsx from "clsx";
import { Card } from "./Card";

export function KPIStatCard({
  label,
  value,
  caption,
  icon,
  trend,
  badge,
  badgeTone = "neutral",
  iconTone = "blue",
}: {
  label: string;
  value: string;
  caption?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  badge?: string;
  badgeTone?: "neutral" | "green" | "amber" | "red" | "blue";
  iconTone?: "blue" | "green" | "amber" | "red" | "slate";
}) {
  return (
    <Card className="h-full">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.1em] text-ui-textMuted">{label}</p>
            <p className="mt-2 text-4xl font-extrabold leading-none text-ui-textPrimary">{value}</p>
          </div>
          {icon ? (
            <div
              className={clsx(
                "flex h-11 w-11 items-center justify-center rounded-xl border-2",
                iconTone === "green" && "border-[#c9f2d9] bg-[#effdf4] text-[#169a4f]",
                iconTone === "amber" && "border-[#ffe2b5] bg-[#fff8e8] text-[#b7791f]",
                iconTone === "red" && "border-[#fecaca] bg-[#fff1f2] text-[#b91c1c]",
                iconTone === "slate" && "border-[#dbe3ef] bg-[#f8fafc] text-[#334155]",
                iconTone === "blue" && "border-[#c9dbff] bg-[#eef4ff] text-[#2558e8]"
              )}
            >
              {icon}
            </div>
          ) : null}
        </div>

        {caption ? (
          <p
            className={clsx(
              "mt-3 text-sm font-medium",
              trend === "up" && "text-[#059669]",
              trend === "down" && "text-[#dc2626]",
              (!trend || trend === "neutral") && "text-ui-textMuted"
            )}
          >
            {caption}
          </p>
        ) : null}

        {badge ? (
          <span
            className={clsx(
              "mt-3 inline-flex items-center rounded-full border-2 px-3 py-1 text-sm font-bold",
              badgeTone === "green" && "border-[#bde8ce] bg-[#ecfff3] text-[#15703e]",
              badgeTone === "amber" && "border-[#ffdbab] bg-[#fff8ea] text-[#92400e]",
              badgeTone === "red" && "border-[#fecaca] bg-[#fff1f2] text-[#991b1b]",
              badgeTone === "blue" && "border-[#c7d7ff] bg-[#f0f5ff] text-[#1e3a8a]",
              badgeTone === "neutral" && "border-ui-border bg-ui-softBg text-ui-textMuted"
            )}
          >
            {badge}
          </span>
        ) : null}
      </div>
    </Card>
  );
}
