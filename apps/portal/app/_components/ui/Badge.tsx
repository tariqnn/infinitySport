import { ReactNode } from "react";
import clsx from "clsx";

type BadgeVariant = "success" | "warning" | "danger" | "neutral" | "info";

export function Badge({
  variant = "neutral",
  children,
  className,
}: {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        variant === "success" && "border-[#bde8ce] bg-[#ecfff3] text-[#17834a]",
        variant === "warning" && "border-[#ffdba8] bg-[#fff8ea] text-[#a16207]",
        variant === "danger" && "border-[#fecaca] bg-[#fff1f2] text-[#b91c1c]",
        variant === "neutral" && "border-[#d8e0ec] bg-[#f8fafc] text-ui-textMuted",
        variant === "info" && "border-[#c7d7ff] bg-[#f0f5ff] text-[#1e40af]",
        className
      )}
    >
      <span
        className={clsx(
          "h-1.5 w-1.5 rounded-full",
          variant === "success" && "bg-[#1fb261]",
          variant === "warning" && "bg-[#d97706]",
          variant === "danger" && "bg-[#dc2626]",
          variant === "neutral" && "bg-[#94a3b8]",
          variant === "info" && "bg-[#2563eb]"
        )}
      />
      {children}
    </span>
  );
}
