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
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold",
        variant === "success" && "border-[#bde8ce] bg-[#ecfff3] text-[#15703e]",
        variant === "warning" && "border-[#ffdba8] bg-[#fff8ea] text-[#92400e]",
        variant === "danger" && "border-[#fecaca] bg-[#fff1f2] text-[#991b1b]",
        variant === "neutral" && "border-[#d8e0ec] bg-[#f8fafc] text-[#475569]",
        variant === "info" && "border-[#c7d7ff] bg-[#f0f5ff] text-[#1e3a8a]",
        className
      )}
    >
      <span
        className={clsx(
          "h-2 w-2 rounded-full",
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
