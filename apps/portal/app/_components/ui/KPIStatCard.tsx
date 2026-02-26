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
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ui-textMuted">{label}</p>
            <p className="mt-1 text-[34px] font-bold leading-none text-ui-textPrimary">{value}</p>
          </div>
          {icon ? (
            <div
              className={clsx(
                "flex h-8 w-8 items-center justify-center rounded-md border text-[13px]",
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
              "mt-3 text-xs",
              trend === "up" && "text-[#10b981]",
              trend === "down" && "text-[#ef4444]",
              (!trend || trend === "neutral") && "text-ui-textMuted"
            )}
          >
            {caption}
          </p>
        ) : null}

        {badge ? (
          <span
            className={clsx(
              "mt-3 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
              badgeTone === "green" && "border-[#bde8ce] bg-[#ecfff3] text-[#17834a]",
              badgeTone === "amber" && "border-[#ffdbab] bg-[#fff8ea] text-[#a16207]",
              badgeTone === "red" && "border-[#fecaca] bg-[#fff1f2] text-[#b91c1c]",
              badgeTone === "blue" && "border-[#c7d7ff] bg-[#f0f5ff] text-[#1e40af]",
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
