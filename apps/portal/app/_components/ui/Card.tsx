import { ReactNode } from "react";
import clsx from "clsx";

export function Card({
  children,
  className,
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-ui-border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]",
        hover && "transition hover:-translate-y-[1px] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={clsx("border-b border-ui-border px-5 py-4", className)}>{children}</div>;
}

export function CardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={clsx("p-5", className)}>{children}</div>;
}

export function CardFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={clsx("border-t border-ui-border px-5 py-4", className)}>{children}</div>;
}
